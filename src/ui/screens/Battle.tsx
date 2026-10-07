import { useEffect, useMemo, useRef, useState } from 'react';
import { chooseAction, type AiProfile } from '../../core/ai';
import { describeCard } from '../../core/cards';
import { bossMaxHp } from '../../core/data';
import { applyAction, buyError, createBattle, destroyTargets } from '../../core/rules';
import type { Action, BattleState, BossDef, Fx, GameData, PlayerState, Side } from '../../core/types';
import { CardView, Die, MiniDie, Modal } from '../components';
import { groupFx, playFx } from '../fx';
import type { BuildResult } from './Build';
import { HowToPlay } from './Title';

const ROLL_MS = 650;
const SHOW_FACE_MS = 1000; // 出目を大きく見せる時間
const BUILT_MS = 1300; // 建てた施設を見せる時間
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type View = { hp: [number, number]; coins: [number, number] };
const CPU_DELAY = { roll: 700, buy: 800, other: 650 };
const FACES = [1, 2, 3, 4, 5, 6];

export function Battle({
  data,
  boss,
  build,
  onFinish,
  onRetire,
}: {
  data: GameData;
  boss: BossDef;
  build: BuildResult;
  onFinish: (s: BattleState) => void;
  onRetire: () => void;
}) {
  const [state, setState] = useState<BattleState>(() =>
    createBattle(
      data,
      { name: 'あなた', maxHp: data.config.playerMaxHp, dice: build.dice, loadout: build.loadout },
      { name: boss.name, maxHp: bossMaxHp(data.config, boss.stage), dice: boss.dice, loadout: boss.loadout },
      { seed: Math.floor(Math.random() * 2 ** 31) },
    ),
  );
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false); // 出目の演出中は操作を止める
  const [bigDie, setBigDie] = useState<{ face: number; enemy: boolean } | null>(null);
  const [built, setBuilt] = useState<{ side: Side; cards: [string, number][] } | null>(null);
  const [preview, setPreview] = useState<number | null>(null); // 演出中に盤面で光らせる出目
  const [view, setView] = useState<View | null>(null); // 演出中のHP・コイン表示
  const stageRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // StrictMode の再マウントでも true に戻す
    return () => {
      alive.current = false;
    };
  }, []);
  const [rollFace, setRollFace] = useState<number>(1);
  const [marketOpen, setMarketOpen] = useState(false);
  const [faceTarget, setFaceTarget] = useState<string | null>(null); // 封印・沈黙の目指定
  const [faceDetail, setFaceDetail] = useState<number | null>(null);
  const [cardDetail, setCardDetail] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ai: AiProfile = useMemo(() => ({ weights: boss.weights, randomness: boss.randomness }), [boss]);

  const busyRef = useRef(false);

  /**
   * 行動を実行する。演出用イベントがあれば再生してから状態を確定する。
   * サイコロ：振る → 出目を1秒見せる → 効果の演出。手番終了：建設表示 → 相手の手番開始時の魔法。
   */
  const perform = async (a: Action) => {
    if (busyRef.current) return;
    const prev = stateRef.current;
    const next = structuredClone(prev);
    try {
      applyAction(next, data, a);
    } catch (e) {
      console.warn(e);
      return;
    }
    const isRoll = a.type === 'roll' || a.type === 'reroll' || a.type === 'keep';
    const fxs = groupFx(next.log.slice(prev.log.length).flatMap((l) => (l.fx ? [l.fx] : [])));
    if (!isRoll && fxs.length === 0) {
      stateRef.current = next;
      setState(next);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const reopenMarket = a.type === 'buy';
    setMarketOpen(false);

    if (isRoll) {
      const face = next.lastRoll!;
      if (a.type !== 'keep') {
        // 女神で「この目で決定」したときは振り演出なし
        setRolling(true);
        const iv = setInterval(() => setRollFace(1 + Math.floor(Math.random() * 6)), 70);
        await sleep(ROLL_MS);
        clearInterval(iv);
        if (!alive.current) return;
        setRolling(false);
        setPreview(face);
        setBigDie({ face, enemy: prev.active === 1 });
        await sleep(SHOW_FACE_MS);
        if (!alive.current) return;
        setBigDie(null);
      } else setPreview(face);
    }

    if (fxs.length > 0 && fxRef.current && stageRef.current) {
      const v: View = {
        hp: [prev.players[0].hp, prev.players[1].hp],
        coins: [prev.players[0].coins, prev.players[1].coins],
      };
      setView({ ...v });
      const ctx = { root: fxRef.current, stage: stageRef.current, data, face: next.lastRoll ?? 0 };
      for (const fx of fxs) {
        if (fx.kind === 'built') {
          setBuilt({ side: fx.side, cards: countCards(fx.cards) });
          await sleep(BUILT_MS);
          if (!alive.current) return;
          setBuilt(null);
          await sleep(120);
          continue;
        }
        await playFx(ctx, fx, () => {
          applyFxToView(v, fx);
          setView({ hp: [...v.hp], coins: [...v.coins] });
        });
        if (!alive.current) return;
      }
    }
    stateRef.current = next;
    setState(next);
    setView(null);
    setPreview(null);
    if (reopenMarket && next.active === 0 && next.phase === 'buy') setMarketOpen(true);
    busyRef.current = false;
    setBusy(false);
  };

  // CPUの手番を自動で進める
  useEffect(() => {
    if (state.phase === 'over' || state.active !== 1 || busy) return;
    const a = chooseAction(state, data, ai, Math.random);
    const delay = a.type === 'roll' || a.type === 'reroll' ? CPU_DELAY.roll : a.type === 'buy' ? CPU_DELAY.buy : CPU_DELAY.other;
    const t = setTimeout(() => void perform(a), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, busy]);

  // 自分の購入フェーズに入ったら市場を開き、手番が移ったら閉じる
  useEffect(() => {
    setMarketOpen(state.active === 0 && state.phase === 'buy');
  }, [state.active, state.phase]);

  // 決着
  useEffect(() => {
    if (state.phase !== 'over') return;
    const t = setTimeout(() => onFinish(state), 1600);
    return () => clearTimeout(t);
  }, [state, onFinish]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const me = state.players[0];
  const cpu = state.players[1];
  const myTurn = state.active === 0 && state.phase !== 'over';
  const canBuy = myTurn && state.phase === 'buy';
  const { afterTurn } = data.config.longBattle;

  const shown = (p: PlayerState, side: Side): PlayerState => (view ? { ...p, hp: view.hp[side], coins: view.coins[side] } : p);

  const tryBuy = (id: string) => {
    if (!canBuy) {
      setToast('購入は自分の購入フェーズで');
      return;
    }
    const err = buyError(state, data, 0, id);
    if (err) {
      setToast(err === 'コイン不足' ? `コインが足りません（あと${data.cards[id].cost - me.coins}）` : err === '効果中' ? '効果中は重ねて買えません' : err);
      return;
    }
    if (data.cards[id].effects.some((e) => e.type === 'ban_face')) {
      setFaceTarget(id);
      return;
    }
    void perform({ type: 'buy', cardId: id });
  };

  return (
    <div className="screen battle" ref={stageRef}>
      {/* 上：CPU */}
      <div className={`bar bar-enemy ${state.active === 1 && state.phase !== 'over' ? 'is-active' : ''}`}>
        <span className="turn-label">
          ターン {state.turn}
          {state.phase !== 'over' && state.turn >= afterTurn - 1 && (
            <span className="long-warn">{state.turn >= afterTurn ? '長期戦！' : `長期戦まで${afterTurn - state.turn + 1}`}</span>
          )}
        </span>
        <StatusLine p={shown(cpu, 1)} side={1} data={data} onMagic={setCardDetail} />
        <button className="btn-icon" onClick={() => setMenu(true)} aria-label="オプション">
          ☰
        </button>
      </div>

      {/* 中央：出目ごとの盤面 */}
      <Board
        data={data}
        state={preview !== null ? { ...state, lastRoll: preview, phase: 'reroll' } : state}
        onFace={setFaceDetail}
        onCard={setCardDetail}
      />

      {/* 右：サイコロと操作 */}
      <div className="side">
        <div className={`side-turn ${state.phase === 'over' ? (state.winner === 0 ? 'win' : 'lose') : state.active === 0 ? 'mine' : 'theirs'}`}>
          {state.phase === 'over' ? (state.winner === 0 ? '勝利！' : '敗北…') : state.active === 0 ? 'あなたの手番' : `${cpu.name}の手番`}
        </div>
        <Die value={rolling ? rollFace : (preview ?? state.lastRoll)} rolling={rolling} size={56} enemy={state.active === 1} />
        <button className="side-log" onClick={() => setLogOpen(true)} aria-label="ログを見る">
          {state.log.slice(-3).map((l, i) => (
            <span key={state.log.length - 3 + i} className={`log-line kind-${l.kind} side-${l.side ?? 'x'}`}>
              {l.text}
            </span>
          ))}
        </button>
        <div className="side-actions">
          <button className="btn btn-ghost btn-side" onClick={() => setMarketOpen(true)}>
            デッキを見る
          </button>
          {myTurn && state.phase === 'roll' && (
            <button className="btn btn-primary btn-side" disabled={busy} onClick={() => void perform({ type: 'roll' })}>
              サイコロを振る
            </button>
          )}
          {myTurn && state.phase === 'reroll' && !busy && (
            <>
              <button className="btn btn-magic btn-side" onClick={() => void perform({ type: 'reroll' })}>
                振り直す
              </button>
              <button className="btn btn-primary btn-side" onClick={() => void perform({ type: 'keep' })}>
                {state.lastRoll}で決定
              </button>
            </>
          )}
          {canBuy && (
            <button className="btn btn-primary btn-side" disabled={busy} onClick={() => void perform({ type: 'end_turn' })}>
              手番終了
            </button>
          )}
          {!myTurn && state.phase !== 'over' && <div className="waiting">考え中…</div>}
        </div>
      </div>

      {/* 下：自分 */}
      <div className={`bar bar-me ${state.active === 0 && state.phase !== 'over' ? 'is-active' : ''}`}>
        <StatusLine p={shown(me, 0)} side={0} data={data} onMagic={setCardDetail} />
      </div>

      <div className="fx-layer" ref={fxRef} aria-hidden="true" />
      {bigDie && (
        <div className="big-die" aria-live="polite">
          <div className="big-die-inner">
            <Die value={bigDie.face} size={120} enemy={bigDie.enemy} />
            <div className="big-die-label">{bigDie.enemy ? cpu.name : 'あなた'}の出目 <b>{bigDie.face}</b></div>
          </div>
        </div>
      )}

      {built && (
        <div className={`built ${built.side === 1 ? 'built-enemy' : 'built-me'}`} aria-live="polite">
          <div className="built-title">{state.players[built.side].name}が建設！</div>
          <div className="built-cards">
            {built.cards.map(([id, n], i) => (
              <div key={id} className="built-card" style={{ animationDelay: `${i * 90}ms` }}>
                <CardView card={data.cards[id]} data={data} badge={n > 1 ? `×${n}` : undefined} />
              </div>
            ))}
          </div>
        </div>
      )}

      {marketOpen && (
        <div className="market">
          <div className="market-head">
            <span className="market-title">{canBuy ? '購入フェーズ' : 'デッキ（市場）'}</span>
            <span className="coins-big">🪙 {me.coins}</span>
            <button className="btn btn-small btn-ghost" onClick={() => setMarketOpen(false)}>
              盤面を見る
            </button>
            {canBuy && (
              <button className="btn btn-small btn-primary" disabled={busy} onClick={() => void perform({ type: 'end_turn' })}>
                手番終了
              </button>
            )}
          </div>
          <div className="market-grid">
            {me.market.map((id) => {
              const card = data.cards[id];
              const err = buyError(state, data, 0, id);
              const active = me.magics.find((m) => m.cardId === id);
              const owned = me.facilities.filter((f) => f.cardId === id).length;
              return (
                <CardView
                  key={id}
                  card={card}
                  data={data}
                  stock={me.stock[id]}
                  disabled={canBuy && !!err}
                  badge={active ? `効果中 残${active.remaining}` : owned > 0 ? `所持${owned}` : undefined}
                  onClick={() => tryBuy(id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {myTurn && state.phase === 'destroy' && (
        <Modal title="破城槌：壊す施設を選ぶ">
          <div className="card-grid">
            {destroyTargets(state, data, 0).map((id) => (
              <CardView
                key={id}
                card={data.cards[id]}
                data={data}
                badge={`×${cpu.facilities.filter((f) => f.cardId === id).length}`}
                onClick={() => void perform({ type: 'destroy', cardId: id })}
              />
            ))}
          </div>
        </Modal>
      )}

      {faceTarget && (
        <FacePicker
          data={data}
          state={state}
          cardId={faceTarget}
          onCancel={() => setFaceTarget(null)}
          onPick={(face) => {
            void perform({ type: 'buy', cardId: faceTarget, face });
            setFaceTarget(null);
          }}
        />
      )}

      {faceDetail !== null && <FaceDetail data={data} state={state} face={faceDetail} onClose={() => setFaceDetail(null)} />}

      {cardDetail && (
        <Modal title={data.cards[cardDetail].name} onClose={() => setCardDetail(null)}>
          <div className="card-detail">
            <CardView card={data.cards[cardDetail]} data={data} />
          </div>
        </Modal>
      )}

      {logOpen && <LogModal state={state} onClose={() => setLogOpen(false)} />}

      {menu && (
        <Menu
          onClose={() => setMenu(false)}
          onRetire={() => {
            setMenu(false);
            onRetire();
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/** ['wheat','wheat','barracks'] → [['wheat',2],['barracks',1]] */
function countCards(ids: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m];
}

/** 演出のタイミングで表示用のHP・コインを進める */
function applyFxToView(v: View, fx: Fx) {
  switch (fx.kind) {
    case 'coin':
      v.coins[fx.side] += fx.amount;
      break;
    case 'hit':
    case 'zap':
      v.hp[fx.target] -= fx.amount;
      break;
    case 'heal':
      v.hp[fx.side] += fx.amount;
      break;
    case 'steal':
      v.coins[fx.from] -= fx.amount;
      v.coins[fx.to] += fx.amount;
      break;
    case 'income':
      v.coins[fx.side] += fx.amount;
      break;
    case 'merc':
      v.coins[fx.side] -= fx.coins;
      v.hp[fx.target] -= fx.amount;
      break;
    case 'storm':
      v.hp[0] -= fx.amounts[0];
      v.hp[1] -= fx.amounts[1];
      break;
  }
}

// ---------- 上下のステータス ----------

function useDelta(n: number) {
  const prev = useRef(n);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  useEffect(() => {
    const d = n - prev.current;
    prev.current = n;
    if (d !== 0) setDelta({ v: d, k: Date.now() });
  }, [n]);
  return delta;
}

function StatusLine({ p, side, data, onMagic }: { p: PlayerState; side: Side; data: GameData; onMagic: (id: string) => void }) {
  const ratio = Math.max(0, p.hp) / p.maxHp;
  const coinDelta = useDelta(p.coins);
  return (
    <>
      <span className="bar-name">{p.name}</span>
      <div className="hp-bar" data-hp={side}>
        <div className={`hp-fill ${ratio < 0.3 ? 'low' : ''}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="hp-text">
        HP {Math.max(0, p.hp)}/{p.maxHp}
      </span>
      <span className="coin-badge" data-coin={side} aria-label={`コイン${p.coins}`}>
        {p.coins}
        {coinDelta && (
          <span key={coinDelta.k} className={`float coin-float ${coinDelta.v < 0 ? 'neg' : 'pos'}`}>
            {coinDelta.v > 0 ? `+${coinDelta.v}` : coinDelta.v}
          </span>
        )}
      </span>
      <span className="magic-slots">
        {p.magics.length === 0 && <span className="magic-slot is-empty" aria-label="発動中の魔法なし" />}
        {p.magics.map((m) => (
          <button key={m.cardId} className="magic-slot" data-magic={`${side}-${m.cardId}`} onClick={() => onMagic(m.cardId)}>
            {data.cards[m.cardId].name}
            {m.face !== undefined && <b>［{m.face}］</b>}
            <span className="magic-left">{m.remaining}</span>
          </button>
        ))}
      </span>
    </>
  );
}

// ---------- 盤面 ----------

/** 出目を連続した区間に分ける（[1,2] → [[1,2]]、[1,3,5] → [[1],[3],[5]]） */
function faceRuns(faces: number[]): [number, number][] {
  const sorted = [...new Set(faces)].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const f of sorted) {
    const last = runs[runs.length - 1];
    if (last && last[1] === f - 1) last[1] = f;
    else runs.push([f, f]);
  }
  return runs;
}

function Zone({ data, state, side, onCard }: { data: GameData; state: BattleState; side: Side; onCard: (id: string) => void }) {
  const p = state.players[side];
  const counts = new Map<string, number>();
  for (const f of p.facilities) counts.set(f.cardId, (counts.get(f.cardId) ?? 0) + 1);
  const roll = state.lastRoll;
  const chips: { key: string; id: string; n: number; run: [number, number] }[] = [];
  for (const [id, n] of counts) {
    for (const run of faceRuns(data.cards[id].faces ?? [])) chips.push({ key: `${id}-${run[0]}`, id, n, run });
  }
  chips.sort((a, b) => a.run[0] - b.run[0] || b.run[1] - b.run[0] - (a.run[1] - a.run[0]));
  return (
    <div className={`zone ${side === 1 ? 'zone-enemy' : 'zone-me'}`}>
      {chips.map(({ key, id, n, run }) => {
        const card = data.cards[id];
        const counter = card.category === 'counter';
        const inRun = roll !== null && roll >= run[0] && roll <= run[1];
        // 自分の施設は自分の出目、カウンターは相手の出目で光る
        const hit = inRun && state.phase !== 'roll' && (counter ? state.active !== side : state.active === side);
        return (
          <button
            key={key}
            className={`bchip cat-${card.category} ${hit ? 'is-hit' : ''}`}
            style={{ gridColumn: `${run[0]} / ${run[1] + 1}` }}
            data-card={id}
            data-side={side}
            data-run={`${run[0]}-${run[1]}`}
            onClick={() => onCard(id)}
          >
            {counter && <span className="bchip-shield">🛡</span>}
            <span className="bchip-name">{card.name}</span>
            {n > 1 && <b>×{n}</b>}
          </button>
        );
      })}
    </div>
  );
}

function Board({
  data,
  state,
  onFace,
  onCard,
}: {
  data: GameData;
  state: BattleState;
  onFace: (f: number) => void;
  onCard: (id: string) => void;
}) {
  const roll = state.phase === 'roll' ? null : state.lastRoll;
  return (
    <div className="board">
      <div className="board-cols" aria-hidden="true">
        {FACES.map((f) => (
          <div key={f} className={`board-col ${roll === f ? (state.active === 0 ? 'hit-me' : 'hit-enemy') : ''}`} />
        ))}
      </div>
      <Zone data={data} state={state} side={1} onCard={onCard} />
      <Zone data={data} state={state} side={0} onCard={onCard} />
      <div className="dice-row">
        {FACES.map((f) => (
          <button key={f} className="dice-cell" onClick={() => onFace(f)} aria-label={`出目${f}の詳細`}>
            <MiniDie value={f} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- モーダル類 ----------

function faceLines(data: GameData, state: BattleState, roller: Side, face: number): string[] {
  const me = state.players[roller];
  const them = state.players[roller === 0 ? 1 : 0];
  const lines: string[] = [];
  const group = (p: PlayerState, pred: (cat: string) => boolean) => {
    const m = new Map<string, number>();
    for (const f of p.facilities) {
      const c = data.cards[f.cardId];
      if (pred(c.category) && c.faces?.includes(face)) m.set(c.id, (m.get(c.id) ?? 0) + 1);
    }
    return m;
  };
  for (const [id, n] of group(them, (c) => c === 'counter')) lines.push(`🛡 ${them.name}の${data.cards[id].name}×${n}：${describeCard(data.cards[id], data)}`);
  for (const [id, n] of group(me, (c) => c !== 'counter')) lines.push(`${me.name}の${data.cards[id].name}×${n}：${describeCard(data.cards[id], data)}`);
  if (lines.length === 0) lines.push('何も起きない');
  return lines;
}

function FaceDetail({ data, state, face, onClose }: { data: GameData; state: BattleState; face: number; onClose: () => void }) {
  return (
    <Modal title={`出目 ${face}`} onClose={onClose}>
      <div className="two-col">
        {([0, 1] as Side[]).map((side) => (
          <div key={side}>
            <div className="section-label">{state.players[side].name}が {face} を出したら</div>
            <ul className="face-lines">
              {faceLines(data, state, side, face).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function FacePicker({
  data,
  state,
  cardId,
  onPick,
  onCancel,
}: {
  data: GameData;
  state: BattleState;
  cardId: string;
  onPick: (f: number) => void;
  onCancel: () => void;
}) {
  const card = data.cards[cardId];
  const target = card.effects.some((e) => e.type === 'ban_face' && e.target === 'opponent') ? 1 : 0;
  const faces = [...new Set(data.dice[state.players[target].dice].faces)];
  return (
    <Modal title={`${card.name}：出なくする目を選ぶ`} onClose={onCancel}>
      <p className="hint">{target === 1 ? '相手が出せなくなる目' : '自分が出せなくなる目'}（3回分）</p>
      <div className="face-pick">
        {faces.map((f) => (
          <button key={f} className="face-pick-btn" onClick={() => onPick(f)}>
            <Die value={f} size={40} enemy={target === 1} />
            <span className="face-pick-lines">
              {faceLines(data, state, target as Side, f).map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function LogModal({ state, onClose }: { state: BattleState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, []);
  return (
    <Modal title="ログ" onClose={onClose}>
      <div className="log-full" ref={ref}>
        {state.log.map((l, i) => (
          <div key={i} className={`log-line kind-${l.kind} side-${l.side ?? 'x'}`}>
            {l.text}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Menu({ onClose, onRetire }: { onClose: () => void; onRetire: () => void }) {
  const [help, setHelp] = useState(false);
  if (help) return <HowToPlay onClose={() => setHelp(false)} />;
  return (
    <Modal title="オプション" onClose={onClose}>
      <div className="menu-buttons">
        <button className="btn btn-ghost" onClick={() => setHelp(true)}>
          遊び方
        </button>
        <button className="btn btn-danger" onClick={onRetire}>
          リタイアしてビルドに戻る
        </button>
      </div>
    </Modal>
  );
}
