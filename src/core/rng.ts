// シード付き乱数（mulberry32）。状態は数値1つなので BattleState に保存できる。

export function nextRandom(seedState: number): [number, number] {
  let t = (seedState + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** 独立した乱数関数を作る（AIやシミュレーション用） */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    const [v, n] = nextRandom(s);
    s = n;
    return v;
  };
}
