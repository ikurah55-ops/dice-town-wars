// ストーリーモードのロジック（UI非依存）。
// ステージ生成・経験値・解放・強化・持ち込み枠・セーブデータを扱う。

import storyConfigJson from '../data/story_config.json';
import storyStagesJson from '../data/story_stages.json';
import { createRng } from './rng';
import type { BossType, CardDef, Combatant, GameData } from './types';

// ---------- 設定 ----------

export interface StoryConfig {
  stageCount: number;
  exp: { firstClear: number; repeatClear: number; subHalfHp: number; subFastWin: number; loss: number };
  subMissions: { halfHpRatio: number; fastWinTurns: number };
  slots: { afterStage: number; slots: number }[];
  maxMagic: number;
  playerBaseHp: number;
  hpUpgrade: { amount: number; baseCost: number; costStep: number; maxCount: number };
  boss: {
    hpBase: number;
    hpPerStage: number;
    bigBossEvery: number;
    bigBossHpMult: number;
    levelEvery: number;
    maxLevel: number;
    cardsOffset: number;
    cardsDivisor: number;
    maxCards: number;
    bigBossExtraCards: number;
    startCoinsBase: number;
    startCoinsEvery: number;
    typeByRemainder: BossType[];
    dice: string;
  };
  environment: { fromStage: number; evenStagesOnly: boolean };
  typeNames: Record<BossType, string>;
  simulation: { loadoutPriority: string[]; hpCostWeight: number };
}

export interface StageOverride {
  hp?: number;
  cardLevel?: number;
  loadout?: string[];
  type?: BossType;
  environment?: string | null;
  dice?: string;
  startCoins?: number;
}

export const storyConfig = storyConfigJson as StoryConfig;
export const stageOverrides: Record<string, StageOverride> = Object.fromEntries(
  Object.entries(storyStagesJson as Record<string, unknown>).filter(([k]) => /^\d+$/.test(k)),
) as Record<string, StageOverride>;

// ---------- ステージ ----------

export interface StageDef {
  stage: number;
  type: BossType;
  typeName: string;
  isBig: boolean; // 大ボス（10の倍数）
  hp: number;
  cardLevel: number;
  loadout: string[];
  startCoins: number;
  dice: string;
  envId: string | null;
}

/** 型ごとの持ち込みリスト（bossOrder 順） */
export function bossThemeList(data: GameData, type: BossType): string[] {
  return data.cardList
    .filter((c) => c.story?.bossTheme === type)
    .sort((a, b) => (a.story!.bossOrder ?? 99) - (b.story!.bossOrder ?? 99))
    .map((c) => c.id);
}

/** 環境効果が付くステージか */
export function stageHasEnvironment(cfg: StoryConfig, s: number): boolean {
  return s >= cfg.environment.fromStage && (!cfg.environment.evenStagesOnly || s % 2 === 0);
}

/** 各ステージの環境効果をシードで決める（セーブデータに保存して固定する） */
export function rollEnvironments(data: GameData, cfg: StoryConfig, seed: number): Record<string, string | null> {
  const rand = createRng(seed);
  const ids = data.environmentList.map((e) => e.id);
  const out: Record<string, string | null> = {};
  for (let s = 1; s <= cfg.stageCount; s++) {
    out[s] = stageHasEnvironment(cfg, s) ? ids[Math.floor(rand() * ids.length)] : null;
  }
  return out;
}

