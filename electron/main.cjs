// デスクトップ版（Steam用）の起動処理。ビルド済みの dist/index.html をウィンドウに表示する
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');

// Steamオーバーレイ（Shift+Tab）がElectronのウィンドウに表示されるようにするための設定
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

// スマホ横画面（約 667×375）を基準に作った画面を、ウィンドウの大きさに合わせて拡大する
const BASE_W = 667;
const BASE_H = 375;

let win = null;

function fitZoom() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  const zoom = Math.max(1, Math.min(w / BASE_W, h / BASE_H));
  win.webContents.setZoomFactor(zoom);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: BASE_W,
    minHeight: BASE_H,
    fullscreen: true, // 起動時はフルスクリーン（F11 / Alt+Enter で切り替え）
    backgroundColor: '#1a120c',
    title: 'ダイス・ウォーズ',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // ウィンドウが裏にあっても音や演出の時間がずれないように
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => {
    fitZoom();
    win.show();
  });
  win.on('resize', fitZoom);
  win.on('enter-full-screen', fitZoom);
  win.on('leave-full-screen', fitZoom);
  win.webContents.on('did-finish-load', fitZoom);

  // キー操作：F11 / Alt+Enter でフルスクリーン切り替え。ページ内の拡大縮小（Ctrl+ホイール等）は使わせない
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
    if (input.control && ['+', '-', '=', '0'].includes(input.key)) e.preventDefault();
  });
  win.webContents.setVisualZoomLevelLimits(1, 1);

  // 外部リンクは既定のブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    win = null;
  });
}

ipcMain.handle('app:quit', () => app.quit());
ipcMain.handle('app:toggleFullscreen', () => {
  if (win) win.setFullScreen(!win.isFullScreen());
  return win ? win.isFullScreen() : false;
});
ipcMain.handle('app:isFullscreen', () => (win ? win.isFullScreen() : false));

// 二重起動を防ぐ
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
