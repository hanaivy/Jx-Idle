/* ======================= VE SAN DAU (canvas) ======================= */
'use strict';
let CV, CX, DPR = 1;
const MON_SCALE = 1.4, HERO_SCALE = 1.35; // bang hoat anh xuat o 0.6 kich thuoc goc
const IMG = {};
const WEBP_VERSION = '20261005-v3'; // Tang khi thay WebP de CDN, browser va service worker cung lay anh moi.
function versionedImageUrl(src) {
  if (!/\.webp(?=$|[?#])/i.test(src) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src) || /[?&]v=/.test(src)) return src;
  const hashAt = src.indexOf('#'), hash = hashAt < 0 ? '' : src.slice(hashAt), path = hashAt < 0 ? src : src.slice(0, hashAt);
  return `${path}${path.includes('?') ? '&' : '?'}v=${WEBP_VERSION}${hash}`;
}
function img(src) { if (!src) return null; let i = IMG[src]; if (!i) { i = new Image(); i.src = versionedImageUrl(src); IMG[src] = i; } return i; }
function addText(x, y, t, color, size = 12) { const max = giamHieuUng() ? 20 : 60; if (R.quiet || R.txt.length > max) return; R.txt.push({ x, y, t, color, size, life: giamHieuUng() ? 0.6 : 0.9 }); }
function burst(x, y, color) { if (R.quiet) return; R.fx.push({ k: 'ring', x, y, color, life: 0.45, max: 0.45 }); }
function fxLine(a, b, atk) {
  if (R.quiet || R.fx.length > 80) return;
  let el = 'phys', v = 0; for (const e in atk.parts) if (atk.parts[e] > v) { v = atk.parts[e]; el = e; }
  R.fx.push({ k: 'line', x1: a.x, y1: a.y - 20, x2: b.x, y2: b.y - 14, color: ELEM_COL[el], life: 0.18, max: 0.18 });
}
/* ---------- hieu ung chieu goc (Missles.txt -> tools/extract_fx.py -> fx.js): dan bay theo huong + no tai muc tieu ----------
   chieu can chien: phat hoat anh tai muc tieu; thieu hinh thi ve tia nhu cu */
const JFX = window.JFX || { m: {}, s: {}, c: {}, f: {} }, FX_SCALE = 1.4, FX_MAX = 60;
/* fx2.js trên web chứa m1 dùng cho bốn đạn phụ của Tứ Tượng Đồng Quy. */
JFX.m['1'] = JFX.m['1'] || {
  fly: { f: 'fx/m1_fly.webp', n: 4, d: 16, w: 152, h: 91, ax: 76, ay: 66, ms: 56 },
  hit: { f: 'fx/m1_hit.webp', n: 6, d: 1, w: 54, h: 50, ax: 27, ay: 47, ms: 112 }, spd: 360,
};
/* fx2.js còn khai báo hai PreCastSpr riêng cho Phật Tâm Từ Hữu và Từ Hàng Phổ Độ. */
JFX.c.p92 = JFX.c.p92 || { f: 'fx/c2_92.webp', n: 5, d: 1, w: 53, h: 53, ax: 27, ay: 46, ms: 60 };
JFX.c.p93 = JFX.c.p93 || { f: 'fx/c2_93.webp', n: 5, d: 1, w: 53, h: 53, ax: 27, ay: 46, ms: 60 };
JFX.c.p100 = JFX.c.p100 || { f: 'fx/c2_100.webp', n: 5, d: 1, w: 53, h: 53, ax: 27, ay: 46, ms: 60 };
JFX.c.p109 = JFX.c.p109 || { f: 'fx/c2_109.webp', n: 5, d: 1, w: 53, h: 53, ax: 27, ay: 46, ms: 60 };
JFX.c.p269 = JFX.c.p269 || { f: 'fx/c2_269.webp', n: 20, d: 1, w: 38, h: 80, ax: 20, ay: 68, ms: 60 };
JFX.c.p150 = JFX.c.p150 || { f: 'fx/c2_150.webp', n: 5, d: 1, w: 52, h: 50, ax: 27, ay: 38, ms: 60 };
JFX.f[92] = Object.assign({ form: 1, num: 1 }, JFX.f[92] || {}, { pre: 'p92' });
JFX.f[93] = Object.assign({ form: 1, num: 1 }, JFX.f[93] || {}, { pre: 'p93' });
JFX.f[100] = Object.assign({ form: 1, num: 1 }, JFX.f[100] || {}, { pre: 'p100' });
JFX.f[109] = Object.assign({ form: 1, num: 1 }, JFX.f[109] || {}, { pre: 'p109' });
JFX.f[150] = Object.assign({ form: 7, num: 1 }, JFX.f[150] || {}, { pre: 'p150' });
JFX.f[269] = Object.assign({ form: 6, num: 1 }, JFX.f[269] || {}, { pre: 'p269' });
JFX.m['11'] = JFX.m['11'] || {
  fly: { f: 'fx/m11_fly.webp', n: 3, d: 16, w: 74, h: 42, ax: 37, ay: 38, ms: 56 },
  hit: { f: 'fx/m11_hit.webp', n: 7, d: 1, w: 49, h: 49, ax: -73, ay: -68, ms: 56 }, spd: 1080,
};
JFX.m['148'] = JFX.m['148'] || {
  fly: { f: 'fx/m148_fly.webp', n: 40, d: 1, w: 151, h: 228, ax: 70, ay: 187, ms: 56 }, spd: 200,
};
if (JFX.f[102]) JFX.f[102] = Object.assign({}, JFX.f[102], { sub: { c: '196', n: 16, form: 1 } });
if (JFX.f[111]) JFX.f[111] = Object.assign({}, JFX.f[111], { sub: { c: '11', n: 16, form: 3 } });
if (JFX.f[148]) JFX.f[148] = Object.assign({}, JFX.f[148], { sub: { c: '82', n: 8, form: 3 } });
if (JFX.f[337]) JFX.f[337] = Object.assign({}, JFX.f[337], { ev2c: '148' });
/* Đòn phụ cấp 11 của Phong Sương Toái Ảnh dùng đạn m144 riêng trên web (fx2.js). */
JFX.m['144'] = JFX.m['144'] || {
  fly: { f: 'fx/m144_fly.webp', n: 4, d: 16, w: 100, h: 61, ax: 50, ay: 47, ms: 56 },
  hit: { f: 'fx/m144_hit.webp', n: 7, d: 1, w: 49, h: 49, ax: -73, ay: -68, ms: 56 },
  spd: 600,
};
if (JFX.f[380]) JFX.f[380] = Object.assign({}, JFX.f[380], { ev2c: '144' });
/* Tam Nga Tề Tuyết dùng m143 cho hiệu ứng sự kiện cấp 11 (fx2.js trên web). */
JFX.m['143'] = JFX.m['143'] || {
  fly: { f: 'fx/m143_fly.webp', n: 8, d: 1, w: 210, h: 176, ax: 103, ay: 115, ms: 112 },
  hit: { f: 'fx/m143_hit.webp', n: 7, d: 1, w: 49, h: 49, ax: -73, ay: -68, ms: 112 }, spd: 200,
};
if (JFX.f[328]) JFX.f[328] = Object.assign({}, JFX.f[328], { ev2c: '143' });
if (JFX.f[82]) JFX.f[82] = Object.assign({}, JFX.f[82], { sub: { c: '1', n: 4, form: 3 } });
/* Một số missile và override của Côn Lôn nằm trong fx2.js trên web, app local không nạp tệp đó. */
JFX.m['193'] = JFX.m['193'] || {
  fly: { f: 'fx/m193_fly.webp', n: 27, d: 1, w: 168, h: 144, ax: 85, ay: 96, ms: 56 },
  hit: { f: 'fx/m193_hit.webp', n: 8, d: 1, w: 55, h: 50, ax: 26, ay: 47, ms: 56 }, spd: 200,
};
JFX.m['197'] = JFX.m['197'] || {
  fly: { f: 'fx/m197_fly.webp', n: 10, d: 16, w: 85, h: 56, ax: 41, ay: 37, ms: 56 },
  hit: { f: 'fx/m197_hit.webp', n: 8, d: 1, w: 55, h: 50, ax: 26, ay: 47, ms: 56 }, spd: 900,
};
/* Dan con va su kien cua Duong Mon trich tu fx2.js tren web. */
JFX.m['36'] = JFX.m['36'] || { fly: { f: 'fx/m36_fly.webp', n: 8, d: 16, w: 26, h: 16, ax: 13, ay: 31, ms: 56 }, spd: 540 };
JFX.m['126'] = JFX.m['126'] || {
  fly: { f: 'fx/m126_fly.webp', n: 1, d: 16, w: 33, h: 17, ax: 16, ay: 30, ms: 56 },
  hit: { f: 'fx/m126_hit.webp', n: 13, d: 1, w: 34, h: 40, ax: 17, ay: 37, ms: 56 }, spd: 930,
};
JFX.m['128'] = JFX.m['128'] || {
  fly: { f: 'fx/m128_fly.webp', n: 16, d: 1, w: 147, h: 117, ax: 79, ay: 61, ms: 56 },
  hit: { f: 'fx/m128_hit.webp', n: 16, d: 1, w: 147, h: 117, ax: 79, ay: 61, ms: 56 }, spd: 200,
};
JFX.m['150'] = JFX.m['150'] || { fly: { f: 'fx/m150_fly.webp', n: 16, d: 1, w: 211, h: 197, ax: 113, ay: 170, ms: 56 }, spd: 200 };
JFX.m['154'] = JFX.m['154'] || {
  fly: { f: 'fx/m154_fly.webp', n: 27, d: 1, w: 166, h: 143, ax: 85, ay: 95, ms: 56 },
  hit: { f: 'fx/m154_hit.webp', n: 27, d: 1, w: 166, h: 143, ax: 85, ay: 95, ms: 56 }, spd: 200,
};
JFX.m['156'] = JFX.m['156'] || {
  fly: { f: 'fx/m156_fly.webp', n: 27, d: 1, w: 167, h: 143, ax: 86, ay: 94, ms: 56 },
  hit: { f: 'fx/m156_hit.webp', n: 27, d: 1, w: 167, h: 143, ax: 86, ay: 94, ms: 56 }, spd: 200,
};
JFX.m['158'] = JFX.m['158'] || {
  fly: { f: 'fx/m158_fly.webp', n: 27, d: 1, w: 175, h: 145, ax: 86, ay: 96, ms: 56 },
  hit: { f: 'fx/m158_hit.webp', n: 27, d: 1, w: 175, h: 145, ax: 86, ay: 96, ms: 56 }, spd: 200,
};
JFX.m['160'] = JFX.m['160'] || {
  fly: { f: 'fx/m160_fly.webp', n: 27, d: 1, w: 168, h: 144, ax: 85, ay: 96, ms: 56 },
  hit: { f: 'fx/m160_hit.webp', n: 27, d: 1, w: 168, h: 144, ax: 85, ay: 96, ms: 56 }, spd: 200,
};
JFX.m['162'] = JFX.m['162'] || {
  fly: { f: 'fx/m162_fly.webp', n: 27, d: 1, w: 167, h: 133, ax: 86, ay: 83, ms: 56 },
  hit: { f: 'fx/m162_hit.webp', n: 27, d: 1, w: 167, h: 133, ax: 86, ay: 83, ms: 56 }, spd: 200,
};
if (JFX.f[347]) JFX.f[347] = Object.assign({}, JFX.f[347], { sub: { c: '158', n: 4, form: 6 } });
if (JFX.f[303]) JFX.f[303] = Object.assign({}, JFX.f[303], { sub: { c: '128', n: 4, form: 6 } });
if (JFX.f[343]) JFX.f[343] = Object.assign({}, JFX.f[343], { sub: { c: '154', n: 4, form: 6 } });
if (JFX.f[345]) JFX.f[345] = Object.assign({}, JFX.f[345], { sub: { c: '156', n: 4, form: 6 } });
if (JFX.f[349]) JFX.f[349] = Object.assign({}, JFX.f[349], { sub: { c: '160', n: 4, form: 6 } });
if (JFX.f[58]) JFX.f[58] = Object.assign({}, JFX.f[58], { sub: { c: '36', n: 3, form: 3 } });
if (JFX.f[351]) JFX.f[351] = Object.assign({}, JFX.f[351], { sub: { c: '162', n: 4, form: 6 } });
if (JFX.f[302]) JFX.f[302] = Object.assign({}, JFX.f[302], { ev2c: '126' });
if (JFX.f[339]) JFX.f[339] = Object.assign({}, JFX.f[339], { ev2c: '150' });
if (JFX.f[172]) JFX.f[172] = Object.assign({}, JFX.f[172], { sub: { c: '197', n: 6, form: 1 } });
if (JFX.f[375]) JFX.f[375] = Object.assign({}, JFX.f[375], { ev2c: '193' });
/* Thiên Ngoại Lưu Tinh dùng m170 cho sự kiện cấp 11 theo fx2.js trên web. */
JFX.m['170'] = JFX.m['170'] || {
  fly: { f: 'fx/m170_fly.webp', n: 35, d: 1, w: 202, h: 225, ax: 103, ay: 182, ms: 56 }, spd: 200,
};
if (JFX.f[362]) JFX.f[362] = Object.assign({}, JFX.f[362], { ev2c: '170' });
JFX.m['164'] = JFX.m['164'] || {
  fly: { f: 'fx/m164_fly.webp', n: 8, d: 1, w: 131, h: 200, ax: 67, ay: 167, ms: 56 },
  hit: { f: 'fx/m164_hit.webp', n: 13, d: 1, w: 54, h: 72, ax: 26, ay: 52, ms: 224 }, spd: 200,
};
if (JFX.f[353]) JFX.f[353] = Object.assign({}, JFX.f[353], { ev2c: '164' });
if (JFX.f[355]) JFX.f[355] = Object.assign({}, JFX.f[355], { ev2c: '204' });
JFX.m['176'] = JFX.m['176'] || {
  fly: { f: 'fx/m176_fly.webp', n: 11, d: 1, w: 130, h: 261, ax: 63, ay: 230, ms: 56 },
  hit: { f: 'fx/m176_hit.webp', n: 8, d: 1, w: 55, h: 50, ax: 26, ay: 47, ms: 56 }, spd: 200,
};
if (JFX.f[368]) JFX.f[368] = Object.assign({}, JFX.f[368], { ev2c: '176' });
// Truy Phong Quyết thiếu ảnh va chạm riêng trong dữ liệu trích xuất; dùng hiệu ứng chùy gần nhất.
if ((!JFX.f[325] || !JFX.f[325].c) && JFX.f[324] && JFX.f[324].c) {
  JFX.f[325] = Object.assign({ form: 12, num: 1 }, JFX.f[325] || {}, { c: JFX.f[324].c });
}
const dir16 = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 8)) % 16) + 16) % 16);
function skillSubFx(a, b, sub) {
  const m = JFX.m[sub.c]; if (!m || R.fx.length > FX_MAX) return;
  const n = clamp(sub.n || 1, 1, 8), x0 = b.x, y0 = b.y - 14, sprite = m.hit || m.fly, delay = 0.18;
  const mis = (x1, y1, x2, y2, wait) => m.fly
    ? R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1, y1, x2, y2, t: -wait,
      life: Math.min(0.55, Math.hypot(x2 - x1, y2 - y1) / (m.spd || 360)), dir: dir16(x2 - x1, y2 - y1) })
    : R.fx.push({ k: 'boom', s: sprite, x: x2, y: y2, t: -wait, life: animDur(sprite), dir: 0 });
  if (sub.form === 3) {
    const start = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) { const angle = start + i / n * Math.PI * 2; mis(x0, y0, x0 + Math.cos(angle) * 110, y0 + Math.sin(angle) * 70, delay); }
    return;
  }
  if (sub.form === 1) {
    for (let i = 0; i < n; i++) mis(a.x, a.y - 20, x0 + rnd(-20, 20), y0 + rnd(-14, 14), delay + i * 0.06);
    return;
  }
  for (let i = 0; i < n; i++) R.fx.push({ k: 'boom', s: sprite, x: x0 + rnd(-40, 40), y: y0 + rnd(-26, 26),
    t: -(delay + i * 0.08), life: animDur(sprite), dir: 0 });
}
/* hieu ung tai cho nguoi ra chieu (PreCastSpr cua skills.txt) */
function castFx(atk) {
  const f = atk && atk.id && JFX.f && JFX.f[atk.id], c = f && f.pre && JFX.c && JFX.c[f.pre];
  if (!c || R.quiet || R.fx.length > FX_MAX) return;
  R.fx.push({ k: 'boom', s: c, x: H.x, y: H.y - 6, t: 0, life: animDur(c), dir: 0 });
}
/* kieu phong dan cua chieu (MisslesForm / ChildSkillNum trong skills.txt, KSkill::CastMissles):
   0 tuong, 1 hang, 2 quat, 3 vong, 4 ngau nhien, 5 vung, 6 tai muc tieu, 7 tai nguoi ra chieu, >= 8 can chien */