/** 計算式からステージを作り、story_stages.json の上書きを当てる */
export function generateStage(
  data: GameData,
  cfg: StoryConfig,
  s: number,
  envId: string | null,
  overrides: Record<string, StageOverride> = stageOverrides,
): StageDef {
  const b = cfg.boss;
  const isBig = s % b.bigBossEvery === 0;
  let hp = b.hpBase + b.hpPerStage * (s - 1);
  if (isBig) hp = Math.round(hp * b.bigBossHpMult);
  const cardLevel = Math.min(b.maxLevel, 1 + Math.floor((s - 1) / b.levelEvery));
  let count = Math.min(b.maxCards, Math.floor((s + b.cardsOffset) / b.cardsDivisor));
  if (isBig) count = Math.min(b.maxCards, count + b.bigBossExtraCards);
  const o = overrides[String(s)] ?? {};
  const type = o.type ?? b.typeByRemainder[s % b.typeByRemainder.length];
  const stage: StageDef = {
    stage: s,
    type,
    typeName: cfg.typeNames[type],
    isBig,
    hp: o.hp ?? hp,
    cardLevel: o.cardLevel ?? cardLevel,
    loadout: o.loadout ?? bossThemeList(data, type).slice(0, count),
    startCoins: o.startCoins ?? b.startCoinsBase + Math.floor(s / b.startCoinsEvery),
    dice: o.dice ?? b.dice,
    envId: o.environment !== undefined ? o.environment : envId,
  };
  return stage;
}

export function stageLabel(st: StageDef): string {
  return `ステージ${st.stage}　${st.typeName}${st.isBig ? '（大ボス）' : ''}`;
}

/** ボスの戦闘用データ。カードレベルは基本カードを含むすべてのカードに適用 */
export function bossCombatant(data: GameData, st: StageDef): Combatant {
  const levels: Record<string, number> = {};
  for (const id of [...data.config.marketBaseCards, ...st.loadout]) levels[id] = st.cardLevel;
  return {
    name: `${st.typeName}${st.isBig ? 'の大ボス' : 'のボス'}`,
    maxHp: st.hp,
    dice: st.dice,
    loadout: st.loadout,
    cardLevels: levels,
    startCoins: st.startCoins,
  };
}

// ---------- セーブデータ ----------

export const SAVE_VERSION = 1;

export interface SubMissionState {
  halfHp: boolean;
  fastWin: boolean;
}

export interface StorySave {
  version: number;
  cleared: number[]; // クリア済みステージ
  subs: Record<string, SubMissionState>;
  exp: number;
  unlocked: string[]; // 経験値で解放したカード（最初から解放済みのものは含めない）
  levels: Record<string, number>;
  hpUps: number;
  envs: Record<string, string | null>; // ステージごとに固定した環境効果
  envSeed: number;
}

export function newSave(data: GameData, cfg: StoryConfig = storyConfig, seed = Math.floor(Math.random() * 2 ** 31)): StorySave {
  return {
    version: SAVE_VERSION,
    cleared: [],
    subs: {},
    exp: 0,
    unlocked: [],
    levels: {},
    hpUps: 0,
    envs: rollEnvironments(data, cfg, seed),
    envSeed: seed,
  };
}

/**
 * 古い・壊れたセーブデータを読み込める形に直す。
 * 新しく増えたカードは未解放・Lv1、新しく増えたステージは環境効果をシードから決める。
 */
export function migrateSave(raw: unknown, data: GameData, cfg: StoryConfig = storyConfig): StorySave {
  if (!raw || typeof raw !== 'object') return newSave(data, cfg);
  const r = raw as Partial<StorySave>;
  const seed = typeof r.envSeed === 'number' ? r.envSeed : Math.floor(Math.random() * 2 ** 31);
  const base = newSave(data, cfg, seed);
  const known = (id: unknown): id is string => typeof id === 'string' && !!data.cards[id];
  const levels: Record<string, number> = {};
  for (const [id, lv] of Object.entries(r.levels ?? {})) {
    if (known(id) && typeof lv === 'number') levels[id] = Math.max(1, Math.min(data.config.maxCardLevel, Math.floor(lv)));
  }
  const envs = { ...base.envs };
  for (const [k, v] of Object.entries(r.envs ?? {})) {
    if (v === null || (typeof v === 'string' && data.environments[v])) envs[k] = v;
  }
  return {
    version: SAVE_VERSION,
    cleared: Array.isArray(r.cleared) ? [...new Set(r.cleared.filter((s) => typeof s === 'number' && s >= 1 && s <= cfg.stageCount))] : [],
    subs: typeof r.subs === 'object' && r.subs ? r.subs : {},
    exp: typeof r.exp === 'number' && r.exp >= 0 ? Math.floor(r.exp) : 0,
    unlocked: Array.isArray(r.unlocked) ? r.unlocked.filter(known) : [],
    levels,
    hpUps: typeof r.hpUps === 'number' ? Math.max(0, Math.min(cfg.hpUpgrade.maxCount, Math.floor(r.hpUps))) : 0,
    envs,
    envSeed: seed,
  };
}

