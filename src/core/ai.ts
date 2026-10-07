// CPUの思考。「残りターンを考慮した価値（コイン換算）÷コスト」が高いカードから買う。

import { countOwned, levelOf, scaleAmount } from './cards';
import { buyError, canReroll, destroyTargets, effectiveFaces, opp } from './rules';
import type { Action, AiWeights, BattleState, CardDef, GameData, PlayerState, Side } from './types';

export interface AiProfile {
  weights: AiWeights;
  randomness: number; // 0〜1。評価値に掛かる揺らぎ
}

export const DEFAULT_AI: AiProfile = {
  weights: { economy: 1, attack: 1, counter: 1, magic: 1 },
  randomness: 0.2,
};

/** 想定残りターン */
function remainingTurns(state: BattleState, side: Side): number {
  const me = state.players[side];
  const them = state.players[opp(side)];
  const byTurn = 15 - state.turn;
  const byHp = Math.ceil(Math.min(me.hp, them.hp) / 14);
  return Math.max(1, Math.min(byTurn, byHp, 12));
}

/** その面が出る確率（偏ったサイコロ・出ない目を反映） */
function faceProb(faces: number[], targetFaces: number[] | undefined): number {
  if (!targetFaces) return 0;
  let n = 0;
  for (const f of faces) if (targetFaces.includes(f)) n++;
  return n / faces.length;
}

/** カード1枚が1回発動したときのコイン（経済） */
function econYield(p: PlayerState, data: GameData, card: CardDef, extraWheat = 0, extraAttack = 0): number {
  let coins = 0;
  const lv = levelOf(p, card.id);
  for (const e of card.effects) {
    if (e.type === 'gain_coins') coins += scaleAmount(e.amount, lv);
    else if (e.type === 'gain_coins_per') {
      let n = countOwned(p, data, e.per);
      if (e.per === 'category:attack') n += extraAttack;
      else n += extraWheat;
      coins += scaleAmount(e.amount, lv) * Math.max(n, 1);
    } else if (e.type === 'gain_coins_growing') coins += scaleAmount(e.amount, lv) + 1.5;
  }
  return coins;
}

function attackYield(p: PlayerState, card: CardDef): number {
  let d = 0;
  for (const e of card.effects) if (e.type === 'deal_damage') d += scaleAmount(e.amount, levelOf(p, card.id));
  return d;
}

/** ある出目が出たときの価値（コイン換算）。自分の施設＋相手のカウンター */
export function faceValue(state: BattleState, data: GameData, side: Side, face: number): number {
  const me = state.players[side];
  const them = state.players[opp(side)];
  const k = data.config.coinToDamage;
  let v = 0;
  for (const f of me.facilities) {
    const c = data.cards[f.cardId];
    if (!c.faces?.includes(face)) continue;
    if (c.category === 'economy') {
      let coins = 0;
      for (const e of c.effects) {
        if (e.type === 'gain_coins') coins += e.amount;
        else if (e.type === 'gain_coins_per') coins += e.amount * countOwned(me, data, e.per);
        else if (e.type === 'gain_coins_growing') coins += e.amount + f.growth;
      }
      v += coins;
    } else if (c.category === 'attack') v += attackYield(me, c) / k;
  }
  for (const f of them.facilities) {
    const c = data.cards[f.cardId];
    if (c.category !== 'counter' || !c.faces?.includes(face)) continue;
    for (const e of c.effects) {
      if (e.type === 'deal_damage' || e.type === 'heal') v -= e.amount / k;
      else if (e.type === 'steal_coins') v -= Math.min(e.amount, me.coins);
      else if (e.type === 'reduce_damage') v -= e.amount / k;
    }
  }
  return v;
}

function expectedRollValue(state: BattleState, data: GameData, side: Side, faces: number[]): number {
  let s = 0;
  for (const f of faces) s += faceValue(state, data, side, f);
  return s / faces.length;
}

