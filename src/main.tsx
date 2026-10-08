import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 起動画面：少しのあいだ見せてから、フェードで消す
const splash = document.getElementById('splash');
if (splash) {
  const wait = Math.max(0, 1400 - performance.now());
  setTimeout(() => {
    splash.classList.add('is-hidden');
    setTimeout(() => splash.remove(), 700);
  }, wait);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // sw.js 自体も毎回確認し、アプリに戻ってきたときにも更新を確かめる
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) void reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
