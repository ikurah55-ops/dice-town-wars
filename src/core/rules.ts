// 戦闘ルール本体。UIに依存しない状態機械。
// applyAction は state を直接書き換える（UI側は structuredClone してから渡す）。

import { countOwned, levelMul } from './cards';
import { envBaseIncome, envBattleStart, envCost, envFaceWeight, envFacility, envLongBattleTurn, envMagicUses } from './env';
import { nextRandom } from './rng';
import type {
  Action,
  ActiveMagic,
  BattleState,
  CardDef,
  Combatant,
  Effect,
  EnvironmentDef,
  Fx,
  GameData,
  LogEntry,
  PlayerState,
  Side,
} from './types';

// ---------- 生成 ----------

function createPlayer(data: GameData, c: Combatant, env: EnvironmentDef | null): PlayerState {
  const { config } = data;
  const market = [...config.marketBaseCards, ...c.loadout];
  const stock: Record<string, number> = {};
  for (const id of market) {
    stock[id] = data.cards[id].category === 'magic' ? config.stock.magic : config.stock.facility;
  }
  const p: PlayerState = {
    name: c.name,
    hp: c.maxHp,
    maxHp: c.maxHp,
    coins: c.startCoins ?? config.startCoins,
    coinFrac: 0,
    dice: c.dice,
    market,
    stock,
    facilities: [],
    magics: [],
    cardLevels: c.cardLevels ?? {},
    bought: {},
    cooldowns: {},
  };
  envBattleStart(env, p); // 環境効果フック：戦闘開始時
  return p;
}

export interface CreateBattleOptions {
  seed: number;
  environment?: EnvironmentDef | null;
  quiet?: boolean;
}

export function createBattle(
  data: GameData,
  player: Combatant,
  cpu: Combatant,
  opts: CreateBattleOptions,
): BattleState {
  const state: BattleState = {
    turn: 1,
    active: 0,
    phase: 'roll',
    players: [createPlayer(data, player, opts.environment ?? null), createPlayer(data, cpu, opts.environment ?? null)],
    rngState: opts.seed | 0,
    lastRoll: null,
    rerollUsed: false,
    damageShield: 0,
    pendingDestroy: null,
    winner: null,
    longBattleHappened: false,
    environment: opts.environment ?? null,
    baseEnvironment: opts.environment ?? null,
    log: [],
    quiet: !!opts.quiet,
    nextUid: 1,
    builtThisTurn: [],
  };
  // 初期所持（在庫から差し引く）
  for (const p of state.players) {
    for (const id of data.config.startingCards) {
      addFacility(state, p, id);
      if (p.stock[id] !== undefined) p.stock[id]--;
    }
  }
  log(state, null, '戦闘開始！', 'system');
  if (state.environment) log(state, null, `環境効果：${state.environment.name}（${state.environment.description}）`, 'system');
  beginTurn(state, data);
  return state;
}

// ---------- 小道具 ----------

function log(state: BattleState, side: Side | null, text: string, kind: LogEntry['kind'] = 'info', fx?: Fx) {
  if (state.quiet) return;
  state.log.push(fx ? { turn: state.turn, side, text, kind, fx } : { turn: state.turn, side, text, kind });
}

function rand(state: BattleState): number {
  const [v, n] = nextRandom(state.rngState);
  state.rngState = n;
  return v;
}

function opp(side: Side): Side {
  return side === 0 ? 1 : 0;
}

function addFacility(state: BattleState, p: PlayerState, cardId: string) {
  p.facilities.push({ uid: state.nextUid++, cardId, growth: 0 });
}

function findMagic(p: PlayerState, cardId: string): ActiveMagic | undefined {
  return p.magics.find((m) => m.cardId === cardId);
}

function magicsWith(p: PlayerState, data: GameData, type: Effect['type']): { m: ActiveMagic; e: Effect; card: CardDef }[] {
  const out: { m: ActiveMagic; e: Effect; card: CardDef }[] = [];
  for (const m of p.magics) {
    const card = data.cards[m.cardId];
    for (const e of card.effects) if (e.type === type) out.push({ m, e, card });
  }
  return out;
}

