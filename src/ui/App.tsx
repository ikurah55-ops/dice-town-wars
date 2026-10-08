import { useEffect, useState } from 'react';
import { DEFAULT_AI, type AiProfile } from '../core/ai';
import { bossMaxHp, defaultData, loadoutCandidates, validateLoadout } from '../core/data';
import {
  availableCards,
  bossCombatant,
  cardLevel,
  highestCleared,
  isUnlocked,
  loadoutSlots,
  playerCombatant,
  recordResult,
  stageFor,
  stageLabel,
  storyConfig as cfg,
  unlockableCards,
  validateStoryLoadout,
  type ExpGain,
  type StageDef,
  type StorySave,
} from '../core/story';
import type { BattleState, BossDef, CardDef, EnvironmentDef } from '../core/types';
import { ArtDefs } from './art';
import { sfx, unlockAudio, useBgm } from './audio';
import { Options } from './screens/Options';
import { aiWithLevel, hasSeen, markSeen, resetTutorials } from './settings';
import { Tutorial, type TutStep } from './Tutorial';
import { magicSteps, newCardSteps, TUT, upgradeIntroSteps, upgradeScreenSteps } from './tutorials';
import { Battle } from './screens/Battle';
import { Build, type BuildResult } from './screens/Build';
import { Result } from './screens/Result';
import { StageSelect } from './screens/StageSelect';
import { StoryMap } from './screens/StoryMap';
import { StoryResult } from './screens/StoryResult';
import { Title } from './screens/Title';
import { Upgrade } from './screens/Upgrade';
import { loadStory, resetStory, saveStory } from './storyStorage';

type Screen =
  | { name: 'title' }
  // 練習モード
  | { name: 'stage' }
  | { name: 'build'; boss: BossDef }
  | { name: 'battle'; boss: BossDef; build: BuildResult; key: number; env: EnvironmentDef | null; ai: AiProfile }
  | { name: 'result'; boss: BossDef; build: BuildResult; state: BattleState }
  // ストーリーモード
  | { name: 'map' }
  | { name: 'storyBuild'; stage: number }
  | { name: 'storyBattle'; stage: number; build: BuildResult; key: number; ai: AiProfile }
  | {
      name: 'storyResult';
      stage: StageDef;
      build: BuildResult;
      state: BattleState;
      gains: ExpGain[];
      total: number;
      newlyUnlockable: CardDef[];
      slotsUp: number | null;
    }
  | { name: 'upgrade'; back: Screen };

