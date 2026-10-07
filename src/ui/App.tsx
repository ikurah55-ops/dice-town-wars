import { useState } from 'react';
import { defaultData } from '../core/data';
import type { BattleState, BossDef } from '../core/types';
import { ArtDefs } from './art';
import { Battle } from './screens/Battle';
import { Build, type BuildResult } from './screens/Build';
import { Result } from './screens/Result';
import { StageSelect } from './screens/StageSelect';
import { Title } from './screens/Title';

type Screen =
  | { name: 'title' }
  | { name: 'stage' }
  | { name: 'build'; boss: BossDef }
  | { name: 'battle'; boss: BossDef; build: BuildResult; key: number }
  | { name: 'result'; boss: BossDef; build: BuildResult; state: BattleState };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const data = defaultData;

  return (
    <div className="app">
      <ArtDefs />
      <div className="rotate-hint" role="alert">
        <div className="rotate-icon">📱</div>
        <p>スマホを横向きにして遊んでください</p>
      </div>
      {screen.name === 'title' && <Title onStart={() => setScreen({ name: 'stage' })} />}
      {screen.name === 'stage' && (
        <StageSelect
          data={data}
          onBack={() => setScreen({ name: 'title' })}
          onSelect={(boss) => setScreen({ name: 'build', boss })}
        />
      )}
      {screen.name === 'build' && (
        <Build
          data={data}
          boss={screen.boss}
          onBack={() => setScreen({ name: 'stage' })}
          onStart={(build) => setScreen({ name: 'battle', boss: screen.boss, build, key: Date.now() })}
        />
      )}
      {screen.name === 'battle' && (
        <Battle
          key={screen.key}
          data={data}
          boss={screen.boss}
          build={screen.build}
          onRetire={() => setScreen({ name: 'build', boss: screen.boss })}
          onFinish={(state) => setScreen({ name: 'result', boss: screen.boss, build: screen.build, state })}
        />
      )}
      {screen.name === 'result' && (
        <Result
          state={screen.state}
          boss={screen.boss}
          onRetry={() => setScreen({ name: 'battle', boss: screen.boss, build: screen.build, key: Date.now() })}
          onRebuild={() => setScreen({ name: 'build', boss: screen.boss })}
          onTitle={() => setScreen({ name: 'title' })}
        />
      )}
    </div>
  );
}