function consume(p: PlayerState, m: ActiveMagic, data: GameData) {
  m.remaining--;
  if (m.remaining <= 0) {
    p.magics = p.magics.filter((x) => x !== m);
    // 効果が切れたら、しばらく同じ魔法は買い直せない
    if (data.config.magicCooldown > 0) p.cooldowns[m.cardId] = data.config.magicCooldown;
  }
}

function damage(state: BattleState, target: Side, amount: number) {
  if (amount <= 0) return;
  state.players[target].hp -= amount;
}

/** 所持コイン（端数込み）を小数第一位まで（切り捨て） */
export function coinTotal(p: PlayerState): number {
  return Math.floor((p.coins + p.coinFrac) * 10 + 1e-6) / 10;
}

/** コインの量を小数第一位までの文字列に（切り捨て） */
export function fmtCoins(n: number): string {
  return (Math.floor(n * 10 + 1e-6) / 10).toFixed(1);
}

/** コインを得る（小数は端数として持ち越す）。実際に増えた枚数を返す */
function gainCoins(p: PlayerState, amount: number): number {
  p.coinFrac += amount;
  const whole = Math.floor(p.coinFrac + 1e-9);
  p.coins += whole;
  p.coinFrac -= whole;
  return whole;
}

/** カードのコスト（環境効果込み） */
export function cardCost(state: BattleState, card: CardDef): number {
  return envCost(state.environment, card);
}

/** 魔法の効果回数（環境効果込み） */
export function magicUses(state: BattleState, data: GameData): number {
  return envMagicUses(state.environment, data.config.magicUses);
}

function stealText(card: string, from: string, n: number): string {
  return n > 0 ? `${card}：${from}から${fmtCoins(n)}コイン奪った` : `${card}：${from}はコインを持っていない`;
}

function heal(p: PlayerState, amount: number): number {
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  return p.hp - before;
}

/** コインを奪う。相手の所持（端数込み）が奪う枚数より少なければ、端数まで全部奪う */
function steal(from: PlayerState, to: PlayerState, amount: number): number {
  const total = from.coins + from.coinFrac;
  const n = Math.round(Math.max(0, Math.min(amount, total)) * 1e6) / 1e6;
  const rest = Math.max(0, total - n);
  from.coins = Math.floor(rest + 1e-9);
  from.coinFrac = Math.max(0, rest - from.coins);
  gainCoins(to, n);
  return n;
}

/** 勝敗判定。決着したら true */
function checkWinner(state: BattleState): boolean {
  if (state.winner !== null) return true;
  const dead0 = state.players[0].hp <= 0;
  const dead1 = state.players[1].hp <= 0;
  if (!dead0 && !dead1) return false;
  // 同時に0以下ならプレイヤーの敗北
  state.winner = dead0 ? 1 : 0;
  state.phase = 'over';
  state.pendingDestroy = null;
  log(state, state.winner, `${state.players[state.winner].name}の勝利！`, 'system');
  return true;
}

// ---------- 破城槌の対象 ----------

function ramCard(data: GameData): CardDef {
  return data.cardList.find((c) => c.effects.some((e) => e.type === 'destroy_facility'))!;
}

/** 破城槌で壊せる相手の施設（カードID） */
export function destroyTargets(state: BattleState, data: GameData, side: Side): string[] {
  return targetsUnder(state, data, side, destroyMaxCost(ramCard(data)));
}

function destroyMaxCost(card: CardDef): number {
  const e = card.effects.find((x) => x.type === 'destroy_facility') as { maxCost: number } | undefined;
  return e?.maxCost ?? 0;
}

function targetsUnder(state: BattleState, data: GameData, side: Side, maxCost: number): string[] {
  const ids = new Set<string>();
  for (const f of state.players[opp(side)].facilities) if (data.cards[f.cardId].cost <= maxCost) ids.add(f.cardId);
  return [...ids];
}

// ---------- 手番開始 ----------

