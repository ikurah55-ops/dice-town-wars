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

// 他のタブ・アプリに切り替えている間は音を止める（戻ったら再開）
let pausedByHide = false;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') {
        pausedByHide = true;
        void ctx.suspend();
      }
    } else if (pausedByHide) {
      pausedByHide = false;
      void ctx.resume();
    }
  });
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

// ---- 楽器（オーケストラ風の合成音。残響をかけて広がりを出す） ----

let bus: GainNode | null = null; // BGMの楽器はここに集めて、そのまま＋残響で bgmGain へ

function bgmBus(): GainNode | null {
  if (!ctx || !bgmGain) return null;
  if (bus) return bus;
  bus = ctx.createGain();
  bus.connect(bgmGain);
  // 残響：減衰するノイズを畳み込んで、広いホールのような響きに
  const len = Math.floor(ctx.sampleRate * 2.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const send = ctx.createGain();
  send.gain.value = 0.32;
  bus.connect(send).connect(conv).connect(bgmGain);
  return bus;
}

/** のこぎり波＋ローパスの持続音（弦・金管・ベースに使う） */
function synth(
  t: number,
  midi: number,
  dur: number,
  o: { vol: number; attack?: number; release?: number; cutoff?: number; peak?: number; detune?: number; type?: OscillatorType },
) {
  const out = bgmBus();
  if (!ctx || !out) return;
  const { vol, attack = 0.01, release = 0.15, cutoff = 1800, peak, detune = 0, type = 'sawtooth' } = o;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 0.7;
  if (peak) {
    // 金管：吹いた瞬間に明るくなって落ち着く
    f.frequency.setValueAtTime(cutoff * 0.4, t);
    f.frequency.linearRampToValueAtTime(peak, t + attack + 0.03);
    f.frequency.exponentialRampToValueAtTime(cutoff, t + attack + 0.25);
  } else f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  f.connect(g).connect(out);
  for (const cents of detune ? [-detune, detune] : [0]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = NOTE(midi);
    osc.detune.value = cents;
    osc.connect(f);
    osc.start(t);
    osc.stop(t + dur + release + 0.05);
  }
}

/** ティンパニ・和太鼓：音程が少し下がる低い打音＋皮を打つノイズ */
function drum(t: number, freq: number, vol: number, decay: number) {
  const out = bgmBus();
  if (!ctx || !out || !noiseBuf) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  src.connect(f).connect(ng).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.1);
}