// ---------- 進行状況 ----------

export function highestCleared(save: StorySave): number {
  return save.cleared.length ? Math.max(...save.cleared) : 0;
}

export function isStageOpen(save: StorySave, s: number): boolean {
  return s <= highestCleared(save) + 1;
}

export function isCleared(save: StorySave, s: number): boolean {
  return save.cleared.includes(s);
}

export function loadoutSlots(cfg: StoryConfig, save: StorySave): number {
  const h = highestCleared(save);
  let n = 0;
  for (const sl of cfg.slots) if (h >= sl.afterStage) n = Math.max(n, sl.slots);
  return n;
}

export function stageFor(data: GameData, cfg: StoryConfig, save: StorySave, s: number): StageDef {
  return generateStage(data, cfg, s, save.envs[s] ?? null);
}

// ---------- カードの解放 ----------

function storyOf(card: CardDef) {
  return card.story ?? { unlockAfterStage: 0, unlockExp: 0, levelable: card.category !== 'magic', levelCost: [2, 4, 6, 8], bossTheme: null };
}

/** 持ち込みに使えるカード（基本カード以外で、最初から解放済み＋解放したもの） */
export function isUnlocked(card: CardDef, save: StorySave): boolean {
  if (card.base) return false;
  return storyOf(card).unlockAfterStage === 0 || save.unlocked.includes(card.id);
}

export function availableCards(data: GameData, save: StorySave): CardDef[] {
  return data.cardList.filter((c) => isUnlocked(c, save));
}

/** 解放時期を過ぎていて、まだ解放していないカード */
export function unlockableCards(data: GameData, save: StorySave): CardDef[] {
  const h = highestCleared(save);
  return data.cardList.filter((c) => !c.base && !isUnlocked(c, save) && h >= storyOf(c).unlockAfterStage);
}

/** まだ解放時期が来ていないカード */
export function lockedCards(data: GameData, save: StorySave): CardDef[] {
  const h = highestCleared(save);
  return data.cardList.filter((c) => !c.base && !isUnlocked(c, save) && h < storyOf(c).unlockAfterStage);
}

export function unlockCard(data: GameData, save: StorySave, id: string): StorySave {
  const card = data.cards[id];
  if (!unlockableCards(data, save).some((c) => c.id === id)) throw new Error('まだ解放できません');
  const cost = storyOf(card).unlockExp;
  if (save.exp < cost) throw new Error('経験値が足りません');
  return { ...save, exp: save.exp - cost, unlocked: [...save.unlocked, id] };
}

// ---------- レベル・最大HP ----------

export function cardLevel(save: StorySave, id: string): number {
  return save.levels[id] ?? 1;
}

/** 次のレベルへの必要経験値。上げられないなら null */
export function levelUpCost(data: GameData, save: StorySave, id: string): number | null {
  const card = data.cards[id];
  const st = storyOf(card);
  if (!st.levelable) return null;
  if (!card.base && !isUnlocked(card, save)) return null;
  const lv = cardLevel(save, id);
  if (lv >= data.config.maxCardLevel) return null;
  return st.levelCost[lv - 1] ?? null;
}

export function levelUp(data: GameData, save: StorySave, id: string): StorySave {
  const cost = levelUpCost(data, save, id);
  if (cost === null) throw new Error('これ以上レベルを上げられません');
  if (save.exp < cost) throw new Error('経験値が足りません');
  return { ...save, exp: save.exp - cost, levels: { ...save.levels, [id]: cardLevel(save, id) + 1 } };
}

