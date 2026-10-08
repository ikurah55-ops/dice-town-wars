import { describe, expect, it } from 'vitest';
import { DEFAULT_AI } from '../src/core/ai';
import { runAutoBattle } from '../src/core/auto';
import { buildGameData, defaultData, validateLoadout } from '../src/core/data';
import { createRng } from '../src/core/rng';
import { applyAction, buyError, createBattle } from '../src/core/rules';
import type { BattleState, Combatant, DiceDef, GameData, Side } from '../src/core/types';

// 出目を固定したサイコロ（fixed1〜fixed6）を加えたテスト用データ
const fixedDice: DiceDef[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `fixed${n}`,
  name: `固定${n}`,
  faces: [n, n, n, n, n, n],
  available: true,
}));
const data: GameData = buildGameData(
  defaultData.cardList,
  [...Object.values(defaultData.dice), ...fixedDice],
  defaultData.bosses,
  defaultData.config,
);

function combatant(name: string, dice: string, loadout: string[]): Combatant {
  return { name, maxHp: 180, dice, loadout };
}

function setup(p0Dice: string, p1Dice: string, l0: string[] = ['orchard', 'mill', 'spoils', 'archers', 'catapult'], l1: string[] = ['watchtower', 'infirmary', 'toll', 'counter_battery', 'cannon']): BattleState {
  return createBattle(data, combatant('P', p0Dice, l0), combatant('C', p1Dice, l1), { seed: 42 });
}

function give(s: BattleState, side: Side, ...ids: string[]) {
  for (const id of ids) s.players[side].facilities.push({ uid: s.nextUid++, cardId: id, growth: 0 });
}

describe('データ', () => {
  it('全データが読み込める', () => {
    expect(Object.keys(defaultData.cards)).toHaveLength(31);
    expect(defaultData.config.playerMaxHp).toBe(180);
    expect(defaultData.bosses.length).toBeGreaterThan(0);
  });
  it('持ち込みの検証', () => {
    expect(validateLoadout(data, ['orchard', 'mill', 'spoils', 'archers', 'catapult', 'cannon', 'toll'])).toBeNull();
    expect(validateLoadout(data, ['orchard', 'mill', 'spoils', 'archers', 'catapult'])).toMatch('7枚');
    expect(validateLoadout(data, ['seal', 'thieves', 'tax', 'archers', 'mill', 'cannon', 'toll'])).toBeNull(); // 魔法3枚まで
    expect(validateLoadout(data, ['seal', 'thieves', 'tax', 'ward', 'mill', 'cannon', 'toll'])).toMatch('魔法');
    expect(validateLoadout(data, ['orchard'])).not.toBeNull();
  });
});

describe('初期状態', () => {
  it('麦畑1枚・在庫3（施設は各4枚）・コイン2+収入1', () => {
    const s = setup('fixed1', 'fixed1');
    const p = s.players[0];
    expect(p.facilities.map((f) => f.cardId)).toEqual(['wheat']);
    expect(data.config.stock.facility).toBe(4);
    expect(p.stock.wheat).toBe(3);
    expect(p.stock.thieves).toBeUndefined();
    expect(p.market).toHaveLength(8); // 基本3枚＋このテストの持ち込み5枚
    expect(data.config.marketBaseCards.length + data.config.loadout.cards).toBe(10); // 最大10枚
    expect(data.config.marketBaseCards).not.toContain('catapult');
    expect(data.cards.catapult.base).toBeFalsy();
    expect(p.coins).toBe(3); // 初期2 + 基本収入1
    expect(s.phase).toBe('roll');
  });
});

describe('施設の発動', () => {
  it('麦畑：1で3コイン、複数枚なら枚数倍', () => {
    const s = setup('fixed1', 'fixed6');
    give(s, 0, 'wheat');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins).toBe(3 + 6);
  });
  it('果樹園：発動のたびに成長（1枚ごと別々）', () => {
    const s = setup('fixed2', 'fixed6');
    give(s, 0, 'orchard');
    applyAction(s, data, { type: 'roll' }); // 麦畑3 + 果樹園1
    expect(s.players[0].coins).toBe(3 + 3 + 1);
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    const before = s.players[0].coins;
    give(s, 0, 'orchard'); // 新しい果樹園は1から
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins - before).toBe(3 + 2 + 1);
  });
  it('製粉所：麦畑1枚につき2', () => {
    const s = setup('fixed5', 'fixed6');
    give(s, 0, 'wheat', 'wheat', 'mill');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins).toBe(3 + 6);
  });
  it('攻撃：兵舎15、投石機30', () => {
    const s = setup('fixed6', 'fixed1', undefined, ['orchard', 'mill', 'spoils', 'archers']);
    give(s, 0, 'catapult', 'catapult');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 60);
  });
});

