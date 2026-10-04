/* ======================= AM THANH (window.JS tu tools/extract_sound.py) ======================= */
'use strict';
const SND = window.JS || { music: {}, npc: {}, skill: {}, ui: {} };
const AUD = { ctx: null, gain: null, buf: {}, loading: {}, last: {}, voices: 0, music: null, musicSrc: '', musicElement: null, musicSource: null, musicGain: null };
const SFX_GAP = 0.07, MAX_VOICES = 10;
function sndCfg() { return S.snd || (S.snd = { on: true, vol: 0.7, music: true, mvol: 0.4 }); }
function audInit() { // trinh duyet chi cho phat sau lan cham dau tien
  if (AUD.ctx) { if (AUD.ctx.state === 'suspended') AUD.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  AUD.ctx = new AC(); AUD.gain = AUD.ctx.createGain(); AUD.gain.connect(AUD.ctx.destination); audApply();
}
function audMusicGain() {
  if (!AUD.ctx || !AUD.music) return null;
  if (AUD.musicElement !== AUD.music) {
    try {
      AUD.musicSource = AUD.ctx.createMediaElementSource(AUD.music);
      AUD.musicGain = AUD.ctx.createGain();
      AUD.musicSource.connect(AUD.musicGain); AUD.musicGain.connect(AUD.ctx.destination);
      AUD.musicElement = AUD.music; AUD.music.volume = 1;
    } catch (e) { AUD.musicSource = AUD.musicGain = AUD.musicElement = null; return null; }
  }
  return AUD.musicGain;
}
function audApply() {
  const c = sndCfg();
  if (AUD.gain) AUD.gain.gain.value = c.on ? c.vol : 0;
  if (AUD.music) {
    const gain = audMusicGain(), volume = c.music ? c.mvol : 0;
    if (gain && AUD.ctx) gain.gain.setTargetAtTime(volume, AUD.ctx.currentTime, 0.025);
    else AUD.music.volume = volume;
    if (!c.music) AUD.music.pause(); else if (AUD.music.paused) AUD.music.play().catch(() => {});
  }
}
function audLoad(src) {
  if (AUD.buf[src] || AUD.loading[src] || !AUD.ctx) return;
  AUD.loading[src] = true;
  fetch(src).then(r => r.arrayBuffer()).then(b => AUD.ctx.decodeAudioData(b)).then(buf => { AUD.buf[src] = buf; })
    .catch(() => { AUD.buf[src] = null; });
}
function sfx(src, vol = 1, rate = 1) {
  if (!src || R.quiet || !AUD.ctx || !sndCfg().on) return;
  const now = AUD.ctx.currentTime;
  if (AUD.last[src] && now - AUD.last[src] < SFX_GAP) return;
  const buf = AUD.buf[src]; if (!buf) { audLoad(src); return; }
  if (AUD.voices >= MAX_VOICES) return;
  AUD.last[src] = now; AUD.voices++;
  const s = AUD.ctx.createBufferSource(), g = AUD.ctx.createGain();
  s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol;
  s.connect(g); g.connect(AUD.gain); s.onended = () => AUD.voices--; s.start();
}
const npcSfx = (key, act, vol = 0.6) => { const e = SND.npc[key]; if (e) sfx(e[act], vol, rnd(0.93, 1.07)); };
const skillSfx = id => sfx(SND.skill[id], 0.5);
const uiSfx = k => sfx(SND.ui[k], 0.6);
/* Nhac nen theo ban do (musicset.txt), lap lai; ban do khong co nhac rieng -> nhac vung gan nhat */
function playMusic(mapId) {
  const list = Object.values(SND.music); if (!list.length) return;
  const src = SND.music[mapId] || list[Math.abs(mapId) % list.length];
  if (AUD.musicSrc === src) return;
  if (AUD.musicSource) AUD.musicSource.disconnect();
  if (AUD.musicGain) AUD.musicGain.disconnect();
  AUD.musicElement = AUD.musicSource = AUD.musicGain = null;
  if (AUD.music) AUD.music.pause();
  AUD.musicSrc = src; AUD.music = new Audio(src); AUD.music.loop = true;
  const c = sndCfg();
  if (AUD.ctx) audApply();
  else AUD.music.volume = c.music ? c.mvol : 0;
  if (c.music && !AUD.ctx) AUD.music.play().catch(() => {});
}
function preloadZoneSounds(z) {
  if (!AUD.ctx) return;
  for (const t of z.m.concat([z.boss])) { const e = SND.npc[MON[t] && MON[t].anim]; if (e) Object.values(e).forEach(s => s && audLoad(s)); }
  Object.values(SND.ui).forEach(s => s && audLoad(s));
}
