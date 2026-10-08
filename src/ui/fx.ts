// 出目解決後のエフェクト再生（Web Animations API で命令的に描く）
import type { Fx, GameData, Side } from '../core/types';
import { fmtCoins } from '../core/rules';
import { sfx } from './audio';

type Pt = { x: number; y: number };

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 同じカード・同じ種類が続く演出はまとめる（麦畑×3 → +9 を1回） */
const GROUPABLE = new Set<Fx['kind']>(['coin', 'attack', 'shield', 'heal', 'steal', 'zap']);

export function groupFx(list: Fx[]): Fx[] {
  const out: Fx[] = [];
  for (const fx of list) {
    const last = out[out.length - 1];
    if (last && GROUPABLE.has(fx.kind) && last.kind === fx.kind && 'card' in last && 'card' in fx && last.card === fx.card && sameSide(last, fx)) {
      (last as { amount: number }).amount += (fx as { amount: number }).amount;
      if (last.kind === 'coin' && fx.kind === 'coin') last.raw = (last.raw ?? last.amount - fx.amount) + (fx.raw ?? fx.amount);
    } else out.push({ ...fx } as Fx);
  }
  return out;
}

function sameSide(a: Fx, b: Fx): boolean {
  return JSON.stringify({ ...a, amount: 0, raw: 0 }) === JSON.stringify({ ...b, amount: 0, raw: 0 });
}

export interface FxContext {
  root: HTMLElement; // 演出レイヤー（.battle の中、absolute）
  stage: HTMLElement; // 揺らす対象
  data: GameData;
  face: number;
}

function center(ctx: FxContext, el: Element | null, fallback: Pt): Pt {
  if (!el) return fallback;
  const r = el.getBoundingClientRect();
  const o = ctx.root.getBoundingClientRect();
  return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 };
}

function chipEl(ctx: FxContext, side: Side, card: string): Element | null {
  const all = [...ctx.root.parentElement!.querySelectorAll(`.bchip[data-card="${card}"][data-side="${side}"]`)] as HTMLElement[];
  return all.find((el) => {
    const [a, b] = (el.dataset.run ?? '0-0').split('-').map(Number);
    return ctx.face >= a && ctx.face <= b;
  }) ?? all[0] ?? null;
}

/** 上の帯（ボス）なら数字は下側に、下の帯（自分）なら上側に出す */
const numPt = (p: Pt, target: Side): Pt => ({ x: p.x, y: target === 1 ? p.y + 46 : p.y - 4 });

const q = (ctx: FxContext, sel: string) => ctx.root.parentElement!.querySelector(sel);
const coinPt = (ctx: FxContext, side: Side) => center(ctx, q(ctx, `[data-coin="${side}"]`), { x: 0, y: 0 });
const hpPt = (ctx: FxContext, side: Side) => center(ctx, q(ctx, `[data-hp="${side}"]`), { x: 0, y: 0 });
const zoneEl = (ctx: FxContext, side: Side) => q(ctx, side === 1 ? '.zone-enemy' : '.zone-me');

function el(ctx: FxContext, cls: string, p: Pt, html = ''): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  d.style.left = `${p.x}px`;
  d.style.top = `${p.y}px`;
  d.innerHTML = html;
  ctx.root.appendChild(d);
  return d;
}

function pulse(target: Element | null, cls: string, ms = 700) {
  if (!target) return;
  target.classList.remove(cls);
  void (target as HTMLElement).offsetWidth;
  target.classList.add(cls);
  setTimeout(() => target.classList.remove(cls), ms);
}

