// ストーリーのセーブデータを端末内（localStorage）に保存する
import { migrateSave, newSave, storyConfig, type StorySave } from '../core/story';
import type { GameData } from '../core/types';

const KEY = 'dice-town-story';

export function loadStory(data: GameData): StorySave {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrateSave(JSON.parse(raw), data, storyConfig);
  } catch {
    /* 読めなければ新規 */
  }
  return newSave(data, storyConfig);
}

export function saveStory(save: StorySave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function resetStory(data: GameData): StorySave {
  const s = newSave(data, storyConfig);
  saveStory(s);
  try {
    localStorage.removeItem('dice-town-story-build');
  } catch {
    /* 無視 */
  }
  return s;
}
