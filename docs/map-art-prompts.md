# ストーリーマップの背景：画像AI用の指示文

ストーリーのマップは横に長く、10ステージごとに地方が変わります。各地方の背景を1枚ずつ、計5枚作ります。
道・マス・番号・文字はゲーム側で描くので、背景の絵には入れないでください。

## 使い方

1. 画像生成AI（ChatGPT・Gemini など）に、「共通の指示」と各地方の「題材」をつなげて送る
2. できた絵を送ってもらえれば、ゲームに入れます（`src/assets/map/region1.jpg` 〜 `region5.jpg`）
   - 届くまでは、ゲーム側で描いた仮の景色が出ます

- **縦横比**：横長 3:1（例：2400×800px）。スマホの横画面で約1.5画面分の幅になります
- **入れないもの**：道、マス、番号、文字、旗の文字、ロゴ、枠、UI
- 道が画面の中央を左右にくねって通るので、**画面の上下の真ん中あたりは開けた地面（草地など）**にしておく
- 隣の地方となじませるため、**左右の端は特徴の少ない地面や木々**にしておく

## 共通の指示（日本語）

```
ファンタジーRPGのワールドマップの背景画を描いてください。斜め上から見下ろした鳥瞰図で、緻密で色鮮やかな手描き風のデジタルペイント（高品質なモバイルゲームのマップ画面のような画風）。横長 3:1。画面の上下の真ん中あたりは、あとで道を描くための開けた地面にしてください。左右の端は特徴の少ない地面や木々にして、隣の絵となじむようにしてください。道、マス目、番号、文字、ロゴ、枠、UIは一切描かないでください。
```

## 共通の指示（英語：英語の方がうまくいくAI向け）

```
A fantasy RPG world map background, high bird's-eye three-quarter view, richly detailed and vibrant hand-painted digital art in the style of a premium mobile game map screen. Wide 3:1 panorama. Keep a broad open band of ground across the vertical middle of the image (a road will be drawn there later). Keep the far left and right edges simple (plain ground and trees) so it blends with neighboring images. No roads, no paths, no board spaces, no numbers, no text, no logos, no frame, no UI.
```

## 各地方の題材（共通の指示の後に続ける）

### 地方1：はじまりの草原（ステージ1〜10）→ `region1.jpg`

```
明るい昼の草原地方。なだらかな緑の丘、青い川と石の橋、赤い屋根の小さな村と見張り塔、風車、点在する森、遠くに雪をかぶった山並みと青空と白い雲。
```

```
A bright sunny grassland region: rolling green hills, a blue river with a stone bridge, a small village with red roofs and a watchtower, a windmill, scattered woods, distant snow-capped mountains, blue sky with white clouds.
```

### 地方2：森と湖（ステージ11〜20）→ `region2.jpg`

```
深い森と湖の地方。濃い緑の針葉樹の森、きらめく湖と滝、木造の砦、苔むした古い遺跡、森の向こうに青い屋根の城、午後の柔らかい光。
```

```
A deep forest and lake region: dense dark-green conifer forests, a sparkling lake and waterfalls, a wooden fort, mossy ancient ruins, a castle with blue roofs beyond the trees, soft afternoon light.
```

### 地方3：雪山と峡谷（ステージ21〜30）→ `region3.jpg`

```
険しい雪山と峡谷の地方。雪をかぶった岩山、深い峡谷にかかる吊り橋、山腹の石造りの砦、凍った湖、針葉樹、澄んだ冷たい空と夕方の光。
```

```
A rugged snowy mountain and canyon region: snow-covered rocky peaks, a rope bridge over a deep gorge, a stone fortress on the mountainside, a frozen lake, pine trees, a clear cold sky with evening light.
```

### 地方4：荒野と火山（ステージ31〜40）→ `region4.jpg`

```
乾いた荒野と火山の地方。赤茶けた大地と岩山、煙を上げる火山と流れる溶岩の川、崩れた城壁、枯れ木、オレンジ色の夕焼け空。
```

```
A dry wasteland and volcano region: red-brown earth and rocky mesas, a smoking volcano with rivers of glowing lava, crumbling city walls, dead trees, an orange sunset sky.
```

### 地方5：魔王城（ステージ41〜50）→ `region5.jpg`

```
魔王の領地。紫の暗雲と稲妻、黒い岩の大地と紫に光る魔法の川、骸骨の転がる荒れ地、遠くにそびえる禍々しい魔王城、不気味だが美しい色合い。
```

```
The Demon Lord's domain: dark purple storm clouds with lightning, black rocky ground with glowing violet magical rivers, a desolate wasteland with scattered bones, a sinister towering dark castle in the distance, eerie but beautiful colors.
```