function beginTurn(state: BattleState, data: GameData) {
  const side = state.active;
  const me = state.players[side];
  const them = state.players[opp(side)];
  state.lastRoll = null;
  state.rerollUsed = false;
  state.damageShield = 0;
  state.builtThisTurn = [];

  // ラウンド開始時の長期戦ダメージ
  if (side === 0 && state.turn > envLongBattleTurn(state, data.config.longBattle.afterTurn)) {
    state.longBattleHappened = true;
    const dmgs = state.players.map((p) => Math.floor(p.maxHp * data.config.longBattle.damageRatio)) as [number, number];
    for (const s of [0, 1] as Side[]) {
      damage(state, s, dmgs[s]);
      log(state, s, `長期戦ダメージ！ ${state.players[s].name}に${dmgs[s]}ダメージ`, 'damage', s === 0 ? { kind: 'storm', amounts: dmgs } : undefined);
    }
    if (checkWinner(state)) return;
  }
  log(state, side, `― ${state.turn}ターン目：${me.name}の手番 ―`, 'system');

  // 手番開始時の魔法（破城槌以外を先に処理）
  for (const m of [...me.magics]) {
    const card = data.cards[m.cardId];
    if (card.timing !== 'turn_start') continue;
    let usedHere = false;
    for (const e of card.effects) {
      const amount = 'amount' in e ? e.amount : 0; // 魔法はレベルなし
      if (e.type === 'heal') {
        const h = heal(me, amount);
        log(state, side, `${card.name}：HPを${h}回復`, 'heal', { kind: 'heal', side, amount: h, card: card.id });
        usedHere = true;
      } else if (e.type === 'steal_coins') {
        const n = steal(them, me, amount);
        log(state, side, stealText(card.name, them.name, n), 'coin', { kind: 'steal', from: opp(side), to: side, amount: n, card: card.id });
        usedHere = true;
      }
    }
    if (usedHere) consume(me, m, data);
  }
  if (checkWinner(state)) return;
  continueStartAfterHeal(state, data);
}

/** 破城槌 → 収入 → 振る待ち */
function continueStartAfterHeal(state: BattleState, data: GameData) {
  const side = state.active;
  const me = state.players[side];
  const ram = me.magics.find((m) => data.cards[m.cardId].effects.some((e) => e.type === 'destroy_facility'));
  if (ram) {
    const card = data.cards[ram.cardId];
    consume(me, ram, data);
    const targets = targetsUnder(state, data, side, destroyMaxCost(card));
    if (targets.length > 0) {
      state.phase = 'destroy';
      state.pendingDestroy = { resume: 'start' };
      return;
    }
    log(state, side, `${card.name}：壊せる施設がない`, 'magic');
  }
  gainIncome(state, data);
}

function gainIncome(state: BattleState, data: GameData) {
  const side = state.active;
  const me = state.players[side];
  // 環境効果フック：基本収入
  let income = envBaseIncome(state, data.config.baseIncome + (data.dice[me.dice].modifiers?.incomeBonus ?? 0));
  let bonusCard: string | null = null;
  for (const { m, e, card } of magicsWith(me, data, 'income_bonus')) {
    income += (e as { amount: number }).amount;
    bonusCard = card.id;
    consume(me, m, data);
  }
  income = Math.max(0, income);
  me.coins += income;
  log(state, side, `収入 +${fmtCoins(income)}コイン`, 'coin', bonusCard ? { kind: 'income', side, amount: income, card: bonusCard } : undefined);
  state.phase = 'roll';
}

// ---------- サイコロ ----------

export function bannedFaces(state: BattleState, data: GameData, side: Side): number[] {
  const out: number[] = [];
  for (const { m, e } of magicsWith(state.players[side], data, 'ban_face')) {
    if ((e as { target: string }).target === 'self' && m.face !== undefined) out.push(m.face);
  }
  // 「この目だけになる」魔法：それ以外の目を出なくする
  for (const { e } of magicsWith(state.players[side], data, 'restrict_faces')) {
    const allowed = (e as { faces: number[] }).faces;
    for (let f = 1; f <= 6; f++) if (!allowed.includes(f)) out.push(f);
  }
  for (const { m, e } of magicsWith(state.players[opp(side)], data, 'ban_face')) {
    if ((e as { target: string }).target === 'opponent' && m.face !== undefined) out.push(m.face);
  }
  return out;
}

