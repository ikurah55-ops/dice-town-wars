// ストーリーモードの通しシミュレーション
// 例: npm run sim:story -- --runs 200 --seed 1
//
// 前提（指示書の「シミュレーションの前提」）
// - プレイヤーもCPU。負けたら、クリア済みの最も先のステージに1回挑んでから再挑戦する
// - 経験値は解放できるカードがあればその解放を優先して貯める（優先順で上のもの）
//   なければ基本カード＋持ち込み中の施設のうち最もレベルの低いもののレベルアップか、最大HPの強化。
//   HP強化の必要経験値を1.4倍して比べ、安い方を選ぶ
// - 持ち込みは解放済みカードから優先順に枠数分（魔法は2枚まで）

import { DEFAULT_AI } from '../core/ai';
import { runAutoBattle } from '../core/auto';
import { defaultData } from '../core/data';
import { createRng } from '../core/rng';
import {
  availableCards,
  bossCombatant,
  cardLevel,
  highestCleared,
  hpUp,
  hpUpCost,
  levelUp,
  levelUpCost,
  loadoutSlots,
  newSave,
  playerCombatant,
  recordResult,
  stageFor,
  storyConfig as cfg,
  storyMaxMagic,
  unlockableCards,
  unlockCard,
  type StorySave,
} from '../core/story';
import type { GameData } from '../core/types';

const data: GameData = defaultData;
const priority = cfg.simulation.loadoutPriority;
const rank = (id: string) => {
  const i = priority.indexOf(id);
  return i < 0 ? 999 : i;
};

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return out;
}

function chooseLoadout(save: StorySave): string[] {
  const slots = loadoutSlots(cfg, save);
  const cards = availableCards(data, save).sort((a, b) => rank(a.id) - rank(b.id));
  const out: string[] = [];
  let magic = 0;
  for (const c of cards) {
    if (out.length >= slots) break;
    if (c.category === 'magic') {
      if (magic >= storyMaxMagic(cfg, save)) continue;
      magic++;
    }
    out.push(c.id);
  }
  return out;
}

function spendExp(save: StorySave): StorySave {
  for (let guard = 0; guard < 100; guard++) {
    const unl = unlockableCards(data, save).sort((a, b) => rank(a.id) - rank(b.id));
    if (unl.length > 0) {
      const c = unl[0];
      if (save.exp >= c.story!.unlockExp) {
        save = unlockCard(data, save, c.id);
        continue;
      }
      return save; // 解放のために貯める
    }
    // 基本カード＋持ち込み中の施設のうち、最もレベルの低いもの
    const loadout = chooseLoadout(save).filter((id) => data.cards[id].category !== 'magic');
    const pool = [...data.config.marketBaseCards, ...loadout].filter((id) => levelUpCost(data, save, id) !== null);
    pool.sort((a, b) => cardLevel(save, a) - cardLevel(save, b));
    const lvCost = pool.length ? levelUpCost(data, save, pool[0])! : null;
    const hpCost = hpUpCost(cfg, save);
    let pick: 'level' | 'hp' | null = null;
    if (lvCost !== null && hpCost !== null) pick = lvCost <= hpCost * cfg.simulation.hpCostWeight ? 'level' : 'hp';
    else if (lvCost !== null) pick = 'level';
    else if (hpCost !== null) pick = 'hp';
    if (!pick) return save;
    const cost = pick === 'level' ? lvCost! : hpCost!;
    if (save.exp < cost) return save;
    save = pick === 'level' ? levelUp(data, save, pool[0]) : hpUp(cfg, save);
  }
  return save;
}

function levelSum(save: StorySave): number {
  return data.cardList.filter((c) => c.category !== 'magic').reduce((t, c) => t + cardLevel(save, c.id), 0);
}

