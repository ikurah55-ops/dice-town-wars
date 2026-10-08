import { describe, expect, it } from 'vitest';
import { buildGameData, defaultData } from '../src/core/data';
import { applyAction, cardCost, createBattle, faceWeights } from '../src/core/rules';
import type { BattleState, Combatant, DiceDef, GameData, Side } from '../src/core/types';

const fixedDice: DiceDef[] = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `fixed${n}`, name: `固定${n}`, faces: [n, n, n, n, n, n], available: true }));
const data: GameData = buildGameData(defaultData.cardList, [...Object.values(defaultData.dice), ...fixedDice], defaultData.bosses, defaultData.config);

const LOADOUT = ['orchard', 'archers', 'catapult', 'watchtower', 'tax'];

function setup(p0Dice: string, p1Dice: string, opts: { env?: string; levels0?: Record<string, number>; levels1?: Record<string, number> } = {}): BattleState {
  const c = (name: string, dice: string, levels?: Record<string, number>): Combatant => ({ name, maxHp: 180, dice, loadout: LOADOUT, cardLevels: levels });
  return createBattle(data, c('P', p0Dice, opts.levels0), c('C', p1Dice, opts.levels1), {
    seed: 3,
    environment: opts.env ? data.environments[opts.env] : null,
  });
}

function give(s: BattleState, side: Side, ...ids: string[]) {
  for (const id of ids) s.players[side].facilities.push({ uid: s.nextUid++, cardId: id, growth: 0 });
}

/** 自分の手番をもう一周回す（相手は固定の出目で何もしない想定） */
function nextOwnTurn(s: BattleState) {
  applyAction(s, data, { type: 'end_turn' });
  applyAction(s, data, { type: 'roll' });
  applyAction(s, data, { type: 'end_turn' });
}

describe('カードレベル', () => {
  it('Lv3の麦畑は3.6コイン。端数は持ち越す（3 → 4）', () => {
    const s = setup('fixed1', 'fixed6', { levels0: { wheat: 3 } });
    const before = s.players[0].coins;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins - before).toBe(3);
    expect(s.players[0].coinFrac).toBeCloseTo(0.6);
    nextOwnTurn(s);
    const b2 = s.players[0].coins;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins - b2).toBe(4); // 0.6 + 3.6 = 4.2
  });
  it('Lv5の兵舎は15×1.4=21ダメージ', () => {
    const s = setup('fixed4', 'fixed1', { levels0: { barracks: 5 } });
    give(s, 0, 'barracks');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 21);
  });
  it('果樹園は毎回の獲得量に倍率をかける（成長の+1は変えない）', () => {
    const s = setup('fixed2', 'fixed6', { levels0: { orchard: 2 } });
    s.players[0].facilities = [];
    give(s, 0, 'orchard');
    const b = s.players[0].coins;
    applyAction(s, data, { type: 'roll' }); // 1×1.1 = 1.1
    expect(s.players[0].coins - b).toBe(1);
    nextOwnTurn(s);
    const b2 = s.players[0].coins;
    applyAction(s, data, { type: 'roll' }); // 2×1.1 = 2.2、端数0.1と合わせて2.3
    expect(s.players[0].coins - b2).toBe(2);
    expect(s.players[0].coinFrac).toBeCloseTo(0.3);
  });
  it('軽減量も倍率がかかり四捨五入（Lv2見張り塔 5.5→6）', () => {
    const s = setup('fixed4', 'fixed1', { levels1: { watchtower: 2 } });
    give(s, 0, 'barracks');
    give(s, 1, 'watchtower');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - (15 - 6));
  });
  it('魔法はレベルの影響を受けない', () => {
    const s = setup('fixed6', 'fixed6', { levels0: { tax: 5 } });
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 4;
    applyAction(s, data, { type: 'buy', cardId: 'tax' });
    expect(s.players[0].coins).toBe(3);
  });
});

