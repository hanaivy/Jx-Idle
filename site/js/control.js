/* ======================= DIEU KHIEN: joystick, o ky nang, thuoc, Tho Dia Phu (mau GD_Idle) ======================= */
'use strict';
const INPUT = { active: false, id: null, fromJoy: false, ox: 0, oy: 0, x: 0, y: 0, moved: false, keys: {}, target: null };
const JOY_R = 45, TAP_MOVE = 8, TP_CD = 20, POT_CD = 1.5;
const TAB_HOTKEYS = Object.freeze({ h: 'log', c: 'char', i: 'inv', k: 'skill', o: 'more' });
const manual = () => S.ctrl === 'manual';
const joyFixed = () => S.joy !== 'float';
/* Che do dieu khien: tren may tinh man hinh ngang co chuot -> chuot (bam / giu chuot de di, bam do tren dat de nhat) hoac joystick, doi bang nut tren san dau.
   Dien thoai / may bang / man hinh doc: luon joystick (nut doi khong hien). */
const isDesktopLandscape = () => !!(window.matchMedia && window.matchMedia('(orientation: landscape) and (min-width: 900px) and (hover: hover) and (pointer: fine)').matches);
const inputMode = () => isDesktopLandscape() ? (S.inputMode === 'joy' ? 'joy' : 'mouse') : 'joy';
const mouseMode = () => inputMode() === 'mouse';
function toggleRot() { S.rot = S.rot === false; R.dirty = true; save(); toast(S.rot !== false ? 'Xoay chiêu đã bật' : 'Xoay chiêu đã tắt'); }
function toggleRide() {
  if (!S || !S.fac) return;
  const horse = S.eq && S.eq.horse;
  if (!horse) { toast('Chưa trang bị ngựa'); return; }
  if (!reqOk(horse)) { toast('Chưa đủ điều kiện sử dụng ngựa'); return; }
  S.ride = S.ride === false;
  R.dirty = true; recalc(); save();
  toast(S.ride ? 'Đã lên ngựa' : 'Đã xuống ngựa');
}
function refreshInputBtn() {
  const on = isDesktopLandscape(), mouse = mouseMode();
  document.body.classList.toggle('deskland', on);
  document.body.classList.toggle('mouse-input', mouse);
  const b = $('#inBtn'); if (b) {
    const label = mouse ? 'Chuột' : 'Joystick';
    b.innerHTML = `<img class="input-mode-icon" src="ui/input-${mouse ? 'mouse' : 'joystick'}.svg" alt=""><span>${label}</span>`;
    b.setAttribute('aria-label', `Đổi chế độ điều khiển · hiện tại: ${label}`);
    b.title = `Đổi chế độ điều khiển · hiện tại: ${label}`;
  }
  if (typeof window.positionWorldChatModeButton === 'function') window.positionWorldChatModeButton();
}
const joyAnchor = () => ({ x: JOY_R + 14, y: AR.h - JOY_R - 14 });   // goc trai duoi san dau

