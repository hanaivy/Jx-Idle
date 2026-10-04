/* ======================= CHIEU SAU + CHOI LAI (audit 03/10/2026) =======================
   · Tam phap chuyen sinh: moi lan chuyen sinh chon 1 trong 3 huong (cong don, nho, tong cong khong vuot +10% sat thuong cua chuyen sinh)
   · Bien the tuan: 2 luat co dinh moi tuan cho Thap + Tong Kim (buoc doi he / build)
   · Thu thach nhan vat: luat rieng khi tao nhan vat, danh hieu rieng, khong thuong suc manh */
'use strict';
/* ---------- tam phap ---------- */
const TAM_PHAP = [
  { k: 'ho', n: 'Hộ Thể', d: 'mỗi cấp: sinh lực +6%, hóa giải sát thương +1%' },
  { k: 'bao', n: 'Thám Bảo', d: 'mỗi cấp: tỉ lệ rơi đồ +5%, may mắn +3' },
  { k: 'tru', n: 'Phá Trùm', d: 'mỗi cấp: sát thương lên tinh anh / trùm +6%' },
];
function tpStacks() { const t = (S && S.rw && S.rw.tp) || {}; return { ho: t.ho || 0, bao: t.bao || 0, tru: t.tru || 0 }; }
const tpPending = () => ((S.rw && S.rw.tpPend) | 0);
function tpPick(k) {
  const r = RW(); if (!(r.tpPend > 0) || !TAM_PHAP.some(t => t.k === k)) return false;
  r.tp = r.tp || {}; r.tp[k] = (r.tp[k] || 0) + 1; r.tpPend--; R.dirty = true; save(); return true;
}
function tamPhapModal() {
  if (!tpPending()) return;
  const st = tpStacks();
  modal(`<h3>Chọn tâm pháp <small>còn ${tpPending()} lượt</small></h3><p class="desc">Mỗi lần chuyển sinh chọn một hướng; chọn trùng thì cộng dồn. Hiện có: ${TAM_PHAP.map(t => `${t.n} ×${st[t.k]}`).join(' · ')}.</p>
    ${TAM_PHAP.map(t => `<div class="card"><b>${t.n}</b> <small class="dim">${t.d}</small><div class="btnrow"><button class="btn" data-tp="${t.k}">Chọn</button></div></div>`).join('')}`, () => {
    document.querySelectorAll('#mBody [data-tp]').forEach(b => b.onclick = () => { tpPick(b.dataset.tp); closeModal(true); recalc(); refresh(); if (tpPending()) tamPhapModal(); });
  }, true);
}

