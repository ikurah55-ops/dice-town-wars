// チュートリアルの文章（既読は settings.ts の hasSeen / markSeen で管理）
import type { GameConfig } from '../core/types';
import type { StoryConfig } from '../core/story';
import type { TutStep } from './Tutorial';

export const TUT = {
  battleBasics: 'battle_basics',
  battleBuy: 'battle_buy',
  upgradeIntro: 'upgrade_intro',
  upgradeScreen: 'upgrade_screen',
  newCard: 'new_card',
  magic: 'magic_card',
  envIntro: 'env_intro',
  env: (id: string) => `env_${id}`,
} as const;

export function battleBasicsSteps(cfg: GameConfig): TutStep[] {
  return [
    { title: 'ステージ1へようこそ！', text: 'ここでは戦い方を説明します。画面をタップして進めてください。' },
    { title: '相手の情報', text: '上の帯が相手です。HPを0にすれば勝ち。右側にコインと発動中の魔法が表示されます。', target: '.bar-enemy' },
    { title: '盤面', text: '盤面は出目1〜6の列に分かれています。カードは発動する出目の列に置かれます（上が相手、下があなた）。', target: '.board' },
    { title: '出目の確認', text: '下のサイコロをタップすると、その目が出たら何が起きるかを確認できます。', target: '.dice-row' },
    { title: 'あなたの情報', text: '下の帯があなたです。HPとコイン、発動中の魔法が表示されます。', target: '.bar-me' },
    { title: 'サイコロを振る', text: '「サイコロを振る」で手番が始まります。出た目と同じ数字の自分のカードが発動します。', target: '.side-actions' },
    {
      title: '勝ち方',
      text: `振ったあとは購入フェーズです。コインでカードを買って街を育て、相手のHPを0にしましょう。${cfg.longBattle.afterTurn}ターンを超えると毎ターン両者がダメージを受けます。`,
    },
  ];
}

export function battleBuySteps(): TutStep[] {
  return [
    {
      title: '購入フェーズ',
      text: 'コインがあるだけ何枚でもカードを買えます。経済（緑）はコイン、攻撃（赤）はダメージ、カウンター（青）は相手の出目で発動します。',
      target: '.market-grid',
    },
    { title: '手番終了', text: '買い終わったら「手番終了」。同じカードを複数持つと効果も枚数倍になります。', target: '.market-head .btn-primary' },
  ];
}

export function upgradeIntroSteps(): TutStep[] {
  return [
    { title: 'ステージクリア！', text: 'クリアすると経験値がもらえます。サブミッション（★）を達成すると追加でもらえます。' },
    { title: '強化しよう', text: '「強化」から、経験値でカードのレベルや最大HPを上げられます。', target: '.upgrade-btn' },
  ];
}

export function upgradeScreenSteps(cfg: GameConfig, story: StoryConfig): TutStep[] {
  return [
    { title: '経験値', text: 'ここに今の経験値が表示されます。', target: '.exp-box' },
    {
      title: 'レベルアップ',
      text: `施設カードはLv${cfg.maxCardLevel}まで上げられ、1レベルごとに効果量が${Math.round(cfg.levelBonusPerLevel * 100)}%増えます。基本カードも強化できます。`,
      target: '.up-card',
    },
    { title: '最大HP', text: `最大HPを${story.hpUpgrade.amount}ずつ増やせます（最大${story.hpUpgrade.maxCount}回）。`, target: '.hp-box' },
  ];
}

export function newCardSteps(): TutStep[] {
  return [
    { title: '新しいカード', text: '新しいカードを解放できるようになりました！' },
    { title: 'カードの解放', text: '「強化」画面で経験値を払って解放すると、ビルドで持ち込めるようになります。', target: '.upgrade-btn' },
  ];
}

export function magicSteps(story: StoryConfig, cfg: GameConfig): TutStep[] {
  return [
    { title: '魔法カード', text: '魔法カード（紫）を解放できるようになりました！' },
    { title: '魔法の使い方', text: `魔法は買ったその手番から効果が出て、${cfg.magicUses}回分続く使い切りのカードです。発動中の魔法は上下の帯に表示されます。` },
    {
      title: '魔法のルール',
      text: `持ち込めるのは${story.maxMagic}枚まで。同じ魔法は効果中に重ねて買えず、効果が切れた後も${cfg.magicCooldown}ターンは買い直せません。`,
      target: '.upgrade-btn',
    },
  ];
}

export function envIntroSteps(): TutStep[] {
  return [
    { title: '環境効果', text: 'この戦闘には「環境効果」があります。戦闘ごとに特別なルールが付き、あなたと相手の両方に同じように効きます。' },
    { title: 'いつでも確認', text: '戦闘中は、上の帯の紫のボタンで内容を確認できます。背景の色も環境効果ごとに変わります。' },
  ];
}
