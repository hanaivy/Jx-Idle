/* ======================= NGOAI HINH THEO TRANG BI =======================
   Game chi co 1 bo hinh (sprite) co dinh cho moi mon phai (khong co hinh tung mon nhu file .spr cua JX1), nen ngoai hinh
   doi theo do mac bang hieu ung:
   - Ao: nhuom mau phan than (duoi dau) theo ao: Xanh / Vang / Tim = mau he cua ao, dam dan theo do hiem; Hoang Kim = vang kim; Bach Kim = bac trang
   - Mu: nhuom nhe phan dau theo mu (cung luat)
   - Hao quang duoi chan: du bo Hoang Kim (vang), Bach Kim (bac xanh); hoac trang bi cuong hoa trung binh >= +7 (mau he nhan vat)
   - Vu khi cuong hoa +5 tro len: dom sang quanh nhan vat theo he vu khi, +10 ruc ro hon
   - Than ma: bui chan mang mau he cua ngua
   Tat / bat o the Khac (S.lookFx). Giam hieu ung: giu nhuom mau, bo hat sang. */
'use strict';
const LOOK_RAR_A = [0, 0.24, 0.32, 0.4, 0.42, 0.42];
const TM_DUST = { ovan: '#5fb8ff', xtho: '#ff6a3a', tanh: '#f3d35b', dlo: '#6fd46a', cdsu: '#c8965a' };
function partTint(it) {
  if (!it || !reqOk(it)) return null;
  if (it.set) return it.set.kind === 'platina' ? { c: '#e6f4ff', a: 0.48 } : { c: '#ffc93c', a: 0.44 };
  const a = LOOK_RAR_A[it.r || 0]; if (!a) return null;
  return { c: it.s >= 0 ? SERIES_COL[it.s] : RAR_COL[it.r], a };
}
/* Tinh ngoai hinh tu do dang mac (goi khi doi do: R.dirty -> recalc) */
function heroLook() {
  const eq = S.eq, worn = Object.values(eq).filter(it => it && it.d !== 10);
  const body = partTint(eq.armor), head = partTint(eq.helm);
  let aura = null;
  if (typeof enoughToActive === 'function' && enoughToActive(eq)) {
    const plat = worn.filter(it => it.set && it.set.kind === 'platina').length, gold = worn.filter(it => it.set && it.set.kind === 'gold').length;
    aura = plat >= gold ? { c: '#bfe6ff', c2: '#ffffff', k: 1 } : { c: '#ffb52e', c2: '#fff1a8', k: 1 };
  } else if (worn.length >= 5) {
    const avg = worn.reduce((t, it) => t + (it.enh || 0), 0) / worn.length;
    if (avg >= 7) aura = { c: SERIES_COL[heroSeries()], c2: '#ffffff', k: avg >= 9 ? 0.9 : 0.6 };
  }
  const w = eq.weapon, we = w && reqOk(w) ? w.enh || 0 : 0;
  const glow = we >= 5 ? { c: w.s >= 0 ? SERIES_COL[w.s] : '#ffe9a8', n: we >= 10 ? 3 : we >= 8 ? 2 : 1 } : null;
  const h = eq.horse, dust = h && h.thanma ? TM_DUST[h.thanma] || '#ffd24a' : null;
  return { body, head, aura, glow, dust, key: JSON.stringify([body, head, aura, glow, dust]) };
}
const lookOn = () => S && S.lookFx !== false;
/* ---------- ve: khung hinh nhuom mau (luu dem theo khung) ---------- */
const LOOK_CACHE = new Map();
function tintedFrame(im, m, fr, d, L) {
  const k = `${m.f}|${fr}|${d}|${L.key}`; let cv = LOOK_CACHE.get(k);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h;
  const c = cv.getContext('2d');
  c.drawImage(im, fr * m.w, d * m.h, m.w, m.h, 0, 0, m.w, m.h);
  c.globalCompositeOperation = 'source-atop';
  const headY = Math.max(0, m.ay - m.h * 0.8), split = headY + (m.ay - headY) * 0.28;   // ~28% tren cung tu dinh dau toi chan = dau
  if (L.body) { const g = c.createLinearGradient(0, split - 4, 0, split + 6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, L.body.c); c.globalAlpha = L.body.a; c.fillStyle = g; c.fillRect(0, split - 4, m.w, m.h); }
  if (L.head) { c.globalAlpha = L.head.a; c.fillStyle = L.head.c; c.fillRect(0, 0, m.w, split); }
  if (LOOK_CACHE.size > 600) LOOK_CACHE.clear();
  LOOK_CACHE.set(k, cv); return cv;
}
/* Thay cho drawAnim khi ve nhan vat: tra ve chieu cao da ve (nhu drawAnim) */
function drawHeroAnim(key, act, dir, t, x, y, sc, alpha = 1) {
  if (typeof jxOn === 'function' && jxOn() && R.jx) { const h = drawJxHero(act, dir, t, x, y, sc, alpha, key); if (h) return h; }   // hinh JX1 theo trang bi
  const L = R.look; if (!lookOn() || !L || (!L.body && !L.head)) return drawAnim(key, act, dir, t, x, y, sc, alpha);
  const set = W.anim && W.anim[key]; if (!set) return false;
  const m = set[act] || set.st; if (!m) return false;
  const im = img('img/a/' + m.f); if (!im.complete || !im.naturalWidth) return false;
  let fr = Math.floor(t * 1000 / m.ms); fr = ONCE[act] ? Math.min(fr, m.n - 1) : fr % m.n;
  const d = m.d >= 8 ? dir : Math.floor(dir * m.d / 8);
  CX.globalAlpha = alpha; CX.drawImage(tintedFrame(im, m, fr, d, L), x - m.ax * sc, y - m.ay * sc, m.w * sc, m.h * sc); CX.globalAlpha = 1;
  return m.h * sc;
}
/* Hao quang duoi chan (ve truoc nhan vat) */
function drawAura(c) {
  const L = R.look; if (!lookOn() || !L || !L.aura) return;
  const t = (R.clock || 0), p = 0.5 + 0.5 * Math.sin(t * 3), A = L.aura;
  c.save(); c.globalAlpha = (0.35 + 0.25 * p) * A.k; c.strokeStyle = A.c; c.lineWidth = 2;
  c.beginPath(); c.ellipse(H.x, H.y, 24 + p * 4, 9 + p * 1.5, 0, 0, 7); c.stroke();
  c.globalAlpha = 0.18 * A.k; c.fillStyle = A.c; c.beginPath(); c.ellipse(H.x, H.y, 22, 8, 0, 0, 7); c.fill();
  c.restore();
  if (S.lowFx) return;
  const P = R.lookP || (R.lookP = []);
  if (Math.random() < 0.25 * A.k) P.push({ x: H.x + rnd(-18, 18), y: H.y + rnd(-3, 3), vy: -rnd(18, 34), life: 1.1, c: Math.random() < 0.5 ? A.c : A.c2 });
}
/* Sprite trạng thái lấy từ jxstate.js của https://volamidle.pages.dev/, giữ đúng frame/anchor gốc. */
const SHAOLIN_STATE_SPRITES = {
  15: { f: 'fx/st_0.webp', n: 13, w: 342, h: 239, ax: 177, ay: 168, ms: 92, pos: 'body' },
  16: { f: 'fx/st_1.webp', n: 10, w: 107, h: 75, ax: 50, ay: 37, ms: 120, pos: 'foot' },
  273: { f: 'fx/st_29.webp', n: 15, w: 168, h: 167, ax: 85, ay: 168, ms: 80, pos: 'head' },
};
function drawShaolinSkillEffects(c, layer) {
  if (S.fac !== 'shaolin' || S.lookFx === false || R.deadT > 0) return;
  const t = R.clock || 0, scale = HERO_SCALE * 0.6;
  for (const id of layer === 'under' ? [16] : [15, 273]) {
    const state = SHAOLIN_STATE_SPRITES[id];
    const enabled = id === 16 ? auraActive(16) : id === 15 ? skillBuffActive(15) : !!S.sk[id] && skApplies(SK[id]);
    if (!enabled) continue;
    const im = img(state.f); if (!im.complete || !im.naturalWidth) continue;
    const frame = Math.floor(t * 1000 / state.ms) % state.n;
    // Sprite trạng thái của web đã canh anchor từ chân nhân vật cho cả body lẫn foot.
    const y = H.y;
    c.save(); c.globalAlpha = 0.9;
    c.drawImage(im, frame * state.w, 0, state.w, state.h,
      H.x - state.ax * scale, y - state.ay * scale, state.w * scale, state.h * scale);
    c.restore();
  }
}
/* Tian Vuong buff effects copied from the live site's JX state sprite table. */
const TIANWANG_STATE_SPRITES = {
  33: { f: 'fx/st_2.webp', n: 10, w: 36, h: 40, ax: 16, ay: 116, ms: 120 },
  42: { f: 'fx/st_3.webp', n: 20, w: 75, h: 78, ax: 35, ay: 72, ms: 60 },
};
function drawTianwangSkillEffects(c, layer) {
  if (S.fac !== 'tianwang' || layer !== 'over' || S.lookFx === false || R.deadT > 0) return;
  const t = R.clock || 0, scale = HERO_SCALE * 0.6;
  for (const id of [33, 42]) {
    if (!skillBuffActive(id)) continue;
    const state = TIANWANG_STATE_SPRITES[id], im = img(state.f);
    if (!im.complete || !im.naturalWidth) continue;
    const frame = Math.floor(t * 1000 / state.ms) % state.n;
    c.save(); c.globalAlpha = 0.9;
    c.drawImage(im, frame * state.w, 0, state.w, state.h,
      H.x - state.ax * scale, H.y - state.ay * scale, state.w * scale, state.h * scale);
    c.restore();
  }
}
/* Ngũ Độc: hiệu ứng Vô Hình Độc và các trạng thái bùa hại trên mục tiêu. */
const WUDU_STATE_SPRITES = {
  64: { f: 'fx/st_4.webp', n: 24, w: 87, h: 109, ax: 41, ay: 158, ms: 50, pos: 'head' },
  67: { f: 'fx/st_5.webp', n: 24, w: 93, h: 123, ax: 44, ay: 163, ms: 50, pos: 'head' },
  69: { f: 'fx/st_6.webp', n: 24, w: 115, h: 104, ax: 55, ay: 50, ms: 50, pos: 'foot' },
  70: { f: 'fx/st_7.webp', n: 24, w: 89, h: 117, ax: 42, ay: 161, ms: 50, pos: 'head' },
  72: { f: 'fx/st_8.webp', n: 24, w: 83, h: 109, ax: 39, ay: 159, ms: 50, pos: 'head' },
  73: { f: 'fx/st_9.webp', n: 20, w: 101, h: 86, ax: 55, ay: 77, ms: 60, pos: 'body' },
  356: { f: 'fx/st_27.webp', n: 15, w: 25, h: 50, ax: 13, ay: 129, ms: 80, pos: 'head' },
  390: { f: 'fx/st_34.webp', n: 20, w: 52, h: 46, ax: 23, ay: 97, ms: 60, pos: 'head' },
};
function drawWuduSkillEffects(c, layer) {
  if (S.fac !== 'wudu' || S.lookFx === false || R.deadT > 0) return;
  if (layer !== 'under' || !auraActive(69)) return;
  const s = WUDU_STATE_SPRITES[69], im = img(s.f);
  if (!im.complete || !im.naturalWidth) return;
  const frame = Math.floor((R.clock || 0) * 1000 / s.ms) % s.n, scale = HERO_SCALE * 0.6;
  c.save(); c.globalAlpha = 0.85;
  c.drawImage(im, frame * s.w, 0, s.w, s.h, H.x - s.ax * scale, H.y - s.ay * scale, s.w * scale, s.h * scale);
  c.restore();
}
function drawWuduEnemyCurses(c, e, scale) {
  if (S.lookFx === false || !e.curse) return;
  const now = R.skillClock || 0, seen = new Set();
  for (const id of Object.keys(e.curse)) {
    const s = WUDU_STATE_SPRITES[id];
    if (!s || e.curse[id] <= now || seen.has(s.pos)) continue;
    seen.add(s.pos);
    const im = img(s.f); if (!im.complete || !im.naturalWidth) continue;
    const frame = Math.floor((R.clock || 0) * 1000 / s.ms) % s.n, k = scale * 0.6;
    c.save(); c.globalAlpha = Math.min(0.9, (e.curse[id] - now) / 1.5);
    c.drawImage(im, frame * s.w, 0, s.w, s.h, e.x - s.ax * k, e.y - s.ay * k, s.w * k, s.h * k);
    c.restore();
  }
}
/* Trạng thái chiêu Thiên Nhẫn theo bảng JXST trên web tham chiếu. */
const TIANREN_STATE_SPRITES = {
  136: { f: 'fx/st_17.webp', n: 5, w: 75, h: 58, ax: -121, ay: -82, ms: 240, pos: 'head' },
  137: { f: 'fx/st_18.webp', n: 15, w: 64, h: 52, ax: 31, ay: 117, ms: 80, pos: 'head' },
  140: { f: 'fx/st_19.webp', n: 15, w: 67, h: 55, ax: 34, ay: 119, ms: 80, pos: 'head' },
  143: { f: 'fx/st_20.webp', n: 15, w: 69, h: 56, ax: 32, ay: 114, ms: 80, pos: 'head' },
  150: { f: 'fx/st_21.webp', n: 15, w: 62, h: 74, ax: 32, ay: 128, ms: 80, pos: 'head' },
  364: { f: 'fx/st_33.webp', n: 15, w: 60, h: 51, ax: 25, ay: 68, ms: 80, pos: 'body' },
  391: { f: 'fx/st_35.webp', n: 18, w: 74, h: 45, ax: 36, ay: 21, ms: 67, pos: 'foot' },
};
function drawJxStateSprite(c, s, x, y, scale, alpha = 0.9) {
  const im = img(s.f); if (!im.complete || !im.naturalWidth) return;
  const frame = Math.floor((R.clock || 0) * 1000 / s.ms) % s.n, k = scale * 0.6;
  c.save(); c.globalAlpha = alpha;
  c.drawImage(im, frame * s.w, 0, s.w, s.h, x - s.ax * k, y - s.ay * k, s.w * k, s.h * k);
  c.restore();
}
function drawTianrenSkillEffects(c, layer) {
  if (S.fac !== 'tianren' || S.lookFx === false || R.deadT > 0) return;
  const seen = new Set();
  for (const id of Object.keys(TIANREN_STATE_SPRITES)) {
    const skill = SK[id], state = TIANREN_STATE_SPRITES[id];
    if (!skill || !S.sk[id] || isAttack(skill) || !skApplies(skill) || (state.pos === 'foot') !== (layer === 'under') || seen.has(state.f)) continue;
    seen.add(state.f); drawJxStateSprite(c, state, H.x, H.y, HERO_SCALE);
  }
}
function setTianrenHitState(a, e) {
  if (S.fac !== 'tianren' || S.lowFx || !a || !a.id || !isAttack(SK[a.id])) return;
  const state = TIANREN_STATE_SPRITES[a.id]; if (!state) return;
  e.tianrenState = state; e.tianrenStateUntil = (R.skillClock || 0) + 2.5;
}
function drawTianrenEnemyState(c, e, scale) {
  if (S.fac !== 'tianren' || S.lookFx === false || !e.tianrenState) return;
  const left = (e.tianrenStateUntil || 0) - (R.skillClock || 0); if (left <= 0) { e.tianrenState = null; return; }
  drawJxStateSprite(c, e.tianrenState, e.x, e.y, scale, Math.min(0.9, left));
}
/* Hai buff có sprite trạng thái riêng của Thúy Yên theo bảng JXST. */
const THUYYEN_STATE_SPRITES = {
  100: { f: 'fx/st_14.webp', n: 16, w: 139, h: 100, ax: 70, ay: 95, ms: 75, pos: 'body' },
  109: { f: 'fx/st_15.webp', n: 16, w: 122, h: 138, ax: 59, ay: 102, ms: 75, pos: 'body' },
};
function drawThuyYenSkillEffects(c, layer) {
  if (S.fac !== 'cuiyan' || layer !== 'over' || S.lookFx === false || R.deadT > 0) return;
  for (const id of [100, 109]) if (skillBuffActive(id)) drawJxStateSprite(c, THUYYEN_STATE_SPRITES[id], H.x, H.y, HERO_SCALE);
}
/* Dom sang vu khi + hat hao quang bay len (ve sau nhan vat) */
function drawLookFx(c, dt) {
  const L = R.look; if (!lookOn() || !L || S.lowFx) { R.lookP = null; return; }
  const P = R.lookP || (R.lookP = []);
  if (L.glow && Math.random() < 0.12 * L.glow.n) { const a = rnd(0, 7); P.push({ x: H.x + Math.cos(a) * rnd(8, 20), y: H.y - 26 + Math.sin(a) * rnd(6, 16), vy: -rnd(6, 16), life: 0.7, c: L.glow.c, s: 1 + L.glow.n * 0.5 }); }
  c.save();
  for (const q of P) { q.life -= dt; q.y += q.vy * dt; c.globalAlpha = clamp(q.life, 0, 1) * 0.85; c.fillStyle = q.c; c.beginPath(); c.arc(q.x, q.y, q.s || 1.4, 0, 7); c.fill(); }
  c.restore(); R.lookP = P.filter(q => q.life > 0).slice(-80);
}
