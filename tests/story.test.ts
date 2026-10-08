import { describe, expect, it } from 'vitest';
import { defaultData as data } from '../src/core/data';
import {
  availableCards,
  bossCombatant,
  generateStage,
  hpUp,
  hpUpCost,
  levelUp,
  levelUpCost,
  loadoutSlots,
  migrateSave,
  newSave,
  playerCombatant,
  playerMaxHp,
  recordResult,
  stageFor,
  storyConfig as cfg,
  unlockableCards,
  unlockCard,
  validateStoryLoadout,
  type StorySave,
} from '../src/core/story';

const clearUpTo = (save: StorySave, n: number): StorySave => ({ ...save, cleared: Array.from({ length: n }, (_, i) => i + 1) });

describe('ステージ生成', () => {
  const b = cfg.boss;
  it('HP・大ボス・カードレベル・持ち込み枚数・初期コイン・型', () => {
    const s1 = generateStage(data, cfg, 1, null, {});
    expect(s1.hp).toBe(b.hpBase);
    expect(s1.loadout).toHaveLength(0); // floor((1+4)/8) = 0
    expect(s1.type).toBe('economy'); // 1 % 4 = 1
    const s10 = generateStage(data, cfg, 10, null, {});
    expect(s10.isBig).toBe(true);
    expect(s10.hp).toBe(Math.round((b.hpBase + b.hpPerStage * 9) * b.bigBossHpMult));
    expect(s10.loadout).toHaveLength(2); // floor(14/8)=1、大ボス+1
    expect(s10.startCoins).toBe(3);
    const s15 = generateStage(data, cfg, 15, null, {});
    expect(s15.cardLevel).toBe(2); // 1 + floor(14/14)
    expect(generateStage(data, cfg, 50, null, {}).cardLevel).toBe(4);
    const s12 = generateStage(data, cfg, 12, null, {});
    expect(s12.type).toBe('attack');
    expect(s12.loadout).toEqual(['archers', 'cannon']);
    expect(generateStage(data, cfg, 44, null, {}).loadout).toEqual(['archers', 'cannon', 'war_horn', 'mercenary']);
  });
  it('story_stages.json で上書きできる', () => {
    const st = generateStage(data, cfg, 12, 'walls', { '12': { hp: 999, environment: null, type: 'defense' } });
    expect(st.hp).toBe(999);
    expect(st.envId).toBeNull();
    expect(st.type).toBe('defense');
    expect(st.loadout).toEqual(['watchtower', 'infirmary']);
  });
  it('環境効果はステージ15以上の偶数だけ。セーブに固定され、同じシードなら同じ', () => {
    const a = newSave(data, cfg, 42);
    const b2 = newSave(data, cfg, 42);
    expect(a.envs).toEqual(b2.envs);
    for (let s = 1; s <= 50; s++) {
      if (s >= 15 && s % 2 === 0) expect(data.environments[a.envs[s]!]).toBeTruthy();
      else expect(a.envs[s]).toBeNull();
    }
    expect(stageFor(data, cfg, a, 16).envId).toBe(a.envs[16]);
  });
  it('ボスのカードレベルは基本カードにも適用', () => {
    const st = generateStage(data, cfg, 30, null, {});
    const c = bossCombatant(data, st);
    expect(c.cardLevels!.wheat).toBe(3);
    expect(c.cardLevels!.barracks).toBe(3);
    expect(c.startCoins).toBe(5);
  });
});

describe('経験値', () => {
  const base = newSave(data, cfg, 1);
  it('初クリア＋サブミッション2つで5', () => {
    const r = recordResult(cfg, base, 1, { won: true, turns: 8, hpLeft: 150, maxHp: 180 });
    expect(r.total).toBe(5);
    expect(r.firstClear).toBe(true);
    expect(r.save.cleared).toEqual([1]);
    expect(r.save.subs[1]).toEqual({ halfHp: true, fastWin: true });
  });
  it('2回目以降はクリア2。サブミッションは各ステージ1回だけ、後から達成してももらえる', () => {
    const r1 = recordResult(cfg, base, 1, { won: true, turns: 14, hpLeft: 20, maxHp: 180 });
    expect(r1.total).toBe(3);
    const r2 = recordResult(cfg, r1.save, 1, { won: true, turns: 9, hpLeft: 20, maxHp: 180 });
    expect(r2.total).toBe(2 + 1); // クリア＋10ターン以内
    const r3 = recordResult(cfg, r2.save, 1, { won: true, turns: 9, hpLeft: 170, maxHp: 180 });
    expect(r3.total).toBe(2 + 1); // HP半分は初、10ターンは達成済み
  });
  it('敗北は1', () => {
    const r = recordResult(cfg, base, 3, { won: false, turns: 12, hpLeft: 0, maxHp: 180 });
    expect(r.total).toBe(1);
    expect(r.save.cleared).toEqual([]);
  });
});

