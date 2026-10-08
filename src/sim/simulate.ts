// 大量対戦シミュレーション
// 例: npm run sim -- --games 100000 --seed 1
//     npm run sim -- --games 20000 --cards ./my-cards.json --config ./my-config.json

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_AI } from '../core/ai';
import { runAutoBattle } from '../core/auto';
import { buildGameData, defaultData, loadoutCandidates } from '../core/data';
import { createRng } from '../core/rng';
import type { Combatant, GameData } from '../core/types';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T;
}

function loadData(args: Record<string, string>): GameData {
  if (!args.cards && !args.config && !args.dice) return defaultData;
  return buildGameData(
    args.cards ? loadJson(args.cards) : defaultData.cardList,
    args.dice ? loadJson(args.dice) : Object.values(defaultData.dice),
    defaultData.bosses,
    args.config ? loadJson(args.config) : defaultData.config,
  );
}

function randomLoadout(data: GameData, rand: () => number): string[] {
  const pool = loadoutCandidates(data).map((c) => c.id);
  const { cards: n, maxMagic } = data.config.loadout;
  for (;;) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pick = shuffled.slice(0, n);
    if (pick.filter((id) => data.cards[id].category === 'magic').length <= maxMagic) return pick;
  }
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const games = Number(args.games ?? 10000);
  const seed = Number(args.seed ?? 1);
  const data = loadData(args);
  const rand = createRng(seed);
  const env = args.env ? data.environments[args.env] : null;
  if (args.env && !env) throw new Error(`環境効果 ${args.env} がありません（${Object.keys(data.environments).join(', ')}）`);
  const hp = data.config.playerMaxHp;

  const turns: number[] = [];
  let longBattle = 0;
  let firstWins = 0;
  const cardStats: Record<string, { games: number; wins: number; boughtGames: number }> = {};
  for (const c of loadoutCandidates(data)) cardStats[c.id] = { games: 0, wins: 0, boughtGames: 0 };
  const baseBuy: Record<string, number> = {};

  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const a: Combatant = { name: 'A', maxHp: hp, dice: 'normal', loadout: randomLoadout(data, rand) };
    const b: Combatant = { name: 'B', maxHp: hp, dice: 'normal', loadout: randomLoadout(data, rand) };
    const s = runAutoBattle(data, a, b, [DEFAULT_AI, DEFAULT_AI], Math.floor(rand() * 2 ** 31), rand, { environment: env });
    turns.push(s.turn);
    if (s.longBattleHappened) longBattle++;
    if (s.winner === 0) firstWins++;
    for (const side of [0, 1] as const) {
      const p = s.players[side];
      const lo = side === 0 ? a.loadout : b.loadout;
      for (const id of lo) {
        const st = cardStats[id];
        st.games++;
        if (s.winner === side) st.wins++;
        if (p.bought[id]) st.boughtGames++;
      }
      for (const id of data.config.marketBaseCards) if (p.bought[id]) baseBuy[id] = (baseBuy[id] ?? 0) + 1;
    }
  }
  const sec = (Date.now() - t0) / 1000;

  turns.sort((x, y) => x - y);
  const avg = turns.reduce((s, x) => s + x, 0) / turns.length;
  const median = turns[Math.floor(turns.length / 2)];
  const dist: Record<number, number> = {};
  for (const t of turns) dist[t] = (dist[t] ?? 0) + 1;

  console.log(`\n=== シミュレーション結果（${games}戦, seed=${seed}, ${sec.toFixed(1)}秒${env ? `, 環境効果=${env.name}` : ''}） ===`);
  console.log(`決着ターン 平均 ${avg.toFixed(2)} / 中央値 ${median}`);
  console.log('分布:');
  const maxCount = Math.max(...Object.values(dist));
  for (const [t, c] of Object.entries(dist)) {
    console.log(`  ${t.padStart(2)}T ${pct(c / games).padStart(6)} ${'█'.repeat(Math.round((c / maxCount) * 40))}`);
  }
  console.log(`長期戦ダメージ発生率 ${pct(longBattle / games)}`);
  console.log(`先攻の勝率 ${pct(firstWins / games)}`);
  console.log('\nカード別（持ち込んだ側の勝率 / 持ち込んだ試合での購入率）:');
  const rows = Object.entries(cardStats).sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games);
  for (const [id, st] of rows) {
    const name = data.cards[id].name;
    console.log(`  ${name.padEnd(8, '　')} 勝率 ${pct(st.wins / st.games).padStart(6)}  購入率 ${pct(st.boughtGames / st.games).padStart(6)}`);
  }
  console.log('\n基本カード購入率（1人あたり）:');
  for (const id of data.config.marketBaseCards) {
    console.log(`  ${data.cards[id].name.padEnd(8, '　')} ${pct((baseBuy[id] ?? 0) / (games * 2))}`);
  }
}

main();
