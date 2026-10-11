import { useLayoutEffect, useRef, useState } from 'react';
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
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null); // 吹き出しの位置（画面からはみ出さないよう計算）
  const bubbleRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    const measure = (scroll: boolean) => {
      const el = step?.target ? document.querySelector(step.target) : null;
      const app = document.querySelector('.app');
      if (!el || !app) {
        setRect(null);
        return;
      }
      const a = app.getBoundingClientRect();
      let r = el.getBoundingClientRect();
      // 照らす対象が画面の外（スクロールの先）にあるときは、見えるところまでスクロールしてから照らす
      if (scroll && (r.top < a.top || r.bottom > a.bottom || r.left < a.left || r.right > a.right)) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
        r = el.getBoundingClientRect();
      }
      const next = new DOMRect(r.left - a.left, r.top - a.top, r.width, r.height);
      setRect((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height ? prev : next));
    };
    measure(true);
    // 画面が動いている途中（市場が開くアニメーションなど）でも合うよう、少し後にもう一度測る
    const t1 = window.setTimeout(() => measure(true), 200);
    const t2 = window.setTimeout(() => measure(false), 450);
    const onResize = () => measure(false);
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [i, step]);

  // 吹き出しの大きさを測ってから、対象の上下で空いている方に置き、画面の内側に収める
  useLayoutEffect(() => {
    const b = bubbleRef.current;
    const app = document.querySelector('.app');
    if (!b || !app) return;
    const W = app.clientWidth;
    const H = app.clientHeight;
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const M = 8; // 画面の端との余白
    const clampX = (x: number) => Math.min(Math.max(x, M), Math.max(M, W - bw - M));
    const clampY = (y: number) => Math.min(Math.max(y, M), Math.max(M, H - bh - M));
    if (!rect) {
      setPos({ left: clampX((W - bw) / 2), top: clampY((H - bh) / 2) });
      return;
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const G = 10; // 照らす場所との間隔
    const spaceBelow = H - (rect.top + rect.height) - M;
    const spaceAbove = rect.top - M;
    const spaceRight = W - (rect.left + rect.width) - M;
    const spaceLeft = rect.left - M;
    // 1) 上下のどちらかに入るなら、広い方へ
    if (spaceBelow >= bh + G || spaceAbove >= bh + G) {
      const top = spaceBelow >= bh + G && (spaceBelow >= spaceAbove || spaceAbove < bh + G) ? rect.top + rect.height + G : rect.top - G - bh;
      setPos({ left: clampX(cx - bw / 2), top: clampY(top) });
      return;
    }
    // 2) 左右のどちらかに入るなら、広い方へ（縦に大きいカードなど）
    if (spaceRight >= bw + G || spaceLeft >= bw + G) {
      const left = spaceRight >= bw + G && (spaceRight >= spaceLeft || spaceLeft < bw + G) ? rect.left + rect.width + G : rect.left - G - bw;
      setPos({ left: clampX(left), top: clampY(cy - bh / 2) });
      return;
    }
    // 3) どこにも入らない大きな対象（盤面・市場など）は、対象の中央に重ねる
    setPos({ left: clampX(cx - bw / 2), top: clampY(cy - bh / 2) });
  }, [rect, i, step]);

  if (!step) return null;
  const next = () => {
    sfx('page');
    if (i + 1 >= steps.length) onDone();
    else setI(i + 1);
  };

  // 位置が決まるまでは見えないようにしておく（測ってから置く）
  const bubbleStyle: React.CSSProperties = pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' };

  return (
    <div className="tut" onClick={next} role="dialog" aria-label="チュートリアル">
      {rect ? (
        <div className="tut-spot" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      ) : (
        <div className="tut-dim" />
      )}
      <div className="tut-bubble" ref={bubbleRef} style={bubbleStyle} key={i}>
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
