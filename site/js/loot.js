/* ======================= ROI DO (settings/droprate/*.ini + magicattriblevel.txt) ======================= */
'use strict';
const FACTION_WEAPON_SHARE = 0.5;
/* QA-081: ai <= moc nay thi mon Xanh duoc +1 dong (bu cho vung nho khong co do bo) */
const BLUE_BOOST_STAGE = 40;
/* Cap quai dung de tinh do roi / ngan luong: toi da cap nhan vat + DROP_OVER (quai cap cao hon nhieu, vd tang thap, khong roi do khong mac duoc) */
const DROP_OVER = 5;
const dropLv = e => Math.min(e.L, S.lvl + DROP_OVER);
function dropFile(L) {
  const b = L < 110 ? clamp(Math.floor(L / 10) * 10, 10, 90) : (L < 119 ? 110 : 119);
  return J.drop['npcdroprate' + b + '.ini'] || J.drop['npcdroprate.ini'];
}
/* Cap vat pham 1..10 theo cap quai, gioi han boi MinItemLevel/MaxItemLevel cua tep roi do */
function itemTier(L, df) {
  const m = df.main;
  return clamp(Math.round(L / 12) + irnd(-1, 1), m.MinItemLevel || 1, m.MaxItemLevel || 10);
}
function baseRow(detail, particular, tier) {
  const g = J.items[detail]; if (!g) return null;
  let rows = g.list.filter(r => r.k === particular);
  if (!rows.length) return null;
  const okRows = rows.filter(r => sexReqOk(r.req)); if (okRows.length) rows = okRows;   // uu tien mon dung gioi tinh nhan vat
  return rows.reduce((b, r) => Math.abs(r.lvl - tier) < Math.abs(b.lvl - tier) ? r : b);
}
/* Thuoc tinh ma thuat theo KItemGenerator::Gen_MagicAttrib + KLibOfBPT (magicattrib.txt, 330 dong):
   dong i = 0,2,4 la tien to (hien), 1,3,5 la hau to (an, can ngu hanh kich hoat); ung vien = dong cung loai tien/hau to,
   he yeu cau (-1 = moi he) bang he cua mon do, cap dong <= cap thuoc tinh, ti le roi theo loai trang bi > nDecide,
   khong trung loai thuoc tinh; chon ngau nhien deu; gia tri ngau nhien trong khoang. */
/* Dong ngau nhien KHONG BAO GIO duoc sinh ra neu bản idle khong co co che tuong ung (truoc day roi ra dong ghi "khong tac dung" -> mac vao khong thay gi) */
const DEAD_AFFIX = new Set(['staminamax_v', 'staminareplenish_v', 'stamina_v', 'visionradius_p', 'fasthitrecover_v', 'indestructible_b', 'knockback_p',
  'addphysicsmagic_v', 'addcoldmagic_v', 'addfiremagic_v', 'addlightingmagic_v', 'addpoisonmagic_v']);
function rollMagic(it, levels, lucky = 0) {
  const out = [], used = new Set();
  for (let i = 0; i < levels.length; i++) {
    const pre = i % 2 === 0 ? 1 : 0, lv = levels[i];
    const decide = Math.floor(Math.random() * 100) / (1 + lucky * 20 / 100);
    const cand = J.affix.filter(a => a.pre === pre && (a.s < 0 || a.s === it.s) && a.lvl <= lv && (a.w[it.d] || 0) > decide && !used.has(a.a) && !DEAD_AFFIX.has(canonAttr(attrName(a.a))));
    if (!cand.length) break;
    const a = pick(cand); used.add(a.a);
    const p = a.p.map(([mn, mx]) => mn === -1 && mx === -1 ? -1 : irnd(Math.min(mn, mx), Math.max(mn, mx)));
    out.push({ a: a.a, p, n: a.n, pre });
  }
  return out;
}
function magicCount(cls) {
  /* So dong theo ban host: 0-1 (42%), 2-3 (35%), 4-5 (18%), 6 (5%)
     khi quai thuong va may man = 0. Do ngau nhien toi da Vang; Tim tu kham. */
  const lucky = (R.P ? R.P.lucky : 0) * 0.8;
  const roll = Math.random() * 100 - lucky
    - (cls === 'boss' ? 55 : cls === 'elite' ? 35 : 0);
  // Trum boss: nhiều dòng hơn; quái thường: ít hơn
  if (roll < 5)  return irnd(6, 6);   // 6 dong van la Vang
  if (roll < 23) return irnd(4, 5);   // ~18% → Vàng (4-5 dòng)
  if (roll < 58) return irnd(2, 3);   // ~35% → Xanh (2-3 dòng)
  return irnd(0, 1);                  // ~42% → Trắng (0-1 dòng)
}
/* cap tung dong thuoc tinh (pnaryMALevel): quanh cap mon do, 1..10 */
const magicLevels = (n, tier) => Array.from({ length: n }, () => clamp(tier + irnd(-1, 0), 1, 10));
function rarityOf(n) { return n >= 4 ? 2 : n >= 2 ? 1 : 0; }   // Tim (3) chi tu Huyen Tinh (recipes.js), do roi ngau nhien toi da Vang
const randomSeries = () => irnd(0, 4); // KItemGenerator: he ngau nhien Kim..Tho neu khong yeu cau he

