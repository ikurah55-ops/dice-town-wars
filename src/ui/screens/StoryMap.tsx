import { useEffect, useMemo, useRef, useState } from 'react';
import {
  highestCleared,
  isCleared,
  isStageOpen,
  loadoutSlots,
  playerMaxHp,
  stageFor,
  stageLabel,
  storyConfig as cfg,
  unlockableCards,
  type StageDef,
  type StorySave,
} from '../../core/story';
import type { GameData } from '../../core/types';
import { CardView, Modal } from '../components';

const STEP_X = 104; // マスの間隔
const PAD_X = 130; // 左端からステージ1まで（STARTの旗を置く）
const TOP = 62; // 上の帯の下からマスを置く
const BOTTOM = 46;
const SEAM = 60; // 地方の境目でなじませる幅（次の地方が左端をぼかして重なる）

// src/assets/map/region1〜5.(jpg|png|webp) を置くと、その地方の背景が絵になる（無ければ仮の景色）
const REGION_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../assets/map/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.replace(/^.*\/|\.[a-z]+$/g, ''), url]),
);

/** すごろく風のマップ。横に長い道に沿って 1〜50 のマスが並ぶ。10ステージごとに地方が変わる */
export function StoryMap({
  data,
  save,
  justOpened,
  onBack,
  onPlay,
  onUpgrade,
  onOptions,
}: {
  data: GameData;
  save: StorySave;
  justOpened: number | null; // 直前に開いたマス（演出用）
  onBack: () => void;
  onPlay: (stage: number) => void;
  onUpgrade: () => void;
  onOptions: () => void;
}) {
  const N = cfg.stageCount;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(320);
  const [selected, setSelected] = useState<StageDef | null>(null);
  const current = Math.min(N, highestCleared(save) + 1);
  const unlockCount = unlockableCards(data, save).length;

  // マスの位置（道をゆるやかに上下に蛇行させる）
  const points = useMemo(() => {
    const top = TOP + 34;
    const bottom = h - BOTTOM - 20;
    const mid = (top + bottom) / 2;
    const amp = Math.max(20, (bottom - top) / 2);
    return Array.from({ length: N }, (_, i) => ({
      x: PAD_X + i * STEP_X,
      y: mid + Math.sin(i * 0.9 + 0.6) * amp * (i % 3 === 1 ? 0.7 : 1),
    }));
  }, [N, h]);
  const width = PAD_X * 2 + (N - 1) * STEP_X;
  const start = { x: PAD_X - 84, y: points[0] ? points[0].y + 18 : h / 2 };
  const all = [start, ...points];
  const path = all
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const q = all[i - 1];
      const cx = (q.x + p.x) / 2;
      return `C${cx} ${q.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
  // 道の途中の飾り（サイコロと宝箱）：5マスごとの間に置く
  const decos = useMemo(
    () =>
      Array.from({ length: Math.floor((N - 1) / 5) }, (_, k) => {
        const i = k * 5 + 2; // ステージ i+1 と i+2 の間（大ボスの王冠と重ならない位置）
        const a = points[i];
        const b = points[i + 1];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, kind: k % 2 === 0 ? ('dice' as const) : ('chest' as const) };
      }),
    [N, points],
  );
  // 地方の境目：ステージ10と11の間など
  const regions = Array.from({ length: Math.ceil(N / 10) }, (_, k) => {
    const left = k === 0 ? 0 : PAD_X + (k * 10 - 0.5) * STEP_X;
    const right = k === Math.ceil(N / 10) - 1 ? width : PAD_X + ((k + 1) * 10 - 0.5) * STEP_X;
    return { k, left, width: right - left };
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setH(Math.max(240, el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 現在のマスが中央に来るようにスクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focus = justOpened ?? current;
    el.scrollLeft = Math.max(0, points[focus - 1].x - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h]);

  return (
    <div className="screen story-map">
      <div className="map-scroll" ref={scrollRef}>
        <div className="map-world" style={{ width, height: h }}>
          {/* 地方ごとの背景 */}
          {regions.map((r) => {
            const img = REGION_IMAGES[`region${r.k + 1}`];
            return (
              <div key={r.k} className={`map-region region-${r.k + 1} ${r.k > 0 ? 'has-seam' : ''}`} style={{ left: r.left, width: r.width + SEAM }}>
                {img ? <img src={img} alt="" draggable={false} /> : <RegionScenery k={r.k} w={r.width + SEAM} h={h} />}
              </div>
            );
          })}
          <svg className="map-path" width={width} height={h} aria-hidden="true">
            <path d={path} className="road-shadow" />
            <path d={path} className="road-edge" />
            <path d={path} className="road" />
          </svg>
          {decos.map((d, i) => (
            <span key={i} className={`map-deco deco-${d.kind}`} style={{ left: d.x, top: d.y }} aria-hidden="true">
              {d.kind === 'dice' ? <DiceDeco /> : <ChestDeco />}
            </span>
          ))}
          <div className="map-start" style={{ left: start.x, top: start.y }} aria-hidden="true">
            <span className="map-start-flag" />
            <span className="map-start-disc">START</span>
          </div>
          {points.map((p, i) => {
            const s = i + 1;
            const big = s % cfg.boss.bigBossEvery === 0;
            const open = isStageOpen(save, s);
            const done = isCleared(save, s);
            const subs = save.subs[s];
            const st = stageFor(data, cfg, save, s);
            const cls = done ? 'is-done' : open ? 'is-open' : 'is-locked';
            return (
              <button
                key={s}
                className={`node ${cls} ${big ? 'is-big' : ''} ${s === current && !done ? 'is-current' : ''} ${s === justOpened ? 'just-opened' : ''}`}
                style={{ left: p.x, top: p.y }}
                onClick={() => setSelected(st)}
                aria-label={`${stageLabel(st)}${done ? '（クリア済み）' : open ? '' : '（未開放）'}`}
              >
                <span className="node-disc">
                  {open ? s : <LockIcon />}
                  {big && <span className="node-crown">👑</span>}
                  {st.envId && open && <span className="node-env" title={data.environments[st.envId].name} />}
                </span>
                <span className="node-type">{open ? st.typeName : '???'}</span>
                {open && (
                  <span className="node-stars">
                    <i className={subs?.halfHp ? 'on' : ''}>★</i>
                    <i className={subs?.fastWin ? 'on' : ''}>★</i>
                    <i className={subs?.card ? 'on' : ''}>★</i>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 上の帯（マップの上に重ねる） */}
      <div className="map-head">
        <button className="map-back" onClick={onBack} aria-label="タイトルへ">
          ‹
        </button>
        <h1>ストーリー</h1>
        <div className="map-stats">
          <span className="map-stat">
            <i aria-hidden="true">📖</i>進行 <b>{highestCleared(save)}</b>
            <small>/{N}</small>
          </span>
          <span className="map-stat">
            <i aria-hidden="true">✨</i>経験値 <b>{save.exp}</b>
          </span>
          <span className="map-stat">
            <i aria-hidden="true">❤️</i>最大HP <b>{playerMaxHp(cfg, save)}</b>
          </span>
          <span className="map-stat">
            <i aria-hidden="true">🎒</i>持ち込み <b>{loadoutSlots(cfg, save)}</b>枠
          </span>
        </div>
        <button className="map-upgrade upgrade-btn" onClick={onUpgrade}>
          強化
          {unlockCount > 0 && <span className="notify-dot">{unlockCount}</span>}
        </button>
        <button className="map-gear" onClick={onOptions} aria-label="オプション">
          ⚙
        </button>
      </div>

      {selected && (
        <StageInfo
          data={data}
          save={save}
          stage={selected}
          onClose={() => setSelected(null)}
          onPlay={() => {
            const s = selected.stage;
            setSelected(null);
            onPlay(s);
          }}
        />
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#d8d4cc" strokeWidth="2.4" />
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="#d8d4cc" />
      <circle cx="12" cy="15" r="1.8" fill="#4a463e" />
      <rect x="11.2" y="15.5" width="1.6" height="3" fill="#4a463e" />
    </svg>
  );
}

function DiceDeco() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36">
      <rect x="4" y="4" width="32" height="32" rx="7" fill="#fbf6ea" stroke="#b9ab90" strokeWidth="1.5" />
      <path d="M8 36 L36 36 L36 8" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="3" />
      {[
        [13, 13],
        [27, 13],
        [20, 20],
        [13, 27],
        [27, 27],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill="#2a2420" />
      ))}
    </svg>
  );
}

function ChestDeco() {
  return (
    <svg viewBox="0 0 44 36" width="40" height="33">
      <path d="M4 14 Q4 4 22 4 Q40 4 40 14 Z" fill="#b8402a" stroke="#6a2414" strokeWidth="1.5" />
      <rect x="4" y="14" width="36" height="18" rx="2" fill="#9a3420" stroke="#6a2414" strokeWidth="1.5" />
      <path d="M4 14 H40 M10 4.8 V32 M34 4.8 V32" stroke="#e8b84a" strokeWidth="3" />
      <rect x="18" y="11" width="8" height="9" rx="1.5" fill="#f2d27a" stroke="#8a6420" strokeWidth="1" />
    </svg>
  );
}

// ---------- 仮の背景（絵が届くまで）：地方ごとの色で、空・山・丘・木・川を図形で描く ----------

const SCENERY = [
  { name: '草原', sky: ['#8cc6f0', '#e4f3fc'], mount: '#8fa6b8', snow: true, land: ['#8cbf52', '#5f9634'], tree: '#3f7a2e', water: '#5fb0e0' },
  { name: '森と川', sky: ['#7fb8e6', '#dcefe8'], mount: '#6f8f86', snow: false, land: ['#5f9a42', '#3d7230'], tree: '#24561f', water: '#4aa0d0' },
  { name: '雪山', sky: ['#9cc0e0', '#eef4fa'], mount: '#7c8aa0', snow: true, land: ['#9aae7a', '#6f8656'], tree: '#3e5f3a', water: '#7cc0e8' },
  { name: '荒野と火山', sky: ['#e8935a', '#f8d8a0'], mount: '#7a4a3a', snow: false, land: ['#b88a52', '#8a6234'], tree: '#5a5a2a', water: '#c8501e' },
  { name: '魔王城', sky: ['#3a2450', '#8a4a6a'], mount: '#2a1e34', snow: false, land: ['#4a3a44', '#2e2430'], tree: '#1e1a24', water: '#a0306a' },
];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function RegionScenery({ k, w, h }: { k: number; w: number; h: number }) {
  const c = SCENERY[k % SCENERY.length];
  const r = rnd(97 + k * 31);
  const horizon = h * 0.36;
  // 遠くの山並み
  const peaks: string[] = [`0,${horizon + 10}`];
  for (let x = 0; x <= w + 60; x += 50 + r() * 60) peaks.push(`${x},${horizon - 18 - r() * h * 0.2}`, `${x + 30 + r() * 30},${horizon + 4}`);
  peaks.push(`${w},${horizon + 10}`);
  const trees = Array.from({ length: Math.floor(w / 22) }, () => ({ x: r() * w, y: horizon + 14 + r() * (h - horizon - 20), s: 6 + r() * 7 }));
  trees.sort((a, b) => a.y - b.y);
  const ry = horizon + 30 + r() * 40;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="1" stopColor={c.sky[1]} />
        </linearGradient>
        <linearGradient id={`land${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.land[0]} />
          <stop offset="1" stopColor={c.land[1]} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#sky${k})`} />
      <polygon points={peaks.join(' ')} fill={c.mount} opacity="0.85" />
      {c.snow &&
        peaks.slice(1, -1).map((p, i) => {
          if (i % 2) return null;
          const [x, y] = p.split(',').map(Number);
          return <polygon key={i} points={`${x - 9},${y + 12} ${x},${y} ${x + 9},${y + 12}`} fill="#f4f8fc" opacity="0.9" />;
        })}
      <path d={`M0 ${horizon + 6} Q ${w * 0.25} ${horizon - 8} ${w * 0.5} ${horizon + 4} T ${w} ${horizon} V ${h} H 0 Z`} fill={`url(#land${k})`} />
      <path
        d={`M0 ${ry} C ${w * 0.2} ${ry + 40}, ${w * 0.35} ${ry - 30}, ${w * 0.55} ${ry + 20} S ${w * 0.85} ${ry + 70}, ${w} ${ry + 30}`}
        fill="none"
        stroke={c.water}
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.8"
      />
      {trees.map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x} cy={t.y + t.s * 0.9} rx={t.s * 0.8} ry={t.s * 0.25} fill="rgba(0,0,0,0.18)" />
          <polygon points={`${t.x - t.s * 0.7},${t.y + t.s * 0.8} ${t.x},${t.y - t.s * 1.2} ${t.x + t.s * 0.7},${t.y + t.s * 0.8}`} fill={c.tree} />
        </g>
      ))}
    </svg>
  );
}

