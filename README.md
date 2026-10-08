# ダイスタウン・ウォーズ（試作版 v0.2）

出目で発動するカードで戦う、CPU対戦型デッキ構築ゲーム。

- **ストーリーモード**：全50ステージ。経験値でカードの解放・レベルアップ・最大HPの強化をしながら進む（進行は端末に保存）
- **練習モード**：全カードを最初から使える。カードはLv1、最大HP180固定
仕様は `claude-code-prompt_dice-town.md` を参照。

**遊ぶ**：https://ikurah55-ops.github.io/dice-town-wars/ （スマホでは横向き。ホーム画面に追加するとアプリとして起動）

`main` ブランチに push すると GitHub Actions がテスト・ビルドして GitHub Pages に自動デプロイします。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（同じWi-Fiのスマホから `http://<PCのIP>:5173` で遊べる） |
| `npm test` | ユニットテスト |
| `npm run sim -- --games 100000 --seed 1` | CPU同士の大量対戦シミュレーション |
| `npm run sim -- --cards ./my-cards.json --config ./my-config.json` | データを差し替えて比較 |
| `npm run sim -- --env walls` | 環境効果を付けて対戦（ID は environments.json） |
| `npm run sim:story -- --runs 200 --seed 1` | ストーリー50ステージを通しで進めるシミュレーション |
| `npm run sim:ai -- --games 20000` | AIの強さ（よわい／ふつう／つよい）を「ふつう」と対戦させて比較 |
| `npm run build` | 本番ビルド（`dist/`、PWA対応） |

## 構成

- `src/data/` … 数値はすべてここ
  - `cards.json` カード（`story` にストーリーでの解放時期・必要経験値・レベル・ボスの型）
  - `ai_levels.json` 敵AIの強さ3段階
  - `environments.json` 環境効果11種（背景色・仮アイコン・初見の説明つき）／`story_config.json` ストーリーの式・経験値・枠など／`story_stages.json` ステージごとの上書き
- `src/core/` … ゲームロジック（UI非依存）
  - `rules.ts` 手番進行・効果・勝敗（`applyAction` で1手ずつ進む状態機械）
  - `ai.ts` CPUの購入判断（価値÷コスト）
  - `cards.ts` 効果の説明文、レベル補正 `scaleAmount`
  - `env.ts` 環境効果フック（戦闘開始・基本収入・コスト・施設の発動量・魔法の回数・サイコロの重み・長期戦）
  - `story.ts` ストーリーのステージ生成・経験値・解放・強化・セーブデータ
  - `auto.ts` CPU同士の自動対戦
- `src/ui/` … React 画面
- `src/sim/simulate.ts` … シミュレーションCLI

## 確定した細則（仕様書に記載のなかった点）

1. 見張り塔の軽減は、そのターンの攻撃ダメージの**合計**から引く
2. 市場と在庫はプレイヤーごとに別（基本3枚＋各自の持ち込み5枚。投石機は持ち込みカード）
3. 破城槌は壊せる施設がなくても1回分消費。同種が複数なら成長の少ないものを壊す
4. 封印の札・沈黙の呪いの3回分は「手番数」で数える（振り直しは数えない）
5. 女神の微笑みは、振り直すか決めた後にカウンター・施設が発動する
6. 施設の在庫は各4枚。魔法は効果（3回）が切れた後、自分の購入フェーズ2回分は同じ魔法を買い直せない（別の魔法は買える）

## 拡張の入口

- 環境効果：`createBattle(..., { environment })`。新しい効果は既存の種類の組み合わせなら environments.json に足すだけ
- カードレベル：`Combatant.cardLevels`（1レベルごとに+10%、`config.json` の `levelBonusPerLevel`）
- カードを追加するとき：`cards.json` の `story` を必ず入れる（決め方は `claude-code-prompt` の「カードを追加するときのルール」）
- 偏ったサイコロ：`dice.json` の `available` と `modifiers.incomeBonus`
