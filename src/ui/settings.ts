// オプション設定（端末内に保存）とチュートリアルの既読管理
import { useSyncExternalStore } from 'react';
import { applyAiLevel, type AiLevelDef, type AiProfile } from '../core/ai';
import aiLevelsJson from '../data/ai_levels.json';

export type AiLevelId = 'easy' | 'normal' | 'hard';
export const AI_LEVELS = aiLevelsJson as Record<AiLevelId, AiLevelDef>;

export interface Settings {
  seVolume: number; // 0〜1
  bgmVolume: number; // 0〜1
  battleFx: boolean; // バトル演出
  aiLevel: AiLevelId;
}

const KEY = 'dice-town-settings';
const DEFAULTS: Settings = { seVolume: 0.7, bgmVolume: 0.4, battleFx: true, aiLevel: 'normal' };

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
      if (!AI_LEVELS[s.aiLevel]) s.aiLevel = 'normal';
      return s;
    }
  } catch {
    /* 既定値 */
  }
  return { ...DEFAULTS };
}

let current = read();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* 保存できなくても動作は続ける */
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** ボスの重みに、設定中のAIの強さを掛け合わせる */
export function aiWithLevel(base: AiProfile): AiProfile {
  return applyAiLevel(base, AI_LEVELS[current.aiLevel]);
}

// ---------- チュートリアル・初見の説明の既読 ----------

const TUT_KEY = 'dice-town-tutorials';

function readSeen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

let seen = readSeen();

export function hasSeen(id: string): boolean {
  return !!seen[id];
}

export function markSeen(id: string) {
  seen = { ...seen, [id]: true };
  try {
    localStorage.setItem(TUT_KEY, JSON.stringify(seen));
  } catch {
    /* 無視 */
  }
}

/** ストーリーのリセット時に、ストーリー関連のチュートリアルも最初から見られるようにする */
export function resetTutorials() {
  seen = {};
  try {
    localStorage.removeItem(TUT_KEY);
  } catch {
    /* 無視 */
  }
}
