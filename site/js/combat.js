/* ======================= CHIEN DAU (KNpc::CheckHitTarget / CalcDamage) ======================= */
'use strict';
const R = { corpses: [], lootWait: 0, ground: [], pickTarget: null, enemies: [], P: null, life: 1, mana: 1, atkT: 0, hitClock: 0, hitSeq: [], skillClock: 0, skillBuffCheck: 0, skillBuffUntil: {}, deadT: 0, spawnT: 0, kills: 0, t0: Date.now(), logs: [], fx: [], txt: [], dirty: true, stall: 0, farm: 0 };
const AR = { w: 400, h: 520, top: 70, bot: 470 };
const H = { x: 768, y: 768, face: 1 };

/* ---------- vung / ai ---------- */
const zoneIdx = st => Math.min(ZONES.length - 1, Math.floor((st - 1) / ZONE_STAGES));
const zoneOf = st => ZONES[zoneIdx(st)];
const inZone = st => ((st - 1) % ZONE_STAGES) + 1;
function stageLevel(st) {
  if (st > STAGES) return Math.min(MAX_LEVEL, 160 + Math.floor((st - STAGES) * 2)); // +2 cap quai / ai sau vung cuoi, theo ban host
  const z = zoneOf(st); return Math.round(z.lo + (inZone(st) - 1) * (z.hi - z.lo) / (ZONE_STAGES - 1));
}
const isBossStage = st => inZone(st) === ZONE_STAGES;

/* ---------- Quái: công thức idle gốc ---------- */
const POISON_TIME = 3;
const CLS = { normal: { hp: 1, dmg: 1, xp: 1, r: 17 }, elite: { hp: 2.5, dmg: 1.3, xp: 3, r: 21 }, boss: { hp: 9, dmg: 1.7, xp: 20, r: 30 } };
/* Do kho (chon o the Khac): Thuong la can bang chuan cua cac bo kiem thu. De / Kho doi mau, sat thuong quai va thuong kinh nghiem / ngan luong */
const DIFFS = [{ n: 'Dễ', hp: 0.75, dmg: 0.7, rew: 0.8, d: 'Quái yếu hơn (máu −25%, sát thương −30%), thưởng −20%' }, { n: 'Thường', hp: 1, dmg: 1, rew: 1, d: 'Cân bằng chuẩn' }, { n: 'Khó', hp: 1.4, dmg: 1.35, rew: 1.25, d: 'Quái mạnh hơn (máu +40%, sát thương +35%), thưởng +25%' }];
const diffOf = () => DIFFS[(S && S.chal === 'hard') ? 2 : (S && [0, 1, 2].includes(S.diff)) ? S.diff : 1];
function enemyStats(L, cls) {
  return window.JX_ENEMY_BALANCE.stats(L, cls, CLS[cls]);
}
// Trùm cấp cao cần đủ thời gian giao tranh; trùm Hoàng Kim có gấp đôi máu.
function waveStallLimit() {
  if (R.enemies.some(e => e.L > 80 && e.goldBoss)) return 150;
  if (R.enemies.some(e => e.L > 80 && e.cls === 'boss')) return 90;
  return 45;
}
/* Nhip EXP theo ban host: khong giam den cap 30; chia he so theo 2 giai doan 31-500 va tren 500. */
const XP_SLOW_FROM = 30, XP_SLOW_K = 200, XP_SLOW_P = 1.4;
function xpSlow(L) {
  if (L <= XP_SLOW_FROM) return 1;
  // Cap 31-500: he so luy thua 1.4 theo ban host
  if (L <= 500) return 1 + XP_SLOW_K * Math.pow((L - XP_SLOW_FROM) / 470, XP_SLOW_P);
  // Cap >500: noi lien tuc voi moc 500, tang deu tren 500 cap tiep theo.
  const base = 1 + XP_SLOW_K * Math.pow(1, XP_SLOW_P); // 201 tại cấp 500
  return base * Math.pow(1 + (L - 500) / 500, 1.8);
}
function expFor(L) { return Math.floor(J.exp[clamp(L, 1, MAX_LEVEL) - 1] / (10 + L * 1.4)) * 2; } // Nhan 2 o day; onKill con nhan 2 truoc khi gainXp
function makeEnemy(tid, L, cls, x, y) {
  const m = MON[tid], z = zoneOf(S.stage), st = enemyStats(L, cls), D = diffOf(); st.hp *= D.hp; st.dmg *= D.dmg;
  const series = wpick([0, 1, 2, 3, 4], i => z.sw[i] + 1);
  const res = {}; ELEM.forEach((e, i) => { res[e] = Math.min(m.rmax[i] || 75, L * 0.35 + (cls === 'boss' ? 10 : 0)); });
  const e = { id: Math.random(), tid, n: m.n, img: m.img ? img(m.img) : null, sz: m.sz, L, cls, series, res,
    hp: st.hp, max: st.hp, dmg: st.dmg, ar: st.ar, def: st.def, x, y, r: CLS[cls].r,
    spd: (30 + (m.run || 6) * 4) * (cls === 'boss' ? 0.7 : 1), atkCd: rnd(0.5, 1.5), cd: 1.2 + 18 / Math.max(8, m.spd || 18) * 0.5,
    ranged: Math.random() < 0.2 && cls !== 'boss', stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1 };
  if ((R.tower || R.tk) && typeof applyWeekMod === 'function') applyWeekMod(e);
  return e;
}
function spawnWave() {
  R.enemies = []; R.stall = 0;
  const z = zoneOf(S.stage);
  // Nạp vật cản trước khi chọn bãi, tránh sinh quái trong tường hoặc vùng bị cô lập.
  if (OBS.key !== z.id) obsLoad(z.id);
  [H.x, H.y] = inWorld(H.x, H.y);
  populateField();
  if (z.id !== R.zoneShown) {
    R.zoneShown = z.id; R.banner = { t: 2.4, text: z.n, sub: `${R.field.slots.length} quái trên bản đồ` };
    if (typeof onZoneChange === 'function') onZoneChange(z);
  }
}

