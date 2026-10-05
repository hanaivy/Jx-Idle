/* ======================= CHI SO NHAN VAT (theo KPlayer.cpp / level_add.txt) ======================= */
'use strict';
/* Cong don thuoc tinh ma thuat: A[ten] = [p1, p2, p3] */
function addAttr(A, name, p, mult = 1) {
  const a = A[name] || (A[name] = [0, 0, 0]);
  for (let i = 0; i < 3; i++) a[i] += (p[i] || 0) * mult;
}
const av = (A, n, i = 0) => (A[n] ? A[n][i] : 0);

/* ---------- Ngu hanh trang bi (KItemList::GetEquipEnhance) ----------
   Dong an thu k (dong 2, 4, 6) cua mot mon mo khi so "tuong sinh" >= k: +1 neu he nhan vat sinh he mon do,
   +1 cho moi mon o 2 o lien ket (ms_ActivedEquip) co he sinh he mon do. Ngua luon mo du. */
const ACCRUE = { 0: 2, 2: 1, 1: 3, 3: 4, 4: 0 }; // Kim sinh Thuy, Thuy sinh Moc, Moc sinh Hoa, Hoa sinh Tho, Tho sinh Kim
const accrues = (a, b) => a >= 0 && b >= 0 && ACCRUE[a] === b;
const ACTIVATED_BY = { helm: ['armor', 'amulet'], armor: ['ring2', 'belt'], belt: ['pendant', 'cuff'], weapon: ['amulet', 'armor'],
  boot: ['weapon', 'helm'], cuff: ['boot', 'ring1'], amulet: ['belt', 'ring2'], ring1: ['weapon', 'helm'], ring2: ['cuff', 'pendant'],
  pendant: ['boot', 'ring1'] };
function slotOfEquipped(it, eq) { for (const k in eq) if (eq[k] === it) return k; return null; }
function hiddenActive(it, eq = S.eq) {
  if (it.leg || it.set) return 3;                       // do bo: 6 dong co dinh luon hieu luc
  if (enoughToActive(eq)) return 3;                     // IsEnoughToActive: du bo -> mo het dong an
  const slot = slotOfEquipped(it, eq);
  if (!slot) return 0;
  if (slot === 'horse') return 3;
  let n = accrues(heroSeries(), it.s) ? 1 : 0;
  for (const k of ACTIVATED_BY[slot] || []) if (eq[k] && accrues(eq[k].s, it.s)) n++;
  return n;
}
function heroStart() { const f = FAC[S.fac]; return J.start[f.series * 2 + (S.sex || 0)] || J.start[0]; }
function heroSeries() { return FAC[S.fac] ? FAC[S.fac].series : 0; }
function weaponCode(eq) {
  const w = eq.weapon; if (!w) return 9;               // 9 = tay khong (Quyen/Chuong phap)
  // ma loai vu khi cua mon vu khi phai (tham so 3 cua addphysicsdamage_p): 0 kiem, 1 dao, 2 con, 3 thuong, 4 chuy,
  // 5 song dao / thich, 7 am khi, 9 tay khong / trien thu
  return w.d === 1 ? 7 : w.k === 6 ? 9 : w.k;
}
const WEAPON_VI = { 0: 'Kiếm', 1: 'Đao', 2: 'Côn', 3: 'Thương', 4: 'Chùy', 5: 'Song đao', 7: 'Ám khí', 9: 'Tay không' };
const TIANWANG_SKILLS = new Set((FAC.tianwang && FAC.tianwang.skills) || []);
const SHAOLIN_SKILLS = new Set((FAC.shaolin && FAC.shaolin.skills) || []);
const SKILL_BOOK_NAME = { bk90: 'Võ Lâm Mật Tịch 90' };
for (const id of [318, 319, 321]) if (SK[id]) { SK[id].book = 'bk90'; SK[id].tier = 90; }
function skillBookOk(s) {
  if (!s || !s.book || (S.sk[s.id] || 0) > 0 || (S.bkOk && S.bkOk[s.id])) return true;
  if ((typeof rebornN === 'function' && rebornN() > 0) || (S.rw && S.rw.stat && S.rw.stat.reborn > 0)) return true;
  return typeof matHave === 'function' && matHave('misc', s.book) > 0;
}
function skillBookHint(s) {
  if (!s || !s.book || skillBookOk(s)) return '';
  return `Cần ${SKILL_BOOK_NAME[s.book] || 'Mật Tịch'} (có ${matHave('misc', s.book)})`;
}
function skillBookUse(id) {
  const s = SK[id]; if (!s || !s.book || (S.sk[id] || 0) > 0 || (S.bkOk && S.bkOk[id])) return true;
  if ((typeof rebornN === 'function' && rebornN() > 0) || (S.rw && S.rw.stat && S.rw.stat.reborn > 0)) return true;
  if (matHave('misc', s.book) < 1) return false;
  matAdd('misc', s.book, -1); (S.bkOk || (S.bkOk = {}))[id] = 1;
  log(`📖 Lĩnh ngộ <b style="color:#ffd24a">${esc(s.n)}</b> (dùng 1 ${SKILL_BOOK_NAME[s.book] || 'Mật Tịch'})`);
  return true;
}
function skillLearnPoint(id, count = 1) {
  const s = SK[id]; count = Math.max(1, Math.floor(count));
  if (!s || S.skPts < count || S.lvl < s.req || (S.sk[id] || 0) + count > s.max || !skillBookOk(s) || !skillBookUse(id)) return false;
  S.skPts -= count; S.sk[id] = (S.sk[id] || 0) + count; return true;
}
function skillWeaponOk(s, eq = S.eq) {
  if (!s || (!TIANWANG_SKILLS.has(s.id) && !SHAOLIN_SKILLS.has(s.id))) return true;
  const need = Number(s && s.eqt);
  return !(need >= 0 && need <= 5) || weaponCode(eq) === need;
}
function skillWeaponHint(s, eq = S.eq) {
  return skillWeaponOk(s, eq) ? '' : `Cần trang bị ${WEAPON_VI[s.eqt] || 'đúng loại vũ khí'}`;
}
function skillLv(id) { const L = S.sk[id] || 0, P = R.P || {}; return L ? L + (P.plusSkill || 0) + ((P.skAdd && P.skAdd[id]) || 0) : 0; }
/* Ky nang bi dong: mon vu khi (chi tinh khi dung dung loai vu khi), noi cong, hao quang... */
function passiveApplies(s, name, p, wc) {
  if (name === 'addphysicsdamage_p' || name === 'attackratingenhance_p' || name === 'deadlystrikeenhance_p') {
    const need = s.attr.addphysicsdamage_p ? skVal(s, 'addphysicsdamage_p', 1)[2] : -1;
    if ([0, 1, 2, 3, 4, 5, 7, 9].includes(need)) return wc === need;
  }
  return true;
}
const SKIP_PASSIVE = /^(skill_|missle_|addskilldamage)/;

