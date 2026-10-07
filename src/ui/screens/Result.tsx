import type { BattleState, BossDef } from '../../core/types';

export function Result({
  state,
  boss,
  onRetry,
  onRebuild,
  onTitle,
}: {
  state: BattleState;
  boss: BossDef;
  onRetry: () => void;
  onRebuild: () => void;
  onTitle: () => void;
}) {
  const win = state.winner === 0;
  const me = state.players[0];
  const them = state.players[1];
  return (
    <div className={`screen result-screen ${win ? 'is-win' : 'is-lose'}`}>
      <div className="result-left">
        <div className="result-badge">{win ? '勝利！' : '敗北…'}</div>
        <p className="result-sub">{win ? `${boss.name}を倒した！` : `${boss.name}に敗れた…`}</p>
        <div className="result-stats">
          <div>
            <span>かかったターン</span>
            <b>{state.turn}</b>
          </div>
          <div>
            <span>残りHP</span>
            <b>
              {Math.max(0, me.hp)} / {me.maxHp}
            </b>
          </div>
          <div>
            <span>ボスの残りHP</span>
            <b>
              {Math.max(0, them.hp)} / {them.maxHp}
            </b>
          </div>
          <div>
            <span>建てた施設</span>
            <b>{me.facilities.length}</b>
          </div>
          {state.longBattleHappened && <p className="hint">長期戦ダメージが発生しました</p>}
        </div>
      </div>
      <div className="title-buttons">
        <button className="btn btn-primary btn-big" onClick={onRetry}>
          もう一度遊ぶ
        </button>
        <button className="btn btn-ghost" onClick={onRebuild}>
          ビルドを変える
        </button>
        <button className="btn btn-ghost" onClick={onTitle}>
          タイトルへ
        </button>
      </div>
    </div>
  );
}
