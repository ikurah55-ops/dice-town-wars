import { useState } from 'react';
import { sfx } from '../audio';
import { Modal } from '../components';
import { AI_LEVELS, updateSettings, useSettings, type AiLevelId } from '../settings';

/** オプション：音量・バトル演出・敵AIの強さ・ストーリーのリセット */
export function Options({ onClose, onResetStory }: { onClose: () => void; onResetStory: () => void }) {
  const s = useSettings();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <Modal title="オプション" onClose={onClose}>
      {!confirm ? (
        <div className="options">
          <label className="opt-row" htmlFor="opt-se">
            <span>効果音</span>
            <input
              id="opt-se"
              type="range"
              min={0}
              max={100}
              value={Math.round(s.seVolume * 100)}
              onChange={(e) => updateSettings({ seVolume: Number(e.target.value) / 100 })}
              onPointerUp={() => sfx('coin')}
            />
            <b>{Math.round(s.seVolume * 100)}</b>
          </label>
          <label className="opt-row" htmlFor="opt-bgm">
            <span>BGM</span>
            <input
              id="opt-bgm"
              type="range"
              min={0}
              max={100}
              value={Math.round(s.bgmVolume * 100)}
              onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) / 100 })}
            />
            <b>{Math.round(s.bgmVolume * 100)}</b>
          </label>
          <div className="opt-row">
            <span>バトル演出</span>
            <div className="seg">
              <button className={s.battleFx ? 'on' : ''} onClick={() => updateSettings({ battleFx: true })}>
                あり
              </button>
              <button className={!s.battleFx ? 'on' : ''} onClick={() => updateSettings({ battleFx: false })}>
                なし
              </button>
            </div>
          </div>
          <p className="opt-note">「なし」にすると、出目の拡大表示やエフェクトを省いてすぐに結果が出ます。</p>
          <div className="opt-row">
            <span>敵AIの強さ</span>
            <div className="seg">
              {(Object.keys(AI_LEVELS) as AiLevelId[]).map((id) => (
                <button key={id} className={s.aiLevel === id ? 'on' : ''} onClick={() => updateSettings({ aiLevel: id })}>
                  {AI_LEVELS[id].name}
                </button>
              ))}
            </div>
          </div>
          <p className="opt-note">ストーリーと練習の両方に効きます。もらえる経験値は変わりません。次の戦闘から反映されます。</p>
          <div className="opt-row opt-danger">
            <span>ストーリー</span>
            <button className="btn btn-danger btn-small" onClick={() => setConfirm(true)}>
              進行をリセット
            </button>
          </div>
          {done && <p className="opt-note opt-done">ストーリーの進行をリセットしました。</p>}
        </div>
      ) : (
        <div className="confirm-box">
          <p>
            <b>本当にリセットしますか？</b>
            <br />
            クリア状況・サブミッション・経験値・解放したカード・カードレベル・最大HPの強化がすべて消え、元に戻せません。
          </p>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
              やめる
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                onResetStory();
                setConfirm(false);
                setDone(true);
              }}
            >
              リセットする
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