describe('カウンター', () => {
  it('見張り塔は攻撃ダメージを軽減（0未満にならない）', () => {
    const s = setup('fixed4', 'fixed1');
    give(s, 0, 'barracks');
    give(s, 1, 'watchtower', 'watchtower', 'watchtower', 'watchtower');
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180);
    const s2 = setup('fixed4', 'fixed1');
    give(s2, 0, 'barracks', 'barracks');
    give(s2, 1, 'watchtower');
    applyAction(s2, data, { type: 'roll' });
    expect(s2.players[1].hp).toBe(180 - 25);
  });
  it('城壁は投石機30を18に、木の柵と見張り塔は重ねがけできる', () => {
    const s1 = setup('fixed6', 'fixed1');
    give(s1, 0, 'catapult');
    give(s1, 1, 'castle_wall');
    applyAction(s1, data, { type: 'roll' });
    expect(s1.players[1].hp).toBe(180 - 18);
    const s2 = setup('fixed4', 'fixed1');
    give(s2, 0, 'barracks', 'barracks');
    give(s2, 1, 'palisade', 'watchtower');
    applyAction(s2, data, { type: 'roll' });
    expect(s2.players[1].hp).toBe(180 - (30 - 3 - 5));
  });
  it('関所は相手の所持コインを上限に奪う', () => {
    const s = setup('fixed1', 'fixed6');
    give(s, 1, 'toll', 'toll', 'toll', 'toll');
    s.players[0].facilities = [];
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins).toBe(0);
    expect(s.players[1].coins).toBe(2 + 3);
  });
  it('関所：相手のコインが足りなければ端数まで奪う', () => {
    const s = setup('fixed1', 'fixed6');
    give(s, 1, 'toll');
    s.players[0].facilities = [];
    s.players[0].coins = 1; // 1枚＋端数0.6 = 1.6コイン（関所は2枚奪う）
    s.players[0].coinFrac = 0.6;
    s.players[1].coinFrac = 0.5;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins + s.players[0].coinFrac).toBeCloseTo(0);
    expect(s.players[1].coins + s.players[1].coinFrac).toBeCloseTo(2 + 0.5 + 1.6);
  });
  it('関所：足りていれば端数は残る', () => {
    const s = setup('fixed1', 'fixed6');
    give(s, 1, 'toll');
    s.players[0].facilities = [];
    s.players[0].coins = 4;
    s.players[0].coinFrac = 0.6;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[0].coins).toBe(4 - 2);
    expect(s.players[0].coinFrac).toBeCloseTo(0.6);
  });
  it('反撃砲台で自分が倒れることもある', () => {
    const s = setup('fixed6', 'fixed1');
    give(s, 1, 'counter_battery');
    s.players[0].hp = 10;
    applyAction(s, data, { type: 'roll' });
    expect(s.winner).toBe(1);
    expect(s.phase).toBe('over');
  });
  it('救護所はHP最大を超えない', () => {
    const s = setup('fixed3', 'fixed1');
    give(s, 1, 'infirmary');
    s.players[1].hp = 175;
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180);
  });
});

describe('購入', () => {
  it('お金があるだけ買え、在庫が減る', () => {
    const s = setup('fixed4', 'fixed4');
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 10;
    applyAction(s, data, { type: 'buy', cardId: 'barracks' });
    applyAction(s, data, { type: 'buy', cardId: 'barracks' });
    expect(s.players[0].coins).toBe(0);
    expect(s.players[0].stock.barracks).toBe(2);
    expect(() => applyAction(s, data, { type: 'buy', cardId: 'wheat' })).toThrow();
  });
});

