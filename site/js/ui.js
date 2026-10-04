/* ======================= GIAO DIEN (5 the) ======================= */
'use strict';
let curTab = 'log', invDirty = true, tabEnterTimer = 0, modalEnterTimer = 0;
function log(h) { if (R.quiet) return; R.logs.unshift(viMessage(h)); if (R.logs.length > 40) R.logs.pop(); R.logDirty = true; }
let toastT; function toast(t) { const el = $('#toast'); el.textContent = viMessage(t); el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800); }
function modal(html, bind, locked) {
  const overlay = $('#modal'), opening = overlay.classList.contains('hidden');
  $('#mBody').innerHTML = html; overlay.classList.remove('hidden', 'item-preview-modal'); overlay.dataset.locked = locked ? '1' : '';
  if (opening) {
    clearTimeout(modalEnterTimer); overlay.classList.remove('modal-entering');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      void overlay.offsetWidth; overlay.classList.add('modal-entering');
      modalEnterTimer = setTimeout(() => overlay.classList.remove('modal-entering'), 340);
    }
  }
  if (bind) bind(); try { $('#modal .mbox').focus({ preventScroll: true }); } catch (e) { /* bo qua */ }
}
function closeModal(force) { if ($('#modal').dataset.locked && !force) return; $('#modal').classList.add('hidden'); }

/* ---------- tui do ---------- */
/* Do thua: khong dung duoc va khong manh hon do dang mac cung o (tru do bo, do Tim dang kham, Bach Kim); vu khi sai loai cua phai.
   Nhan / day chuyen / ngoc boi yeu van giu toi da 6 mon lam nguyen lieu hop Huyen Tinh. */
const FUSE_KEEP = 6;
/* Đồ khóa/cường hóa luôn được giữ; Hoàng Kim/Tím/Bạch Kim được giữ trừ khi khóa sai môn phái. */
const isKept = itemProtected;
function wrongFactionItem(it) {
  const f = FAC[S.fac];
  return !!(f && (it.req || []).some(([id, faction]) => id === 39 && faction >= 0 && faction !== f.id));
}
function isJunk(it) {
  if (it.locked || (it.enh | 0) > 0) return false;  // khóa tay / cường hóa vẫn luôn được giữ
  if (wrongFactionItem(it)) return true;            // đồ bộ sai phái cũng tự bán
  if (isKept(it)) return false;
  if (!sexOk(it)) return true;                         // trang phuc khac gioi tinh: khong bao gio mac duoc
  const f = FAC[S.fac];
  if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) return true;
  const eq = S.eq[slotFor(it)]; if (!eq || betterThanEquipped(it) || itemPower(it) > itemPower(eq) * 0.85) return false;
  if (FUSE_SLOTS.includes(it.d) && S.inv.filter(x => FUSE_SLOTS.includes(x.d) && !x.set && !x.vio).length < FUSE_KEEP) return false;
  return true;
}
/* Don do thua da nhat truoc (do manh len thi do cu thanh thua): moi 30 giay choi va khi vao lai game */
function sweepJunk() {
  if (S.autoJunk === false) return 0;
  let n = 0;
  for (let guard = 0; guard < invMax(); guard++) {
    const j = S.inv.filter(isJunk).sort((a, b) => itemPower(a) - itemPower(b))[0]; if (!j) break;
    S.inv.splice(S.inv.indexOf(j), 1); S.gold += itemValue(j); n++;
  }
  if (n) invDirty = true; return n;
}
function addItem(it, quiet, picked, keep) {
  // Đồ đã khóa/cường hóa từ file lưu hoặc thao tác chuyển đồ không được tự bán, kể cả túi đầy.
  if (it.locked || it.enh > 0) {
    if (invUsed() >= invMax()) makeRoom(it, true);
    S.inv.unshift(it); invDirty = true; return true;
  }
  if (!picked && !lootMatch(it)) { S.gold += itemValue(it); return false; } // khong qua mat dat (offline): mon khong khop bo loc tu ban
  if (invUsed() >= invMax() && (it.set || it.vio || it.plv)) makeRoom(it, true);   // do quy (bo / Tim / Bach Kim): nhuong cho bang cach ban mon yeu nhat
  if (invUsed() >= invMax()) { S.gold += itemValue(it); if (!quiet) log('<span class="dim">Túi đầy, tự bán ' + esc(it.n) + '</span>'); return false; }
  if (!keep && S.autoJunk !== false && isJunk(it)) { S.gold += itemValue(it); return false; }   // do thua: tu ban, khong chat hanh trang
  S.inv.unshift(it); invDirty = true; if (it.set && typeof dexSet === 'function') dexSet(it.n);
  if (!quiet && it.r >= 2) log(`Nhặt được <span style="color:${RAR_COL[it.r]}">${esc(it.n)}</span>`);
  if (S.autoEquip && betterThanEquipped(it)) equip(it, true);
  return true;
}
/* So sanh bang luc chien that (tinh ca mon vu khi cua phai, khang, ...), khong chi chi so cua mon do */
function equipGain(it) {
  if (!reqOk(it)) return -1;
  const eq = Object.assign({}, S.eq); eq[slotFor(it)] = it;
  return power(calc(eq)) / Math.max(1, power(calc(S.eq))) - 1;
}
// tu mac chi doi vu khi cung loai voi mon vu khi cua phai (Con cho Thieu Lam, am khi cho Duong Mon...);
// nguoi choi van mac tay duoc moi loai
function betterThanEquipped(it) {
  const f = FAC[S.fac];
  if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) return false;
  return equipGain(it) > 0.01;
}
function equip(it, quiet) {
  if (!reqOk(it)) { if (!quiet) toast('Chưa mặc được: ' + reqProblems(it).join('; ')); return; }
  const slot = slotFor(it), old = S.eq[slot];
  S.inv = S.inv.filter(x => x !== it); if (old) S.inv.unshift(old);
  S.eq[slot] = it; R.dirty = true; invDirty = true; if (!quiet) uiSfx(it.d <= 1 ? 'equipWeapon' : 'equipCloth');
  if (!quiet) { closeModal(); refresh(); }
}
function unequip(slot) { const it = S.eq[slot]; if (!it) return; if (invUsed() >= invMax()) { toast('Túi đầy'); return; } delete S.eq[slot]; S.inv.unshift(it); R.dirty = true; invDirty = true; closeModal(); refresh(); }
/* Ban mon khong khop bo loc (nut trong the Hanh trang, cua hang, Tho Dia Phu): khong bao gio ban do bo, do Tim dang kham, Bach Kim da thang cap */
const sellProtected = isKept;
function sellUnmatched() {
  const w = S.inv.filter(i => !lootMatch(i) && !sellProtected(i)); let g = 0;
  for (const i of w) g += itemValue(i);
  S.gold += g; S.inv = S.inv.filter(i => !w.includes(i)); invDirty = true;
  return { n: w.length, gold: g, kept: S.inv.filter(i => !lootMatch(i)).length };
}
function sellAllBag() {
  // Bán sạch là thao tác chủ động: bỏ qua bộ lọc và độ hiếm, chỉ giữ đồ khóa / đã cường hóa.
  const w = S.inv.filter(i => !i.locked && !(i.enh > 0)); let g = 0;
  for (const i of w) g += itemValue(i);
  S.gold += g; S.inv = S.inv.filter(i => !w.includes(i)); if (w.length) invDirty = true;
  return { n: w.length, gold: g, kept: S.inv.length };
}
function sellChoiceModal(afterSell = refresh) {
  const unmatched = S.inv.filter(i => !lootMatch(i) && !sellProtected(i));
  const sellable = S.inv.filter(i => !i.locked && !(i.enh > 0));
  const total = items => fmt(items.reduce((sum, it) => sum + itemValue(it), 0));
  modal(`<h3>Bán đồ</h3><p class="desc">Bán theo lọc chỉ bán món không khớp bộ lọc. Bán sạch bỏ qua bộ lọc và độ hiếm; đồ khóa hoặc đã cường hóa vẫn được giữ.</p>
    <div class="btnrow"><button class="btn red" id="bSellFiltered">Bán theo lọc · ${unmatched.length} món · ${total(unmatched)} lượng</button>
    <button class="btn red" id="bSellClean">Bán sạch · ${sellable.length} món · ${total(sellable)} lượng</button></div>`, () => {
    const finish = (r, label) => { save(); closeModal(); toast(`Đã ${label} ${r.n} món · nhận ${fmt(r.gold)} lượng`); afterSell(); };
    $('#bSellFiltered').onclick = () => finish(sellUnmatched(), 'bán theo lọc');
    $('#bSellClean').onclick = () => finish(sellAllBag(), 'bán sạch');
  });
}
function sellSingle(it) {
  if (!S.inv.includes(it)) return { ok: false, msg: 'Món không còn trong hành trang' };
  if (it.locked) return { ok: false, msg: 'Món đang khóa 🔒 — mở khóa trước khi bán' };
  const gold = itemValue(it); S.inv = S.inv.filter(x => x !== it); S.gold += gold; invDirty = true; save();
  return { ok: true, gold, msg: `Đã bán ${it.n} · nhận ${fmt(gold)} lượng` };
}
function sell(it) { if (!S.inv.includes(it)) { closeModal(); return; }
  const result = sellSingle(it); if (!result.ok) { toast(result.msg); return; } closeModal(); refresh(); }
function findItem(uid) { uid = +uid; return S.inv.find(i => i.uid === uid) || Object.values(S.eq).find(i => i && i.uid === uid) || (R.ground.find(d => d.it.uid === uid) || {}).it; }
function itemCell(it, orderIndex = null) {
  if (!it) return '';
  const orderable = Number.isInteger(orderIndex);
  const frame = it.set && it.set.kind === 'gold' ? ' goldset' : it.set && it.set.kind === 'platina' ? ' platinaset' : !it.set && it.r === 1 ? ' magicitem' : '';
  return `<button class="it${orderable ? ' inv-reorder-cell' : ''} r${it.r}${frame}${reqOk(it) ? '' : ' bad'}" data-uid="${it.uid}"${orderable ? ` data-inv-order="${orderIndex}"` : ''}${reqOk(it) ? '' : ` title="${esc('Chưa mặc được: ' + reqProblems(it).join('; '))}"`}>${it.ic ? `<img src="${escRaw(it.ic)}" alt="" draggable="false">` : ''}<i>${it.lvl}</i>${it.s >= 0 ? `<b class="s5" style="background:${SERIES_COL[it.s]}"></b>` : ''}${betterThanEquipped(it) && S.inv.includes(it) ? '<em>▲</em>' : ''}${it.locked ? '<u class="lk">🔒</u>' : ''}</button>`;
}