/* ---------- tay cam (Gamepad API): analog / D-pad di chuyen, A B X Y = chieu 1-4, LB / RB = thuoc HP / MP, Start = tam dung Luyen Cong ---------- */
const GP = { v: [0, 0], prev: [] };
function gamepadPoll() {
  const list = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [], p = list.find(x => x && x.connected);
  if (!p) { GP.v = [0, 0]; GP.prev = []; return; }
  const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
  let x = p.axes[0] || 0, y = p.axes[1] || 0; if (Math.hypot(x, y) < 0.25) { x = 0; y = 0; }
  if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
  GP.v = [x, y];
  if ((x || y) && S.fac && !SV.on && !R.town && !manual()) setCtrl('manual');
  const edge = i => b(i) && !GP.prev[i];
  if (S.fac) {
    if (SV.on) { if (edge(9)) svPause(); if (edge(4)) svUseHp(); }
    else {
      for (let i = 0; i < 4; i++) if (edge(i)) pressSlot(i);
      if (edge(4)) drinkNow('life'); if (edge(5)) drinkNow('mana'); if (edge(8)) R.town ? backFromTown() : goTown();
    }
  }
  GP.prev = p.buttons.map(bt => !!bt.pressed);
}
/* Vector di chuyen: keo tren san (joystick noi), phim WASD / mui ten, hoac diem da cham */
function inputVec() {
  if (INPUT.active && INPUT.moved) {
    const x = INPUT.x - INPUT.ox, y = INPUT.y - INPUT.oy, l = Math.hypot(x, y);
    if (l < 6) return [0, 0];
    const k = Math.min(1, l / JOY_R) / l; return [x * k, y * k];
  }
  if (GP.v[0] || GP.v[1]) { INPUT.target = null; const l = Math.hypot(GP.v[0], GP.v[1]); return l > 1 ? [GP.v[0] / l, GP.v[1] / l] : GP.v.slice(); }
  const K = INPUT.keys; let x = 0, y = 0;
  if (K.ArrowLeft || K.a) x -= 1; if (K.ArrowRight || K.d) x += 1; if (K.ArrowUp || K.w) y -= 1; if (K.ArrowDown || K.s) y += 1;
  const l = Math.hypot(x, y); if (l) { INPUT.target = null; return [x / l, y / l]; }
  if (INPUT.target) {
    const dx = INPUT.target.x - H.x, dy = INPUT.target.y - H.y, d = Math.hypot(dx, dy);
    if (d < 6) { INPUT.target = null; return [0, 0]; }
    return [dx / d, dy / d];
  }
  return [0, 0];
}
function moveManual(dt) {
  const [vx, vy] = inputVec();
  if (!vx && !vy) {
    // Tha phim / joystick hoac den diem bam: Auto tiep tuc di danh va nhat do.
    // Khong lay lai dieu khien khi nguoi choi van giu chuot / joystick.
    if (S.autoAtk !== false && !INPUT.active) { S.ctrl = 'auto'; R.moveTo = null; }
    return false;
  }
  const sp = 150 * (R.P ? R.P.speed : 1);
  const [nx, ny] = clampWorld(H.x + vx * sp * dt, H.y + vy * sp * dt);
  if (!obsMove(H, nx, ny) && INPUT.target) INPUT.target = null;      // cham vat can: bo diem cham
  R.pickTarget = null; return true;
}
function setCtrl(mode) {
  S.ctrl = mode; INPUT.target = null; R.moveTo = null;
  renderPad();
}
function toggleAutoAttack() {
  S.autoAtk = S.autoAtk === false;
  R.atkT = 0;
  R.moveTo = null;
  if (S.autoAtk) {
    INPUT.target = null;
    const [vx, vy] = inputVec();
    S.ctrl = INPUT.active || vx || vy ? 'manual' : 'auto';
  }
  renderPad(); save();
  toast(S.autoAtk ? 'Auto đánh đã bật' : 'Auto đánh đã tắt · bấm ô kỹ năng để đánh thủ công');
}

/* ---------- o ky nang ---------- */
function learnedAttacks() { return Object.keys(S.sk).map(Number).filter(id => S.sk[id] && isAttack(SK[id])); }
function fillSlots() {
  S.slots = (S.slots || [0, 0, 0, 0]).map(id => (id && S.sk[id] ? id : 0));
  for (const id of learnedAttacks().sort((a, b) => SK[b].req - SK[a].req)) {
    if (S.slots.includes(id)) continue;
    const i = S.slots.indexOf(0); if (i < 0) break; S.slots[i] = id;
  }
}
function assignSlot(i, id) { fillSlots(); const j = S.slots.indexOf(id); if (j >= 0) S.slots[j] = S.slots[i]; S.slots[i] = id; renderPad(); save(); }
function pressSlot(i) {
  fillSlots(); const id = S.slots[i]; if (!id) return;
  S.main = id; S.mainLock = true; R.dirty = true; recalc(); renderPad();
  if (S.autoAtk === false && !SV.on && !R.town && (R.atkT || 0) <= 0) R.atkT = heroAttack(true);
}