/** 実際に出うる面（出ない目を除いた6面のリスト） */
export function effectiveFaces(state: BattleState, data: GameData, side: Side): number[] {
  const faces = data.dice[state.players[side].dice].faces;
  const banned = bannedFaces(state, data, side);
  const ok = faces.filter((f) => !banned.includes(f));
  return ok.length > 0 ? ok : faces;
}

/** 面ごとの重み（環境効果フック）。出ない目を除いた残りの面に重みをかける */
export function faceWeights(state: BattleState, data: GameData, side: Side): { face: number; weight: number }[] {
  return effectiveFaces(state, data, side).map((face) => ({ face, weight: envFaceWeight(state, face) }));
}

function rollDie(state: BattleState, data: GameData): number {
  const ws = faceWeights(state, data, state.active);
  const total = ws.reduce((t, w) => t + w.weight, 0);
  let r = rand(state) * total;
  for (const w of ws) {
    if (r < w.weight) return w.face;
    r -= w.weight;
  }
  return ws[ws.length - 1].face;
}

export function canReroll(state: BattleState, data: GameData): boolean {
  if (state.rerollUsed) return false;
  return magicsWith(state.players[state.active], data, 'reroll').length > 0;
}

function doRoll(state: BattleState, data: GameData) {
  const side = state.active;
  state.lastRoll = rollDie(state, data);
  log(state, side, `🎲 ${state.lastRoll} が出た`, 'roll');
  if (canReroll(state, data)) {
    state.phase = 'reroll';
    return;
  }
  resolveRoll(state, data);
}

