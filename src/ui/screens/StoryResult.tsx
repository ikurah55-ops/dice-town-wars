import type { ExpGain, StageDef } from '../../core/story';
import { stageLabel } from '../../core/story';
import type { BattleState, CardDef } from '../../core/types';

/** ストーリーの結果画面：勝敗と経験値の内訳 */
export function StoryResult({
  state,
  stage,
  gains,
  total,
  expNow,
  newlyUnlockable,
  slotsUp,
  onMap,
  onRetry,
  onUpgrade,
}: {
  state: BattleState;
  stage: StageDef;
  gains: ExpGain[];
  total: number;
  expNow: number;
  newlyUnlockable: CardDef[];
  slotsUp: number | null;
  onMap: () => void;
  onRetry: () => void;
  onUpgrade: () => void;
}) {
  const win = state.winner === 0;
  const me = state.players[0];
  return (
    <div className={`screen result-screen ${win ? 'is-win' : 'is-lose'}`}>
      <div className="result-left">
        <div className="result-stage">{stageLabel(stage)}</div>
        <div className="result-badge">{win ? '勝利！' : '敗北…'}</div>
        <p className="result-sub">
          {state.turn}ターン　残りHP {Math.max(0, me.hp)}/{me.maxHp}
        </p>
        <div className="result-stats exp-list">
          {gains.map((g, i) => (
            <div key={i} style={{ animationDelay: `${i * 150}ms` }}>
              <span>{g.label}</span>
              <b>+{g.exp}</b>
            </div>
          ))}
          <div className="exp-total">
            <span>獲得経験値</span>
            <b>+{total}</b>
          </div>
          <p className="hint">所持経験値 {expNow}</p>
        </div>
      </div>
      <div className="title-buttons">
        {(newlyUnlockable.length > 0 || slotsUp) && (
          <div className="unlock-news">
            {slotsUp && <div>🎒 持ち込み枠が{slotsUp}枠になった！</div>}
            {newlyUnlockable.length > 0 && <div>🔓 解放できるカード：{newlyUnlockable.map((c) => c.name).join('、')}</div>}
          </div>
        )}
        <button className="btn btn-primary btn-big" onClick={onMap}>
          マップへ
        </button>
        <button className="btn btn-ghost" onClick={onUpgrade}>
          強化する
        </button>
        <button className="btn btn-ghost" onClick={onRetry}>
          もう一度挑戦
        </button>
      </div>
    </div>
  );
}