let invOrderSourceUid = 0, invOrderSuppressClickUntil = 0, invOrderTouch = null, invOrderTouchEventsBound = false;
function invOrderClearHighlights() {
  document.querySelectorAll('#t-inv .inv-reorder-target').forEach(el => el.classList.remove('inv-reorder-target'));
  document.querySelectorAll('#t-inv .inv-drop-hover').forEach(el => el.classList.remove('inv-drop-hover'));
}
function invOrderClearTargets() {
  invOrderClearHighlights(); document.querySelectorAll('#t-inv .inv-drop-ready').forEach(el => el.classList.remove('inv-drop-ready'));
}
function invOrderDropAction(source, targetId) {
  if (source && typeof source === 'object') {
    const r = targetId === 'bStash' ? stashDepositPotion(source.kind, source.tier) : sellPotionStack(source.kind, source.tier);
    if (targetId === 'bStash') stashDone(r, false); else { toast(r.msg); if (r.ok) refresh(); }
    return;
  }
  const uid = source;
  const it = S.inv.find(x => +x.uid === +uid);
  if (!it) { toast('Món không còn trong hành trang'); refresh(); return; }
  if (targetId === 'bStash') { stashDone(stashDeposit(it), false); return; }
  if (targetId === 'bSellAll') {
    const result = sellSingle(it); toast(result.msg); if (result.ok) refresh();
  }
}
function invOrderSwap(sourceUid, targetUid) {
  if (!sourceUid || !targetUid || +sourceUid === +targetUid) return false;
  const from = S.inv.findIndex(it => +it.uid === +sourceUid), to = S.inv.findIndex(it => +it.uid === +targetUid);
  if (from < 0 || to < 0) return false;
  [S.inv[from], S.inv[to]] = [S.inv[to], S.inv[from]];
  invDirty = true; save(); renderInv(); return true;
}
function invOrderTouchCleanup(state) {
  if (!state) return;
  clearTimeout(state.timer); state.button.classList.remove('dragging');
  if (state.ghost) state.ghost.remove();
  invOrderClearTargets(); if (invOrderTouch === state) invOrderTouch = null;
}
function invOrderTouchMove(e) {
  const state = invOrderTouch; if (!state) return;
  const touch = Array.from(e.changedTouches).find(t => t.identifier === state.id); if (!touch) return;
  if (!state.active) {
    if (Math.hypot(touch.clientX - state.startX, touch.clientY - state.startY) > 12) invOrderTouchCleanup(state);
    return;
  }
  if (e.cancelable) e.preventDefault();
  state.ghost.style.left = touch.clientX + 'px'; state.ghost.style.top = touch.clientY + 'px';
  invOrderClearHighlights();
  const hit = document.elementFromPoint(touch.clientX, touch.clientY);
  const action = hit?.closest?.('#t-inv #bStash, #t-inv #bSellAll');
  if (action) action.classList.add('inv-drop-hover');
  else {
    const target = hit?.closest?.('#t-inv [data-inv-order]');
    if (target && +target.dataset.uid !== state.uid) target.classList.add('inv-reorder-target');
  }
}
function invOrderTouchEnd(e) {
  const state = invOrderTouch; if (!state) return;
  const touch = Array.from(e.changedTouches).find(t => t.identifier === state.id); if (!touch) return;
  clearTimeout(state.timer);
  if (!state.active) { invOrderTouch = null; return; }
  if (e.cancelable) e.preventDefault();
  const hit = document.elementFromPoint(touch.clientX, touch.clientY);
  const action = hit?.closest?.('#t-inv #bStash, #t-inv #bSellAll');
  const target = hit?.closest?.('#t-inv [data-inv-order]');
  invOrderSuppressClickUntil = Date.now() + 700;
  invOrderTouchCleanup(state);
  if (action) invOrderDropAction(state.source, action.id);
  else if (target) invOrderSwap(state.uid, target.dataset.uid);
}
function invOrderBind() {
  const cells = document.querySelectorAll('#t-inv [data-inv-order], #t-inv [data-potion-tier]'); if (!cells.length) return;
  if (!invOrderTouchEventsBound) {
    document.addEventListener('touchmove', invOrderTouchMove, { passive: false });
    document.addEventListener('touchend', invOrderTouchEnd, { passive: false });
    document.addEventListener('touchcancel', () => invOrderTouchCleanup(invOrderTouch), { passive: true });
    document.addEventListener('click', e => {
      if (Date.now() <= invOrderSuppressClickUntil && e.target.closest?.('#t-inv [data-inv-order], #t-inv [data-potion-tier], #t-inv #bStash, #t-inv #bSellAll')) { e.preventDefault(); e.stopImmediatePropagation(); invOrderSuppressClickUntil = 0; }
    }, true);
    invOrderTouchEventsBound = true;
  }
  const touchUI = ('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  cells.forEach(cell => {
    cell.draggable = !touchUI;
    cell.addEventListener('dragstart', e => {
      if (touchUI || !e.dataTransfer) { e.preventDefault(); return; }
      invOrderSourceUid = cell.dataset.potionTier ? { kind: cell.dataset.potionKind, tier: +cell.dataset.potionTier } : +cell.dataset.uid; invOrderSuppressClickUntil = Date.now() + 700; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify(invOrderSourceUid)); cell.classList.add('dragging');
      document.querySelectorAll('#t-inv #bStash, #t-inv #bSellAll').forEach(b => b.classList.add('inv-drop-ready'));
    });
    cell.addEventListener('dragover', e => {
      if (!invOrderSourceUid || typeof invOrderSourceUid === 'object' || invOrderSourceUid === +cell.dataset.uid) return;
      e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; cell.classList.add('inv-reorder-target');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('inv-reorder-target'));
    cell.addEventListener('drop', e => {
      if (!invOrderSourceUid) return;
      e.preventDefault(); invOrderSuppressClickUntil = Date.now() + 700;
      invOrderSwap(invOrderSourceUid, cell.dataset.uid); invOrderSourceUid = 0;
    });
    cell.addEventListener('dragend', () => { invOrderSourceUid = 0; cell.classList.remove('dragging'); invOrderClearTargets(); });
    cell.addEventListener('touchstart', e => {
      if (e.touches.length !== 1 || invOrderTouch) return;
      const t = e.changedTouches[0], state = invOrderTouch = { button: cell, uid: +cell.dataset.uid, source: cell.dataset.potionTier ? { kind: cell.dataset.potionKind, tier: +cell.dataset.potionTier } : +cell.dataset.uid, x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, id: t.identifier, active: false, timer: 0, ghost: null };
      state.timer = setTimeout(() => {
        if (invOrderTouch !== state) return;
        state.active = true; cell.classList.add('dragging');
        document.querySelectorAll('#t-inv #bStash, #t-inv #bSellAll').forEach(b => b.classList.add('inv-drop-ready'));
        const rect = cell.getBoundingClientRect(), ghost = document.createElement('div'), clone = cell.cloneNode(true);
        clone.draggable = false; clone.removeAttribute('data-inv-order'); clone.classList.remove('dragging', 'inv-reorder-cell');
        ghost.className = 'stash-drag-ghost'; ghost.style.width = rect.width + 'px'; ghost.style.height = rect.height + 'px'; ghost.style.left = state.x + 'px'; ghost.style.top = state.y + 'px'; ghost.appendChild(clone); document.body.appendChild(ghost); state.ghost = ghost;
      }, 350);
    }, { passive: true });
  });
  document.querySelectorAll('#t-inv #bStash, #t-inv #bSellAll').forEach(button => {
    button.addEventListener('dragover', e => {
      if (!invOrderSourceUid) return;
      e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; button.classList.add('inv-drop-hover');
    });
    button.addEventListener('dragleave', e => { if (!button.contains(e.relatedTarget)) button.classList.remove('inv-drop-hover'); });
    button.addEventListener('drop', e => {
      if (!invOrderSourceUid) return;
      e.preventDefault(); e.stopPropagation(); invOrderSuppressClickUntil = Date.now() + 700;
      const source = invOrderSourceUid; invOrderSourceUid = 0; invOrderClearTargets(); invOrderDropAction(source, button.id);
    });
  });
}
function itemHTML(it) {
  const isPlatina = it.set && it.set.kind === 'platina';
  const frame = it.set && it.set.kind === 'gold' ? ' goldset' : isPlatina ? ' platinaset' : !it.set && it.r === 1 ? ' magicitem' : '';
  const titleColor = isPlatina ? '#ffed35' : RAR_COL[it.r];
  return `<div class="idet"><div class="pic r${it.r}${frame}">${it.ic ? `<img src="${escRaw(it.ic)}" alt="" draggable="false">` : ''}</div><div><h4 class="${isPlatina ? 'platina-name' : ''}" style="color:${titleColor}">${esc(it.n)}${it.enh ? ` <span class="enh">+${it.enh}</span>` : ''}</h4>
  <small class="dim">${esc(J.items[it.d].n)} · cấp ${it.lvl}${it.s >= 0 ? ` · <span style="color:${SERIES_COL[it.s]}">hệ ${SERIES[it.s]}</span>` : ''}</small></div></div>
  <div class="sl">${itemLines(it).map(([k, t]) => `<div class="${k}">${esc(t)}</div>`).join('')}</div>`;
}
/* Cong diem tiem nang de du yeu cau Suc manh / Than phap / Sinh khi / Noi cong cua mon do (neu du diem) */
function fixReqPoints(it) {
  const d = reqDeficit(it), need = Object.values(d).reduce((a, b) => a + b, 0);
  if (!need) return false; if (S.attrPts < need) { toast(`Cần ${need} điểm tiềm năng, đang có ${S.attrPts}`); return false; }
  for (const k in d) { S.attr[k] += d[k]; S.attrPts -= d[k]; }
  R.dirty = true; recalc(); toast('Đã cộng điểm để đủ điều kiện'); return true;
}
function cmpLines(it, slot) {
  if (slot) return '';
  const ok = reqOk(it), c = equipCompare(it, !ok), col = v => v > 0.0005 ? 'cp' : v < -0.0005 ? 'cn' : 'dim';
  const row = (n, v, t) => `<span class="${col(v)}">${n} ${t}</span>`;
  const head = ok ? 'So với đang mặc' : 'Nếu đủ điều kiện, so với đang mặc';
  const probs = ok ? [] : reqProblems(it);
  const wrong = DETAIL_SLOT[it.d] === 'weapon' && FAC[S.fac] && FAC[S.fac].wcode >= 0 && weaponCode({ weapon: it }) !== FAC[S.fac].wcode;
  const need = Object.values(reqDeficit(it)).reduce((a, b) => a + b, 0), onlyAttr = probs.length > 0 && probs.length === Object.keys(reqDeficit(it)).length;
  return `<div class="cmp2"><small class="dim">${head}:</small><div class="cmpv">${row('Sức mạnh', c.gain, pctTxt(c.gain))} ${row('DPS', c.dps, pctTxt(c.dps))} ${row('Sinh lực', c.life, numTxt(c.life))} ${row('Né', c.def, numTxt(c.def))} ${row('Kháng TB', c.res, numTxt(c.res) + '%')}</div>
    ${probs.length ? `<div class="reqbad"><b>Chưa mặc được, thiếu:</b><br>${probs.map(esc).join('<br>')}${onlyAttr ? `<br><small>Cần ${need} điểm tiềm năng${S.attrPts >= need ? ` (đang có ${S.attrPts}): bấm "Cộng điểm" để đủ điều kiện` : `, đang có ${S.attrPts}: lên cấp thêm`}.</small>` : ''}</div>` : ''}
    <div class="reqnote"><b>Vì sao:</b><br>${c.why.map(esc).join('<br>')}</div>
    ${wrong ? '<div class="reqnote">Sai loại vũ khí của môn phái: tự mặc sẽ bỏ qua, bạn vẫn mặc tay được.</div>' : ''}</div>`;
}
/* Quet toan bo hanh trang: mac mon cho suc manh that tang nhieu nhat, lap lai den khi het mon manh hon (sau khi len cap / cong diem / roi do) */
function autoEquipAll() {
  if (!S.autoEquip) return 0; let n = 0;
  for (let g = 0; g < 14; g++) {
    let best = null, bg = 0.01;
    for (const it of S.inv) {
      if (!reqOk(it)) continue;
      const f = FAC[S.fac]; if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) continue;
      const gn = equipGain(it); if (gn > bg) { bg = gn; best = it; }
    }
    if (!best) break; equip(best, true); n++;
  }
  if (n) { invDirty = true; R.dirty = true; } return n;
}
function itemModal(it, slot, view = 'item') {
  const cur = !slot && S.eq[slotFor(it)];
  const hasCompare = !!(cur && S.inv.includes(it)), showEquipped = hasCompare && view === 'worn', shown = showEquipped ? cur : it;
  const inert = !showEquipped && slot && !reqOk(it) ? `<div class="reqbad"><b>Đang mặc nhưng CHƯA ĐỦ ĐIỀU KIỆN nên món này KHÔNG có tác dụng gì:</b><br>${reqProblems(it).map(esc).join('<br>')}</div>` : '';   // truoc day mon bi calc() bo qua mot cach im lang
  const segment = hasCompare ? `<div class="item-segment" role="tablist" aria-label="Chọn món để xem">
    <button class="${showEquipped ? '' : 'on'}" role="tab" aria-selected="${showEquipped ? 'false' : 'true'}" data-item-view="item">Đang xem</button>
    <button class="${showEquipped ? 'on' : ''}" role="tab" aria-selected="${showEquipped ? 'true' : 'false'}" data-item-view="worn">Đang mặc</button></div>` : '';
  const compare = showEquipped ? '' : `${inert}${cmpLines(it, slot)}`;
  const actions = showEquipped ? '' : `<div class="btnrow">${slot ? `<button class="btn" id="bUn">Tháo</button>` : `<button class="btn" id="bEq" ${reqOk(it) ? '' : 'disabled'}>Trang bị</button>${!reqOk(it) && Object.keys(reqDeficit(it)).length && reqProblems(it).length === Object.keys(reqDeficit(it)).length ? '<button class="btn" id="bReqPts">Cộng điểm</button>' : ''}<button class="btn red" id="bSell">Bán (${fmt(itemValue(it))})</button>${S.inv.includes(it) ? '<button class="btn" id="bStashIt">Gửi kho</button>' : ''}`}${findItem(it.uid) && it.d <= 10 ? '<button class="btn" id="bForge">Rèn đồ</button>' : ''}${findItem(it.uid) ? `<button class="btn item-lock-btn" id="bLock"><img class="item-lock-icon" src="ui/icons/item-${it.locked ? 'unlocked' : 'locked'}.png" alt="" aria-hidden="true" draggable="false">${it.locked ? 'Mở khóa' : 'Khóa'}</button>` : ''}</div>`;
  modal(`${segment}${itemHTML(shown)}${compare}${actions}`,
  () => { document.querySelectorAll('#mBody [data-item-view]').forEach(b => b.onclick = () => itemModal(it, slot, b.dataset.itemView));
    const b1 = $('#bEq'), b2 = $('#bSell'), b3 = $('#bUn'), b4 = $('#bForge'); const bs = $('#bStashIt'); if (bs) bs.onclick = () => { const r = stashDeposit(it); toast(r.msg); if (r.ok) { closeModal(); refresh(); } }; const bp = $('#bReqPts'); if (bp) bp.onclick = () => { if (fixReqPoints(it)) { if (reqOk(it)) equip(it); else itemModal(it, slot); } };
    const bl = $('#bLock'); if (bl) bl.onclick = () => { it.locked = !it.locked; invDirty = true; save(); toast(it.locked ? 'Đã khóa: không bị tự bán / bán hàng loạt' : 'Đã mở khóa'); itemModal(it, slot); };
    if (b1) b1.onclick = () => equip(it); if (b2) b2.onclick = () => sell(it); if (b3) b3.onclick = () => unequip(slot); if (b4) b4.onclick = () => forgeModal(it); });
  $('#modal').classList.add('item-preview-modal');
}

