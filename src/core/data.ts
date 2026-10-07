import cardsJson from '../data/cards.json';
import diceJson from '../data/dice.json';
import bossesJson from '../data/bosses.json';
import configJson from '../data/config.json';
import type { BossDef, CardDef, DiceDef, GameConfig, GameData } from './types';

/** 任意のJSONからゲームデータを組み立てる（シミュレーションで差し替え可能） */
export function buildGameData(
  cards: CardDef[],
  dice: DiceDef[],
  bosses: BossDef[],
  config: GameConfig,
): GameData {
  const cardMap: Record<string, CardDef> = {};
  for (const c of cards) cardMap[c.id] = c;
  const diceMap: Record<string, DiceDef> = {};
  for (const d of dice) {
    if (d.faces.length !== 6) throw new Error(`サイコロ ${d.id} の面が6つではありません`);
    diceMap[d.id] = d;
  }
  for (const b of bosses) {
    for (const id of b.loadout) if (!cardMap[id]) throw new Error(`ボス ${b.id} の持ち込みカード ${id} が存在しません`);
    if (!diceMap[b.dice]) throw new Error(`ボス ${b.id} のサイコロ ${b.dice} が存在しません`);
  }
  for (const id of [...config.marketBaseCards, ...config.startingCards]) {
    if (!cardMap[id]) throw new Error(`設定のカード ${id} が存在しません`);
  }
  return { cards: cardMap, cardList: cards, dice: diceMap, bosses, config };
}

export const defaultData: GameData = buildGameData(
  cardsJson as CardDef[],
  diceJson as DiceDef[],
  bossesJson as BossDef[],
  configJson as GameConfig,
);

/** ステージに応じたボスの最大HP（3ステージごとに上昇） */
export function bossMaxHp(config: GameConfig, stage: number): number {
  return config.bossMaxHp + Math.floor((stage - 1) / 3) * config.bossHpGrowthPer3Stages;
}

/** 持ち込みカード候補（基本カード以外） */
export function loadoutCandidates(data: GameData): CardDef[] {
  return data.cardList.filter((c) => !c.base);
}

export function validateLoadout(data: GameData, ids: string[]): string | null {
  const { cards: n, maxMagic } = data.config.loadout;
  if (ids.length !== n) return `持ち込みカードを${n}枚選んでください`;
  if (new Set(ids).size !== ids.length) return '同じカードは1枚までです';
  const magic = ids.filter((id) => data.cards[id]?.category === 'magic').length;
  if (magic > maxMagic) return `魔法は${maxMagic}枚までです`;
  return null;
}
