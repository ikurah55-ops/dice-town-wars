// AIの強さの比較：各レベルを「ふつう」と対戦させ、席を入れ替えて勝率を出す
// 例: npm run sim:ai -- --games 20000 --seed 1
import { applyAiLevel, DEFAULT_AI, type AiLevelDef } from '../core/ai';
import { runAutoBattle } from '../core/auto';
import { defaultData as data, loadoutCandidates } from '../core/data';
import { createRng } from '../core/rng';
import levels from '../data/ai_levels.json';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => (a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : [])),
) as Record<string, string>;
const games = Number(args.games ?? 20000);
const rand = createRng(Number(args.seed ?? 1));
const pool = loadoutCandidates(data).map((c) => c.id);

function loadout(): string[] {
  for (;;) {
    const s = [...pool].sort(() => rand() - 0.5).slice(0, data.config.loadout.cards);
    if (s.filter((id) => data.cards[id].category === 'magic').length <= data.config.loadout.maxMagic) return s;
  }
}

const normal = applyAiLevel(DEFAULT_AI, (levels as Record<string, AiLevelDef>).normal);
for (const [id, lv] of Object.entries(levels as Record<string, AiLevelDef>)) {
  const ai = applyAiLevel(DEFAULT_AI, lv);
  let wins = 0;
  for (let g = 0; g < games; g++) {
    const seat = g % 2; // 0 なら先攻
    const a = { name: 'A', maxHp: 180, dice: 'normal', loadout: loadout() };
    const b = { name: 'B', maxHp: 180, dice: 'normal', loadout: loadout() };
    const ais = seat === 0 ? ([ai, normal] as const) : ([normal, ai] as const);
    const s = runAutoBattle(data, a, b, [ais[0], ais[1]], Math.floor(rand() * 2 ** 31), rand);
    if (s.winner === seat) wins++;
  }
  console.log(`${lv.name}（${id}）vs ふつう：勝率 ${((wins / games) * 100).toFixed(1)}%`);
}