/* ---------- cong thuc trung / sat thuong ---------- */
function hitPercent(ar, def, ignore = 0) {
  const d = def * (100 - Math.min(ignore, 100)) / 100;
  let p = ar + d === 0 ? 50 : ar * 100 / (ar + d);
  if (p > MAX_HIT + 4) p = MAX_HIT;
  return Math.max(MIN_HIT, p);
}
/* Mot phan sat thuong (vat ly / nguyen to) vao muc tieu: ngu hanh -> khang -> nhan (100 - khang)% */
function applyPart(dmg, e, attackerSeries, targetSeries, targetRes, targetResMax, series5, resIgnore = 0) {
  let res = targetRes[e];
  if (counters(attackerSeries, targetSeries)) res -= series5;           // ta khac dich: dich giam khang
  else if (counters(targetSeries, attackerSeries)) res += series5;      // dich khac ta: dich tang khang
  res -= clamp(resIgnore, 0, 100);                                     // trang bi xuyen khang
  res = clamp(res, -targetResMax, Math.min(targetResMax, MAX_RESIST));
  return dmg * (100 - res) / 100;
}
function heroHit(a, e) {
  const cm = curseMod(e), targetDef = Math.max(0, e.def + (cm ? cm.def : 0));
  if (a.useAR && Math.random() * 100 >= playerHitPercent(R.P.ar, targetDef, a.ignore, R.P.ranged)) { addText(e.x, e.y - e.r - 8, 'Trượt', '#aaa', 11); return 0; }
  if (typeof setTianrenHitState === 'function') setTianrenHitState(a, e);
  const crit = Math.random() * 100 < a.crit;
  if (e.homeX !== undefined) e.aggro = true;
  let tot = 0, poisonDose = 0, best = 'phys', bv = 0;
  for (const el in a.parts) {
    let d = a.parts[el] * rnd(0.85, 1.15) * (e.cls !== 'normal' ? (R.P.bossDmg || 1) : 1);
    const resIgnore = a.resIgnore && a.resIgnore[el] || 0;
    const targetRes = cm ? Object.fromEntries(ELEM.map(x => [x, (e.res[x] || 0) + (cm.res[x] || 0)])) : e.res;
    if (el === 'poison') { // doc cong don: phan chua gay cua lan truoc + lan moi, trai deu 3 giay (KNpc::ReceiveDamage gop 2 luong doc)
      const left = e.poison > 0 ? e.poisonDmg * e.poison : 0;
      poisonDose += applyPart(d, 'poison', a.series, e.series, targetRes, 75, a.series5, resIgnore);
      e.poisonDmg = (left + poisonDose) / POISON_TIME; e.poison = POISON_TIME; continue; }
    d = applyPart(d, el, a.series, e.series, targetRes, 75, a.series5, resIgnore);
    if (crit && el === 'phys') d *= CRIT_MULT;
    tot += d; if (d > bv) { bv = d; best = el; }
  }
  // ngu hanh tang cuong / khang (five_elements_enhance_v) cong tru truc tiep
  if (counters(a.series, e.series)) tot += R.P.series5;
  tot = Math.max(poisonDose > 0 ? 0 : 1, tot);
  e.hp -= tot; e.hitT = 0.12; if (e.act !== 'at') { e.act = 'hurt'; e.actT = 0; npcSfx(MON[e.tid].anim, 'hurt', 0.3); }
  if (a.stun && !(e.stunImm > 0) && Math.random() * 100 < a.stun) { e.stun = e.cls === 'boss' ? 0.5 : 0.8; e.stunImm = e.cls === 'boss' ? STUN_IMM_BOSS : e.cls === 'elite' ? STUN_IMM_ELITE : 0; }
  if (R.P.leech) heal(tot * R.P.leech / 100, true);
  if (R.P.manaLeech) R.mana = Math.min(R.P.mana, R.mana + tot * R.P.manaLeech / 100);
  const k = counters(a.series, e.series) ? ' ⚡' : '';
  if (tot > 0) addText(e.x, e.y - e.r - (poisonDose > 0 ? 20 : 6), fmt(tot) + k, crit ? '#ffe14a' : ELEM_COL[best], crit ? 16 : 12);
  if (poisonDose > 0) addText(e.x, e.y - e.r - 6, fmt(poisonDose), ELEM_COL.poison, 12);
  return tot;
}
function enemyHit(e) {
  const cm = curseMod(e), ar = e.ar * (1 + (cm ? cm.ar : 0) / 100);
  if (Math.random() * 100 >= hitPercent(ar, R.P.def)) { addText(H.x, H.y - 30, 'Né', '#9cf', 11); return; }
  if (Math.random() * 100 < R.P.blockRate) { addText(H.x, H.y - 30, 'Đỡ', '#9cf', 11); return; }
  const el = e.series === 1 && Math.random() < 0.4 ? 'poison' : e.series === 2 && Math.random() < 0.4 ? 'cold' : e.series === 3 && Math.random() < 0.4 ? 'fire' : e.series === 4 && Math.random() < 0.3 ? 'light' : 'phys';
  let d = e.dmg * (1 + (cm ? cm.dmg : 0) / 100) * rnd(0.8, 1.2);
  d = applyPart(d, el, e.series, R.P.series, R.P.res, PLAYER_RES_MAX, 10);
  d *= 1 - R.P.sorbDamage / 100;
  if (R.P.res5 && !counters(e.series, R.P.series)) d = Math.max(1, d - R.P.res5);
  if (R.P.statusRes && R.P.statusRes[el]) d *= 1 - R.P.statusRes[el] / 100;
  R.lastHit = (e.cls === 'boss' ? 'trùm ' : e.cls === 'elite' ? 'tinh anh ' : '') + e.n;
  R.life -= d; R.mana = Math.min(R.P.mana, R.mana + d * R.P.damage2mana / 100); R.hurtT = 0.25; if (H.act !== 'at' && Math.random() < 0.3) { H.act = 'hurt'; H.actT = 0; }
  if (R.P.retMelee || R.P.retMeleeP) { const ret = R.P.retMelee + d * R.P.retMeleeP / 100; if (ret > 0) { e.hp -= ret; } }
  if (e.ranged && R.P.retRangedP) e.hp -= d * R.P.retRangedP / 100;
  if (!e.ranged && cm && cm.ret) e.hp -= d * cm.ret / 100;
  addText(H.x + rnd(-10, 10), H.y - 36, '-' + fmt(d), '#ff6a5a', 12);
}
function heal(v, quiet) { const b = R.life; R.life = Math.min(R.P.life, R.life + v); if (!quiet && R.life - b > 1) addText(H.x, H.y - 44, '+' + fmt(R.life - b), '#7f7', 11); }