function StageInfo({ data, save, stage: st, onClose, onPlay }: { data: GameData; save: StorySave; stage: StageDef; onClose: () => void; onPlay: () => void }) {
  const open = isStageOpen(save, st.stage);
  const done = isCleared(save, st.stage);
  const subs = save.subs[st.stage];
  const env = st.envId ? data.environments[st.envId] : null;
  return (
    <Modal title={stageLabel(st)} onClose={onClose}>
      {!open ? (
        <p>ステージ{st.stage - 1}をクリアすると挑戦できます。</p>
      ) : (
        <div className="stage-info">
          <div className="stage-info-left">
            <div className="boss-name-line">{st.name}</div>
            <dl className="stage-stats">
              <dt>ボスのHP</dt>
              <dd>{st.hp}</dd>
              <dt>カードレベル</dt>
              <dd>Lv{st.cardLevel}</dd>
              <dt>初期コイン</dt>
              <dd>{st.startCoins}</dd>
              <dt>サイコロ</dt>
              <dd>{data.dice[st.dice].name}</dd>
            </dl>
            {env && (
              <div className="env-box env-box-light">
                <b>環境効果：{env.name}</b>
                <span>{env.description}</span>
              </div>
            )}
            <div className="section-label">サブミッション</div>
            <ul className="sub-list">
              <li className={subs?.halfHp ? 'done' : ''}>
                {subs?.halfHp ? '✓' : '・'} HPを最大HPの半分以上残して勝利（+{cfg.exp.subHalfHp}）
              </li>
              <li className={subs?.fastWin ? 'done' : ''}>
                {subs?.fastWin ? '✓' : '・'} {cfg.subMissions.fastWinTurns}ターン以内に勝利（+{cfg.exp.subFastWin}）
              </li>
              <li className={subs?.card ? 'done' : ''}>
                {subs?.card ? '✓' : '・'} 「{data.cards[st.subCard].name}」を買って勝利（+{cfg.exp.subCard}）
              </li>
            </ul>
            <p className="hint">
              クリア報酬：経験値 {done ? cfg.exp.repeatClear : cfg.exp.firstClear}
              {done ? '（クリア済み）' : '（初クリア）'}
            </p>
          </div>
          <div className="stage-info-right">
            <div className="section-label">ボスの持ち込みカード</div>
            {st.loadout.length === 0 ? (
              <p className="hint">なし（基本カードだけで戦う）</p>
            ) : (
              <div className="card-grid">
                {st.loadout.map((id) => (
                  <CardView key={id} card={data.cards[id]} data={data} level={st.cardLevel} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {open && (
        <button className="btn btn-primary btn-big" style={{ marginTop: 12 }} onClick={onPlay}>
          {done ? '再挑戦する' : '挑戦する'}
        </button>
      )}
    </Modal>
  );
}
