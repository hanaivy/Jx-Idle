/* ======================= TAY DIEM + BO VO HOC (3 bo / nhan vat) =======================
   Tẩy điểm có phí vàng theo cấp và nhịp vàng rơi; lưu 3 bộ (điểm, ô chiêu, chiêu chính) để đổi lối chơi nhanh. */
'use strict';
const BUILD_N = 3;
const sumObj = o => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);
const respecCost = kind => Math.round(Math.max(1, S.lvl) * (kind === 'skill' ? 200 : 100) * goldRateScale());
const pointRefundCost = kind => Math.max(1, Math.round(Math.max(1, S.lvl) * (kind === 'skill' ? 20 : 10) * goldRateScale()));
function chargePointRefund(kind) {
  const cost = pointRefundCost(kind);
  if (S.gold < cost) { toast(`Cần ${fmt(cost)} lượng để rút lại 1 điểm`); return 0; }
  S.gold -= cost; return cost;
}
function respecAttrs() { const n = sumObj(S.attr); if (!n) return 0; S.attrPts += n; S.attr = { str: 0, dex: 0, vit: 0, eng: 0 }; R.dirty = true; return n; }
function respecSkills() {
  const n = sumObj(S.sk); if (!n) return 0;
  S.skPts += n; S.sk = {}; S.slots = [0, 0, 0, 0]; S.main = 0; S.mainLock = false; R.dirty = true; return n;
}
function respecQuote(scope) {
  const attrs = scope === 'skill' ? 0 : sumObj(S.attr), skills = scope === 'attr' ? 0 : sumObj(S.sk);
  return { attrs, skills, gold: (attrs ? respecCost('attr') : 0) + (skills ? respecCost('skill') : 0) };
}
function respecPoints(scope) {
  const q = respecQuote(scope);
  if (!q.attrs && !q.skills) return { ok: false, msg: 'Chưa có điểm đã cộng để tẩy' };
  if (S.gold < q.gold) return { ok: false, msg: `Cần ${fmt(q.gold)} lượng để tẩy, còn thiếu ${fmt(q.gold - S.gold)}` };
  S.gold -= q.gold;
  const attrs = q.attrs ? respecAttrs() : 0, skills = q.skills ? respecSkills() : 0;
  recalc(); fillSlots(); R.dirty = true;
  return { ok: true, attrs, skills, gold: q.gold, msg: `Đã trả ${attrs} điểm tiềm năng và ${skills} điểm kỹ năng · phí ${fmt(q.gold)} lượng` };
}
function respecModal(scope, rerender) {
  const q = respecQuote(scope);
  if (!q.attrs && !q.skills) { toast('Chưa có điểm đã cộng để tẩy'); return; }
  const title = scope === 'attr' ? 'Tẩy điểm tiềm năng?' : scope === 'skill' ? 'Tẩy điểm kỹ năng?' : 'Tẩy toàn bộ điểm?';
  const points = [q.attrs ? `${q.attrs} điểm tiềm năng` : '', q.skills ? `${q.skills} điểm kỹ năng` : ''].filter(Boolean).join(' và ');
  const lack = Math.max(0, q.gold - S.gold);
  modal(`<h3>${title}</h3><p class="desc">Trả ${points} về kho để cộng lại. Phí: <b>${fmt(q.gold)} lượng</b> · hiện có ${fmt(S.gold)} lượng.${lack ? `<br><span class="bad">Còn thiếu ${fmt(lack)} lượng.</span>` : ''}${scope !== 'attr' ? '<br>Ô chiêu và chiêu chính sẽ được xóa.' : ''}</p>
    <div class="btnrow"><button class="btn red" id="rsYes" ${lack ? 'disabled' : ''}>Tẩy · ${fmt(q.gold)} lượng</button><button class="btn" id="rsNo">Để sau</button></div>`, () => {
    $('#rsYes').onclick = () => {
      const result = respecPoints(scope); if (!result.ok) { toast(result.msg); return; }
      closeModal(true); save(); updateDots(); rerender(); toast(result.msg);
    };
    $('#rsNo').onclick = () => closeModal(true);
  });
}
function builds() { if (!Array.isArray(S.builds)) S.builds = []; while (S.builds.length < buildN()) S.builds.push(null); return S.builds; }
function buildSave(i) {
  if (!Number.isInteger(i) || i < 0 || i >= buildN()) return { ok: false, msg: 'Ô bộ võ học chưa mở' };
  builds()[i] = { attr: Object.assign({}, S.attr), sk: Object.assign({}, S.sk), slots: (S.slots || [0, 0, 0, 0]).slice(), main: S.main, mainLock: !!S.mainLock, lvl: S.lvl, at: Date.now() };
  return { ok: true, msg: `Đã lưu bộ ${i + 1}` };
}
const samePoints = (a, b) => { const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]); return [...keys].every(k => (+((a || {})[k]) || 0) === (+((b || {})[k]) || 0)); };
function buildLoadCost(i) {
  const b = builds()[i]; if (!b) return 0;
  return (samePoints(S.attr, b.attr) ? 0 : respecCost('attr')) + (samePoints(S.sk, b.sk) ? 0 : respecCost('skill'));
}
/* Dùng một bộ: chỉ thu phí khi bộ mới đổi phân bổ điểm; bộ không đủ điểm thì từ chối, không thay đổi gì. */
function buildLoad(i) {
  if (!Number.isInteger(i) || i < 0 || i >= buildN()) return { ok: false, msg: 'Ô bộ võ học chưa mở' };
  const b = builds()[i]; if (!b) return { ok: false, msg: 'Bộ trống' };
  const attrs = ['str', 'dex', 'vit', 'eng'], validPoints = n => Number.isSafeInteger(n) && n >= 0;
  if (!b.attr || !b.sk || Object.entries(b.attr).some(([k, n]) => !attrs.includes(k) || !validPoints(n)) || Object.values(b.sk).some(n => !validPoints(n)))
    return { ok: false, msg: 'Bộ võ học có điểm không hợp lệ' };
  const haveA = S.attrPts + sumObj(S.attr), haveS = S.skPts + sumObj(S.sk);
  const needA = sumObj(b.attr), needS = sumObj(b.sk);
  if (needA > haveA || needS > haveS) return { ok: false, msg: `Không đủ điểm cho bộ ${i + 1} (cần ${needA} tiềm năng / ${needS} kỹ năng, bạn có ${haveA} / ${haveS})` };
  for (const id in b.sk) { const s = SK[id]; if (!s || !FAC[S.fac].skills.includes(+id) || S.lvl < s.req || b.sk[id] > s.max) return { ok: false, msg: `Bộ ${i + 1} có chiêu không phù hợp (${s ? s.n : id})` }; }
  const cost = buildLoadCost(i);
  if (S.gold < cost) return { ok: false, msg: `Cần ${fmt(cost)} lượng để đổi phân bổ điểm, còn thiếu ${fmt(cost - S.gold)}` };
  S.gold -= cost;
  S.attrPts = haveA - needA; S.attr = Object.assign({ str: 0, dex: 0, vit: 0, eng: 0 }, b.attr);
  S.skPts = haveS - needS; S.sk = Object.assign({}, b.sk);
  const attack = id => S.sk[id] && SK[id] && isAttack(SK[id]);
  S.slots = Array.from({ length: 4 }, (_, j) => attack((b.slots || [])[j]) ? +b.slots[j] : 0);
  S.main = attack(b.main) ? +b.main : 0; S.mainLock = !!(b.mainLock && S.main);
  R.dirty = true; recalc(); fillSlots(); return { ok: true, msg: `Đã dùng bộ ${i + 1}${cost ? ` · phí ${fmt(cost)} lượng` : ''}` };
}
function buildsHTML() {
  const rows = builds().slice(0, buildN()).map((b, i) => { const cost = b ? buildLoadCost(i) : 0; return `<div class="qrow"><span><b>Bộ ${i + 1}</b><small>${b ? `${sumObj(b.sk)} điểm kỹ năng · ${sumObj(b.attr)} tiềm năng · lưu ở cấp ${b.lvl}` : 'Trống'}</small></span><span></span>
    <span class="pm build-actions"><button class="btn sm" data-bsave="${i}">Lưu</button><button class="btn sm" data-bload="${i}" title="${b ? cost ? `Đổi điểm tốn ${fmt(cost)} lượng` : 'Chỉ đổi ô chiêu: miễn phí' : ''}" ${b ? '' : 'disabled'}>Dùng${b ? cost ? ` · ${fmt(cost)}` : '' : ''}</button></span></div>`; }).join('');
  const qSkill = respecQuote('skill'), qAll = respecQuote('all');
  return `<h3>Bộ võ học <small>đổi lối chơi nhanh</small></h3><div class="card">${rows}<div class="btnrow"><button class="btn red" id="bRespecSkill" ${qSkill.skills ? '' : 'disabled'}>Tẩy kỹ năng · ${fmt(qSkill.gold)} lượng</button><button class="btn red" id="bRespecAll" ${qAll.attrs || qAll.skills ? '' : 'disabled'}>Tẩy toàn bộ · ${fmt(qAll.gold)} lượng</button></div><small class="dim">Rút từng điểm bằng nút − cũng tốn vàng.</small></div>`;
}
function bindBuilds(rerender) {
  const done = r => { toast(r.msg); save(); updateDots(); rerender(); };
  document.querySelectorAll('#t-skill [data-bsave]').forEach(b => b.onclick = () => done(buildSave(+b.dataset.bsave)));
  document.querySelectorAll('#t-skill [data-bload]').forEach(b => b.onclick = () => done(buildLoad(+b.dataset.bload)));
  const rs = $('#bRespecSkill'); if (rs) rs.onclick = () => respecModal('skill', rerender);
  const ra = $('#bRespecAll'); if (ra) ra.onclick = () => respecModal('all', rerender);
}
