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
import mapLayout from '../../data/map_layout.json';

const HEAD = 50; // 上の帯の高さ（絵はこの下に収める）
const PER_PAGE = 10; // 1ページ（1地方）のステージ数

// src/assets/map/region1〜5.(jpg|png|webp) を置くと、その地方の背景が絵になる（無ければ仮の景色）
const REGION_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../assets/map/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.replace(/^.*\/|\.[a-z]+$/g, ''), url]),
);

/** 背景画にマスが描き込まれている地方：マスの位置（絵に対する割合）と絵の縦横比 */
const PAINTED = mapLayout as unknown as Record<string, { aspect: number; nodes: [number, number][] } | string>;

interface Page {
  k: number;
  first: number; // このページの最初のステージ
  img?: string;
  rect?: { x: number; y: number; w: number; h: number }; // 絵を置く位置（帯の下に、切らずに収める）
  points: { x: number; y: number }[];
  road?: string; // 絵がないときに描く道
}

/** 1ページ（1地方）の配置。描き込みのある絵はそのマスの位置に、無ければ道を蛇行させて並べる */
function layoutPage(k: number, N: number, w: number, h: number): Page {
  const first = k * PER_PAGE + 1;
  const count = Math.min(PER_PAGE, N - k * PER_PAGE);
  const img = REGION_IMAGES[`region${k + 1}`];
  const lay = PAINTED[`region${k + 1}`];
  const areaH = h - HEAD;
  if (img && lay && typeof lay !== 'string' && lay.nodes.length >= count) {
    let iw = w;
    let ih = iw / lay.aspect;
    if (ih > areaH) {
      ih = areaH;
      iw = ih * lay.aspect;
    }
    const rect = { x: (w - iw) / 2, y: HEAD + (areaH - ih) / 2, w: iw, h: ih };
    return { k, first, img, rect, points: lay.nodes.slice(0, count).map(([nx, ny]) => ({ x: rect.x + nx * iw, y: rect.y + ny * ih })) };
  }
  const top = HEAD + 50;
  const bottom = h - 60;
  const mid = (top + bottom) / 2;
  const amp = Math.max(16, (bottom - top) / 2);
  const step = (w * 0.86) / Math.max(1, count - 1);
  const points = Array.from({ length: count }, (_, i) => ({ x: w * 0.07 + i * step, y: mid + Math.sin(i * 0.9 + 0.6) * amp * (i % 3 === 1 ? 0.7 : 1) }));
  const road = points
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const q = points[i - 1];
      const cx = (q.x + p.x) / 2;
      return `C${cx} ${q.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
  return { k, first, img, points, road };
}

/** すごろく風のマップ。10ステージ（1地方）ごとに1ページで、左右にスワイプしてめくる */
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
  const P = Math.ceil(N / PER_PAGE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 375 });
  const [selected, setSelected] = useState<StageDef | null>(null);
  const current = Math.min(N, highestCleared(save) + 1);
  const unlockCount = unlockableCards(data, save).length;
  const pageRef = useRef(Math.floor(((justOpened ?? current) - 1) / PER_PAGE)); // 今見ているページ
  const pages = useMemo(() => Array.from({ length: P }, (_, k) => layoutPage(k, N, size.w, size.h)), [P, N, size]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setSize({ w: Math.max(320, el.clientWidth), h: Math.max(240, el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 大きさが変わったら（最初も）、今のページを表示し直す
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = pageRef.current * size.w;
  }, [size]);

  return (
    <div className="screen story-map">
      <div
        className="map-scroll map-paged"
        ref={scrollRef}
        onScroll={(e) => {
          pageRef.current = Math.round(e.currentTarget.scrollLeft / size.w);
        }}
      >
        <div className="map-pages" style={{ width: size.w * P, height: size.h }}>
          {pages.map((pg) => (
            <section key={pg.k} className={`map-page region-${pg.k + 1}`} style={{ width: size.w, height: size.h }}>
              {pg.img && pg.rect ? (
                <>
                  {/* 絵の外側には同じ絵をぼかして敷く */}
                  <img className="map-page-bg" src={pg.img} alt="" draggable={false} />
                  <img className="map-page-img" src={pg.img} alt="" draggable={false} style={{ left: pg.rect.x, top: pg.rect.y, width: pg.rect.w, height: pg.rect.h }} />
                </>
              ) : (
                <>
                  <div className="map-page-scenery">
                    <RegionScenery k={pg.k} w={size.w} h={size.h} />
                  </div>
                  <svg className="map-path" width={size.w} height={size.h} aria-hidden="true">
                    <path d={pg.road} className="road-shadow" />
                    <path d={pg.road} className="road-edge" />
                    <path d={pg.road} className="road" />
                  </svg>
                </>
              )}
              {pg.points.map((p, i) => {
                const s = pg.first + i;
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
            </section>
          ))}
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
