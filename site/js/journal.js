/* ======================= SO TAY: thong ke 7 ngay gan nhat (luu trong save) =======================
   Kinh nghiem / vang moi gio choi that, do rot theo do hiem, so lan guc kem nguyen nhan. Chi ghi cac con so nho -> save tang vai KB. */
'use strict';
const JR_DAYS = 7, JR_DEATHS = 12;
function jr() {
  if (!S) return null;
  const j = S.journal || (S.journal = { days: {} }), k = localISODay(), cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (JR_DAYS - 1));
  for (const day of Object.keys(j.days)) if (day < localISODay(cutoff) || day > k) delete j.days[day];
  if (!j.days[k]) j.days[k] = { sec: 0, xp: 0, gold: 0, kills: 0, r2: 0, r3: 0, set: 0, deaths: [], deathN: 0 };
  return j.days[k];
}
const jrAdd = (f, n) => { const d = jr(); if (d && n) d[f] = (d[f] || 0) + n; };
function jrDeath(why) { const d = jr(); if (!d) return; d.deathN = (d.deathN || d.deaths.length) + 1; d.deaths.unshift({ at: Date.now(), lvl: S.lvl, stage: S.stage, why }); d.deaths.length = Math.min(d.deaths.length, JR_DEATHS); }
function jrModal() {
  jr();
  const j = S.journal || { days: {} }, keys = Object.keys(j.days).sort().reverse();
  const per = (v, s) => s > 60 ? fmt(v / s * 3600) : '–';
  const rows = keys.map(k => { const d = j.days[k]; return `<div class="qrow"><span><b>${k === localISODay() ? 'Hôm nay' : k}</b><small>${Math.round(d.sec / 60)} phút · ${fmt(d.kills)} quái · gục ${d.deathN || d.deaths.length}</small></span><small>${per(d.xp, d.sec)} kn/giờ<br>${per(d.gold, d.sec)} lượng/giờ</small><small>Trắng/Xanh ${d.other || 0} · Vàng ${d.r2} · Tím ${d.r3} · Bộ ${d.set}</small></div>`; }).join('');
  const dead = keys.flatMap(k => j.days[k].deaths).slice(0, JR_DEATHS).map(x => `<div class="row"><small>${new Date(x.at).toLocaleString('vi-VN')} · cấp ${x.lvl}, ải ${x.stage}: ${esc(x.why)}</small></div>`).join('');
  modal(`<h3>Sổ tay <small>7 ngày gần nhất</small></h3><p class="desc">Thống kê theo thời gian chiến đấu thật (không tính lúc ở thành / Luyện Công / offline).</p>${rows || '<small class="dim">Chưa có dữ liệu</small>'}
    <h3>Lần gục gần đây</h3><div class="card">${dead || '<small class="dim">Chưa gục lần nào</small>'}</div>`);
}

/* ---------- thanh nut nhanh o the Giang ho: dua cac chuc nang hay dung ra ngoai, khong chon trong menu long nhau ---------- */
function openGiftTab(tab) { giftTab = tab; giftModal(); }
function quickBarItems() {
  const r = RW(), tw = towerTries(), tk = tkState(), y = ytState();
  return [
    ['ui/quick/tower.png', 'Tháp', () => openGiftTab('tower'), unlocked(TOWER_LV) && tw.n < TOWER_TRIES ? `${TOWER_TRIES - tw.n}` : ''],
    ['ui/quick/tong-kim.png', 'Tống Kim', () => openGiftTab('tk'), unlocked(30) && !tk.used ? '!' : ''],
    ['ui/quick/quest.png', 'Dã Tẩu', () => openGiftTab('yt'), y.done || ytDeliverable() ? '!' : ''],
    ['ui/quick/guild.png', 'Bang hội', () => openGiftTab('guild'), ''],
    ['ui/quick/journal.png', 'Sổ tay', () => jrModal(), ''],
    ['ui/quick/forge.png', 'Lò rèn', () => htModal(), (typeof forgeReadyCounts === 'function' && Object.values(forgeReadyCounts()).some(Boolean)) ? '!' : ''],
    ['ui/quick/storage.png', 'Kho', () => stashModal(), ''],
    ['ui/quick/encyclopedia.png', 'Bách khoa', () => codexModal(), ''],
    ['ui/quick/clan.png', 'Gia tộc', () => openGiftTab('clan'), ''],
    ['ui/quick/tai-xiu.png', 'Tài Xỉu', () => openGiftTab('tx'), txLuotCon() > 0 ? `${txLuotCon()}` : ''],
    ['ui/quick/training.png', 'Luyện Công', () => svIntro(), ''],
    ['ui/quick/spare.png', 'Đồng hành', () => openGiftTab('pet'), ''],
  ];
}
function quickBarHTML() { return `<div class="qbar" id="qBar">${quickBarItems().map(([ic, n, , b], i) => `<button class="qb" data-q="${i}"><span class="qb-icon"><img src="${ic}" alt=""></span><small>${n}</small>${b ? `<em>${b}</em>` : ''}</button>`).join('')}</div>`; }
function bindQuickBar() { const l = quickBarItems(); document.querySelectorAll('#qBar .qb').forEach(b => b.onclick = () => { uiSfx('click'); l[+b.dataset.q][2](); }); }