/** スネア・シンバル（ノイズ） */
function hiss(t: number, kind: 'snare' | 'swell', vol: number, dur: number) {
  const out = bgmBus();
  if (!ctx || !out || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = kind === 'snare' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 'snare' ? 2200 : 5000;
  const g = ctx.createGain();
  if (kind === 'snare') {
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else {
    // シンバルのクレッシェンド（次の頭に向かって盛り上げる）
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
  }
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.7);
}

// ---- 曲 ----
// 和音は [ベースの音, 中音域の4音]（MIDI番号）

const Dm = [38, [50, 53, 57, 62]] as const;
const Bb = [34, [46, 50, 53, 58]] as const;
const F_ = [41, [48, 53, 57, 60]] as const;
const C_ = [36, [48, 52, 55, 60]] as const;
const Gm = [43, [50, 55, 58, 62]] as const;
const A_ = [33, [49, 52, 57, 61]] as const; // 属和音（緊張して主和音に戻りたくなる）

type Chord = readonly [number, readonly number[]];
type Mel = (number | null)[];

/** メロディの音の長さ：次の音（またはその小節の終わり）まで */
function noteLen(bar: Mel, i: number): number {
  let n = 1;
  while (i + n < bar.length && bar[i + n] === null) n++;
  return n;
}

// メニュー：ゆったり壮大に（ニ短調、76 BPM、8分音符×8で1小節、8小節）
const MENU_CHORDS: Chord[] = [Dm, Bb, F_, C_, Dm, Bb, Gm, A_];
const MENU_MEL: Mel[] = [
  [62, null, null, 65, 69, null, null, null],
  [70, null, 69, null, 65, null, null, null],
  [72, null, null, 69, 65, null, 64, 65],
  [67, null, null, null, 64, null, null, null],
  [62, null, null, 65, 69, null, 74, null],
  [74, null, 72, 70, 69, null, 65, null],
  [67, null, 70, null, 74, null, 72, 70],
  [69, null, null, null, 73, null, null, null],
];

function menuStep(t: number, s: number): number {
  const e = 60 / 76 / 2; // 8分音符
  const bar = Math.floor(s / 8) % 8;
  const beat = s % 8;
  const loop = Math.floor(s / 64);
  const [root, mid] = MENU_CHORDS[bar];
  if (beat === 0) {
    // 弦の和音（ゆっくり立ち上がる）と低音
    for (const n of mid) synth(t, n, e * 8, { vol: 0.028, attack: 0.5, release: 0.6, cutoff: 1500, detune: 7 });
    synth(t, root, e * 8, { vol: 0.07, attack: 0.08, release: 0.4, cutoff: 380 });
    drum(t, 55, bar === 0 ? 0.32 : 0.18, 1.1);
  }
  // チェロの刻み（静かに前へ進む感じ）
  synth(t, root + 12 + (beat % 2 ? 12 : 0), e * 0.8, { vol: 0.032, attack: 0.01, release: 0.08, cutoff: 900 });
  // 最後の小節：ティンパニのロールとシンバルで次の頭へ
  if (bar === 7 && beat >= 4) drum(t, 55, 0.12 + (beat - 4) * 0.06, 0.5);
  if (bar === 7 && beat === 4) hiss(t, 'swell', 0.05, e * 4);
  // ホルンの旋律（2周目から、1周おき）
  const m = MENU_MEL[bar][beat];
  if (loop % 2 === 1 && m !== null) synth(t, m, e * noteLen(MENU_MEL[bar], beat) * 0.95, { vol: 0.05, attack: 0.06, release: 0.25, cutoff: 1100, peak: 2600, detune: 5 });
  return e;
}

// 戦闘：速く緊張感のある曲（ニ短調、138 BPM、16分音符×16で1小節、8小節）
const BATTLE_CHORDS: Chord[] = [Dm, Dm, Bb, A_, Dm, C_, Bb, A_];
const BATTLE_MEL: Mel[] = [
  [74, null, 73, 74, 77, null, 76, 74],
  [72, null, 74, null, 69, null, null, null],
  [70, null, 72, 74, 77, null, 74, null],
  [73, null, null, 74, 73, null, 69, null],
  [74, null, 76, 77, 81, null, 79, 77],
  [76, null, 74, 72, 72, null, null, null],
  [74, null, 72, 70, 69, null, 70, null],
  [69, null, null, null, 68, null, 69, null],
];
const OSTINATO = [0, 0, 2, 0, 1, 0, 2, 3, 0, 0, 2, 0, 1, 2, 3, 2]; // 16分の刻み（和音の何番目の音か）
const TAIKO = [0, 3, 6, 8, 11, 14]; // 3+3+2 の太鼓

function battleStep(t: number, s: number): number {
  const sx = 60 / 138 / 4; // 16分音符
  const bar = Math.floor(s / 16) % 8;
  const i = s % 16;
  const loop = Math.floor(s / 128);
  const [root, mid] = BATTLE_CHORDS[bar];
  const tense = bar === 3 || bar === 7; // 属和音の小節
  // 弦の16分の刻み
  synth(t, mid[OSTINATO[i]] + 12, sx * 0.7, { vol: 0.03, attack: 0.005, release: 0.05, cutoff: 2400 });
  // 低音：8分で押し出す
  if (i % 2 === 0) synth(t, root + (i % 8 === 4 ? 12 : 0), sx * 1.6, { vol: 0.06, attack: 0.005, release: 0.06, cutoff: 500 });
  // 和太鼓とスネア
  if (TAIKO.includes(i)) drum(t, i === 0 ? 50 : 70, i === 0 ? 0.36 : 0.22, 0.35);
  if (i === 4 || i === 12) hiss(t, 'snare', 0.1, 0.12);
  if (bar === 7 && i >= 8) hiss(t, 'snare', 0.04 + (i - 8) * 0.012, 0.08); // 小節の終わりのロール
  if (bar === 7 && i === 8) hiss(t, 'swell', 0.05, sx * 8);
  // 金管：シンコペーションの和音の一撃。属和音の小節は長く伸ばして緊張させる
  if (tense && i === 0) for (const n of mid.slice(0, 3)) synth(t, n, sx * 14, { vol: 0.035, attack: 0.15, release: 0.3, cutoff: 1300, peak: 2800, detune: 6 });
  else if (i === 0 || i === 6) for (const n of mid.slice(0, 3)) synth(t, n, sx * 1.5, { vol: 0.04, attack: 0.01, release: 0.1, cutoff: 1200, peak: 3000, detune: 6 });
  // 旋律（2周目から、1周おき。8分音符単位）
  if (i % 2 === 0 && loop % 2 === 1) {
    const mel = BATTLE_MEL[bar];
    const m = mel[i / 2];
    if (m !== null) synth(t, m, sx * 2 * noteLen(mel, i / 2) * 0.9, { vol: 0.045, attack: 0.02, release: 0.12, cutoff: 2600, detune: 8 });
  }
  return sx;
}

function scheduleStep(t: number, track: BgmTrack): number {
  const d = track === 'battle' ? battleStep(t, step) : menuStep(t, step);
  step++;
  return d;
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
      nextTime += scheduleStep(nextTime, track);
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