function skillFx(a, b, atk) {
  const f = (atk.id && JFX.f && JFX.f[atk.id]) || {}, m = atk.id && JFX.m[f.c || JFX.s[atk.id]];
  if (atk.radial) {
    if (R.quiet || R.fx.length > FX_MAX - atk.radial - 3) return;
    castFx(atk);
    const x1 = a.x, y1 = a.y - 20, x2 = b.x, y2 = b.y - 14;
    const delay = Math.max(.06, Math.min(.6, Math.hypot(x2 - x1, y2 - y1) / 520));
    const scale = atk.missileScale || .45;
    R.fx.push({ k: 'mis', s: m && m.fly, x1, y1, x2, y2, t: 0,
      life: delay, dir: dir16(x2 - x1, y2 - y1), wave: true, scale });
    if (m && m.fly) R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2, t: -delay, life: animDur(m.fly), dir: 0, scale });
    for (const angle of skillRayAngles(a, b, atk.radial)) {
      const tx = x2 + Math.cos(angle) * atk.rad, ty = y2 + Math.sin(angle) * atk.rad;
      R.fx.push({ k: 'mis', s: m && m.fly, x1: x2, y1: y2, x2: tx, y2: ty, t: -delay,
        life: atk.rad / (m ? m.spd : 288), dir: dir16(tx - x2, ty - y2), wave: true, scale, radial: true });
    }
    return;
  }
  castFx(atk);
  // Phật Tâm Từ Hữu chỉ có PreCastSpr riêng; không tạo tia giả tới mục tiêu.
  if ([92, 100, 109].includes(atk.id)) return;
  if (!m || R.quiet) { fxLine(a, b, atk); return; }
  if (R.fx.length > FX_MAX && atk.id !== 302 && atk.id !== 362) return;
  if (f.sub && [58, 303, 343, 345, 347, 349, 351].includes(atk.id)) skillSubFx(a, b, f.sub);
  const x1 = a.x, y1 = a.y - 20, x2 = b.x, y2 = b.y - 14, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
  const form = f.form === undefined ? 1 : f.form, n = clamp(f.num || 1, 1, atk.id === 165 ? 16 : 8), ang = Math.atan2(dy, dx);
  const boom = (s, x, y, delay = 0) => R.fx.push({ k: 'boom', s, x, y, t: -delay, life: animDur(s), dir: dir16(dx, dy), scale: s.scale });
  const mis = (tx, ty, delay = 0) => {
    const mps = [80, 85, 99, 102, 332, 337, 385].includes(atk.id), dx = tx - x1, dy = ty - y1;
    const travel = Math.hypot(dx, dy * (mps ? 2 : 1)) / m.spd;
    const lifeFrames = { 40: 15, 80: 16, 85: 32, 99: 20, 102: 20, 153: 16, 155: 16, 159: 6, 165: 16, 267: 4, 322: 24, 323: 24, 332: 16, 337: 16, 355: 16, 368: 6, 385: 16 }[atk.id] || 0;
    R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1, y1, x2: tx, y2: ty, t: -delay,
      life: lifeFrames ? Math.min(lifeFrames / 18, travel) : Math.min(0.6, travel), dir: dir16(tx - x1, ty - y1) });
  };
  const groundFx = (sprite, frames, next = null, loop = false) => {
    if (!sprite) return;
    const life = frames / 18, full = sprite.n * sprite.ms / 1000;
    R.fx.push({ k: 'boom', s: sprite, next, x: x2, y: y2 - 4, t: 0, life,
      sp: loop ? 1 : full / life, loop, dir: 0 });
  };
  const s1 = m.hit || m.fly;
  // Nhiếp Hồn Nguyệt Ảnh (m149): JX chờ 5 khung rồi giữ phi đao bay đủ 16 khung,
  // kể cả khi lướt qua mục tiêu. Không rút ngắn hành trình theo khoảng cách gần.
  if (atk.id === 339 && m.fly) {
    const angle = Math.atan2(dy * 2, dx), step = (m.spd || 576) / 18;
    R.fx.push({ k: 'mis', s: m.fly, x1, y1,
      x2: x1 + Math.cos(angle) * step * 16, y2: y1 + Math.sin(angle) * step * 8,
      t: -(5 / 18), life: 16 / 18, dir: dir16(Math.cos(angle), Math.sin(angle) / 2) });
    return;
  }
  // Băng Tâm Trái Ảnh giữ m111 ở mục tiêu đủ 16 khung, bắt đầu sau 5 khung.
  if (atk.id === 269 && m.fly) {
    const life = 16 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2 - 4, t: -(5 / 18), life,
      sp: full / life, dir: 0 });
    return;
  }
  // Mộng Điệp và Lưu Thủy chỉ có hit sprite (không có fly); JX phát chúng tại người thi triển.
  if ((atk.id === 86 || atk.id === 89) && m.hit && !m.fly) { boom(m.hit, x1, y1 + 8); return; }
  // Bích Hải Triều Sinh: vòng m10 tại người thi triển, rồi tối đa 8 m11 lặp quanh mục tiêu.
  if (atk.id === 111 && m.fly && f.sub && JFX.m[f.sub.c]?.fly) {
    R.fx.push({ k: 'boom', s: m.fly, x: x1, y: y1 + 8, t: 0, life: 5 / 18, loop: true, dir: 0 });
    const child = JFX.m[f.sub.c], count = Math.min(f.sub.n || 16, 8);
    if (R.fx.length <= FX_MAX - count) for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const sx = x2 + Math.cos(angle) * 20, sy = y2 + Math.sin(angle) * 10;
      R.fx.push({ k: 'boom', s: child.fly, x: sx, y: sy, t: -0.25,
        life: 20 / 18, loop: true, dir: 0 });
    }
    return;
  }
  // Ma Diệm Thất Sát: m82 nổ tại mục tiêu, tám m82 phụ tỏa vòng từ cùng điểm trúng.
  if (atk.id === 148 && m.fly && m.hit && f.sub && JFX.m[f.sub.c]?.fly) {
    boom(m.hit, x2, y2);
    const child = JFX.m[f.sub.c], count = Math.min(f.sub.n || 8, 8), start = Math.random() * Math.PI;
    if (R.fx.length <= FX_MAX - count) for (let i = 0; i < count; i++) {
      const angle = start + i / count * Math.PI * 2, tx = x2 + Math.cos(angle) * 110, ty = y2 + Math.sin(angle) * 70;
      R.fx.push({ k: 'mis', s: child.fly, hit: child.hit, x1: x2, y1: y2, x2: tx, y2: ty,
        t: -0.18, life: Math.min(0.55, Math.hypot(tx - x2, ty - y2) / (child.spd || 360)),
        dir: dir16(tx - x2, ty - y2) });
    }
    return;
  }
  // Phong Quyển Tàn Tuyết khai báo 16 m196 phụ; bộ chạy web giới hạn số sprite phụ ở 8.
  // Đạn phụ lấy hướng bắn chính; tránh hướng 3 giờ do vector từ mục tiêu tới chính nó bằng 0.
  if (atk.id === 102 && m.fly && f.sub && JFX.m[f.sub.c]?.fly) {
    mis(x2, y2, 5 / 18);
    const child = JFX.m[f.sub.c], count = Math.min(f.sub.n || 16, 8), angle = Math.atan2(dy * 2, dx);
    if (R.fx.length <= FX_MAX - count) for (let i = 0; i < count; i++) {
      const sx = x2 + Math.cos(angle) * i * 24, sy = y2 + Math.sin(angle) * i * 12;
      const tx = sx + Math.cos(angle) * 520, ty = sy + Math.sin(angle) * 260;
      R.fx.push({ k: 'mis', s: child.fly, x1: sx, y1: sy, x2: tx, y2: ty, t: -0.25,
        life: 20 / 18, dir: dir16(tx - sx, ty - sy) });
    }
    return;
  }
  // Vũ Đả Lê Hoa: JX rải lưới 4x4 m8 từ trên cao, mỗi giọt rơi đủ 30 khung rồi mới nổ.
  if (atk.id === 105 && m.fly && m.hit) {
    const count = 4, life = 30 / 18;
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      const index = row * count + col;
      const jitter = Math.random() < .5 ? Math.random() * 10 : -Math.random() * 5;
      const delay = 5 + index * 10 + jitter;
      const x = x2 + (col - 1.5) * 32 + rnd(-6, 6), y = y2 + (row - 1.5) * 16 + rnd(-4, 4);
      R.fx.push({ k: 'drop', s: m.fly, hit: m.hit, x, y, t: -delay / 18, life,
        z0: 450, vz0: 0, za: 1, dir: 0 });
    }
    return;
  }
  // Mục Dã Lưu Tinh: m9 rơi từ cao độ 320, chạm đất sớm nhưng giữ đủ 24 khung mới nổ.
  if (atk.id === 108 && m.fly && m.hit) {
    R.fx.push({ k: 'drop', s: m.fly, hit: m.hit, x: x2, y: y2, t: 0, life: 24 / 18,
      z0: 320, vz0: -40, za: 40, dir: 0 });
    return;
  }
  // Thiên Ngoại Lưu Tinh: m171 rơi từ cao độ 320, tồn tại đủ 14 khung rồi phát m171_hit.
  if (atk.id === 362 && m.fly && m.hit) {
    R.fx.push({ k: 'drop', s: m.fly, hit: m.hit, x: x2, y: y2, t: 0, life: 14 / 18,
      z0: 320, vz0: -80, za: 1, dir: 0, scale: FX_SCALE * 1.35 });
    return;
  }
  // Phù Vân Tán Tuyết đứng ở mục tiêu 15 khung sau 5 khung chờ.
  if (atk.id === 113 && m.fly) {
    const life = 15 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2 - 4, t: -(5 / 18), life,
      sp: full / life, dir: 0 });
    return;
  }
  // Băng Tung Vô Ảnh: năm m146 bay hình quạt, xuất phát sau 6 khung.
  if (atk.id === 336 && m.fly) {
    const angle = Math.atan2(dy * 2, dx), startAngle = angle, startX = x1 + Math.cos(angle) * 24;
    const startY = y1 + Math.sin(angle) * 12, count = n, life = 24 / 18, speed = 32 * 24;
    for (let i = 0; i < count; i++) {
      const ray = startAngle + (i - Math.floor(count / 2)) * (2 * Math.PI / 64) * 2;
      const tx = startX + Math.cos(ray) * speed, ty = startY + Math.sin(ray) * speed / 2;
      R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1: startX, y1: startY, x2: tx, y2: ty,
        t: -(6 / 18), life, dir: dir16(Math.cos(ray), Math.sin(ray) / 2) });
    }
    return;
  }
  // Thanh Âm Phạn Xướng duy trì m281 trong suốt thời hạn JX 5400 khung; tránh nhân bản khi làm mới buff.
  if (atk.id === 282 && m.fly) {
    const life = 5400 / 18, active = R.fx.find(q => q.tag === 'emei282');
    if (active) { active.t = 0; active.life = life; active.x = x1; active.y = y1 + 8; }
    else R.fx.push({ k: 'boom', s: m.fly, x: x1, y: y1 + 8, t: 0, life, loop: true, dir: 0, tag: 'emei282' });
    return;
  }
  // Tứ Tượng Đồng Quy có đòn chính và bốn m1 phụ cùng chờ g[5], sau đó tia phụ tỏa từ mục tiêu.
  if (atk.id === 82 && f.sub && JFX.m[f.sub.c]?.fly && !R.quiet && R.fx.length <= FX_MAX - 5) {
    // Đòn m101_hit và bốn đạn phụ cùng bắt đầu sau g[5] = 5 khung.
    boom(m.hit || m.fly, x2, y2, 5 / 18);
    const sub = JFX.m[f.sub.c], count = f.sub.n || 4;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const sx = x2 + Math.cos(angle) * 20, sy = y2 + Math.sin(angle) * 10;
      const tx = sx + Math.cos(angle) * 192, ty = sy + Math.sin(angle) * 96;
      R.fx.push({ k: 'mis', s: sub.fly, x1: sx, y1: sy, x2: tx, y2: ty, t: -0.25,
        life: 16 / 18, dir: dir16(tx - sx, ty - sy) });
    }
    return;
  }
  // Phật Quang Phổ Chiếu: JX bắt đầu m4 tại người thi triển sau năm khung chờ.
  if (atk.id === 91 && m.fly && m.hit) {
    const life = 12 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, next: m.hit, x: x1, y: y1 + 8, t: -(5 / 18),
      life, sp: full / life, dir: 0 });
    return;
  }
  // Từ Hàng Phổ Độ giữ m5 ở mục tiêu 19 khung rồi chuyển sang m5_hit.
  if (atk.id === 93 && m.fly && m.hit) {
    const life = 19 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, next: m.hit, x: x2, y: y2 - 4, t: -(5 / 18),
      life, sp: full / life, dir: 0 });
    return;
  }
  // Bất Diệt Bất Tuyệt phóng ba m3 đồng thời, lệch điểm xuất phát 100px dọc đường bay.
  if (atk.id === 88 && m.fly) {
    const count = 3, angle = Math.atan2(dy * 2, dx), speed = 20 * 18;
    for (let i = 0; i < count; i++) {
      const offset = i * 100, sx = x1 + Math.cos(angle) * offset, sy = y1 + Math.sin(angle) * offset / 2;
      const travel = Math.hypot(x2 - sx, (y2 - sy) * 2) / speed;
      R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1: sx, y1: sy, x2, y2, t: 0,
        life: Math.min(16 / 18, travel), dir: dir16(x2 - sx, y2 - sy) });
    }
    return;
  }
  // Tam Nga Tề Tuyết xếp ba m142 thành hàng trước người thi triển rồi mới bay tới địch.
  if (atk.id === 328 && m.fly && m.hit) {
    const angle = Math.atan2(dy * 2, dx), pa = angle + Math.PI / 2, speed = 32 * 18;
    const life = Math.min(16 / 18, Math.hypot(dx, dy * 2) / speed);
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * 22, sx = x1 + Math.cos(pa) * offset, sy = y1 + Math.sin(pa) * offset / 2;
      R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1: sx, y1: sy, x2, y2,
        t: -(i === 1 ? 0 : 1 / 18), life, dir: dir16(x2 - sx, y2 - sy) });
    }
    return;
  }
  // Kiếm Phi Kinh Thiên (m26): web đợi 5 khung, chạy m26_fly 16 khung rồi mới nổ m26_hit.
  if (atk.id === 158 && m.fly && m.hit) {
    const life = 16 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, next: m.hit, x: x2, y: y2 - 5, t: -(5 / 18),
      life, sp: full / life, dir: 0 });
    return;
  }
  if ((atk.id === 164 || atk.id === 365) && m.fly) {
    const frames = atk.id === 164 ? 12 : 20, wait = 5;
    const life = frames / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2 - 5, t: -wait / 18,
      life, sp: full / life, dir: 0 });
    return;
  }
  // Vô Ngã Vô Kiếm (m29): quạt 16 hướng, khởi phát sau 5 khung theo JX g[165].
  if (atk.id === 165 && m.fly) {
    const step = Math.PI / 32, reach = Math.min(d, m.spd * 16 / 18);
    for (let i = 0; i < n; i++) {
      const angle = ang + (i - Math.floor(n / 2)) * step;
      mis(x1 + Math.cos(angle) * reach, y1 + Math.sin(angle) * reach, 5 / 18);
    }
    return;
  }
  // Thiên Vương cận chiến có nhiều missile đặt tại mục tiêu; đừng rút gọn chúng thành hit sprite tức thì.
  if (atk.id === 29 && m.fly) { groundFx(m.fly, 22, null, true); return; }
  if (atk.id === 30 && m.fly) {
    // m219_fly dùng Z=300, gia tốc rơi 2/frame; va chạm ở khoảng khung 18, missile kết thúc ở khung 30.
    const life = 30 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'drop', s: m.fly, x: x2 + rnd(-14, 14), y: y2 + rnd(-8, 8), t: 0,
      life, sp: full / life, z0: 300, dir: 0 });
    if (m.hit) R.fx.push({ k: 'boom', s: m.hit, x: x2, y: y2, t: -18 / 18,
      life: animDur(m.hit), dir: 0 });
    return;
  }
  if (atk.id === 31 && m.fly) { groundFx(m.fly, 27); return; }
  if (atk.id === 34 && m.fly) { groundFx(m.fly, 24); return; }
  if (atk.id === 35 && m.fly) { groundFx(m.fly, 12, m.hit); return; }
  if (atk.id === 37 && m.fly) { groundFx(m.fly, 14, m.hit); return; }
  if (atk.id === 41 && m.fly) { groundFx(m.fly, 12, null, true); return; }
  if ((atk.id === 324 || atk.id === 325) && m.fly) { groundFx(m.fly, 27); return; }
  if ((atk.id === 40 || atk.id === 322 || atk.id === 323) && m.fly) { mis(x2, y2); return; }
  // Thiên Tế Tấn Lôi bắn sáu m197 phụ sau 0,25 giây, bay theo hướng của đòn chính.
  if (atk.id === 172 && !R.quiet && R.fx.length <= FX_MAX - 6) {
    const angle = Math.atan2(dy * 2, dx), vx = Math.cos(angle) * 480, vy = Math.sin(angle) * 240;
    for (let i = 0; i < 6; i++) {
      const sx = x2 + rnd(-50, 50), sy = y2 + rnd(-26, 26), life = 16 / 18;
      R.fx.push({ k: 'mis', s: JFX.m['197'].fly, x1: sx, y1: sy, x2: sx + vx, y2: sy + vy,
        t: -(0.25 + i * 2 / 18), life, dir: dir16(vx, vy) });
    }
  }
  // Các sét Côn Lôn của JX chạy đủ khung bay rồi mới phát nổ; form 6 với num 4 là lưới 4x4.
  if ((atk.id === 179 || atk.id === 182 || atk.id === 375) && m.fly && m.hit) {
    const grid = atk.id !== 179, count = grid ? 4 : 1, life = (atk.id === 375 ? 12 : 4) / 18;
    const wait = atk.id === 179 ? 5 : atk.id === 375 ? 2 : 0, gap = atk.id === 179 ? 0 : 5;
    const full = m.fly.n * m.fly.ms / 1000;
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      const i = row * count + col;
      const delayFrames = atk.id === 179 ? wait : Math.max(0, wait + i * gap + (Math.random() < .5 ? Math.random() * gap : -Math.random() * gap / 2));
      const x = x2 + (col - (count - 1) / 2) * 32 + (grid ? rnd(-6, 6) : 0);
      const y = y2 - 5 + (row - (count - 1) / 2) * 16 + (grid ? rnd(-4, 4) : 0);
      R.fx.push({ k: 'boom', s: m.fly, next: m.hit, x, y, t: -(delayFrames / 18), life,
        sp: full / life, dir: 0 });
    }
    return;
  }
  // Thiên Cương Địa Sát đứng tại mục tiêu 6 khung rồi mới nổ m33_hit.
  if (atk.id === 71 && m.fly && m.hit) {
    const life = 6 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, next: m.hit, x: x2, y: y2 - 10, t: 0,
      life, sp: full / life, dir: 0 });
    return;
  }
  // Âm Phong Thực Cốt giữ m163 tại điểm trúng đủ 13 khung JX1.
  if (atk.id === 353 && m.fly && !m.hit) {
    const life = 13 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2 - 5, t: 0, life,
      sp: full / life, dir: 0 });
    if (atk.L >= 11 && JFX.m['164']?.hit) {
      const s = JFX.m['164'].hit;
      R.fx.push({ k: 'boom', s, x: x2, y: y2, t: -life, life: s.n * s.ms / 1000, dir: 0 });
    }
    return;
  }
  // Bách Độc Xuyên Tâm dùng m190 bay vòng quanh người thi triển trong 24 khung.
  if (atk.id === 384 && m.fly) {
    R.fx.push({ k: 'orbit', s: m.fly, x: a.x, y: a.y, t: 0, life: 24 / 18,
      ang: Math.atan2(dy * 2, dx), dir: 0 });
    return;
  }
  // Phong Sương Toái Ảnh: Missle 186 đứng tại điểm rơi 12 khung JX1 rồi mới nổ.
  if (atk.id === 380 && m.fly && m.hit && form === 6) {
    const life = 12 / 18, full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2 - 5, t: 0, life, sp: full / life, dir: 0 });
    boom(m.hit, x2, y2, life);
    return;
  }
  // Bạo Vũ Lê Hoa: m96 tồn tại theo missle_lifetime_v; từ 30 khung mới tỏa bốn phi tiêu m126 (FlyEvent của web).
  if (atk.id === 302 && m.fly) {
    const level = Math.max(1, atk.L || 1), skill = SK[302];
    const frames = (skill && skVal(skill, 'missle_lifetime_v', level) || [18])[0];
    const life = Math.max(1, frames) / 18;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2, t: 0, life, loop: true, dir: 0 });
    const dart = JFX.m['126']?.fly;
    if (frames >= 30 && dart) for (let i = 0; i < 4; i++) {
      const angle = ang + i * Math.PI / 2, sx = x2 + Math.cos(angle) * 20, sy = y2 + Math.sin(angle) * 10;
      const tx = sx + Math.cos(angle) * 31 * 16, ty = sy + Math.sin(angle) * 31 * 8;
      R.fx.push({ k: 'mis', s: dart, x1: sx, y1: sy, x2: tx, y2: ty, t: -(30 / 18), life: 16 / 18,
        dir: dir16(tx - sx, ty - sy) });
    }
    return;
  }
  // Mạn Thiên Hoa Vũ (m38) có 7 khung × 833 ms; nén đủ chuỗi vào 1,2 giây để không cắt còn 2 khung.
  if (atk.id === 54 && m.fly) {
    const life = animDur(m.fly), full = m.fly.n * m.fly.ms / 1000;
    R.fx.push({ k: 'boom', s: m.fly, x: x2, y: y2, t: 0, life, sp: full / life, dir: 0 });
    return;
  }
  if (form === 7) { boom(s1, x1, y1 + 8); return; }                                    // tai nguoi ra chieu
  if (atk.melee || form >= 8) { boom(s1, x2, y2); return; }
  if (form === 6) { for (let i = 0; i < n; i++) boom(s1, x2 + (n > 1 ? rnd(-36, 36) : 0), y2 + (n > 1 ? rnd(-24, 24) : 0), i * 0.07); return; }   // tai muc tieu
  if (!m.fly) { boom(s1, x2, y2); return; }
  if (form === 3) { for (let i = 0; i < n; i++) { const g = ang + i / n * Math.PI * 2; mis(x1 + Math.cos(g) * 130, y1 + Math.sin(g) * 130); } return; }   // vong quanh nguoi
  if (form === 2) { for (let i = 0; i < n; i++) { const g = ang + (i - (n - 1) / 2) * 0.26; mis(x1 + Math.cos(g) * d, y1 + Math.sin(g) * d); } return; }   // quat
  if (form === 1) {
    const schedule = { 63: [5, 0], 65: [5, 0], 68: [5, 0], 74: [5, 9], 80: [5, 0], 85: [5, 0], 99: [5, 0], 102: [5, 0], 153: [5, 0], 155: [5, 0], 267: [0, 6], 337: [2, 0], 355: [0, 6], 368: [0, 6] }[atk.id] || [0, 2];
    for (let i = 0; i < n; i++) {
      const delay = (schedule[0] + i * schedule[1]) / 18;
      mis(x2, y2, delay);
      // Huyền Âm Trảm có m204 riêng khi từng m165 chạm mục tiêu từ cấp 11.
      if (atk.id === 355 && atk.L >= 11 && JFX.m['204']?.hit) {
        const s = JFX.m['204'].hit, arrival = delay + Math.min(16 / 18, Math.hypot(x2 - x1, y2 - y1) / m.spd);
        R.fx.push({ k: 'boom', s, x: x2, y: y2, t: -arrival,
          life: s.n * s.ms / 1000, dir: 0 });
      }
    }
    return;
  }          // hang (lien tiep theo huong)
  if (form === 0) { const px = -dy / d, py = dx / d; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 34; mis(x2 + px * o, y2 + py * o); } return; }   // tuong
  for (let i = 0; i < n; i++) mis(x2 + rnd(-60, 60), y2 + rnd(-40, 40), i * 0.05);         // ngau nhien / vung
}
/* Hình nổ trễ của kỹ năng phụ kích hoạt ở cấp 11. */
function skillEventFx(e, atk, name, from = null, impactTarget = e) {
  if (R.quiet) return;
  const f = JFX.f[atk.id] || {}, m = JFX.m[f.ev2c || f.c || JFX.s[atk.id]], sprite = m && (m.hit || m.fly);
  // Nhiếp Hồn Nguyệt Ảnh phát m150 sau khi m149 bay tới quái như skill_collideevent
  // trên web; trước đây hai hiệu ứng bắt đầu gần như cùng lúc nên m150 bị m149 che mất.
  const impactDelay = atk.id === 339
    ? 5 / 18 + Math.min(16 / 18, Math.hypot(impactTarget.x - H.x, (impactTarget.y - H.y) * 2) / (JFX.m['149']?.spd || 576))
    : 0;
  if (name) addText(e.x, e.y - e.r - 26, name, '#ffd76a', 11);
  if (!sprite || (R.fx.length > FX_MAX && atk.id !== 302 && atk.id !== 339 && atk.id !== 362)) return;
  if (from && m.fly) {
    R.fx.push({ k: 'mis', s: m.fly, hit: m.hit, x1: from.x, y1: from.y - 20, x2: e.x, y2: e.y - 14, t: -0.15, life: 0.35, dir: dir16(e.x - from.x, e.y - from.y) });
    return;
  }
  for (let i = 0; i < 2; i++) R.fx.push({ k: 'boom', s: sprite, x: e.x + rnd(-18, 18), y: e.y - 14 + rnd(-12, 12), t: -(impactDelay + 0.18 + i * 0.12), life: animDur(sprite), dir: 0 });
}
const animDur = s => Math.min(1.2, s.n * s.ms / 1000);
function drawFxSprite(s, dir, t, x, y, loop, scale = FX_SCALE) {
  const im = img(s.f); if (!im || !im.complete || !im.naturalWidth) return false;
  const fr = loop ? Math.floor(t * 1000 / s.ms) % s.n : Math.min(s.n - 1, Math.floor(t * 1000 / s.ms));
  const row = s.d > 1 ? Math.round(dir * s.d / 16) % s.d : 0;
  const cols = s.cols || s.n, sx = (fr % cols) * s.w, sy = (Math.floor(fr / cols) + row) * s.h;
  CX.drawImage(im, sx, sy, s.w, s.h, x - s.ax * scale, y - s.ay * scale, s.w * scale, s.h * scale);
  return true;
}
function stepFx(f, dt) { // tra ve false khi het; dan toi dich thi doi sang no
  f.t += dt; if (f.t < 0) return true;     // dang cho (phat dan lien tiep)
  if (f.k === 'drop' && f.hit && f.t >= f.life) {
    Object.assign(f, { k: 'boom', s: f.hit, hit: null, t: 0, life: animDur(f.hit), dir: 0 }); return true;
  }
  if (f.k === 'boom' && f.next && f.t >= f.life) {
    f.s = f.next; f.next = null; f.t = 0; f.life = animDur(f.s); f.sp = 1;
    return true;
  }
  if (f.k === 'mis' && f.t >= f.life) {
    if (f.hit) { Object.assign(f, { k: 'boom', s: f.hit, x: f.x2, y: f.y2, t: 0, life: animDur(f.hit) }); return true; }
    return false;
  }
  return f.t < f.life;
}
function drawFx(f) {
  if (f.t < 0) return false;
  if (f.k === 'drop') {
    const frame = Math.floor(f.t * 18), za = f.za === undefined ? 2 : f.za;
    const z = Math.max(0, f.z0 + (f.vz0 || 0) * frame - za * frame * (frame - 1) / 2);
    return drawFxSprite(f.s, f.dir, f.t * (f.sp || 1), f.x, f.y - z * 0.5, false, f.scale);
  }
  if (f.k === 'orbit') {
    const angle = f.ang + f.t * 18 * Math.PI * 2 / 64;
    return drawFxSprite(f.s, f.dir, f.t, f.x + Math.cos(angle) * 30,
      f.y - 14 + Math.sin(angle) * 15, true);
  }
  if (f.k === 'mis') {
    const k = clamp(f.t / f.life, 0, 1), x = f.x1 + (f.x2 - f.x1) * k, y = f.y1 + (f.y2 - f.y1) * k;
    if (f.wave) {
      const d = Math.hypot(f.x2 - f.x1, f.y2 - f.y1) || 1, tail = Math.min(k, 36 / d);
      CX.save();
      CX.strokeStyle = '#a9edff'; CX.lineWidth = giamHieuUng() ? 1 : 2; CX.globalAlpha = .65;
      CX.beginPath(); CX.moveTo(x - (f.x2 - f.x1) * tail, y - (f.y2 - f.y1) * tail); CX.lineTo(x, y); CX.stroke();
      if (!giamHieuUng() && f.s) for (let i = 2; i >= 1; i--) {
        const back = Math.max(0, k - i * 12 / d); CX.globalAlpha = i === 2 ? .18 : .35;
        drawFxSprite(f.s, f.dir, f.t, f.x1 + (f.x2 - f.x1) * back, f.y1 + (f.y2 - f.y1) * back, true, f.scale);
      }
      CX.restore();
      if (!f.s) return true;
    }
    return drawFxSprite(f.s, f.dir, f.t, x, y, true, f.scale);
  }
  return drawFxSprite(f.s, f.dir, f.t * (f.sp || 1), f.x, f.y, !!f.loop, f.scale);
}
/* Giao dien di dong thu nho 20% (UI_SCALE_MOBILE): #app co width / height lon 1/0.8 lan roi transform: scale(0.8) (style.css, body.mob).
   Toa do trong game theo px bo cuc (offsetWidth / Height, khong bi transform); DPR hieu dung nhan them he so thu nho de net. */
