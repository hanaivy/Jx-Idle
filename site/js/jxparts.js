/* ======================= NHAN VAT GHEP BO PHAN KIEU JX1 =======================
   Hinh tu client VLTK (spr\npcres\man|woman) xuat bang jxres/build.py -> img/jx/{m,f}/*.webp + jxlook.js (window.JXLOOK).
   Nhu JX1: nhan vat ghep tu 11 bo phan (dau, toc, vai, than, 2 tay, 2 vu khi, ngua truoc/giua/sau), moi bo phan chon dong
   theo trang bi dang mac qua bang ArmorRes / HelmRes / MeleeRes / RangeRes / HorseRes (ma = dong trong bang do + 2;
   ma 1 = khong mac). Tu the (dung / chay / danh / thi trien / trung don / nga, co hoac khong cuoi ngua) lay theo bang
   "vu khi - hanh dong" (未骑马关联表 / 骑马关联表); thu tu ve tung bo phan theo huong va khung (贴图顺序表).
   Thieu hinh (chua tai xong) -> ve hinh mon phai cu. */
'use strict';
let JXL = window.JXLOOK || null;
/* jxlook.js (~0,6 MB) tai sau khi game da chay: nhan vat dung hinh cu cho toi khi xong */
if (!JXL && typeof document !== 'undefined' && typeof document.createElement === 'function' && document.head) {
  const s = document.createElement('script'); s.src = 'jxlook.js?v=' + ((document.querySelector('script[src*="js/core.js"]') || {}).src || '').split('v=')[1];
  s.onload = () => { JXL = window.JXLOOK || null; if (JXL && typeof R !== 'undefined' && S && S.fac) { R.jx = jxOn() ? jxSetup() : null; if (R.jx) jxPreload(); } };
  document.head.appendChild(s);
}
const JX_PART_IDX = { '头部': 0, '发型': 1, '肩膀': 4, '躯体': 5, '左手': 6, '右手': 7, '左手武器': 8, '右手武器': 9, '马前': 12, '马中': 13, '马后': 14 };
const JX_IDX_PART = Object.fromEntries(Object.entries(JX_PART_IDX).map(([k, v]) => [v, k]));
const JX_GROUP = { '头部': 'helm', '发型': 'helm', '肩膀': 'armor', '躯体': 'armor', '左手': 'armor', '右手': 'armor', '左手武器': 'weapon', '右手武器': 'weapon', '马前': 'horse', '马中': 'horse', '马后': 'horse' };
/* 'm:ten' = hinh dung chung cua nam (vd ngua cua nhan vat nu) */
const jxSheetKey = (sx, nm) => (nm.startsWith('m:') ? 'm/' + nm.slice(2) : sx + '/' + nm);
const jxOn = () => !!JXL && S && S.jxLook !== false;
/* Dong (index du lieu, tinh tu 0) cua mot trang bi trong bang bo phan */
function jxItemP(it) {
  if (!it) return -1;
  if (Number.isInteger(it.p)) return it.p;
  const b = typeof baseRow === 'function' ? baseRow(it.d, it.k, it.lvl || 1) : null;   // do bo / Bach Kim: dung hinh mon thuong cung loai, cap gan nhat
  return b && Number.isInteger(b.p) ? b.p : -1;
}
function jxRow(g, it) {
  const m = JXL.res[g]; if (!m) return -1;
  const id = it && reqOk(it) && jxItemP(it) >= 0 ? jxItemP(it) + 2 : 1;
  const v = m[id] ?? m[1]; return v == null ? -1 : v - 2;
}
/* Tinh lai khi doi do (recalc) */
function jxSetup() {
  if (!JXL || !S || !S.fac) return null;
  const sx = S.sex ? 'f' : 'm', eq = S.eq, w = eq.weapon;
  const rows = { helm: jxRow('helm', eq.helm), armor: jxRow('armor', eq.armor), weapon: jxRow(w && w.d === 1 ? 'range' : 'melee', w), horse: eq.horse && S.ride !== false ? jxRow('horse', eq.horse) : -1 };
  if (rows.weapon < 0) rows.weapon = 0;
  const wn = (JXL.wnames[sx] || [])[rows.weapon] || '空手';
  const asc = JXL.assoc[sx][wn] || JXL.assoc[sx]['空手'];
  const ride = rows.horse >= 0 && asc && asc[1] ? 1 : 0;
  return { sx, rows, asc: asc ? asc[ride] || asc[0] : {}, ride, key: JSON.stringify([sx, rows, ride]) };
}
function jxOrder(sx, act, dir16, frame) {
  const S2 = JXL.sort[sx], sec = S2[act] || {}, D = S2.DEFAULT;
  for (const k in sec) if (k[0] === 'L' && sec[k][0] === frame) return sec[k].slice(1);
  const v = sec['Dir' + (dir16 + 1)] || D['Dir' + (dir16 + 1)] || D.Dir1; return v.slice(1);
}
const JX_MS = { st: 120, run: 85 };
/* Ve nhan vat; tra ve chieu cao (nhu drawAnim) hoac false neu chua du hinh */
function drawJxHero(act, dir, t, x, y, sc, alpha, oldKey) {
  const J = R.jx; if (!J) return false;
  const useMg = act === 'at' && R.P && R.P.main && !R.P.main.useAR && J.asc.mg;   // chieu noi cong: tu the thi trien
  const jact = J.asc[useMg ? 'mg' : act] || J.asc.st; if (!jact) return false;
  const tabs = JXL.tabs[J.sx], list = [];
  let ref = null;
  for (const pi of jxOrder(J.sx, jact, (dir % 8) * 2, 0)) {
    const part = JX_IDX_PART[pi]; if (!part) continue;
    const row = J.rows[JX_GROUP[part]]; if (row < 0) continue;
    const nm = ((tabs[part] || {})[row] || {})[jact]; if (!nm) continue;
    const sk = jxSheetKey(J.sx, nm), m = JXL.sheets[sk]; if (!m) continue;
    const im = img('img/jx/' + sk + '.webp');
    if (!im.complete || !im.naturalWidth) { if (part === '躯体') return false; continue; }   // than chua tai: dung hinh cu
    list.push([im, m, part]); if (part === '躯体' || !ref) ref = m;
  }
  if (!ref) return false;
  // khung hinh: lap (dung / chay) hoac chay 1 lan theo thoi luong hanh dong cu (danh / trung don / nga)
  const n = ref[4]; let f;
  if (act === 'st' || act === 'run') f = Math.floor(t * 1000 / (JX_MS[act] || 110)) % n;
  else { const dur = (typeof animLen === 'function' && animLen(oldKey, act)) || n * 0.09; f = Math.min(n - 1, Math.floor(clamp(t / Math.max(0.1, dur), 0, 0.999) * n)); }
  // thu tu ve dac biet theo khung (Line) dung khung goc (truoc khi bo bot khung)
  const ord = jxOrder(J.sx, jact, (dir % 8) * 2, f * (ref[6] || 1));
  list.sort((a, b) => ord.indexOf(JX_PART_IDX[a[2]]) - ord.indexOf(JX_PART_IDX[b[2]]));
  const fx = JXL.foot[0], fy = JXL.foot[1]; let top = 0;
  CX.globalAlpha = alpha;
  for (const [im, m] of list) {
    const [w, h, x0, y0, nn, dirs] = m, fi = Math.min(nn - 1, Math.floor(f * nn / n)), d = dirs >= 8 ? dir % 8 : Math.floor((dir % 8) * dirs / 8);
    CX.drawImage(im, fi * w, d * h, w, h, x + (x0 - fx) * sc, y + (y0 - fy) * sc, w * sc, h * sc);
    top = Math.max(top, (fy - y0) * sc);
  }
  CX.globalAlpha = 1;
  return top;
}
/* Tai truoc hinh cua bo do dang mac (moi tu the) de doi tu the khong bi nhay ve hinh cu */
function jxPreload() {
  const J = R.jx; if (!J) return;
  for (const jact of Object.values(J.asc)) for (const part in JX_PART_IDX) {
    const row = J.rows[JX_GROUP[part]]; if (row < 0) continue;
    const nm = (((JXL.tabs[J.sx] || {})[part] || {})[row] || {})[jact]; if (nm && JXL.sheets[jxSheetKey(J.sx, nm)]) img('img/jx/' + jxSheetKey(J.sx, nm) + '.webp');
  }
}
