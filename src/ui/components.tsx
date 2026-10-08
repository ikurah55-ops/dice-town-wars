import type { ReactNode } from 'react';
import { CATEGORY_LABEL, describeCard } from '../core/cards';
import type { CardDef, GameData } from '../core/types';
import { CardArt, TypeIcon } from './art';

export function CardView({
  card,
  data,
  stock,
  disabled,
  selected,
  badge,
  onClick,
  compact,
  level,
  cost,
  uses,
}: {
  card: CardDef;
  data: GameData;
  stock?: number;
  disabled?: boolean;
  selected?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
  level?: number; // ストーリーのカードレベル（省略時はLv表示なし）
  cost?: number; // 環境効果込みのコスト
  uses?: number; // 魔法の効果回数
}) {
  const counter = card.category === 'counter';
  return (
    <button
      type="button"
      className={`card cat-${card.category} ${disabled ? 'is-disabled' : ''} ${selected ? 'is-selected' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onClick}
      aria-disabled={disabled}
      aria-label={`${card.name}（${CATEGORY_LABEL[card.category]}）コスト${card.cost}`}
    >
      <div className="card-top">
        <span className="type-icon" title={CATEGORY_LABEL[card.category]}>
          <TypeIcon category={card.category} />
        </span>
        <span className="card-name">{card.name}</span>
        {level !== undefined && card.category !== 'magic' && <span className="card-lv">Lv{level}</span>}
        {card.faces && (
          <span className={`card-faces ${counter ? 'is-counter' : ''}`} title={counter ? '相手の出目で発動' : '自分の出目で発動'}>
            {counter && <span className="faces-label">相手</span>}
            {card.faces.map((f) => (
              <MiniDie key={f} value={f} enemy={counter} />
            ))}
          </span>
        )}
      </div>
      {/* イラストを最大限広く見せ、コスト・在庫・効果文は絵の上に重ねる */}
      <div className="card-art">
        <CardArt id={card.id} />
        <span className={`cost ${cost !== undefined && cost !== card.cost ? 'cost-changed' : ''}`} aria-hidden="true">
          {cost ?? card.cost}
        </span>
        {stock !== undefined && <span className={`stock ${stock === 0 ? 'stock-out' : ''}`}>残{stock}</span>}
        {badge && <span className="card-badge">{badge}</span>}
        <div className="card-text">{describeCard(card, data, level ?? 1, uses)}</div>
      </div>
    </button>
  );
}

export function MiniDie({ value, enemy }: { value: number; enemy?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`mini-die ${enemy ? 'mini-die-enemy' : ''}`} aria-label={`${value}`}>
      <rect x="4" y="4" width="92" height="92" rx="18" />
      {PIP_LAYOUT[value].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={value === 1 ? 16 : 11} className={value === 1 ? 'pip-one' : undefined} />
      ))}
    </svg>
  );
}

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

export function Die({ value, rolling, size = 64, enemy }: { value: number | null; rolling?: boolean; size?: number; enemy?: boolean }) {
  return (
    <div className={`die ${rolling ? 'is-rolling' : ''} ${enemy ? 'die-enemy' : ''}`} style={{ width: size, height: size }}>
      {value === null ? (
        <span className="die-q">?</span>
      ) : (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label={`出目${value}`}>
          {PIP_LAYOUT[value].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={value === 1 ? 13 : 10} className="die-pip" />
          ))}
        </svg>
      )}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-title">{title}</div>
        {children}
        {onClose && (
          <button className="btn btn-ghost modal-close" onClick={onClose}>
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="header">
      {onBack ? (
        <button className="btn-back" onClick={onBack} aria-label="戻る">
          ‹
        </button>
      ) : (
        <span style={{ width: 40 }} />
      )}
      <h1>{title}</h1>
      <span style={{ width: 40 }} />
    </div>
  );
}