/** 大きな数字・ラベルを浮かせる */
function popText(ctx: FxContext, p: Pt, text: string, cls: string, size: number, ms = 900) {
  const t = el(ctx, `fx-text ${cls}`, p, text);
  t.style.fontSize = `${size}px`;
  t.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
      { transform: 'translate(-50%, -80%) scale(1.15)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -95%) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -130%) scale(0.95)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  ).finished.then(() => t.remove());
}

/** from → to へ粒子を弧を描いて飛ばす。最初の粒子が着いた時刻を返す */
function fly(ctx: FxContext, from: Pt, to: Pt, n: number, cls: string, dur: number, stagger: number, arc: number, spread = 18): number {
  for (let i = 0; i < n; i++) {
    const sx = from.x + (Math.random() - 0.5) * spread;
    const sy = from.y + (Math.random() - 0.5) * spread;
    const mx = (sx + to.x) / 2 + (Math.random() - 0.5) * 40;
    const my = Math.min(sy, to.y) - arc - Math.random() * 20;
    const p = el(ctx, cls, { x: 0, y: 0 });
    p.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(0.3)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy - 10}px) scale(1.1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${to.x}px, ${to.y}px) scale(0.6)`, opacity: 0.9 },
      ],
      { duration: dur, delay: i * stagger, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'backwards' },
    ).finished.then(() => p.remove());
  }
  return dur;
}

function burst(ctx: FxContext, p: Pt, cls: string, size: number, ms = 500) {
  const b = el(ctx, `fx-burst ${cls}`, p);
  b.style.width = b.style.height = `${size}px`;
  b.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9, offset: 0.4 },
      { transform: 'translate(-50%, -50%) scale(1.4)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  ).finished.then(() => b.remove());
}

function shake(ctx: FxContext, px: number, ms = 380) {
  if (px <= 0 || reduced()) return;
  const k: Keyframe[] = [];
  for (let i = 0; i < 8; i++) {
    const f = px * (1 - i / 8);
    k.push({ transform: `translate(${(Math.random() - 0.5) * 2 * f}px, ${(Math.random() - 0.5) * 2 * f}px)` });
  }
  k.push({ transform: 'translate(0, 0)' });
  ctx.stage.animate(k, { duration: ms });
}

function flash(ctx: FxContext, cls: string, strength: number) {
  const f = el(ctx, `fx-flash ${cls}`, { x: 0, y: 0 });
  f.animate([{ opacity: strength }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).finished.then(() => f.remove());
}

function bolt(ctx: FxContext, from: Pt, to: Pt) {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('class', 'fx-bolt');
  const pts: string[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const jitter = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 26;
    pts.push(`${from.x + (to.x - from.x) * t + jitter},${from.y + (to.y - from.y) * t + jitter * 0.5}`);
  }
  for (const [w, c] of [
    [7, 'rgba(90,180,255,0.55)'],
    [2.5, '#e8f8ff'],
  ] as const) {
    const pl = document.createElementNS(svgNs, 'polyline');
    pl.setAttribute('points', pts.join(' '));
    pl.setAttribute('stroke', c);
    pl.setAttribute('stroke-width', String(w));
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pl);
  }
  ctx.root.appendChild(svg);
  svg.animate([{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 380 }).finished.then(() => svg.remove());
}

/**
 * 1つの演出を再生する。onImpact は数値（HP・コイン）を画面に反映するタイミングで呼ばれる。
 */
/** 演出の始まりに鳴らす音 */
function startSound(ctx: FxContext, fx: Fx) {
  const magic = 'card' in fx && ctx.data.cards[fx.card]?.category === 'magic';
  if (magic) sfx('magic');
  switch (fx.kind) {
    case 'attack':
      sfx('attack', fx.amount / 30);
      break;
    case 'shield':
      sfx('shield');
      break;
    case 'zap':
      sfx('zap');
      break;
    case 'storm':
      sfx('storm');
      break;
    case 'destroy':
      setTimeout(() => sfx('destroy'), 480);
      break;
  }
}

/** 数値が変わる瞬間に鳴らす音 */
function impactSound(fx: Fx) {
  switch (fx.kind) {
    case 'coin':
    case 'income':
      sfx('coin', fx.amount / 12);
      break;
    case 'steal':
      sfx('steal');
      break;
    case 'heal':
      sfx('heal');
      break;
    case 'hit':
    case 'zap':
    case 'merc':
      sfx('hit', fx.amount / 40);
      break;
    case 'storm':
      sfx('hit', 0.8);
      break;
  }
}

export async function playFx(ctx: FxContext, fx: Fx, onImpactRaw: () => void): Promise<void> {
  startSound(ctx, fx);
  const onImpact = () => {
    onImpactRaw();
    impactSound(fx);
  };
  const name = 'card' in fx ? ctx.data.cards[fx.card]?.name ?? '' : '';
  const fast = reduced();

  switch (fx.kind) {
    case 'coin': {
      const chip = chipEl(ctx, fx.side, fx.card);
      const from = center(ctx, chip, coinPt(ctx, fx.side));
      const to = coinPt(ctx, fx.side);
      pulse(chip, 'fx-pulse-eco');
      popText(ctx, { x: from.x, y: from.y - 6 }, `${name} <b>+${fmtCoins(fx.raw ?? fx.amount)}</b>`, 'fx-eco', clamp(16 + fx.amount * 0.9, 16, 34));
      const n = fast ? 1 : clamp(fx.amount, 1, 14);
      const dur = fly(ctx, from, to, n, 'fx-coin', 620, 45, 50);
      await sleep(dur);
      onImpact();
      pulse(q(ctx, `[data-coin="${fx.side}"]`), 'fx-bump', 400);
      await sleep(n * 45 + 120);
      return;
    }
    case 'attack': {
      const target: Side = fx.side === 0 ? 1 : 0;
      const chip = chipEl(ctx, fx.side, fx.card);
      const from = center(ctx, chip, hpPt(ctx, fx.side));
      const to = hpPt(ctx, target);
      pulse(chip, 'fx-pulse-atk');
      popText(ctx, { x: from.x, y: from.y - 6 }, `${name} <b>${fx.amount}</b>`, 'fx-atk', clamp(15 + fx.amount * 0.35, 16, 30), 800);
      // カードごとの演出（なければ火の玉）
      await (ATTACK_FX[fx.card] ?? fireballAttack)(ctx, from, to, fx.amount, fast);
      return;
    }
    case 'hit': {
      const to = hpPt(ctx, fx.target);
      if (fx.blocked > 0) {
        popText(ctx, { x: to.x - 70, y: to.y + 4 }, `🛡 -${fx.blocked}`, 'fx-ctr', 18, 900);
      }
      if (fx.amount <= 0) {
        popText(ctx, to, 'ノーダメージ', 'fx-ctr', 20);
        await sleep(600);
        return;
      }
      onImpact();
      burst(ctx, to, 'fx-burst-atk', clamp(60 + fx.amount * 2.5, 70, 200), 600);
      flash(ctx, 'fx-flash-red', clamp(fx.amount / 80, 0.15, 0.55));
      shake(ctx, clamp(fx.amount / 4, 3, 14));
      popText(ctx, numPt(to, fx.target), `-${fx.amount}`, 'fx-dmg', clamp(26 + fx.amount * 0.6, 28, 64), 1100);
      pulse(q(ctx, `[data-hp="${fx.target}"]`), 'fx-hurt', 500);
      await sleep(750);
      return;
    }
    case 'shield': {
      const zone = zoneEl(ctx, fx.side);
      const p = center(ctx, zone, hpPt(ctx, fx.side));
      const dome = el(ctx, 'fx-dome', p);
      if (zone) {
        const r = zone.getBoundingClientRect();
        dome.style.width = `${r.width * 0.92}px`;
        dome.style.height = `${r.height * 1.1}px`;
      }
      dome.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.3 },
          { transform: 'translate(-50%, -50%) scale(1.03)', opacity: 0.8, offset: 0.7 },
          { transform: 'translate(-50%, -50%) scale(1.08)', opacity: 0 },
        ],
        { duration: 800, easing: 'ease-out' },
      ).finished.then(() => dome.remove());
      pulse(chipEl(ctx, fx.side, fx.card), 'fx-pulse-ctr');
      popText(ctx, p, `🛡 ${name} -${fx.amount}`, 'fx-ctr', 20, 900);
      await sleep(700);
      return;
    }
    case 'heal': {
      if (isMagic(ctx, fx.card)) return magicHeal(ctx, fx, onImpact);
      const p = hpPt(ctx, fx.side);
      pulse(chipEl(ctx, fx.side, fx.card), 'fx-pulse-ctr');
      const n = fast ? 1 : clamp(Math.round(fx.amount / 2), 3, 12);
      for (let i = 0; i < n; i++) {
        const s = el(ctx, 'fx-sparkle', { x: p.x + (Math.random() - 0.5) * 120, y: p.y + 10 });
        s.animate(
          [
            { transform: 'translate(-50%, 0) scale(0.4)', opacity: 0 },
            { transform: 'translate(-50%, -20px) scale(1)', opacity: 1, offset: 0.3 },
            { transform: 'translate(-50%, -60px) scale(0.6)', opacity: 0 },
          ],
          { duration: 800, delay: i * 40 },
        ).finished.then(() => s.remove());
      }
      onImpact();
      popText(ctx, p, `${name} +${fx.amount}`, 'fx-heal', clamp(18 + fx.amount * 0.5, 18, 32));
      await sleep(750);
      return;
    }
    case 'steal': {
      if (isMagic(ctx, fx.card)) return magicSteal(ctx, fx, onImpact);
      if (fx.amount <= 0) {
        popText(ctx, coinPt(ctx, fx.from), `${name}：コインなし`, 'fx-ctr', 16);
        await sleep(500);
        return;
      }
      pulse(chipEl(ctx, fx.to, fx.card), 'fx-pulse-ctr');
      const from = coinPt(ctx, fx.from);
      const to = coinPt(ctx, fx.to);
      popText(ctx, from, `${name} -${fmtCoins(fx.amount)}`, 'fx-ctr', 20);
      const n = fast ? 1 : clamp(fx.amount, 1, 10);
      const dur = fly(ctx, from, to, n, 'fx-coin', 620, 60, 30);
      await sleep(dur);
      onImpact();
      pulse(q(ctx, `[data-coin="${fx.to}"]`), 'fx-bump', 400);
      await sleep(n * 60 + 100);
      return;
    }
    case 'zap': {
      const owner: Side = fx.target === 0 ? 1 : 0;
      const chip = chipEl(ctx, owner, fx.card);
      const from = center(ctx, chip, hpPt(ctx, owner));
      const to = hpPt(ctx, fx.target);
      pulse(chip, 'fx-pulse-ctr');
      popText(ctx, { x: from.x, y: from.y - 6 }, `🛡 ${name}`, 'fx-ctr', 18, 700);
      bolt(ctx, from, to);
      await sleep(200);
      onImpact();
      burst(ctx, to, 'fx-burst-ctr', clamp(60 + fx.amount * 2.5, 70, 180), 520);
      flash(ctx, 'fx-flash-blue', clamp(fx.amount / 80, 0.15, 0.45));
      shake(ctx, clamp(fx.amount / 4, 3, 12));
      popText(ctx, numPt(to, fx.target), `-${fx.amount}`, 'fx-zap', clamp(26 + fx.amount * 0.6, 28, 56), 1000);
      await sleep(700);
      return;
    }
    case 'income':
      return taxIncome(ctx, fx, onImpact);
    case 'destroy':
      return ramDestroy(ctx, fx);
    case 'merc':
      return mercenary(ctx, fx, onImpact);
    case 'storm':
      return storm(ctx, fx, onImpact);
    case 'built':
      return; // 建設の表示は Battle 側（カード画像を使うため）
  }
}


// ---------- 魔法・特殊効果の演出 ----------

function isMagic(ctx: FxContext, card: string): boolean {
  return ctx.data.cards[card]?.category === 'magic';
}


/** 魔法名の帯（紫）を対象の帯の上に出す */
function spellBanner(ctx: FxContext, side: Side, text: string) {
  const p = hpPt(ctx, side);
  const b = el(ctx, 'fx-spell', { x: p.x, y: side === 1 ? p.y + 84 : p.y - 74 }, text);
  b.animate(
    [
      { transform: 'translate(-50%, -50%) scaleX(0.2)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scaleX(1.05)', opacity: 1, offset: 0.15 },
      { transform: 'translate(-50%, -50%) scaleX(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, -50%) scaleX(1)', opacity: 0 },
    ],
    { duration: 1300, easing: 'ease-out' },
  ).finished.then(() => b.remove());
}

/** 聖なる泉：天から光の柱が降り、水しぶきの光が舞う */
async function magicHeal(ctx: FxContext, fx: Extract<Fx, { kind: 'heal' }>, onImpact: () => void) {
  const name = ctx.data.cards[fx.card].name;
  const p = hpPt(ctx, fx.side);
  pulse(q(ctx, `[data-magic="${fx.side}-${fx.card}"]`), 'fx-pulse-mag');
  spellBanner(ctx, fx.side, `✦ ${name}`);
  const beam = el(ctx, 'fx-beam', { x: p.x, y: 0 });
  beam.style.height = `${p.y + 20}px`;
  beam.animate(
    [
      { transform: 'translateX(-50%) scaleY(0)', opacity: 0 },
      { transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: 0.3 },
      { transform: 'translateX(-50%) scaleY(1)', opacity: 0.9, offset: 0.75 },
      { transform: 'translateX(-50%) scaleY(1) scaleX(1.6)', opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-out' },
  ).finished.then(() => beam.remove());
  await sleep(330);
  burst(ctx, p, 'fx-burst-holy', 140, 700);
  const n = reduced() ? 2 : 16;
  for (let i = 0; i < n; i++) {
    const s = el(ctx, i % 2 ? 'fx-sparkle fx-sparkle-water' : 'fx-sparkle', { x: p.x + (Math.random() - 0.5) * 160, y: p.y + 6 });
    s.animate(
      [
        { transform: 'translate(-50%, 0) scale(0.3)', opacity: 0 },
        { transform: `translate(-50%, ${-20 - Math.random() * 20}px) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(-50%, ${-60 - Math.random() * 30}px) scale(0.5)`, opacity: 0 },
      ],
      { duration: 900, delay: i * 30 },
    ).finished.then(() => s.remove());
  }
  onImpact();
  pulse(q(ctx, `[data-hp="${fx.side}"]`), 'fx-healed', 600);
  popText(ctx, numPt(p, fx.side), `+${fx.amount}`, 'fx-heal', clamp(26 + fx.amount * 0.5, 28, 44), 1100);
  await sleep(850);
}

/** 盗賊団：相手のコインの所に煙が上がり、影が走ってコインを持ち去る */
async function magicSteal(ctx: FxContext, fx: Extract<Fx, { kind: 'steal' }>, onImpact: () => void) {
  const name = ctx.data.cards[fx.card].name;
  const from = coinPt(ctx, fx.from);
  const to = coinPt(ctx, fx.to);
  pulse(q(ctx, `[data-magic="${fx.to}-${fx.card}"]`), 'fx-pulse-mag');
  spellBanner(ctx, fx.to, `✦ ${name}`);
  for (let i = 0; i < 6; i++) {
    const puff = el(ctx, 'fx-smoke', { x: from.x + (Math.random() - 0.5) * 30, y: from.y + (Math.random() - 0.5) * 12 });
    puff.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0.9 },
        { transform: `translate(-50%, ${-60 - Math.random() * 40}%) scale(${1.4 + Math.random()})`, opacity: 0 },
      ],
      { duration: 800, delay: i * 50, easing: 'ease-out' },
    ).finished.then(() => puff.remove());
  }
  await sleep(250);
  if (fx.amount <= 0) {
    popText(ctx, from, '奪えるコインなし', 'fx-mag', 17);
    await sleep(700);
    return;
  }
  // 影がダッシュする
  const dash = el(ctx, 'fx-dash', { x: 0, y: 0 });
  dash.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px) scaleX(0.3)`, opacity: 0 },
      { transform: `translate(${(from.x + to.x) / 2}px, ${(from.y + to.y) / 2}px) scaleX(1.4)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${to.x}px, ${to.y}px) scaleX(0.3)`, opacity: 0 },
    ],
    { duration: 520, easing: 'ease-in-out' },
  ).finished.then(() => dash.remove());
  popText(ctx, { x: from.x, y: from.y - 4 }, `-${fmtCoins(fx.amount)}`, 'fx-mag', 26, 900);
  const n = reduced() ? 1 : clamp(fx.amount * 2, 2, 12);
  const dur = fly(ctx, from, to, n, 'fx-coin', 560, 35, 10, 12);
  await sleep(dur);
  onImpact();
  pulse(q(ctx, `[data-coin="${fx.to}"]`), 'fx-bump', 400);
  await sleep(n * 35 + 150);
}

