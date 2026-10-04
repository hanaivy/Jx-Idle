/* ======================= HOAT DONG MOI (audit 03/10/2026): DA TAU · BANG HOI · TONG KIM =======================
   Muc dich can bang, khong them viec bat buoc moi:
   · Da Tau  - chuoi nhiem vu dai han, hut do thua va nguyen lieu du (Tinh Hong Bao Thach, Thuy Tinh Trang); thuong nho (diem tiem nang, Phuc Duyen).
   · Bang hoi - noi tieu vang khong day: dong gop vang len cap bang, moi cap mo buff nho co tran.
   · Tong Kim - 1 tran / tuan: 5 dot tinh anh roi trum co Tuyet chieu; thuong "Tong Kim Lenh" doi nguyen lieu / Phuc Duyen, KHONG doi do Hoang Kim. */
'use strict';
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localISODay(d); };   // thu Hai dau tuan, gio may

/* ---------- Da Tau ---------- */
const YT_TYPES = ['kills', 'bosses', 'item', 'mats', 'stages'];
function ytState() {
  const r = RW(); r.yt = r.yt || { i: 0, have: 0, done: false, lvl: S.lvl };
  if (!r.yt.lvl) r.yt.lvl = r.yt.done && r.yt.i % 5 === 0 ? Math.max(1, Math.floor((r.yt.have - 200) / 4)) : S.lvl;
  return r.yt;
}
function ytStep() {
  const y = ytState(), t = YT_TYPES[y.i % 5], c = Math.floor(y.i / 5), lv = y.lvl;
  const step = { t, n: 1, rw: { pts: 1, fd: 5 + c }, txt: '' };
  if (t === 'kills') { step.n = 200 + lv * 4; step.txt = `Hạ ${step.n} quái`; }
  else if (t === 'bosses') { step.n = 3; step.txt = 'Hạ 3 trùm'; }
  else if (t === 'item') { step.n = 3; step.txt = 'Nộp 3 món đồ Xanh trở lên (không phải đồ bộ / Tím / Bạch Kim, chưa mặc)'; }
  else if (t === 'mats') { step.n = 1; step.txt = 'Nộp 5 Tinh Hồng Bảo Thạch + 3 Thủy Tinh Trắng'; step.rw = { pts: 1, fd: 8 + c, gold: 1500 }; }
  else { step.n = 5; step.txt = 'Vượt 5 ải'; }
  return step;
}
function ytTick(k, n = 1) {
  if (!S || !S.fac) return;
  const y = ytState(), st = ytStep();
  if (y.done || st.t !== k) return;
  y.have = Math.min(st.n, y.have + n); if (y.have >= st.n) { y.done = true; dotGift(); }
}
function ytDeliverable() {
  const y = ytState(), st = ytStep(); if (y.done) return false;
  if (st.t === 'item') return ytItems().length >= st.n;
  if (st.t === 'mats') return matHave('misc', 'thbt') >= 5 && matHave('misc', 'wc') >= 3;
  return false;
}
const ytItems = () => S.inv.filter(it => !isKept(it) && it.r >= 1).sort((a, b) => itemPower(a) - itemPower(b));
function ytDeliver() {
  const y = ytState(), st = ytStep(); if (y.done || !ytDeliverable()) return { ok: false, msg: 'Chưa đủ vật phẩm' };
  if (st.t === 'item') { for (const it of ytItems().slice(0, st.n)) S.inv.splice(S.inv.indexOf(it), 1); invDirty = true; }
  else { matAdd('misc', 'thbt', -5); matAdd('misc', 'wc', -3); }
  y.have = st.n; y.done = true; return { ok: true, msg: 'Đã nộp' };
}
function ytClaim() {
  const y = ytState(), st = ytStep(); if (!y.done) return;
  y.i++; y.have = 0; y.done = false; y.lvl = S.lvl; grant(st.rw, 'Dã Tẩu · ' + st.txt); achCheck();
}

/* ---------- Bang hoi ---------- */
const GUILD_MAX = 20;
const guildCost = lv => Math.round(100000 * Math.pow(1.3, lv) * (1 + S.lvl / 20) * goldRateScale());
function guildState() { const r = RW(); r.guild = r.guild || { lv: 0, gold: 0 }; return r.guild; }
/* buff moi cap: kinh nghiem +0,5%, sinh luc +0,5%, sat thuong +0,25%, may man +0,25 (cap 20: +10% / +10% / +5% / +5) */
function guildBuff() { const lv = S && S.rw && S.rw.guild ? S.rw.guild.lv : 0; return { xp: lv * 0.5, life: lv * 0.5, dmg: lv * 0.25, lucky: lv * 0.25 }; }
function guildDonate(amount) {
  const g = guildState(); amount = Math.floor(+amount);
  if (!(amount > 0) || S.gold < amount) return { ok: false, msg: 'Không đủ ngân lượng' };
  if (g.lv >= GUILD_MAX) return { ok: false, msg: 'Bang hội đã đạt cấp tối đa' };
  S.gold -= amount; g.gold += amount; let up = 0;
  while (g.lv < GUILD_MAX && g.gold >= guildCost(g.lv)) { g.gold -= guildCost(g.lv); g.lv++; up++; }
  if (g.lv >= GUILD_MAX) g.gold = 0;
  if (up) R.dirty = true;
  return { ok: true, msg: up ? `Bang hội lên cấp ${g.lv}!` : `Đã đóng góp ${fmt(amount)} lượng` };
}

