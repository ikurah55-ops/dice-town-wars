// 環境効果フック。戦闘ロジックは決まったタイミングで runHook を呼び、
// 効果の種類（EnvEffect.type）ごとの処理をここに差し込む。
// 新しい環境効果は、既存の種類の組み合わせなら environments.json に足すだけでよい。

import type { BattleState, CardDef, EnvEffect, EnvironmentDef, PlayerState } from './types';

/** 施設の発動量を計算するときに渡す情報 */
export interface FacilityContext {
  card: CardDef;
  face: number; // 発動した出目
  kind: 'coin' | 'damage' | 'shield' | 'heal' | 'steal' | 'counter_damage';
}

interface EnvHooks {
  /** 戦闘開始時（初期コイン・HP） */
  battleStart?: (p: PlayerState, e: EnvEffect) => void;
  /** 基本収入の計算時 */
  baseIncome?: (v: number, e: EnvEffect) => number;
  /** カードのコスト計算時 */
  cost?: (v: number, card: CardDef, e: EnvEffect) => number;
  /** 施設の発動量の計算時（加算は倍率より先に処理する） */
  facilityAdd?: (v: number, ctx: FacilityContext, e: EnvEffect) => number;
  facilityMul?: (v: number, ctx: FacilityContext, e: EnvEffect) => number;
  /** 魔法の効果回数の設定時 */
  magicUses?: (v: number, e: EnvEffect) => number;
  /** サイコロを振るとき（面ごとの重み） */
  faceWeight?: (w: number, face: number, e: EnvEffect) => number;
  /** 長期戦ダメージの開始ターンの判定時 */
  longBattleTurn?: (v: number, e: EnvEffect) => number;
}

type Of<T extends EnvEffect['type']> = Extract<EnvEffect, { type: T }>;

const HOOKS: { [K in EnvEffect['type']]: EnvHooks } = {
  econ_bonus_per_card: {
    facilityAdd: (v, ctx, e) => (ctx.kind === 'coin' ? v + (e as Of<'econ_bonus_per_card'>).amount : v),
  },
  attack_multiplier: {
    facilityMul: (v, ctx, e) => (ctx.kind === 'damage' ? v * (e as Of<'attack_multiplier'>).amount : v),
  },
  base_income_set: { baseIncome: (_v, e) => (e as Of<'base_income_set'>).amount },
  base_income_delta: { baseIncome: (v, e) => v + (e as Of<'base_income_delta'>).amount },
  face_multiplier: {
    facilityMul: (v, ctx, e) => {
      const f = e as Of<'face_multiplier'>;
      return (ctx.kind === 'coin' || ctx.kind === 'damage') && f.faces.includes(ctx.face) ? v * f.amount : v;
    },
  },
  face_weight: {
    faceWeight: (w, face, e) => {
      const f = e as Of<'face_weight'>;
      return f.faces.includes(face) ? w * f.amount : w;
    },
  },
  cost_delta: { cost: (v, _card, e) => v + (e as Of<'cost_delta'>).amount },
  counter_multiplier: {
    facilityMul: (v, ctx, e) =>
      ctx.card.category === 'counter' ? v * (e as Of<'counter_multiplier'>).amount : v,
  },
  magic_uses: { magicUses: (_v, e) => (e as Of<'magic_uses'>).amount },
  long_battle_turn: { longBattleTurn: (_v, e) => (e as Of<'long_battle_turn'>).amount },
  start_coins_delta: {
    battleStart: (p, e) => {
      p.coins += (e as Of<'start_coins_delta'>).amount;
    },
  },
  start_hp_delta: {
    battleStart: (p, e) => {
      p.maxHp += (e as Of<'start_hp_delta'>).amount;
      p.hp = p.maxHp;
    },
  },
};

function effects(env: EnvironmentDef | null | undefined): EnvEffect[] {
  return env?.effects ?? [];
}

export function envBattleStart(env: EnvironmentDef | null, p: PlayerState) {
  for (const e of effects(env)) HOOKS[e.type].battleStart?.(p, e);
}

export function envBaseIncome(state: BattleState, v: number): number {
  for (const e of effects(state.environment)) v = HOOKS[e.type].baseIncome?.(v, e) ?? v;
  return v;
}

export function envCost(env: EnvironmentDef | null, card: CardDef): number {
  let v = card.cost;
  for (const e of effects(env)) v = HOOKS[e.type].cost?.(v, card, e) ?? v;
  return Math.max(0, v);
}

export function envFacility(state: BattleState, v: number, ctx: FacilityContext): number {
  const list = effects(state.environment);
  for (const e of list) v = HOOKS[e.type].facilityAdd?.(v, ctx, e) ?? v;
  for (const e of list) v = HOOKS[e.type].facilityMul?.(v, ctx, e) ?? v;
  return v;
}

export function envMagicUses(env: EnvironmentDef | null, v: number): number {
  for (const e of effects(env)) v = HOOKS[e.type].magicUses?.(v, e) ?? v;
  return v;
}

export function envFaceWeight(state: BattleState, face: number): number {
  let w = 1;
  for (const e of effects(state.environment)) w = HOOKS[e.type].faceWeight?.(w, face, e) ?? w;
  return w;
}

export function envLongBattleTurn(state: BattleState, v: number): number {
  for (const e of effects(state.environment)) v = HOOKS[e.type].longBattleTurn?.(v, e) ?? v;
  return v;
}
