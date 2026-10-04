/* ======================= DO HOANG KIM / BACH KIM (KItemGenerator::Gen_GoldEquipment, KItemList) ======================= */
'use strict';
const GOLD_EXT = 2; // MAX_ITEM_MAGICATTRIB (8) - MAX_ITEM_NORMAL_MAGICATTRIB (6): 2 dong mo rong theo bo
const SET_DROP_FACTIONS = new Set(FACTIONS.map(f => f.id));
/* Icon tu tao cho nhung mon bo khong co anh trong du lieu goc. */
const SET_ICON_FIX = {
  'Chấp Tử Chi Thủ': 'img/i/generated/ring_chaptu.png',
  'Dữ Tử Giai Lão': 'img/i/generated/ring_du_tu_giai_lao.png',
  'Minh Nguyệt Kết': 'img/i/generated/pendant_minh_nguyet.png',
  'Thiền Quyên Liên': 'img/i/generated/necklace_thien_quyen.png',
  'Như ý Khấu': 'img/i/generated/pendant_nhu_y_khau.png',
  'Cát Tường Phù': 'img/i/generated/charm_cat_tuong_phu.png',
  'Thiên Hà Giới': 'img/i/generated/ring_thien_ha.png',
  'Hưng Bang Giới': 'img/i/generated/ring_hung_bang.png',
  '[Kim]Dương Thần Hương Trụy': 'img/i/generated/pendant_duong_than_kim.png',
  '[Mộc]Dương Thần Hương Trụy': 'img/i/generated/pendant_duong_than_moc.png',
  '[Thủy]Dương Thần Hương Trụy': 'img/i/generated/pendant_duong_than_thuy.png',
  '[Hỏa]Dương Thần Hương Trụy': 'img/i/generated/pendant_duong_than_hoa.png',
  '[Thổ]Dương Thần Hương Trụy': 'img/i/generated/pendant_duong_than_tho.png'
};
window.VI_SET_ICONS = SET_ICON_FIX;
for (const rows of Object.values(J.sets)) for (const row of rows) {
  if (!row.ic && SET_ICON_FIX[row.n]) row.ic = SET_ICON_FIX[row.n];
}
// Chi sinh do moi cua phai choi duoc hoac do khong gioi han phai; van loc gioi tinh.
const setDropEligible = row => sexReqOk(row.req) && row.req.every(([id, v]) => id !== 39 || v < 0 || SET_DROP_FACTIONS.has(v));
/* gia tri = min + (max - min) * cap_sinh / MAX_ITEM_LUCK (10) */
function geValue(idx, g) {
  const m = J.ge[idx]; if (!m) return null;
  return { a: m.a, p: m.p.map(([lo, hi]) => (lo === -1 && hi === -1 ? -1 : Math.round(lo + (hi - lo) * g / 10))), pre: 1 };
}
function makeSetItem(kind, row, luck) {
  const g = () => clamp(irnd(Math.min(10, luck), 10), 0, 10);
  const it = { uid: S.uid++, d: row.d, k: row.k, n: row.n, ic: row.ic || SET_ICON_FIX[row.n] || '', lvl: row.lvl, s: row.s, price: row.price,
    base: row.base.map(x => x.slice()), req: row.req.map(x => x.slice()), r: kind === 'gold' ? 4 : 5,
    set: { kind, grp: row.grp, n1: row.n1 || 99, n2: row.n2 || 99, sid: row.sid } };
  it.mag = row.mag.map(i => geValue(i, g())).filter(Boolean);
  it.ext = row.ext.map(i => geValue(i, g())).filter(Boolean);
  return it;
}
/* Roi do bo: chu yeu tu trum; uu tien bo cua mon phai nhan vat (requiremenpai), yeu cau cap khong qua xa cap nhan vat */
function rollSetDrop(e) {
  const chance = e.cls === 'boss' ? 0.40 : e.cls === 'elite' ? 0.10 : 0.01;
  if (Math.random() >= chance) return null;
  const kind = e.L >= 70 && Math.random() < 0.35 ? 'platina' : 'gold';
  const lvCap = Math.max(S.lvl, e.L) + 20, fid = FAC[S.fac] ? FAC[S.fac].id : -1;
  const reqOf = (r, id) => (r.req.find(q => q[0] === id) || [0, -1])[1];
  const eligible = J.sets[kind].filter(setDropEligible);
  let pool = eligible.filter(r => reqOf(r, 36) <= lvCap);
  const mine = pool.filter(r => reqOf(r, 39) === fid);
  if (mine.length && Math.random() < 0.8) pool = mine;
  if (!pool.length) pool = eligible;
  if (!pool.length) return null;
  return makeSetItem(kind, pick(pool), R.P ? Math.max(5, Math.floor(R.P.lucky / 10)) : 5);
}
/* IsEnoughToActive: co mot bo dang mac du NeedToActive2 mon -> mo het dong an cua MOI trang bi */
function setCounts(eq) {
  const c = {};
  for (const k in eq) {
    const it = eq[k]; if (!it || !it.set || k === 'horse') continue;
    if (k === 'ring1' && eq.ring2 && eq.ring2.set && eq.ring2.set.grp === it.set.grp) {
      // Có bộ gồm hai nhẫn khác tên nhưng trùng sid=1 trong dữ liệu gốc: vẫn phải tính hai món.
      const other = eq.ring2, same = it.n && other.n ?
        viName(it.n).replace(/^\[[^\]]*\]\s*/, '') === viName(other.n).replace(/^\[[^\]]*\]\s*/, '') : other.set.sid === it.set.sid;
      if (same) continue; // cùng một nhẫn (kể cả biến thể Tống Kim) chỉ tính một món
    }
    c[it.set.grp] = (c[it.set.grp] || 0) + 1;
  }
  return c;
}
function enoughToActive(eq) {
  const c = setCounts(eq);
  for (const k in eq) { const it = eq[k]; if (it && it.set && c[it.set.grp] >= it.set.n2) return true; }
  return false;
}
/* GetGoldEquipEnhance: so dong mo rong = so mon cung bo / NeedToActive1 (du bo hoac ngua: ca 2) */
function goldEnhance(it, eq) {
  const slot = slotOfEquipped(it, eq); if (!slot) return 0;
  if (slot === 'horse' || enoughToActive(eq)) return GOLD_EXT;
  return Math.min(GOLD_EXT, Math.floor((setCounts(eq)[it.set.grp] || 0) / Math.max(1, it.set.n1)));
}
function setMembers(it) { return J.sets[it.set.kind].filter(r => r.grp === it.set.grp); }