/* Mot so dong trang bi co bien the Duong trong du lieu JX. Game idle khong tach am/duong khi tinh chien dau,
   nen cong cac dong nay vao chi so tuong ung de chu ngua / do bo khong bi mat chi so. */
const EQUIP_ATTR_ALIAS = {
  lifemax_yan_v: 'lifemax_v', lifemax_yan_p: 'lifemax_p',
  manamax_yan_v: 'manamax_v', manamax_yan_p: 'manamax_p',
  allres_yan_p: 'allres_p', physicsres_yan_p: 'physicsres_p', poisonres_yan_p: 'poisonres_p',
  coldres_yan_p: 'coldres_p', fireres_yan_p: 'fireres_p', lightingres_yan_p: 'lightingres_p',
  attackspeed_yan_v: 'attackspeed_v', castspeed_yan_v: 'castspeed_v', fastwalkrun_yan_p: 'fastwalkrun_p',
};

let IGNORE_REQ = null;                                   // equipCompare: CHI mon dang xem duoc tinh thu du chua du dieu kien (cac mon dang mac van xet dieu kien nhu that)
const reqPass = it => it === IGNORE_REQ || reqOk(it);
function calc(eq) {
  eq = eq || S.eq;
  const A = {}, lv = S.lvl, ser = heroSeries(), add = J.levelAdd[ser], st = heroStart();
  const skAdd = {};                                        // allskill_v co tham so 3 = id ky nang: +cap cho rieng ky nang do
  const addItemAttr = (m) => {
    const name = attrName(m.a), p = m.p.map(v => v === -1 ? 0 : v);
    if (name === 'allskill_v' && p[2] > 0) { skAdd[p[2]] = (skAdd[p[2]] || 0) + p[0]; return; }
    addAttr(A, name, p);
    if (EQUIP_ATTR_ALIAS[name]) addAttr(A, EQUIP_ATTR_ALIAS[name], p);
  };
  // trang bi: thuoc tinh goc + thuoc tinh ma thuat (bo qua mon chua du dieu kien)
  for (const k in eq) {
    const it = eq[k]; if (!it || !reqPass(it)) continue;
    const em = enhMul(it);                                 // cuong hoa (forge.js): nhan thuoc tinh goc
    for (const [id, mn, mx] of it.base) addItemAttr({ a: id, p: [(id === 28 || id === 29 ? mn : (mn + mx) / 2) * em, 0, 0] });
    const act = hiddenActive(it, eq);
    (it.mag || []).forEach((m, i) => { if (i % 2 === 0 || Math.floor(i / 2) < act) addItemAttr(m); });
    if (it.set) { const ex = goldEnhance(it, eq); (it.ext || []).slice(0, ex).forEach(addItemAttr); }
  }
  // ky nang bi dong
  const wc = weaponCode(eq), plus = av(A, 'allskill_v');
  const P = { A, plusSkill: plus, skAdd };
  const lvOf = id => S.sk[id] + plus + (skAdd[id] || 0);
  for (const id in S.sk) {
    const s = SK[id]; if (!s || !S.sk[id] || isAttack(s)) continue;
    if (!skApplies(s)) continue;
    const L = lvOf(id);
    for (const name in s.attr) {
      if (SKIP_PASSIVE.test(name)) continue;
      const p = skVal(s, name, L);
      if (p && passiveApplies(s, name, p, wc)) addAttr(A, name, p);
    }
  }
  titleAttr(A);                                            // danh hieu dang deo (rewards.js)
  P.rebDmg = 1 + rebornBonus().dmg;                        // chuyen sinh: +10% sat thuong moi lan
  const tp = typeof tpStacks === 'function' ? tpStacks() : { ho: 0, bao: 0, tru: 0 };
  const gb = typeof guildBuff === 'function' ? guildBuff() : { xp: 0, life: 0, dmg: 0, lucky: 0 };
  P.dmgMul = P.rebDmg * facNorm(S.fac, lv) * (1 + gb.dmg / 100);                // + can bang theo phai / cap (FAC_DMG_NORM)
  // thuoc tinh co ban: diem goc cua he + diem phan phoi + trang bi
  P.str = st.str + S.attr.str + av(A, 'strength_v');
  P.dex = st.dex + S.attr.dex + av(A, 'dexterity_v');
  P.vit = st.vit + S.attr.vit + av(A, 'vitality_v');
  P.eng = st.eng + S.attr.eng + av(A, 'energy_v');
  P.series = ser;
  // sinh luc / noi luc: goc + cap * X/cap + diem * X/diem (KPlayer::SetBaseLifeMax)
  P.life = (st.life + (lv - 1) * (add.LifePerLevel + IDLE_LIFE_PER_LEVEL) + (P.vit - st.vit) * add.LifePerVitality + av(A, 'lifemax_v')) * (1 + av(A, 'lifemax_p') / 100);
  P.mana = (st.mana + (lv - 1) * add.ManaPerLevel + (P.eng - st.eng) * add.ManaPerEnergy + av(A, 'manamax_v')) * (1 + av(A, 'manamax_p') / 100);
  P.life = Math.max(50, P.life) * (1 + gb.life / 100 + tp.ho * 0.06); P.mana = Math.max(20, P.mana);
  P.stamina = av(A, 'staminamax_v'); P.staminaRegen = av(A, 'staminareplenish_v');
  P.regen = 1 + lv * 0.08 + av(A, 'lifereplenish_v') + P.life * av(A, 'lifereplenish_p') / 10000;
  P.manaRegen = 1 + lv * 0.05 + av(A, 'manareplenish_v') + P.eng * 0.02;
  // chinh xac / ne tranh (KPlayer::SetNpcAttackRating / SetNpcDefence)
  P.ar = Math.max(10, (P.dex * 4 - 28 + av(A, 'attackrating_v') + av(A, 'attackratingenhance_v')) * (1 + (av(A, 'attackratingenhance_p') + av(A, 'attackrating_p')) / 100));
  P.def = Math.max(0, P.dex / 4 + av(A, 'adddefense_v') + av(A, 'armordefense_v') * 0.25) * (1 + av(A, 'armordefenseenhance_p') / 100);
  // khang: goc theo he (level_add) + trang bi / ky nang, gioi han 75 (+ allresmax)
  const baseRes = { phys: add.physicres, poison: add.poisonres, cold: add.coldres, fire: add.fireres, light: add.lightingres };
  P.res = {};
  for (const e of ELEM) P.res[e] = clamp(baseRes[e] + av(A, ELEM_RES[e]) + av(A, 'allres_p'), -100, PLAYER_RES_MAX + av(A, 'allresmax_p'));
  // vu khi: sat thuong goc + Suc manh/5 (can chien) hoac Than phap/5 (am khi)
  const w = eq.weapon && reqPass(eq.weapon) ? eq.weapon : null;
  const ranged = !!(w && w.d === 1);
  const wmin = av(A, 'weapondamagemin_v') || 1, wmax = av(A, 'weapondamagemax_v') || 2;
  const bonus = ranged ? P.dex / DEX_PER_DMG : P.str / STR_PER_DMG;
  P.wmin = wmin + bonus + av(A, 'addphysicsdamage_v'); P.wmax = wmax + bonus + av(A, 'addphysicsdamage_v');
  P.physPct = av(A, 'addphysicsdamage_p') + av(A, 'weapondamageenhance_p');
  // Can bang game idle: chieu noi cong manh len theo BAC vu khi dang cam (sat thuong goc vu khi / vu khi cung loai bac 1),
  // giong chieu ngoai cong nhan sat thuong vu khi; khong xet yeu cau Suc manh cua vu khi. Neu khong, cac phai noi cong
  // khong duoc gi tu do roi va bi bo xa khi choi dai (docs/DANH_GIA.md)
  P.spellW = weaponTierMul(eq.weapon);
  // am khi: Than phap da tang chinh xac (x4) va ne (/4) -> chi +0.5% sat thuong moi diem (Suc manh can chien: +1%)
  P.physStat = 1 + (ranged ? P.dex * DEX_PCT_RANGED : P.str) / STR_PER_PCT / 100;
  P.add = {}; for (const e of ELEM) if (e !== 'phys') P.add[e] = av(A, ELEM_ADD[e]);
  P.enh = {}; for (const e in ELEM_ENH) P.enh[e] = av(A, ELEM_ENH[e]);
  P.crit = clamp(av(A, 'deadlystrikeenhance_p') + av(A, 'deadlystrike_p') + av(A, 'enhancehit_rate'), 0, 75);
  P.aspd = P.aspdPhys = clamp(1 + av(A, 'attackspeed_v') / 100, 0.5, 3);
  P.aspdSpell = clamp(0.9 + av(A, 'castspeed_v') / 100, 0.5, 3);
  P.leech = av(A, 'steallife_p') + av(A, 'steallifeenhance_p');
  P.manaLeech = av(A, 'stealmana_p') + av(A, 'stealmanaenhance_p');
  P.ignoreDef = av(A, 'ignoredefense_p');
  P.retMelee = av(A, 'meleedamagereturn_v'); P.retMeleeP = av(A, 'meleedamagereturn_p');
  P.retRangedP = av(A, 'rangedamagereturn_p');
  P.blockRate = clamp(av(A, 'block_rate') + tp.ho, 0, 100);
  P.block = P.blockRate; P.bossDmg = 1 + tp.tru * 0.06; P.dropMul = 1 + tp.bao * 0.05;
  P.stunChance = clamp(av(A, 'do_stun_p'), 0, 100);
  P.sorbDamage = clamp(av(A, 'sorbdamage_yan_p') + av(A, 'sorbdamage_p'), 0, 90);
  P.absorb = P.sorbDamage / 100;
  P.damage2mana = clamp(av(A, 'damage2addmana_p'), 0, 100);
  P.xpBonus = av(A, 'expenhance_p') + gb.xp;
  P.statusRes = { poison: clamp(av(A, 'poisontimereduce_p') / 2, 0, 50), cold: clamp(av(A, 'freezetimereduce_p') / 2, 0, 50), light: clamp(av(A, 'stuntimereduce_p') / 2, 0, 50) };
  P.skillEnhance = av(A, 'skill_enhance');
  P.resIgnore = {
    phys: av(A, 'anti_allres_yan_p') + av(A, 'anti_physicsres_yan_p'),
    poison: av(A, 'anti_allres_yan_p') + av(A, 'anti_poisonres_yan_p'),
    cold: av(A, 'anti_allres_yan_p') + av(A, 'anti_coldres_yan_p'),
    fire: av(A, 'anti_allres_yan_p') + av(A, 'anti_fireres_yan_p'),
    light: av(A, 'anti_allres_yan_p') + av(A, 'anti_lightingres_yan_p'),
  };
  P.series5 = av(A, 'five_elements_enhance_v'); P.res5 = av(A, 'five_elements_resist_v');
  P.seriesSkill = av(A, ['metalskill_v', 'woodskill_v', 'waterskill_v', 'fireskill_v', 'earthskill_v'][ser]);
  P.lucky = av(A, 'lucky_v') + (typeof blessLucky === 'function' ? blessLucky() : 0) + gb.lucky + tp.bao * 3;
  P.speed = 1 + av(A, 'fastwalkrun_p') / 100;
  P.ranged = ranged;
  // ky nang chu dong + cong don addskilldamageN (tham so 1 = id ky nang duoc tang, tham so 3 = %)
  P.skillBonus = {};
  for (const id in S.sk) {
    const s = SK[id]; if (!s || !S.sk[id]) continue;
    for (const name in s.attr) if (name.startsWith('addskilldamage')) {
      const p = skVal(s, name, lvOf(id)); if (p && p[0]) P.skillBonus[p[0]] = (P.skillBonus[p[0]] || 0) + p[2];
    }
  }
  P.actives = [];
  for (const id in S.sk) {
    const s = SK[id];
    if (S.sk[id] && isAttack(s) && skillWeaponOk(s, eq) && (!isTrapSk(s) || (S.mainLock && +S.main === +id))) P.actives.push(activeInfo(P, s, lvOf(id)));
  }
  P.basic = basicAttack(P);
  // noi luc: chieu ton nhieu hon (hoi noi luc + thuoc tu uong) chi dung duoc mot phan thoi gian, con lai danh thuong
  const income = P.manaRegen + manaPotRate(lv);
  for (const a of P.actives) { const spend = a.cost * a.rate; a.sustain = spend > 0 ? Math.min(1, income / spend) : 1; a.dps = a.dps * a.sustain + P.basic.dps * (1 - a.sustain); }
  // chieu chinh: chieu nguoi choi chon (S.mainLock) hoac chieu co DPS cao nhat, ke ca danh thuong
  const byDps = P.actives.concat([P.basic]).sort((a, b) => b.dps - a.dps);
  P.main = (S.mainLock && P.actives.find(a => a.id === S.main)) || byDps[0];
  return P;
}

