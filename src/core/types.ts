// ===== データ定義（JSON の形） =====

export type CardCategory = 'economy' | 'attack' | 'counter' | 'magic';
export type MagicTiming = 'turn_start' | 'own_roll' | 'opp_roll' | 'turn_end';

/** 効果は「種類＋パラメータ」。数値はすべて JSON 側 */
export type Effect =
  | { type: 'gain_coins'; amount: number }
  | { type: 'gain_coins_per'; per: string; amount: number } // per: カードID or "category:xxx"
  | { type: 'gain_coins_growing'; amount: number; step: number }
  | { type: 'deal_damage'; amount: number }
  | { type: 'reduce_damage'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'steal_coins'; amount: number }
  | { type: 'income_bonus'; amount: number }
  | { type: 'ban_face'; target: 'self' | 'opponent' }
  | { type: 'economy_multiplier'; amount: number }
  | { type: 'attack_multiplier'; amount: number }
  | { type: 'destroy_facility'; maxCost: number }
  | { type: 'spend_all_for_damage'; amount: number }
  | { type: 'reroll'; amount: number };

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  cost: number;
  faces?: number[]; // 施設のみ。カウンターは相手の出目
  base?: boolean; // 基本カード（毎戦市場に並ぶ）
  timing?: MagicTiming; // 魔法のみ
  effects: Effect[];
}

export interface DiceDef {
  id: string;
  name: string;
  faces: number[]; // 6面
  available: boolean;
  modifiers?: { incomeBonus?: number };
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  description: string;
  stage: number;
  dice: string;
  loadout: string[];
  weights: AiWeights;
  randomness: number;
}

export interface AiWeights {
  economy: number;
  attack: number;
  counter: number;
  magic: number;
}

export interface GameConfig {
  playerMaxHp: number;
  bossMaxHp: number;
  bossHpGrowthPer3Stages: number;
  startCoins: number;
  baseIncome: number;
  startingCards: string[];
  stock: { facility: number; magic: number };
  marketBaseCards: string[];
  longBattle: { afterTurn: number; damageRatio: number };
  magicUses: number;
  loadout: { cards: number; maxMagic: number };
  coinToDamage: number;
}

export interface GameData {
  cards: Record<string, CardDef>;
  cardList: CardDef[];
  dice: Record<string, DiceDef>;
  bosses: BossDef[];
  config: GameConfig;
}

// ===== 拡張用の入口 =====

/** 戦闘全体に掛かる補正（将来の環境効果） */
export interface BattleModifiers {
  economyBonus?: number; // 経済カードの獲得量に加算
  attackBonus?: number; // 攻撃カードのダメージに加算
  faceMultiplier?: Record<number, number>; // 出目ごとの効果倍率
}

/** プレイヤーの永続データ（将来の成長要素） */
export interface PlayerProfile {
  maxHpBonus?: number;
  cardLevels?: Record<string, number>;
}

export interface Combatant {
  name: string;
  maxHp: number;
  dice: string;
  loadout: string[];
  cardLevels?: Record<string, number>;
}

// ===== 戦闘の状態 =====

export type Side = 0 | 1; // 0 = プレイヤー（先攻）, 1 = CPU

export interface OwnedFacility {
  uid: number;
  cardId: string;
  growth: number; // 果樹園の成長分
}

export interface ActiveMagic {
  cardId: string;
  remaining: number;
  face?: number; // 封印・沈黙で指定した目
}

export interface PlayerState {
  name: string;
  hp: number;
  maxHp: number;
  coins: number;
  dice: string;
  market: string[]; // 市場に並ぶカードID（8枚）
  stock: Record<string, number>;
  facilities: OwnedFacility[];
  magics: ActiveMagic[];
  cardLevels: Record<string, number>;
  bought: Record<string, number>; // 統計用
}

export type Phase =
  | 'roll' // 振る待ち
  | 'reroll' // 女神：振り直すか決める
  | 'buy' // 購入フェーズ
  | 'destroy' // 破城槌：壊す施設を選ぶ
  | 'over';

export interface PendingDestroy {
  /** 'start' = 手番開始時の発動, 'buy' = 購入直後の発動 */
  resume: 'start' | 'buy';
}

export interface BattleState {
  turn: number; // ラウンド数（両者1手番ずつで1）
  active: Side;
  phase: Phase;
  players: [PlayerState, PlayerState];
  rngState: number;
  lastRoll: number | null;
  rerollUsed: boolean;
  /** このターンの見張り塔による軽減残量 */
  damageShield: number;
  pendingDestroy: PendingDestroy | null;
  winner: Side | null;
  longBattleHappened: boolean;
  modifiers: BattleModifiers;
  log: LogEntry[];
  /** true のときログを記録しない（シミュレーション高速化） */
  quiet: boolean;
  nextUid: number;
}

/** 演出用の構造化イベント（UIがエフェクトを出すのに使う。ロジックには影響しない） */
export type Fx =
  | { kind: 'coin'; side: Side; amount: number; card: string } // 経済カードの獲得
  | { kind: 'attack'; side: Side; amount: number; card: string } // 攻撃カード1枚分（軽減前）
  | { kind: 'hit'; target: Side; amount: number; blocked: number } // 攻撃の合計が命中
  | { kind: 'shield'; side: Side; amount: number; card: string } // 見張り塔など
  | { kind: 'heal'; side: Side; amount: number; card: string }
  | { kind: 'steal'; from: Side; to: Side; amount: number; card: string }
  | { kind: 'zap'; target: Side; amount: number; card: string }; // カウンターのダメージ

export interface LogEntry {
  turn: number;
  side: Side | null;
  text: string;
  kind: 'info' | 'roll' | 'coin' | 'damage' | 'heal' | 'buy' | 'magic' | 'system';
  fx?: Fx;
}

export type Action =
  | { type: 'roll' }
  | { type: 'reroll' }
  | { type: 'keep' }
  | { type: 'buy'; cardId: string; face?: number }
  | { type: 'destroy'; cardId: string | null }
  | { type: 'end_turn' };