/* ---------- the: chien truong ---------- */
function renderLog() {
  const z = zoneOf(Math.min(S.stage, STAGES));
  const inActivity = !!(R.tower || R.tk || SV.on);
  const zl = ZONES.map((q, i) => {
    const first = i * ZONE_STAGES + 1, open = S.maxStage >= first, cur = zoneIdx(Math.min(S.stage, STAGES)) === i;
    return `<button class="zrow${cur ? ' cur' : ''}${open ? '' : ' lock'}" data-z="${i}" ${open && !inActivity ? '' : 'disabled'}><b>${esc(q.n)}</b><span>Cấp ${q.lo}–${q.hi}</span></button>`;
  }).join('');
  $('#t-log').innerHTML = `${quickBarHTML()}${todoHTML()}<div class="card stagectl"><div><b>${esc(z.n)}</b> · Ải ${inZone(S.stage)}/${ZONE_STAGES}${isBossStage(S.stage) ? ' <span class="boss">(Trùm)</span>' : ''}<br><small class="dim">Quái cấp ${stageLevel(S.stage)} · ngũ hành: ${z.sw.map((w, i) => w ? `<span style="color:${SERIES_COL[i]}">${SERIES[i]}</span>` : '').filter(Boolean).join(' ')}</small></div>
    <div class="row"><button class="btn sm" id="bPrev" ${inActivity ? 'disabled' : ''}>◀</button><button class="btn sm ${S.push ? 'on' : ''}" id="bPush" ${inActivity ? 'disabled' : ''}>${S.push ? 'Vượt ải' : 'Luyện công'}</button><button class="btn sm" id="bNext" ${!inActivity && S.stage < S.maxStage ? '' : 'disabled'}>▶</button></div></div>
    <div class="log" id="logBox">${R.logs.map(l => `<div>${l}</div>`).join('')}</div>
    <h3>Bản đồ luyện công</h3><div class="zlist">${zl}</div>`;
  bindTodo(); bindQuickBar();
  $('#bPrev').onclick = () => gotoStage(S.stage - 1);
  $('#bNext').onclick = () => gotoStage(S.stage + 1);
  $('#bPush').onclick = () => { S.push = !S.push; renderLog(); };
  document.querySelectorAll('.zrow').forEach(b => b.onclick = () => gotoStage(+b.dataset.z * ZONE_STAGES + 1));
}
function renderLogOnly() { const b = $('#logBox'); if (b) b.innerHTML = R.logs.map(l => `<div>${l}</div>`).join(''); }
function gotoStage(st) {
  if (R.tower || R.tk || SV.on) { toast('Hãy rời trận trước khi đổi bản đồ'); return; }
  st = clamp(st, 1, S.maxStage); if (st === S.stage && !R.town) return;
  const prevZone = zoneOf(Math.min(S.stage, STAGES)), wasTown = R.town;
  S.stage = st; S.wave = 1; S.push = false;
  R.enemies = []; R.field = null; R.corpses = []; R.moveTo = null; R.pickTarget = null; INPUT.target = null; R.spawnT = 0.3;
  const z = zoneOf(Math.min(S.stage, STAGES));
  if (wasTown) { R.town = false; R.tpCd = TP_CD; $('#townBar').classList.add('hidden'); }
  if (wasTown || z.id !== prevZone.id) {
    onZoneChange(z); R.zoneShown = z.id;
    R.banner = { t: 2.4, text: z.n, sub: 'Đã dịch chuyển đến bản đồ' };
  }
  log(`Dịch chuyển đến <b>${esc(z.n)}</b> · Ải ${inZone(S.stage)}.`); save(); refresh();
  toast(`Đã dịch chuyển đến ${z.n}`);
}