/** 徴税令：お触れの巻物が広がり、金貨が降ってくる */
async function taxIncome(ctx: FxContext, fx: Extract<Fx, { kind: 'income' }>, onImpact: () => void) {
  const name = ctx.data.cards[fx.card].name;
  const to = coinPt(ctx, fx.side);
  pulse(q(ctx, `[data-magic="${fx.side}-${fx.card}"]`), 'fx-pulse-mag');
  const scrollPt = { x: clamp(to.x - 120, 140, 10000), y: fx.side === 1 ? to.y + 60 : to.y - 70 };
  const sc = el(ctx, 'fx-scroll', scrollPt, `<span>📜 ${name}</span><b>収入 +${fmtCoins(fx.amount)}</b>`);
  sc.animate(
    [
      { transform: 'translate(-50%, -50%) scaleY(0.05)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scaleY(1.05)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -50%) scaleY(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, -60%) scaleY(1)', opacity: 0 },
    ],
    { duration: 1400, easing: 'ease-out' },
  ).finished.then(() => sc.remove());
  await sleep(300);
  const n = reduced() ? 1 : clamp(fx.amount * 2, 3, 12);
  const dur = fly(ctx, scrollPt, to, n, 'fx-coin', 620, 45, 25, 60);
  await sleep(dur);
  onImpact();
  pulse(q(ctx, `[data-coin="${fx.side}"]`), 'fx-bump', 400);
  await sleep(n * 45 + 250);
}