/* Trang phuc nam / nu nam o cac "particular" khac nhau (vd ao 0..6 nam, 7..13 nu): doi sang loai dung gioi tinh nhan vat */
function sexPart(detail, part) {
  const g = J.items[detail]; if (!g) return part;
  const rows = g.list.filter(r => r.k === part);
  if (!rows.length || rows.some(r => sexReqOk(r.req))) return part;
  const alt = [...new Set(g.list.filter(r => sexReqOk(r.req)).map(r => r.k))];
  return alt.length ? pick(alt) : part;
}
function makeItem(detail, particular, tier, nMagic) {
  const b = baseRow(detail, particular, tier); if (!b) return null;
  const it = { uid: S.uid++, d: detail, k: particular, p: b.p, n: b.n, ic: b.ic || '', lvl: b.lvl, s: b.s >= 0 ? b.s : randomSeries(),
    base: b.base.map(x => x.slice()), req: b.req.map(x => x.slice()), price: b.price };
  it.mag = rollMagic(it, magicLevels(nMagic, b.lvl), R.P ? R.P.lucky : 0);
  it.r = rarityOf(it.mag.length);
  return it;
}
/* Roi do khi ha quai: so luong theo loai quai, mon theo RandRate/RandRange cua tep droprate */
function rollDrops(e) {
  const df = dropFile(e.L), items = df.items.filter(x => x[0] === 0 && x[1] <= 9);
  // Giam luong trang bi tren dat: quai thuong chi co 20% roi 1 mon; tinh anh 1-2; trum 3-5.
  const n = e.cls === 'boss' ? irnd(3, 5) : e.cls === 'elite' ? irnd(1, 2) : (Math.random() < 0.2 ? 1 : 0);
  const out = [];
  const count = n * (e.bonusDrop || 1) * ((R.P && R.P.dropMul) || 1), whole = Math.floor(count);
  const dropCount = whole + (count > whole && Math.random() < count - whole ? 1 : 0);
  for (let i = 0; i < dropCount; i++) {
    const x = wpick(items, r => r[3]); if (!x) continue;
    let [detail, part] = [x[1], x[2]];
    // JX mua vu khi o tiem; game idle khong co tiem -> mot nua so vu khi roi ra dung loai vu khi cua phai
    const f = FAC[S.fac];
    if (detail <= 1 && f && f.wcode >= 0 && Math.random() < FACTION_WEAPON_SHARE) [detail, part] = f.wcode === 7 ? [1, irnd(0, 2)] : [0, f.wcode === 9 ? 6 : f.wcode];
    part = sexPart(detail, part);
    let it = makeItem(detail, part, itemTier(e.L, df), magicCount(e.cls));
    for (let t = 0; it && !sexOk(it) && t < 6; t++) it = makeItem(detail, part, itemTier(e.L, df), magicCount(e.cls));   // khong roi trang phuc khac gioi tinh
    if (it && sexOk(it)) out.push(it);
  }
  return out;
}
/* Dữ liệu gốc: tệp rơi đồ cấp ≥ 119 có MoneyScale 800, gấp 16 lần các tệp khác (50), vì bản gốc bù bằng MoneyRate 1% (so với 4-10%).
   Bản idle luôn rơi tiền nên bỏ qua MoneyRate. Nội suy MoneyScale từ cấp 100 đến 130 để tránh cú nhảy vàng; các phí có thể dùng
   goldRateScale / goldCostScale bên dưới để giữ giá trị tương đối khi thu nhập tăng. */