function resolveRoll(state: BattleState, data: GameData) {
  const side = state.active;
  const other = opp(side);
  const me = state.players[side];
  const them = state.players[other];
  const face = state.lastRoll!;

  // 倍率を読み取る
  let econMult = 1;
  let atkMult = 1;
  for (const { e } of magicsWith(me, data, 'economy_multiplier')) econMult *= (e as { amount: number }).amount;
  for (const { e } of magicsWith(me, data, 'attack_multiplier')) atkMult *= (e as { amount: number }).amount;

  const halveCard = magicsWith(them, data, 'halve_attack_damage')[0]?.card ?? null;

  // サイコロ系の魔法の残り回数を減らす（自分の own_roll、相手の opp_roll）
  for (const m of [...me.magics]) if (data.cards[m.cardId].timing === 'own_roll') consume(me, m, data);
  for (const m of [...them.magics]) if (data.cards[m.cardId].timing === 'opp_roll') consume(them, m, data);

  // 1. 相手のカウンター
  for (const f of them.facilities) {
    const card = data.cards[f.cardId];
    if (card.category !== 'counter' || !card.faces?.includes(face)) continue;
    for (const e of card.effects) {
      // レベル補正 → 環境効果フック → 四捨五入
      const raw = 'amount' in e ? e.amount * levelMul(data, them, card) : 0;
      const kind = e.type === 'reduce_damage' ? 'shield' : e.type === 'heal' ? 'heal' : e.type === 'steal_coins' ? 'steal' : 'counter_damage';
      const amount = Math.round(envFacility(state, raw, { card, face, kind }));
      switch (e.type) {
        case 'reduce_damage':
          state.damageShield += amount;
          log(state, other, `${card.name}：このターンの被ダメージ-${amount}`, 'info', { kind: 'shield', side: other, amount, card: card.id });
          break;
        case 'heal': {
          const h = heal(them, amount);
          log(state, other, `${card.name}：HPを${h}回復`, 'heal', { kind: 'heal', side: other, amount: h, card: card.id });
          break;
        }
        case 'steal_coins': {
          const n = steal(me, them, amount);
          log(state, other, stealText(card.name, me.name, n), 'coin', { kind: 'steal', from: side, to: other, amount: n, card: card.id });
          break;
        }
        case 'deal_damage':
          damage(state, side, amount);
          log(state, other, `${card.name}：${me.name}に${amount}ダメージ`, 'damage', { kind: 'zap', target: side, amount, card: card.id });
          break;
      }
    }
    if (checkWinner(state)) return;
  }

  // 2. 自分の施設（経済 → 攻撃）
  let attackTotal = 0;
  for (const f of me.facilities) {
    const card = data.cards[f.cardId];
    if (!card.faces?.includes(face)) continue;
    if (card.category === 'economy') {
      let base = 0;
      for (const e of card.effects) {
        if (e.type === 'gain_coins') base += e.amount;
        else if (e.type === 'gain_coins_per') base += e.amount * countOwned(me, data, e.per);
        else if (e.type === 'gain_coins_growing') {
          base += e.amount + f.growth; // 果樹園：毎回の獲得量に倍率をかける（成長の+1は変えない）
          f.growth += e.step;
        }
      }
      // レベル補正 → 環境効果フック → 収穫祭。端数は持ち越す
      const raw = envFacility(state, base * levelMul(data, me, card), { card, face, kind: 'coin' }) * econMult;
      const coins = gainCoins(me, raw);
      log(state, side, `${card.name}：+${fmtCoins(raw)}コイン`, 'coin', { kind: 'coin', side, amount: coins, raw, card: card.id });
    } else if (card.category === 'attack') {
      for (const e of card.effects) {
        if (e.type !== 'deal_damage') continue;
        const dmg = Math.round(envFacility(state, e.amount * levelMul(data, me, card), { card, face, kind: 'damage' }) * atkMult);
        attackTotal += dmg;
        log(state, side, `${card.name}：${dmg}ダメージ`, 'damage', { kind: 'attack', side, amount: dmg, card: card.id });
      }
    }
  }
  if (attackTotal > 0 && halveCard) {
    const half = Math.ceil(attackTotal / 2);
    log(state, other, `${halveCard.name}：攻撃ダメージを半減（${attackTotal}→${half}）`, 'magic');
    attackTotal = half;
  }
  if (attackTotal > 0) {
    const reduced = Math.min(attackTotal, state.damageShield);
    const dealt = attackTotal - reduced;
    if (reduced > 0) log(state, other, `守りで${reduced}軽減`, 'info');
    damage(state, other, dealt);
    log(state, side, `${them.name}に合計${dealt}ダメージ！`, 'damage', { kind: 'hit', target: other, amount: dealt, blocked: reduced });
    if (checkWinner(state)) return;
  }
  if (attackTotal === 0 && !me.facilities.some((f) => data.cards[f.cardId].faces?.includes(face))) {
    log(state, side, '発動する施設なし', 'info');
  }
  state.phase = 'buy';
}

// ---------- 購入 ----------

export function buyError(state: BattleState, data: GameData, side: Side, cardId: string): string | null {
  const p = state.players[side];
  const card = data.cards[cardId];
  if (!card || !p.market.includes(cardId)) return '市場にないカード';
  if ((p.stock[cardId] ?? 0) <= 0) return '在庫切れ';
  if (p.coins < cardCost(state, card)) return 'コイン不足';
  if (card.category === 'magic' && findMagic(p, cardId)) return '効果中';
  if (card.category === 'magic' && (p.cooldowns[cardId] ?? 0) > 0) return '再使用待ち';
  return null;
}