/* So muc tieu toi da theo hinh dang dan (SkillDef.h eMisslesForm):
   0 tuong, 1 thang hang, 2 toa, 3 vong tron, 4 ngau nhien, 5 vung, 6 tai muc tieu, 7 quanh nguoi danh, >=8 don can chien */
function skillTargets(s) {
  const n = Math.max(1, s.childN || 1);
  switch (s.form) {
    case 0: return n > 1 ? 3 : 2;
    case 1: return 2;                           // xuyen qua ke dich tren duong thang
    case 2: return Math.min(3, 1 + Math.ceil(n / 3));
    case 3: case 4: case 5: case 6: case 7: return 3;
    default: return 1;                          // chem can chien
  }
}
// Các chiêu đa liên kích của Thiên Vương: sát thương bảng là tổng một lần thi triển.
const SKILL_STRIKES = { 30: 2, 35: 3, 41: 4, 323: 5, 325: 3 };
// Đường Môn đặt bẫy trên mặt đất; không tính bẫy như chiêu đánh trực tiếp trừ khi người chơi khóa chọn.
const isTrapSk = s => !!s && /bẫy/i.test(s.d || '');
// Huyền Nhất Vô Tượng: bảng sát thương lôi được dùng ở cấp 16 của Nhân Kiếm Hợp Nhất.
const XUANYI_TAB = Array.from({ length: 20 }, (_, i) => [4 + 7 * (i + 1), 0, 296 + 59 * (i + 1)]);
/* Đòn kỹ năng phụ cấp 11 theo sự kiện skill_flyevent / skill_collideevent. */
const SKILL_EVENT_BONUS = {
  357: { n: 'Long Chiến Vu Dã', k: 1, el: 'fire', max: 2 },
  302: { n: 'Truy Tinh Trục Điện', k: 0.15, el: 'poison', max: 8 },
  // Thiên Ngoại Lưu Tinh gọi Nghiệp Hỏa Phần Thành (m170) từ cấp 11: 30% cơ hội, tối đa 3 mục tiêu.
  362: { n: 'Nghiệp Hỏa Phần Thành', k: 1, el: 'fire', chance: 0.3, max: 3 },
  339: { n: 'Ngân Đao Xạ Nguyệt', k: 0.8, el: 'phys', max: 3 },
  336: { n: 'Băng Tâm Tuyết Liên', k: 0.25, el: 'cold', max: 3 },
  337: { n: 'Phong Tuyết Băng Thiên', k: 0.35, el: 'cold', max: 3 },
  328: { n: 'Ngọc Tuyền Tẩy Trần', k: 0.35, el: 'phys', max: 3 },
  380: { n: 'Kim Đỉnh Phật Quang', k: 0.35, el: 'cold', max: 4, rays: L => clamp(1 + Math.floor((L - 11) / 3), 1, 4) },
  372: { n: 'Khiếu Phong Tam Liên Kích', k: 0.35, el: 'light', max: 3 },
  375: { n: 'Bình Địa Hám Lôi', k: 0.35, el: 'light', max: 3 },
  368: { n: 'Thái Cực Kiếm Ý', k: 0, el: 'light', max: 3, stun: 30,
    at16: { n: 'Huyền Nhất Vô Tượng', el: 'light', max: 3, tab: { lightingdamage_v: XUANYI_TAB } } },
};
const skillEventLevel = s => {
  if (!s || !SKILL_EVENT_BONUS[s.id]) return 0;
  let min = 0;
  for (const name of ['skill_startevent', 'skill_collideevent', 'skill_flyevent', 'skill_vanishedevent']) {
    const values = s.attr && s.attr[name]; if (!values) continue;
    const i = values.findIndex(v => Array.isArray(v) && v[0] === 1);
    if (i >= 0) min = min ? Math.min(min, i + 1) : i + 1;
  }
  return min;
};
const skillEventAtLevel = a => {
  const event = a && SKILL_EVENT_BONUS[a.id];
  return event && event.at16 && a.L >= 16 ? Object.assign({}, event, event.at16, { stun: event.stun }) : event;
};
function skillEventParts(P, a, event) {
  if (event.tab) {
    const source = Object.assign({}, SK[a.id], { phys: 0, aura: 0, attr: event.tab });
    const p = activeInfo(P, source, Math.min(a.L, 20)).parts || {};
    return { [event.el]: p[event.el] || 0 };
  }
  const parts = {};
  if (event.k > 0) parts[event.el] = a.tot * event.k;
  if (event.poison) parts.poison = (parts.poison || 0) + a.tot * event.poison;
  return parts;
}
function skillEventExpected(P, a) {
  const event = skillEventAtLevel(a); if (!event) return 0;
  const parts = skillEventParts(P, a, event), total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  const ratio = event.tab ? total / Math.max(1, a.tot) : event.k + (event.poison || 0);
  const max = event.rays ? event.rays(a.L) : event.max;
  return ratio * (event.chance || 1) * Math.min(max, 2.2) / expectedHits(a);
}
/* Thong tin mot chieu tan cong: sat thuong trung binh truoc khang, tam, so muc tieu, hao noi luc */
function activeInfo(P, s, L) {
  // norm (bac ky nang) chi nhan vao he so cua chinh chieu: % vu khi va sat thuong nguyen to goc cua chieu,
  // khong nhan vao chi so nhan vat (vu khi, mon vu khi, Suc manh / Noi cong)
  const norm = s.norm || 1;
  const pe = skVal(s, 'physicsenhance_p', L);
  const skillPct = (1 + ((P.skillBonus[s.id] || 0) + P.seriesSkill + (P.skillEnhance || 0)) / 100) * (P.dmgMul || 1);
  const parts = {};
  if (pe) {
    // physicsenhance_p = % cong them vao sat thuong vu khi (Dat Ma Do Giang cap 20: +615% -> x7.15)
    parts.phys = (P.wmin + P.wmax) / 2 * (1 + pe[0] / 100) * norm * (1 + P.physPct / 100) * P.physStat;
    for (const e in P.add) if (P.add[e]) parts[e] = (parts[e] || 0) + P.add[e]; // sat thuong nguyen to cua vu khi di theo don vat ly
  }
  for (const e of ELEM) {
    const v = skVal(s, ELEM_ATTR[e], L); if (!v) continue;
    // doc: [sat thuong moi lan, thoi gian (khung), chu ky (khung)] -> tong = p1 * p2 / p3; con lai: [min, -, max]
    const avg = e === 'poison' ? v[0] * (v[1] || 1) / Math.max(1, v[2] || 1) : v[2] ? (v[0] + v[2]) / 2 : v[0];
    // Can bang game idle: Noi cong tang sat thuong nguyen to cua chieu (ban goc ENGERGY_SET_DAMAGE_VALUE = 0)
    parts[e] = (parts[e] || 0) + avg * norm * (1 + (P.enh[e] || 0) / 100) * (1 + P.eng / ENG_PER_PCT / 100);
  }
  // Can bang game idle: chieu noi cong (khong dung sat thuong vu khi) cong them Noi cong / 4 vao nguyen to chinh,
  // doi xung voi Suc manh / 5 cua don vat ly
  if (!pe) { let main = null, mv = -1; for (const e in parts) if (parts[e] > mv) { mv = parts[e]; main = e; } if (main) parts[main] += P.eng / ENG_PER_DMG;
    for (const e in parts) parts[e] *= P.spellW || 1; }
  let tot = 0; for (const e in parts) { parts[e] *= skillPct; tot += parts[e]; }
  const cast = SKILL_CAST[s.id];
  const rad = cast ? cast.radius : (skVal(s, 'skill_attackradius', L) || [s.radius || 60])[0] || 60;
  const targets = skillTargets(s);
  const cost = (skVal(s, 'skill_cost_v', L) || [0])[0];
  const crit = P.crit + ((skVal(s, 'deadlystrike_p', L) || [0])[0]);
  const series5 = (skVal(s, 'seriesdamage_p', L) || [0])[0];
  const ignore = P.ignoreDef + ((skVal(s, 'ignoredefense_p', L) || [0])[0]);
  const stun = clamp((skVal(s, 'stun_p', L) || [0])[0] + (P.stunChance || 0), 0, 100);
  const rate = s.phys ? (P.aspdPhys || P.aspd) : (P.aspdSpell || P.aspd * 0.9);
  const strikes = SKILL_STRIKES[s.id] || 1;
  const ev = !!skillEventLevel(s) && L >= skillEventLevel(s);
  const info = { id: s.id, n: s.n, L, parts, tot, strikes, ev, rad, melee: cast ? false : rad <= 120, targets, around: !cast && s.form === 7, radial: cast ? cast.radial : 0, rayWidth: cast ? cast.width : 0, missileScale: cast && cast.missileScale, cost, crit, series5, ignore, stun, resIgnore: P.resIgnore,
    series: s.series >= 0 ? s.series : P.series, rate, dps: 0, useAR: s.phys };
  // DPS du kien: so muc tieu trung thuc te + thoi gian danh cua chieu can chien (khong dung so muc tieu danh nghia)
  // doc: ~25% sat thuong mat khi quai chet truoc khi het doc (POISON_EFF) -> tinh vao DPS du kien (chon chieu, luc chien)
  info.dps = (tot - (parts.poison || 0) * (1 - POISON_EFF) + (parts.phys || 0) * crit / 100 * (CRIT_MULT - 1)) * expectedHits(info) * rate * (info.melee ? MELEE_UPTIME : 1);   // chi mang chi nhan doi phan vat ly (giong heroHit)
  if (ev) info.dps *= 1 + skillEventExpected(P, info);
  return info;
}
/* Chuan hoa chinh xac cua nguoi choi vat ly theo muc dung de can bang ky nang:
   can chien toi thieu 75%, am khi toi thieu 90%; do chinh xac cao hon van tang den tran 95%.
   Neu khong, cong thuc AR/Ne tranh thuc te thuong kep o san 40% trong khi bang can bang gia dinh 75/90%. */
