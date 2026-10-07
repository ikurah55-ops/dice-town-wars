// CPU同士の自動対戦（シミュレーション・テスト用）

import { chooseAction, type AiProfile } from './ai';
import { applyAction, createBattle } from './rules';
import type { BattleModifiers, BattleState, Combatant, GameData } from './types';

export function runAutoBattle(
  data: GameData,
  a: Combatant,
  b: Combatant,
  ais: [AiProfile, AiProfile],
  seed: number,
  rand: () => number,
  opts: { quiet?: boolean; modifiers?: BattleModifiers; maxSteps?: number } = {},
): BattleState {
  const state = createBattle(data, a, b, { seed, quiet: opts.quiet ?? true, modifiers: opts.modifiers });
  const maxSteps = opts.maxSteps ?? 5000;
  for (let i = 0; i < maxSteps && state.phase !== 'over'; i++) {
    applyAction(state, data, chooseAction(state, data, ais[state.active], rand));
  }
  if (state.phase !== 'over') throw new Error('対戦が終わりませんでした');
  return state;
}
