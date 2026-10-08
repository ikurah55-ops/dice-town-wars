import { useState } from 'react';
import type { CardDef, EnvironmentDef, GameData } from '../../core/types';
import { CardView, Header } from '../components';

export interface BuildResult {
  dice: string;
  loadout: string[];
  env?: string; // 練習モードの環境効果：'none' | 'random' | 環境効果ID
}

function loadLast(data: GameData, key: string, allowed: Set<string>, slots: number): BuildResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const b = JSON.parse(raw) as BuildResult;
    if (!data.dice[b.dice]?.available) return null;
    // 使えないカードは外し、枠からあふれた分は切る
    return { dice: b.dice, loadout: b.loadout.filter((id) => allowed.has(id)).slice(0, slots), env: b.env };
  } catch {
    return null;
  }
}

/** 練習・ストーリー共通のビルド画面 */
export function Build({
  data,
  vsLabel,
  candidates,
  locked = [],
  slots,
  maxMagic,
  levels,
  environment,
  envChoice = false,
  storageKey,
  validate,
  onBack,
  onStart,
}: {
  data: GameData;
  vsLabel: string;
  candidates: CardDef[]; // 持ち込めるカード
  locked?: { card: CardDef; note: string }[]; // まだ使えないカード（表示のみ）
  slots: number;
  maxMagic: number;
  levels?: Record<string, number>; // ストーリーのカードレベル
  environment?: EnvironmentDef | null;
  envChoice?: boolean; // 練習モード：環境効果を選べる
  storageKey: string;
  validate: (ids: string[]) => string | null;
  onBack: () => void;
  onStart: (b: BuildResult) => void;
}) {
  const last = loadLast(data, storageKey, new Set(candidates.map((c) => c.id)), slots);
  const [dice, setDice] = useState(last?.dice ?? 'normal');
  const [picked, setPicked] = useState<string[]>(last?.loadout ?? []);
  const [env, setEnv] = useState<string>(last?.env && (last.env === 'random' || data.environments[last.env]) ? last.env : 'none');
  const error = validate(picked);
  const magicCount = picked.filter((id) => data.cards[id].category === 'magic').length;
  const lv = (id: string) => (levels ? (levels[id] ?? 1) : undefined);

  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length < slots) setPicked([...picked, id]);
  };

  const start = () => {
    if (error) return;
    const b: BuildResult = envChoice ? { dice, loadout: picked, env } : { dice, loadout: picked };
    try {
      localStorage.setItem(storageKey, JSON.stringify(b));
    } catch {
      /* 保存できなくても続行 */
    }
    onStart(b);
  };

  const groups = ['economy', 'attack', 'counter', 'magic'] as const;
  const groupLabel = { economy: '経済', attack: '攻撃', counter: 'カウンター', magic: '魔法' };

  return (
    <div className="screen build-screen">
      <div className="build-side">
        <Header title="ビルド" onBack={onBack} />
        <div className="vs-line">{vsLabel}</div>
        {environment && (
          <div className="env-box">
            <b>環境効果：{environment.name}</b>
            <span>{environment.description}</span>
          </div>
        )}
        {envChoice && (
          <label className="env-select" htmlFor="env-select">
            <span>環境効果</span>
            <select id="env-select" value={env} onChange={(e) => setEnv(e.target.value)}>
              <option value="none">なし</option>
              <option value="random">ランダム</option>
              {data.environmentList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {envChoice && env !== 'none' && env !== 'random' && <div className="env-note">{data.environments[env].description}</div>}
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
            持ち込み {picked.length}/{slots}
          </span>
          {/* 魔法は持ち込み枠の中で最大 maxMagic 枚（別枠ではない） */}
          <span className={magicCount > maxMagic ? 'warn' : ''}>
            うち魔法 {magicCount}（{maxMagic}枚まで）
          </span>
        </div>
        <button className="btn btn-primary btn-start" disabled={!!error} onClick={start}>
          {error ?? (picked.length < slots ? `戦闘開始！（空き枠${slots - picked.length}）` : '戦闘開始！')}
        </button>
      </div>
      <div className="scroll build-cards">
        <div className="section-label">基本カード（毎回市場に並ぶ）</div>
        <div className="card-grid">
          {data.config.marketBaseCards.map((id) => (
            <CardView key={id} card={data.cards[id]} data={data} level={lv(id)} />
          ))}
        </div>

        {groups.map((g) => {
          const list = candidates.filter((c) => c.category === g);
          const lockedList = locked.filter((l) => l.card.category === g);
          if (list.length === 0 && lockedList.length === 0) return null;
          return (
            <div key={g}>
              <div className="section-label">{groupLabel[g]}</div>
              <div className="card-grid">
                {list.map((c) => {
                  const sel = picked.includes(c.id);
                  const blocked = !sel && (picked.length >= slots || (c.category === 'magic' && magicCount >= maxMagic));
                  return (
                    <CardView
                      key={c.id}
                      card={c}
                      data={data}
                      level={lv(c.id)}
                      selected={sel}
                      disabled={blocked}
                      badge={sel ? '✓ 選択中' : undefined}
                      onClick={() => !blocked && toggle(c.id)}
                    />
                  );
                })}
                {lockedList.map(({ card, note }) => (
                  <div key={card.id} className="card-locked">
                    <CardView card={card} data={data} disabled badge={`🔒 ${note}`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