/** 破城槌：丸太が突っ込み、施設が砕ける */
async function ramDestroy(ctx: FxContext, fx: Extract<Fx, { kind: 'destroy' }>) {
  const chip = chipEl(ctx, fx.target, fx.card);
  const to = center(ctx, chip, hpPt(ctx, fx.target));
  const from = { x: -60, y: to.y };
  spellBanner(ctx, fx.side, '✦ 破城槌');
  const ram = el(ctx, 'fx-ram', { x: 0, y: 0 });
  // finished を待つと、画面が描画されない間に止まることがあるので時間で待つ
  ram.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px) translate(-100%, -50%)` },
      { transform: `translate(${to.x - 30}px, ${to.y}px) translate(-100%, -50%)`, offset: 0.7 },
      { transform: `translate(${to.x - 10}px, ${to.y}px) translate(-100%, -50%)` },
    ],
    { duration: 520, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' },
  );
  await sleep(520);
  burst(ctx, to, 'fx-burst-atk', 110, 500);
  shake(ctx, 10, 420);
  chip?.classList.add('fx-crumble');
  for (let i = 0; i < 10; i++) {
    const d = el(ctx, 'fx-debris', to);
    const dx = (Math.random() - 0.5) * 140;
    const dy = -30 - Math.random() * 50;
    d.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx * 1.3}px, ${dy + 80}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 800, easing: 'ease-out' },
    ).finished.then(() => d.remove());
  }
  ram.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 200, fill: 'forwards' }).finished.then(() => ram.remove());
  popText(ctx, { x: to.x, y: to.y - 8 }, `${ctx.data.cards[fx.card].name} 破壊！`, 'fx-dmg', 24, 1100);
  await sleep(900);
}

/** 傭兵契約：コインが剣に変わって相手に降り注ぐ */
async function mercenary(ctx: FxContext, fx: Extract<Fx, { kind: 'merc' }>, onImpact: () => void) {
  const from = coinPt(ctx, fx.side);
  const to = hpPt(ctx, fx.target);
  pulse(q(ctx, `[data-magic="${fx.side}-${fx.card}"]`), 'fx-pulse-mag');
  spellBanner(ctx, fx.side, `✦ ${ctx.data.cards[fx.card].name}`);
  if (fx.coins <= 0) {
    popText(ctx, from, 'コインなし', 'fx-mag', 17);
    await sleep(700);
    return;
  }
  popText(ctx, from, `-${fmtCoins(fx.coins)}枚`, 'fx-eco', 20, 800);
  const n = reduced() ? 1 : clamp(fx.coins, 2, 12);
  const dur = fly(ctx, from, to, n, 'fx-sword', 560, 50, 60, 20);
  await sleep(dur + n * 50);
  onImpact();
  burst(ctx, to, 'fx-burst-atk', clamp(60 + fx.amount * 2.5, 70, 200), 600);
  flash(ctx, 'fx-flash-red', clamp(fx.amount / 80, 0.15, 0.5));
  shake(ctx, clamp(fx.amount / 4, 3, 14));
  popText(ctx, numPt(to, fx.target), `-${fx.amount}`, 'fx-dmg', clamp(26 + fx.amount * 0.6, 28, 64), 1100);
  await sleep(700);
}

/** 長期戦：画面が赤黒く脈打ち、両者が削られる */
async function storm(ctx: FxContext, fx: Extract<Fx, { kind: 'storm' }>, onImpact: () => void) {
  const r = ctx.root.getBoundingClientRect();
  popText(ctx, { x: r.width / 2, y: r.height / 2 }, '長期戦！', 'fx-storm', 44, 1300);
  flash(ctx, 'fx-flash-storm', 0.7);
  await sleep(450);
  onImpact();
  shake(ctx, 9, 500);
  for (const s of [0, 1] as Side[]) {
    const p = hpPt(ctx, s);
    burst(ctx, p, 'fx-burst-storm', 90, 600);
    popText(ctx, numPt(p, s), `-${fx.amounts[s]}`, 'fx-dmg', 32, 1100);
  }
  await sleep(900);
}

// ---------- 攻撃カードごとの演出 ----------

type AttackFx = (ctx: FxContext, from: Pt, to: Pt, amount: number, fast: boolean) => Promise<void>;

/**
 * from → to へ1つの飛び道具を飛ばす（2次ベジェ曲線）。
 * rotate: 進行方向に向ける（要素は右向きに描く） / spin: 回転させる角度 / grow: 途中の拡大率（高く上がる感じ）
 */
function projectile(
  ctx: FxContext,
  cls: string,
  from: Pt,
  to: Pt,
  dur: number,
  opts: { delay?: number; arc?: number; bend?: number; rotate?: boolean; spin?: number; grow?: number; easing?: string } = {},
): HTMLElement {
  const { delay = 0, arc = 0, bend = 0, rotate = false, spin = 0, grow = 1, easing = 'linear' } = opts;
  // 画面の外に出ないよう、曲がりの頂点は上端より下に。bend で横にふくらませる
  const c = { x: (from.x + to.x) / 2 + bend, y: Math.max((from.y + to.y) / 2 - arc * 2, 10) };
  const k: Keyframe[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * c.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * c.y + t * t * to.y;
    const dx = 2 * u * (c.x - from.x) + 2 * t * (to.x - c.x);
    const dy = 2 * u * (c.y - from.y) + 2 * t * (to.y - c.y);
    const rot = rotate ? (Math.atan2(dy, dx) * 180) / Math.PI : spin * t;
    const sc = 1 + (grow - 1) * Math.sin(Math.PI * t);
    k.push({ transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sc})`, opacity: i === 0 ? 0 : 1, offset: t });
  }
  const p = el(ctx, `fx-proj ${cls}`, { x: 0, y: 0 });
  p.animate(k, { duration: dur, delay, easing, fill: 'both' }).finished.then(() => p.remove());
  return p;
}