function playerHitPercent(ar, def, ignore = 0, ranged = false) {
  return Math.max(ranged ? REF_HIT_RANGED * 100 : REF_HIT * 100, hitPercent(ar, def, ignore));
}
function basicAttack(P) {
  const phys = (P.wmin + P.wmax) / 2 * (1 + P.physPct / 100) * P.physStat;
  const parts = { phys }; for (const e in P.add) if (P.add[e]) parts[e] = P.add[e];
  let tot = 0; for (const e in parts) { parts[e] *= P.dmgMul || 1; tot += parts[e]; }
  return { id: 0, n: 'Đánh thường', L: 1, parts, tot, rad: P.ranged ? 260 : 60, melee: !P.ranged, targets: 1, cost: 0, crit: P.crit, resIgnore: P.resIgnore,
    series5: 0, ignore: P.ignoreDef, stun: 0, series: P.series, rate: P.aspd, dps: tot * P.aspd * (P.ranged ? 1 : MELEE_UPTIME), useAR: 1 };
}

/* Noi luc hoi duoc moi giay tu thuoc (Ngung Than dan tot nhat da mo khoa theo cap, uong noi nhau) */
function manaPotRate(lv) {
  if (S.chal === 'nopot') return 0;
  let best = 0;
  for (const p of J.potions) if (p.kind === 'mana' && lv >= (POT_TIER_LV[p.tier] || 999)) best = Math.max(best, p.total / Math.max(1, p.dur));
  return best;
}
const W_TIER1 = {};
const weaponDmg = it => (it.base || []).reduce((t, [id, mn, mx]) => t + (id === 28 || id === 29 ? mn : 0), 0) * enhMul(it);
function weaponTierMul(it) {
  if (!it || it.d > 1) return 1;
  const key = it.d + ':' + it.k;
  if (!(key in W_TIER1)) { const b = baseRow(it.d, it.k, 1); W_TIER1[key] = b ? Math.max(1, weaponDmg(b)) : 0; }
  return W_TIER1[key] ? clamp(weaponDmg(it) / W_TIER1[key], 1, 20) : 1;
}
/* Gioi tinh (req 38 = magic_requiresex: 0 nam, 1 nu; thieu hoac < 0 la dung chung): trang phuc nu nam khong mac duoc va nguoc lai */
const sexReqOkFor = (it, sex) => { const r = (it.req || []).find(q => q[0] === 38); return !r || r[1] < 0 || r[1] === (sex || 0); };
const sexReqOk = req => sexReqOkFor({ req }, S.sex);
const sexOk = it => sexReqOk(it.req);
function reqOk(it) {
  if (S.chal === 'white' && ((it.r || 0) >= 2 || it.set || it.vio)) return false;
  if (!sexOk(it)) return false;
  for (const [id, v] of it.req || []) {
    if (id === 36 && S.lvl < v) return false;
    if (id === 32 && heroAttr('str') < v) return false;
    if (id === 33 && heroAttr('dex') < v) return false;
    if (id === 34 && heroAttr('vit') < v) return false;
    if (id === 35 && heroAttr('eng') < v) return false;
    if (id === 37 && v >= 0 && FAC[S.fac] && heroSeries() !== v) return false;
    if (id === 39 && v >= 0 && FAC[S.fac] && FAC[S.fac].id !== v) return false;   // requiremenpai: do bo cua mon phai
  }
  return true;
}
function heroAttr(k) { const st = heroStart(); return st[k] + S.attr[k]; }
const POWER_DPS_W = 0.7; // game idle: toc do ha quai quyet dinh tien trinh, mau chi can du song
/* Luc chien: DPS thuc te (nhan ti le trung vs quai cung cap) ^0.6 x mau hieu dung (khang, ne) ^0.4 */
function power(P) {
  const L = S.lvl, eDef = 8 + 3.2 * L, eAr = 30 + 9 * L, a = P.main;
  const hit = a.useAR ? playerHitPercent(P.ar, eDef, a.ignore, P.ranged) / 100 : 1;
  const dodge = 1 - hitPercent(eAr, P.def) / 100;
  const avgRes = ELEM.reduce((t, e) => t + P.res[e], 0) / ELEM.length;
  const dps = a.dps * hit;
  const ehp = P.life / Math.max(0.2, 1 - avgRes / 100) / Math.max(0.3, 1 - dodge);
  return Math.pow(Math.max(1, dps), POWER_DPS_W) * Math.pow(Math.max(1, ehp), 1 - POWER_DPS_W);
}