/* ---------- tu dung thuoc (potion.txt): hoi dan theo thoi gian, tru ngan luong ---------- */
const POT_TIER_LV = [0, 1, 20, 40, 70, 100]; // cap nhan vat mo khoa bac thuoc 1..5
function bestPotion(kind) {
  let best = null;
  for (const p of J.potions) if (p.kind === kind && S.lvl >= (POT_TIER_LV[p.tier] || 999) && potPrice(p) <= S.gold && (!best || p.tier > best.tier)) best = p;
  return best;
}
/* Gia thuoc tang theo cap nhan vat (cho tieu ngan luong: potion.txt gia co dinh, quai cap cao roi nhieu ngan luong) */
const potPrice = p => Math.round(p.price * (1 + S.lvl / 25) * goldRateScale());
function autoPotion(dt) {
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const h = R.hot, P = R.P;
  for (const k of ['life', 'mana']) {
    if (h[k + 'T'] > 0) { const d = Math.min(dt, h[k + 'T']); h[k + 'T'] -= dt; if (k === 'life') R.life = Math.min(P.life, R.life + h.life * d); else R.mana = Math.min(P.mana, R.mana + h.mana * d); }
  }
  if (S.chal === 'nopot') return;
  const needLife = S.autoHpPotion !== false && R.life < P.life * (S.hpPotionAt || 50) / 100;
  const needMana = S.autoMpPotion !== false && P.main.cost > 0 && R.mana < P.mana * (S.mpPotionAt || 30) / 100;
  h.cd = Math.max(0, (h.cd || 0) - dt);
  for (const [k, need] of [['life', needLife], ['mana', needMana]]) {
    // binh thuong: 1 binh moi lan hoi xong; nguy kich (< 30% mau): uong them binh chong len, cach nhau 1 giay
    const urgent = k === 'life' && R.life < P.life * 0.3 && h.cd <= 0;
    if (!need || (h[k + 'T'] > 0 && !urgent)) continue;
    const own = takeStock(k), p = own || bestPotion(k); if (!p) continue;
    usePotion(k, p, !!own);
    if (k === 'life') h.cd = 1;
  }
}
function usePotion(k, p, free) {
  if (S.chal === 'nopot') return; // mua va uong ngay: hoi dan trong p.dur giay, cong don phan con lai cua binh truoc
  R.hot = R.hot || { life: 0, mana: 0, lifeT: 0, manaT: 0 };
  const h = R.hot;
  if (!free) S.gold -= potPrice(p);
  S.potUsed = (S.potUsed || 0) + 1; questTick('pots');
  const left = h[k + 'T'] > 0 ? h[k] * h[k + 'T'] : 0;
  h[k + 'T'] = p.dur; h[k] = (left + p.total) / p.dur;
}