function doBuy(state: BattleState, data: GameData, cardId: string, face?: number) {
  const side = state.active;
  const me = state.players[side];
  const them = state.players[opp(side)];
  const err = buyError(state, data, side, cardId);
  if (err) throw new Error(`購入できません：${err}`);
  const card = data.cards[cardId];
  const needsFace = card.effects.some((e) => e.type === 'ban_face');
  if (needsFace && (face === undefined || face < 1 || face > 6)) throw new Error('目の指定が必要です');

  me.coins -= cardCost(state, card);
  me.stock[cardId]--;
  me.bought[cardId] = (me.bought[cardId] ?? 0) + 1;
  log(state, side, `${card.name}を購入`, 'buy');

  if (card.category !== 'magic') {
    addFacility(state, me, cardId);
    state.builtThisTurn.push(cardId);
    return;
  }

  const m: ActiveMagic = { cardId, remaining: magicUses(state, data), face: needsFace ? face : undefined };
  me.magics.push(m);
  if (needsFace) log(state, side, `${card.name}：${face}の目を指定`, 'magic');
  if (card.effects.some((e) => e.type === 'change_environment')) changeEnvironment(state, data, side, card);

  if (card.timing === 'turn_start') {
    // 購入した瞬間に1回目
    for (const e of card.effects) {
      const amount = 'amount' in e ? e.amount : 0; // 魔法はレベルなし
      if (e.type === 'heal') {
        const h = heal(me, amount);
        log(state, side, `${card.name}：HPを${h}回復`, 'heal', { kind: 'heal', side, amount: h, card: card.id });
      } else if (e.type === 'steal_coins') {
        const n = steal(them, me, amount);
        log(state, side, stealText(card.name, them.name, n), 'coin', { kind: 'steal', from: opp(side), to: side, amount: n, card: card.id });
      }
      else if (e.type === 'income_bonus') {
        me.coins += amount;
        log(state, side, `${card.name}：+${fmtCoins(amount)}コイン`, 'coin', { kind: 'income', side, amount, card: card.id });
      } else if (e.type === 'destroy_facility') {
        if (targetsUnder(state, data, side, e.maxCost).length > 0) {
          consume(me, m, data);
          state.phase = 'destroy';
          state.pendingDestroy = { resume: 'buy' };
          return;
        }
        log(state, side, `${card.name}：壊せる施設がない`, 'magic');
      }
    }
    consume(me, m, data);
  }
}

function doDestroy(state: BattleState, data: GameData, cardId: string | null) {
  const side = state.active;
  const target = state.players[opp(side)];
  const valid = destroyTargets(state, data, side);
  if (cardId === null || !valid.includes(cardId)) {
    if (valid.length > 0) throw new Error('壊す施設を選んでください');
  } else {
    // 同じ種類が複数あれば、成長の少ないものを壊す
    const candidates = target.facilities.filter((f) => f.cardId === cardId).sort((a, b) => a.growth - b.growth);
    const victim = candidates[0];
    target.facilities = target.facilities.filter((f) => f !== victim);
    target.stock[cardId] = (target.stock[cardId] ?? 0) + 1;
    log(state, side, `破城槌：${target.name}の${data.cards[cardId].name}を破壊！`, 'magic', { kind: 'destroy', side, target: opp(side), card: cardId });
  }
  const resume = state.pendingDestroy?.resume ?? 'buy';
  state.pendingDestroy = null;
  if (resume === 'start') gainIncome(state, data);
  else state.phase = 'buy';
}

// ---------- 環境効果を変える魔法 ----------

/** 今とは違う環境効果にランダムで変える */
function changeEnvironment(state: BattleState, data: GameData, side: Side, card: CardDef) {
  const list = data.environmentList.filter((e) => e.id !== state.environment?.id);
  if (list.length === 0) return;
  const env = list[Math.floor(rand(state) * list.length)];
  state.environment = env;
  log(state, side, `${card.name}：環境効果が「${env.name}」に変わった（${env.description}）`, 'magic', { kind: 'env', side, envId: env.id, card: card.id });
}

/** 効果が切れたら元の環境効果に戻す（ほかに効果中の同種の魔法があればそのまま） */
function restoreEnvironment(state: BattleState, data: GameData, side: Side, card: CardDef) {
  const stillActive = state.players.some((p) => magicsWith(p, data, 'change_environment').length > 0);
  if (stillActive) return;
  state.environment = state.baseEnvironment;
  const name = state.baseEnvironment ? `「${state.baseEnvironment.name}」` : 'なし';
  log(state, side, `${card.name}の効果が切れ、環境効果が${name}に戻った`, 'magic', { kind: 'env', side, envId: state.baseEnvironment?.id ?? null, card: card.id });
}