/* ---------- Tu cong diem: moi lan dat mot "goi" diem vao lua chon lam tang luc chien nhieu nhat TINH TREN MOI DIEM ----------
   Nhin xa 1 / 5 / toi da diem: chieu moi cap 1 thuong yeu hon +1 cap chieu cu, nhung 20 cap thi manh hon han
   (tham lam tung diem mot se ket o chieu cu, vd Thien Vuong cap 120 khong bao gio hoc Truy Phong Quyet). */
function autoSpendSkills() {
  const f = FAC[S.fac]; if (!f) return 0;
  let spent = 0;
  while (S.skPts > 0) {
    const base = power(calc()); let best = null, bn = 0, bg = -Infinity;
    for (const id of f.skills) {
      const s = SK[id]; if (!canLearn(s) || isTrapSk(s) || (isAttack(s) && !skillWeaponOk(s, S.eq))) continue;
      // goi diem tinh ca diem cua cac cap sau (khong gioi han boi diem dang co): dan diem dan vao chieu moi cho toi khi no vuot chieu cu
      const cur = S.sk[id] || 0, room = Math.min(20, s.max - cur);
      for (const n of [...new Set([1, Math.min(5, room), room])]) {
        S.sk[id] = cur + n;
        const g = (power(calc()) - base) / n + (isAttack(s) ? 0 : 1e-6) + s.req * 1e-9; // hoa: uu tien noi tai, roi chieu cap cao
        if (cur) S.sk[id] = cur; else delete S.sk[id];
        if (g > bg) { bg = g; best = id; bn = n; }
      }
    }
    if (best == null) break;
    bn = Math.min(bn, S.skPts);
    if (!skillLearnPoint(best, bn)) break;
    spent += bn;
  }
  if (spent) R.dirty = true;
  return spent;
}
/* Vu khi dung loai cua phai tot nhat dang co (tui / tay), du cap nhung co the chua du Suc manh / Than phap.
   Vu khi JX doi 2 chi so (vd thuong Thien Vuong: Suc manh 99 + Than phap 99): tu cong diem mot chi so se khong bao gio cam duoc
   vu khi bac cao -> cac phai nay bi ket voi vu khi bac 1 khi choi dai (docs/DANH_GIA.md). */