/* ---------- Tong Kim (1 tran / tuan) ---------- */
const TK_ELITE_WAVES = 5, TK_WAVES = TK_ELITE_WAVES + 1;
function tkState() { const r = RW(); if (!r.tk || r.tk.week !== weekKey()) r.tk = { week: weekKey(), used: 0, best: 0 }; return r.tk; }
function tkTokens() { const r = RW(); r.tkTok = r.tkTok || 0; return r.tkTok; }
function tkStart() {
  if (!S.fac || !unlocked(30) || R.tk || (typeof SV !== 'undefined' && SV.on)) return;
  const t = tkState();
  if (t.used >= 1) { toast('Tuần này đã đánh Tống Kim rồi, thứ Hai quay lại'); return; }
  if (R.town) backFromTown();
  if (R.tower) towerExit(false);
  t.used = 1; save(); R.field = null; R.moveTo = null; R.pickTarget = null; R.tk = { wave: 1, score: 0, kills: 0 }; R.enemies = []; R.corpses = []; R.spawnT = 0.5;
  R.banner = { t: 2.4, text: 'Chiến trường Tống Kim', sub: `${TK_WAVES} đợt, đợt cuối có trùm tướng · gục là kết thúc` }; R.logDirty = true; closeModal(true); refresh();
}
function tkSpawn() {
  const w = R.tk.wave, L = Math.max(10, S.lvl), boss = w === TK_WAVES; R.enemies = []; R.stall = 0;
  const z = ZONES[Math.min(ZONES.length - 1, Math.floor(L / 12))], n = boss ? 1 : 3 + w;
  for (let i = 0; i < n; i++) {
    const [x, y] = inWorld(H.x + rnd(-260, 260), H.y + rnd(-220, 220)), e = makeEnemy(boss ? z.boss : pick(z.m), boss ? L + 2 : L, boss ? 'boss' : 'elite', x, y);
    e.hp = e.max = e.max * (boss ? 1.5 : 1 + 0.12 * w); e.dmg *= 1 + 0.08 * w; e.tk = true; if (boss) { e.goldBoss = true; e.n = 'Tướng Kim · ' + e.n; } R.enemies.push(e);
  }
}
function tkCleared() {
  const k = R.tk; k.score += 50 * k.wave;
  if (k.wave >= TK_WAVES) { tkExit(false, true); return; }
  heal(R.P.life * 0.35, true); R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.35);
  k.wave++; R.spawnT = 1.5; R.banner = { t: 1.5, text: `Đợt ${k.wave}/${TK_WAVES}`, sub: k.wave === TK_WAVES ? 'Tướng Kim xuất hiện!' : 'Quân Kim tiến lên' };
}
function tkExit(dead, won) {
  if (!R.tk) return;
  const k = R.tk, t = tkState(), cleared = won ? TK_WAVES : k.wave - 1;
  const tok = Math.round((10 + 8 * cleared + (won ? 20 : 0)) * (1 + S.lvl / 100) * weekRewardMul());
  const r = RW(); r.tkTok = (r.tkTok || 0) + tok; t.best = Math.max(t.best, cleared); r.stat.tkWins = (r.stat.tkWins || 0) + (won ? 1 : 0);
  log(`${won ? '<b class="up">Thắng Tống Kim!</b>' : dead ? 'Gục ở Tống Kim.' : 'Rời Tống Kim.'} Qua ${cleared}/${TK_WAVES} đợt · điểm ${k.score + k.kills} · +${tok} Tống Kim Lệnh`);
  R.tk = null; R.field = null; R.enemies = []; S.wave = 1; R.spawnT = 0.5; R.zoneShown = null; save(); refresh();
}
const TK_SHOP = [[30, { ht: 2 }, '2 Huyền Tinh (cấp theo nhân vật)'], [40, { fd: 25 }, '25 Phúc Duyên'], [40, { mats: { wc: 3, mys: 3 } }, '3 Thủy Tinh Trắng + 3 Thần Bí Khoáng Thạch'], [120, { pts: 4 }, '4 điểm tiềm năng'], [120, { pot: { kind: 'life', tier: 5, n: 20 } }, '20 Kim Sáng Dược bậc 5']];
function tkBuy(i) {
  const [c, g] = TK_SHOP[i]; if (tkTokens() < c) { toast(`Cần ${c} Tống Kim Lệnh`); return; }
  RW().tkTok = tkTokens() - c; grant(g, 'Tống Kim'); refreshGift();
}