export function hpUpCost(cfg: StoryConfig, save: StorySave): number | null {
  if (save.hpUps >= cfg.hpUpgrade.maxCount) return null;
  return cfg.hpUpgrade.baseCost + cfg.hpUpgrade.costStep * save.hpUps;
}

export function hpUp(cfg: StoryConfig, save: StorySave): StorySave {
  const cost = hpUpCost(cfg, save);
  if (cost === null) throw new Error('これ以上強化できません');
  if (save.exp < cost) throw new Error('経験値が足りません');
  return { ...save, exp: save.exp - cost, hpUps: save.hpUps + 1 };
}

export function playerMaxHp(cfg: StoryConfig, save: StorySave): number {
  return cfg.playerBaseHp + cfg.hpUpgrade.amount * save.hpUps;
}

export function playerCombatant(data: GameData, cfg: StoryConfig, save: StorySave, loadout: string[], dice: string): Combatant {
  const levels: Record<string, number> = {};
  for (const id of [...data.config.marketBaseCards, ...loadout]) levels[id] = cardLevel(save, id);
  return { name: 'あなた', maxHp: playerMaxHp(cfg, save), dice, loadout, cardLevels: levels };
}

/** ストーリーの持ち込みの検証（枠数・魔法の上限・解放済みか） */
export function validateStoryLoadout(data: GameData, cfg: StoryConfig, save: StorySave, ids: string[]): string | null {
  const slots = loadoutSlots(cfg, save);
  if (ids.length !== slots) return `持ち込みカードを${slots}枚選んでください`;
  if (new Set(ids).size !== ids.length) return '同じカードは1枚までです';
  if (ids.some((id) => !data.cards[id] || !isUnlocked(data.cards[id], save))) return '解放していないカードがあります';
  const magic = ids.filter((id) => data.cards[id].category === 'magic').length;
  if (magic > cfg.maxMagic) return `魔法は${cfg.maxMagic}枚までです`;
  return null;
}

// ---------- 戦闘結果 ----------

export interface BattleOutcome {
  won: boolean;
  turns: number;
  hpLeft: number;
  maxHp: number;
}

export interface ExpGain {
  label: string;
  exp: number;
}

/** 戦闘結果を反映して、新しいセーブデータと経験値の内訳を返す */
export function recordResult(
  cfg: StoryConfig,
  save: StorySave,
  stage: number,
  o: BattleOutcome,
): { save: StorySave; gains: ExpGain[]; total: number; firstClear: boolean } {
  const gains: ExpGain[] = [];
  const subs = { ...save.subs };
  const prev = subs[stage] ?? { halfHp: false, fastWin: false };
  const next = { ...prev };
  let cleared = save.cleared;
  let firstClear = false;
  if (o.won) {
    firstClear = !save.cleared.includes(stage);
    if (firstClear) {
      gains.push({ label: '初クリア', exp: cfg.exp.firstClear });
      cleared = [...save.cleared, stage];
    } else gains.push({ label: 'クリア', exp: cfg.exp.repeatClear });
    if (!prev.halfHp && o.hpLeft >= o.maxHp * cfg.subMissions.halfHpRatio) {
      next.halfHp = true;
      gains.push({ label: 'サブミッション：HPを半分以上残して勝利', exp: cfg.exp.subHalfHp });
    }
    if (!prev.fastWin && o.turns <= cfg.subMissions.fastWinTurns) {
      next.fastWin = true;
      gains.push({ label: `サブミッション：${cfg.subMissions.fastWinTurns}ターン以内に勝利`, exp: cfg.exp.subFastWin });
    }
    subs[stage] = next;
  } else {
    gains.push({ label: '敗北', exp: cfg.exp.loss });
  }
  const total = gains.reduce((t, g) => t + g.exp, 0);
  return { save: { ...save, cleared, subs, exp: save.exp + total }, gains, total, firstClear };
}