const ATTR_REQ = { 32: 'str', 33: 'dex', 34: 'vit', 35: 'eng' };
const REQ_SAVE_LEVELS = 10; // chi dan diem cho vu khi thieu khong qua 10 cap diem
function weaponTarget() {
  const f = FAC[S.fac]; if (!f) return null;
  const own = S.inv.concat(S.eq.weapon ? [S.eq.weapon] : []).filter(it => it.d <= 1 && (f.wcode < 0 || weaponCode({ weapon: it }) === f.wcode)
    && (it.req || []).every(([id, v]) => id !== 36 || S.lvl >= v) && !(it.req || []).some(([id, v]) => (id === 37 || id === 39) && v >= 0 && !reqOk(it)));
  return own.sort((a, b) => weaponDmg(b) - weaponDmg(a))[0] || null;
}
/* Ly do cu the vi sao chua mac duoc mon do (hien trong chi tiet, thong bao, bang so sanh) */
const REQ_VI = { 32: 'Sức mạnh', 33: 'Thân pháp', 34: 'Sinh khí', 35: 'Nội công' };
function reqProblems(it) {
  const out = [];
  if (S.chal === 'white' && ((it.r || 0) >= 2 || it.set || it.vio)) out.push('Thử thách Bố y chỉ mặc đồ Trắng và Xanh');
  for (const [id, v] of it.req || []) {
    if (id === 36 && S.lvl < v) out.push(`Cấp ${v} (hiện ${S.lvl}, thiếu ${v - S.lvl})`);
    else if (REQ_VI[id] && heroAttr(ATTR_REQ[id]) < v) { const cur = heroAttr(ATTR_REQ[id]); out.push(`${REQ_VI[id]} ${v} (hiện ${cur}, thiếu ${v - cur})`); }
    else if (id === 38 && v >= 0 && (S.sex || 0) !== v) out.push(`Chỉ dành cho ${v ? 'nữ' : 'nam'} (nhân vật của bạn là ${S.sex ? 'nữ' : 'nam'})`);
    else if (id === 37 && v >= 0 && FAC[S.fac] && heroSeries() !== v) out.push(`Chỉ hệ ${SERIES[v]} (bạn hệ ${SERIES[heroSeries()]})`);
    else if (id === 39 && v >= 0 && FAC[S.fac] && FAC[S.fac].id !== v) out.push(`Chỉ môn phái ${(J.factions[v] || {}).n || v}`);
  }
  return out;
}
/* So voi mon dang mac cung o: thay doi suc manh tong, DPS chieu chinh, sinh luc, ne tranh, khang trung binh. ignoreReq: tinh nhu da du dieu kien */
function equipCompare(it, ignoreReq) {
  const eq = Object.assign({}, S.eq); eq[slotFor(it)] = it;
  const p0 = calc(S.eq), prev = IGNORE_REQ; IGNORE_REQ = ignoreReq ? it : null; let p1; try { p1 = calc(eq); } finally { IGNORE_REQ = prev; }
  const pw0 = power(p0), pw1 = power(p1), avg = P => ELEM.reduce((t, e) => t + P.res[e], 0) / ELEM.length;
  const why = compareWhy(it, eq, p0, p1);
  return { why, gain: pw1 / Math.max(1, pw0) - 1, dps: p1.main.dps / Math.max(1, p0.main.dps) - 1, life: p1.life - p0.life, def: p1.def - p0.def, res: avg(p1) - avg(p0), ar: p1.ar - p0.ar };
}
/* Ly do cu the vi sao suc manh doi khi thay mon: dong an cua cac mon khac mo / dong (tuong sinh), do bo, chieu chinh, sat thuong vu khi */
function compareWhy(it, eq1, p0, p1) {
  const eq0 = S.eq, slot = slotFor(it), out = [], old = eq0[slot];
  for (const k in eq0) {
    const o = eq0[k]; if (!o || k === slot || (o.mag || []).length < 2) continue;
    const h0 = hiddenActive(o, eq0), h1 = hiddenActive(o, eq1), tot = Math.floor(o.mag.length / 2);
    if (h1 !== h0) out.push(`${SLOT_VI[k]} ${h1 > h0 ? 'mở thêm' : 'đóng bớt'} ${Math.abs(h1 - h0)} dòng ẩn (${h1}/${tot}) do tương sinh hệ ${SERIES[it.s] || '—'}`);
  }
  if ((it.mag || []).length > 1) { const h = hiddenActive(it, eq1), tot = Math.floor(it.mag.length / 2), ho = old && (old.mag || []).length > 1 ? hiddenActive(old, eq0) : null;
    out.push(`Món này mở ${h}/${tot} dòng ẩn${ho !== null ? `, món đang mặc mở ${ho}/${Math.floor(old.mag.length / 2)}` : ''}`); }
  if (enoughToActive(eq1) !== enoughToActive(eq0)) out.push(enoughToActive(eq1) ? 'Đủ bộ: mở hết dòng ẩn của mọi trang bị' : 'Mất đủ bộ: các dòng ẩn bị đóng lại');
  if (p0.main.id !== p1.main.id) out.push(`Chiêu chính đổi: ${p0.main.n} → ${p1.main.n}`);
  if (slot === 'weapon') out.push(`Sát thương vũ khí ${Math.round(p0.wmin)}–${Math.round(p0.wmax)} → ${Math.round(p1.wmin)}–${Math.round(p1.wmax)}`);
  if (!out.length) out.push('Chỉ thay đổi chỉ số thường (phòng thủ, sinh lực, kháng), không đụng tới dòng ẩn hay bộ.');
  return out;
}
const pctTxt = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%', numTxt = v => (v >= 0 ? '+' : '') + Math.round(v);
function reqDeficit(it) {
  const d = {}; for (const [id, v] of it.req || []) { const k = ATTR_REQ[id]; if (k && heroAttr(k) < v) d[k] = v - heroAttr(k); }
  return d;
}
function autoSpendAttrs() {
  let spent = 0;
  const wt = weaponTarget();
  if (wt) {
    const d = reqDeficit(wt), need = Object.values(d).reduce((a, b) => a + b, 0);
    if (need > 0 && need <= S.attrPts + PTS_PER_LEVEL * REQ_SAVE_LEVELS)
      for (const k in d) { const n = Math.min(d[k], S.attrPts); S.attr[k] += n; S.attrPts -= n; spent += n; }
    if (wt !== S.eq.weapon && reqOk(wt) && typeof equip === 'function' && equipGain(wt) > 0) equip(wt, true);
  }
  while (S.attrPts > 0) {
    const base = power(calc()); let best = 'vit', bg = -Infinity;
    for (const k of ['str', 'dex', 'vit', 'eng']) { S.attr[k]++; const g = power(calc()) - base; S.attr[k]--; if (g > bg) { bg = g; best = k; } }
    S.attr[best]++; S.attrPts--; spent++;
  }
  if (spent) R.dirty = true;
  return spent;
}
function canLearn(s) { return !!s && S.skPts > 0 && S.lvl >= s.req && (S.sk[s.id] || 0) < s.max && skillBookOk(s); }