/* ---------- thuoc & Tho Dia Phu ---------- */
function drinkNow(kind) {
  if (S.chal === 'nopot') { toast('Thử thách Bất dược: không dùng thuốc'); return; }
  R.potCd = R.potCd || { life: 0, mana: 0 };
  if (R.potCd[kind] > 0) return;
  const own = takeStock(kind);                                 // thuoc da mua o cua hang dung truoc
  const p = own || bestPotion(kind); if (!p) { toast('Không đủ ngân lượng mua thuốc'); return; }
  usePotion(kind, p, !!own); R.potCd[kind] = POT_CD; toast(own ? `${p.n} (còn ${stockCount(kind)})` : `${p.n} (-${fmt(potPrice(p))} lượng)`);
}
function goTown() {
  if (R.town) return;
  // Trong tháp: về thành hồi đầy máu rồi quay lại là tầng được sinh lại -> hồi máu miễn phí giữa trận, phá thử thách. Luyện Công có cơ chế riêng.
  if (R.tk) { toast('Không dùng được Thổ Địa Phù trong Tống Kim'); return; }
  if (R.tower) { toast('Không dùng được Thổ Địa Phù trong Tháp thử thách (bấm "Rời tháp" ở 🎁 → Tháp)'); return; }
  if (SV.on) return;
  if ((R.tpCd || 0) > 0) { toast(`Thổ Địa Phù hồi sau ${Math.ceil(R.tpCd)} giây`); return; }
  R.town = true; R.enemies = []; R.field = null; R.corpses = []; R.pickTarget = null; R.moveTo = null; INPUT.target = null;
  obsLoad('town'); [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2); snapCamera();
  R.bgImg = img(W.town.bg); uiSfx('use');
  playMusic(W.town.id);
  $('#townName').textContent = W.town.n; $('#townBar').classList.remove('hidden');
  R.banner = { t: 2.2, text: W.town.n, sub: 'Hồi phục · bán đồ · trở lại ải' };
  log(`Dùng Thổ Địa Phù về <b>${esc(W.town.n)}</b>.`);
}
function backFromTown() {
  if (!R.town) return;
  R.town = false; { const z = zoneOf(Math.min(S.stage, STAGES)); obsLoad(z.id); [H.x, H.y] = inWorld(H.x, H.y); snapCamera(); } R.tpCd = TP_CD; S.wave = 1; R.spawnT = 0.5; R.zoneShown = null;
  $('#townBar').classList.add('hidden');
  onZoneChange(zoneOf(Math.min(S.stage, STAGES)));
}
function townTick(dt) { // trong thanh: hoi day nhanh, khong co quai
  R.life = Math.min(R.P.life, R.life + R.P.life * 0.25 * dt); R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.25 * dt);
  moveManual(dt);
}