const MONEY_BASE = 50, MONEY_TOP = Math.max(MONEY_BASE, ...Object.values(J.drop).map(f => (f.main && f.main.MoneyScale) || MONEY_BASE)), MONEY_RAMP = [100, 130];
function moneyScale(L, file) {
  if (MONEY_TOP <= MONEY_BASE) return (file.main.MoneyScale || MONEY_BASE);
  return MONEY_BASE * Math.pow(MONEY_TOP / MONEY_BASE, clamp((L - MONEY_RAMP[0]) / (MONEY_RAMP[1] - MONEY_RAMP[0]), 0, 1));   // nội suy nhân (gấp 16 lần nên dùng mũ, không dùng tuyến tính)
}
function moneyDrop(e) {
  const L = e.L;
  return Math.round(moneyScale(L, dropFile(L)) / 10 * L * rnd(0.6, 1.4) * (e.cls === 'boss' ? 8 : e.cls === 'elite' ? 2 : 1));
}
// Các khoản phí phải theo kịp lượng vàng rơi, nhất là khi MoneyScale tăng từ 50 lên 800 ở cấp cao.
const goldRateScale = (L = S.lvl) => moneyScale(L, dropFile(L)) / MONEY_BASE;
const goldCostScale = (L = S.lvl) => Math.max(1, L / 100) * goldRateScale(L);
const itemValue = it => Math.round((it.price || 100) / 10 * (1 + it.mag.length * 0.8));
function itemPower(it) {
  let v = it.lvl * 10;
  for (const [id, mn, mx] of it.base) if (id === 28 || id === 29 || id === 30) v += (mn + mx) / 2;
  for (const m of it.mag) v += 15 + Math.abs(m.p[0]) * 0.6;
  return v * enhMul(it);
}
function slotFor(it) {
  const s = DETAIL_SLOT[it.d];
  if (s === 'ring') return !S.eq.ring1 ? 'ring1' : !S.eq.ring2 ? 'ring2' : (itemPower(S.eq.ring1) <= itemPower(S.eq.ring2) ? 'ring1' : 'ring2');
  return s;
}
/* QA-044: thuoc tinh CO trong du lieu JX nhung KHONG co co che trong ban idle
   (do ben / khong the pha huy / the luc / gia tri PK / hoi phuc khi bi danh).
   Phai ghi ro ngay tren dong, neu khong nguoi choi tin vao chi so khong co that. */
const IDLE_INERT = ['indestructible_b', 'indestructible_v', 'durability_v', 'durability_p', 'not_add_pkvalue_p',
  'pk_punish_weaken', 'pk_punish_enhance', 'stamina_v', 'staminamax_v', 'staminamax_p', 'staminareplenish_v',
  'stealstamina_p', 'stealstaminaenhance_p', 'fasthitrecover_v', 'anti_hitrecover',
  // audit 03/10/2026: dong co trong du lieu nhung quai idle khong co co che tuong ung (khong chan, khong day lui, khong co tam nhin...)
  'visionradius_p', 'knockback_p', 'anti_stuntimereduce_p', 'anti_maxres_p', 'anti_sorbdamage_p', 'anti_block_rate', 'anti_do_stun_p', 'anti_do_hurt_p',
  'addphysicsmagic_v', 'addcoldmagic_v', 'addfiremagic_v', 'addlightingmagic_v', 'addpoisonmagic_v'];