const UI_SCALE_MOBILE = 0.8;
const isMobileUI = () => !(typeof isDesktopLandscape === 'function' && isDesktopLandscape()) && !!(window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700));
const uiScale = () => document.body.classList.contains('mob') ? UI_SCALE_MOBILE : 1;
function resizeArena() {
  const b = $('#battle'), box = { width: b.offsetWidth, height: b.offsetHeight };
  DPR = Math.min(2, window.devicePixelRatio || 1) * uiScale();
  CV.width = Math.round(box.width * DPR); CV.height = Math.round(box.height * DPR);
  AR.w = box.width; AR.h = box.height; AR.top = 58; AR.bot = box.height - 12;   // khung nhin (man hinh)
  snapCamera();
}
/* ---------- camera chay theo nhan vat, khong ra ngoai mep ban do ---------- */
const CAM = { x: 0, y: 0 };
const camTarget = () => [clamp(H.x - AR.w / 2, 0, Math.max(0, WORLD.w - AR.w)), clamp(H.y - AR.h * 0.55, 0, Math.max(0, WORLD.h - AR.h))];
function snapCamera() { [CAM.x, CAM.y] = camTarget(); }
function updateCamera(dt) { const [tx, ty] = camTarget(), k = Math.min(1, dt * 6); CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k; }
/* ---------- nen ban do: anh 3x3 vung that (BG_TILE diem) lat guong xen ke -> ghep lien, khong thay mep, the gioi rong tuy y ---------- */
const BG_TILE = 1536;
function drawTiledBg(c, bg) {
  if (!(bg && bg.complete && bg.naturalWidth)) { c.fillStyle = '#26301f'; c.fillRect(CAM.x - 2, CAM.y - 2, AR.w + 4, AR.h + 4); return; }
  if (OBS.g) { c.drawImage(bg, 0, 0, WORLD.w, WORLD.h); return; }          // ban do that rong, khong lat guong
  const T = BG_TILE, i0 = Math.floor(CAM.x / T), i1 = Math.floor((CAM.x + AR.w) / T), j0 = Math.floor(CAM.y / T), j1 = Math.floor((CAM.y + AR.h) / T);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const fx = i & 1, fy = j & 1;
    if (!fx && !fy) { c.drawImage(bg, i * T, j * T, T, T); continue; }
    c.save(); c.translate(i * T + (fx ? T : 0), j * T + (fy ? T : 0)); c.scale(fx ? -1 : 1, fy ? -1 : 1); c.drawImage(bg, 0, 0, T, T); c.restore();
  }
}
/* ---------- ban do nho: anh ban do that thu nho, quai = cham theo ngu hanh / trum, nhan vat = mui ten, khung = tam nhin ---------- */
const MINI = { s: 92, m: 8, top: 50, open: false, x: 0, y: 0, pointer: null, dragging: false, dx: 0, dy: 0 };
const miniOpenSize = () => Math.max(120, Math.min(240, AR.w - 24, AR.h - 76));
function miniRect() {
  if (!MINI.open) return { x: AR.w - MINI.s - MINI.m, y: MINI.top, s: MINI.s };
  const s = miniOpenSize(); return { x: MINI.x, y: MINI.y, s };
}
function miniClamp() {
  const s = miniOpenSize(); MINI.x = clamp(MINI.x, 6, Math.max(6, AR.w - s - 6)); MINI.y = clamp(MINI.y, 34, Math.max(34, AR.h - s - 8));
}
function minimapPointerDown(x, y, id) {
  if (R.town || S.miniMap === false) return false;
  if (!MINI.open) {
    const r = miniRect();
    if (x < r.x - 2 || x > r.x + r.s + 2 || y < r.y - 2 || y > r.y + r.s + 14) return false;
    const s = miniOpenSize(); MINI.open = true; MINI.x = (AR.w - s) / 2; MINI.y = Math.max(42, (AR.h - s) / 2); miniClamp();
    MINI.pointer = id; MINI.dragging = false; return true;
  }
  const r = miniRect(), inPanel = x >= r.x - 4 && x <= r.x + r.s + 4 && y >= r.y - 28 && y <= r.y + r.s + 4;
  if (!inPanel) return false;
  if (y < r.y && x >= r.x + r.s - 30) { MINI.open = false; MINI.pointer = null; MINI.dragging = false; return true; }
  MINI.pointer = id; MINI.dragging = y < r.y; MINI.dx = x - r.x; MINI.dy = y - (r.y - 28); return true;
}
function minimapPointerMove(x, y, id) {
  if (MINI.pointer !== id) return false;
  if (MINI.dragging) { MINI.x = x - MINI.dx; MINI.y = y - MINI.dy + 28; miniClamp(); }
  return true;
}
function minimapPointerUp(id) {
  if (MINI.pointer !== id) return false;
  MINI.pointer = null; MINI.dragging = false; return true;
}
function drawMinimapLayer(c, x0, y0, s, expanded) {
  const k = s / WORLD.w;
  c.save();
  if (expanded) {
    c.fillStyle = '#07100ff2'; c.strokeStyle = '#c8a45a'; c.lineWidth = 1;
    c.fillRect(x0 - 4, y0 - 28, s + 8, s + 34); c.strokeRect(x0 - 4, y0 - 28, s + 8, s + 34);
    c.font = '12px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.fillStyle = '#f3d88a'; c.fillText('Bản đồ · kéo để di chuyển', x0 + 4, y0 - 11);
    c.font = '18px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#e9e2d0'; c.fillText('×', x0 + s - 12, y0 - 10);
  } else { c.globalAlpha = 0.9; c.fillStyle = '#000c'; c.fillRect(x0 - 2, y0 - 2, s + 4, s + 4); }
  const bg = R.bgImg;
  if (bg && bg.complete && bg.naturalWidth) {
    if (OBS.g) c.drawImage(bg, x0, y0, s, s);
    else { const n = Math.round(WORLD.w / BG_TILE), h = s / n;                   // cung cach ghep lat guong nhu nen tran dau
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.save(); c.translate(x0 + i * h + (i & 1 ? h : 0), y0 + j * h + (j & 1 ? h : 0)); c.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1); c.drawImage(bg, 0, 0, h, h); c.restore(); } }
  } else { c.fillStyle = '#26301f'; c.fillRect(x0, y0, s, s); }
  c.globalAlpha = 1;
  c.strokeStyle = '#fff6'; c.lineWidth = 1; c.strokeRect(x0 + CAM.x * k, y0 + CAM.y * k, Math.min(s, AR.w * k), Math.min(s, AR.h * k));
  for (const d of R.ground) if (lootMatch(d.it)) { c.fillStyle = RAR_COL[d.it.r]; c.fillRect(x0 + d.x * k - 1, y0 + d.y * k - 1, 2, 2); }
  for (const e of R.enemies) {
    if (e.dead) continue;
    const r = (e.cls === 'boss' ? 3.2 : e.cls === 'elite' ? 1.155 : 1.1) * (expanded ? Math.max(1.4, s / MINI.s) : 1);
    c.fillStyle = e.goldBoss || e.cls === 'boss' ? '#ffd24a' : '#ff3b30';
    c.beginPath(); c.arc(x0 + e.x * k, y0 + e.y * k, r, 0, 7); c.fill();
  }
  if (R.petPos) { c.fillStyle = '#9fe36a'; c.fillRect(x0 + R.petPos.x * k - 1.5, y0 + R.petPos.y * k - 1.5, 3, 3); }
  const hx = x0 + H.x * k, hy = y0 + H.y * k, a = Math.PI / 2 + (H.dir || 0) * Math.PI / 4;   // huong 0 = nam (xuong duoi)
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.beginPath();
  c.moveTo(hx + Math.cos(a) * 5, hy + Math.sin(a) * 5); c.lineTo(hx + Math.cos(a + 2.5) * 4, hy + Math.sin(a + 2.5) * 4); c.lineTo(hx + Math.cos(a - 2.5) * 4, hy + Math.sin(a - 2.5) * 4);
  c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#c8a45a'; c.strokeRect(x0 - 2, y0 - 2, s + 4, s + 4);
  if (!expanded) {
    c.font = '9px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#f3d88a';
    c.fillText(R.tk ? `Tống Kim · ${R.tk.wave}/${TK_WAVES}` : R.tower ? `Tháp · tầng ${R.tower.floor}` : zoneOf(Math.min(S.stage, STAGES)).n, x0 + s / 2, y0 + s + 11);
  }
  c.restore();
}
function drawMinimap(c) {
  const el = $('#miniFloat'), cv = $('#miniCanvas');
  if (R.town || S.miniMap === false) { MINI.open = false; MINI.pointer = null; if (el) el.classList.remove('open'); return; }
  if (!MINI.open) {
    if (el) el.classList.remove('open');
    const r = miniRect(); drawMinimapLayer(c, r.x, r.y, r.s, false); return;
  }
  const r = miniRect(), left = r.x - 4, top = r.y - 28, w = r.s + 8, h = r.s + 34;
  if (!el || !cv) return;
  el.style.left = `${left}px`; el.style.top = `${top}px`; el.classList.add('open');
  cv.style.width = `${w}px`; cv.style.height = `${h}px`;
  const scale = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(w * scale), ph = Math.round(h * scale);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  const c2 = cv.getContext('2d'); c2.setTransform(scale, 0, 0, scale, 0, 0); c2.clearRect(0, 0, w, h);
  c2.save(); c2.translate(4 - r.x, 28 - r.y); drawMinimapLayer(c2, r.x, r.y, r.s, true); c2.restore();
}
const onScreen = (x, y, m = 120) => x > CAM.x - m && x < CAM.x + AR.w + m && y > CAM.y - m && y < CAM.y + AR.h + m;
function drawSprite(im, sz, x, y, scale, flip, alpha = 1) {
  if (!im || !im.complete || !im.naturalWidth) return false;
  const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
  // diem chan lay tu tam spr; mot so spr co tam nam ngoai khung da cat -> dung giua-duoi anh
  const okFoot = sz && sz[2] >= 0 && sz[2] <= im.naturalWidth && sz[3] >= im.naturalHeight * 0.5 && sz[3] <= im.naturalHeight * 1.2;
  const fx = okFoot ? sz[2] * scale : w / 2, fy = okFoot ? sz[3] * scale : h * 0.95;
  CX.save(); CX.globalAlpha = alpha; CX.translate(x, y); if (flip) CX.scale(-1, 1);
  CX.drawImage(im, -fx, -fy, w, h); CX.restore();
  return true;
}
/* ---------- hoat anh 8 huong (img/a/<npcres>_<hanh dong>.webp) ----------
   huong 0 = quay mat ve nguoi xem, tang theo chieu kim dong ho: N(am), TN, T, TB, B, DB, D, DN */