/* ---------- nut / phim ---------- */
function renderPad() {
  if (!S || !S.fac) return;
  if (typeof updatePotionButtons === 'function') updatePotionButtons();
  fillSlots();
  document.querySelectorAll('#pad .sk').forEach(b => {
    const id = S.slots[+b.dataset.i], s = SK[id];
    b.classList.toggle('empty', !s); b.classList.toggle('cur', !!(s && R.P && R.P.main.id === id));
    b.querySelector('i').style.backgroundImage = s && s.ic ? `url('${s.ic}')` : '';
    b.title = s ? s.n : 'Ô trống';
  });
  const b = $('#ctrlBtn');
  if (b) { const on = S.autoAtk !== false; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
}
function updatePadCd() {
  const pc = R.potCd || {}, set = (el, v, max) => el && el.querySelector('.cd').style.setProperty('--p', `${clamp(v / max, 0, 1) * 100}%`);
  set($('#bHp'), pc.life || 0, POT_CD); set($('#bMp'), pc.mana || 0, POT_CD); set($('#bTp'), R.tpCd || 0, TP_CD);
}
function bindControls() {
  const pos = ev => { const r = CV.getBoundingClientRect(), k = uiScale(); return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k]; }; // toa do man hinh
  const miniFloat = $('#miniFloat'), miniPos = ev => { const r = $('#battle').getBoundingClientRect(), k = uiScale(); return [(ev.clientX - r.left) / k, (ev.clientY - r.top) / k]; };
  if (miniFloat) {
    miniFloat.addEventListener('pointerdown', ev => {
      const [x, y] = miniPos(ev);
      if (!minimapPointerDown(x, y, ev.pointerId)) return;
      ev.preventDefault(); ev.stopPropagation(); miniFloat.setPointerCapture && miniFloat.setPointerCapture(ev.pointerId);
    });
    miniFloat.addEventListener('pointermove', ev => { const [x, y] = miniPos(ev); if (minimapPointerMove(x, y, ev.pointerId)) { ev.preventDefault(); ev.stopPropagation(); } });
    const miniUp = ev => { if (minimapPointerUp(ev.pointerId)) { ev.preventDefault(); ev.stopPropagation(); } };
    miniFloat.addEventListener('pointerup', miniUp); miniFloat.addEventListener('pointercancel', miniUp); miniFloat.addEventListener('lostpointercapture', miniUp);
  }
  CV.addEventListener('pointerdown', ev => {
    if (INPUT.active) return;
    const [px, py] = pos(ev);
    if (typeof minimapPointerDown === 'function' && minimapPointerDown(px, py, ev.pointerId)) {
      ev.preventDefault(); CV.setPointerCapture && CV.setPointerCapture(ev.pointerId); return;
    }
    if (mouseMode() && ev.pointerType !== 'touch') {              // che do chuot: bam / giu chuot de di toi do, bam do tren dat de nhat
      const [x, y] = pos(ev), d = groundAt(x + CAM.x, y + CAM.y);
      Object.assign(INPUT, { active: true, id: ev.pointerId, fromJoy: false, mouse: true, moved: false, x, y });
      CV.setPointerCapture && CV.setPointerCapture(ev.pointerId);
      if (d) { R.pickTarget = R.pickTarget === d ? null : d; if (R.pickTarget) toast(`Đi nhặt: ${d.it.n}`); INPUT.mouse = false; return; }
      if (!manual() && !SV.on) setCtrl('manual');
      const [wx, wy] = inWorld(x + CAM.x, y + CAM.y); INPUT.target = { x: wx, y: wy }; R.pickTarget = null;
      return;
    }
    const [x, y] = pos(ev), a = joyAnchor(), fromJoy = !joyFixed() || Math.hypot(x - a.x, y - a.y) <= JOY_R * 1.7;
    Object.assign(INPUT, { active: true, id: ev.pointerId, fromJoy, ox: fromJoy && joyFixed() ? a.x : x, oy: fromJoy && joyFixed() ? a.y : y, x, y, moved: false });
    CV.setPointerCapture && CV.setPointerCapture(ev.pointerId);
  });
  CV.addEventListener('pointermove', ev => {
    const [x, y] = pos(ev);
    if (typeof minimapPointerMove === 'function' && minimapPointerMove(x, y, ev.pointerId)) return;
    if (!INPUT.active || ev.pointerId !== INPUT.id) return;
    INPUT.x = x; INPUT.y = y;
    if (INPUT.mouse) { const [wx, wy] = inWorld(x + CAM.x, y + CAM.y); INPUT.target = { x: wx, y: wy }; return; }   // giu chuot: di theo con tro
    // QA-029/QA-016: keo o BAT KY dau tren san deu dieu khien duoc (joystick ao neo tai diem cham).
    // Truoc day keo ngoai vung joystick co dinh bi bo qua -> nguoi choi tuong game khong nghe minh.
    if (!INPUT.moved && Math.hypot(x - INPUT.ox, y - INPUT.oy) > TAP_MOVE) { INPUT.moved = true; INPUT.target = null; if (typeof window.hideWorldChatFrameForJoystick === 'function') window.hideWorldChatFrameForJoystick(); if (!manual()) setCtrl('manual'); }
  });
  const up = ev => {
    if (typeof minimapPointerUp === 'function' && minimapPointerUp(ev.pointerId)) return;
    if (ev.pointerId !== INPUT.id) return;
    const [x, y] = pos(ev), tap = !INPUT.moved && !INPUT.mouse;
    INPUT.mouse = false; INPUT.active = false; INPUT.id = null; INPUT.moved = false;
    if (!tap) return;
    const d = groundAt(x + CAM.x, y + CAM.y);                   // cham vao do: di nhat (doi sang toa do the gioi)
    if (d) { R.pickTarget = R.pickTarget === d ? null : d; if (R.pickTarget) toast(`Đi nhặt: ${d.it.n}`); return; }
    if (manual()) { const [wx, wy] = inWorld(x + CAM.x, y + CAM.y); INPUT.target = { x: wx, y: wy }; }   // cham dat: di toi do
  };
  CV.addEventListener('pointerup', up);
  // huy / mat con tro (Android doi cu chi, mo hop thoai, roi tab): nha joystick, khong de ket o trang thai dang giu (khi do cham moi bi bo qua)
  const release = ev => { if (typeof minimapPointerUp === 'function') minimapPointerUp(ev.pointerId); if (ev.pointerId === INPUT.id) { INPUT.active = false; INPUT.id = null; INPUT.moved = false; INPUT.mouse = false; } };
  CV.addEventListener('pointercancel', release); CV.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => { INPUT.active = false; INPUT.id = null; INPUT.moved = false; INPUT.mouse = false; INPUT.keys = {}; });
  CV.addEventListener('contextmenu', ev => ev.preventDefault());
  window.addEventListener('keydown', ev => {
    if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) || ev.target.isContentEditable) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; INPUT.keys[k] = true;
    if (SV.on) { if (!ev.repeat && (k === 'p' || k === 'Escape')) svPause(); return; }   // Luyen Cong: chi di chuyen + tam dung
    if (!ev.repeat && !ev.ctrlKey && !ev.metaKey && !ev.altKey && $('#modal').classList.contains('hidden')) {
      if (TAB_HOTKEYS[k] && typeof showTab === 'function') { INPUT.keys[k] = false; ev.preventDefault(); showTab(TAB_HOTKEYS[k]); return; }
      if (k === 'm') { INPUT.keys[k] = false; ev.preventDefault(); toggleRide(); return; }
    }
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && !manual()) setCtrl('manual');
    if (ev.repeat) return;
    if ('1234'.includes(k)) pressSlot(+k - 1);
    if (k === 'q') drinkNow('life'); if (k === 'e') drinkNow('mana'); if (k === 't') R.town ? backFromTown() : goTown();
    if (k === 'p' && !ev.ctrlKey && !ev.metaKey && !ev.altKey && $('#modal').classList.contains('hidden')) toggleAutoAttack();
    if (k === 'f') toggleAutoAttack();
    if (k === 'r') toggleRot();
  });
  window.addEventListener('keyup', ev => { INPUT.keys[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key] = false; });
  const tapBtn = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  document.querySelectorAll('#pad .sk').forEach(b => tapBtn(b, () => pressSlot(+b.dataset.i)));
  tapBtn($('#bHp'), () => drinkNow('life')); tapBtn($('#bMp'), () => drinkNow('mana'));
  tapBtn($('#bTp'), () => R.town ? backFromTown() : goTown());
  $('#ctrlBtn').onclick = toggleAutoAttack;
  $('#autoSettingsBtn').onclick = autoSettingsModal;
  $('#inBtn').onclick = () => { S.inputMode = mouseMode() ? 'joy' : 'mouse'; INPUT.target = null; refreshInputBtn(); save(); };
  refreshInputBtn(); window.addEventListener('resize', refreshInputBtn);
  $('#bBack').onclick = backFromTown;
  $('#bShop').onclick = () => shopModal(); $('#bStashT').onclick = () => stashModal();
  $('#bSellTown').onclick = () => sellChoiceModal();
}
function drawJoystick(c) {
  if (mouseMode()) return;
  const fixed = joyFixed(), a = joyAnchor();
  const neoCung = fixed && INPUT.fromJoy;                    // keo bat dau dung vung neo -> ve tai neo; keo noi khac -> ve tai diem cham
  const on = INPUT.active && (fixed ? (INPUT.fromJoy || INPUT.moved) : true);
  if (!fixed && !(on && INPUT.moved)) return;
  const ox = neoCung ? a.x : (INPUT.active ? INPUT.ox : a.x), oy = neoCung ? a.y : (INPUT.active ? INPUT.oy : a.y);
  c.globalAlpha = on ? 0.35 : 0.12; c.fillStyle = '#000'; c.beginPath(); c.arc(ox, oy, JOY_R, 0, 7); c.fill();
  const ring = img('ui/ring.png');                           // vong dieu khien tinh, mau vang-ngoc nhat va trong suot
  if (ring && ring.complete && ring.naturalWidth) {
    const sz = JOY_R * 2.6;
    c.globalAlpha = on ? 0.55 : 0.2; c.drawImage(ring, ox - sz / 2, oy - sz / 2, sz, sz);
  } else { c.globalAlpha = on ? 0.8 : 0.35; c.strokeStyle = '#e6c67a'; c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, JOY_R, 0, 7); c.stroke(); }
  if (on) {
    const dx = INPUT.x - ox, dy = INPUT.y - oy, l = Math.hypot(dx, dy), k = l > JOY_R ? JOY_R / l : 1;
    c.globalAlpha = 0.8; c.fillStyle = '#e6c67a'; c.beginPath(); c.arc(ox + dx * k, oy + dy * k, 14, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}