/* ---------- Can bang ky nang theo bac (rieng game idle) ----------
   Du lieu goc: chieu cung cap yeu cau chenh nhau 5-8 lan (Phieu Tuyet Xuyen Van bang ~345 o cap 20, No Loi Chi loi ~40,
   Kim Cang Phuc Ma +55% vu khi). JX bu bang vai tro PK/to doi ma game idle khong co. Moi chieu tan cong duoc nhan he so
   norm = trung vi sat thuong tham chieu cua bac / sat thuong tham chieu cua chieu (gioi han 0.35..3). Sat thuong tham chieu =
   mot don x so muc tieu trung thuc te (expectedHits) x toc do x thoi gian danh (can chien 82%), tinh voi mot nhan vat
   tham chieu (vu khi + mon vu khi cap 20 CUA CHINH PHAI DO + chi so tuong ung cap yeu cau), o cap ky nang 20, nhan so muc tieu. */
const NORM_TIERS = [[1, 19], [20, 39], [40, 59], [60, 79], [80, 999]];
/* Do tu mo phong (tools: 20 phut x 10 phai): so muc tieu trung thuc te moi lan danh va thoi gian danh cua chieu can chien */
const MELEE_UPTIME = 0.82;
function expectedHits(a) { const n = Math.min(3, a.targets); return a.around || a.radial ? 1 + (n - 1) * 0.12 : 1 + (n - 1) * 0.55; }
function masteryPct(f) { // mon vu khi dung loai vu khi cua phai, cap 20
  let best = 0;
  for (const id of f.skills) { const s = SK[id]; const a = s && !s.enemy && s.attr.addphysicsdamage_p; if (!a) continue;
    const v = a[19] || a[a.length - 1]; if (Array.isArray(v) && v[2] === f.wcode) best = Math.max(best, v[0]); }
  return best;
}
/* Nhan vat tham chieu co CUNG MOT quy diem (60 + cap yeu cau) chia giua Suc manh va Noi cong theo ti le k */
function refChar(req, f, k) {
  const w = 10 + req * 0.8, st = 60 + req;
  return { wmin: w, wmax: w * 1.3, physPct: masteryPct(f), physStat: 1 + st * k * (f.wcode === 7 ? DEX_PCT_RANGED : 1) / STR_PER_PCT / 100, add: {}, enh: {}, eng: st * (1 - k),
    seriesSkill: 0, skillBonus: {}, crit: 0, aspd: 1, ignoreDef: 0, series: 0, spellW: 1 };
}
// ti le trung trung binh cua chieu dung chinh xac (do tu mo phong): can chien / lai ~75%, am khi (Than phap cao) ~90%;
// chieu noi cong luon trung. Doc gay sat thuong trong 3 giay -> mat ~25% khi quai chet truoc khi het doc.
const REF_HIT = 0.75, REF_HIT_RANGED = 0.9, POISON_EFF = 0.75;
function refDps(s) {
  let best = 0;
  for (const k of [0, 1]) { // dau tu mot chi so (Suc manh hoac Noi cong) nhu bo tu cong diem va phan lon nguoi choi
    const a = activeInfo(refChar(Math.max(10, s.req), s.fac, k), s, 20);
    const eff = a.tot - (a.parts.poison || 0) * (1 - POISON_EFF);
    const hit = a.useAR ? (s.fac.wcode === 7 ? REF_HIT_RANGED : REF_HIT) : 1;
    best = Math.max(best, eff * expectedHits(a) * a.rate * (a.melee ? MELEE_UPTIME : 1) * hit);
  }
  return best;
}
function initSkillNorm() {
  const atk = [];
  for (const f of FACTIONS) for (const id of f.skills) { const s = SK[id]; if (isAttack(s)) { s.fac = f; atk.push(s); } }
  for (const [lo, hi] of NORM_TIERS) {
    const tier = atk.filter(s => s.req >= lo && s.req <= hi);
    const ref = tier.map(s => { s.norm = 1; return [s, refDps(s)]; });
    const vals = ref.map(r => r[1]).sort((a, b) => a - b), med = vals[Math.floor(vals.length / 2)] || 1;
    for (const [s, v] of ref) s.norm = clamp(med / Math.max(1, v), 0.35, 3);
  }
}
initSkillNorm();

