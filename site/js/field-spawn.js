/* Bãi quái khắp bản đồ đánh ải; tháp và Luyện Công dùng cơ chế riêng. */
'use strict';
const FIELD_MOBS = { cell: 400, perCell: 2, max: 240, aggro: 240, leash: 520, wander: 50, respawn: 5.6 };
function fieldSpawnPoints() {
  const buckets = new Map(), g = OBS.g, pad = WORLD.pad + 32;
  const add = (x, y) => {
    if (x < pad || y < pad + 30 || x > WORLD.w - pad || y > WORLD.h - pad || !obsWalk(x, y)) return;
    const key = Math.floor(x / FIELD_MOBS.cell) + ',' + Math.floor(y / FIELD_MOBS.cell);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([x, y]);
  };
  if (g) {
    for (let y = 0; y < g.gh; y += 2) for (let x = 0; x < g.gw; x += 2) add((x + .5) * g.cw, (y + .5) * g.ch);
  } else {
    for (let y = pad + 30; y < WORLD.h - pad; y += 80) for (let x = pad; x < WORLD.w - pad; x += 80) add(x, y);
  }
  const points = [];
  for (const candidates of buckets.values()) {
    const local = [];
    for (let n = 0; n < FIELD_MOBS.perCell; n++) {
      const pool = candidates.filter(p => Math.hypot(p[0] - H.x, p[1] - H.y) > 80 && local.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) >= 48));
      if (!pool.length) break;
      const p = pick(pool); local.push(p); points.push(p);
    }
  }
  // Giới hạn tổng số nhưng vẫn lấy mẫu đều khắp vùng, không cắt mất nửa bản đồ.
  if (points.length > FIELD_MOBS.max) return Array.from({length:FIELD_MOBS.max}, (_, i) => points[Math.floor(i * points.length / FIELD_MOBS.max)]);
  return points.length ? points : [inWorld(H.x + 180, H.y)];
}
function fieldMob(slot) {
  const z = zoneOf(S.stage), e = makeEnemy(slot.tid, stageLevel(S.stage), slot.cls, slot.x, slot.y);
  e.fieldSlot = slot; e.homeX = slot.x; e.homeY = slot.y; e.aggro = false; e.fieldWanderT = rnd(0, 3);
  slot.enemy = e; R.enemies.push(e); return e;
}
function startFieldWave() {
  R.stall = 0; R.spawnT = 0; R.moveTo = null;
  const bossWave = S.wave === WAVES && isBossStage(S.stage);
  R.field.quest = { kills: 0, target: bossWave ? 3 : 6 + (inZone(S.stage) > 5 ? 2 : 0), boss: null };
  // Chỉ nâng cấp quái chưa giao tranh; không hồi máu hay đổi chỉ số giữa lúc đang đánh.
  for (const e of R.enemies) if (e.fieldSlot && !e.aggro && e.hp === e.max && e.L !== stageLevel(S.stage)) {
    const slot = e.fieldSlot, fresh = makeEnemy(e.tid, stageLevel(S.stage), e.cls, e.x, e.y);
    Object.assign(e, fresh, {fieldSlot:slot,homeX:slot.x,homeY:slot.y,aggro:false});
  }
  if (bossWave) {
    const home = pick(R.field.slots), z = zoneOf(S.stage);
    const e = makeEnemy(z.boss, Math.min(MAX_LEVEL, stageLevel(S.stage) + 1), 'boss', home.x, home.y);
    e.homeX = home.x; e.homeY = home.y; e.aggro = false;
    R.field.quest.boss = e; R.enemies.push(e);
    log(`<b class="boss">${esc(e.n)}</b> xuất hiện trên bản đồ!`);
  }
}
function populateField() {
  const z = zoneOf(S.stage);
  R.field = { key: z.id, slots: fieldSpawnPoints().map(([x,y], i) => ({x,y,tid:pick(z.m),cls:i % 10 === 9 ? 'elite' : 'normal',enemy:null,wait:0})) };
  for (const slot of R.field.slots) fieldMob(slot);
  startFieldWave();
}
function fieldTick(dt) {
  if (!R.field || R.tower || R.town) return;
  for (const slot of R.field.slots) {
    if (slot.enemy) continue;
    slot.wait -= dt;
    if (slot.wait <= 0 && Math.hypot(slot.x - H.x, slot.y - H.y) > 60) fieldMob(slot);
  }
  // Trùm Hoàng Kim không còn phụ thuộc việc toàn bản đồ bị dọn sạch.
  if (goldBossDue() && !R.enemies.some(e => e.goldBoss && !e.dead)) spawnGoldBoss();
}
function fieldKilled(e) {
  if (e.fieldSlot) { e.fieldSlot.enemy = null; e.fieldSlot.wait = FIELD_MOBS.respawn + rnd(0, 2.8); }
  R.field.quest.kills++;
  R.stall = 0;
}
function fieldWaveCleared() {
  const q = R.field.quest;
  return q.kills >= q.target && (!q.boss || q.boss.dead);
}
function fieldIdle(e, dt) {
  const homeDist = Math.hypot(e.x - e.homeX, e.y - e.homeY), heroDist = Math.hypot(e.x - H.x, e.y - H.y);
  if (homeDist > FIELD_MOBS.leash || (e.aggro && heroDist > FIELD_MOBS.leash)) e.returning = true;
  if (e.returning && homeDist <= 12) e.returning = false;
  if (e.returning) e.aggro = false;
  if (!e.returning && !e.aggro && homeDist < FIELD_MOBS.leash && heroDist < FIELD_MOBS.aggro && obsLine(e.x, e.y, H.x, H.y)) e.aggro = true;
  if (e.aggro) return false;
  if (e.returning) {
    e.moving = homeDist > 12;
    if (e.moving) obsSteer(e, e.homeX, e.homeY, e.spd * 1.6 * dt);
  } else {
    // Đi tuần ngẫu nhiên gần điểm sinh, dùng obsMove để trượt theo lối đi quanh vật cản.
    if (e.fieldWanderT === undefined) e.fieldWanderT = rnd(0, 3);
    if ((e.fieldWanderT -= dt) <= 0) {
      e.fieldWanderT = rnd(2, 5);
      e.fieldWanderX = e.homeX + rnd(-FIELD_MOBS.wander, FIELD_MOBS.wander);
      e.fieldWanderY = e.homeY + rnd(-FIELD_MOBS.wander, FIELD_MOBS.wander) * 0.6;
    }
    const dx = (e.fieldWanderX ?? e.x) - e.x, dy = (e.fieldWanderY ?? e.y) - e.y, d = Math.hypot(dx, dy);
    e.moving = d > 4;
    if (e.moving) {
      const step = Math.min(d, e.spd * 0.4 * dt);
      obsMove(e, e.x + dx / d * step, e.y + dy / d * step);
      e.face = dx >= 0 ? 1 : -1; e.dir = dirOf(dx, dy);
    }
  }
  e.hp = Math.min(e.max, e.hp + e.max * .05 * dt);
  return true;
}
