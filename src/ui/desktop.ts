// デスクトップ版（Electron / Steam）だけで使える機能。ブラウザ・スマホでは undefined
export interface DesktopApi {
  isDesktop: true;
  quit: () => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
}

export const desktop: DesktopApi | undefined = (window as unknown as { desktop?: DesktopApi }).desktop;
