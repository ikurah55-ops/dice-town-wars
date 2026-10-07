import { bossMaxHp } from '../../core/data';
import type { BossDef, GameData } from '../../core/types';
import { CardView, Header } from '../components';

export function StageSelect({ data, onBack, onSelect }: { data: GameData; onBack: () => void; onSelect: (b: BossDef) => void }) {
  return (
    <div className="screen">
      <Header title="ステージ選択" onBack={onBack} />
      <div className="scroll">
        {data.bosses.map((b) => (
          <div key={b.id} className="boss-card">
            <div className="boss-info">
              <div className="boss-stage">{b.title}</div>
              <div className="boss-name">{b.name}</div>
              <p className="boss-desc">{b.description}</p>
              <div className="boss-stats">
                <span>❤ HP {bossMaxHp(data.config, b.stage)}</span>
                <span>🎲 {data.dice[b.dice].name}</span>
              </div>
              <button className="btn btn-primary btn-big" onClick={() => onSelect(b)}>
                挑戦する
              </button>
            </div>
            <div className="boss-loadout">
              <div className="section-label">ボスの持ち込みカード</div>
              <div className="card-grid cols-4">
                {b.loadout.map((id) => (
                  <CardView key={id} card={data.cards[id]} data={data} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