/** カードの価値（コイン換算） */
export function cardValue(state: BattleState, data: GameData, side: Side, card: CardDef, w: AiWeights): number {
  const me = state.players[side];
  const them = state.players[opp(side)];
  const k = data.config.coinToDamage;
  const R = remainingTurns(state, side);
  const myFaces = data.dice[me.dice].faces;
  const oppFaces = data.dice[them.dice].faces;
  const uses = data.config.magicUses;

  switch (card.category) {
    case 'economy': {
      let ev = faceProb(myFaces, card.faces) * econYield(me, data, card);
      // 相乗効果：麦畑→製粉所、攻撃→戦利品市場
      if (card.id === 'wheat') {
        const mill = data.cards.mill;
        if (mill) ev += countOwned(me, data, 'mill') * faceProb(myFaces, mill.faces) * 2;
      }
      return ev * Math.max(0, R - 2) * w.economy;
    }
    case 'attack': {
      let ev = (faceProb(myFaces, card.faces) * attackYield(me, card)) / k;
      const spoils = data.cards.spoils;
      if (spoils) ev += countOwned(me, data, 'spoils') * faceProb(myFaces, spoils.faces);
      return ev * R * w.attack;
    }
    case 'counter': {
      const p = faceProb(oppFaces, card.faces);
      let ev = 0;
      for (const e of card.effects) {
        if (e.type === 'deal_damage') ev += e.amount / k;
        else if (e.type === 'heal') ev += (me.hp < me.maxHp ? e.amount : e.amount / 2) / k;
        else if (e.type === 'steal_coins') ev += Math.min(e.amount, 2);
        else if (e.type === 'reduce_damage') {
          const oppHasAttack = them.facilities.some((f) => data.cards[f.cardId].category === 'attack');
          ev += (oppHasAttack ? e.amount : 1) / k;
        }
      }
      return p * ev * R * w.counter;
    }
    case 'magic': {
      const n = Math.min(uses, R + 1);
      let v = 0;
      for (const e of card.effects) {
        const a = 'amount' in e ? scaleAmount(e.amount, levelOf(me, card.id)) : 0;
        switch (e.type) {
          case 'heal':
            v += Math.min(a * n, me.maxHp - me.hp + a) / k;
            break;
          case 'steal_coins':
            v += Math.min(a, Math.max(1, them.coins)) + (n - 1) * Math.min(a, 2.5);
            break;
          case 'income_bonus':
            v += a * n;
            break;
          case 'economy_multiplier': {
            let econ = 0;
            for (const f of me.facilities) {
              const c = data.cards[f.cardId];
              if (c.category === 'economy') econ += faceProb(myFaces, c.faces) * econYield(me, data, c);
            }
            v += econ * (a - 1) * n;
            break;
          }
          case 'attack_multiplier': {
            let dmg = 0;
            for (const f of me.facilities) {
              const c = data.cards[f.cardId];
              if (c.category === 'attack') dmg += faceProb(myFaces, c.faces) * attackYield(me, c);
            }
            v += ((dmg * (a - 1)) / k) * n;
            break;
          }
          case 'reroll':
            v += 0.35 * Math.max(0, expectedRollValue(state, data, side, myFaces)) * n;
            break;
          case 'ban_face': {
            if (e.target === 'self') {
              const before = expectedRollValue(state, data, side, myFaces);
              const worst = bestFaceToBan(state, data, side, 'self');
              const after = expectedRollValue(state, data, side, myFaces.filter((f) => f !== worst));
              v += Math.max(0, after - before) * n;
            } else {
              const o = opp(side);
              const before = expectedRollValue(state, data, o, oppFaces);
              const best = bestFaceToBan(state, data, side, 'opponent');
              const after = expectedRollValue(state, data, o, oppFaces.filter((f) => f !== best));
              v += Math.max(0, before - after) * n;
            }
            break;
          }
          case 'destroy_facility': {
            const targets = them.facilities.filter((f) => data.cards[f.cardId].cost <= e.maxCost);
            if (targets.length === 0) return 0;
            const best = Math.max(...targets.map((f) => data.cards[f.cardId].cost));
            v += best * 0.8 * Math.min(n, targets.length);
            break;
          }
          case 'spend_all_for_damage':
            v += ((data.config.baseIncome + 1.5) * a * n) / k;
            break;
        }
      }
      return v * w.magic;
    }
  }
}

