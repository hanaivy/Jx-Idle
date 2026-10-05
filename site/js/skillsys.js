/* ======================= VO CONG: bua loi, bua hai, vong sang ======================= */
'use strict';
const FPS_JX = 18;
const WXG_POISON = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7];
const AURA_DMG = { 69: { el: 'poison', every: 4, rad: 200, tab: WXG_POISON, col: '#8fe34a' } };
const AURA_SK = {};
const auraSkill = id => AURA_SK[id] || (AURA_SK[id] = Object.assign({}, SK[id], { aura: 0, attr: { poisondamage_v: AURA_DMG[id].tab.map(v => [v, 60, 10]) } }));
const hasSkillCost = s => !!(s && s.attr && s.attr.skill_cost_v && s.attr.skill_cost_v.some(v => Number(v) > 0));
function skKind(s) {
  if (!s) return 'none';
  if (isAttack(s)) return 'attack';
  if (s.aura) return Object.keys(s.attr || {}).length || AURA_DMG[s.id] ? 'aura' : 'none';
  if (!hasSkillCost(s)) return 'passive';
  return s.enemy ? 'curse' : 'buff';
}
const SK_KIND_VI = { attack: 'Tấn công', passive: 'Bị động', buff: 'Bùa lợi', aura: 'Vòng sáng', curse: 'Bùa hại', none: '—' };
const skDur = (s, L) => {
  let frames = 0;
  for (const name in s.attr || {}) {
    if (/^(skill_|missle_|addskilldamage)/.test(name)) continue;
    const p = skVal(s, name, L); if (p) frames = Math.max(frames, p[1] || 0);
  }
  return frames / FPS_JX;
};
const skCost = (s, L) => (skVal(s, 'skill_cost_v', L) || [0])[0] || 0;
const skClock = () => R.skillClock || 0;
const skillBuffActive = id => (R.skillBuffUntil && R.skillBuffUntil[id] || 0) > skClock() && !!S.sk[id];
const skillBuffEnabled = id => !(S.buffOff || {})[id];
const skillAuraEnabled = id => !!S.sk[id] && !(S.auraOff || {})[id];
const auraList = () => Object.keys(S.sk || {}).filter(id => S.sk[id] && SK[id] && skKind(SK[id]) === 'aura' && skillAuraEnabled(id)).map(Number);
const auraActive = id => auraList().includes(+id);
function skApplies(s) {
  const k = skKind(s);
  if (k === 'passive') return true;
  if (k === 'buff') return skillBuffActive(s.id);
  if (k === 'aura') return auraActive(s.id) && !AURA_DMG[s.id];
  return false;
}
function skillTypeLabel(s) {
  const k = skKind(s);
  if (k === 'attack') return s.phys ? 'Ngoại công' : 'Nội công';
  return SK_KIND_VI[k] || 'Nội tại';
}
function skillBuffHint(s, L = skillLv(s.id)) {
  const k = skKind(s); if (k !== 'buff') return '';
  const left = Math.max(0, (R.skillBuffUntil && R.skillBuffUntil[s.id] || 0) - skClock());
  const status = !skillBuffEnabled(s.id) ? 'đã tắt' : S.autoBuff === false ? 'tự duy trì đang tắt' : left > 0 ? `đang có ${Math.ceil(left)} giây` : 'sẽ tự thi triển';
  return `Bùa lợi ${Math.round(skDur(s, Math.max(1, L)))} giây · ${status}`;
}
function skillAuraHint(s) {
  if (skKind(s) !== 'aura') return '';
  if (AURA_DMG[s.id]) return `Vòng sáng độc ${auraActive(s.id) ? 'đang bật' : 'đang tắt'} · mỗi ${AURA_DMG[s.id].every}s`;
  return `Vòng sáng ${auraActive(s.id) ? 'đang bật' : 'đang tắt'}`;
}
const fmtLeft = seconds => seconds < 0 ? 'N/A' : seconds >= 3600 ? `${Math.floor(seconds / 3600)}h` : seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${Math.ceil(seconds)}s`;
function stateIcons() {
  const out = [];
  for (const id of auraList()) if (SK[id]) out.push({ ic: SK[id].ic, t: -1, n: `Vòng sáng: ${SK[id].n}` });
  const now = skClock();
  for (const id in (R.skillBuffUntil || {})) {
    const until = R.skillBuffUntil[id];
    if (until > now && SK[id] && S.sk[id]) out.push({ ic: SK[id].ic, t: until - now, n: SK[id].n });
  }
  return out;
}
function curseMod(e) {
  if (!e || !e.curse) return null;
  const now = skClock(), m = { res: {}, def: 0, ar: 0, dmg: 0, ret: 0, slow: 0, move: 0, regen: 0, poison: 0, crit: 0 };
  for (const id in e.curse) {
    if (e.curse[id] <= now) continue;
    const s = SK[id], L = (S.sk[id] || 1) + ((R.P && R.P.plusSkill) || 0); if (!s) continue;
    m.any = true;
    for (const name in s.attr) {
      if (/^(skill_|missle_|addskilldamage)/.test(name)) continue;
      const p = skVal(s, name, L); if (!p) continue; const v = p[0];
      if (name === 'allres_p') for (const el of ELEM) m.res[el] = (m.res[el] || 0) + v;
      else if (/res_p$/.test(name)) { const el = name.startsWith('physics') ? 'phys' : name.startsWith('lighting') ? 'light' : name.replace('res_p', ''); m.res[el] = (m.res[el] || 0) + v; }
      else if (name === 'adddefense_v') m.def += v;
      else if (name === 'attackratingenhance_p') m.ar += v;
      else if (name === 'addphysicsdamage_p') m.dmg += v;
      else if (name === 'meleedamagereturn_p') m.ret -= v;
      else if (name === 'fasthitrecover_v') m.slow -= v;
      else if (name === 'fastwalkrun_p') m.move -= v;
      else if (name === 'lifereplenish_v') m.regen += v;
      else if (name === 'poisontimereduce_p') m.poison -= v;
      else if (name === 'deadlystrikeenhance_p') m.crit += v;
    }
  }
  return m.any ? m : null;
}
function auraDamageTick(dt) {
  for (const id of auraList()) {
    const A = AURA_DMG[id]; if (!A || !R.P || !R.P.main || R.town || R.deadT > 0) continue;
    const timers = R.auraClock || (R.auraClock = {}); timers[id] = (timers[id] || 0) - dt;
    if (timers[id] > 0) continue; timers[id] = A.every;
    const L = Math.min(30, (S.sk[id] || 1) + (R.P.plusSkill || 0));
    const raw = activeInfo(R.P, auraSkill(id), L).parts.poison || 0; if (!(raw > 0)) continue;
    for (const e of R.enemies) {
      if (e.dead || e.hp <= 0 || Math.hypot(e.x - H.x, e.y - H.y) > A.rad) continue;
      const cm = curseMod(e), res = cm ? Object.fromEntries(ELEM.map(x => [x, (e.res[x] || 0) + (cm.res[x] || 0)])) : e.res;
      const d = applyPart(raw * rnd(0.9, 1.1) * (cm && cm.poison ? 1 + cm.poison / 100 : 1), 'poison', heroSeries(), e.series, res, 75, R.P.series5 || 0);
      const left = e.poison > 0 ? e.poisonDmg * e.poison : 0;
      e.poisonDmg = (left + d) / POISON_TIME; e.poison = POISON_TIME;
    }
  }
}
let skSysT = 0;
function skillSysTick(dt) {
  R.skillClock = skClock() + dt;
  auraDamageTick(dt);
  skSysT -= dt; if (skSysT > 0) return; skSysT = 0.5;
  if (!S.fac || !R.P || R.deadT > 0 || R.town) return;
  const now = skClock(), timers = R.skillBuffUntil || (R.skillBuffUntil = {}), cd = R.skillBuffCd || (R.skillBuffCd = {});
  for (const id in timers) if (timers[id] > 0 && timers[id] <= now) { timers[id] = 0; R.dirty = true; }
  const fight = R.enemies.some(e => !e.dead && e.hp > 0);
  for (const id in S.sk) {
    const s = SK[id], level = S.sk[id] || 0; if (!s || !level) continue;
    const kind = skKind(s), L = skillLv(+id), cost = skCost(s, L), duration = skDur(s, L);
    if (kind === 'buff' && S.autoBuff !== false && skillBuffEnabled(id) && !skillBuffActive(id)) {
      if (duration < 5) {
        if (!fight || R.life >= R.P.life * 0.6 || (cd[id] || 0) > now || R.mana < cost + R.P.mana * 0.15) continue;
        const p = skVal(s, 'lifereplenish_v', L); R.mana -= cost; heal((p ? p[0] : 0) * duration * 2, false); cd[id] = now + 8;
      } else if (duration > 0 && R.mana >= cost + R.P.mana * 0.15) {
        R.mana -= cost; timers[id] = now + duration; R.dirty = true;
        addText(H.x, H.y - 58, '✦ ' + s.n, '#ffe48a', 12);
        if (typeof castFx === 'function') castFx({ id: +id });
      }
    } else if (kind === 'curse' && S.autoCurse !== false && fight && R.mana >= cost + R.P.mana * 0.15) {
      const targets = R.enemies.filter(e => !e.dead && e.hp > 0 && !(e.curse && e.curse[id] > now)).sort((a, b) => (b.cls === 'boss') - (a.cls === 'boss') || (b.cls === 'elite') - (a.cls === 'elite') || Math.hypot(a.x - H.x, a.y - H.y) - Math.hypot(b.x - H.x, b.y - H.y));
      const e = targets[0]; if (!e || Math.hypot(e.x - H.x, e.y - H.y) > 420 || (e.cls === 'normal' && R.enemies.filter(x => !x.dead).length < 3)) continue;
      R.mana -= cost; const until = now + Math.min(duration || 60, 60);
      for (const target of R.enemies) if (!target.dead && (target === e || Math.hypot(target.x - e.x, target.y - e.y) < 120)) (target.curse || (target.curse = {}))[id] = until;
      if (typeof castFx === 'function') castFx({ id: +id });
      const stun = skVal(s, 'stun_p', L);
      if (stun && stun[0] > 0 && Math.random() * 100 < stun[0]) e.stun = Math.max(e.stun || 0, (stun[1] || 0) / FPS_JX);
      addText(e.x, e.y - e.r - 22, '☠ ' + s.n, '#d38bff', 11);
    }
  }
}
