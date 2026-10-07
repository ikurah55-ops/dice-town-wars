# ダイスタウン・ウォーズ（試作版 v0.1）

出目で発動するカードで戦う、CPU対戦型デッキ構築ゲーム。成長要素なし・ステージ1つの試作版。
仕様は `claude-code-prompt_dice-town.md` を参照。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（同じWi-Fiのスマホから `http://<PCのIP>:5173` で遊べる） |
| `npm test` | ユニットテスト |
| `npm run sim -- --games 100000 --seed 1` | CPU同士の大量対戦シミュレーション |
| `npm run sim -- --cards ./my-cards.json --config ./my-config.json` | データを差し替えて比較 |
| `npm run build` | 本番ビルド（`dist/`、PWA対応） |

## 構成

- `src/data/` … カード・サイコロ・ボス・定数（数値はすべてここ）
- `src/core/` … ゲームロジック（UI非依存）
  - `rules.ts` 手番進行・効果・勝敗（`applyAction` で1手ずつ進む状態機械）
  - `ai.ts` CPUの購入判断（価値÷コスト）
  - `cards.ts` 効果の説明文、レベル補正 `scaleAmount`
  - `auto.ts` CPU同士の自動対戦
- `src/ui/` … React 画面
- `src/sim/simulate.ts` … シミュレーションCLI

## 確定した細則（仕様書に記載のなかった点）

1. 見張り塔の軽減は、そのターンの攻撃ダメージの**合計**から引く
2. 市場と在庫はプレイヤーごとに別（基本4枚＋各自の持ち込み4枚）
3. 破城槌は壊せる施設がなくても1回分消費。同種が複数なら成長の少ないものを壊す
4. 封印の札・沈黙の呪いの3回分は「手番数」で数える（振り直しは数えない）
5. 女神の微笑みは、振り直すか決めた後にカウンター・施設が発動する

## 拡張の入口

- 環境効果：`createBattle(..., { modifiers })` の `BattleModifiers`
- 成長要素：`Combatant.maxHp` / `Combatant.cardLevels`（`scaleAmount` で効果量に反映）
- 偏ったサイコロ：`dice.json` の `available` と `modifiers.incomeBonus`