describe('解放・レベル・HP・枠', () => {
  it('果樹園・弓兵隊は最初から。ステージ2クリアで見張り塔・救護所が解放可能', () => {
    let s = newSave(data, cfg, 1);
    expect(availableCards(data, s).map((c) => c.id).sort()).toEqual(['archers', 'orchard']);
    expect(unlockableCards(data, s)).toHaveLength(0);
    s = clearUpTo(s, 2);
    expect(unlockableCards(data, s).map((c) => c.id).sort()).toEqual(['infirmary', 'watchtower']);
    expect(() => unlockCard(data, s, 'watchtower')).toThrow('経験値');
    s = unlockCard(data, { ...s, exp: 5 }, 'watchtower');
    expect(s.exp).toBe(2);
    expect(availableCards(data, s).some((c) => c.id === 'watchtower')).toBe(true);
    expect(() => unlockCard(data, { ...s, exp: 99 }, 'cannon')).toThrow('まだ');
  });
  it('レベルアップは2,4,6,8でLv5まで。魔法と未解放は不可。基本カードは可', () => {
    let s: StorySave = { ...newSave(data, cfg, 1), exp: 100 };
    expect(levelUpCost(data, s, 'wheat')).toBe(2);
    for (const c of [2, 4, 6, 8]) {
      expect(levelUpCost(data, s, 'wheat')).toBe(c);
      s = levelUp(data, s, 'wheat');
    }
    expect(s.levels.wheat).toBe(5);
    expect(levelUpCost(data, s, 'wheat')).toBeNull();
    expect(s.exp).toBe(80);
    expect(levelUpCost(data, s, 'tax')).toBeNull();
    expect(levelUpCost(data, s, 'cannon')).toBeNull();
  });
  it('最大HPは+10ずつ、必要経験値3,4,5…12、最大10回（280）', () => {
    let s: StorySave = { ...newSave(data, cfg, 1), exp: 1000 };
    const costs: number[] = [];
    while (hpUpCost(cfg, s) !== null) {
      costs.push(hpUpCost(cfg, s)!);
      s = hpUp(cfg, s);
    }
    expect(costs).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(playerMaxHp(cfg, s)).toBe(280);
  });
  it('持ち込み枠は2 → ステージ5で3 → ステージ12で4', () => {
    const s = newSave(data, cfg, 1);
    expect(loadoutSlots(cfg, s)).toBe(2);
    expect(loadoutSlots(cfg, clearUpTo(s, 5))).toBe(3);
    expect(loadoutSlots(cfg, clearUpTo(s, 12))).toBe(4);
    expect(validateStoryLoadout(data, cfg, s, ['orchard', 'archers'])).toBeNull();
    expect(validateStoryLoadout(data, cfg, s, ['orchard', 'cannon'])).toMatch('解放');
    expect(validateStoryLoadout(data, cfg, s, ['orchard'])).toBeNull(); // 枠より少なくてもよい
    expect(validateStoryLoadout(data, cfg, s, ['orchard', 'archers', 'watchtower'])).toMatch('2枚まで');
    expect(generateStage(data, cfg, 16, null, {}).hp % 1).toBe(0); // HPは整数
  });
  it('プレイヤーのカードレベルと最大HPが戦闘データに入る', () => {
    const s: StorySave = { ...newSave(data, cfg, 1), levels: { barracks: 3, archers: 2 }, hpUps: 2 };
    const c = playerCombatant(data, cfg, s, ['orchard', 'archers'], 'normal');
    expect(c.maxHp).toBe(200);
    expect(c.cardLevels).toEqual({ wheat: 1, trade: 1, barracks: 3, orchard: 1, archers: 2 });
  });
});

describe('セーブデータ', () => {
  it('壊れたデータは新規、知らないカードは捨て、足りない項目は補う', () => {
    expect(migrateSave(null, data).cleared).toEqual([]);
    const m = migrateSave({ version: 0, cleared: [1, 2, 2, 99], exp: 7, unlocked: ['watchtower', 'unknown_card'], levels: { wheat: 9, nope: 3 }, envSeed: 5 }, data);
    expect(m.version).toBe(1);
    expect(m.cleared).toEqual([1, 2]);
    expect(m.unlocked).toEqual(['watchtower']);
    expect(m.levels).toEqual({ wheat: 5 });
    expect(m.hpUps).toBe(0);
    expect(m.envs).toEqual(newSave(data, cfg, 5).envs);
  });
});
