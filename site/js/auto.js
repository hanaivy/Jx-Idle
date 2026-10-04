/* ======================= TU DONG REN DO (giam so lan bam) =======================
   Bat o the Khac (S.autoForge, mac dinh TAT). Chay moi 30 giay choi va khi vao lai game, dung dung ham ren thu cong (recipes.js)
   nen giu nguyen luat, ti le va rui ro. Thu tu: ghep manh Hoang Kim -> kham Tim vao do dang thieu dong -> hop Huyen Tinh tu do thua
   -> thang cap Huyen Tinh du 3 vien (co bao hiem khi du Tinh Hong Bao Thach) -> che / thang cap Bach Kim khi du nguyen lieu va vang -> cuong hoa do dang mac
   khi vang du. Khong thang cap khoang (rui ro vo). Audit 03/10/2026: them cac khoan tieu nguyen lieu / vang du (mo phong 24 gio: Tinh Hong Bao Thach du 300-800 vien, vang 38-59 trieu khong co cho tieu). */
'use strict';
const AUTO_FORGE_MAX = { fuse: 5, ench: 6, up: 8, plat: 2, platUp: 3, enh: 6 };
function enchaseTargets() {
  const worn = Object.values(S.eq).filter(Boolean), pool = worn.concat(S.inv);
  return pool.filter(it => !it.set && it.d >= 0 && it.d <= 9 && (it.mag || []).length < VIO_SLOTS && ((it.mag || []).length === 0 ? it.r === 0 : it.vio))
    .sort((a, b) => (worn.includes(b) - worn.includes(a)) || (b.lvl - a.lvl));
}
/* Tim mot cap (mon, cap Huyen Tinh, khoang) kham duoc ngay, hoac null */
function findEnchase() {
  const hts = Object.keys(mats().ht).map(Number).sort((a, b) => b - a), ores = Object.keys(mats().ore);
  if (!hts.length || !ores.length) return null;
  for (const it of enchaseTargets()) {
    const n = it.mag.length;
    for (const key of ores) {
      if (oreParse(key).place !== n) continue;
      for (const ht of hts) if (typeof enchaseCheck(it, ht, key) !== 'string') return { it, ht, key };
    }
  }
  return null;
}
const forgeReadyCounts = () => ({
  shard: Object.keys(mats().shard).filter(n => SHARDS[n] && matHave('shard', n) >= SHARDS[n]).length,
  up: Object.keys(mats().ht).map(Number).filter(l => l < HT_MAX && matHave('ht', l) >= 3).length,
  ench: findEnchase() ? 1 : 0,
  fuse: fusePool().length >= 3 && S.gold >= fuseCost() * 2 ? 1 : 0,
  plat: S.gold >= platCost(PLAT_MAKE.cost.van) * 3 && matHave('misc', 'wc') >= PLAT_MAKE.inputs[1].qty && matHave('misc', 'mys') >= PLAT_MAKE.inputs[2].qty &&
    S.inv.filter(it => canPlatBase(it) && !(it.enh > 0)).some((it, i, rows) => rows.some((other, j) => i !== j && it.n === other.n)) ? 1 : 0,
  enh: Object.values(S.eq).some(it => it && (it.enh || 0) < ENH_MAX && S.gold >= enhCost(it) * 6) ? 1 : 0,
});
/* Do thua co the hop Huyen Tinh: nhan / day chuyen / ngoc boi trong tui, khong phai do manh hon do dang mac */
function fusePool() { return S.inv.filter(it => canFuse(it) && !itemProtected(it)).filter(x => !betterThanEquipped(x)).sort((a, b) => itemPower(a) - itemPower(b)); }
function autoForge() {
  if (!S || !S.fac || !S.autoForge) return null;
  const st = { shard: 0, ench: 0, fuse: 0, up: 0, fail: 0 };
  for (const n of Object.keys(mats().shard)) if (SHARDS[n] && matHave('shard', n) >= SHARDS[n] && invUsed() < invMax()) { if (combineShards(n).ok) st.shard++; }
  for (let g = 0; g < AUTO_FORGE_MAX.ench; g++) { const f = findEnchase(); if (!f) break; const r = enchase(f.it, f.ht, f.key); if (r.ok) st.ench++; else st.fail++; }
  for (let g = 0; g < AUTO_FORGE_MAX.fuse; g++) { const p = fusePool().slice(0, 3); if (p.length < 3 || S.gold < fuseCost() * 2 || !fuse(p).ok) break; st.fuse++; }
  let ups = 0;
  // thang cap Huyen Tinh: co Tinh Hong Bao Thach du (roi nhieu hon nhu cau rat nhieu) va vang gap 3 lan phi bao hiem thi mua bao hiem - that bai khong mat 3 vien
  for (let l = 1; l < HT_MAX; l++) while (matHave('ht', l) >= 3 && ups < AUTO_FORGE_MAX.up) { ups++;
    const bh = htInsureCost(l), ins = matHave('misc', 'thbt') >= bh.thbt && S.gold >= bh.van * 3, r = upgradeHT(l, ins); if (r.ok) st.up++; else if (r.lost !== false) st.fail++; }
  // Bach Kim: 2 mon Hoang Kim giong nhau nam trong tui (chua mac) + nguyen lieu + vang gap 3 lan phi -> che; thang cap Bach Kim khi du nguyen lieu va vang
  st.plat = 0; st.platUp = 0;
  for (let g = 0; g < AUTO_FORGE_MAX.plat; g++) {
    const pool = S.inv.filter(it => canPlatBase(it) && !(it.enh > 0)), a = pool.find((x, i) => pool.some((y, j) => j !== i && y.n === x.n)), b = a && pool.find(y => y !== a && y.n === a.n);
    if (!a || !b || S.gold < platCost(PLAT_MAKE.cost.van) * 3 || invUsed() >= invMax()) break;
    const r = makePlatina(a, b); if (r.ok) st.plat++; else if (!r.lost) break; else st.fail++;
  }
  for (const it of Object.values(S.eq).concat(S.inv)) {
    if (!it || !it.set || it.set.kind !== 'platina' || (it.plv || 0) >= PLAT_MAX) continue;
    const u = PLAT_UP[it.plv || 0]; if (!u || S.gold < platCost(u.cost.van) * 3 || matHave('misc', 'wc') < u.inputs[0].qty || matHave('misc', 'mys') < u.inputs[1].qty) continue;
    if (st.platUp >= AUTO_FORGE_MAX.platUp) break;
    const r = upgradePlatina(it); if (r.ok) st.platUp++; else st.fail++;
  }
  // Cuong hoa: vang du (> 6 lan phi) thi cuong hoa do dang mac, uu tien mon it cap nhat (moi buoc +8% thuoc tinh goc; that bai chi mat vang)
  st.enh = 0;
  for (let g = 0; g < AUTO_FORGE_MAX.enh; g++) {
    const t = Object.values(S.eq).filter(it => it && (it.enh || 0) < ENH_MAX && S.gold >= enhCost(it) * 6).sort((a, b) => (a.enh || 0) - (b.enh || 0))[0];
    if (!t) break; const r = enhanceCore(t); if (!r.paid) break; if (r.ok) st.enh++;
  }
  const parts = [];
  if (st.shard) parts.push(`ghép ${st.shard} món Hoàng Kim`);
  if (st.ench) parts.push(`khảm ${st.ench} dòng Tím`);
  if (st.fuse) parts.push(`hợp ${st.fuse} Huyền Tinh`);
  if (st.up) parts.push(`thăng cấp ${st.up} Huyền Tinh`);
  if (st.plat) parts.push(`chế ${st.plat} món Bạch Kim`);
  if (st.platUp) parts.push(`thăng cấp ${st.platUp} lần Bạch Kim`);
  if (st.enh) parts.push(`cường hóa thành công ${st.enh} lần`);
  if (st.fail) parts.push(`${st.fail} lần thất bại`);
  if (parts.length) { R.dirty = true; invDirty = true; log(`<span class="dim">Tự rèn: ${parts.join(', ')}.</span>`); }
  return st;
}