/* ---------- giao dien (cac the moi cua nut qua tang) ---------- */
const ACT_TABS = [['yt', 'Dã Tẩu'], ['guild', 'Bang hội'], ['tk', 'Tống Kim']];
function actBody(tab, r) {
  if (tab === 'yt') {
    const y = ytState(), st = ytStep();
    return `<p class="desc">Chuỗi nhiệm vụ Dã Tẩu (bước ${y.i + 1}): hút đồ thừa và nguyên liệu dư, thưởng nhỏ nhưng không giới hạn ngày.</p>
      <div class="qrow"><span><b>${esc(st.txt)}</b><small>${giftText(st.rw)}</small></span><small>${y.have}/${st.n}</small>
      <button class="btn sm" id="ytGo" ${y.done ? '' : ytDeliverable() ? '' : 'disabled'}>${y.done ? 'Nhận' : st.t === 'item' || st.t === 'mats' ? 'Nộp' : 'Đang làm'}</button></div>`;
  }
  if (tab === 'guild') {
    const g = guildState(), b = guildBuff(), full = g.lv >= GUILD_MAX, c = guildCost(g.lv), pct = full ? 100 : Math.floor(g.gold / c * 100);
    return `<p class="desc">Bang hội (NPC): đóng góp ngân lượng để lên cấp, mỗi cấp mở thêm buff nhỏ (tối đa cấp ${GUILD_MAX}: +10% kinh nghiệm, +10% sinh lực, +5% sát thương, +5 may mắn).</p>
      <div class="card stats"><span>Cấp bang</span><span>${g.lv}/${GUILD_MAX}</span><span>Kinh nghiệm</span><span>+${b.xp}%</span><span>Sinh lực</span><span>+${b.life}%</span><span>Sát thương</span><span>+${b.dmg}%</span><span>May mắn</span><span>+${b.lucky}</span>
      <span>Tiến độ cấp kế</span><span>${full ? 'Tối đa' : fmt(g.gold) + ' / ' + fmt(c) + ' (' + pct + '%)'}</span></div>
      ${full ? '' : [c / 10, c / 2, c].map(a => `<div class="btnrow"><small>${fmt(a)} lượng</small><button class="btn" data-gd="${Math.round(a)}" ${S.gold >= a ? '' : 'disabled'}>Đóng góp</button></div>`).join('')}`;
  }
  if (tab === 'tk') {
    const t = tkState();
    return `<p class="dim small">Luật tuần này: ${weekModsText()}</p><p class="desc">Chiến trường Tống Kim: mỗi tuần 1 trận, ${TK_ELITE_WAVES} đợt tinh anh rồi Tướng Kim (có Tuyệt chiêu). Thưởng Tống Kim Lệnh theo số đợt vượt qua, đổi nguyên liệu và Phúc Duyên (không đổi đồ Hoàng Kim). Gục là kết thúc, vẫn nhận lệnh theo số đợt đã qua.</p>
      <p>Tống Kim Lệnh: <b>${tkTokens()}</b> · tuần này: ${t.used ? 'đã đánh' : 'chưa đánh'} · kỷ lục tuần: ${t.best}/${TK_WAVES}</p>
      <div class="btnrow">${R.tk ? '<button class="btn red" id="tkOut">Rời trận</button>' : !unlocked(30) ? '<button class="btn" disabled>Cần cấp 30</button>' : t.used ? '<button class="btn" disabled>Đã đánh tuần này</button>' : '<button class="btn" id="tkGo">Vào chiến trường</button>'}</div>
      ${TK_SHOP.map(([c, , txt], i) => `<div class="qrow"><span>${txt}</span><small>${c} lệnh</small><button class="btn sm" data-tk="${i}" ${tkTokens() >= c ? '' : 'disabled'}>Đổi</button></div>`).join('')}`;
  }
  return null;
}
function actBind() {
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('#ytGo', () => { const y = ytState(); if (y.done) ytClaim(); else { const r = ytDeliver(); toast(r.msg); } refreshGift(); });
  on('#tkGo', tkStart); on('#tkOut', () => { tkExit(false); refreshGift(); });
  document.querySelectorAll('#mBody [data-gd]').forEach(x => x.onclick = () => { const r = guildDonate(+x.dataset.gd); toast(r.msg); save(); refreshGift(); });
  document.querySelectorAll('#mBody [data-tk]').forEach(x => x.onclick = () => tkBuy(+x.dataset.tk));
}
