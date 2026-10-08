import { useLayoutEffect, useState } from 'react';
import type { EnvironmentDef } from '../core/types';
import { envImage } from './art';
import { sfx } from './audio';

export interface TutStep {
  title: string;
  text: string;
  target?: string; // 照らす要素（CSSセレクタ）。なければ画面中央に表示
}

/** タップで進むチュートリアル。対象の要素だけを明るく照らし、説明の吹き出しを出す */
export function Tutorial({ steps, onDone }: { steps: TutStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    const el = step?.target ? document.querySelector(step.target) : null;
    const app = document.querySelector('.app');
    if (!el || !app) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const a = app.getBoundingClientRect();
    setRect(new DOMRect(r.left - a.left, r.top - a.top, r.width, r.height));
  }, [i, step]);

  if (!step) return null;
  const next = () => {
    sfx('page');
    if (i + 1 >= steps.length) onDone();
    else setI(i + 1);
  };

  // 吹き出しは対象の上下で空いている方に置く
  let bubbleStyle: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const appH = document.querySelector('.app')?.clientHeight ?? 375;
    const below = rect.top + rect.height / 2 < appH / 2;
    const cx = Math.min(Math.max(rect.left + rect.width / 2, 180), (document.querySelector('.app')?.clientWidth ?? 800) - 180);
    if (rect.height > appH * 0.5) {
      // 大きな対象（盤面・市場など）は、対象の中央に重ねる
      bubbleStyle = { left: rect.left + rect.width / 2, top: rect.top + rect.height / 2, transform: 'translate(-50%, -50%)' };
    } else {
      bubbleStyle = below
        ? { left: cx, top: Math.min(rect.top + rect.height + 10, appH - 130), transform: 'translateX(-50%)' }
        : { left: cx, top: Math.max(rect.top - 10, 130), transform: 'translate(-50%, -100%)' };
    }
  }

  return (
    <div className="tut" onClick={next} role="dialog" aria-label="チュートリアル">
      {rect ? (
        <div className="tut-spot" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      ) : (
        <div className="tut-dim" />
      )}
      <div className="tut-bubble" style={bubbleStyle}>
        <div className="tut-title">{step.title}</div>
        <div className="tut-text">{step.text}</div>
        <div className="tut-foot">
          <span>
            {i + 1}/{steps.length}
          </span>
          <span className="tut-tap">タップで{i + 1 >= steps.length ? '閉じる' : '次へ'}</span>
        </div>
      </div>
      <button
        // 照らす場所が右上（スキップの位置）なら、スキップは左下に置く
        className={rect && rect.top < 60 && rect.left + rect.width > (document.querySelector('.app')?.clientWidth ?? 800) - 130 ? 'tut-skip tut-skip-low' : 'tut-skip'}
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        スキップ
      </button>
    </div>
  );
}

/** 環境効果の発表画面（タップで進む）。初めての効果なら詳しい説明も出す */
export function EnvAnnounce({ env, firstTime, label = '今回の環境効果', onDone }: { env: EnvironmentDef; firstTime: boolean; label?: string; onDone: () => void }) {
  const img = envImage(env.id);
  const [portrait, setPortrait] = useState(false); // 縦長の絵は横に文字を並べる
  const texts = (
    <>
      <div className="env-label">{label}</div>
      <div className="env-name">{env.name}</div>
      <div className="env-desc">{env.description}</div>
      {firstTime && env.detail && (
        <div className="env-detail">
          <b>初めての環境効果</b>
          <span>{env.detail}</span>
        </div>
      )}
      <div className="env-tap">{label === '今回の環境効果' ? '画面をタップして戦闘開始' : '画面をタップして続ける'}</div>
    </>
  );
  return (
    <div
      className={`env-announce ${img ? 'env-announce-pic' : ''} ${portrait ? 'is-portrait' : ''}`}
      style={{ ['--env' as string]: env.color ?? '#3a1a5e' }}
      onClick={() => {
        sfx('page');
        onDone();
      }}
      role="dialog"
      aria-label={`環境効果：${env.name}`}
    >
      {img ? (
        <>
          {/* 絵を画面いっぱいに大きく。背景にも同じ絵をぼかして敷く */}
          <img className="env-pic-bg" src={img} alt="" aria-hidden="true" draggable={false} />
          <div className="env-pic-frame">
            <img
              className="env-pic"
              src={img}
              alt=""
              draggable={false}
              onLoad={(e) => setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
            />
            <div className="env-pic-caption">{texts}</div>
          </div>
        </>
      ) : (
        <div className="env-announce-inner">
          {/* イラストがなければ仮のアイコン */}
          <div className="env-art" aria-hidden="true">
            <span>{env.icon ?? '🌐'}</span>
          </div>
          <div className="env-texts">{texts}</div>
        </div>
      )}
    </div>
  );
}