/* ======================= TU MUA VU KHI O BIEN KINH =======================
   Vu khi roi rat it (3-5 mon / 20 phut dau) nen phai noi cong / doc (Ngu Doc, Con Lon...), co sat thuong chieu nhan theo bac vu khi (weaponTierMul),
   nhieu khi khong co vu khi moi trong khi ngan luong nam khong. Moi 30 giay choi: neu cua hang ban vu khi DUNG LOAI phai, du cap, du yeu cau
   (hoac thieu it va dang bat tu cong diem), manh hon vu khi tot nhat dang co it nhat 25% va gia khong qua 60% ngan luong -> mua va mac.
   Tat o the Khac (S.autoBuy). Khong mua khi dang co do tot hon trong tui. */
const AUTO_BUY_GAIN = 1.25, AUTO_BUY_BUDGET = 0.6;
function bestOwnedWeaponDmg() {
  const f = FAC[S.fac]; let best = 0;
  for (const it of S.inv.concat(S.eq.weapon ? [S.eq.weapon] : []))
    if (it.d <= 1 && sexOk(it) && (it.req || []).every(([id, v]) => id !== 36 || S.lvl >= v) && (f.wcode < 0 || weaponCode({ weapon: it }) === f.wcode)) best = Math.max(best, weaponDmg(it));   // tinh ca vu khi dang thieu diem tiem nang (da mua, cho cong diem): khong mua lai
  return best;
}
function autoBuyWeapon() {
  const f = FAC[S.fac]; if (!f || S.autoBuy === false || f.wcode < 0 || !J.shops.weapon) return null;
  if (invUsed() >= invMax()) return null;
  const have = bestOwnedWeaponDmg(); let pick = null;
  for (const g of J.shops.weapon.items) {
    if (g.g === 1) continue;
    const it = goodsItem(g); if (!it || it.d > 1 || weaponCode({ weapon: it }) !== f.wcode || !sexOk(it)) continue;
    const price = shopPrice(g), dmg = weaponDmg(it);
    if (price > S.gold * AUTO_BUY_BUDGET || dmg < have * AUTO_BUY_GAIN) continue;
    const lv = (it.req.find(q => q[0] === 36) || [0, 0])[1]; if (lv > S.lvl) continue;
    if ((it.req || []).some(([id, v]) => (id === 37 || id === 39) && v >= 0 && !reqOk(it))) continue;
    const need = Object.values(reqDeficit(it)).reduce((a, b) => a + b, 0);
    if (need > 0 && !(S.autoPts === true && need <= S.attrPts + PTS_PER_LEVEL * REQ_SAVE_LEVELS)) continue;
    if (!pick || dmg > pick.dmg) pick = { g, dmg, price, need };
  }
  if (!pick) return null;
  const it = makeItem(pick.g.d, pick.g.k, pick.g.lvl, 0); if (!it) return null;
  it.s = shopSeries(pick.g, it); S.gold -= pick.price;
  addItem(it, true, true, true);
  log(`<span class="dim">Tự mua <b>${esc(it.n)}</b> ở Biện Kinh (${fmt(pick.price)} lượng).</span>`);
  if (S.autoPts === true) autoSpendAttrs();
  autoEquipAll(); R.dirty = true; invDirty = true;
  return it;
}
