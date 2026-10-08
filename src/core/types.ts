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
  | { type: 'reroll'; amount: number }
  | { type: 'restrict_faces'; faces: number[] } // 自分のサイコロがこの目だけになる
  | { type: 'change_environment' } // 環境効果をランダムに変える（効果中だけ）
  | { type: 'halve_attack_damage' }; // 受ける攻撃カードのダメージを半分（切り上げ）

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  cost: number;
  faces?: number[]; // 施設のみ。カウンターは相手の出目
  base?: boolean; // 基本カード（毎戦市場に並ぶ）
  timing?: MagicTiming; // 魔法のみ
  effects: Effect[];
  story?: CardStoryDef; // ストーリーモードでの解放・強化
}

export type BossType = 'attack' | 'economy' | 'defense' | 'disrupt';

export interface CardStoryDef {
  unlockAfterStage: number; // このステージをクリアした後に解放できる（0なら最初から解放済み）
  unlockExp: number;
  levelable: boolean;
  levelCost: number[]; // Lv2〜Lv5への必要経験値
  bossTheme: BossType | null; // ボスが使う型
  bossOrder?: number; // 型ごとの持ち込みリストでの順番（1始まり）
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
  magicCooldown: number; // 魔法の効果が切れた後、同じ魔法を買い直せない手番数
  loadout: { cards: number; maxMagic: number };
  coinToDamage: number;
  levelBonusPerLevel: number; // 1レベルごとの効果量の増加（0.1 = 10%）
  maxCardLevel: number;
}

export interface GameData {
  cards: Record<string, CardDef>;
  cardList: CardDef[];
  dice: Record<string, DiceDef>;
  bosses: BossDef[];
  config: GameConfig;
  environments: Record<string, EnvironmentDef>;
  environmentList: EnvironmentDef[];
}

// ===== 環境効果 =====

/** 環境効果の中身。type ごとの処理は core/env.ts のフックで実装する */
export type EnvEffect =
  | { type: 'econ_bonus_per_card'; amount: number } // 経済カード1枚が発動するたびに+n
  | { type: 'attack_multiplier'; amount: number } // 攻撃カードのダメージ倍率
  | { type: 'base_income_set'; amount: number } // 基本収入をこの値にする
  | { type: 'base_income_delta'; amount: number } // 基本収入に加算
  | { type: 'face_multiplier'; faces: number[]; amount: number } // その出目で発動した施設のコイン・ダメージ倍率
  | { type: 'face_weight'; faces: number[]; amount: number } // その面が出やすくなる重み
  | { type: 'cost_delta'; amount: number } // 全カードのコストに加算
  | { type: 'counter_multiplier'; amount: number } // カウンターカードの効果倍率
  | { type: 'magic_uses'; amount: number } // 魔法の効果回数
  | { type: 'long_battle_turn'; amount: number } // 長期戦ダメージが始まるターン（このターンを超えたら）
  | { type: 'start_coins_delta'; amount: number } // 初期コインに加算
  | { type: 'start_hp_delta'; amount: number }; // 最大HPに加算

export interface EnvironmentDef {
  id: string;
  name: string;
  description: string;
  effects: EnvEffect[];
  color?: string; // 戦闘画面の背景色
  icon?: string; // 発表画面の仮アイコン（イラストは後で差し替え）
  detail?: string; // 初めて出たときの詳しい説明
}

// ===== 拡張用の入口 =====

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
  startCoins?: number; // 省略時は config.startCoins
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
  /** コインの端数（レベル補正で小数になった分を持ち越す） */
  coinFrac: number;
  dice: string;
  market: string[]; // 市場に並ぶカードID（8枚）
  stock: Record<string, number>;
  facilities: OwnedFacility[];
  magics: ActiveMagic[];
  cardLevels: Record<string, number>;
  bought: Record<string, number>; // 統計用
  /** 魔法の再購入待ち（残り手番数） */
  cooldowns: Record<string, number>;
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
  environment: EnvironmentDef | null;
  /** 戦闘開始時の環境効果（魔法で変えたあと戻すため） */
  baseEnvironment: EnvironmentDef | null;
  log: LogEntry[];
  /** true のときログを記録しない（シミュレーション高速化） */
  quiet: boolean;
  nextUid: number;
  /** この手番に建てた施設（手番終了時の表示用） */
  builtThisTurn: string[];
}

/** 演出用の構造化イベント（UIがエフェクトを出すのに使う。ロジックには影響しない） */
export type Fx =
  | { kind: 'coin'; side: Side; amount: number; raw?: number; card: string } // 経済カードの獲得（raw は端数込み）
  | { kind: 'attack'; side: Side; amount: number; card: string } // 攻撃カード1枚分（軽減前）
  | { kind: 'hit'; target: Side; amount: number; blocked: number } // 攻撃の合計が命中
  | { kind: 'shield'; side: Side; amount: number; card: string } // 見張り塔など
  | { kind: 'heal'; side: Side; amount: number; card: string }
  | { kind: 'steal'; from: Side; to: Side; amount: number; card: string }
  | { kind: 'zap'; target: Side; amount: number; card: string } // カウンターのダメージ
  | { kind: 'income'; side: Side; amount: number; card: string } // 徴税令つきの収入（合計）
  | { kind: 'destroy'; side: Side; target: Side; card: string } // 破城槌で壊した施設
  | { kind: 'merc'; side: Side; target: Side; coins: number; amount: number; card: string } // 傭兵契約
  | { kind: 'storm'; amounts: [number, number] } // 長期戦ダメージ
  | { kind: 'built'; side: Side; cards: string[] } // その手番に建てた施設
  | { kind: 'env'; side: Side; envId: string | null; card: string }; // 環境効果が変わった（null は元に戻った）

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