describe('環境効果', () => {
  it('豊作の年：経済カード1枚ごとに+1', () => {
    const s = setup('fixed1', 'fixed6', { env: 'bountiful' });
    give(s, 0, 'wheat');
    const b = s.players[0].coins;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins - b).toBe(8); // (3+1)×2枚
  });
  it('戦乱の世：攻撃1.5倍（22.5→23）、基本収入なし', () => {
    const s = setup('fixed4', 'fixed1', { env: 'war_age' });
    expect(s.players[0].coins).toBe(2); // 初期2＋収入0
    give(s, 0, 'barracks');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 23);
  });
  it('偶数の祝福：偶数の出目の効果が1.3倍、奇数は変わらない', () => {
    const s = setup('fixed2', 'fixed6', { env: 'even_blessing' });
    const b = s.players[0].coins;
    applyAction(s, data, { type: 'roll' }); // 麦畑 3×1.3=3.9
    expect(s.players[0].coins - b).toBe(3);
    expect(s.players[0].coinFrac).toBeCloseTo(0.9);
    const s2 = setup('fixed1', 'fixed6', { env: 'even_blessing' });
    const b2 = s2.players[0].coins;
    applyAction(s2, data, { type: 'roll' });
    expect(s2.players[0].coins - b2).toBe(3);
    expect(s2.players[0].coinFrac).toBeCloseTo(0);
  });
  it('奇数の祝福：奇数の出目のダメージが1.3倍（兵舎5の目 19.5→20）', () => {
    const s = setup('fixed5', 'fixed1', { env: 'odd_blessing' });
    give(s, 0, 'barracks');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 20);
  });
  it('偶数の運気：偶数の面の重みが2倍。消された目は除く', () => {
    const s = setup('normal', 'normal', { env: 'even_luck' });
    const w = faceWeights(s, data, 0);
    expect(w.map((x) => x.weight)).toEqual([1, 2, 1, 2, 1, 2]);
    s.players[0].magics.push({ cardId: 'seal', remaining: 3, face: 2 });
    expect(faceWeights(s, data, 0).map((x) => x.face)).toEqual([1, 3, 4, 5, 6]);
  });
  it('偶数の運気：実際に振ると偶数が約67%', () => {
    let even = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const s = createBattle(
        data,
        { name: 'P', maxHp: 180, dice: 'normal', loadout: LOADOUT },
        { name: 'C', maxHp: 180, dice: 'normal', loadout: LOADOUT },
        { seed: i * 7919 + 1, quiet: true, environment: data.environments.even_luck },
      );
      applyAction(s, data, { type: 'roll' });
      if (s.lastRoll! % 2 === 0) even++;
    }
    expect(even / N).toBeGreaterThan(0.62);
    expect(even / N).toBeLessThan(0.72);
  });
  it('物価高騰：全カードのコスト+1', () => {
    const s = setup('fixed6', 'fixed6', { env: 'inflation' });
    expect(cardCost(s, data.cards.wheat)).toBe(4);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 3;
    expect(() => applyAction(s, data, { type: 'buy', cardId: 'wheat' })).toThrow();
    s.players[0].coins = 4;
    applyAction(s, data, { type: 'buy', cardId: 'wheat' });
    expect(s.players[0].coins).toBe(0);
  });
  it('交易の風：基本収入+1', () => {
    const s = setup('fixed6', 'fixed6', { env: 'trade_wind' });
    expect(s.players[0].coins).toBe(2 + 2);
  });
  it('城壁の時代：カウンターの効果1.5倍（見張り塔 7.5→8）', () => {
    const s = setup('fixed4', 'fixed1', { env: 'walls' });
    give(s, 0, 'barracks');
    give(s, 1, 'watchtower');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - (15 - 8));
  });
  it('魔力の満ちる日：魔法が4回続く', () => {
    const s = setup('fixed6', 'fixed6', { env: 'mana_day' });
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 4;
    applyAction(s, data, { type: 'buy', cardId: 'tax' });
    expect(s.players[0].magics[0].remaining).toBe(3); // 4回のうち購入時に1回目
  });
  it('短期決戦：10ターンを超えたら長期戦ダメージ', () => {
    const s = setup('fixed6', 'fixed6', { env: 'short_war' });
    s.turn = 10;
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    expect(s.longBattleHappened).toBe(true);
    expect(s.players[0].hp).toBe(180 - 18);
  });
  it('環境効果なしなら何も変わらない', () => {
    const s = setup('fixed4', 'fixed1');
    expect(s.environment).toBeNull();
    give(s, 0, 'barracks');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 15);
  });
});

describe('新しい魔法', () => {
  const ML = ['even_charm', 'ward', 'fickle_wind', 'archers', 'catapult'];
  const mk = (p0: string, p1: string, env?: string) =>
    createBattle(data, { name: 'P', maxHp: 180, dice: p0, loadout: ML }, { name: 'C', maxHp: 180, dice: p1, loadout: ML }, { seed: 11, environment: env ? data.environments[env] : null });
  it('偶数の護符：自分のサイコロが2・4・6だけになる（3回）', () => {
    const s = mk('normal', 'fixed6');
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 20;
    applyAction(s, data, { type: 'buy', cardId: 'even_charm' });
    expect(faceWeights(s, data, 0).map((w) => w.face)).toEqual([2, 4, 6]);
    for (let i = 0; i < 3; i++) {
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      expect(s.lastRoll! % 2).toBe(0);
    }
    expect(s.players[0].magics.some((m) => m.cardId === 'even_charm')).toBe(false);
  });
  it('守護の結界：相手の攻撃カードのダメージが半分（切り上げ）', () => {
    const s = mk('fixed6', 'fixed4');
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 20;
    applyAction(s, data, { type: 'buy', cardId: 'ward' });
    give(s, 1, 'barracks');
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].hp).toBe(180 - 8); // 15 → 8
  });
  it('気まぐれな風：環境効果が別のものに変わり、自分の手番3回分のあと元に戻る', () => {
    const s = mk('fixed6', 'fixed6', 'walls');
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 20;
    applyAction(s, data, { type: 'buy', cardId: 'fickle_wind' });
    expect(s.environment?.id).not.toBe('walls');
    expect(s.environment).not.toBeNull();
    const changed = s.environment!.id;
    for (let i = 0; i < 2; i++) {
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      expect(s.environment?.id).toBe(changed);
    }
    applyAction(s, data, { type: 'end_turn' }); // 3回目の手番終了で戻る
    expect(s.environment?.id).toBe('walls');
  });
});