/* ---------- vong lap ---------- */
const alive = () => R.enemies.filter(e => e.hp > 0);
function nearest(list) { let b = null, bd = 1e9; for (const e of list) { const d = Math.hypot(e.x - H.x, e.y - H.y); if (d < bd) { bd = d; b = e; } } return b; }
function autoTargetRange() { return ({ near: 180, medium: 340, far: FIELD_MOBS.leash })[S.autoRange] || 340; }
function autoTarget(P, list) {
  const searching = !manual() && S.autoFind !== false, skillReach = Math.max(P.main.rad || 0, P.basic.rad || 0);
  const maxDistance = searching ? autoTargetRange() : skillReach + 40;
  const candidates = list.filter(e => Math.hypot(e.x - H.x, e.y - H.y) <= maxDistance);
  if (!manual() && S.autoBossPriority !== false) {
    const q = !R.tower && R.field && R.field.quest;
    // A quest boss must remain reachable after the kill quota, even when it is
    // farther away than the selected scan radius; otherwise auto can stall.
    if (q && q.boss && !q.boss.dead && q.kills >= q.target && list.includes(q.boss)) return q.boss;
  }
  if (!candidates.length) return null;
  if (!manual() && S.autoBossPriority !== false) {
    const priority = candidates.filter(e => e.cls === 'boss' || e.cls === 'elite' || e.goldBoss);
    if (priority.length) return nearest(priority);
  }
  return nearest(candidates);
}
/* Xoay chieu tu dong khi farm quai thuong (gap trum / tinh anh thi danh chieu chinh): luan phien cac chieu tan cong dang gan o 1..4 (luon co 2 chieu manh nhat, them chieu >= 40% DPS chieu manh nhat);
   chieu het noi luc thi bo qua, khong chieu nao du noi luc thi danh thuong. Tat: danh moi chieu chinh nhu truoc. */