/** その場でふくらんで消える煙・土ぼこり */
function puff(ctx: FxContext, p: Pt, cls: string, n: number, spread: number, ms = 700) {
  for (let i = 0; i < n; i++) {
    const d = el(ctx, `fx-proj ${cls}`, { x: 0, y: 0 });
    const x = p.x + (Math.random() - 0.5) * spread;
    const y = p.y + (Math.random() - 0.5) * spread * 0.5;
    const dx = (Math.random() - 0.5) * spread;
    const dy = -10 - Math.random() * 20;
    d.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(0.4)`, opacity: 0.9 },
        { transform: `translate(${x + dx}px, ${y + dy}px) scale(${1.6 + Math.random()})`, opacity: 0 },
      ],
      { duration: ms, delay: i * 30, easing: 'ease-out', fill: 'both' },
    ).finished.then(() => d.remove());
  }
}

/** 斬撃の線（中心 p、角度 deg） */
function slash(ctx: FxContext, p: Pt, deg: number, delay = 0) {
  const d = el(ctx, 'fx-proj fx-slash', { x: 0, y: 0 });
  d.animate(
    [
      { transform: `translate(${p.x}px, ${p.y}px) rotate(${deg}deg) scaleX(0)`, opacity: 1 },
      { transform: `translate(${p.x}px, ${p.y}px) rotate(${deg}deg) scaleX(1.1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${p.x}px, ${p.y}px) rotate(${deg}deg) scaleX(1.2) scaleY(0.3)`, opacity: 0 },
    ],
    { duration: 380, delay, easing: 'ease-out', fill: 'both' },
  ).finished.then(() => d.remove());
}

/** 広がる輪（衝撃波） */
function ring(ctx: FxContext, p: Pt, cls: string, size: number, ms = 520) {
  const r = el(ctx, `fx-proj ${cls}`, { x: 0, y: 0 });
  r.animate(
    [
      { transform: `translate(${p.x}px, ${p.y}px) scale(0.2)`, opacity: 1 },
      { transform: `translate(${p.x}px, ${p.y}px) scale(${size / 20})`, opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out', fill: 'both' },
  ).finished.then(() => r.remove());
}

const jitter = (p: Pt, r: number): Pt => ({ x: p.x + (Math.random() - 0.5) * r, y: p.y + (Math.random() - 0.5) * r * 0.5 });

/** これまでの火の玉（カード固有の演出がないとき） */
const fireballAttack: AttackFx = async (ctx, from, to, amount, fast) => {
  const n = fast ? 1 : clamp(Math.round(amount / 5), 1, 9);
  fly(ctx, from, to, n, 'fx-fireball', 420, 55, 20, 26);
  await sleep(420 + n * 55);
  burst(ctx, to, 'fx-burst-atk', clamp(30 + amount * 1.5, 36, 110), 360);
};

/** 兵舎：兵士たちの剣が突撃して、×字に斬りつける */
const barracksAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  const n = fast ? 1 : 3;
  for (let i = 0; i < n; i++) projectile(ctx, 'fx-blade', jitter(from, 30), jitter(to, 24), 380, { delay: i * 70, rotate: true, arc: 10, easing: 'ease-in' });
  await sleep(380 + (n - 1) * 70);
  slash(ctx, to, -35);
  slash(ctx, to, 35, 90);
  burst(ctx, to, 'fx-burst-steel', 60, 320);
  await sleep(200);
};

/** 投石機：大きな岩が高く弧を描いて落ち、土煙が上がる */
const catapultAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  const dur = fast ? 420 : 760;
  projectile(ctx, 'fx-boulder', from, to, dur, { arc: 60, bend: from.x < 400 ? 140 : -140, spin: 540, grow: 2.1, easing: 'cubic-bezier(.3,.1,.7,1)' });
  await sleep(dur);
  burst(ctx, to, 'fx-burst-atk', 90, 420);
  puff(ctx, to, 'fx-dust', fast ? 4 : 9, 90, 800);
  for (let i = 0; i < (fast ? 0 : 7); i++) {
    const d = el(ctx, 'fx-debris', to);
    const dx = (Math.random() - 0.5) * 120;
    d.animate(
      [
        { transform: 'translate(-50%, -50%)', opacity: 1 },
        { transform: `translate(${dx}px, ${-20 - Math.random() * 30}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx * 1.3}px, 30px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 700, easing: 'ease-out' },
    ).finished.then(() => d.remove());
  }
  shake(ctx, 6, 320);
  await sleep(220);
};

