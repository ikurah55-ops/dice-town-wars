import type { CardDef, Effect, GameData, PlayerState } from './types';

/** カードレベルによる効果量の補正（将来の成長要素用。今はLv1=そのまま） */
export function scaleAmount(amount: number, level: number): number {
  if (level <= 1) return amount;
  return Math.round(amount * (1 + 0.2 * (level - 1)));
}

export function levelOf(p: PlayerState, cardId: string): number {
  return p.cardLevels[cardId] ?? 1;
}

export function countOwned(p: PlayerState, data: GameData, per: string): number {
  if (per.startsWith('category:')) {
    const cat = per.slice('category:'.length);
    return p.facilities.filter((f) => data.cards[f.cardId].category === cat).length;
  }
  return p.facilities.filter((f) => f.cardId === per).length;
}

export const CATEGORY_LABEL: Record<string, string> = {
  economy: '経済',
  attack: '攻撃',
  counter: 'カウンター',
  magic: '魔法',
};

function perLabel(per: string, data: GameData): string {
  if (per.startsWith('category:')) return `${CATEGORY_LABEL[per.slice(9)]}カード`;
  return data.cards[per]?.name ?? per;
}

/** 効果の説明文（数値はデータから生成） */
export function describeEffect(e: Effect, data: GameData, level = 1): string {
  const a = 'amount' in e ? scaleAmount(e.amount, level) : 0;
  switch (e.type) {
    case 'gain_coins':
      return `${a}コイン`;
    case 'gain_coins_per':
      return `${perLabel(e.per, data)}1枚につき${a}コイン`;
    case 'gain_coins_growing':
      return `${a}コインから、発動のたびに+${e.step}`;
    case 'deal_damage':
      return `${a}ダメージ`;
    case 'reduce_damage':
      return `そのターン受けるダメージ-${a}`;
    case 'heal':
      return `HPを${a}回復`;
    case 'steal_coins':
      return `相手から${a}コイン奪う`;
    case 'income_bonus':
      return `基本収入+${a}`;
    case 'ban_face':
      return e.target === 'self' ? '自分のサイコロの目を1つ指定し、出なくする' : '相手のサイコロの目を1つ指定し、出なくする';
    case 'economy_multiplier':
      return `経済カードの獲得コインが${a}倍`;
    case 'attack_multiplier':
      return `攻撃カードのダメージが${a}倍`;
    case 'destroy_facility':
      return `相手のコスト${e.maxCost}以下の施設を1枚破壊`;
    case 'spend_all_for_damage':
      return `残りコインをすべて払い、1コインにつき${a}ダメージ`;
    case 'reroll':
      return `1ターンに${a}回、振り直せる`;
  }
}

// サイコロ系の魔法は効果文に対象が書かれているので前置きなし
const TIMING_LABEL: Record<string, string> = {
  turn_start: '手番開始時：',
  turn_end: '手番終了時：',
};

export function describeCard(card: CardDef, data: GameData, level = 1): string {
  const body = card.effects.map((e) => describeEffect(e, data, level)).join('／');
  if (card.category === 'magic') {
    const t = card.timing ? (TIMING_LABEL[card.timing] ?? '') : '';
    return `${t}${body}（${data.config.magicUses}回）`;
  }
  return body;
}

export function facesLabel(card: CardDef): string {
  if (!card.faces) return '';
  return card.faces.join('・');
}