describe('魔法', () => {
  const magicLoadout = ['thieves', 'tax', 'orchard', 'archers'];
  it('徴税令：購入時に1回目、その後2回で切れる', () => {
    const s = setup('fixed6', 'fixed6', magicLoadout);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 4;
    applyAction(s, data, { type: 'buy', cardId: 'tax' });
    expect(s.players[0].coins).toBe(3);
    expect(s.players[0].magics[0].remaining).toBe(2);
    expect(() => applyAction(s, data, { type: 'buy', cardId: 'tax' })).toThrow(); // 効果中は重ねて買えない
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    expect(s.players[0].coins).toBe(3 + 1 + 3);
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    expect(s.players[0].magics).toHaveLength(0);
    expect(s.players[0].coins).toBe(3 + 4 + 4); // 購入時+3、以降2回の手番で+4ずつ
  });
  it('盗賊団：購入時と手番開始時に3コイン奪う', () => {
    const s = setup('fixed6', 'fixed6', magicLoadout);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = data.cards.thieves.cost; // 購入でちょうど0枚になる
    s.players[1].coins = 5;
    applyAction(s, data, { type: 'buy', cardId: 'thieves' });
    expect(s.players[0].coins).toBe(3);
    expect(s.players[1].coins).toBe(2);
  });
  it('盗賊団：相手のコインが足りなければ端数まで奪う', () => {
    const s = setup('fixed6', 'fixed6', magicLoadout);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = data.cards.thieves.cost;
    s.players[1].coins = 1;
    s.players[1].coinFrac = 0.7;
    applyAction(s, data, { type: 'buy', cardId: 'thieves' });
    expect(s.players[0].coins + s.players[0].coinFrac).toBeCloseTo(1.7);
    expect(s.players[1].coins + s.players[1].coinFrac).toBeCloseTo(0);
  });
  it('封印の札：指定した目は出ない', () => {
    const s = setup('normal', 'fixed6', ['seal', 'orchard', 'mill', 'archers']);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 3;
    applyAction(s, data, { type: 'buy', cardId: 'seal', face: 1 });
    for (let i = 0; i < 3; i++) {
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      expect(s.lastRoll).not.toBe(1);
    }
    expect(s.players[0].magics).toHaveLength(0);
  });
  it('戦の角笛：攻撃2倍', () => {
    const s = setup('fixed6', 'fixed1', ['war_horn', 'orchard', 'mill', 'archers']);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 9;
    applyAction(s, data, { type: 'buy', cardId: 'war_horn' });
    give(s, 0, 'catapult');
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    expect(s.players[1].hp).toBe(180 - 60);
  });
  it('破城槌：購入直後に相手の施設を壊し、在庫に戻す', () => {
    const s = setup('fixed6', 'fixed6', ['battering_ram', 'orchard', 'mill', 'archers']);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 6;
    applyAction(s, data, { type: 'buy', cardId: 'battering_ram' });
    expect(s.phase).toBe('destroy');
    applyAction(s, data, { type: 'destroy', cardId: 'wheat' });
    expect(s.players[1].facilities).toHaveLength(0);
    expect(s.players[1].stock.wheat).toBe(4);
    expect(s.phase).toBe('buy');
  });
  it('魔法は効果が切れた後、自分の購入フェーズ2回分は同じ魔法を買い直せない', () => {
    const s = setup('fixed6', 'fixed6', ['tax', 'thieves', 'orchard', 'mill', 'archers']);
    const turn = () => {
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
      applyAction(s, data, { type: 'end_turn' });
      applyAction(s, data, { type: 'roll' });
    };
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 4;
    applyAction(s, data, { type: 'buy', cardId: 'tax' }); // 1回目
    turn(); // 2回目
    turn(); // 3回目で切れる
    expect(s.players[0].magics).toHaveLength(0);
    s.players[0].coins = 20;
    expect(buyError(s, data, 0, 'tax')).toBe('再使用待ち'); // 切れた手番
    expect(buyError(s, data, 0, 'thieves')).toBeNull(); // 別の魔法は買える
    turn();
    expect(buyError(s, data, 0, 'tax')).toBe('再使用待ち'); // 次の手番
    turn();
    s.players[0].coins = 20;
    expect(buyError(s, data, 0, 'tax')).toBeNull(); // その次から買える
  });
  it('傭兵契約：手番終了時に残りコイン×2ダメージ', () => {
    const s = setup('fixed6', 'fixed6', ['mercenary', 'orchard', 'mill', 'archers']);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 10;
    applyAction(s, data, { type: 'buy', cardId: 'mercenary' });
    applyAction(s, data, { type: 'end_turn' });
    expect(s.players[0].coins).toBe(0);
    expect(s.players[1].hp).toBe(180 - 8);
  });
  it('女神の微笑み：振り直しの選択ができる', () => {
    const s = setup('normal', 'fixed6', ['goddess', 'orchard', 'mill', 'archers']);
    applyAction(s, data, { type: 'roll' });
    s.players[0].coins = 7;
    applyAction(s, data, { type: 'buy', cardId: 'goddess' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    expect(s.phase).toBe('reroll');
    applyAction(s, data, { type: 'reroll' });
    expect(s.phase).toBe('buy');
  });
});

describe('勝敗と長期戦', () => {
  it('16ターン目開始時に両者が最大HPの1割を受け、同時に倒れたらプレイヤーの負け', () => {
    const s = setup('fixed6', 'fixed6');
    s.turn = 15;
    s.players[0].hp = 18;
    s.players[1].hp = 18;
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    applyAction(s, data, { type: 'roll' });
    applyAction(s, data, { type: 'end_turn' });
    expect(s.longBattleHappened).toBe(true);
    expect(s.winner).toBe(1);
  });
  it('同じシードなら同じ展開', () => {
    const run = () =>
      runAutoBattle(
        data,
        combatant('A', 'normal', ['orchard', 'archers', 'tax', 'watchtower']),
        combatant('B', 'normal', ['cannon', 'mill', 'seal', 'toll']),
        [DEFAULT_AI, DEFAULT_AI],
        123,
        createRng(7),
        { quiet: false },
      );
    const a = run();
    const b = run();
    expect(a.turn).toBe(b.turn);
    expect(a.winner).toBe(b.winner);
    expect(a.log.map((l) => l.text)).toEqual(b.log.map((l) => l.text));
  });
  it('CPU同士で必ず決着する', () => {
    const rand = createRng(1);
    for (let i = 0; i < 200; i++) {
      const s = runAutoBattle(
        data,
        combatant('A', 'normal', ['orchard', 'archers', 'tax', 'battering_ram']),
        combatant('B', 'normal', ['goddess', 'silence', 'spoils', 'counter_battery']),
        [DEFAULT_AI, DEFAULT_AI],
        i,
        rand,
      );
      expect(s.winner).not.toBeNull();
    }
  });
});

describe('AIの強さ', () => {
  it('よわい・ふつう・つよいの設定がボスの重みに掛け合わされる', async () => {
    const { applyAiLevel } = await import('../src/core/ai');
    const levels = (await import('../src/data/ai_levels.json')).default as Record<string, import('../src/core/ai').AiLevelDef>;
    const base = { weights: { economy: 1, attack: 0.5, counter: 1, magic: 1 }, randomness: 0.2 };
    const easy = applyAiLevel(base, levels.easy);
    expect(easy.skipChance).toBeGreaterThan(0);
    expect(easy.weights.attack).toBeCloseTo(0.5 * levels.easy.weightScale.attack);
    const hard = applyAiLevel(base, levels.hard);
    expect(hard.rollouts).toBeGreaterThan(0);
  });
  it('つよいAIでも必ず決着する', async () => {
    const { applyAiLevel } = await import('../src/core/ai');
    const levels = (await import('../src/data/ai_levels.json')).default as Record<string, import('../src/core/ai').AiLevelDef>;
    const hard = applyAiLevel(DEFAULT_AI, { ...levels.hard, rollouts: 4 });
    const s = runAutoBattle(
      data,
      combatant('A', 'normal', ['orchard', 'archers', 'tax', 'watchtower', 'catapult']),
      combatant('B', 'normal', ['cannon', 'mill', 'seal', 'toll', 'spearmen']),
      [hard, DEFAULT_AI],
      5,
      createRng(9),
    );
    expect(s.winner).not.toBeNull();
  });
});