const STORY_BUILD_KEY = 'dice-town-story-build';
const PRACTICE_BUILD_KEY = 'dice-town-last-build';

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const data = defaultData;
  const [save, setSave] = useState<StorySave>(() => loadStory(data));
  const [justOpened, setJustOpened] = useState<number | null>(null);
  const [options, setOptions] = useState(false);
  const [, setTutTick] = useState(0); // チュートリアルを閉じたら再描画
  const inBattle = screen.name === 'battle' || screen.name === 'storyBattle';
  useBgm(inBattle ? 'battle' : 'menu');

  // 最初のタップで音を有効にし、ボタンには軽いクリック音
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      const t = e.target as HTMLElement;
      if (t.closest('button') && !t.closest('.tut')) sfx('click');
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  /** 練習モードの戦闘開始：環境効果（なし／ランダム／指定）とAIの強さを決める */
  const startPractice = (boss: BossDef, build: BuildResult) => {
    const env =
      build.env === 'random'
        ? data.environmentList[Math.floor(Math.random() * data.environmentList.length)]
        : build.env && build.env !== 'none'
          ? data.environments[build.env] ?? null
          : null;
    setScreen({ name: 'battle', boss, build, key: Date.now(), env, ai: aiWithLevel({ weights: boss.weights, randomness: boss.randomness }) });
  };
  const doneTut = (id: string) => {
    markSeen(id);
    setTutTick((n) => n + 1);
  };

  // マップで出すチュートリアル（1つずつ）
  let mapTut: { id: string; steps: TutStep[] } | null = null;
  if (screen.name === 'map') {
    const unl = unlockableCards(data, save);
    if (highestCleared(save) >= 1 && !hasSeen(TUT.upgradeIntro)) mapTut = { id: TUT.upgradeIntro, steps: upgradeIntroSteps() };
    else if (unl.some((c) => c.category !== 'magic') && !hasSeen(TUT.newCard)) mapTut = { id: TUT.newCard, steps: newCardSteps() };
    else if (unl.some((c) => c.category === 'magic') && !hasSeen(TUT.magic)) mapTut = { id: TUT.magic, steps: magicSteps(cfg, data.config) };
  }

  // 進行は変わるたびに端末へ保存
  useEffect(() => {
    saveStory(save);
  }, [save]);

  const storyBuild = (stage: number) => {
    setJustOpened(null);
    setScreen({ name: 'storyBuild', stage });
  };

  return (
    <div className="app">
      <ArtDefs />
      <div className="rotate-hint" role="alert">
        <div className="rotate-icon">📱</div>
        <p>スマホを横向きにして遊んでください</p>
      </div>

      {screen.name === 'title' && (
        <Title onStory={() => setScreen({ name: 'map' })} onPractice={() => setScreen({ name: 'stage' })} onOptions={() => setOptions(true)} storyProgress={highestCleared(save)} />
      )}

      {/* ---------- 練習モード（全カード使用可・Lv1・HP180固定） ---------- */}
      {screen.name === 'stage' && (
        <StageSelect data={data} onBack={() => setScreen({ name: 'title' })} onSelect={(boss) => setScreen({ name: 'build', boss })} />
      )}
      {screen.name === 'build' && (
        <Build
          data={data}
          vsLabel={`練習　VS ${screen.boss.name}`}
          candidates={loadoutCandidates(data)}
          slots={data.config.loadout.cards}
          maxMagic={data.config.loadout.maxMagic}
          envChoice
          storageKey={PRACTICE_BUILD_KEY}
          validate={(ids) => validateLoadout(data, ids)}
          onBack={() => setScreen({ name: 'stage' })}
          onStart={(build) => startPractice(screen.boss, build)}
        />
      )}
      {screen.name === 'battle' && (
        <Battle
          key={screen.key}
          data={data}
          player={{ name: 'あなた', maxHp: data.config.playerMaxHp, dice: screen.build.dice, loadout: screen.build.loadout }}
          cpu={{ name: screen.boss.name, maxHp: bossMaxHp(data.config, screen.boss.stage), dice: screen.boss.dice, loadout: screen.boss.loadout }}
          ai={screen.ai}
          environment={screen.env}
          onOptions={() => setOptions(true)}
          onRetire={() => setScreen({ name: 'build', boss: screen.boss })}
          onFinish={(state) => setScreen({ name: 'result', boss: screen.boss, build: screen.build, state })}
        />
      )}
      {screen.name === 'result' && (
        <Result
          state={screen.state}
          boss={screen.boss}
          onRetry={() => startPractice(screen.boss, screen.build)}
          onRebuild={() => setScreen({ name: 'build', boss: screen.boss })}
          onTitle={() => setScreen({ name: 'title' })}
        />
      )}

      {/* ---------- ストーリーモード ---------- */}
      {screen.name === 'map' && (
        <StoryMap
          data={data}
          save={save}
          justOpened={justOpened}
          onBack={() => setScreen({ name: 'title' })}
          onPlay={storyBuild}
          onUpgrade={() => setScreen({ name: 'upgrade', back: { name: 'map' } })}
          onOptions={() => setOptions(true)}
        />
      )}
      {mapTut && <Tutorial key={mapTut.id} steps={mapTut.steps} onDone={() => doneTut(mapTut!.id)} />}
      {screen.name === 'storyBuild' &&
        (() => {
          const st = stageFor(data, cfg, save, screen.stage);
          const levels: Record<string, number> = {};
          for (const c of data.cardList) levels[c.id] = cardLevel(save, c.id);
          return (
            <Build
              data={data}
              vsLabel={stageLabel(st)}
              candidates={availableCards(data, save)}
              locked={data.cardList
                .filter((c) => !c.base && !isUnlocked(c, save))
                .map((c) => ({
                  card: c,
                  note: highestCleared(save) >= c.story!.unlockAfterStage ? '強化画面で解放' : `ステージ${c.story!.unlockAfterStage}クリア後`,
                }))}
              slots={loadoutSlots(cfg, save)}
              maxMagic={cfg.maxMagic}
              levels={levels}
              environment={st.envId ? data.environments[st.envId] : null}
              storageKey={STORY_BUILD_KEY}
              validate={(ids) => validateStoryLoadout(data, cfg, save, ids)}
              onBack={() => setScreen({ name: 'map' })}
              onStart={(build) => setScreen({ name: 'storyBattle', stage: screen.stage, build, key: Date.now(), ai: aiWithLevel(DEFAULT_AI) })}
            />
          );
        })()}
      {screen.name === 'storyBattle' &&
        (() => {
          const st = stageFor(data, cfg, save, screen.stage);
          return (
            <Battle
              key={screen.key}
              data={data}
              player={playerCombatant(data, cfg, save, screen.build.loadout, screen.build.dice)}
              cpu={bossCombatant(data, st)}
              ai={screen.ai}
              environment={st.envId ? data.environments[st.envId] : null}
              tutorial={screen.stage === 1}
              onOptions={() => setOptions(true)}
              onRetire={() => storyBuild(screen.stage)}
              onFinish={(state) => {
                const before = save;
                const r = recordResult(cfg, save, screen.stage, {
                  won: state.winner === 0,
                  turns: state.turn,
                  hpLeft: Math.max(0, state.players[0].hp),
                  maxHp: state.players[0].maxHp,
                });
                // 初クリアで新しく解放時期が来たカード・増えた枠
                const newlyUnlockable = r.firstClear
                  ? data.cardList.filter((c) => !c.base && c.story && c.story.unlockAfterStage === screen.stage)
                  : [];
                const slotsBefore = loadoutSlots(cfg, before);
                const slotsAfter = loadoutSlots(cfg, r.save);
                setSave(r.save);
                setJustOpened(r.firstClear && screen.stage < cfg.stageCount ? screen.stage + 1 : null);
                setScreen({
                  name: 'storyResult',
                  stage: st,
                  build: screen.build,
                  state,
                  gains: r.gains,
                  total: r.total,
                  newlyUnlockable,
                  slotsUp: slotsAfter > slotsBefore ? slotsAfter : null,
                });
              }}
            />
          );
        })()}
      {screen.name === 'storyResult' && (
        <StoryResult
          state={screen.state}
          stage={screen.stage}
          gains={screen.gains}
          total={screen.total}
          expNow={save.exp}
          newlyUnlockable={screen.newlyUnlockable}
          slotsUp={screen.slotsUp}
          onMap={() => setScreen({ name: 'map' })}
          onRetry={() => storyBuild(screen.stage.stage)}
          onUpgrade={() => setScreen({ name: 'upgrade', back: { name: 'map' } })}
        />
      )}
      {screen.name === 'upgrade' && <Upgrade data={data} save={save} onChange={setSave} onBack={() => setScreen(screen.back)} />}
      {screen.name === 'upgrade' && !hasSeen(TUT.upgradeScreen) && (
        <Tutorial steps={upgradeScreenSteps(data.config, cfg)} onDone={() => doneTut(TUT.upgradeScreen)} />
      )}

      {options && (
        <Options
          onClose={() => setOptions(false)}
          onResetStory={() => {
            setSave(resetStory(data));
            resetTutorials();
            setJustOpened(null);
          }}
        />
      )}
    </div>
  );
}