// ---------- 手番終了 ----------

function endTurn(state: BattleState, data: GameData) {
  const side = state.active;
  const me = state.players[side];
  // 再購入待ちを1手番分進める（この手番の終了時に切れた魔法は数えない）
  for (const id of Object.keys(me.cooldowns)) {
    if (--me.cooldowns[id] <= 0) delete me.cooldowns[id];
  }
  if (state.builtThisTurn.length > 0) {
    const names = state.builtThisTurn.map((id) => data.cards[id].name).join('、');
    log(state, side, `${me.name}が建設：${names}`, 'buy', { kind: 'built', side, cards: [...state.builtThisTurn] });
  }
  for (const m of [...me.magics]) {
    const card = data.cards[m.cardId];
    if (card.timing !== 'turn_end') continue;
    const changesEnv = card.effects.some((e) => e.type === 'change_environment');
    for (const e of card.effects) {
      if (e.type === 'spend_all_for_damage') {
        const coins = me.coins;
        const dmg = coins * e.amount;
        me.coins = 0;
        damage(state, opp(side), dmg);
        log(state, side, `${card.name}：${fmtCoins(coins)}コイン払って${dmg}ダメージ`, 'damage', { kind: 'merc', side, target: opp(side), coins, amount: dmg, card: card.id });
      }
    }
    consume(me, m, data);
    if (changesEnv && m.remaining <= 0) restoreEnvironment(state, data, side, card);
  }
  if (checkWinner(state)) return;

  state.active = opp(side);
  if (state.active === 0) state.turn++;
  beginTurn(state, data);
}

// ---------- 公開API ----------

export function legalActionTypes(state: BattleState): Action['type'][] {
  switch (state.phase) {
    case 'roll':
      return ['roll'];
    case 'reroll':
      return ['reroll', 'keep'];
    case 'buy':
      return ['buy', 'end_turn'];
    case 'destroy':
      return ['destroy'];
    default:
      return [];
  }
}

export function applyAction(state: BattleState, data: GameData, action: Action): BattleState {
  if (state.phase === 'over') throw new Error('戦闘は終了しています');
  if (!legalActionTypes(state).includes(action.type)) {
    throw new Error(`今は ${action.type} できません（phase=${state.phase}）`);
  }
  switch (action.type) {
    case 'roll':
      doRoll(state, data);
      break;
    case 'reroll':
      state.rerollUsed = true;
      log(state, state.active, '女神の微笑み：振り直し！', 'magic');
      state.lastRoll = rollDie(state, data);
      log(state, state.active, `🎲 ${state.lastRoll} が出た`, 'roll');
      resolveRoll(state, data);
      break;
    case 'keep':
      resolveRoll(state, data);
      break;
    case 'buy':
      doBuy(state, data, action.cardId, action.face);
      break;
    case 'destroy':
      doDestroy(state, data, action.cardId);
      break;
    case 'end_turn':
      endTurn(state, data);
      break;
  }
  return state;
}

/** 出目ごとに「何が起きるか」の要約（UI表示用） */
export function facePreview(state: BattleState, data: GameData, side: Side, face: number): string[] {
  const me = state.players[side];
  const them = state.players[opp(side)];
  const lines: string[] = [];
  const counts = new Map<string, number>();
  for (const f of me.facilities) {
    const c = data.cards[f.cardId];
    if (c.category !== 'counter' && c.faces?.includes(face)) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  }
  for (const [id, n] of counts) lines.push(`${data.cards[id].name}×${n}`);
  const oc = new Map<string, number>();
  for (const f of them.facilities) {
    const c = data.cards[f.cardId];
    if (c.category === 'counter' && c.faces?.includes(face)) oc.set(c.id, (oc.get(c.id) ?? 0) + 1);
  }
  for (const [id, n] of oc) lines.push(`⚠相手の${data.cards[id].name}×${n}`);
  return lines;
}

export { opp, destroyMaxCost, targetsUnder };