/* ---------- Can bang theo phai va cap (rieng game idle) ----------
   Sau khi can bac ky nang van con lech do noi tai tung phai (vd Thieu Lam cap 150 manh ~10 lan Thuy Yen): mo phong nhan vat
   len cap 1 -> 150 bang dung bo tu cong diem, do DPS thuc te (nhan ti le trung) tai cac moc cap, he so = trung vi / phai
   (gioi han 0.1..3.5), noi suy tuyen tinh giua cac moc. Tao lai: tests/run_tests.py balance (in bang moi khi lech). */
const FN_LV = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150];
const FAC_DMG_NORM = {
  shaolin: [0.84, 1.05, 0.79, 0.85, 0.9, 0.59, 0.61, 0.85, 0.86, 0.67, 0.76, 0.7, 0.51, 0.47],
  tianwang: [1.1, 0.95, 1.21, 0.94, 0.61, 0.7, 1.54, 2.5, 4.44, 4.88, 5.4, 6, 4.13, 3.32],
  tangmen: [1.03, 1.31, 1.23, 1.34, 1.11, 1.65, 2.91, 3.42, 6, 2.96, 3.39, 3.33, 3.19, 2.69],
  wudu: [0.77, 0.69, 0.82, 0.88, 0.6, 0.91, 0.85, 1.03, 1.04, 1.13, 1.46, 1.47, 1.48, 1.5],
  emei: [0.74, 0.62, 0.7, 0.81, 0.53, 0.74, 0.85, 0.76, 0.78, 0.85, 0.87, 0.73, 0.63, 0.64],
  cuiyan: [1.22, 2.24, 2.28, 1.69, 1.21, 1.51, 1.15, 0.97, 0.96, 0.92, 0.9, 0.76, 0.67, 0.55],
  gaibang: [1.04, 2.2, 2.12, 1.65, 1.63, 1.1, 1.28, 1.43, 1.43, 1.09, 1.11, 1.24, 1.31, 1.3],
  tianren: [0.97, 1.1, 1.42, 0.97, 1.15, 1.26, 1.49, 1.54, 2, 2.13, 2.09, 1.71, 1.44, 1.37],
  wudang: [0.89, 0.65, 0.71, 1.13, 1.15, 1.14, 0.84, 0.95, 0.75, 0.39, 0.38, 0.3, 0.25, 0.26],
  kunlun: [1.4, 0.95, 0.67, 1.03, 0.6, 0.81, 0.87, 0.92, 0.8, 0.74, 0.86, 0.81, 0.76, 0.77],
};
function facNorm(key, L) {
  const t = FAC_DMG_NORM[key]; if (!t || window.NO_FAC_NORM) return 1;
  if (L <= FN_LV[0]) return t[0];
  for (let i = 1; i < FN_LV.length; i++) if (L <= FN_LV[i]) { const k = (L - FN_LV[i - 1]) / (FN_LV[i] - FN_LV[i - 1]); return t[i - 1] + (t[i] - t[i - 1]) * k; }
  return t[t.length - 1];
}