function pct(x: number) {
  return (x * 100).toFixed(0) + '%';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const runs = Number(args.runs ?? 200);
  const seed = Number(args.seed ?? 1);
  const rand = createRng(seed);
  const N = cfg.stageCount;

  const firstTry: { win: number; total: number }[] = Array.from({ length: N + 1 }, () => ({ win: 0, total: 0 }));
  const battlesPerRun: number[] = [];
  const farmPerRun: number[] = [];
  const subHalf: number[] = [];
  const subFast: number[] = [];
  const subCardN: number[] = [];
  const unusedExp: number[] = [];
  const checkpoints = [10, 20, 30, 40, 50];
  const atCp: Record<number, { unlocked: number[]; levels: number[]; hp: number[] }> = {};
  for (const c of checkpoints) atCp[c] = { unlocked: [], levels: [], hp: [] };
  let unlockedAllAt: number[] = [];
  const allUnlockable = data.cardList.filter((c) => !c.base && (c.story?.unlockAfterStage ?? 0) > 0).length;
  let stuck = 0;

  const t0 = Date.now();
  for (let r = 0; r < runs; r++) {
    let save = newSave(data, cfg, Math.floor(rand() * 2 ** 31));
    let battles = 0;
    let farm = 0;
    const tried = new Set<number>();
    let allAt = 0;
    const fight = (s: number): boolean => {
      const st = stageFor(data, cfg, save, s);
      const loadout = chooseLoadout(save);
      const me = playerCombatant(data, cfg, save, loadout, 'normal');
      const boss = bossCombatant(data, st);
      const env = st.envId ? data.environments[st.envId] : null;
      const res = runAutoBattle(data, me, boss, [DEFAULT_AI, DEFAULT_AI], Math.floor(rand() * 2 ** 31), rand, { environment: env });
      battles++;
      const won = res.winner === 0;
      const before = highestCleared(save);
      save = recordResult(cfg, save, s, { won, turns: res.turn, hpLeft: Math.max(0, res.players[0].hp), maxHp: res.players[0].maxHp, bought: Object.keys(res.players[0].bought), subCard: st.subCard }).save;
      save = spendExp(save);
      const after = highestCleared(save);
      if (after > before && checkpoints.includes(after)) {
        atCp[after].unlocked.push(save.unlocked.length);
        atCp[after].levels.push(levelSum(save));
        atCp[after].hp.push(save.hpUps);
      }
      if (!allAt && save.unlocked.length >= allUnlockable) allAt = after;
      return won;
    };
    while (highestCleared(save) < N && battles < 3000) {
      const target = highestCleared(save) + 1;
      const won = fight(target);
      if (!tried.has(target)) {
        tried.add(target);
        firstTry[target].total++;
        if (won) firstTry[target].win++;
      }
      if (!won && highestCleared(save) >= 1) {
        fight(highestCleared(save));
        farm++;
      }
    }
    if (highestCleared(save) < N) stuck++;
    battlesPerRun.push(battles);
    farmPerRun.push(farm);
    subHalf.push(Object.values(save.subs).filter((x) => x.halfHp).length);
    subFast.push(Object.values(save.subs).filter((x) => x.fastWin).length);
    subCardN.push(Object.values(save.subs).filter((x) => x.card).length);
    unusedExp.push(save.exp);
    if (allAt) unlockedAllAt.push(allAt);
  }
  const sec = (Date.now() - t0) / 1000;
  const avg = (a: number[]) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0);

  console.log(`\n=== ストーリーモード シミュレーション（${runs}回, seed=${seed}, ${sec.toFixed(1)}秒） ===`);
  if (stuck) console.log(`※ ${stuck}回は3000戦以内に全クリアできませんでした`);
  console.log(`全クリアまでの平均戦闘数 ${avg(battlesPerRun).toFixed(1)}（うち経験値稼ぎ ${avg(farmPerRun).toFixed(1)}）`);
  console.log('\n初挑戦の勝率（5ステージごと、大ボスを除く）:');
  for (let a = 1; a <= N; a += 5) {
    let w = 0;
    let t = 0;
    for (let s = a; s < a + 5; s++) {
      if (s % cfg.boss.bigBossEvery === 0) continue;
      w += firstTry[s].win;
      t += firstTry[s].total;
    }
    console.log(`  ステージ${String(a).padStart(2)}〜${String(a + 4).padStart(2)}  ${pct(w / Math.max(1, t))}`);
  }
  console.log('\n10ステージごと（指示書の表と同じ区切り）:');
  for (let a = 1; a <= N; a += 10) {
    let w = 0;
    let t = 0;
    for (let s = a; s < a + 9; s++) {
      w += firstTry[s].win;
      t += firstTry[s].total;
    }
    const big = firstTry[a + 9];
    console.log(`  ${String(a).padStart(2)}〜${String(a + 9).padStart(2)}  通常 ${pct(w / Math.max(1, t))}  大ボス(${a + 9}) ${pct(big.win / Math.max(1, big.total))}`);
  }
  console.log(`\nサブミッション達成数（全${N}ステージ中）: HP半分以上 ${avg(subHalf).toFixed(1)}  10ターン以内 ${avg(subFast).toFixed(1)}  指定カード ${avg(subCardN).toFixed(1)}`);
  console.log(`全カードの解放が終わったステージ（平均） ${unlockedAllAt.length ? avg(unlockedAllAt).toFixed(1) : '未完了'}（${unlockedAllAt.length}/${runs}回）`);
  console.log(`全クリア時の未使用経験値（平均） ${avg(unusedExp).toFixed(1)}`);
  console.log('\n各時点（そのステージを初クリアした直後）:');
  console.log('  ステージ  解放枚数  レベル合計  HP強化回数');
  for (const c of checkpoints) {
    const x = atCp[c];
    console.log(`  ${String(c).padStart(6)}  ${avg(x.unlocked).toFixed(1).padStart(8)}  ${avg(x.levels).toFixed(1).padStart(10)}  ${avg(x.hp).toFixed(1).padStart(10)}`);
  }
}

main();