function rotPool(P) {
  if (S.rot === false || S.autoSkills === false || window.NO_ROT) return [];   // NO_ROT: chi dung de so sanh A / B trong test
  const enabled = S.autoSkillSlots || [true, true, true, true];
  const ids = (S.slots || []).filter((id, i) => id && enabled[i] !== false), pool = P.actives.filter(a => ids.includes(a.id));
  if (pool.length < 1) return [];
  if (pool.length === 1) return pool;
  const byDps = pool.slice().sort((a, b) => b.dps - a.dps), top = byDps[0].dps, keep = new Set(byDps.filter((a, i) => i < 2 || a.dps >= top * 0.4));   // it nhat 2 chieu manh nhat, them chieu >= 40% DPS chieu manh nhat
  return ids.map(id => pool.find(a => a.id === id)).filter(a => a && keep.has(a));
}
function pickAttack(P, hard) {
  if (S.autoSkills === false) return P.basic;
  const enabled = S.autoSkillSlots || [true, true, true, true];
  const ids = (S.slots || []).filter((id, i) => id && enabled[i] !== false);
  const available = P.actives.filter(a => ids.includes(a.id));
  if (!available.length) return P.basic;
  const main = available.find(a => a.id === P.main.id) || available.slice().sort((a, b) => b.dps - a.dps)[0];
  if (hard || S.rot === false) return R.mana >= main.cost ? main : P.basic; // boss / tinh anh: dung chieu manh nhat, khong xoay
  const pool = rotPool(P);
  if (pool.length === 1) return R.mana >= pool[0].cost ? pool[0] : P.basic;
  if (pool.length < 2) return R.mana >= main.cost ? main : P.basic;
  const n = pool.length; R.rotI = (R.rotI || 0) % n;
  for (let k = 0; k < n; k++) { const a = pool[(R.rotI + k) % n]; if (R.mana >= a.cost) { R.rotI = (R.rotI + k + 1) % n; return a; } }
  return P.basic;
}
function resolveSkillHit(a, e) {
  if (!R.enemies.includes(e) || e.dead || e.hp <= 0) return;
  heroHit(a, e);
  if (!a.radial) skillFx(H, e, a);
}
function processSkillHits(dt) {
  R.hitClock += dt;
  while (R.hitSeq.length && R.hitSeq[0].at <= R.hitClock) {
    const hit = R.hitSeq.shift(); resolveSkillHit(hit.attack, hit.target);
  }
}
function strikeTargets(a, targets) {
  const strikes = Math.max(1, a.strikes || 1);
  if (strikes === 1) { for (const e of targets) resolveSkillHit(a, e); return; }
  const gap = Math.min(0.12, 0.75 / (Math.max(0.5, a.rate) * strikes));
  const attack = Object.assign({}, a, { parts: Object.fromEntries(Object.entries(a.parts).map(([el, v]) => [el, v / strikes])), strikes: 1 });
  for (let i = 0; i < strikes; i++) for (const e of targets) {
    if (i === 0) resolveSkillHit(attack, e);
    else R.hitSeq.push({ at: R.hitClock + i * gap, attack, target: e });
  }
}
/* Kỹ năng phụ cấp cấp 11 kích hoạt theo các sự kiện va chạm / đạn bay / đạn biến mất. */
function skillEventStage2(a, target, enemies) {
  const eventLevel = skillEventLevel(SK[a.id]);
  const event = eventLevel && a.L >= eventLevel ? skillEventAtLevel(a) : null;
  if (!event) return;
  const center = event.rays ? H : target, radius = event.rays ? 280 : 150, max = event.rays ? event.rays(a.L) : event.max;
  // Nhiếp Hồn Nguyệt Ảnh vẫn phát m150 nếu m149 vừa kết liễu mục tiêu trong cùng lượt đánh (web xét dead, chưa lọc hp <= 0).
  const near = enemies.filter(e => !e.dead && (e.hp > 0 || ([339, 362].includes(a.id) && e === target)) && Math.hypot(e.x - center.x, e.y - center.y) < radius && obsLine(center.x, center.y, e.x, e.y))
    .sort((x, y) => Math.hypot(x.x - center.x, x.y - center.y) - Math.hypot(y.x - center.x, y.y - center.y))
    .slice(0, max);
  for (let i = 0; i < near.length; i++) {
    if (event.chance && Math.random() >= event.chance) continue;
    const e = near[i], parts = skillEventParts(R.P, a, event);
    heroHit(Object.assign({}, a, { parts, stun: event.stun || a.stun, crit: event.el === 'phys' ? a.crit : 0, useAR: false, ev: false }), e);
    const label = event.rays ? `${event.n} ×${max}` : event.n;
    if (typeof skillEventFx === 'function') skillEventFx(e, a, i === 0 ? label : null, event.rays ? H : null, target);
  }
}
function heroAttack(useMain = false) {
  const P = R.P, list = alive(); if (!list.length) return 0.3;
  const t = useMain ? nearest(list) : autoTarget(P, list); if (!t) { R.moveTo = null; return 0.3; }
  const a = useMain ? (R.mana >= P.main.cost ? P.main : P.basic) : pickAttack(P, t.cls === 'boss' || t.cls === 'elite' || t.goldBoss);
  const d = Math.hypot(t.x - H.x, t.y - H.y) - t.r;
  const reach = t.homeX !== undefined && !manual() ? Math.min(a.rad, FIELD_MOBS.leash * .75) : a.rad;
  if (d > reach) {
    const q = !R.tower && R.field && R.field.quest, requiredBoss = q && q.boss === t && !t.dead && q.kills >= q.target;
    const canSeek = !manual() && (requiredBoss || useMain || (S.autoFind !== false && Math.hypot(t.x - H.x, t.y - H.y) <= autoTargetRange()));
    R.moveTo = S.autoAtk !== false && canSeek ? t : null; return 0.05;
  }
  R.moveTo = null;
  if (a.id && !skillWeaponOk(SK[a.id], S.eq)) { R.atkT = 0.2; return R.atkT; }
  R.mana -= a.cost;
  const c = a.around ? H : t, splash = a.around ? a.rad + 40 : 110; // form 7: quanh nguoi danh
  const angles = a.radial ? skillRayAngles(H, t, a.radial) : null;
  const candidates = list.filter(e => e !== t && (angles
    ? angles.some(angle => skillRayHit(t, e, angle, a.rad, a.rayWidth))
    : Math.hypot(e.x - c.x, e.y - c.y) < (a.targets > 1 ? splash : 0)));
  if (angles) candidates.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  const targets = candidates.slice(0, a.targets - 1);
  targets.unshift(t);
  strikeTargets(a, targets);
  skillEventStage2(a, t, list);
  if (a.radial) skillFx(H, t, a); // mot lan phong 4 tia, khong lap lai theo so quai trung
  H.face = t.x >= H.x ? 1 : -1; H.dir = dirOf(t.x - H.x, t.y - H.y); H.act = 'at'; H.actT = 0;
  if (a.id) skillSfx(a.id); else npcSfx(W.hero[S.fac] && W.hero[S.fac].anim, 'at', 0.4);
  return 1 / a.rate;
}
const BOSS_ULT_FROM = 40, BOSS_ULT_EVERY = 6;
function bossUlt(e) {
  const P = R.P, el = ['phys', 'poison', 'cold', 'fire', 'light'][e.series] === 'phys' ? 'phys' : ['phys', 'poison', 'cold', 'fire', 'light'][e.series] || 'phys';
  addText(H.x, H.y - 60, 'Tuyệt chiêu!', '#ff5a3a', 14); if (!R.quiet) R.hurtT = 0.4;
  if (P.blockRate && Math.random() * 100 < P.blockRate) { addText(H.x, H.y - 30, 'Hóa giải', '#9f9', 11); return; }
  let d = Math.min(0.5, e.goldBoss ? 0.42 : 0.35) * P.life * rnd(0.9, 1.1) * (diffOf().dmg);
  d = applyPart(d, el, e.series, P.series, P.res, PLAYER_RES_MAX, 10);
  if (P.statusRes && P.statusRes[el]) d *= 1 - P.statusRes[el] / 100;
  d *= 1 - P.sorbDamage / 100;
  R.lastHit = 'Tuyệt chiêu của ' + e.n; R.life -= Math.max(1, d); addText(H.x + rnd(-10, 10), H.y - 36, '-' + fmt(d), '#ff3a2a', 15);
}
const STUN_IMM_ELITE = 1.5, STUN_IMM_BOSS = 3;   // giây miễn nhiễm choáng tính từ lúc bị choáng
function enemyAI(e, dt) {
  const cm = curseMod(e);
  if (e.stunImm > 0) e.stunImm = Math.max(0, e.stunImm - dt);
  const regen = Math.max(0, e.regen + (cm ? cm.regen : 0) / 100);
  if (regen && e.hp > 0) e.hp = Math.min(e.max, e.hp + e.max * regen * dt);
  if (e.poison > 0) { const elapsed = Math.min(dt, e.poison); e.poison = Math.max(0, e.poison - dt); e.hp -= e.poisonDmg * elapsed; }
  if (e.stun > 0) { e.stun = Math.max(0, e.stun - dt); e.moving = false; return; }
  if (e.hp <= 0) return;
  if (e.homeX !== undefined && fieldIdle(e, dt)) return;
  const d = Math.hypot(H.x - e.x, H.y - e.y), reach = e.ranged ? 200 : e.r + 24;
  e.face = H.x >= e.x ? 1 : -1; e.dir = dirOf(H.x - e.x, H.y - e.y);
  e.moving = d > reach;
  if (e.moving) obsChase(e, H.x, H.y, e.spd * dt / (1 + (cm ? Math.max(0, cm.move) : 0) / 100));
  if (e.cls === 'boss' && e.L >= BOSS_ULT_FROM) {                      // Tuyet chieu cua trum: giam duoc bang chi so (khang, hoa giai, trieu tieu), khong can thao tac
    e.ultCd = (e.ultCd === undefined ? BOSS_ULT_EVERY * 0.4 : e.ultCd) - dt;
    if (e.ultCd <= 0 && d <= reach + 80) { e.ultCd = BOSS_ULT_EVERY; bossUlt(e); }
  }
  e.atkCd -= dt / (1 + (cm ? Math.max(0, cm.slow) : 0) / 100);
  if (d <= reach + 4 && e.atkCd <= 0) { e.atkCd = e.cd; enemyHit(e); e.act = 'at'; e.actT = 0; npcSfx(e.animKey || MON[e.tid].anim, 'at', 0.35); if (e.ranged) fxLine(e, H, { parts: { phys: 1 } }); }
}
function tick(dt) {
  obsFrame();
  if ((R.sweepT = (R.sweepT || 0) + dt) > 30) { R.sweepT = 0; autoEquipAll(); sweepJunk(); autoBuyWeapon(); autoForge(); checkHints(); if (typeof blessSweep === 'function') blessSweep(); }
  if (R.dirty) recalc();
  let P = R.P;
  if (R.deadT > 0) { R.deadT -= dt; if (R.deadT <= 0) { R.life = P.life; R.mana = P.mana; S.wave = 1; spawnWave(); } return; }
  R.life = Math.min(P.life, R.life + P.regen * dt); R.mana = Math.min(P.mana, R.mana + P.manaRegen * dt);
  autoPotion(dt);
  if (typeof skillSysTick === 'function') { skillSysTick(dt); if (R.dirty) recalc(); P = R.P; }
  if (S.autoTownHp && !R.town && !R.tower && !R.tk && !(typeof SV !== 'undefined' && SV.on) && (R.tpCd || 0) <= 0 && R.life <= P.life * S.townHpAt / 100) goTown();
  if (R.hurtT > 0) R.hurtT -= dt;
  if (R.tpCd > 0) R.tpCd -= dt;
  if (R.potCd) { R.potCd.life = Math.max(0, R.potCd.life - dt); R.potCd.mana = Math.max(0, R.potCd.mana - dt); }
  goldBossTick(dt); petTick(dt);                                         // phan thuong: trum Hoang Kim, dong hanh (rewards.js)
  if (R.town) { townTick(dt); return; }                                // trong thanh (Tho Dia Phu)
  processSkillHits(dt);
  if (!R.tower && !R.tk && R.field) fieldTick(dt);
  R.activeT = (R.activeT || 0) + dt; if (typeof jrAdd === 'function') jrAdd('sec', dt / (typeof gameSpeed === 'function' ? gameSpeed() : 1));                                    // thoi gian danh quai thuc (khong tinh tab an, trong thanh, Luyen Cong) -> S.kps
  if (manual()) moveManual(dt);                            // input tay uu tien; tha tay thi tra lai Auto truoc khi chon do
  const looting = updateGround(dt);                       // nhat do khop bo loc ngay ca khi con quai
  if (!R.enemies.length && !R.field) {
    if (looting && R.lootWait < 8) { R.lootWait += dt; return; }   // doi nhat xong (toi da 8 giay) moi goi dot moi
    if (R.spawnT > 0) { R.spawnT -= dt; return; }
    R.lootWait = 0;
    if (R.tower) towerSpawn(); else if (R.tk) tkSpawn(); else { spawnWave(); if (goldBossDue()) spawnGoldBoss(); }
    return;
  }
  // Tu nhat van danh tra; chi hoan di duoi quai de khong giang huong voi duong di nhat.
  if (S.autoAtk !== false && (!looting || !R.pickTarget)) {
    if (!looting && R.moveTo && R.moveTo.hp > 0) obsSteer(H, R.moveTo.x, R.moveTo.y, 150 * P.speed * dt);
    R.atkT -= dt; if (R.atkT <= 0) R.atkT = heroAttack();
  } else R.atkT = Math.max(0, (R.atkT || 0) - dt);
  for (const e of alive()) enemyAI(e, dt);
  killCheck();
  // Đi khám phá xa quái không bị coi là đánh quá lâu. Thời gian chỉ tính lúc giao tranh.
  if (R.tower || !R.field || alive().some(e => e.aggro && Math.hypot(e.x - H.x, e.y - H.y) < FIELD_MOBS.leash)) {
    R.stall += dt; if (R.stall > waveStallLimit()) stallOut();
  }
  if (R.life <= 0) heroDeath();
}
/* Dot quai qua lau (danh khong noi): truoc day chi goi lai dot moi -> o ai trum, nhan vat yeu danh lai trum mai mai, khong
   tien khong lui (ket vinh vien o ai 30/40/50). Nay: lui 1 ai va luyen cong nhu khi guc (khong mat mau), thap thi roi thap. */