const dirOf = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 4)) % 8) + 8) % 8);
const ONCE = { at: 1, hurt: 1, die: 1 };
function animLen(key, act) { const m = W.anim && W.anim[key] && W.anim[key][act]; return m ? m.n * m.ms / 1000 : 0; }
function drawAnim(key, act, dir, t, x, y, sc, alpha = 1) {
  const set = W.anim && W.anim[key]; if (!set) return false;
  const m = set[act] || set.st; if (!m) return false;
  const im = img('img/a/' + m.f); if (!im.complete || !im.naturalWidth) return false;
  let fr = Math.floor(t * 1000 / m.ms); fr = ONCE[act] ? Math.min(fr, m.n - 1) : fr % m.n;
  const d = m.d >= 8 ? dir : Math.floor(dir * m.d / 8);
  CX.globalAlpha = alpha;
  CX.drawImage(im, fr * m.w, d * m.h, m.w, m.h, x - m.ax * sc, y - m.ay * sc, m.w * sc, m.h * sc);
  CX.globalAlpha = 1;
  return m.h * sc;
}
/* Overhead labels use the standing frame so attack/cast strips cannot move HP/name tags. */
function standAnimHeight(key, sc, fallback) {
  const m = W.anim && W.anim[key] && W.anim[key].st;
  return m ? m.h * sc : fallback;
}
// Cac loai bay co chieu cao rieng: bong van nam tren mat dat, than va ten duoc nang len.
const enemyVisualY = e => e.y - (MON[e.tid]?.height || 0);
function setAct(o, act) { if (o.act !== act) { o.act = act; o.actT = 0; } }
function stepAct(o, dt, idle) { // het hoat anh mot lan (danh / trung don) -> ve trang thai nen
  o.actT = (o.actT || 0) + dt;
  if ((o.act === 'at' || o.act === 'hurt') && o.actT >= Math.max(0.25, animLen(o.animKey, o.act))) setAct(o, idle);
}
/* ten tren dau (nhan vat, quai, dong hanh): chu mot nen, vien den cho de doc tren moi nen ban do */
const NAME_COL = { boss: '#ffb070', elite: '#8fc6ff', normal: '#e8dcc8', hero: '#fff3c0', pet: '#9fe36a', gold: '#ffd24a' };
/* Nhan (ten + thanh mau) tren dau. Vi tri y co dinh theo diem sat dau; thanh mau nam duoi cung, ten ngay tren thanh. hp < 0: khong ve thanh. */
const LABELS = [];
function label(x, y, text, col, size, hp, barCol) { LABELS.push({ x, y, text, col, size, hp, barCol }); }
function flushLabels() {
  if (!LABELS.length) return;
  CX.textAlign = 'center'; CX.lineJoin = 'round';
  for (const L of LABELS) {
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; L.w = Math.max(CX.measureText(L.text).width, 44); L.h = L.size + 4 + (L.hp >= 0 ? 7 : 0);
    // Keep name and HP positions tied to the actor's standing sprite. Nearby
    // labels must not push the HP bar higher when enemies approach.
    L.py = L.y;
  }
  for (const L of LABELS) {
    const y = L.py, bw = Math.min(L.w, 56);
    if (L.hp >= 0) { CX.fillStyle = '#000c'; CX.fillRect(L.x - bw / 2 - 1, y - 6, bw + 2, 6); CX.fillStyle = L.barCol; CX.fillRect(L.x - bw / 2, y - 5, bw * clamp(L.hp, 0, 1), 4); }
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; CX.lineWidth = 3; CX.strokeStyle = '#000c';
    const ty = y - (L.hp >= 0 ? 8 : 1); CX.strokeText(L.text, L.x, ty); CX.fillStyle = L.col; CX.fillText(L.text, L.x, ty);
  }
  LABELS.length = 0;
}
function nameTag(x, y, text, col, size = 11) {
  CX.font = `${size}px "IBM Plex Mono", monospace`; CX.textAlign = 'center'; CX.lineJoin = 'round'; CX.lineWidth = 3; CX.strokeStyle = '#000c';
  CX.strokeText(text, x, y); CX.fillStyle = col; CX.fillText(text, x, y);
}
const enemyName = e => `${viName(e.n)} · Lv${e.L}`;
function bar(x, y, w, h, f, col) { CX.fillStyle = '#000a'; CX.fillRect(x, y, w, h); CX.fillStyle = col; CX.fillRect(x, y, w * clamp(f, 0, 1), h); }
function draw(dt) {
  const c = CX; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, AR.w, AR.h);
  R.clock = (R.clock || 0) + dt;
  updateCamera(dt);
  c.setTransform(DPR, 0, 0, DPR, -Math.round(CAM.x) * DPR, -Math.round(CAM.y) * DPR);  // toa do the gioi
  const bg = R.bgImg;
  drawTiledBg(c, bg);
  // do roi tren dat: vien theo do hiem, ten cho do khop bo loc / mon dang chon
  c.textAlign = 'center';
  for (const d of R.town ? [] : R.ground) {
    const im = d.it.ic ? img(d.it.ic) : null, match = lootMatch(d.it), sel = R.pickTarget === d;
    const bob = Math.sin((d.age + d.x) * 3) * 1.5;
    c.fillStyle = '#0008'; c.beginPath(); c.ellipse(d.x, d.y + 2, 11, 4, 0, 0, 7); c.fill();
    c.strokeStyle = RAR_COL[d.it.r]; c.lineWidth = sel ? 2.5 : match ? 1.6 : 0.8; c.globalAlpha = match || sel ? 1 : 0.55;
    c.beginPath(); c.ellipse(d.x, d.y + 2, 12, 5, 0, 0, 7); c.stroke();
    if (im && im.complete && im.naturalWidth) { const k = Math.min(26 / im.naturalWidth, 26 / im.naturalHeight); c.drawImage(im, d.x - im.naturalWidth * k / 2, d.y - im.naturalHeight * k + bob, im.naturalWidth * k, im.naturalHeight * k); }
    if (match || sel || d.it.r >= 2) { c.font = '9px "IBM Plex Mono", monospace'; c.fillStyle = '#000'; c.fillText(viName(d.it.n), d.x + 1, d.y - 27); c.fillStyle = RAR_COL[d.it.r]; c.fillText(viName(d.it.n), d.x, d.y - 28); }
    c.globalAlpha = 1;
  }
  // xac quai: phat hoat anh chet roi mo dan
  for (const e of R.corpses) {
    e.actT += dt; const a = clamp(1.6 - e.actT, 0, 1);
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    if (!(e.animKey && drawAnim(e.animKey, 'die', e.dir || 0, e.actT, e.x, e.y, sc * MON_SCALE, a))) { c.globalAlpha = a * 0.5; drawSprite(e.img, e.sz, e.x, e.y, sc, e.face < 0); c.globalAlpha = 1; }
  }
  R.corpses = R.corpses.filter(e => e.actT < 1.6);
  drawPet(c, dt);                                                           // dong hanh (rewards.js)
  // ke dich (sap theo y de nguoi o duoi ve sau)
  const ents = R.enemies.filter(e => !e.dead).concat([{ hero: true, y: H.y }]).sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.hero) {
      c.fillStyle = '#0007'; c.beginPath(); c.ellipse(H.x, H.y, 16, 6, 0, 0, 7); c.fill();
      const hw = W.hero[S.fac];
      H.animKey = hw && hw.anim;
      const mvx = H.x - (H.px ?? H.x), mvy = H.y - (H.py ?? H.y); H.px = H.x; H.py = H.y;
      H.moving = Math.hypot(mvx, mvy) > 0.4; if (H.moving && H.act !== 'at') H.dir = dirOf(mvx, mvy);
      stepAct(H, dt, H.moving ? 'run' : 'st');
      if (R.deadT > 0) setAct(H, 'die'); else if (H.act !== 'at' && H.act !== 'hurt') setAct(H, H.moving ? 'run' : 'st');
      if (typeof drawAura === 'function') drawAura(c);
      if (typeof drawShaolinSkillEffects === 'function') drawShaolinSkillEffects(c, 'under');
      if (typeof drawGaibangSkillEffects === 'function') drawGaibangSkillEffects(c, 'under');
      if (typeof drawWuduSkillEffects === 'function') drawWuduSkillEffects(c, 'under');
      if (typeof drawTianrenSkillEffects === 'function') drawTianrenSkillEffects(c, 'under');
      if (typeof drawKunlunSkillEffects === 'function') drawKunlunSkillEffects(c, 'under');
      if (typeof drawWudangSkillEffects === 'function') drawWudangSkillEffects(c, 'under');
      if (typeof drawEmeiSkillEffects === 'function') drawEmeiSkillEffects(c, 'under');
      const alpha = R.deadT > 0 ? 0.35 : 1;
      const drawn = hw && hw.anim && (typeof drawHeroAnim === 'function'
        ? drawHeroAnim(hw.anim, H.act || 'st', H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE, alpha)
        : drawAnim(hw.anim, H.act || 'st', H.dir || 0, H.actT || 0, H.x, H.y, HERO_SCALE, alpha));
      if (typeof drawShaolinSkillEffects === 'function') drawShaolinSkillEffects(c, 'over');
      if (typeof drawGaibangSkillEffects === 'function') drawGaibangSkillEffects(c, 'over');
      if (typeof drawTianwangSkillEffects === 'function') drawTianwangSkillEffects(c, 'over');
      if (typeof drawTianrenSkillEffects === 'function') drawTianrenSkillEffects(c, 'over');
      if (typeof drawThuyYenSkillEffects === 'function') drawThuyYenSkillEffects(c, 'over');
      if (typeof drawKunlunSkillEffects === 'function') drawKunlunSkillEffects(c, 'over');
      if (typeof drawWudangSkillEffects === 'function') drawWudangSkillEffects(c, 'over');
      if (typeof drawEmeiSkillEffects === 'function') drawEmeiSkillEffects(c, 'over');
      const tagH = drawn ? standAnimHeight(hw.anim, HERO_SCALE, drawn) : 52;
      label(H.x, H.y - Math.min(tagH, 90) * 0.9 - 6, `${S.name || (FAC[S.fac] && FAC[S.fac].n) || ''} · Lv${S.lvl}`, NAME_COL.hero, 12, R.life / Math.max(1, R.P.life), '#4fd04f');
      if (!drawn && !(hw && drawSprite(img(hw.img), hw.sz, H.x, H.y, 0.9, H.face < 0, R.deadT > 0 ? 0.35 : 1))) { c.fillStyle = SERIES_COL[heroSeries()]; c.beginPath(); c.arc(H.x, H.y - 20, 14, 0, 7); c.fill(); }
      if (R.hurtT > 0) { c.fillStyle = '#f004'; c.beginPath(); c.arc(H.x, H.y - 24, 20, 0, 7); c.fill(); }
      if (typeof drawLookFx === 'function') drawLookFx(c, dt);
      continue;
    }
    if (!onScreen(e.x, e.y)) { e.hitT = Math.max(0, (e.hitT || 0) - dt); continue; }
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    c.fillStyle = '#0007'; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.fill();
    c.strokeStyle = SERIES_COL[e.series]; c.lineWidth = e.cls === 'normal' ? 1.2 : 2.4; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.stroke();
    e.animKey = MON[e.tid].anim; stepAct(e, dt, e.moving ? 'run' : 'st');
    if (e.act !== 'at' && e.act !== 'hurt') setAct(e, e.moving ? 'run' : 'st');
    const drawY = enemyVisualY(e);
    const ah = e.animKey && drawAnim(e.animKey, e.act || 'st', e.dir || 0, e.actT || 0, e.x, drawY, sc * MON_SCALE, e.hitT > 0 ? 0.75 : 1);
    if (!ah && !drawSprite(e.img, e.sz, e.x, drawY, sc, e.face < 0, e.hitT > 0 ? 0.6 : 1)) { c.fillStyle = SERIES_COL[e.series]; c.beginPath(); c.arc(e.x, drawY - e.r, e.r, 0, 7); c.fill(); }
    if (typeof drawWuduEnemyCurses === 'function') drawWuduEnemyCurses(c, e, sc * MON_SCALE);
    if (typeof drawTianrenEnemyState === 'function') drawTianrenEnemyState(c, e, sc * MON_SCALE);
    if (typeof drawKunlunEnemyCurses === 'function') drawKunlunEnemyCurses(c, e, sc * MON_SCALE);
    if (e.hitT > 0) e.hitT -= dt;
    const tagOffset = ah ? Math.min(standAnimHeight(e.animKey, sc * MON_SCALE, ah), 90) * 0.85 : e.img && e.img.naturalHeight ? e.img.naturalHeight * sc : e.r * 2;
    const top = drawY - tagOffset - 8;
    label(e.x, top, enemyName(e), e.goldBoss ? NAME_COL.gold : NAME_COL[e.cls] || NAME_COL.normal, e.cls === 'boss' ? 12 : 11, e.hp / e.max, e.cls === 'boss' ? '#ff5030' : '#e03a2a');
    if (e.poison > 0) { c.fillStyle = '#8fe34a'; c.fillRect(e.x - 22, top + 5, 44 * e.poison / 3, 2); }
  }
  // hieu ung
  R.fx = R.fx.filter(f => { if (f.k !== 'mis' && f.k !== 'boom' && f.k !== 'orbit' && f.k !== 'drop') return true; const ok = stepFx(f, dt); if (ok) drawFx(f); return ok; });
  for (const f of R.fx) {
    if (f.k === 'mis' || f.k === 'boom' || f.k === 'orbit' || f.k === 'drop') continue;
    f.life -= dt; const a = clamp(f.life / f.max, 0, 1);
    c.globalAlpha = a; c.strokeStyle = f.color;
    if (f.k === 'line') { c.lineWidth = 3; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); }
    else { c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y - 10, 8 + (1 - a) * 30, 0, 7); c.stroke(); }
  }
  c.globalAlpha = 1; R.fx = R.fx.filter(f => f.life > 0);
  c.textAlign = 'center';
  flushLabels();                                                            // ten + thanh mau tren dau (vi tri co dinh theo nhan vat)
  for (const t of R.txt) { t.life -= dt; t.y -= 32 * dt; c.globalAlpha = clamp(t.life / 0.5, 0, 1); c.font = `${t.size}px "IBM Plex Mono", monospace`; c.fillStyle = '#000'; c.fillText(t.t, t.x + 1, t.y + 1); c.fillStyle = t.color; c.fillText(t.t, t.x, t.y); }
  c.globalAlpha = 1; R.txt = R.txt.filter(t => t.life > 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);                                     // lop giao dien: toa do man hinh
  if (typeof drawJoystick === 'function') drawJoystick(c);
  drawMinimap(c);
  if (R.banner && R.banner.t > 0) {
    R.banner.t -= dt; c.globalAlpha = clamp(R.banner.t, 0, 1);
    c.fillStyle = '#000a'; c.fillRect(0, AR.h * 0.36, AR.w, 54);
    c.font = '20px \"IBM Plex Mono\", monospace'; c.fillStyle = '#f3d88a'; c.fillText(R.banner.text, AR.w / 2, AR.h * 0.36 + 26);
    c.font = '12px "IBM Plex Mono", monospace'; c.fillStyle = '#d8ccb4'; c.fillText(R.banner.sub, AR.w / 2, AR.h * 0.36 + 44);
    c.globalAlpha = 1;
  }
}