/* ---------- the: nhan vat ---------- */
const ATTR_VI = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' };
function renderChar() {
  const P = R.P, f = FAC[S.fac];
  const eq = SLOTS.map(([k, vi]) => `<div class="slot" data-slot="${k}">${S.eq[k] ? itemCell(S.eq[k]) : `<span>${vi}</span>`}</div>`).join('');
  const attrs = Object.keys(ATTR_VI).map(k => `<div class="attr"><span>${ATTR_VI[k]}</span><b>${Math.round(P[k])}</b><span class="pm"><button class="plus" data-a="${k}" ${S.attrPts ? '' : 'disabled'}>+</button><button class="minus" data-a="${k}" title="Rút lại 1 điểm · ${fmt(pointRefundCost('attr'))} lượng" ${S.attr[k] > 0 ? '' : 'disabled'}>−</button></span></div>`).join('');
  const deadWorn = Object.values(S.eq).filter(it => it && !reqOk(it));
  const res = ELEM.map(e => `<span>Kháng ${ELEM_VI[e]}</span><span>${Math.round(P.res[e])}%</span>`).join('');
  $('#t-char').innerHTML = `<div class="card"><b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b> · hệ ${SERIES[f.series]} · Cấp ${S.lvl}${S.chal ? ' · <b>Thử thách ' + chalName() + '</b>' : ''}<br><small class="dim">Lực chiến ${fmt(R.power)}</small> <button class="btn sm" id="bPower">Chi tiết</button></div>
    ${deadWorn.length ? `<div class="reqbad"><b>⚠ ${deadWorn.length} món đang mặc chưa đủ điều kiện nên KHÔNG có tác dụng:</b> ${deadWorn.map(it => esc(viName(it.n)) + ' (' + esc(reqProblems(it).join('; ')) + ')').join(' · ')}</div>` : ''}
    <div class="eqgrid">${eq}</div>
    <p class="dim small">Dòng ẩn (2, 4, 6) của mỗi món mở khi hệ nhân vật hoặc 2 món liên kết <b>tương sinh</b> với hệ món đó (Kim→Thủy→Mộc→Hỏa→Thổ→Kim). Đang mở: ${SLOTS.filter(([k]) => S.eq[k] && S.eq[k].mag.length > 1).map(([k, vi]) => `${vi} ${hiddenActive(S.eq[k])}/${Math.floor(S.eq[k].mag.length / 2)}`).join(' · ') || '—'}</p>
    <h3>Tiềm năng <small>${S.attrPts} điểm</small> <button class="btn sm soft-red" id="bRespecAt" ${sumObj(S.attr) ? '' : 'disabled'} title="Tẩy tiềm năng · ${fmt(respecQuote('attr').gold)} lượng">Tẩy · ${fmt(respecQuote('attr').gold)} lượng</button> <button class="btn sm" id="bSugAt">Gợi ý</button></h3><div class="card">${attrs}</div>
    <h3>Chỉ số</h3><div class="card stats">
      <span>Sinh lực</span><span>${fmt(P.life)}</span><span>Nội lực</span><span>${fmt(P.mana)}</span>
      <span>Sát thương vũ khí</span><span>${Math.round(P.wmin)}–${Math.round(P.wmax)}</span>
      ${P.stamina || P.staminaRegen ? `<span>Thể lực tối đa</span><span>${fmt(P.stamina)}</span>${P.staminaRegen ? `<span>Hồi thể lực / 0,5 giây</span><span>${fmt(P.staminaRegen)}</span>` : ''}` : ''}
      <span>Chiêu chính</span><span>${esc(P.main.n)} (${fmt(P.main.tot)})</span>
      <span>Chính xác</span><span>${Math.round(P.ar)}</span><span>Né tránh</span><span>${Math.round(P.def)}</span>
      <span>Chí mạng</span><span>${Math.round(P.main.crit)}%</span><span>Tốc độ đánh ngoại công</span><span>${P.aspdPhys.toFixed(2)}</span>
      <span>Tốc độ đánh nội công</span><span>${P.aspdSpell.toFixed(2)}</span>${res}</div>`;
  document.querySelectorAll('#t-char .plus').forEach(b => b.onclick = () => { if (!S.attrPts) return; S.attrPts--; S.attr[b.dataset.a]++; R.dirty = true; recalc(); renderChar(); });
    $('#bPower').onclick = powerModal; $('#bSugAt').onclick = suggestModal; $('#bRespecAt').onclick = () => respecModal('attr', renderChar);

  document.querySelectorAll('#t-char .minus').forEach(b => b.onclick = () => unspendAttr(b.dataset.a));
  document.querySelectorAll('#t-char .slot .it').forEach(b => b.onclick = () => itemModal(findItem(b.dataset.uid), b.parentNode.dataset.slot));
}