/** 弓兵隊：矢の雨が弧を描いて降りそそぐ */
const archersAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  const n = fast ? 2 : 8;
  for (let i = 0; i < n; i++) projectile(ctx, 'fx-arrow', jitter(from, 50), jitter(to, 70), 560, { delay: i * 40, arc: 60, bend: (i % 2 ? 1 : -1) * (30 + Math.random() * 50), rotate: true, easing: 'cubic-bezier(.35,0,.75,1)' });
  await sleep(560);
  for (let i = 0; i < Math.min(n, 5); i++) setTimeout(() => burst(ctx, jitter(to, 60), 'fx-burst-steel', 22, 240), i * 40);
  await sleep(n * 40);
};

/** 大砲台：砲口が火を噴き、砲弾が飛んで大爆発 */
const cannonAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  burst(ctx, from, 'fx-burst-muzzle', 60, 260);
  puff(ctx, from, 'fx-smoke', fast ? 3 : 7, 40, 900);
  shake(ctx, 3, 160);
  const dur = fast ? 240 : 320;
  projectile(ctx, 'fx-cannonball', from, to, dur, { arc: 18, easing: 'ease-in' });
  await sleep(dur);
  burst(ctx, to, 'fx-burst-atk', 130, 480);
  ring(ctx, to, 'fx-ring-fire', 140, 480);
  puff(ctx, to, 'fx-smoke', fast ? 3 : 6, 70, 900);
  flash(ctx, 'fx-flash-red', 0.25);
  shake(ctx, 8, 360);
  await sleep(240);
};