/* ---------- bien the tuan ---------- */
const WEEK_MODS = [
  { k: 'armor', n: 'Giáp dày', d: 'quái kháng mọi nguyên tố +25%' },
  { k: 'rage', n: 'Cuồng bạo', d: 'quái đánh đau hơn (+30%) nhưng yếu máu hơn (−20%)' },
  { k: 'regen', n: 'Hồi huyết', d: 'quái hồi 1,2% máu tối đa mỗi giây' },
  { k: 'elem', n: 'Hệ thịnh', d: 'toàn bộ quái cùng một hệ; hệ khắc hệ đó được thưởng ×1,25' },
];
function weekSeed() { let h = 0; for (const c of weekKey()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function weekMods() { const h = weekSeed(), a = h % WEEK_MODS.length, b = (a + 1 + (h >>> 3) % (WEEK_MODS.length - 1)) % WEEK_MODS.length; return { list: [WEEK_MODS[a], WEEK_MODS[b]], series: (h >>> 5) % 5 }; }
function weekModHas(k) { return weekMods().list.some(m => m.k === k); }
function weekModsText() { const w = weekMods(); return w.list.map(m => `<b>${m.n}</b>: ${m.d}${m.k === 'elem' ? ' (hệ ' + SERIES[w.series] + ')' : ''}`).join(' · '); }
function weekRewardMul() { return weekModHas('elem') && counters(heroSeries(), weekMods().series) ? 1.25 : 1; }
function applyWeekMod(e) {
  if (weekModHas('armor')) for (const k in e.res) e.res[k] = Math.min(85, e.res[k] + 25);
  if (weekModHas('rage')) { e.dmg *= 1.3; e.hp = e.max = e.max * 0.8; }
  if (weekModHas('regen')) e.regen = 0.012;
  if (weekModHas('elem')) e.series = weekMods().series;
}

/* ---------- thu thach nhan vat ---------- */
const CHALLENGES = [
  { k: '', n: 'Thường', d: 'Không thêm luật' },
  { k: 'nopot', n: 'Bất dược', d: 'Không dùng thuốc (cả tự động và bấm tay)' },
  { k: 'white', n: 'Bố y', d: 'Chỉ mặc đồ Trắng và Xanh (không Vàng / Tím / đồ bộ)' },
  { k: 'hard', n: 'Huyết chiến', d: 'Độ khó Khó cố định, không đổi được' },
];
const chalOf = () => (S && S.chal) || '';
const chalName = () => (CHALLENGES.find(c => c.k === chalOf()) || CHALLENGES[0]).n;
ACH.push(
  ['chal_nopot', 'Bất dược', () => chalOf() === 'nopot' && S.lvl >= 100, { fd: 50, pts: 10 }, ['lifemax_p', 5]],
  ['chal_white', 'Bố y', () => chalOf() === 'white' && S.lvl >= 100, { fd: 50, pts: 10 }, ['manamax_p', 5]],
  ['chal_hard', 'Huyết chiến', () => chalOf() === 'hard' && S.lvl >= 100, { fd: 50, pts: 10 }, ['allres_p', 3]],
);

/* ---------- gia toc: danh vong dung chung 3 slot (luu rieng, co chu ky nhu kho chung) ---------- */
const CLAN_KEY = 'jxidle_clan';
const CLAN_EVENTS = [['lv60', 2, 'Một nhân vật đạt cấp 60', () => S.lvl >= 60], ['lv120', 4, 'Một nhân vật đạt cấp 120', () => S.lvl >= 120], ['lv180', 8, 'Một nhân vật đạt cấp 180', () => S.lvl >= 180 || (RW().stat.reborn || 0) > 0],
  ['tower50', 6, 'Chinh phục tầng 50 Tháp thử thách', () => RW().stat.towerBest >= TOWER_ACHIEVEMENT_FLOOR], ['reborn1', 3, 'Chuyển sinh lần đầu', () => RW().stat.reborn >= 1], ['tk1', 2, 'Thắng Tống Kim', () => (RW().stat.tkWins | 0) >= 1],
  ['chal', 10, 'Đạt cấp 100 ở một thử thách nhân vật', () => ['nopot', 'white', 'hard'].some(k => RW().ach['chal_' + k] && chalOf() === k)], ['dex', 4, 'Bách khoa: hạ đủ quái ở 8 vùng', () => dexZones() >= 8]];
const CLAN_PERKS = [[10, 'stash', '+10 ô kho chung'], [25, 'build', '+1 bộ võ học'], [45, 'stash', '+10 ô kho chung'], [70, 'build', '+1 bộ võ học']];
function clanRead() {
  let raw = null; try { raw = localStorage.getItem(CLAN_KEY); } catch (e) { return { rep: 0, done: {} }; }
  if (!raw) return { rep: 0, done: {} };
  try { const u = unpack(raw); if (u.ok && u.state && typeof u.state === 'object') return { rep: Math.max(0, +u.state.rep | 0), done: safeKeys(u.state.done) }; } catch (e) { /* hong */ }
  return { rep: 0, done: {} };
}
function clanWrite(c) { try { localStorage.setItem(CLAN_KEY, pack(c)); } catch (e) { /* bo qua */ } }
const clanRep = () => clanRead().rep;
const clanPerk = k => CLAN_PERKS.filter(([need, kind]) => kind === k && clanRep() >= need).length;
const buildN = () => BUILD_N + clanPerk('build');
function clanCheck() {
  if (!S || !S.fac) return 0;
  if (!S.cid) S.cid = Math.random().toString(36).slice(2, 10);
  const c = clanRead(); let add = 0;
  for (const [k, pts, , ok] of CLAN_EVENTS) { const key = S.cid + ':' + k; if (!c.done[key] && ok()) { c.done[key] = 1; c.rep += pts; add += pts; } }
  if (add) { clanWrite(c); log(`Danh vọng gia tộc +${add}`); }
  return add;
}
function clanHTML() {
  const c = clanRead(), next = CLAN_PERKS.find(p => c.rep < p[0]);
  return `<p class="desc">Danh vọng gia tộc dùng chung cho cả 3 slot nhân vật. Chỉ mở <b>tiện ích</b> (kho, bộ võ học), không cộng chỉ số, nên chơi nhiều phái đều có lợi.</p>
    <div class="card stats"><span>Danh vọng</span><span>${c.rep}</span><span>Ô kho chung</span><span>${stashMax()}</span><span>Bộ võ học</span><span>${buildN()}</span><span>Mốc kế</span><span>${next ? next[0] + ' — ' + next[2] : 'Đã mở hết'}</span></div>
    <h3>Cách tăng</h3>${CLAN_EVENTS.map(([k, pts, txt]) => `<div class="qrow"><span>${txt}</span><small>+${pts}</small><small>${c.done[(S.cid || '') + ':' + k] ? '✔' : ''}</small></div>`).join('')}`;
}

/* ---------- bach khoa co hoan thanh ---------- */
function dexMark(tid) { S.seen = S.seen || {}; if (!S.seen[tid]) { S.seen[tid] = 1; } }
function dexSet(n) { S.setSeen = S.setSeen || {}; S.setSeen[n.replace(/^\[[^\]]*\]\s*/, '')] = 1; }
const dexZoneDone = z => [...z.m, z.boss].filter(t => MON[t]).every(t => (S.seen || {})[t]);
const dexZones = () => ZONES.filter(dexZoneDone).length;
function dexSetGroups() {
  const fid = FAC[S.fac] ? FAC[S.fac].id : -1, g = new Map();
  for (const r of J.sets.gold) { if ((r.req.find(q => q[0] === 39) || [0, -1])[1] !== fid || /^\[/.test(r.n)) continue; (g.get(r.grp) || g.set(r.grp, new Set()).get(r.grp)).add(r.n); }
  return [...g.values()];
}
const dexSetsDone = () => dexSetGroups().filter(names => [...names].every(n => (S.setSeen || {})[n])).length;
ACH.push(['dex8', 'Bách khoa: Vùng', () => dexZones() >= 8, { fd: 20 }, ['lucky_v', 1]], ['dex16', 'Bách khoa: Toàn cảnh', () => dexZones() >= ZONES.length, { fd: 50 }, ['lucky_v', 2]],
  ['dexs3', 'Bách khoa: Bộ', () => dexSetsDone() >= 3, { fd: 20 }, ['lucky_v', 1]], ['dexs10', 'Bách khoa: Đại sưu tầm', () => dexSetsDone() >= 10, { fd: 50 }, ['lucky_v', 2]]);
