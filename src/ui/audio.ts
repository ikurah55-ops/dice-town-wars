// 効果音とBGM（Web Audio で合成。音声ファイルは使わない）
// ブラウザの制限で、最初の画面タップまで音は鳴らない。
import { getSettings, useSettings } from './settings';
import { useEffect } from 'react';

let ctx: AudioContext | null = null;
let seGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  seGain = ctx.createGain();
  bgmGain = ctx.createGain();
  seGain.connect(ctx.destination);
  bgmGain.connect(ctx.destination);
  applyVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function applyVolumes() {
  if (!ctx || !seGain || !bgmGain) return;
  const s = getSettings();
  seGain.gain.setTargetAtTime(s.seVolume * 0.9, ctx.currentTime, 0.05);
  bgmGain.gain.setTargetAtTime(s.bgmVolume * 0.35, ctx.currentTime, 0.1);
}

/** 最初のタップで音を使えるようにする */
export function unlockAudio() {
  const c = ensure();
  if (!c) return;
  const go = () => {
    if (pendingTrack !== undefined) startBgm(pendingTrack);
  };
  if (c.state === 'suspended') void c.resume().then(go);
  else go();
}

// ---------- 音の部品 ----------

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number; attack?: number; out?: AudioNode } = {}) {
  if (!ctx || !seGain) return;
  const t = ctx.currentTime + (opts.at ?? 0);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type ?? 'triangle';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
  const v = opts.vol ?? 0.3;
  const a = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(opts.out ?? seGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, opts: { freq?: number; q?: number; type?: BiquadFilterType; vol?: number; at?: number; sweepTo?: number; out?: AudioNode } = {}) {
  if (!ctx || !seGain || !noiseBuf) return;
  const t = ctx.currentTime + (opts.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1000, t);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
  f.Q.value = opts.q ?? 1;
  const g = ctx.createGain();
  const v = opts.vol ?? 0.3;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(opts.out ?? seGain);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI番号 → 周波数

// ---------- 効果音 ----------

export type Sfx =
  | 'click'
  | 'roll'
  | 'land'
  | 'coin'
  | 'attack'
  | 'hit'
  | 'shield'
  | 'heal'
  | 'steal'
  | 'zap'
  | 'magic'
  | 'build'
  | 'buy'
  | 'destroy'
  | 'storm'
  | 'win'
  | 'lose'
  | 'env'
  | 'unlock'
  | 'levelup'
  | 'page';

/** 効果音を鳴らす。strength（0〜1）で迫力を変えられるものもある */
export function sfx(name: Sfx, strength = 0.5) {
  if (!ensure() || !ctx || ctx.state !== 'running') return;
  if (getSettings().seVolume <= 0) return;
  const k = Math.max(0.2, Math.min(1, strength));
  switch (name) {
    case 'click':
      tone(1400, 0.04, { type: 'triangle', vol: 0.12 });
      break;
    case 'page':
      tone(880, 0.06, { vol: 0.12 });
      tone(1320, 0.08, { vol: 0.1, at: 0.05 });
      break;
    case 'roll':
      for (let i = 0; i < 7; i++) noise(0.04, { freq: 1800 + Math.random() * 1500, q: 4, vol: 0.25, at: i * 0.085 });
      break;
    case 'land':
      tone(190, 0.14, { type: 'sine', vol: 0.5, slide: 70 });
      noise(0.08, { freq: 900, type: 'lowpass', vol: 0.35 });
      break;
    case 'coin': {
      const n = Math.round(2 + k * 4);
      for (let i = 0; i < n; i++) {
        tone(NOTE(84 + ((i * 5) % 12)), 0.12, { type: 'square', vol: 0.06, at: i * 0.05 });
        tone(NOTE(96 + ((i * 7) % 12)), 0.1, { type: 'triangle', vol: 0.08, at: i * 0.05 + 0.02 });
      }
      break;
    }
    case 'buy':
      tone(NOTE(79), 0.08, { type: 'square', vol: 0.07 });
      tone(NOTE(86), 0.12, { type: 'triangle', vol: 0.1, at: 0.06 });
      break;
    case 'attack':
      noise(0.28, { freq: 400, sweepTo: 2400, q: 2, vol: 0.25 * k + 0.1 });
      break;
    case 'hit':
      tone(130, 0.35 + k * 0.2, { type: 'sine', vol: 0.4 + k * 0.4, slide: 38 });
      noise(0.3 + k * 0.25, { freq: 700, type: 'lowpass', vol: 0.3 + k * 0.35 });
      break;
    case 'shield':
      tone(NOTE(81), 0.45, { type: 'sine', vol: 0.18 });
      tone(NOTE(88), 0.5, { type: 'sine', vol: 0.12, at: 0.03 });
      noise(0.4, { freq: 4000, q: 6, vol: 0.06 });
      break;
    case 'heal':
      [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.3, { vol: 0.14, at: i * 0.08 }));
      break;
    case 'steal':
      tone(1500, 0.16, { type: 'sine', vol: 0.18, slide: 280 });
      break;
    case 'zap':
      noise(0.25, { freq: 3000, type: 'highpass', vol: 0.25 });
      tone(220, 0.18, { type: 'square', vol: 0.12, slide: 110 });
      break;
    case 'magic':
      for (let i = 0; i < 6; i++) tone(NOTE(88 + Math.floor(Math.random() * 12)), 0.18, { vol: 0.08, at: i * 0.06 });
      tone(NOTE(76), 0.6, { type: 'sine', vol: 0.12, attack: 0.1 });
      break;
    case 'build':
      tone(320, 0.08, { type: 'triangle', vol: 0.25 });
      noise(0.06, { freq: 1200, vol: 0.2 });
      tone(280, 0.1, { type: 'triangle', vol: 0.22, at: 0.12 });
      noise(0.06, { freq: 1000, vol: 0.18, at: 0.12 });
      break;
    case 'destroy':
      noise(0.8, { freq: 1500, type: 'lowpass', sweepTo: 200, vol: 0.5 });
      tone(90, 0.5, { type: 'sine', vol: 0.5, slide: 35 });
      break;
    case 'storm':
      tone(NOTE(38), 1.2, { type: 'sawtooth', vol: 0.12, attack: 0.05 });
      tone(NOTE(37), 1.2, { type: 'sawtooth', vol: 0.12, attack: 0.05 });
      noise(1.0, { freq: 300, type: 'lowpass', vol: 0.3 });
      break;
    case 'win':
      [72, 76, 79, 84, 84].forEach((n, i) => tone(NOTE(n), i === 4 ? 0.7 : 0.18, { type: 'square', vol: 0.09, at: i * 0.14 }));
      [60, 64, 67, 72].forEach((n, i) => tone(NOTE(n), 0.6, { vol: 0.12, at: i * 0.14 }));
      break;
    case 'lose':
      [67, 64, 60, 55].forEach((n, i) => tone(NOTE(n), 0.4, { type: 'triangle', vol: 0.15, at: i * 0.22 }));
      break;
    case 'env':
      [45, 57, 64].forEach((n) => tone(NOTE(n), 2.2, { type: 'sine', vol: 0.2, attack: 0.02 }));
      noise(0.3, { freq: 2500, q: 3, vol: 0.08 });
      break;
    case 'unlock':
      [76, 79, 83, 88].forEach((n, i) => tone(NOTE(n), 0.25, { vol: 0.13, at: i * 0.07 }));
      tone(NOTE(64), 0.6, { type: 'sine', vol: 0.12 });
      break;
    case 'levelup':
      [72, 79, 84].forEach((n, i) => tone(NOTE(n), 0.22, { type: 'square', vol: 0.07, at: i * 0.07 }));
      break;
  }
}

// ---------- BGM ----------

export type BgmTrack = 'menu' | 'battle';

let pendingTrack: BgmTrack | null | undefined;
let playing: BgmTrack | null = null;
let timer: number | null = null;
let nextTime = 0;
let step = 0;

// ニ短調ドリア風の進行：Dm - C - B♭ - C（各1小節、8分音符×8）
const CHORDS = [
  [50, 53, 57, 62],
  [48, 52, 55, 60],
  [46, 50, 53, 58],
  [48, 52, 55, 60],
];
const MELODY = [
  [74, null, 72, 69, 72, null, 74, 77],
  [76, null, 72, 67, 69, null, 72, null],
  [74, null, 70, 65, 70, 72, 74, null],
  [72, null, 76, null, 74, 72, 69, null],
];

function scheduleStep(t: number, track: BgmTrack) {
  if (!ctx || !bgmGain) return;
  const bar = Math.floor(step / 8) % 4;
  const beat = step % 8;
  const chord = CHORDS[bar];
  const eighth = track === 'battle' ? 60 / 116 / 2 : 60 / 84 / 2;
  // ベース
  if (beat % 4 === 0) toneAt(t, NOTE(chord[0] - 12), eighth * 3.5, 'triangle', 0.22);
  // アルペジオ
  toneAt(t, NOTE(chord[beat % 4] + (beat >= 4 ? 12 : 0)), eighth * 0.9, 'triangle', track === 'battle' ? 0.07 : 0.06);
  // メロディ（2周目以降）
  const m = MELODY[bar][beat];
  if (m && Math.floor(step / 32) % 2 === 1) toneAt(t, NOTE(m), eighth * 1.6, 'square', 0.035);
  // 戦闘はリズムを足す
  if (track === 'battle') {
    if (beat === 0 || beat === 4) drumAt(t, 'kick');
    if (beat === 2 || beat === 6) drumAt(t, 'snare');
    drumAt(t, 'hat');
  }
  step++;
  return eighth;
}

function toneAt(t: number, freq: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !bgmGain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bgmGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function drumAt(t: number, kind: 'kick' | 'snare' | 'hat') {
  if (!ctx || !bgmGain || !noiseBuf) return;
  if (kind === 'kick') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(bgmGain);
    o.start(t);
    o.stop(t + 0.2);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = ctx.createGain();
  const v = kind === 'hat' ? 0.04 : 0.12;
  const d = kind === 'hat' ? 0.04 : 0.12;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f).connect(g).connect(bgmGain);
  src.start(t, Math.random() * 0.5);
  src.stop(t + d + 0.02);
}

function startBgm(track: BgmTrack | null) {
  pendingTrack = track;
  if (!ctx || ctx.state !== 'running') return;
  if (playing === track) return;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  playing = track;
  if (!track) return;
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  timer = window.setInterval(() => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.25) {
      const d = scheduleStep(nextTime, track);
      nextTime += d ?? 0.3;
    }
  }, 80);
}

/** 画面ごとに流すBGMを指定する（音が使えるようになったら自動で始まる） */
export function useBgm(track: BgmTrack | null) {
  const s = useSettings();
  useEffect(() => {
    startBgm(track);
  }, [track]);
  useEffect(() => {
    applyVolumes();
  }, [s.seVolume, s.bgmVolume]);
}