/** 封印（self）なら自分の一番悪い目、沈黙（opponent）なら相手の一番良い目 */
export function bestFaceToBan(state: BattleState, data: GameData, side: Side, target: 'self' | 'opponent'): number {
  const who = target === 'self' ? side : opp(side);
  const faces = [...new Set(data.dice[state.players[who].dice].faces)];
  let best = faces[0];
  let bestV = target === 'self' ? Infinity : -Infinity;
  for (const f of faces) {
    const v = faceValue(state, data, who, f);
    if (target === 'self' ? v < bestV : v > bestV) {
      bestV = v;
      best = f;
    }
  }
  return best;
}

/** 現在の局面でCPUが取る行動を1つ返す */
export function chooseAction(state: BattleState, data: GameData, ai: AiProfile, rand: () => number): Action {
  const side = state.active;
  switch (state.phase) {
    case 'roll':
      return { type: 'roll' };
    case 'reroll': {
      if (!canReroll(state, data)) return { type: 'keep' };
      const cur = faceValue(state, data, side, state.lastRoll!);
      const avg = expectedRollValue(state, data, side, effectiveFaces(state, data, side));
      return cur < avg ? { type: 'reroll' } : { type: 'keep' };
    }
    case 'destroy': {
      const targets = destroyTargets(state, data, side);
      if (targets.length === 0) return { type: 'destroy', cardId: null };
      const o = opp(side);
      let best = targets[0];
      let bestV = -Infinity;
      for (const id of targets) {
        const v = cardValue(state, data, o, data.cards[id], DEFAULT_AI.weights) + data.cards[id].cost * 0.1;
        if (v > bestV) {
          bestV = v;
          best = id;
        }
      }
      return { type: 'destroy', cardId: best };
    }
    case 'buy':
      return chooseBuy(state, data, ai, rand);
    default:
      return { type: 'end_turn' };
  }
}

function chooseBuy(state: BattleState, data: GameData, ai: AiProfile, rand: () => number): Action {
  const side = state.active;
  const me = state.players[side];
  type Cand = { card: CardDef; score: number; affordable: boolean };
  const cands: Cand[] = [];
  for (const id of me.market) {
    const card = data.cards[id];
    const err = buyError(state, data, side, id);
    if (err && err !== 'コイン不足') continue;
    const value = cardValue(state, data, side, card, ai.weights);
    const noise = 1 + ai.randomness * (rand() * 2 - 1);
    const score = (value / Math.max(1, card.cost)) * noise;
    if (score < 1) continue;
    cands.push({ card, score, affordable: !err });
  }
  if (cands.length === 0) return { type: 'end_turn' };
  cands.sort((a, b) => b.score - a.score);
  const bestAll = cands[0];
  const bestAff = cands.find((c) => c.affordable);
  // 高価値カードのために貯金するか
  if (!bestAll.affordable) {
    const shortfall = bestAll.card.cost - me.coins;
    if (shortfall <= 4 && (!bestAff || bestAll.score > bestAff.score * 1.3)) return { type: 'end_turn' };
  }
  if (!bestAff) return { type: 'end_turn' };
  const card = bestAff.card;
  const banEffect = card.effects.find((e) => e.type === 'ban_face') as { target: 'self' | 'opponent' } | undefined;
  if (banEffect) return { type: 'buy', cardId: card.id, face: bestFaceToBan(state, data, side, banEffect.target) };
  return { type: 'buy', cardId: card.id };
}
