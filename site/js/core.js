/* ======================= LOI: tien ich, hang so, chi muc du lieu ======================= */
'use strict';
const J = window.JX, W = window.JW;
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => { n = Math.round(n); const a = Math.abs(n); return a < 1e4 ? '' + n : a < 1e6 ? (n / 1e3).toFixed(a < 1e5 ? 1 : 0) + 'k' : a < 1e9 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e9).toFixed(2) + 'B'; };
/* Chi dich hien thi; ten goc van dung lam khoa ghep do / manh / file luu. */
const viName = s => { const text = String(s); return (window.JX_VI && window.JX_VI.names[text]) || text; };
const viAttrLabel = name => (window.JX_VI && window.JX_VI.attributeLabels[name]) || name;
const VI_NAME_RE = (() => {
  const names = Object.keys((window.JX_VI && window.JX_VI.names) || {}).sort((a, b) => b.length - a.length);
  return names.length ? new RegExp(names.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu') : null;
})();
const viMessage = s => {
  const text = String(s);
  return VI_NAME_RE && /\p{Script=Han}/u.test(text) ? text.replace(VI_NAME_RE, match => viName(match)) : text;
};
const escRaw = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const esc = s => escRaw(viMessage(s));
const localISODay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const expNeed = L => J.exp[clamp(Math.floor(L) || 1, 1, MAX_LEVEL) - 1];
function wpick(list, w) { let t = 0; for (const x of list) t += w(x); let r = Math.random() * t; for (const x of list) { r -= w(x); if (r <= 0) return x; } return list[list.length - 1]; }

/* ---------- ngu hanh: 0 Kim, 1 Moc, 2 Thuy, 3 Hoa, 4 Tho ---------- */
const SERIES = J.series;
const SERIES_COL = ['#f3d35b', '#6fd46a', '#5fb8ff', '#ff6a3a', '#c8965a'];
const KHAC = { 0: 1, 1: 4, 4: 2, 2: 3, 3: 0 }; // Kim khac Moc, Moc khac Tho, Tho khac Thuy, Thuy khac Hoa, Hoa khac Kim
const counters = (a, t) => a >= 0 && t >= 0 && KHAC[a] === t;
/* nguyen to sat thuong: vat ly, doc, bang, hoa, loi (thu tu rmax trong world.js) */
const ELEM = ['phys', 'poison', 'cold', 'fire', 'light'];
const ELEM_VI = { phys: 'Vật lý', poison: 'Độc', cold: 'Băng', fire: 'Hỏa', light: 'Lôi' };
const ELEM_COL = { phys: '#f0e6d0', poison: '#8fe34a', cold: '#7fd0ff', fire: '#ff7a2a', light: '#d9b6ff' };
const ELEM_ATTR = { phys: 'physicsdamage_v', poison: 'poisondamage_v', cold: 'colddamage_v', fire: 'firedamage_v', light: 'lightingdamage_v' };
const ELEM_ADD = { phys: 'addphysicsdamage_v', poison: 'addpoisondamage_v', cold: 'addcolddamage_v', fire: 'addfiredamage_v', light: 'addlightingdamage_v' };
const ELEM_RES = { phys: 'physicsres_p', poison: 'poisonres_p', cold: 'coldres_p', fire: 'fireres_p', light: 'lightingres_p' };
const ELEM_ENH = { poison: 'poisonenhance_p', cold: 'coldenhance_p', fire: 'fireenhance_p', light: 'lightingenhance_p' };

/* ---------- hang so cong thuc (docs/CONG_THUC.md) ---------- */
const MAX_RESIST = 95, PLAYER_RES_MAX = 75, MAX_HIT = 95, MIN_HIT = 40, CRIT_MULT = 2;
const STR_PER_DMG = 5, DEX_PER_DMG = 5, ENG_PER_DMG = 4;
/* Can bang rieng game idle (ban goc khong co): 1 Noi cong = +1% sat thuong nguyen to cua chieu, 1 Suc manh (Than phap voi am khi) = +1% sat thuong vat ly */
const ENG_PER_PCT = 1, STR_PER_PCT = 1, DEX_PCT_RANGED = 0.5, IDLE_LIFE_PER_LEVEL = 8; // +8 sinh luc moi cap cho moi he (quai danh lien tuc theo dot)
/* Can bang tu https://jxweb1012.netlify.app/ (doi chieu 2026-10-03).
   EXP can de len tu cap L -> L+1; bang goc ngan hon thi tao lai theo ban host. */
(function buildExpTable() {
  const TARGET = 9999;
  if (J.exp.length < TARGET) {
    J.exp = Array.from({ length: TARGET }, (_, i) => {
      const L = i + 1;
      return Math.floor(100 * Math.pow(L, 2.2) * (1 + L / 500));
    });
  }
})();
const PTS_PER_LEVEL = 5, SKILL_PTS_PER_LEVEL = 1, MAX_LEVEL = 9999;

/* ---------- thuoc tinh ma thuat ---------- */
const ATTR_ID = Object.fromEntries(J.attr.map((n, i) => [n, i]));
function attrText(name, p) {
  if (name === 'allskill_v') {
    const lv = Number(p[0]) || 0, id = Number(p[2]) || 0, skill = id > 0 ? J.skills[id] : null;
    const label = skill ? `Kỹ năng ${skill.n}` : id > 0 ? `Kỹ năng #${id}` : 'Tất cả kỹ năng';
    return `${label}: ${lv > 0 ? '+' : ''}${lv} cấp`;
  }
  const t = J.attrDesc[name];
  if (!t) return viAttrLabel(name) + ': ' + p.filter(v => v).join(' / ');
  return t.replace(/#([a-zA-Z])([123A])([-+~%]?)/g, (m, k, i, flag) => {
    const v = i === 'A' ? Math.floor((p[0] || 0) / 256) : (p[+i - 1] || 0);
    if (k === 'l') return J.skills[v] ? J.skills[v].n : '#' + v;   // #l3 = ten ky nang (tham so 3 la id ky nang)
    return (flag === '+' && v > 0 ? '+' : '') + v;
  }).replace(/#[a-zA-Z][123A][-+~]?/g, '')
    .replace(/Kỹ năng (\d+)/, (m, id) => (J.skills[id] ? 'Kỹ năng ' + J.skills[id].n : m))   // dong +cap ky nang: hien ten
    .replace(/<\/?color(?:=[^>]+)?>/gi, '')
    .replace(/<enter>/gi, ' · ');
}

/* ---------- mon phai, ky nang, quai ---------- */
const FACTIONS = J.factions.filter(f => f.skills && f.skills.length);
const FAC = Object.fromEntries(FACTIONS.map(f => [f.key, f]));
const SK = J.skills;
// Vo cong bac 90 cua Thieu Lam duoc web hien hanh mo tu cap 90; ban idle cu de cap 80.
for (const id of (FAC.shaolin && FAC.shaolin.skills) || []) {
  const s = SK[id]; if (s && s.learn === '90') s.req = Math.max(90, s.req || 0);
}
/* Game idle: chieu tan cong dau tien cua moi phai hoc duoc tu cap 1 (ban goc: cap 10, truoc do chi danh thuong) */
for (const f of FACTIONS) {
  const first = f.skills.map(id => SK[id]).filter(s => s && s.enemy && ['physicsenhance_p', 'physicsdamage_v', 'poisondamage_v', 'colddamage_v', 'firedamage_v', 'lightingdamage_v'].some(a => s.attr[a])).sort((a, b) => a.req - b.req || a.id - b.id);
  if (first.length) { first[0].req = 1; f.starter = first[0].id; }
  // loai vu khi cua phai = tham so 3 cua mon vu khi (addphysicsdamage_p) co cap yeu cau thap nhat
  const mastery = f.skills.map(id => SK[id]).filter(s => s && !s.enemy && s.attr.addphysicsdamage_p).sort((a, b) => a.req - b.req || a.id - b.id)[0];
  const a = mastery && mastery.attr.addphysicsdamage_p[0];
  f.wcode = Array.isArray(a) && [0, 1, 2, 3, 4, 5, 7, 9].includes(a[2]) ? a[2] : -1;
}
const skVal = (s, attr, L) => {
  const a = s.attr[attr]; if (!a) return null;
  const level = Math.max(1, Math.floor(Number(L) || 1)); let v;
  if (level <= a.length) v = a[level - 1];
  else {
    const last = a[a.length - 1], prev = a[a.length - 2], steps = level - a.length;
    if (Array.isArray(last)) v = last.map((x, i) => {
      const p = Array.isArray(prev) ? prev[i] : null;
      return typeof x === 'number' && typeof p === 'number' && x !== -1 && p !== -1 ? x + (x - p) * steps : x;
    });
    else v = a.length > 1 && typeof last === 'number' && typeof prev === 'number' && last !== -1 && prev !== -1 ? last + (last - prev) * steps : last;
  }
  return Array.isArray(v) ? v : [v, 0, 0];
};
const DMG_ATTRS = ['physicsenhance_p', 'physicsdamage_v', 'poisondamage_v', 'colddamage_v', 'firedamage_v', 'lightingdamage_v'];
const isAttack = s => !!(s && s.enemy && !s.aura && DMG_ATTRS.some(a => s.attr[a]));
/* Hinh dang runtime bo sung cho chieu bi thieu chuoi dan con trong ban export.
   Bich Hai: danh trung muc tieu roi 4 tia toa tu muc tieu. 384 la tam idle,
   khong phai thong so da xac nhan cua client VLTK. Giu nguyen bang goc. */
const SKILL_CAST = { 111: { radial: 4, radius: 384, width: 36, missileScale: .45 } };
function skillRayAngles(a, b, count) {
  const base = Math.atan2(b.y - a.y, b.x - a.x);
  return Array.from({ length: count }, (_, i) => base + i * Math.PI * 2 / count);
}
function skillRayHit(a, e, angle, range, width) {
  const dx = e.x - a.x, dy = e.y - a.y, ux = Math.cos(angle), uy = Math.sin(angle);
  const along = dx * ux + dy * uy, radius = e.r || 0;
  return along >= -radius && along <= range + radius && Math.abs(dx * uy - dy * ux) <= width + radius;
}
const ZONES = W.zones, MON = W.mon;
const ZONE_STAGES = 10, WAVES = 4;
const STAGES = ZONES.length * ZONE_STAGES;

/* ---------- trang bi ---------- */
const SLOTS = [['weapon', 'Vũ khí'], ['armor', 'Áo'], ['helm', 'Mũ'], ['belt', 'Đai lưng'], ['boot', 'Giày'], ['cuff', 'Hộ uyển'],
  ['amulet', 'Dây chuyền'], ['ring1', 'Nhẫn 1'], ['ring2', 'Nhẫn 2'], ['pendant', 'Ngọc bội'], ['horse', 'Ngựa']];
const SLOT_VI = Object.fromEntries(SLOTS);
const DETAIL_SLOT = ['weapon', 'weapon', 'armor', 'ring', 'amulet', 'boot', 'belt', 'helm', 'cuff', 'pendant', 'horse']; // theo equip_detail
const MELEE_KIND = ['sword', 'blade', 'wand', 'spear', 'hammer', 'dualblades'], RANGE_KIND = ['darts', 'knife', 'crossbow'];
const AFFIX_KEY = { armor: 'armor', ring: 'ring', amulet: 'necklace', boot: 'boot', belt: 'belt', helm: 'helm', cuff: 'cuff', pendant: 'pendant' };
const RAR_VI = ['Thường', 'Xanh', 'Vàng', 'Tím', 'Hoàng Kim', 'Bạch Kim'], RAR_COL = ['#e8e0d0', '#6aa8ff', '#ffd24a', '#c77bff', '#ffb52e', '#eaf6ff'];
const INV_MAX = 60, INV_EXPANSION_STEP = 10, INV_EXPANSION_MAX = 4;
const invExpansionCount = () => clamp(Math.floor(+(S && S.invExpansions) || 0), 0, INV_EXPANSION_MAX);
const invMax = () => INV_MAX + INV_EXPANSION_STEP * invExpansionCount();
const invUsed = () => S.inv.length + (typeof potSlotsUsed === 'function' ? potSlotsUsed() : 0);
/* Cuong hoa trang bi (forge.js): moi cap +8% thuoc tinh goc (sat thuong vu khi, phong thu, khang goc...) */
const ENH_MAX = 10, ENH_STEP = 0.08;
const PLAT_STEP = 0.05;   // Bach Kim: moi cap thang +5% thuoc tinh goc (Uoc luong)
const enhMul = it => 1 + ENH_STEP * ((it && it.enh) || 0) + PLAT_STEP * ((it && it.plv) || 0);
/* The gioi cua moi vung = anh ban do that 3x3 vung (1536 x 1536 diem) ghep 2x2 lat guong (render.js drawTiledBg)
   -> 3072 x 3072, lien mach khong thay mep; camera chay theo nhan vat */
const WORLD = { w: 3072, h: 3072, pad: 20 };
const clampWorld = (x, y) => [clamp(x, WORLD.pad, WORLD.w - WORLD.pad), clamp(y, WORLD.pad + 30, WORLD.h - WORLD.pad)];
/* vi tri trong the gioi, o di duoc gan nhat khi co vat can (mapobs.js) */
const inWorld = (x, y) => { const p = clampWorld(x, y); return typeof OBS !== 'undefined' && OBS.g ? obsSnap(p[0], p[1]) : p; };
const attrName = id => J.attr[id] || ('#' + id);

const thichGiamChuyenDong = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const giamHieuUng = () => (S && S.lowFx != null) ? !!S.lowFx : thichGiamChuyenDong();
const canonAttr = n => n.replace('_yan', '');

const fixSavedItem = it => typeof window.viFixItem === 'function' ? window.viFixItem(it) : it;
const itemProtected = it => !!(it && (it.set || it.vio || it.plv || it.locked || (it.enh | 0) > 0));
