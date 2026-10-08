import { useState } from 'react';
import {
  availableCards,
  cardLevel,
  hpUp,
  hpUpCost,
  levelUp,
  levelUpCost,
  lockedCards,
  playerMaxHp,
  storyConfig as cfg,
  unlockableCards,
  unlockCard,
  type StorySave,
} from '../../core/story';
import type { CardDef, GameData } from '../../core/types';
import { CardView, Header } from '../components';

/** 経験値でカードの解放・レベルアップ・最大HPの強化を行う */
export function Upgrade({ data, save, onChange, onBack }: { data: GameData; save: StorySave; onChange: (s: StorySave) => void; onBack: () => void }) {
  const [flash, setFlash] = useState<{ key: string; text: string } | null>(null);
  const unlockable = unlockableCards(data, save);
  const levelable = [...data.config.marketBaseCards.map((id) => data.cards[id]), ...availableCards(data, save)].filter((c) => c.category !== 'magic');
  const locked = lockedCards(data, save).sort((a, b) => a.story!.unlockAfterStage - b.story!.unlockAfterStage);
  const hpCost = hpUpCost(cfg, save);

  const act = (key: string, text: string, fn: () => StorySave) => {
    try {
      onChange(fn());
      setFlash({ key, text });
      setTimeout(() => setFlash((f) => (f?.key === key ? null : f)), 900);
    } catch {
      /* 経験値不足などはボタンが押せないので通常は起きない */
    }
  };

  const UpCard = ({ card, cost, label, onBuy, extra }: { card: CardDef; cost: number | null; label: string; onBuy?: () => void; extra?: string }) => (
    <div className={`up-card ${flash?.key === card.id ? 'just-upgraded' : ''}`}>
      <CardView card={card} data={data} level={card.category !== 'magic' ? cardLevel(save, card.id) : undefined} badge={extra} />
      {cost === null ? (
        <div className="up-max">{label}</div>
      ) : (
        <button className="btn btn-primary btn-small up-buy" disabled={save.exp < cost} onClick={onBuy}>
          {label}（経験値{cost}）
        </button>
      )}
      {flash?.key === card.id && <span className="up-pop">{flash.text}</span>}
    </div>
  );

  return (
    <div className="screen build-screen upgrade-screen">
      <div className="build-side">
        <Header title="強化" onBack={onBack} />
        <div className="exp-box">
          <span>所持経験値</span>
          <b>{save.exp}</b>
        </div>
        <div className={`hp-box ${flash?.key === 'hp' ? 'just-upgraded' : ''}`}>
          <div className="section-label">最大HP</div>
          <div className="hp-now">
            ❤ {playerMaxHp(cfg, save)}
            <small>
              （強化 {save.hpUps}/{cfg.hpUpgrade.maxCount}回）
            </small>
          </div>
          {hpCost === null ? (
            <div className="up-max">最大まで強化済み</div>
          ) : (
            <button className="btn btn-primary btn-small" disabled={save.exp < hpCost} onClick={() => act('hp', `HP+${cfg.hpUpgrade.amount}`, () => hpUp(cfg, save))}>
              +{cfg.hpUpgrade.amount}（経験値{hpCost}）
            </button>
          )}
          {flash?.key === 'hp' && <span className="up-pop">{flash.text}</span>}
        </div>
        <p className="hint up-hint">経験値はステージのクリア・サブミッション・敗北でもらえます。</p>
      </div>

      <div className="scroll build-cards">
        <div className="section-label">解放できるカード</div>
        {unlockable.length === 0 ? (
          <p className="hint up-empty">今は解放できるカードはありません。</p>
        ) : (
          <div className="card-grid">
            {unlockable.map((c) => (
              <UpCard key={c.id} card={c} cost={c.story!.unlockExp} label="解放" onBuy={() => act(c.id, '解放！', () => unlockCard(data, save, c.id))} extra="NEW" />
            ))}
          </div>
        )}

        <div className="section-label">レベルアップ（効果量 +{Math.round(data.config.levelBonusPerLevel * 100)}%／Lv）</div>
        <div className="card-grid">
          {levelable.map((c) => {
            const cost = levelUpCost(data, save, c.id);
            return (
              <UpCard
                key={c.id}
                card={c}
                cost={cost}
                label={cost === null ? 'Lv最大' : `Lv${cardLevel(save, c.id) + 1}へ`}
                onBuy={() => act(c.id, `Lv${cardLevel(save, c.id) + 1}！`, () => levelUp(data, save, c.id))}
              />
            );
          })}
        </div>

        {locked.length > 0 && (
          <>
            <div className="section-label">まだ解放できないカード</div>
            <div className="card-grid">
              {locked.map((c) => (
                <div key={c.id} className="card-locked">
                  <CardView card={c} data={data} disabled badge={`🔒 ステージ${c.story!.unlockAfterStage}クリア後`} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