/** 槍兵隊：槍がまっすぐ投げ込まれて突き刺さる */
const spearmenAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  const n = fast ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const t = { x: to.x + (i - (n - 1) / 2) * 26, y: to.y };
    projectile(ctx, 'fx-spear', { x: from.x + (i - (n - 1) / 2) * 20, y: from.y }, t, 300, { delay: i * 80, rotate: true, easing: 'cubic-bezier(.5,0,1,1)' });
    setTimeout(() => burst(ctx, t, 'fx-burst-steel', 34, 260), 300 + i * 80);
  }
  await sleep(300 + (n - 1) * 80 + 160);
};

/** 騎士団：黄金の槍を構えた突撃が駆け抜け、衝撃波が広がる */
const knightsAttack: AttackFx = async (ctx, from, to, _amount, fast) => {
  const dur = fast ? 260 : 380;
  // 残像
  for (let i = 0; i < (fast ? 1 : 4); i++) {
    const g = projectile(ctx, 'fx-lance', from, to, dur, { delay: i * 35, rotate: true, easing: 'cubic-bezier(.6,0,.9,.6)' });
    g.style.opacity = String(1 - i * 0.22);
    if (i > 0) g.classList.add('fx-lance-ghost');
  }
  // 蹄の土ぼこり
  for (let i = 1; i <= (fast ? 0 : 4); i++) {
    const t = i / 5;
    setTimeout(() => puff(ctx, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, 'fx-dust', 2, 30, 500), dur * t);
  }
  await sleep(dur);
  ring(ctx, to, 'fx-ring-gold', 150, 560);
  burst(ctx, to, 'fx-burst-gold', 100, 420);
  shake(ctx, 7, 340);
  await sleep(220);
};

const ATTACK_FX: Record<string, AttackFx> = {
  barracks: barracksAttack,
  catapult: catapultAttack,
  archers: archersAttack,
  cannon: cannonAttack,
  spearmen: spearmenAttack,
  knights: knightsAttack,
};