/* Dong "chong trang thai" va dong khac duoc quy doi sang co che idle (stats.js calc): ghi ro tren dong de nguoi choi biet no lam gi */
const IDLE_MAPPED = { poisontimereduce_p: ' — bản idle: giảm sát thương Độc nhận vào bằng nửa tỉ lệ (tối đa 50%)', freezetimereduce_p: ' — bản idle: giảm sát thương Băng nhận vào bằng nửa tỉ lệ (tối đa 50%)',
  stuntimereduce_p: ' — bản idle: giảm sát thương Lôi nhận vào bằng nửa tỉ lệ (tối đa 50%)', damage2addmana_p: ' — hồi nội lực bằng tỉ lệ này của sát thương nhận vào',
  expenhance_p: ' — cộng tỉ lệ này vào thưởng kinh nghiệm hạ quái', rangedamagereturn_p: ' — phản lại tỉ lệ này của sát thương nhận từ quái tầm xa' };
const inertNote = nm => IDLE_INERT.includes(nm) ? ' — không tác dụng ở bản idle' : (IDLE_MAPPED[nm] || '');
/* Dieu kien mo dong an thu j (0, 1, 2 = dong 2, 4, 6): can (j + 1) nguon tuong sinh - nhan vat hoac mon o 2 o lien ket co he SINH ra he cua mon nay */
function hiddenHint(it, j) {
  if (typeof ACCRUE === 'undefined' || it.s == null || it.s < 0) return '';
  const src = Object.keys(ACCRUE).map(Number).find(k => ACCRUE[k] === it.s);       // he sinh ra he cua mon
  if (src === undefined) return '';
  const slot = (typeof slotOfEquipped === 'function' && slotOfEquipped(it, S.eq)) || slotFor(it);
  const links = (ACTIVATED_BY[slot] || []).map(k => SLOT_VI[k]).join(' / ');
  return `: cần ${j + 1} nguồn hệ ${SERIES[src]} (${SERIES[src]} sinh ${SERIES[it.s]}) — nhân vật${links ? ' hoặc món ở ' + links : ''}; đủ bộ cũng mở`;
}
function itemAttrTone(name) {
  const key = String(name || '').toLowerCase();
  const sourceTone = (J.attrDesc[key] || '').match(/<color=(blue|orange)>/i);
  if (sourceTone) return sourceTone[1].toLowerCase() === 'blue' ? 'tone-blue' : 'tone-gold';
  if (/(lifemax|lifereplenish|manamax|manareplenish|stamina|maxres|res|armor|defense|block|shield|potion|heal|recovery|dodge|avoid|damagereduce)/.test(key)) return 'tone-green';
  if (/(damage|attack|skill|strike|hit|accuracy|enhance|ignoredefense)/.test(key)) return 'tone-blue';
  return 'tone-gold';
}
function itemLines(it) {
  const L = [], dmin = it.base.find(b => b[0] === 28), dmax = it.base.find(b => b[0] === 29), k = enhMul(it);
  if (it.plv) L.push(['h on', `Bạch Kim +${it.plv}: thuộc tính gốc +${Math.round(it.plv * PLAT_STEP * 100)}%`]);
  if (it.enh) L.push(['h on', `Cường hóa +${it.enh}: thuộc tính gốc +${Math.round((k - 1) * 100)}%`]);
  if (dmin) L.push(['b', `Sát thương: ${Math.round(dmin[1] * k)} - ${Math.round((dmax ? dmax[1] : dmin[1]) * k)}`]);
  for (const [id, mn, mx] of it.base) {
    const nm = attrName(id); if (id === 28 || id === 29 || nm === 'durability_v' || nm === 'item_purple') continue;
    L.push(['b', attrText(nm, [Math.round((mn + mx) / 2 * k), 0, Math.round(mx * k)]) + inertNote(nm)]);
  }
  const act = typeof hiddenActive === 'function' ? hiddenActive(it) : 0;
  it.mag.forEach((m, i) => {
    const hidden = i % 2 === 1, on = !hidden || Math.floor(i / 2) < act;
    const name = attrName(m.a), tone = itemAttrTone(name);
    L.push([hidden ? (on ? `h on ${tone}` : 'h') : `m ${tone}`, attrText(name, m.p.map(v => v === -1 ? 0 : v)) + (hidden && !on ? ' (ẩn' + hiddenHint(it, Math.floor(i / 2)) + ')' : '') + inertNote(name)]);
  });
  if (it.set) {
    const ex = typeof goldEnhance === 'function' ? goldEnhance(it, S.eq) : 0, cnt = typeof setCounts === 'function' ? (setCounts(S.eq)[it.set.grp] || 0) : 0;
    (it.ext || []).forEach((m, i) => {
      const name = attrName(m.a), tone = itemAttrTone(name);
      L.push([i < ex ? `h on ${tone}` : 'h', attrText(name, m.p.map(v => v === -1 ? 0 : v)) + (i < ex ? ' (bộ)' : ` (mặc ${Math.min(it.set.n1 * (i + 1), it.set.n2)} món cùng bộ)`) + inertNote(name)]);
    });
    if (it.set.n2 >= 99) L.push(['r', `Đồ ${it.set.kind === 'gold' ? 'Hoàng Kim' : 'Bạch Kim'} đơn lẻ: không có thưởng bộ (6 dòng cố định luôn hiệu lực)`]);
    else {
      L.push(['r', `Bộ ${it.set.kind === 'gold' ? 'Hoàng Kim' : 'Bạch Kim'}: đang mặc ${cnt} món · đủ ${it.set.n2} món mở hết dòng ẩn mọi trang bị`]);
      const shownMembers = new Set();
      for (const r of setMembers(it).filter(r => /^\[/.test(r.n) === /^\[/.test(it.n))) {
        const memberKey = r.n.replace(/\s+/g, ' ').trim();
        if (shownMembers.has(memberKey)) continue;
        shownMembers.add(memberKey);
        const worn = Object.values(S.eq).some(e => e && e.set && e.n === r.n);
        L.push([worn ? 'set-active' : 'r', `${worn ? '' : '· '}${r.n}`]);
      }
    }
  }
  const REQ = { 36: 'Cấp', 32: 'Sức mạnh', 33: 'Thân pháp', 34: 'Sinh khí', 35: 'Nội công', 37: 'Hệ', 38: 'Giới tính', 39: 'Môn phái' };
  for (const [id, v] of it.req) if (REQ[id] && (v > 0 || id === 39)) L.push(['r', `Yêu cầu ${REQ[id]}: ${id === 37 ? SERIES[v] : id === 39 ? ((J.factions[v] || {}).n || v) : v}`]);
  for (const s of goiY(it)) L.push(['r', s]);
  return L;
}
/* C: GOI Y TAN DUNG — luon kem ti le %, hien ngay trong o chu thich trang bi (yeu cau nguoi dung).
   Dung typeof de khong phu thuoc thu tu nap file (recipes.js / forge.js nap sau loot.js). */
function goiY(it) {
  const out = [];
  if (!it) return out;
  const n = (it.mag || []).length;
  if (typeof enchaseCheck === 'function' && typeof mats === 'function' && typeof oreParse === 'function' && typeof VIO_SLOTS === 'number') {
    if (n >= VIO_SLOTS) out.push('Khảm: đã đủ 6 dòng — không khảm thêm được');
    else {
      const hts = Object.keys(mats().ht).map(Number).sort((a, b) => a - b);
      const ores = Object.keys(mats().ore).filter(k => oreParse(k).place === n);
      if (hts.length && ores.length) {
        const row = enchaseCheck(it, hts[0], ores[0]);
        out.push(typeof row === 'string'
          ? `Khảm dòng ${n + 1}/6: ${row}`
          : `Khảm dòng ${n + 1}/6: Huyền Tinh cấp ${hts[0]} + ${oreLabel(ores[0])} · thất bại 5% mất đá`);
      } else out.push(`Khảm dòng ${n + 1}/6: cần Huyền Tinh cấp bất kỳ + khoáng thạch dòng ${n + 1}`);
    }
  }
  if (typeof canFuse === 'function' && canFuse(it)) {
    const dv = (typeof RCP_R !== 'undefined' && RCP_R.violet_fuse.level_div) || [10, 5];
    const s = (it.lvl || 1) * 3;
    out.push(`Hợp Huyền Tinh: món này + 2 nhẫn/dây chuyền/ngọc bội → Huyền Tinh cấp ~${Math.max(1, Math.floor(s / dv[0]))}–${Math.max(1, Math.floor(s / dv[1]))} · phí ${fmt(typeof fuseCost === 'function' ? fuseCost() : 1000)} lượng`);
  }
  if (typeof canPlatBase === 'function' && canPlatBase(it)) out.push('Chế Bạch Kim: cần 2 món Hoàng Kim GIỐNG NHAU + Thủy Tinh Trắng');
  if (typeof RF_MUC !== 'undefined') out.push(`Rèn ngẫu nhiên ở Lò rèn: mức Khá có ${Math.round(RF_MUC[1].ty * 100)}% thành công (3–4 dòng), trả bằng vàng`);
  return out;
}

/* ======================= DO ROI TREN DAT + BO LOC ======================= */
const GROUND_MAX = 40, PICK_R = 26, GROUND_LIFETIME = 120;
const LOOT_ATTR_GROUPS = [ // thuoc tinh hay loc (ten trong KMagicDesc.cpp)
  ['Sinh lực', ['lifemax_v', 'lifemax_p', 'lifereplenish_v']], ['Nội lực', ['manamax_v', 'manamax_p', 'manareplenish_v']],
  ['Sát thương', ['skill_enhance', 'enhancehit_rate', 'addphysicsdamage_v', 'addphysicsdamage_p', 'addfiredamage_v', 'addcolddamage_v', 'addlightingdamage_v', 'addpoisondamage_v']],
  ['Kháng', ['sorbdamage_p', 'block_rate', 'physicsres_p', 'poisonres_p', 'coldres_p', 'fireres_p', 'lightingres_p', 'allres_p']],
  ['Chỉ số', ['strength_v', 'dexterity_v', 'vitality_v', 'energy_v']], ['Kỹ năng', ['allskill_v', 'addphysicsmagic_v', 'addcoldmagic_v', 'addfiremagic_v', 'addlightingmagic_v', 'addpoisonmagic_v']],
  ['Tốc độ', ['attackspeed_v', 'castspeed_v', 'fastwalkrun_p']], ['Hút máu / nội', ['steallifeenhance_p', 'stealmanaenhance_p']],
  ['Chính xác / né', ['attackratingenhance_v', 'adddefense_v']], ['Ngũ hành', ['metalskill_v', 'woodskill_v', 'waterskill_v', 'fireskill_v', 'earthskill_v']],
];
function lootFilter() { return S.lootF || (S.lootF = { minRar: 1, minLvl: 1, groups: [], series: [], auto: true, equipment: true, materials: true, white: false, skipLowSets: true }); }
function isLowSetForAutoLoot(it) {
  if (lootFilter().skipLowSets === false || !it.set || !['gold', 'platina'].includes(it.set.kind)) return false;
  const required = (it.req || []).find(([id]) => id === 36);
  return (required ? required[1] : 0) < S.lvl;
}
function lootMatch(it) {
  const f = lootFilter();
  if (f.equipment === false || (it.r === 0 ? f.white !== true : it.r < f.minRar) || it.lvl < f.minLvl) return false;
  if (isLowSetForAutoLoot(it)) return false;
  if (f.series.length && !f.series.includes(it.s)) return false;
  if (f.groups.length) {
    const want = new Set(f.groups.flatMap(g => (LOOT_ATTR_GROUPS[g] || [0, []])[1]));
    if (!it.mag.some(m => want.has(canonAttr(attrName(m.a))))) return false;
  }
  return true;
}
function dropToGround(it, at) {
  const a = rnd(0, Math.PI * 2), d = rnd(10, 26);
  const [x, y] = inWorld(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d);
  R.ground.push({ it, x, y, age: 0 });
  if (typeof jrAdd === 'function') jrAdd(it.set ? 'set' : it.vio || it.r >= 3 ? 'r3' : it.r === 2 ? 'r2' : 'other', 1);
  if (R.ground.length > GROUND_MAX) {
    let i = R.ground.findIndex(d => !itemProtected(d.it));
    if (i < 0) i = R.ground.findIndex(d => !d.it.locked && !(d.it.enh > 0));
    if (i >= 0) { const old = R.ground.splice(i, 1)[0]; S.gold += itemValue(old.it); }
  }
  if (!R.quiet) uiSfx(it.d <= 1 ? 'dropWeapon' : it.d === 2 || it.d === 7 ? 'dropCloth' : 'dropOther');
    if (it.r >= 2 && !R.quiet) log(`Rơi xuống đất: <span style="color:${RAR_COL[it.r]}">${esc(it.n)}</span>`);
}
/* Hanh trang day: tu ban mon kem nhat (khong phai do bo) neu mon moi tot hon -> treo may lau van thay do moi
   (truoc day tui day la ngung nhat, do tot nam duoi dat roi bi tu ban, nhan vat khong bao gio len do) */
function makeRoom(it, force) {
  let worst = null;
  // khong bo mon Tim dang kham do (vio) va Bach Kim da thang cap (plv) khi nhet do moi; mon trang goc van co the bi bo (kham ngay sau khi mua)
  for (const x of S.inv) if (!itemProtected(x) && (!worst || itemPower(x) < itemPower(worst))) worst = x;
  if (!worst || (!force && itemPower(worst) >= itemPower(it))) return false;
  S.gold += itemValue(worst); S.inv.splice(S.inv.indexOf(worst), 1); invDirty = true;
  return true;
}
function pickUp(drop, quiet) {
  const i = R.ground.indexOf(drop); if (i < 0) return false;
  if (invUsed() >= invMax() && !makeRoom(drop.it)) { if (!quiet) toast('Hành trang đầy'); return false; }
  R.ground.splice(i, 1);
  addItem(drop.it, quiet, true, R.pickTarget === drop); questTick('picked');   // cham tay chon nhat: giu, khong coi la do thua
  if (R.pickTarget === drop) R.pickTarget = null;
  return true;
}
/* Nhat mon dang chon hoac mon gan nhat khop bo loc, ke ca khi bai van con quai.
   Di chuyen thu cong chi tu nhat mon sat nguoi, khong tu doi huong di. */
function updateGround(dt) {
  for (const d of R.ground) d.age += dt;
  R.ground = R.ground.filter(d => d.age < GROUND_LIFETIME || (d.it && (d.it.locked || d.it.enh > 0)));
  if (R.pickTarget && !R.ground.includes(R.pickTarget)) R.pickTarget = null;
  let target = R.pickTarget;
  if (!target && lootFilter().auto) {
    let best = null, bd = 1e9;
    const walk = !(typeof manual === 'function' && manual());
    const full = invUsed() >= invMax();
    const floor = full ? Math.min(...S.inv.filter(x => !itemProtected(x)).map(itemPower), Infinity) : -Infinity;
    for (const d of R.ground) {
      if (d.age < 0.4 || !lootMatch(d.it) || (full && itemPower(d.it) <= floor)) continue;
      const k = Math.hypot(d.x - H.x, d.y - H.y);
      if (k > PICK_R && !walk) continue;
      if (k < bd) { bd = k; best = d; }
    }
    target = best;
  }
  if (!target) return false;
  const dist = Math.hypot(target.x - H.x, target.y - H.y);
  if (dist <= PICK_R) return pickUp(target, true);
  obsSteer(H, target.x, target.y, 170 * (R.P ? R.P.speed : 1) * dt); H.face = target.x >= H.x ? 1 : -1;
  return true;
}
function groundAt(x, y) {
  let best = null, bd = 30;
  for (const d of R.ground) { const k = Math.hypot(d.x - x, d.y - (y + 6)); if (k < bd) { bd = k; best = d; } }
  return best;
}
function saveGround() { S.ground = R.ground.map(d => ({ it: d.it, wx: d.x, wy: d.y })); }
function restoreGround() { R.ground = (S.ground || []).filter(g => g && g.it).map(g => { const [x, y] = inWorld(g.wx ?? WORLD.w / 2, g.wy ?? WORLD.h / 2); return { it: g.it, x, y, age: 1 }; }); }
