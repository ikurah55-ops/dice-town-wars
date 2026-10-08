# 環境効果イラスト：縦長→横長に描き足すための指示文

城壁の時代・魔力の満ちる日・短期決戦の絵は縦長なので、画像生成AI（ChatGPT・Gemini など）で左右を描き足して横長にします。

## 使い方

1. 元の絵（下の「元画像」）を画像AIにアップロードする
2. 「共通の指示」と各絵の「描き足す内容」をつなげて送る
3. できた横長の絵を送ってもらえれば、ゲームに入れます（`src/assets/envs/<ファイル名>` を差し替え）

- **縦横比**：横長 2:1（例：1536×768px）。他の環境効果の絵と同じ比率
- **文字・枠・ロゴは入れない**（前回の画像はカード名と金枠入りだったので、今回は絵だけで）
- 元の絵は中央にそのまま残し、左右だけを描き足してもらう

## 元画像

| ファイル | 環境効果 |
|---|---|
| `src/assets/envs/walls.jpg` | 城壁の時代 |
| `src/assets/envs/mana_day.jpg` | 魔力の満ちる日 |
| `src/assets/envs/short_war.jpg` | 短期決戦 |

## 共通の指示（日本語）

```
この縦長の絵を、横長（縦横比 2:1）に広げてください。元の絵は中央にそのまま残し、左右だけを自然につながるように描き足してください。画風・色・光の向き・細かさは元の絵と完全にそろえてください。文字、枠、ロゴ、透かしは入れないでください。
```

## 共通の指示（英語：英語の方がうまくいくAI向け）

```
Outpaint this vertical image into a wide 2:1 landscape. Keep the original image unchanged in the center and extend only the left and right sides so they blend seamlessly. Match the painting style, colors, lighting direction and level of detail exactly. No text, no letters, no border, no frame, no logo, no watermark.
```

## 描き足す内容（共通の指示の後に続ける）

### 城壁の時代（walls.jpg）

```
左右には、城壁と塔がさらに遠くまで続き、城壁の上に並ぶ青い外套の兵士、見張り塔、はためく青い旗、遠くの山並みと夕暮れの空を描き足してください。
```

```
On the sides, continue the castle walls and towers into the distance, with more soldiers in blue tabards lining the battlements, watchtowers, blue banners waving, distant mountains and the golden-hour sky.
```

### 魔力の満ちる日（mana_day.jpg）

```
左右には、宙に浮かぶ小さな島と城、渦を巻く青紫の魔法の光の帯、光るルーン文字の刻まれた石柱、雲の海と滝を描き足してください。魔法使いは中央のまま、一人だけにしてください。
```

```
On the sides, add more floating islands with small castles, swirling ribbons of blue-violet magical light, standing stones carved with glowing runes, a sea of clouds and waterfalls. Keep the single wizard in the center; do not add more wizards.
```

### 短期決戦（short_war.jpg）

```
左右には、ぶつかり合う赤と青の兵士たちの乱戦、舞い上がる土ぼこり、槍と赤い旗、立ちのぼる黒い煙、遠くの城を描き足してください。
```

```
On the sides, extend the chaotic clash between red and blue soldiers, with flying dust and debris, spears and red banners, rising black smoke, and a distant castle.
```
