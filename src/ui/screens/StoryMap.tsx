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

const STEP_X = 92; // マスの間隔
const PAD_X = 70;

/** すごろく風のマップ。横に長い道に沿って 1〜50 のマスが並ぶ */
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
  const [h, setH] = useState(260);
  const [selected, setSelected] = useState<StageDef | null>(null);
  const current = Math.min(N, highestCleared(save) + 1);
  const unlockCount = unlockableCards(data, save).length;

  // マスの位置（道を上下に蛇行させる）
  const points = useMemo(() => {
    const mid = h / 2;
    const amp = Math.max(40, h / 2 - 56);
    return Array.from({ length: N }, (_, i) => ({
      x: PAD_X + i * STEP_X,
      y: mid + Math.sin(i * 0.85) * amp * (i % 2 ? 0.75 : 0.95),
    }));
  }, [N, h]);
  const width = PAD_X * 2 + (N - 1) * STEP_X;
  const path = points
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const q = points[i - 1];
      const cx = (q.x + p.x) / 2;
      return `C${cx} ${q.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');
  const clearedUpTo = Math.min(N, highestCleared(save));
  const clearedPath = points
    .slice(0, clearedUpTo + 1)
    .map((p, i, arr) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const q = arr[i - 1];
      const cx = (q.x + p.x) / 2;
      return `C${cx} ${q.y} ${cx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' ');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setH(Math.max(200, el.clientHeight));
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
      <div className="map-head">
        <button className="btn-back" onClick={onBack} aria-label="タイトルへ">
          ‹
        </button>
        <h1>ストーリー</h1>
        <span className="map-stat">
          進行 <b>{highestCleared(save)}</b>/{N}
        </span>
        <span className="map-stat">
          経験値 <b>{save.exp}</b>
        </span>
        <span className="map-stat">
          最大HP <b>{playerMaxHp(cfg, save)}</b>
        </span>
        <span className="map-stat">
          持ち込み <b>{loadoutSlots(cfg, save)}</b>枠
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary btn-small upgrade-btn" onClick={onUpgrade}>
          強化
          {unlockCount > 0 && <span className="notify-dot">{unlockCount}</span>}
        </button>
        <button className="btn-icon" onClick={onOptions} aria-label="オプション">
          ⚙
        </button>
      </div>

      <div className="map-scroll" ref={scrollRef}>
        <svg className="map-path" width={width} height={h} aria-hidden="true">
          <path d={path} className="road-shadow" />
          <path d={path} className="road" />
          {clearedUpTo > 0 && <path d={clearedPath} className="road-done" />}
          {Array.from({ length: Math.floor(N / 10) }, (_, k) => {
            const x = PAD_X + (k * 10 + 9) * STEP_X + STEP_X / 2;
            return <line key={k} x1={x} y1={8} x2={x} y2={h - 8} className="chapter-line" />;
          })}
        </svg>
        <div className="map-nodes" style={{ width, height: h }}>
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
                  {open ? s : '🔒'}
                  {big && <span className="node-crown">👑</span>}
                  {st.envId && open && <span className="node-env" title={data.environments[st.envId].name} />}
                </span>
                <span className="node-type">{open ? st.typeName : '???'}</span>
                {done && (
                  <span className="node-stars">
                    <i className={subs?.halfHp ? 'on' : ''}>★</i>
                    <i className={subs?.fastWin ? 'on' : ''}>★</i>
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