/* ---------- the: ky nang ---------- */
/* Rut lai 1 diem ky nang (cong nham): tra diem, bo chieu khoi o / chieu chinh khi ve 0 */
function unlearnSkill(id) {
  const L = S.sk[id] || 0; if (!L) return false;
  const fee = chargePointRefund('skill'); if (!fee) return false;
  if (L <= 1 && SK[id] && SK[id].book) (S.bkOk || (S.bkOk = {}))[id] = 1;
  if (L <= 1) delete S.sk[id]; else S.sk[id] = L - 1;
  S.skPts++;
  if (!S.sk[id] && S.main === id) S.mainLock = false;
  R.dirty = true; recalc(); fillSlots(); renderSkill(); renderPad(); updateDots(); save();
  toast(`Rút 1 điểm: ${SK[id].n} ${S.sk[id] || 0}/${SK[id].max} · −${fmt(fee)} lượng`);
  return true;
}
/* Rut lai 1 diem tiem nang */
function unspendAttr(k) {
  if (!(S.attr[k] > 0)) return false;
  const fee = chargePointRefund('attr'); if (!fee) return false;
  S.attr[k]--; S.attrPts++; R.dirty = true; recalc(); renderChar(); updateDots(); save(); toast(`Rút 1 điểm ${ATTR_VI[k]} · −${fmt(fee)} lượng`); return true;
}
const SK_HIDE = /^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|addskilldamage|skill_)/;
function skillEffectLines(s, L) {
  const out = [];
  for (const name in s.attr) {
    if (SK_HIDE.test(name) || !J.attrDesc[name]) continue;
    const p = skVal(s, name, L); if (!p) continue;
    const t = attrText(name, p); if (t && !/^\s*$/.test(t)) out.push(t);
  }
  return out;
}
function skillToggleHTML(s) {
  if (!s || !(S.sk[s.id] > 0)) return '';
  if (skKind(s) === 'aura') return `<button type="button" class="btn sm" data-skill-toggle="${s.id}">${auraActive(s.id) ? 'Tắt vòng sáng' : 'Bật vòng sáng'}</button>`;
  if (skKind(s) === 'buff') return `<button type="button" class="btn sm" data-skill-toggle="${s.id}">${skillBuffEnabled(s.id) ? 'Tắt bùa lợi' : 'Bật bùa lợi'}</button>`;
  return '';
}
function bindSkillToggles(root) {
  if (!root) return;
  root.querySelectorAll('[data-skill-toggle]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const id = +b.dataset.skillToggle, inModal = !!b.closest('#mBody');
    if (skKind(SK[id]) === 'aura') {
      const off = S.auraOff || (S.auraOff = {}); if (off[id]) delete off[id]; else off[id] = 1;
      toast(`${off[id] ? 'Tắt' : 'Bật'} vòng sáng: ${SK[id].n}`);
    } else if (skKind(SK[id]) === 'buff') {
      const off = S.buffOff || (S.buffOff = {});
      if (off[id]) { delete off[id]; toast(S.autoBuff === false ? `${SK[id].n} bật; bật Tự duy trì trong Thiết lập Auto để thi triển` : `Đã bật ${SK[id].n}`); }
      else { off[id] = 1; if (R.skillBuffUntil) R.skillBuffUntil[id] = 0; toast(`Đã tắt ${SK[id].n}`); }
    } else return;
    R.dirty = true; recalc(); save(); renderPad(); updateDots();
    if (inModal) skillModal(id); else renderSkill();
  });
}
/* Thong tin ky nang: mo ta, yeu cau, hieu qua o cap hien tai va cap ke tiep, sat thuong / noi luc / tam danh */
function skillModal(id) {
  const s = SK[id]; if (!s) return;
  const L = S.sk[id] || 0, act = isAttack(s), Le = skillLv(id), show = Math.max(1, Le), next = L < s.max ? L + 1 : 0;   // QA-088: Le = cap HIEU DUNG (da hoc + thuong trang bi)
  const kind = skillTypeLabel(s), buffHint = skillBuffHint(s, show), auraHint = skillAuraHint(s);
  const lines = (lv) => skillEffectLines(s, lv).map(t => `<div>${esc(t)}</div>`).join('') || '<div class="dim">—</div>';
  let atk = '';
  if (act) {
    const a = activeInfo(R.P, s, show);   // QA-088: dung cap hieu dung, khop voi P.main luc chien dau
    atk = `<div class="card stats"><span>Sát thương mỗi nhịp</span><span>${fmt(a.tot / a.strikes)}${a.strikes > 1 ? ` × ${a.strikes} nhịp` : ''}</span><span>Tổng sát thương</span><span>${fmt(a.tot)}</span><span>DPS ước tính</span><span>${fmt(a.dps)}</span>${a.crossSkillPct ? `<span>Hiệp lực nội / ngoại công</span><span>+${a.crossSkillPct}%</span>` : ''}<span>Nội lực tiêu hao</span><span>${Math.round(a.cost)}</span><span>Tầm đánh</span><span>${Math.round(a.rad)}</span><span>Mục tiêu</span><span>${a.targets > 1 ? 'nhiều (tối đa ' + a.targets + ')' : 'đơn'}</span></div>`;
  }
  const weaponHint = act ? skillWeaponHint(s) : '', bookHint = skillBookHint(s);
  modal(`<h3>${esc(s.n)} <small>${Le}/${s.max}${Le > L ? ` <b style="color:#8fe34a">(+ ${Le - L} từ trang bị)</b>` : ''}</small></h3>
    <p class="desc">${esc(s.d || 'Không có mô tả.')}</p>
    <div class="idet"><span class="tag${act ? ' attack' : ''}">${esc(kind)}</span><small class="dim">Yêu cầu cấp ${s.req}${S.lvl < s.req ? ` (bạn cấp ${S.lvl})` : ''}${weaponHint ? ` · ${weaponHint}` : ''}${bookHint ? ` · ${esc(bookHint)}` : ''}${buffHint ? ` · ${esc(buffHint)}` : ''}${auraHint ? ` · ${esc(auraHint)}` : ''}</small></div>
    ${atk}
    <div class="sl"><b>${L ? 'Cấp hiện tại ' + Le + (Le > L ? ` (học ${L} + ${Le - L} trang bị)` : '') : 'Nếu học (cấp 1)'}</b>${lines(show)}</div>
    ${next && L ? `<div class="sl"><b>Cấp kế tiếp ${next}</b>${lines(next)}</div>` : ''}
    <div class="btnrow">${skillToggleHTML(s)}${act && L && !weaponHint ? '<button class="btn" id="skMain">Chọn làm chiêu chính</button>' : ''}<button class="btn" id="skPlus" ${canLearn(s) ? '' : 'disabled'}>+ Cộng điểm</button><button class="btn red" id="skMinus" ${L ? '' : 'disabled'}>− Rút điểm · ${fmt(pointRefundCost('skill'))} lượng</button></div>`, () => {
    bindSkillToggles($('#mBody'));
    const m = $('#skMain'); if (m) m.onclick = () => { S.main = s.id; S.mainLock = true; R.dirty = true; recalc(); renderSkill(); skillModal(id); };
    $('#skPlus').onclick = () => { if (!skillLearnPoint(id)) return; uiSfx('learn'); R.dirty = true; recalc(); renderSkill(); save(); skillModal(id); };
    $('#skMinus').onclick = () => { if (unlearnSkill(id)) skillModal(id); };
  });
}
function renderSkill() {
  const f = FAC[S.fac];
  const rows = f.skills.map(id => {
    const s = SK[id], L = S.sk[id] || 0, act = isAttack(s);
    const a = act && L ? activeInfo(R.P, s, skillLv(+id)) : null;   // QA-088: cap hieu dung
    const weaponHint = act ? skillWeaponHint(s) : '', bookHint = skillBookHint(s), kind = skillTypeLabel(s), buffHint = skillBuffHint(s), auraHint = skillAuraHint(s);
    return `<div class="skl${S.lvl < s.req || weaponHint ? ' lock' : ''}${R.P.main.id === +id ? ' main' : ''}" data-id="${id}">
      <img class="sic" src="${escRaw(s.ic || '')}" alt=""><div class="info"><b>${esc(s.n)}</b> <span class="tag${act ? ' attack' : ''}">${esc(kind)}</span>
      <small>${weaponHint ? `${esc(weaponHint)} · ` : ''}Cấp yêu cầu ${s.req}${bookHint ? ` · ${esc(bookHint)}` : ''}${buffHint ? ` · ${esc(buffHint)}` : ''}${auraHint ? ` · ${esc(auraHint)}` : ''}${a ? ` · ${fmt(a.tot)} tổng${a.strikes > 1 ? ` · ${a.strikes} nhịp` : ''} · ${a.targets > 1 ? 'nhiều mục tiêu' : 'đơn mục tiêu'}` : ''}</small>${skillToggleHTML(s) ? `<div>${skillToggleHTML(s)}</div>` : ''}</div>
      <span class="lvl">${skillLv(+id)}/${s.max}</span><span class="pm"><button class="plus" data-id="${id}" title="Cộng 1 điểm" ${canLearn(s) ? '' : 'disabled'}>+</button><button class="minus" data-id="${id}" title="Rút lại 1 điểm · ${fmt(pointRefundCost('skill'))} lượng" ${L > 0 ? '' : 'disabled'}>−</button><button class="skinfo" data-id="${id}" title="Thông tin kỹ năng">i</button></span>
      ${act && L ? `<div class="slots">Ô: ${[0, 1, 2, 3].map(i => `<button data-slot="${i}" data-sid="${id}" class="${(S.slots || [])[i] === +id ? 'on' : ''}" ${weaponHint ? 'disabled' : ''} title="${weaponHint || 'Gán vào ô kỹ năng'}">${i + 1}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
  $('#t-skill').innerHTML = `<h3>${esc(f.n)} <small>${S.skPts} điểm kỹ năng · Võ Lâm Mật Tịch 90 ×${matHave('misc', 'bk90')}</small> <button class="btn sm" id="bSugSk">Gợi ý</button></h3><p class="dim small">Cài đặt tự dùng và xoay chiêu trong nút cờ-lê cạnh Auto. Chạm vào chiêu tấn công đã học để khóa làm chiêu chính${S.mainLock ? ' (<a id="bAutoMain">bỏ khóa</a>)' : ' (đang tự chọn chiêu mạnh nhất)'}.</p>${rows}`;
  document.querySelectorAll('#t-skill .plus').forEach(b => b.onclick = e => { e.stopPropagation(); const id = +b.dataset.id; if (!skillLearnPoint(id)) return; uiSfx('learn'); R.dirty = true; recalc(); renderSkill(); save(); });
  bindSkillToggles($('#t-skill'));
  document.querySelectorAll('#t-skill .minus').forEach(b => b.onclick = e => { e.stopPropagation(); unlearnSkill(+b.dataset.id); });
  document.querySelectorAll('#t-skill .skinfo').forEach(b => b.onclick = e => { e.stopPropagation(); skillModal(+b.dataset.id); });
  document.querySelectorAll('#t-skill .slots button').forEach(b => b.onclick = e => { e.stopPropagation(); assignSlot(+b.dataset.slot, +b.dataset.sid); renderSkill(); });
  $('#bSugSk').onclick = suggestModal;
  $('#t-skill').insertAdjacentHTML('beforeend', buildsHTML()); bindBuilds(renderSkill);
  const am = $('#bAutoMain'); if (am) am.onclick = () => { S.mainLock = false; R.dirty = true; recalc(); renderSkill(); };
  document.querySelectorAll('#t-skill .skl').forEach(r => r.onclick = () => { const s = SK[r.dataset.id]; if (isAttack(s) && S.sk[s.id] && skillWeaponOk(s)) { S.main = s.id; S.mainLock = true; R.dirty = true; recalc(); renderSkill(); } else skillModal(s.id); });
}

/* ---------- the: tui do ---------- */
function renderInv() {
  invDirty = false;
  const f = lootFilter();
  const rar = RAR_VI.map((n, i) => `<option value="${i}" ${f.minRar === i ? 'selected' : ''}>${n}</option>`).join('');
  const lv = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${f.minLvl === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('');
  const grp = LOOT_ATTR_GROUPS.map(([n], i) => `<label class="chip2"><input type="checkbox" data-g="${i}" ${f.groups.includes(i) ? 'checked' : ''}>${n}</label>`).join('');
  const ser = SERIES.map((n, i) => `<label class="chip2" style="color:${SERIES_COL[i]}"><input type="checkbox" data-s="${i}" ${f.series.includes(i) ? 'checked' : ''}>${n}</label>`).join('');
  const potionCells = J.potions.filter(p => (potStock(p.kind)[p.tier] || 0) > 0)
    .map(p => `<button type="button" class="it potion-inv-cell" data-potion-kind="${p.kind}" data-potion-tier="${p.tier}" title="${esc(p.n)} · còn ${potStock(p.kind)[p.tier]} bình" aria-label="${esc(p.n)}, còn ${potStock(p.kind)[p.tier]} bình"><img src="${escRaw(p.ic || '')}" alt="" draggable="false"><i>${potStock(p.kind)[p.tier]}</i></button>`).join('');
  const onGround = R.ground.length, match = R.ground.filter(d => lootMatch(d.it)).length;
  $('#t-inv').innerHTML = `<div class="invbar"><span>${invUsed()}/${invMax()}</span><span class="sp"></span>
    <button class="btn sm" id="bExpandInv" ${invExpansionCount() >= INV_EXPANSION_MAX ? 'disabled' : ''}>${invExpansionCount() >= INV_EXPANSION_MAX ? 'Túi đã tối đa' : `Mở rộng túi · ${fmt(inventoryExpansionCost())} lượng`}</button>
    <button class="btn sm" id="bStash">Kho chung</button><button class="btn sm" id="bBest">Mặc đồ tốt</button><button class="btn sm red" id="bSellAll">Bán đồ</button></div>
    <div class="dim small inv-reorder-hint">Kéo món lên ô khác để đổi chỗ; kéo bình sang Bán đồ hoặc Kho chung · điện thoại: nhấn giữ rồi kéo</div><div class="invgrid">${potionCells}${S.inv.map((it, i) => itemCell(it, i)).join('')}</div>
    <h3>Đồ rơi trên đất <small>${onGround} món · ${match} khớp bộ lọc</small></h3>
    <div class="card lootf">
      <div class="row">Độ hiếm từ <select id="fRar">${rar}</select> · cấp đồ từ <select id="fLvl">${lv}</select></div>
      <div class="dim small">Có ít nhất một thuộc tính (bỏ trống = mọi thuộc tính):</div><div class="chips">${grp}</div>
      <div class="dim small">Hệ của món đồ (bỏ trống = mọi hệ):</div><div class="chips">${ser}</div>
      <div class="dim small">Bật/tắt và chọn loại đồ tự nhặt ở nút cờ-lê → Nhặt đồ. Đồ tồn tại ${GROUND_LIFETIME} giây; chạm vào món trên sân để nhặt tay. Trên ${GROUND_MAX} món thì món cũ nhất tự bán. Khi vắng mặt, đồ không khớp tự bán.</div>
    </div>`;
  const upd = () => { save(); renderInv(); };
  $('#fRar').onchange = e => { f.minRar = +e.target.value; upd(); };
  $('#fLvl').onchange = e => { f.minLvl = +e.target.value; upd(); };
  document.querySelectorAll('#t-inv [data-g]').forEach(b => b.onchange = () => { const g = +b.dataset.g; f.groups = b.checked ? [...new Set(f.groups.concat(g))] : f.groups.filter(x => x !== g); upd(); });
  document.querySelectorAll('#t-inv [data-s]').forEach(b => b.onchange = () => { const v = +b.dataset.s; f.series = b.checked ? [...new Set(f.series.concat(v))] : f.series.filter(x => x !== v); upd(); });
  $('#bStash').onclick = () => stashModal();
  $('#bExpandInv').onclick = () => storageUpgradeModal('inventory');
  $('#bBest').onclick = () => { for (const it of S.inv.slice()) if (betterThanEquipped(it)) equip(it, true); refresh(); };
  $('#bSellAll').onclick = () => sellChoiceModal();
  document.querySelectorAll('#t-inv .it').forEach(b => b.onclick = () => b.dataset.potionTier
    ? potionInventoryModal(b.dataset.potionKind, +b.dataset.potionTier)
    : itemModal(findItem(b.dataset.uid)));
  invOrderBind();
}

/* ---------- the: khac ---------- */
function autoSettingsModal() {
  if (typeof fillSlots === 'function') fillSlots();
  const f = lootFilter(), noPot = S.chal === 'nopot';
  const row = (label, id, checked, disabled = false) => `<label class="ios-switch-row"><span>${label}</span><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="ios-switch" aria-hidden="true"></span></label>`;
  const hpMpRow = (label, toggle, valueKey) => `<div class="auto-threshold"><label class="ios-switch-row"><span>${label}</span><input type="checkbox" id="${toggle}" ${S[toggle === 'cAutoHp' ? 'autoHpPotion' : toggle === 'cAutoMp' ? 'autoMpPotion' : 'autoTownHp'] ? 'checked' : ''} ${noPot && toggle !== 'cAutoTown' ? 'disabled' : ''}><span class="ios-switch" aria-hidden="true"></span></label><div class="auto-stepper"><button type="button" data-step="${valueKey}" data-delta="-1" aria-label="Giảm ngưỡng">‹</button><span id="${valueKey}Value">${S[valueKey]}%</span><button type="button" data-step="${valueKey}" data-delta="1" aria-label="Tăng ngưỡng">›</button></div></div>`;
  const range = ['near', 'medium', 'far'].map((v, i) => `<button type="button" data-auto-range="${v}" aria-pressed="${S.autoRange === v}">${['Gần', 'Vừa', 'Xa'][i]}</button>`).join('');
  const skills = (S.slots || [0, 0, 0, 0]).map((id, i) => {
    const s = SK[id], enabled = (S.autoSkillSlots || [true, true, true, true])[i] !== false;
    return `<label class="auto-skill ${s ? '' : 'empty'}" title="${s ? esc(s.n) : `Ô kỹ năng ${i + 1} trống`}">${s && s.ic ? `<img src="${esc(s.ic)}" alt="">` : `<span class="auto-skill-empty">${i + 1}</span>`}<small>${s ? esc(s.n) : 'Trống'}</small><input type="checkbox" data-auto-skill="${i}" ${enabled ? 'checked' : ''} ${s ? '' : 'disabled'} aria-label="Tự dùng ${s ? esc(s.n) : `ô ${i + 1}`}"><i class="auto-mini-switch" aria-hidden="true"></i></label>`;
  }).join('');
  modal(`<div class="auto-config">
    <h3>Thiết lập Auto</h3>
    <section class="auto-section"><h4>Chiến đấu</h4>
      ${row('Tự tìm và đuổi theo mục tiêu', 'cAutoFind', S.autoFind)}
      ${row('Tự đánh quái', 'cAutoAttack', S.autoAtk !== false)}
      ${row('Ưu tiên Boss / Tinh anh', 'cBossPrio', S.autoBossPriority !== false)}
      <div class="auto-range"><span>Phạm vi tìm</span><div id="autoRange" role="group" aria-label="Phạm vi tìm mục tiêu">${range}</div></div>
      <small class="dim">Tắt tìm mục tiêu thì nhân vật chỉ đánh quái đang ở trong tầm chiêu.</small>
    </section>
    <section class="auto-section"><h4>Kỹ năng</h4>
      ${row('Tự dùng kỹ năng', 'cAutoSkills', S.autoSkills !== false)}
      ${row('Xoay chiêu khi farm', 'cRot', S.rot !== false)}
      ${row('Tự duy trì bùa lợi', 'cAutoBuff', S.autoBuff !== false)}
      ${row('Tự dùng bùa hại', 'cAutoCurse', S.autoCurse !== false)}
      <div class="auto-skill-grid">${skills}</div>
      <small class="dim">Chỉ dùng chiêu gán ở ô 1–4; Auto ưu tiên chiêu mạnh và đủ nội lực. Bùa lợi và bùa hại tự duy trì khi đủ nội lực.</small>
    </section>
    <section class="auto-section"><h4>HP / MP</h4>
      ${hpMpRow('Tự dùng HP khi dưới', 'cAutoHp', 'hpPotionAt')}
      ${hpMpRow('Tự dùng MP khi dưới', 'cAutoMp', 'mpPotionAt')}
      ${hpMpRow('Về thành khi HP thấp', 'cAutoTown', 'townHpAt')}
      ${noPot ? '<small class="dim">Thử thách Bất dược không cho dùng thuốc.</small>' : `<small class="dim">Thuốc có sẵn được dùng trước; nếu hết, game mua bằng vàng khi đủ ngân lượng. Đã dùng ${fmt(S.potUsed || 0)} bình.</small>`}
    </section>
    <section class="auto-section"><h4>Nhặt đồ</h4>
      ${row('Tự nhặt đồ khớp bộ lọc', 'cAutoLoot', f.auto !== false)}
      <div class="auto-checks">${row('Trang bị', 'cLootEquipment', f.equipment !== false)}${row('Vật liệu', 'cLootMaterials', f.materials !== false)}${row('Đồ trắng', 'cLootWhite', f.white === true)}</div>
      ${row('Bỏ qua Hoàng Kim / Bạch Kim có yêu cầu cấp thấp hơn nhân vật', 'cLootSkipLowSets', f.skipLowSets !== false)}
      <small class="dim">Ngưỡng cấp, độ hiếm và thuộc tính vẫn chỉnh trong Hành trang. Vật liệu rơi được cộng thẳng vào kho.</small>
    </section>
    <section class="auto-section"><h4>Trang bị & tiện ích</h4>
      ${row('Tự mặc đồ tốt hơn khi nhặt', 'cAutoEquip', S.autoEquip)}
      ${row('Tự bán đồ yếu hoặc sai phái', 'cAutoJunk', S.autoJunk !== false)}
      ${row('Tự cộng điểm tiềm năng và võ công', 'cAutoPts', S.autoPts === true)}
      ${row('Tự rèn trang bị · mỗi 30 giây', 'cAutoForge', S.autoForge)}
      ${row('Tự mua vũ khí mạnh hơn ở Biện Kinh · tối đa 60% vàng', 'cAutoBuy', S.autoBuy !== false)}
    </section>
    <div class="auto-footer"><small class="dim">Thiết lập được lưu theo nhân vật.</small><button type="button" class="btn sm" id="bAutoDefaults">Mặc định</button></div>
  </div>`, bindAutoSettings);
}
function resetAutoSettings() {
  Object.assign(S, {
    autoFind: true, autoAtk: true, autoBossPriority: true, autoRange: 'medium',
    autoSkills: true, autoSkillSlots: [true, true, true, true], rot: true, autoBuff: true, autoCurse: true,
    autoHpPotion: true, hpPotionAt: 50, autoMpPotion: true, mpPotionAt: 30,
    autoTownHp: false, townHpAt: 20, autoEquip: true, autoJunk: true,
    autoPts: false, autoForge: false, autoBuy: true, potOff: false,
  });
  S.buffOff = {};
  if (S.chal === 'nopot') { S.autoHpPotion = false; S.autoMpPotion = false; S.potOff = true; }
  Object.assign(lootFilter(), { auto: true, equipment: true, materials: true, white: false, skipLowSets: true });
  R.moveTo = null; R.dirty = true; save(); renderPad(); autoSettingsModal(); toast('Đã khôi phục cài đặt Auto mặc định');
}
function bindAutoSettings() {
  $('#cAutoFind').onchange = e => { S.autoFind = e.target.checked; save(); };
  $('#cAutoAttack').onchange = e => { S.autoAtk = e.target.checked; R.moveTo = null; renderPad(); save(); };
  $('#cBossPrio').onchange = e => { S.autoBossPriority = e.target.checked; save(); };
  $('#autoRange').querySelectorAll('[data-auto-range]').forEach(b => b.onclick = () => { S.autoRange = b.dataset.autoRange; save(); autoSettingsModal(); });
  $('#cAutoSkills').onchange = e => { S.autoSkills = e.target.checked; save(); };
  $('#cRot').onchange = e => { S.rot = e.target.checked; R.dirty = true; save(); };
  const autoBuff = $('#cAutoBuff'); if (autoBuff) autoBuff.onchange = e => { S.autoBuff = e.target.checked; save(); renderSkill(); };
  const autoCurse = $('#cAutoCurse'); if (autoCurse) autoCurse.onchange = e => { S.autoCurse = e.target.checked; save(); };
  document.querySelectorAll('#mBody [data-auto-skill]').forEach(e => e.onchange = () => { S.autoSkillSlots[e.dataset.autoSkill] = e.checked; save(); });
  $('#cAutoHp').onchange = e => { S.autoHpPotion = e.target.checked; S.potOff = !S.autoHpPotion && !S.autoMpPotion; save(); };
  $('#cAutoMp').onchange = e => { S.autoMpPotion = e.target.checked; S.potOff = !S.autoHpPotion && !S.autoMpPotion; save(); };
  $('#cAutoTown').onchange = e => { S.autoTownHp = e.target.checked; save(); };
  document.querySelectorAll('#mBody [data-step]').forEach(b => b.onclick = () => {
    const key = b.dataset.step, value = clamp((+S[key] || 0) + (+b.dataset.delta * 10), 10, 90);
    S[key] = value; $('#'+key+'Value').textContent = `${value}%`; save();
  });
  $('#cAutoLoot').onchange = e => { lootFilter().auto = e.target.checked; save(); };
  $('#cLootEquipment').onchange = e => { lootFilter().equipment = e.target.checked; save(); };
  $('#cLootMaterials').onchange = e => { lootFilter().materials = e.target.checked; save(); };
  $('#cLootWhite').onchange = e => { lootFilter().white = e.target.checked; save(); };
  $('#cLootSkipLowSets').onchange = e => { lootFilter().skipLowSets = e.target.checked; save(); };
  $('#cAutoEquip').onchange = e => { S.autoEquip = e.target.checked; save(); };
  $('#cAutoJunk').onchange = e => { S.autoJunk = e.target.checked; save(); };
  $('#cAutoPts').onchange = e => { S.autoPts = e.target.checked; if (S.autoPts) { autoSpendAttrs(); autoSpendSkills(); recalc(); updateDots(); } save(); };
  $('#cAutoForge').onchange = e => { S.autoForge = e.target.checked; if (S.autoForge) autoForge(); save(); };
  $('#cAutoBuy').onchange = e => { S.autoBuy = e.target.checked; save(); };
  $('#bAutoDefaults').onclick = resetAutoSettings;
}
function renderMore() {
  const isLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname.toLowerCase());
  const adminChu = (typeof adminDaDung === 'function' && adminDaDung()) ? 'Hôm nay đã dùng — xem' : 'Mở bảng thử nghiệm';
  const speedNow = (typeof gameSpeed === 'function') ? gameSpeed() : 1;
  $('#t-more').innerHTML = `
    <h3>Nhân vật</h3><div class="card lootf">
      <div class="row">Tên <input id="cName" maxlength="16" value="${esc(S.name || '')}" style="flex:1"></div>
      <div class="row">Giới tính <select id="cSex"><option value="0" ${S.sex ? '' : 'selected'}>Nam</option><option value="1" ${S.sex ? 'selected' : ''}>Nữ</option></select></div>
      <div class="btnrow"><button class="btn" id="bName">Lưu tên và giới tính</button></div>
      <small class="dim">Trang bị không hợp giới tính sẽ tự tháo.</small></div>
    <h3>Tốc độ & thử nghiệm</h3><div class="card lootf">
      <div class="row">Tốc độ <select id="cSpeed">${[1, 1.5, 2.5].map(v => `<option value="${v}" ${speedNow === v ? 'selected' : ''}>x${v}</option>`).join('')}</select> <small class="dim">Tăng tốc trận đấu</small></div>
      ${isLocalHost ? `<div class="row"><span>Thử nghiệm</span><small class="dim" style="flex:1">Mở 1 tính năng mỗi ngày.</small><button class="btn sm" id="bAdmin">${adminChu}</button></div><div class="row"><span>Biên tập map</span><small class="dim" style="flex:1">Chỉnh block và lưu kèm backup.</small><a class="btn sm" href="edit_map.html" target="_blank" rel="noopener">Mở</a></div>` : ''}</div>
    <h3>Lưu game</h3><div class="card"><p class="dim small">Game tự lưu trên thiết bị này. Tải file để sao lưu hoặc chuyển nhân vật sang thiết bị khác.</p>
    <div class="btnrow"><button class="btn" id="bDl">Tải file lưu (.jxsave)</button><button class="btn" id="bFile">Nạp từ file</button></div>
    <p class="dim small">Hoặc chuyển bằng mã:</p><div class="btnrow"><button class="btn" id="bExp">Xuất mã</button><button class="btn" id="bImp">Nhập mã</button></div><textarea id="saveTxt" rows="4" placeholder="Mã lưu game"></textarea></div>
    <h3>Âm thanh</h3><div class="card lootf">
      <label class="ios-switch-row"><span>Hiệu ứng âm thanh</span><input type="checkbox" id="sOn" ${sndCfg().on ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label>
      <div class="row">Âm lượng <input type="range" id="sVol" min="0" max="1" step="0.05" value="${sndCfg().vol}"></div>
      <label class="ios-switch-row"><span>Nhạc nền</span><input type="checkbox" id="mOn" ${sndCfg().music ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label>
      <div class="row">Nhạc <input type="range" id="mVol" min="0" max="1" step="0.05" value="${sndCfg().mvol}"></div></div>
    <h3>Độ khó và trợ giúp</h3><div class="card lootf">
      <div class="row">Độ khó <select id="sDiff" ${S.chal === 'hard' ? 'disabled' : ''}>${DIFFS.map((d, i) => `<option value="${i}" ${diffOf() === d ? 'selected' : ''}>${d.n}</option>`).join('')}</select> <small class="dim">${esc(diffOf().d)}</small></div>
      <div class="btnrow"><button class="btn" id="bStashM">Kho chung</button><button class="btn" id="bTut">Hướng dẫn</button><button class="btn" id="bCodex">Bách khoa</button><button class="btn" id="bSug">Gợi ý cộng điểm</button></div></div>
    <h3>Trợ năng</h3><div class="card lootf">
      <div class="row">Cỡ chữ <select id="uFs">${UI_FS.map((v, i) => `<option value="${i}" ${uiPrefs().fs === i ? 'selected' : ''}>${UI_FS_NAME[i]}</option>`).join('')}</select></div>
      <label class="ios-switch-row"><span>Tiết kiệm pin</span><input type="checkbox" id="uSaver" ${uiPrefs().saver ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label>
      <small class="dim">Tay cầm: cần/D-pad di chuyển · A/B/X/Y dùng chiêu · LB/RB uống thuốc · Start tạm dừng. Esc đóng hộp thoại.</small></div>
    <h3>Điều khiển & Hiển thị</h3><div class="card setting-switches"><label class="ios-switch-row"><span>Joystick cố định (tắt để kéo theo ngón tay)</span><input type="checkbox" id="cJoy" ${joyFixed() ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label>
      <label class="ios-switch-row"><span>Hiển thị trang bị trên nhân vật (mũ, áo, vũ khí, ngựa)</span><input type="checkbox" id="cJxLook" ${S.jxLook !== false ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label>
      <label class="ios-switch-row"><span>Giảm hiệu ứng để game mượt hơn</span><input type="checkbox" id="cLowFx" ${giamHieuUng() ? 'checked' : ''}><span class="ios-switch" aria-hidden="true"></span></label></div>
    <div class="btnrow"><button class="btn" id="bSwitch">Đổi nhân vật / slot</button><button class="btn red" id="bReset">Xóa nhân vật</button></div>`;
  $('#bName').onclick = () => {
    setAppearance($('#cName').value, +$('#cSex').value);
    R.dirty = true; recalc(); save(); renderMore(); toast('Đã lưu: ' + S.name + ' · ' + (S.sex ? 'Nữ' : 'Nam'));
  };
  $('#cSpeed').onchange = () => { S.speed = +$('#cSpeed').value === 2.5 ? 2.5 : (+$('#cSpeed').value === 1.5 ? 1.5 : 1); save(); toast('Tốc độ game x' + S.speed); };
  const bAdmin = $('#bAdmin'); if (bAdmin) bAdmin.onclick = () => { if (typeof adminModal === 'function') adminModal(); };
  $('#bDl').onclick = () => { if (downloadSaveFile()) toast('Đã tải file lưu: ' + saveFileName()); };
  $('#bFile').onclick = () => pickSaveFile(null);
  $('#bExp').onclick = () => { $('#saveTxt').value = exportSave(); toast('Đã xuất mã'); };
  $('#bImp').onclick = () => importFlow($('#saveTxt').value, null);
  $('#sOn').onchange = e => { audInit(); sndCfg().on = e.target.checked; audApply(); save(); };
  $('#mOn').onchange = e => { audInit(); sndCfg().music = e.target.checked; audApply(); if (sndCfg().music) playMusic(R.town ? W.town.id : zoneOf(Math.min(S.stage, STAGES)).id); save(); };
  const setSfxVolume = e => { audInit(); sndCfg().vol = +e.target.value; audApply(); };
  const setMusicVolume = e => { audInit(); sndCfg().mvol = +e.target.value; audApply(); };
  $('#sVol').oninput = setSfxVolume; $('#sVol').onchange = e => { setSfxVolume(e); save(); };
  $('#mVol').oninput = setMusicVolume; $('#mVol').onchange = e => { setMusicVolume(e); save(); };
  $('#cJoy').onchange = e => { S.joy = e.target.checked ? 'fixed' : 'float'; save(); };
  $('#cJxLook').onchange = e => { S.jxLook = e.target.checked; R.dirty = true; recalc(); save(); toast(e.target.checked ? 'Hiển thị trang bị trên nhân vật' : 'Dùng ngoại hình môn phái'); };
  $('#cLowFx').onchange = e => { S.lowFx = e.target.checked ? 1 : 0; save(); };
  $('#sDiff').onchange = e => { S.diff = +e.target.value; R.enemies = []; R.spawnT = 0.3; save(); toast('Độ khó: ' + diffOf().n); renderMore(); };
  $('#bStashM').onclick = () => stashModal(); $('#bTut').onclick = () => tutorialModal(0); $('#bCodex').onclick = () => codexModal(); $('#bSug').onclick = suggestModal;
  $('#uFs').onchange = e => { setUiPref({ fs: +e.target.value }); }; $('#uSaver').onchange = e => setUiPref({ saver: e.target.checked });
  $('#bSwitch').onclick = () => switchCharacter();
  $('#bReset').onclick = () => modal(`<h3>Xóa nhân vật?</h3><p class="desc">Xóa nhân vật ở slot ${SLOT + 1} (${esc(FAC[S.fac] ? FAC[S.fac].n : '')} cấp ${S.lvl}). Toàn bộ tiến trình của slot này sẽ mất; các slot khác không ảnh hưởng.</p><div class="btnrow"><button class="btn red" id="bYes">Xóa</button></div>`, () => $('#bYes').onclick = () => deleteSlot(SLOT));
}

/* ---------- khung chung ---------- */
function showTab(t) {
  const changed = curTab !== t;
  curTab = t;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('hidden', el.id !== 't-' + t));
  if (changed) {
    document.querySelectorAll('.tab.tab-entering').forEach(el => el.classList.remove('tab-entering'));
    clearTimeout(tabEnterTimer);
    const activeTab = document.getElementById && document.getElementById('t-' + t);
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (activeTab && !reduceMotion) {
      void activeTab.offsetWidth;
      activeTab.classList.add('tab-entering');
      tabEnterTimer = setTimeout(() => activeTab.classList.remove('tab-entering'), 320);
    }
  }
  refresh();
}
function refresh() {
  if (!S.fac) return;
  if (R.dirty) recalc();
  ({ log: renderLog, char: renderChar, skill: renderSkill, inv: renderInv, more: renderMore })[curTab]();
  renderPad();
  updateDots();
}
function updateDots() { $('#dotChar').classList.toggle('on', S.attrPts > 0); $('#dotSkill').classList.toggle('on', S.skPts > 0 && FAC[S.fac] && FAC[S.fac].skills.some(id => canLearn(SK[id]))); }
function updateTop() {
  const P = R.P; if (!P) return;
  { const hw = W.hero[S.fac], lb = $('.lvbox'); if (hw && lb) lb.style.setProperty('--pl', `url('${hw.img}')`); }
  $('#lv').textContent = S.lvl; $('#gold').textContent = fmt(S.gold); $('#heroName').textContent = FAC[S.fac] ? FAC[S.fac].n : '';
  let buffs = $('#skBuffs');
  if (!buffs) { buffs = document.createElement('div'); buffs.id = 'skBuffs'; $('#battle').appendChild(buffs); }
  const activeBuffs = stateIcons();
  const buffHTML = activeBuffs.map(x => `<div class="sti" title="${esc(x.n)}"><img src="${escRaw(x.ic || '')}" alt=""><b>${fmtLeft(x.t)}</b></div>`).join('');
  if (buffs.innerHTML !== buffHTML) buffs.innerHTML = buffHTML;
  const q = !R.tower && !R.tk && !R.town && R.field && R.field.quest;
  $('#stageLbl').textContent = R.tk ? `Tống Kim · đợt ${R.tk.wave}/${TK_WAVES} · ${R.tk.score + R.tk.kills} điểm` :
    R.tower ? `Tháp · tầng ${R.tower.floor} · còn ${alive().length} quái` :
    `Ải ${S.stage} · đợt ${S.wave}/${WAVES}` + (q ? ` · hạ ${Math.min(q.kills,q.target)}/${q.target}${q.boss && !q.boss.dead ? ' · Trùm' : ''}` : '');
  const need = J.exp[S.lvl - 1] || 1;
  $('#xpBar').style.width = (S.xp / need * 100) + '%'; $('#xpTxt').textContent = `${(S.xp / need * 100).toFixed(1)}%`;
  $('#hpBar').style.width = (R.life / P.life * 100) + '%'; $('#hpTxt').textContent = `${fmt(R.life)} / ${fmt(P.life)}`;
  $('#mpBar').style.width = (R.mana / P.mana * 100) + '%'; $('#mpTxt').textContent = `${fmt(R.mana)} / ${fmt(P.mana)}`;
  $('#mainSk').textContent = P.main.n;
}
/* Nap tu file .jxsave (hoac ma van ban): chon slot dich, canh bao ghi de, roi tai lai trang */
function pickSaveFile(after) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.jxsave,.json,.txt,application/json,text/plain'; inp.style.display = 'none';
  inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return; const r = new FileReader(); r.onload = () => importFlow(String(r.result), after); r.onerror = () => toast('Không đọc được file'); r.readAsText(f); };
  document.body.appendChild(inp); inp.click();
}
function importFlow(txt, after, slot) {
  let st; try { st = parseSaveText(txt); } catch (e) { toast(e.message || 'File không hợp lệ'); return; }
  const f = FAC[st.fac], desc = `${esc(f.n)} cấp ${Math.max(1, Math.min(MAX_LEVEL, st.lvl | 0))}`;
  const rows = [...Array(SLOT_N).keys()].map(i => { const o = slotInfo(i), g = o && FAC[o.fac];
    return `<div class="slotrow ${o ? '' : 'empty'}"><span><b>Slot ${i + 1}</b><small>${o && g ? esc(g.n) + ' cấp ' + o.lvl + ' (sẽ bị ghi đè)' : 'Trống'}</small></span><button class="btn ${o ? 'red' : ''}" data-into="${i}">${o ? 'Ghi đè' : 'Nạp vào'}</button></div>`; }).join('');
  modal(`<h3>Nạp file lưu</h3><p class="desc">Nhân vật trong file: <b>${desc}</b>. Chọn slot để nạp (slot đã có nhân vật sẽ giữ một bản sao lưu).</p><div class="slotlist">${rows}</div>${after ? '<div class="btnrow"><button class="btn" id="impBack">Quay lại</button></div>' : ''}`, () => {
    document.querySelectorAll('#mBody [data-into]').forEach(b => b.onclick = () => { try { if (SLOT === +b.dataset.into) SAVE_LOCK = true; writeSlot(+b.dataset.into, st); } catch (e) { toast(e.message); return; } location.reload(); });
    const bk = $('#impBack'); if (bk) bk.onclick = after;
  }, !!after && !S.fac);
}
/* Man hinh chon nhan vat: 3 slot. Chon / tao -> dat con tro roi tai lai trang; xoa co buoc xac nhan rieng */
function slotMenu(confirmDel) {
  const rows = [...Array(SLOT_N).keys()].map(i => {
    const o = slotInfo(i), f = o && FAC[o.fac];
    if (!o || !f) return `<div class="slotrow empty"><span><b>Slot ${i + 1}</b><small>Trống</small></span><button class="btn" data-play="${i}">Tạo nhân vật</button></div>`;
    const ago = o.last ? new Date(o.last).toLocaleString('vi-VN') : '';
    if (confirmDel === i) return `<div class="slotrow del"><span><b>Xóa slot ${i + 1}?</b><small>${esc(f.n)} cấp ${o.lvl} sẽ mất vĩnh viễn</small></span><button class="btn red" data-del-yes="${i}">Xóa</button><button class="btn" data-del-no="1">Hủy</button></div>`;
    return `<div class="slotrow"><img src="${escRaw((W.hero[o.fac] || {}).img || '')}" alt=""><span><b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b><small>Cấp ${o.lvl} · ải ${o.stage}${ago ? ' · ' + esc(ago) : ''}</small></span><button class="btn" data-play="${i}">Chơi</button><button class="btn red" data-del="${i}">Xóa</button></div>`;
  }).join('');
  modal(`<h3>Chọn nhân vật</h3><p class="desc">Mỗi slot là một nhân vật riêng, lưu độc lập.</p><div class="slotlist">${rows}</div><div class="btnrow"><button class="btn" id="slotImp">Nạp từ file lưu (.jxsave)</button></div>`, () => {
    $('#slotImp').onclick = () => pickSaveFile(() => slotMenu());
    document.querySelectorAll('#mBody [data-play]').forEach(b => b.onclick = () => { try { localStorage.setItem(SLOT_PTR, b.dataset.play); } catch (e) { /* bo qua */ } SAVE_LOCK = true; location.reload(); });
    document.querySelectorAll('#mBody [data-del]').forEach(b => b.onclick = () => slotMenu(+b.dataset.del));
    document.querySelectorAll('#mBody [data-del-no]').forEach(b => b.onclick = () => slotMenu());
    document.querySelectorAll('#mBody [data-del-yes]').forEach(b => b.onclick = () => deleteSlot(+b.dataset.delYes));
  }, true);
}
function pickFaction() {
  const cards = FACTIONS.map(f => `<button data-f="${f.key}" style="--c:${SERIES_COL[f.series]}"><img src="${(W.hero[f.key] || {}).img || ''}" alt=""><b>${esc(f.n)}</b><small>hệ ${SERIES[f.series]}</small><i class="s5b" style="background-image:url('ui/s${f.series}.png')"></i></button>`).join('');
  modal(`<h3>Chọn môn phái</h3><p class="desc">Mỗi phái thuộc một hệ ngũ hành. Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim.</p><div class="card lootf"><div class="row">Tên nhân vật <input id="pfName" maxlength="16" placeholder="Tân thủ" style="flex:1"></div><div class="row">Giới tính <select id="pfSex"><option value="">Theo phái (Nga My / Thúy Yên là nữ)</option><option value="0">Nam</option><option value="1">Nữ</option></select></div><div class="row">Thử thách <select id="pfChal">${CHALLENGES.map(c => `<option value="${c.k}">${c.n} — ${c.d}</option>`).join('')}</select></div><small class="dim">Thử thách không đổi được sau khi tạo. Để trống thì lấy tên phái. Mặc định Nga My / Thúy Yên là nữ. Đổi lại được ở thẻ Khác.</small></div><div class="facpick">${cards}</div>`, () => {
    document.querySelectorAll('.facpick button').forEach(b => b.onclick = () => { const ne = $('#pfName'), sx = $('#pfSex'); startFaction(b.dataset.f, ne ? ne.value : '', (sx && sx.value !== '') ? +sx.value : null, ($('#pfChal') || {}).value || ''); });   // de trong gioi tinh = theo mac dinh cua phai
  }, true);
}
const NOTICE_TXT = 'JxOffline - Phi thương mại, ưu tiên giải trí trên chính thiết bị của mình';
/* Hien moi lan khoi tao nhan vat moi */
function noticeModal() {
  modal(`<h3>JxOffline</h3><p class="desc notice">${esc(NOTICE_TXT)}</p><div class="btnrow"><button class="btn" id="bNotice">Đã hiểu</button></div>`, () => { $('#bNotice').onclick = () => { closeModal(true); if (!S.tut) tutorialModal(0); }; });
  log(`<span class="dim">${esc(NOTICE_TXT)}</span>`);
}
function startFaction(key, tenNguoi, gioiTinh, chal) {
  const f = FAC[key]; S.fac = key; S.chal = CHALLENGES.some(c => c.k === chal) ? chal : '';   // thu thach: luat rieng, khong doi duoc
  if (S.chal === 'nopot') { S.potOff = true; S.autoHpPotion = false; S.autoMpPotion = false; }
  // A: nguoi choi duoc tu dat ten va chon gioi tinh; de trong / khong truyen thi lay mac dinh theo phai
  S.sex = (gioiTinh === 0 || gioiTinh === 1) ? gioiTinh : (['emei', 'cuiyan'].includes(key) ? 1 : 0); S.sexSet = 1;   // sexSet: migrate() khong ghi de ve mac dinh cua phai
  S.name = (typeof tenNguoi === 'string' && tenNguoi.trim()) ? tenNguoi.trim().slice(0, 16) : f.n;
  if (f.starter) { S.sk[f.starter] = 1; S.skPts = Math.max(0, S.skPts - 1); S.main = f.starter; }
  starterGear();
  R.dirty = true; recalc(); R.life = R.P.life; R.mana = R.P.mana;
  loginCheck(); dotGift();                                  // ngay dau: co qua diem danh
  closeModal(true); save(); showTab('log');
  noticeModal();
  log(`Gia nhập <b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b>. Bắt đầu hành tẩu giang hồ!`);
}
function starterGear() {
  if (S.eq.weapon) return;
  const f = FAC[S.fac];
  const wc = f.wcode >= 0 ? f.wcode : 0;
  const it = wc === 7 ? makeItem(1, 0, 1, 0) : makeItem(0, wc === 9 ? 6 : wc, 1, 0);
  if (it) S.eq.weapon = it;
  const ar = makeItem(2, sexPart(2, 0), 1, 0); if (ar && sexOk(ar)) S.eq.armor = ar;
}
