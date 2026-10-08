import { useState } from 'react';
import { Modal } from '../components';

/** スマホでは全画面＋横向き固定を試みる（対応していない環境では何もしない） */
async function tryLandscape() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* iOS Safari などは非対応 */
  }
}

export function Title({ onStory, onPractice, onOptions, storyProgress }: { onStory: () => void; onPractice: () => void; onOptions: () => void; storyProgress: number }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="screen title-screen" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}title.jpg)` }}>
      {/* 一枚絵の右側にロゴとメニュー */}
      <div className="title-panel">
        <div className="title-left">
          <h1 className="logo logo-img">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="ダイス・ウォーズ" draggable={false} />
          </h1>
          <p className="tagline">出目で動く街を育てて、ボスを倒せ！</p>
        </div>
        <div className="title-buttons">
          <button
            className="btn btn-primary btn-big mode-btn"
            onClick={() => {
              void tryLandscape();
              onStory();
            }}
          >
            ストーリーモード
            <small>{storyProgress > 0 ? `ステージ${storyProgress}までクリア` : '全50ステージ'}</small>
          </button>
          <button
            className="btn btn-ghost mode-btn"
            onClick={() => {
              void tryLandscape();
              onPractice();
            }}
          >
            練習モード
            <small>全カードを使って自由に対戦</small>
          </button>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setHelp(true)}>
              遊び方
            </button>
            <button className="btn btn-ghost" onClick={onOptions}>
              オプション
            </button>
          </div>
          <p className="version">試作版 v0.2</p>
        </div>
      </div>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </div>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="遊び方" onClose={onClose}>
      <ol className="howto">
        <li>
          <b>サイコロを振る</b>：出た目と同じ数字を持つ自分の施設が発動します。
        </li>
        <li>
          <b>経済カード</b>（緑）でコインを稼ぎ、<b>攻撃カード</b>（赤）で相手にダメージ。
        </li>
        <li>
          <b>カウンター</b>（青・🛡）は<b>相手</b>のサイコロの目で発動します。
        </li>
        <li>
          <b>魔法</b>（紫）は買った手番から3回分効果が続く使い切りカード。
        </li>
        <li>
          振ったあとは<b>市場</b>でコインがあるだけカードを購入。同じ施設を複数持つと効果も枚数倍！
        </li>
        <li>
          相手のHPを0にしたら勝ち。15ターンを超えると毎ターン両者が最大HPの1割ダメージを受けます。
        </li>
      </ol>
      <p className="hint">盤面は出目ごとの列に並んでいます。下のサイコロをタップすると、その目が出たら何が起きるか確認できます。</p>
    </Modal>
  );
}
