# カードイラスト生成プロンプト

麦畑・兵舎の参考画像と同じ雰囲気（写実寄りのデジタルペイント、中世ファンタジー、ドラマチックな空と光）で、残りのカードのイラストを作るためのプロンプト集です。

## 使い方

1. 画像生成AI（ChatGPT、Gemini、Midjourney など）に、下の「共通スタイル」と各カードの「題材」をつなげて入力する
2. できた画像を `src/assets/cards/<ファイル名>` に保存する（jpg / png / webp）
3. GitHub に push すると、公開版にも自動で反映される。画像がないカードは今のSVGイラストのまま

- **縦横比**：縦長 5:6（例：1000×1200px）。カード上では中央付近が楕円に切り抜かれるので、主役は画面の中央に置く
- **ファイルサイズ**：1枚 300KB 以下が目安（大きすぎると起動が遅くなる）
- 文字・枠・ロゴは入れない（カードの枠と名前はゲーム側で描く）

## 共通スタイル（すべてのプロンプトの先頭に付ける）

```
Highly detailed digital painting, realistic medieval fantasy, painterly realism like a premium trading card game illustration, dramatic sky with volumetric clouds, cinematic golden-hour lighting, rich textures, warm and saturated colors, depth of field, the main subject centered, vertical composition 5:6, no text, no letters, no border, no frame, no watermark.
```

## 題材（共通スタイルの後に続ける）

### 経済カード

| ファイル名 | カード | 題材 |
|---|---|---|
| `wheat.jpg` | 麦畑 | （作成済み） |
| `trade.jpg` | 交易所 | A bustling medieval market stall at dusk, red and white striped awning, wooden crates of fruit and spices, a merchant's scale, a pile of gleaming gold coins on the counter, warm lanterns, cobblestone town square in the background. |
| `orchard.jpg` | 果樹園 | A sunlit apple orchard on rolling hills, rows of trees heavy with shiny red apples, a wicker basket full of apples and a wooden ladder in the foreground, sunbeams through the leaves, distant village. |
| `mill.jpg` | 製粉所 | A tall stone-and-timber windmill on a hill at sunset, large canvas sails, flour sacks and a cart at its base, golden wheat fields around, birds in the orange sky. |
| `spoils.jpg` | 戦利品市場 | An open treasure chest overflowing with gold coins in a dim tent, a jeweled crown, rubies and sapphires, a sword stuck into the pile of coins, captured enemy banners, warm glowing light. |

### 攻撃カード

| ファイル名 | カード | 題材 |
|---|---|---|
| `barracks.jpg` | 兵舎 | （作成済み） |
| `catapult.jpg` | 投石機 | A wooden siege catapult launching a flaming boulder toward a distant burning castle, crimson sky, sparks and embers, soldiers silhouetted at its base. |
| `archers.jpg` | 弓兵隊 | A line of medieval archers on a ridge drawing longbows, a volley of arrows arcing across a stormy sunset sky, red tabards, banners in the wind. |
| `cannon.jpg` | 大砲台 | A massive bronze-banded iron cannon on a stone bastion firing, huge muzzle flash and billowing smoke, a cannonball streaking away, gunners shielding their faces. |
| `spearmen.jpg` | 槍兵隊 | A disciplined phalanx of medieval spearmen in blue tabards holding a wall of kite shields, long spears angled forward, golden-hour light, dusty battlefield, banners behind them. |
| `knights.jpg` | 騎士団 | A charge of heavily armored knights on horseback with lowered lances and red pennants, thundering across a field at sunset, dust clouds, castle on a distant hill. |

### カウンターカード

| ファイル名 | カード | 題材 |
|---|---|---|
| `watchtower.jpg` | 見張り塔 | A tall stone watchtower at night with a blazing signal fire on top, beams of light sweeping the dark forest, a sentry with a spear, starry sky and full moon. |
| `infirmary.jpg` | 救護所 | A white canvas field hospital tent with a red cross banner at dawn, warm lamplight glowing from inside, a healer with bandages and herbs, soft green healing light. |
| `toll.jpg` | 関所 | A fortified stone gatehouse with a raised portcullis, a red and white striped barrier across the road, guards collecting coins at a small toll booth, torches, evening sky. |
| `counter_battery.jpg` | 反撃砲台 | A castle wall cannon firing back at an incoming fireball, a glowing blue magical shield deflecting the attack, night sky, sparks and smoke. |

### 魔法カード

| ファイル名 | カード | 題材 |
|---|---|---|
| `seal.jpg` | 封印の札 | A glowing paper talisman with a red seal sigil floating in front of a purple magic circle of runes, heavy iron chains wrapping around it, dark mystical background, sparks of violet light. |
| `thieves.jpg` | 盗賊団 | A hooded thief with glowing eyes crouching on a rooftop under a huge full moon, holding a dagger and a sack spilling gold coins, night town below. |
| `tax.jpg` | 徴税令 | A royal decree scroll with a red wax seal and a golden crown emblem on a velvet table, stacks of gold coins, a quill and inkpot, candlelight. |
| `silence.jpg` | 沈黙の呪い | A cursed ivory die wrapped in purple mist and glowing violet cracks, ghostly eyes in the darkness, an eerie magic sigil crossing it out. |
| `harvest.jpg` | 収穫祭 | A night harvest festival in a village square, strings of glowing lanterns, a bonfire, an overflowing basket of pumpkins, apples, grapes and wheat sheaves, villagers celebrating. |
| `battering_ram.jpg` | 破城槌 | A covered wooden battering ram with an iron ram's-head tip smashing into a castle gate, splinters and stone debris flying, dust, soldiers pushing it, stormy sky. |
| `mercenary.jpg` | 傭兵契約 | A battle-scarred mercenary knight in dark armor with a red plume, two crossed greatswords behind him, a signed contract with a blood-red seal and a bag of gold on a table, embers in the air. |
| `goddess.jpg` | 女神の微笑み | A radiant goddess with golden hair, a halo and white feathered wings, gently smiling, divine light rays, two glowing dice floating in her hands, heavenly clouds. |
| `war_horn.jpg` | 戦の角笛 | A huge ivory war horn with gold bands being blown on a hill, visible shockwaves of sound, an army with spears and banners below, blood-red sunset sky. |
| `holy_spring.jpg` | 聖なる泉 | A sacred marble fountain in a moss-covered grotto, glowing crystal-clear water, a shaft of holy light from above, floating sparkles, white lilies. |