function stallOut() {
  R.stall = 0;
  if (R.tower) { towerExit(false); return; }
  if (R.tk) { tkExit(false); return; }
  const boss = R.enemies.some(e => !e.dead && e.cls === 'boss');
  if (boss || S.wave === WAVES) {
    if (R.enemies.some(e => e.goldBoss && !e.dead)) RW().gbT = GB_RETRY;
    log('<span class="dim">Đánh mãi không hạ được, lui về luyện công.</span>');
    if (S.stage > 1) { S.stage--; S.push = false; R.farm = 0; }
    S.wave = 1; if (typeof onStageChange === 'function') onStageChange();
  } else log('<span class="dim">Đợt quái kéo dài quá lâu, gọi đợt mới.</span>');
  spawnWave();
}
function killCheck() {
  for (const e of R.enemies) if (e.hp <= 0 && !e.dead) { e.dead = true; onKill(e); if (R.field && !R.tower && !R.tk) fieldKilled(e); npcSfx(MON[e.tid].anim, 'die', 0.5); if (!R.quiet) { e.act = 'die'; e.actT = 0; R.corpses.push(e); } }
  if (R.field && !R.tower && !R.tk) {
    R.enemies = R.enemies.filter(e => !e.dead);
    if (fieldWaveCleared()) {
      waveCleared();
      if (zoneOf(S.stage).id !== R.field.key) spawnWave(); else startFieldWave();
    }
    return;
  }
  if (R.enemies.length && R.enemies.every(e => e.dead)) { R.enemies = []; waveCleared(); }
}
function onKill(e) {
  R.kills++; S.totalKills = (S.totalKills || 0) + 1;
  if (typeof jrAdd === 'function') jrAdd('kills', 1);
  burst(e.x, e.y, SERIES_COL[e.series]);
  if (R.tk) R.tk.kills++;
  else if (R.tower) { if (towerFirst()) (R.tower.pend = R.tower.pend || []).push({ L: e.L, cls: e.cls, series: e.series, x: e.x, y: e.y, goldBoss: e.goldBoss, n: e.n }); }
  else payKill(e);
  rwOnKill(e);
}
function payKill(e) {
  const lvDiff = e.L - S.lvl, mult = lvDiff < -10 ? 0.4 : lvDiff < -5 ? 0.8 : 1.2;
  R.jrOn = true; gainXp(expFor(e.L) * CLS[e.cls].xp * mult * diffOf().rew * 2 * (R.tower ? TOWER_XP : 1)); R.jrOn = false;
  const g = Math.round(moneyDrop(e) * diffOf().rew * 3); S.gold += g; if (typeof jrAdd === 'function') jrAdd('gold', g);
  for (const it of rollDrops(e)) dropToGround(it, e);
  if (typeof skillBookDrop === 'function' && skillBookDrop(e)) log(`Nhặt được <b style="color:#ffd24a">Võ Lâm Mật Tịch 90</b>`);
  for (const m of allDrops(e)) log(`Nhặt được <b style="color:${RAR_COL[3]}">${esc(m)}</b>`);
  const gold = rollSetDrop(e); if (gold) { dropToGround(gold, e); log(`<b style="color:${RAR_COL[gold.r]}">${esc(gold.n)}</b> rơi ra!`); }
  if (e.cls === 'boss') log(`Hạ <b class="boss">${esc(e.n)}</b> (+${fmt(g)} lượng)`);
}
function gainXp(x) {
  if (S.lvl >= MAX_LEVEL) return;
  if (R.jrOn && typeof jrAdd === 'function') jrAdd('xp', x * (1 + rebornBonus().xp + ((R.P && R.P.xpBonus) || 0) / 100) / xpSlow(S.lvl));
  S.xp += x * (1 + rebornBonus().xp + ((R.P && R.P.xpBonus) || 0) / 100) / xpSlow(S.lvl); // bonus kinh nghiem tu trang bi va chuyen sinh
  while (S.lvl < MAX_LEVEL && S.xp >= J.exp[S.lvl - 1]) {
    S.xp -= J.exp[S.lvl - 1]; S.lvl++;
    S.attrPts += PTS_PER_LEVEL; S.skPts += SKILL_PTS_PER_LEVEL;
    R.dirty = true; uiSfx('levelup'); log(`<b class="up">Lên cấp ${S.lvl}!</b> +${PTS_PER_LEVEL} tiềm năng, +${SKILL_PTS_PER_LEVEL} kỹ năng`);
    if (typeof onLevelUp === 'function') onLevelUp();
  }
}
function waveCleared() {
  if (R.tower) { towerCleared(); return; }
  if (R.tk) { tkCleared(); return; }                 // thap thu thach: len tang, khong doi ai
  heal(R.P.life * 0.15, true); R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.2); // dieu tuc giua cac dot
  if (S.wave < WAVES) { S.wave++; R.spawnT = 1.2; return; }
  S.wave = 1;
  if (!S.push && ++R.farm >= 3 && R.life > R.P.life * 0.6) { S.push = true; R.farm = 0; log('Đủ mạnh, thử vượt ải tiếp.'); }
  if (S.push) {
    S.stage++; S.maxStage = Math.max(S.maxStage, S.stage); questTick('stages');
    if (inZone(S.stage) === 1 && S.stage <= STAGES) log(`Tiến vào <b>${esc(zoneOf(S.stage).n)}</b>`);
  }
  if (typeof onStageChange === 'function') onStageChange();
}
function heroDeath() {
  if (typeof jrDeath === 'function') jrDeath(R.lastHit || 'Trọng thương');
  if (R.enemies.some(e => e.goldBoss && !e.dead)) RW().gbT = GB_RETRY;   // thua trum Hoang Kim: 5 phut sau quay lai
  R.deadT = 3; R.life = 0; R.enemies = []; R.hitSeq = []; R.field = null;
  log('<span class="bad">Bạn đã trọng thương.</span>');
  if (R.tower) { towerExit(true); return; }
  if (R.tk) { tkExit(true); return; }               // gục trong thap: roi thap, khong lui ai
  if (S.stage > 1) { S.stage--; S.push = false; R.farm = 0; log(`Lùi về ải ${S.stage} để luyện công.`); }
  if (typeof onStageChange === 'function') onStageChange();
}
function recalc() {
  const fl = R.P ? R.life / R.P.life : 1, fm = R.P ? R.mana / R.P.mana : 1;
  R.P = calc();
  R.life = Math.min(R.P.life, R.P.life * fl); R.mana = Math.min(R.P.mana, R.P.mana * fm);
  R.power = power(R.P); R.dirty = false;
  if (typeof heroLook === 'function') R.look = heroLook();
  if (typeof jxSetup === 'function') {
    const next = jxSetup(), key = next && next.key;
    if (key !== (R.jx && R.jx.key)) { R.jx = next; if (next && typeof jxPreload === 'function') jxPreload(); }
    else R.jx = next;
  }
}

/* ---------- mo phong nhanh (kiem thu, tien trinh offline) ---------- */
function simulate(seconds, step = 0.05) { const q = R.quiet; R.quiet = true; for (let t = 0; t < seconds; t += step) tick(step); R.quiet = q; }
