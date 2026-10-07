// 出目解決後のエフェクト再生（Web Animations API で命令的に描く）
import type { Fx, GameData, Side } from '../core/types';

type Pt = { x: number; y: number };

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 同じカード・同じ種類が続く演出はまとめる（麦畑×3 → +9 を1回） */
export function groupFx(list: Fx[]): Fx[] {
  const out: Fx[] = [];
  for (const fx of list) {
    const last = out[out.length - 1];
    if (last && last.kind === fx.kind && 'card' in last && 'card' in fx && last.card === fx.card && sameSide(last, fx)) {
      (last as { amount: number }).amount += fx.amount;
    } else out.push({ ...fx });
  }
  return out;
}

function sameSide(a: Fx, b: Fx): boolean {
  return JSON.stringify({ ...a, amount: 0 }) === JSON.stringify({ ...b, amount: 0 });
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
export async function playFx(ctx: FxContext, fx: Fx, onImpact: () => void): Promise<void> {
  const name = 'card' in fx ? ctx.data.cards[fx.card]?.name ?? '' : '';
  const fast = reduced();

  switch (fx.kind) {
    case 'coin': {
      const chip = chipEl(ctx, fx.side, fx.card);
      const from = center(ctx, chip, coinPt(ctx, fx.side));
      const to = coinPt(ctx, fx.side);
      pulse(chip, 'fx-pulse-eco');
      popText(ctx, { x: from.x, y: from.y - 6 }, `${name} <b>+${fx.amount}</b>`, 'fx-eco', clamp(16 + fx.amount * 0.9, 16, 34));
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
      const n = fast ? 1 : clamp(Math.round(fx.amount / 5), 1, 9);
      fly(ctx, from, to, n, 'fx-fireball', 420, 55, 20, 26);
      await sleep(420 + n * 55);
      burst(ctx, to, 'fx-burst-atk', clamp(30 + fx.amount * 1.5, 36, 110), 360);
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
      if (fx.amount <= 0) {
        popText(ctx, coinPt(ctx, fx.from), `${name}：コインなし`, 'fx-ctr', 16);
        await sleep(500);
        return;
      }
      pulse(chipEl(ctx, fx.to, fx.card), 'fx-pulse-ctr');
      const from = coinPt(ctx, fx.from);
      const to = coinPt(ctx, fx.to);
      popText(ctx, from, `${name} -${fx.amount}`, 'fx-ctr', 20);
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
  }
}
