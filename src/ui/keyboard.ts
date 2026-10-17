// パソコン向けのキーボード操作。画面ごとに書かず、「今いちばん手前にあるもの」を操作する
//   Space / Enter : 決定（チュートリアル・発表画面（環境効果・新しいカード）を進める、サイコロを振る、出目で決定、手番終了、ステージ情報の「挑戦する」）
//   Esc           : 戻る・閉じる（チュートリアルのスキップ、ウィンドウを閉じる、市場を閉じる、前の画面へ、戦闘中はメニュー）

const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0;

/** セレクタの順に探して、最初に見つかった押せるものを押す */
function press(selectors: string[]): boolean {
  for (const sel of selectors) {
    const all = [...document.querySelectorAll(sel)];
    const el = all[all.length - 1] ?? null; // 一番手前（後から出たもの）
    if (visible(el) && !(el as HTMLButtonElement).disabled) {
      el.click();
      return true;
    }
  }
  return false;
}

function onKeyDown(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return; // 音量のつまみなどの操作中は邪魔しない
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  let handled = false;
  if (e.key === 'Escape') {
    handled = press([
      '.tut-skip', // チュートリアルを飛ばす
      '.modal .modal-close', // ウィンドウを閉じる
      '.market .market-head .btn-board', // 市場を閉じて盤面へ（「選び直す」は押さない）
      '.market-enemy .market-head .btn-ghost', // 相手のデッキを閉じる
      '.btn-back',
      '.map-back',
      '.battle .bar-enemy .btn-icon', // 戦闘中はメニュー（リタイアなど）を開く
    ]);
  } else if (e.key === ' ' || e.key === 'Enter') {
    if (e.repeat) return; // 押しっぱなしで連打にならないように
    handled = press([
      '.tut', // チュートリアルを進める
      '.env-announce', // 環境効果の発表を進める
      '.card-announce', // 新しいカードの発表を進める
      '.built', // 建設の表示を進める
      '.modal .btn-primary', // ステージ情報の「挑戦する」など
      '.market .market-head .btn-primary', // 購入フェーズの「手番終了」
      '.side-actions .btn-primary', // サイコロを振る／出目で決定／手番終了
    ]);
  }
  if (handled) {
    e.preventDefault();
    // ボタンにフォーカスが残っていると、同じキーでそのボタンも押されてしまうので外す
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
}

/** キーボード操作を有効にする（解除する関数を返す） */
export function installKeyboard(): () => void {
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
