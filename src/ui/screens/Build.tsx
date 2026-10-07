import { useState } from 'react';
import { loadoutCandidates, validateLoadout } from '../../core/data';
import type { BossDef, GameData } from '../../core/types';
import { CardView, Header } from '../components';

export interface BuildResult {
  dice: string;
  loadout: string[];
}

const STORAGE_KEY = 'dice-town-last-build';

function loadLast(data: GameData): BuildResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as BuildResult;
    if (!data.dice[b.dice]?.available) return null;
    if (!b.loadout.every((id) => data.cards[id] && !data.cards[id].base)) return null;
    return b;
  } catch {
    return null;
  }
}

export function Build({ data, boss, onBack, onStart }: { data: GameData; boss: BossDef; onBack: () => void; onStart: (b: BuildResult) => void }) {
  const last = loadLast(data);
  const [dice, setDice] = useState(last?.dice ?? 'normal');
  const [picked, setPicked] = useState<string[]>(last?.loadout ?? []);
  const { cards: need, maxMagic } = data.config.loadout;
  const error = validateLoadout(data, picked);
  const magicCount = picked.filter((id) => data.cards[id].category === 'magic').length;

  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length < need) setPicked([...picked, id]);
  };

  const start = () => {
    if (error) return;
    const b = { dice, loadout: picked };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    } catch {
      /* 保存できなくても続行 */
    }
    onStart(b);
  };

  const candidates = loadoutCandidates(data);
  const groups = ['economy', 'attack', 'counter', 'magic'] as const;
  const groupLabel = { economy: '経済', attack: '攻撃', counter: 'カウンター', magic: '魔法' };

  return (
    <div className="screen build-screen">
      <div className="build-side">
        <Header title="ビルド" onBack={onBack} />
        <div className="vs-line">VS {boss.name}</div>
        <div className="section-label">サイコロ</div>
        <div className="dice-select">
          {Object.values(data.dice).map((d) => (
            <button
              key={d.id}
              className={`dice-option ${dice === d.id ? 'is-selected' : ''}`}
              disabled={!d.available}
              onClick={() => setDice(d.id)}
            >
              <span className="dice-faces">[{d.faces.join(',')}]</span>
              <span>{d.name}</span>
              {!d.available && <span className="locked">未解放</span>}
            </button>
          ))}
        </div>
        <div className="build-status">
          <span>
            持ち込み {picked.length}/{need}
          </span>
          <span className={magicCount > maxMagic ? 'warn' : ''}>
            魔法 {magicCount}/{maxMagic}
          </span>
        </div>
        <button className="btn btn-primary btn-start" disabled={!!error} onClick={start}>
          {error ?? '戦闘開始！'}
        </button>
      </div>
      <div className="scroll build-cards">
        <div className="section-label">基本カード（毎回市場に並ぶ）</div>
        <div className="card-grid">
          {data.config.marketBaseCards.map((id) => (
            <CardView key={id} card={data.cards[id]} data={data} />
          ))}
        </div>

        {groups.map((g) => (
          <div key={g}>
            <div className="section-label">{groupLabel[g]}</div>
            <div className="card-grid">
              {candidates
                .filter((c) => c.category === g)
                .map((c) => {
                  const sel = picked.includes(c.id);
                  const blocked = !sel && (picked.length >= need || (c.category === 'magic' && magicCount >= maxMagic));
                  return (
                    <CardView
                      key={c.id}
                      card={c}
                      data={data}
                      selected={sel}
                      disabled={blocked}
                      badge={sel ? '✓ 選択中' : undefined}
                      onClick={() => !blocked && toggle(c.id)}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
