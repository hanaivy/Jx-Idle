/* v1.0.5: loại đồ bộ rỗng và sửa ngưỡng bộ. Giữ tên gốc làm khóa và bản Việt hóa local. */
'use strict';
(function () {
  const J = window.JX; if (!J || !J.sets) return;
  const usable = r => (r.base && r.base.length) || (r.mag || []).concat(r.ext || []).some(i => J.ge[i]);
  window.VI_EMPTY_ROWS = [];
  for (const kind of ['gold', 'platina']) { const rows = J.sets[kind], keep = rows.filter(usable); window.VI_EMPTY_ROWS.push(...rows.filter(r => !usable(r)).map(r => Object.assign({ kind }, r))); rows.length = 0; rows.push(...keep); }
  // 2. nguong bo: NeedToActive1 / 2 = 0 nhung co dong mo rong -> bo that (so mon khac nhau trong nhom). n1 = nua bo (lam tron len)
  //    -> mac 3/5 mon mo dong mo rong dau, du bo (5/5) mo ca hai + het dong an cua moi trang bi. Nhom khong co dong mo rong (hang chuc
  //    mon Bach Kim le) khong phai bo: giu 0 ("khong co thuong bo").
  const strip = n => n.replace(/^\[[^\]]*\]\s*/, '');
  const fix = {};
  for (const kind of ['gold', 'platina']) {
    const g = {};
    for (const r of J.sets[kind]) if (!r.n2 && r.ext && r.ext.length) (g[r.grp] = g[r.grp] || []).push(r);
    for (const grp in g) {
      const N = new Set(g[grp].map(r => strip(r.n))).size, n2 = Math.max(1, N), n1 = Math.max(1, Math.ceil(n2 / 2));
      for (const r of g[grp]) { r.n1 = n1; r.n2 = n2; }
      fix[kind + ':' + grp] = [n1, n2];
    }
  }
  window.VI_SET_FIX = fix;
  /* Vá đồ rỗng và ngưỡng bộ trong file lưu; giữ nguyên khóa tên cho từ điển Việt hóa. */
  window.viFixItem = function (it) {
    if (!it || typeof it !== 'object') return it;
    if (!it.ic && it.n && window.VI_SET_ICONS && window.VI_SET_ICONS[it.n]) it.ic = window.VI_SET_ICONS[it.n];
    // mon bo rong (khong base, khong dong): lay thuoc tinh tu mon cung loai o cung bo / cung phai gan cap nhat de khong thanh vat vo dung
    if (it.set && !(it.base || []).length && !(it.mag || []).length && !(it.ext || []).length) {
      const kind = it.set.kind, lv = r => (r.req.find(q => q[0] === 36) || [0, 0])[1], fac = r => (r.req.find(q => q[0] === 39) || [0, -1])[1];
      const myLv = ((it.req || []).find(q => q[0] === 36) || [0, 0])[1], myFac = ((it.req || []).find(q => q[0] === 39) || [0, -1])[1];
      const rows = (J.sets[kind] || []).filter(r => r.mag.length), sameType = rows.filter(r => r.d === it.d);
      // Một số phi phong rỗng không có mẫu cùng loại: dùng thuộc tính áo gần cấp thay vì để đồ cũ vô dụng.
      const pool = sameType.length ? sameType : rows.filter(r => r.d === 2);
      const donor = pool.sort((a, b) => (fac(a) === myFac ? 0 : 1) - (fac(b) === myFac ? 0 : 1) || Math.abs(lv(a) - myLv) - Math.abs(lv(b) - myLv))[0];
      if (donor) { it.base = donor.base.map(x => x.slice()); it.mag = donor.mag.map(i => J.ge[i]).filter(Boolean).map(m => ({ a: m.a, p: m.p.map(([lo, hi]) => (lo === -1 && hi === -1 ? -1 : Math.round(hi))), pre: 1 })); it.ext = donor.ext.map(i => J.ge[i]).filter(Boolean).map(m => ({ a: m.a, p: m.p.map(([lo, hi]) => (lo === -1 && hi === -1 ? -1 : Math.round(hi))), pre: 1 })); }
    }
    if (it.set && (it.set.n2 >= 99 || !it.set.n2)) { const f = fix[it.set.kind + ':' + it.set.grp]; if (f) { it.set.n1 = f[0]; it.set.n2 = f[1]; } }
    return it;
  };
})();
