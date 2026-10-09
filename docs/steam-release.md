# Steam版（Windows）の作り方と公開の流れ

ダイス・ウォーズは Electron でWindowsアプリにできます。ブラウザ版（GitHub Pages）と同じ中身です。

## 1. アプリを作る

```bash
npm run dist:win
```

- できあがり：`release/win-unpacked/` フォルダ（中の `DiceWars.exe` が本体）
- このフォルダごと Steam にアップロードします（インストーラーは不要。Steamがインストールを担当）
- 手元で試すだけなら `npm run desktop`（ビルドしてそのまま起動）

## 2. デスクトップ版の動き

- 起動時はフルスクリーン。**F11** または **Alt+Enter** でウィンドウと切り替え（オプション画面の「画面」でも切り替え可能）
- 画面はスマホ横画面（667×375）を基準に、ウィンドウの大きさに合わせて拡大表示（1920×1080 なら約2.9倍）
- タイトル画面に「終了」ボタン
- セーブデータ：`%APPDATA%\DiceWars\Local Storage\` に保存（ブラウザ版とは別）
- Steamオーバーレイ（Shift+Tab）が出るように設定済み

## 3. Steamで公開する手順（Steamworks）

1. **Steamworks に登録**（https://partner.steamgames.com/）
   - 開発者情報・税務・銀行口座の登録が必要
   - アプリ1本ごとに登録料（Steam Direct、100米ドル）
2. **アプリを作成** → App ID が発行される
3. **ストアページを作る**（説明文、スクリーンショット5枚以上、トレーラー、カプセル画像など）
   - 審査があり、公開予定日の2週間以上前に「近日公開」ページを出す必要がある
4. **ビルドをアップロード**（SteamPipe）
   - Steamworks の「インストール設定」で起動オプションを登録：実行ファイル `DiceWars.exe`、OS は Windows
   - デポ（Depot）を作り、`release/win-unpacked/` の中身をアップロード
   - アップロードは Steamworks SDK の `steamcmd`（または SteamPipe GUI ツール）で行う
5. **ビルドの審査** → 合格したらリリース

## 4. 今後あるとよいもの（まだ入っていない）

- **実績・Steamクラウド**：実績には steamworks.js などで Steam API をつなぐ作業が必要（App ID が決まってから）。
  Steamクラウドだけなら、Steamworks の設定で上記のセーブデータのフォルダを同期対象にすれば、コードの変更なしで使える
- **高解像度の画像**：カードやマップの絵は軽さ優先で縮小しているので、フルHD以上ではやや甘く見える。Steam版だけ大きい画像にもできる
- **コード署名**：署名がないと、Steam以外で配布したときに Windows の警告が出る（Steam経由なら通常は問題なし）
- **Mac / Linux 版**：Electron なので作れるが、それぞれの環境でのビルドと確認が必要
