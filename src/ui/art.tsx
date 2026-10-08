// カードのイラスト（インラインSVG）。viewBox は 120×80。
// グラデーション等は <ArtDefs /> にまとめて定義し、各イラストは url(#dt-xxx) で参照する。
import type { ReactNode } from 'react';
import type { CardCategory } from '../core/types';

// ---------- 共通定義 ----------

const V = (id: string, stops: [number, string, number?][]) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" key={id}>
    {stops.map(([o, c, op], i) => (
      <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />
    ))}
  </linearGradient>
);
const D = (id: string, stops: [number, string][]) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" key={id}>
    {stops.map(([o, c], i) => (
      <stop key={i} offset={o} stopColor={c} />
    ))}
  </linearGradient>
);
const R = (id: string, stops: [number, string, number][]) => (
  <radialGradient id={id} key={id}>
    {stops.map(([o, c, op], i) => (
      <stop key={i} offset={o} stopColor={c} stopOpacity={op} />
    ))}
  </radialGradient>
);
const glow = (id: string, c: string) => R(id, [[0, c, 0.95], [0.35, c, 0.45], [1, c, 0]]);

/** アプリに1回だけ置く共通定義 */
export function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {V('dt-sky-gold', [[0, '#c4502e'], [0.5, '#f2a548'], [1, '#fde3a0']])}
        {V('dt-sky-day', [[0, '#2f86d0'], [1, '#bfe8f8']])}
        {V('dt-sky-dusk', [[0, '#1c1436'], [0.55, '#a8403a'], [1, '#f5a84e']])}
        {V('dt-sky-night', [[0, '#04071a'], [1, '#22306a']])}
        {V('dt-sky-war', [[0, '#1e0606'], [0.55, '#962a16'], [1, '#f08a3a']])}
        {V('dt-sky-storm', [[0, '#14121e'], [0.6, '#4a3a4e'], [1, '#d8784a']])}
        {V('dt-sky-magic', [[0, '#0a0414'], [1, '#3e1866']])}
        {V('dt-sky-holy', [[0, '#fffbe8'], [0.6, '#f6d27a'], [1, '#c8862e']])}
        {V('dt-sky-teal', [[0, '#0c2a3a'], [0.6, '#2f7a80'], [1, '#f2cf8e']])}
        {V('dt-sky-grotto', [[0, '#03141a'], [1, '#0d3a44']])}
        {V('dt-velvet', [[0, '#2a050a'], [1, '#6e1420']])}
        {V('dt-grass', [[0, '#6aa84a'], [1, '#24461c']])}
        {V('dt-field', [[0, '#f6d26a'], [1, '#9a6a1e']])}
        {V('dt-earth', [[0, '#6a4a2c'], [1, '#2a1a0e']])}
        {V('dt-stone', [[0, '#cfc6b4'], [1, '#6e6454']])}
        {V('dt-stone-dark', [[0, '#7e786c'], [1, '#2e2a24']])}
        {V('dt-wood', [[0, '#b77a44'], [1, '#5a3014']])}
        {V('dt-fire', [[0, '#fff6b0'], [0.45, '#ffb02e'], [1, '#e0381a']])}
        {V('dt-water', [[0, '#d8fbff'], [1, '#2a9ad8']])}
        {V('dt-beam', [[0, '#ffffff', 0.55], [1, '#ffffff', 0]])}
        {V('dt-beam-gold', [[0, '#fff2a8', 0.6], [1, '#fff2a8', 0]])}
        {V('dt-parchment', [[0, '#fff8e4'], [1, '#d8bc86']])}
        {V('dt-red-cloth', [[0, '#f0583e'], [1, '#7a1408']])}
        {V('dt-blue-cloth', [[0, '#5aa0ea'], [1, '#183e70']])}
        {V('dt-tent', [[0, '#fffdf6'], [1, '#c4baa6']])}
        {V('dt-ivory', [[0, '#fffaf0'], [1, '#c6a676']])}
        {V('dt-marble', [[0, '#f4f8fa'], [1, '#8ea2ac']])}
        {D('dt-steel', [[0, '#ffffff'], [0.45, '#9aa6b4'], [0.55, '#e8eef4'], [1, '#6a7684']])}
        {D('dt-iron', [[0, '#6e7480'], [0.5, '#2e3138'], [1, '#14161a']])}
        {D('dt-gold', [[0, '#fff3b0'], [0.4, '#f2c94c'], [1, '#a86a12']])}
        {D('dt-gem-red', [[0, '#ffb0a0'], [0.5, '#e0201a'], [1, '#6a0606']])}
        {D('dt-gem-blue', [[0, '#c0f0ff'], [0.5, '#2a8ae0'], [1, '#0a2a6a']])}
        {D('dt-gem-green', [[0, '#c8ffc0'], [0.5, '#2ab04a'], [1, '#064a1a']])}
        {R('dt-apple', [[0, '#ff9a86', 1], [0.6, '#d8281c', 1], [1, '#7a0a06', 1]])}
        {R('dt-pumpkin', [[0, '#ffc060', 1], [0.7, '#e8701a', 1], [1, '#8a3a06', 1]])}
        {R('dt-vig', [[0.55, '#000', 0], [1, '#000', 0.6]])}
        {R('dt-vig-soft', [[0.6, '#5a3000', 0], [1, '#5a3000', 0.35]])}
        {glow('dt-glow-warm', '#fff2b0')}
        {glow('dt-glow-gold', '#ffcf4a')}
        {glow('dt-glow-fire', '#ff7a2a')}
        {glow('dt-glow-purple', '#c890ff')}
        {glow('dt-glow-blue', '#7ad8ff')}
        {glow('dt-glow-green', '#9affb0')}
        {glow('dt-glow-red', '#ff3a3a')}
        {glow('dt-glow-white', '#ffffff')}
      </defs>
    </svg>
  );
}

// ---------- 部品 ----------

function rng(seed: number) {
  // 小さいシードでも偏らないよう散らしてから使う
  let s = (seed * 2654435761) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const Bg = ({ fill }: { fill: string }) => <rect width="120" height="80" fill={`url(#${fill})`} />;
const Vig = ({ soft }: { soft?: boolean }) => <rect width="120" height="80" fill={`url(#dt-vig${soft ? '-soft' : ''})`} />;
const Glow = ({ x, y, r, c }: { x: number; y: number; r: number; c: string }) => <circle cx={x} cy={y} r={r} fill={`url(#dt-glow-${c})`} />;

function Rays({ x, y, n, len, from, to, fill, op = 0.35 }: { x: number; y: number; n: number; len: number; from: number; to: number; fill: string; op?: number }) {
  const out: ReactNode[] = [];
  const step = (to - from) / n;
  for (let i = 0; i < n; i++) {
    const a1 = ((from + step * i) * Math.PI) / 180;
    const a2 = ((from + step * i + step * 0.45) * Math.PI) / 180;
    out.push(
      <path
        key={i}
        d={`M${x} ${y} L${x + len * Math.cos(a1)} ${y + len * Math.sin(a1)} L${x + len * Math.cos(a2)} ${y + len * Math.sin(a2)}Z`}
        fill={fill}
        opacity={op}
      />,
    );
  }
  return <>{out}</>;
}

function Particles({ seed, n, box, r, fill, op = 1 }: { seed: number; n: number; box: [number, number, number, number]; r: [number, number]; fill: string; op?: number }) {
  const rand = rng(seed);
  const [x0, y0, x1, y1] = box;
  return (
    <g fill={fill} opacity={op}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x0 + rand() * (x1 - x0)} cy={y0 + rand() * (y1 - y0)} r={r[0] + rand() * (r[1] - r[0])} />
      ))}
    </g>
  );
}

function Sparkle({ x, y, s = 1, fill = '#fffbe0' }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7 L1.4 -1.4 L7 0 L1.4 1.4 L0 7 L-1.4 1.4 L-7 0 L-1.4 -1.4Z" fill={fill} />;
}

function Coin({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.82} fill="url(#dt-gold)" stroke="#8a5408" strokeWidth="0.7" />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.3} rx={r * 0.3} ry={r * 0.18} fill="#fffbe0" opacity="0.8" />
    </g>
  );
}

function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-5 -3 -4 -9 0 -15 C1 -10 5 -8 3 -3 C5 -5 5 -1 0 0Z" fill="url(#dt-fire)" />
      <path d="M0 -1 C-2 -3 -1.5 -6 0 -8 C1 -6 2 -4 0 -1Z" fill="#fffbe0" />
    </g>
  );
}

function Torch({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Glow x={x} y={y - 6} r={14} c="fire" />
      <rect x={x - 1} y={y} width="2" height="14" fill="#2a160a" />
      <path d={`M${x - 2.5} ${y} H${x + 2.5} L${x + 1.5} ${y + 3} H${x - 1.5}Z`} fill="#4a3a2a" />
      <Flame x={x} y={y + 0.5} s={0.6} />
    </g>
  );
}

function Bird({ x, y, s = 1, c = '#2a140a' }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M-4 0 Q-2 -2.5 0 0 Q2 -2.5 4 0" stroke={c} strokeWidth="0.9" fill="none" />;
}

function Archer({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#0e0810" strokeWidth="1.8" strokeLinecap="round" fill="none">
      <circle cx="0" cy="-17" r="2.4" fill="#0e0810" stroke="none" />
      <path d="M0 -14 L-1 -6 L-4 0 M-1 -6 L3 0" />
      <path d="M0 -12 L7 -16 M0 -12 L-3 -15" />
      <path d="M5 -23 Q13 -17 9 -9" strokeWidth="1.2" />
      <path d="M-3 -15 L9 -19" strokeWidth="0.7" />
    </g>
  );
}

function Pine({ x, y, s = 1, c = '#060a14' }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -18 L5 -9 H3 L7 -2 H-7 L-3 -9 H-5Z M-1 -2 H1 V2 H-1Z" fill={c} />;
}

function Gem({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: 'red' | 'blue' | 'green' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-4 -2 L-2 -4 H2 L4 -2 L0 4Z" fill={`url(#dt-gem-${c})`} stroke="#000" strokeOpacity="0.3" strokeWidth="0.4" />
      <path d="M-2 -4 L-1 -2 H1 L2 -4 M-4 -2 H4" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.4" fill="none" />
    </g>
  );
}

function Sword({ x, y, angle, len = 46 }: { x: number; y: number; angle: number; len?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M-2.6 0 L-2.6 ${-len} L0 ${-len - 6} L2.6 ${-len} L2.6 0Z`} fill="url(#dt-steel)" stroke="#3a4048" strokeWidth="0.5" />
      <line x1="0" y1="-2" x2="0" y2={-len} stroke="#5a6470" strokeWidth="0.6" />
      <path d="M-10 0 Q0 -3 10 0 L10 3 Q0 0 -10 3Z" fill="url(#dt-gold)" stroke="#6a4208" strokeWidth="0.5" />
      <rect x="-1.8" y="3" width="3.6" height="11" fill="#3a1e0e" />
      <circle cx="0" cy="16" r="2.6" fill="url(#dt-gem-red)" />
    </g>
  );
}

function Chain({ x1, y1, x2, y2, n }: { x1: number; y1: number; x2: number; y2: number; n: number }) {
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="4"
            ry={i % 2 ? 1.2 : 2.4}
            transform={`rotate(${a} ${x} ${y})`}
            fill="none"
            stroke="url(#dt-steel)"
            strokeWidth="1.6"
          />
        );
      })}
    </g>
  );
}

// ---------- イラスト ----------

const ART: Record<string, ReactNode> = {
  wheat: (
    <>
      <Bg fill="dt-sky-gold" />
      <Glow x={80} y={48} r={50} c="warm" />
      <Rays x={80} y={48} n={14} len={90} from={180} to={360} fill="#fff6c8" op={0.22} />
      <circle cx="80" cy="48" r="8" fill="#fff8d8" />
      <path d="M0 50 Q20 41 42 47 T86 44 T120 47 V80 H0Z" fill="#a4503a" opacity="0.7" />
      <path d="M0 56 Q30 47 62 54 T120 52 V80 H0Z" fill="#6a321e" />
      <g fill="#3a1a0e">
        <rect x="18" y="45" width="12" height="8" />
        <path d="M16 46 L24 39 L32 46Z" />
        <rect x="33" y="40" width="3" height="10" />
      </g>
      <rect x="21" y="47" width="2.5" height="2.5" fill="#ffd877" />
      <path d="M0 60 Q60 53 120 60 V80 H0Z" fill="url(#dt-field)" />
      <Particles seed={3} n={60} box={[0, 58, 120, 70]} r={[0.3, 0.8]} fill="#ffe9a0" op={0.8} />
      {Array.from({ length: 15 }, (_, i) => {
        const x = i * 8.4 + 2;
        const sway = ((i * 37) % 7) - 3;
        const top = 50 + ((i * 53) % 9);
        return (
          <g key={i}>
            <path d={`M${x} 82 Q${x + sway * 0.4} ${(82 + top) / 2} ${x + sway} ${top + 4}`} stroke="#7a4a12" strokeWidth="1.3" fill="none" />
            <ellipse cx={x + sway} cy={top} rx="2.4" ry="6.6" fill="url(#dt-gold)" transform={`rotate(${sway * 4} ${x + sway} ${top})`} />
            <path d={`M${x + sway} ${top - 6} l-1 -5 M${x + sway} ${top - 6} l1.5 -4`} stroke="#f6d26a" strokeWidth="0.5" />
          </g>
        );
      })}
      <Bird x={34} y={20} s={1.2} />
      <Bird x={44} y={15} />
      <Bird x={28} y={13} s={0.8} />
      <Vig />
    </>
  ),

  trade: (
    <>
      <Bg fill="dt-sky-dusk" />
      <g fill="#1a1028">
        <path d="M0 40 H14 V28 L20 22 L26 28 V40 H34 V20 H44 V40 H120 V80 H0Z" />
        <path d="M84 40 V26 L92 18 L100 26 V40 H106 V30 H120 V40Z" />
      </g>
      <Particles seed={7} n={14} box={[2, 24, 118, 38]} r={[0.6, 1]} fill="#ffc85a" />
      <Glow x={60} y={46} r={50} c="warm" />
      <path d="M2 10 Q60 26 118 10" stroke="#2a1a10" strokeWidth="0.6" fill="none" />
      {[14, 32, 50, 70, 88, 106].map((x, i) => {
        const y = 10 + 16 * (1 - Math.pow((x - 60) / 58, 2)) * 0.95;
        return (
          <g key={x}>
            <Glow x={x} y={y + 3} r={8} c="fire" />
            <rect x={x - 2.4} y={y} width="4.8" height="6" rx="2" fill={i % 2 ? '#ff5a2a' : '#ffa02a'} />
          </g>
        );
      })}
      <rect x="20" y="34" width="3" height="34" fill="url(#dt-wood)" />
      <rect x="97" y="34" width="3" height="34" fill="url(#dt-wood)" />
      {Array.from({ length: 7 }, (_, i) => {
        const x = 16 + i * 12.6;
        return <path key={i} d={`M${x} 30 H${x + 12.6} V40 Q${x + 6.3} 46 ${x} 40Z`} fill={i % 2 ? '#f6e6c8' : 'url(#dt-red-cloth)'} />;
      })}
      <rect x="14" y="27" width="92" height="4" rx="1.5" fill="#5a1a10" />
      <rect x="18" y="54" width="84" height="18" fill="url(#dt-wood)" />
      <rect x="18" y="54" width="84" height="2.5" fill="#e0a868" />
      <rect x="24" y="44" width="15" height="10" fill="url(#dt-wood)" stroke="#3a1e0a" strokeWidth="0.6" />
      <path d="M24 49 H39 M31.5 44 V54" stroke="#3a1e0a" strokeWidth="0.5" />
      <circle cx="46" cy="50" r="4" fill="url(#dt-apple)" />
      <circle cx="52" cy="51" r="3.4" fill="url(#dt-pumpkin)" />
      <Gem x={58} y={51} s={0.9} c="blue" />
      <Glow x={80} y={50} r={14} c="gold" />
      {[
        [72, 52],
        [78, 52],
        [84, 52],
        [75, 48.5],
        [81, 48.5],
        [78, 45],
        [90, 52],
      ].map(([x, y], i) => (
        <Coin key={i} x={x} y={y} r={3.2} />
      ))}
      <Sparkle x={86} y={42} s={0.5} />
      <Vig />
    </>
  ),

  orchard: (
    <>
      <Bg fill="dt-sky-day" />
      <Rays x={-4} y={-4} n={7} len={140} from={15} to={75} fill="#ffffff" op={0.18} />
      <Glow x={6} y={4} r={30} c="white" />
      <path d="M0 48 Q40 40 80 46 T120 44 V80 H0Z" fill="#4a8a3a" />
      {[12, 26, 40, 54, 68].map((x) => (
        <g key={x}>
          <rect x={x - 0.8} y="42" width="1.6" height="6" fill="#3a2a14" />
          <circle cx={x} cy="40" r="5.5" fill="#2e6a2a" />
        </g>
      ))}
      <path d="M0 58 Q40 50 80 56 T120 54 V80 H0Z" fill="url(#dt-grass)" />
      {[18, 44].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y="46" width="3" height="12" fill="#4a2a10" />
          <circle cx={x} cy="42" r="9" fill="#2e6a2a" />
          <circle cx={x - 3} cy="39" r="5" fill="#4a9a3a" />
          <circle cx={x + 3} cy="44" r="1.6" fill="url(#dt-apple)" />
          <circle cx={x - 4} cy="45" r="1.6" fill="url(#dt-apple)" />
        </g>
      ))}
      <path d="M96 82 Q92 60 98 44 L106 44 Q104 62 110 82Z" fill="url(#dt-wood)" />
      <path d="M98 50 Q84 44 76 34" stroke="#5a3014" strokeWidth="3" fill="none" />
      <circle cx="100" cy="22" r="24" fill="#1f5a20" />
      <circle cx="80" cy="26" r="16" fill="#2a7a2a" />
      <circle cx="94" cy="12" r="14" fill="#3e9a36" />
      <circle cx="112" cy="30" r="12" fill="#2a7a2a" />
      <circle cx="86" cy="14" r="7" fill="#7ac85a" opacity="0.7" />
      {[
        [78, 30],
        [88, 22],
        [100, 30],
        [108, 18],
        [94, 36],
        [72, 22],
        [114, 38],
        [84, 38],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.4" fill="url(#dt-apple)" />
          <circle cx={x - 1} cy={y - 1.2} r="0.9" fill="#fff" opacity="0.85" />
        </g>
      ))}
      <path d="M24 70 H44 L41 80 H27Z" fill="url(#dt-wood)" />
      {[28, 33, 38, 30.5, 35.5].map((x, i) => (
        <circle key={i} cx={x} cy={i < 3 ? 69 : 66} r="2.8" fill="url(#dt-apple)" />
      ))}
      <Vig />
    </>
  ),

  mill: (
    <>
      <Bg fill="dt-sky-dusk" />
      <Glow x={60} y={46} r={56} c="warm" />
      <circle cx="60" cy="46" r="13" fill="#fff0c0" opacity="0.95" />
      <path d="M0 52 Q30 42 60 50 T120 48 V80 H0Z" fill="#5a2232" />
      <path d="M0 62 Q36 50 66 58 T120 58 V80 H0Z" fill="#1a0c14" />
      <path d="M50 60 L54 30 H66 L70 60Z" fill="#140810" />
      <path d="M66 30 L70 60 L68.5 60 L64.8 30Z" fill="#ffb060" opacity="0.6" />
      <path d="M51 31 L60 20 L69 31Z" fill="#140810" />
      <rect x="57.5" y="40" width="5" height="6" rx="2.5" fill="#ffc85a" />
      <Glow x={60} y={43} r={6} c="fire" />
      <g transform="translate(60 27) rotate(18)">
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect x="-1" y="-34" width="2" height="32" fill="#140810" />
            <rect x="1" y="-33" width="8" height="24" fill="none" stroke="#140810" strokeWidth="1" />
            {[-29, -25, -21, -17, -13].map((y) => (
              <line key={y} x1="1" y1={y} x2="9" y2={y} stroke="#140810" strokeWidth="0.7" />
            ))}
            <line x1="5" y1="-33" x2="5" y2="-9" stroke="#140810" strokeWidth="0.6" />
          </g>
        ))}
        <circle r="3" fill="#140810" />
      </g>
      <g fill="#0e060a">
        <path d="M8 80 Q6 70 12 68 Q18 66 20 70 Q24 76 20 80Z" />
        <path d="M18 80 Q17 73 22 72 Q27 71 28 75 Q30 79 28 80Z" />
        <path d="M100 80 Q98 71 104 70 Q110 69 112 73 Q115 78 112 80Z" />
      </g>
      <Bird x={88} y={22} s={1.1} c="#140810" />
      <Bird x={96} y={17} c="#140810" />
      <Bird x={30} y={20} s={0.9} c="#140810" />
      <Vig />
    </>
  ),

  spoils: (
    <>
      <rect width="120" height="80" fill="#140a04" />
      <Glow x={60} y={46} r={70} c="gold" />
      <Rays x={60} y={44} n={10} len={70} from={200} to={340} fill="#fff2a8" op={0.18} />
      <path d="M38 40 L42 22 Q60 14 78 22 L82 40Z" fill="#3a1a08" />
      <path d="M40 38 L44 24 Q60 18 76 24 L80 38Z" fill="#ffd860" opacity="0.5" />
      <path d="M0 80 Q20 56 60 54 Q100 56 120 80Z" fill="url(#dt-gold)" />
      <rect x="38" y="40" width="44" height="22" rx="1.5" fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.8" />
      <rect x="38" y="40" width="44" height="3.5" fill="url(#dt-gold)" />
      <rect x="38" y="52" width="44" height="3" fill="url(#dt-gold)" />
      <rect x="44" y="40" width="3" height="22" fill="url(#dt-gold)" />
      <rect x="73" y="40" width="3" height="22" fill="url(#dt-gold)" />
      <rect x="56.5" y="44" width="7" height="9" rx="1.5" fill="url(#dt-gold)" stroke="#6a4208" strokeWidth="0.5" />
      <circle cx="60" cy="48" r="1.2" fill="#2a1206" />
      {[
        [44, 38],
        [51, 36],
        [58, 37],
        [65, 35],
        [72, 37],
        [77, 39],
        [55, 33],
        [62, 31],
        [69, 32],
      ].map(([x, y], i) => (
        <Coin key={i} x={x} y={y} r={3.4} />
      ))}
      {[
        [12, 72],
        [20, 66],
        [28, 70],
        [92, 68],
        [100, 72],
        [108, 66],
        [86, 74],
        [34, 76],
      ].map(([x, y], i) => (
        <Coin key={i} x={x} y={y} r={3.6} />
      ))}
      <Sword x={96} y={66} angle={18} len={40} />
      <g transform="translate(20 56)">
        <path d="M-10 4 L-12 -8 L-6 -2 L0 -11 L6 -2 L12 -8 L10 4Z" fill="url(#dt-gold)" stroke="#6a4208" strokeWidth="0.6" />
        <Gem x={0} y={0} s={0.6} c="red" />
        <circle cx="-6" cy="1" r="1.2" fill="url(#dt-gem-blue)" />
        <circle cx="6" cy="1" r="1.2" fill="url(#dt-gem-green)" />
      </g>
      <Gem x={48} y={66} s={1.2} c="blue" />
      <Gem x={70} y={68} s={1.1} c="green" />
      <Gem x={58} y={72} s={1.3} c="red" />
      <Sparkle x={40} y={30} s={0.7} />
      <Sparkle x={84} y={28} s={0.9} />
      <Sparkle x={66} y={62} s={0.5} />
      <Sparkle x={104} y={40} s={0.5} />
      <Vig />
    </>
  ),

  barracks: (
    <>
      <Bg fill="dt-sky-war" />
      <path d="M0 46 L16 32 L30 42 L48 26 L66 40 L84 28 L104 42 L120 34 V80 H0Z" fill="#3a1218" />
      <rect x="34" y="40" width="52" height="30" fill="url(#dt-stone)" />
      <path d="M34 44 H86 M34 50 H86 M34 56 H86 M34 62 H86" stroke="#5a5040" strokeWidth="0.5" />
      <path d="M28 42 L60 20 L92 42Z" fill="#6a1a10" />
      <path d="M60 20 L92 42 H86 L60 24Z" fill="#3a0a06" />
      <path d="M53 70 V58 Q60 50 67 58 V70Z" fill="#2a1206" />
      <Glow x={60} y={64} r={12} c="fire" />
      <path d="M55 70 V59 Q60 53 65 59 V70Z" fill="#ffb040" opacity="0.6" />
      <rect x="39" y="47" width="7" height="7" fill="#ffc85a" />
      <rect x="74" y="47" width="7" height="7" fill="#ffc85a" />
      <line x1="60" y1="20" x2="60" y2="2" stroke="#1a0a06" strokeWidth="1.4" />
      <path d="M60 3 Q68 1 76 4 Q72 7 76 11 Q68 9 60 11Z" fill="url(#dt-red-cloth)" />
      <path d="M67 5 L67 9 M65 7 H69" stroke="#ffd860" strokeWidth="0.9" />
      {Array.from({ length: 11 }, (_, i) => {
        const x = i < 5 ? i * 6 : 84 + (i - 5) * 6.4;
        return <path key={i} d={`M${x} 80 V60 L${x + 3} 55 L${x + 6} 60 V80Z`} fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.4" />;
      })}
      <Torch x={28} y={50} />
      <Torch x={92} y={50} />
      {[8, 14, 20, 100, 106, 112].map((x) => (
        <g key={x}>
          <line x1={x} y1="80" x2={x + 2} y2="36" stroke="#1a0a06" strokeWidth="1.2" />
          <path d={`M${x + 0.8} 37 L${x + 2.6} 30 L${x + 3.6} 37Z`} fill="url(#dt-steel)" />
        </g>
      ))}
      <Particles seed={11} n={14} box={[0, 10, 120, 60]} r={[0.3, 0.8]} fill="#ffb040" />
      <Vig />
    </>
  ),

  catapult: (
    <>
      <Bg fill="dt-sky-war" />
      <g fill="#2a0c08">
        <path d="M84 56 V36 H88 V32 H92 V36 H96 V30 H100 V24 L104 18 L108 24 V30 H112 V36 H116 V32 H120 V56Z" />
      </g>
      <Glow x={102} y={30} r={24} c="fire" />
      <Flame x={100} y={30} s={1} />
      <Flame x={108} y={34} s={0.8} />
      <path d="M100 16 Q94 4 104 -2" stroke="#3a2420" strokeWidth="6" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M0 58 Q40 50 80 56 T120 54 V80 H0Z" fill="#1a0a06" />
      <g transform="translate(-6 9)">
      <path d="M16 22 Q50 2 80 18" stroke="url(#dt-fire)" strokeWidth="2.5" fill="none" opacity="0.7" strokeDasharray="3 2" />
      <Glow x={82} y={18} r={18} c="fire" />
      <circle cx="82" cy="18" r="6" fill="#3a2a22" />
      <path d="M76 18 Q70 10 74 6 Q78 12 82 12 Q80 6 86 4 Q86 12 88 16" fill="url(#dt-fire)" />
      <circle cx="80" cy="17" r="2" fill="#5a4a40" />
      </g>
      <rect x="6" y="60" width="54" height="5" fill="url(#dt-wood)" />
      <circle cx="14" cy="68" r="7" fill="#2a1408" stroke="#5a3014" strokeWidth="1.5" />
      <circle cx="52" cy="68" r="7" fill="#2a1408" stroke="#5a3014" strokeWidth="1.5" />
      {[0, 45, 90, 135].map((a) => (
        <g key={a}>
          <line x1="14" y1="68" x2={14 + 6 * Math.cos((a * Math.PI) / 180)} y2={68 + 6 * Math.sin((a * Math.PI) / 180)} stroke="#5a3014" />
          <line x1="52" y1="68" x2={52 + 6 * Math.cos((a * Math.PI) / 180)} y2={68 + 6 * Math.sin((a * Math.PI) / 180)} stroke="#5a3014" />
        </g>
      ))}
      <path d="M26 60 L34 38 L42 60" stroke="url(#dt-wood)" strokeWidth="3.5" fill="none" />
      <g transform="translate(34 40) rotate(-50)">
        <rect x="-4" y="-2" width="40" height="4" fill="url(#dt-wood)" />
        <path d="M34 -5 Q40 -6 40 0 Q40 6 34 5Z" fill="#3a1e0a" />
      </g>
      <Particles seed={5} n={22} box={[30, 0, 120, 50]} r={[0.3, 0.9]} fill="#ffb040" />
      <Vig />
    </>
  ),

  archers: (
    <>
      <Bg fill="dt-sky-storm" />
      <Glow x={18} y={58} r={40} c="fire" />
      <circle cx="18" cy="58" r="7" fill="#ffd890" opacity="0.9" />
      <path d="M0 40 Q30 34 60 38 T120 32" stroke="#2a2030" strokeWidth="6" opacity="0.5" fill="none" />
      {Array.from({ length: 16 }, (_, i) => {
        // 左の弓兵から右上へ放物線を描く矢の雨
        const t = (i + 0.5) / 16;
        const x = 26 + t * 88 + ((i * 7) % 5) - 2;
        const y = 20 + Math.pow((t - 0.5) * 2, 2) * 12 + ((i * 11) % 9);
        const a = (t - 0.5) * 60;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
            <line x1="-7" y1="0" x2="5" y2="0" stroke="#120a10" strokeWidth="0.9" />
            <path d="M5 -1.4 L8.5 0 L5 1.4Z" fill="#c8d0d8" />
            <path d="M-7 0 L-9 -1.6 M-7 0 L-9 1.6" stroke="#120a10" strokeWidth="0.7" />
          </g>
        );
      })}
      <path d="M0 64 Q30 56 60 62 T120 58 V80 H0Z" fill="#100810" />
      <Archer x={22} y={61} s={1.05} />
      <Archer x={38} y={60} s={0.95} />
      <Archer x={54} y={62} s={1.1} />
      <Archer x={72} y={61} s={0.9} />
      <Archer x={88} y={60} s={1} />
      <path d="M100 60 V36" stroke="#100810" strokeWidth="1" />
      <path d="M100 37 Q108 35 114 38 Q109 41 114 45 Q107 43 100 45Z" fill="url(#dt-red-cloth)" />
      <Vig />
    </>
  ),

  spearmen: (
    <>
      <Bg fill="dt-sky-gold" />
      <Glow x={88} y={40} r={40} c="warm" />
      <path d="M0 50 Q30 42 60 47 T120 44 V80 H0Z" fill="#6a321e" />
      {Array.from({ length: 12 }, (_, i) => {
        const x = 4 + i * 10;
        return (
          <g key={i}>
            <line x1={x} y1="78" x2={x + 22} y2="12" stroke="#3a1e0a" strokeWidth="1.6" />
            <path d={`M${x + 20.5} 15 L${x + 24} 6 L${x + 24.5} 15.5Z`} fill="url(#dt-steel)" />
          </g>
        );
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const x = 9 + i * 17;
        return (
          <g key={i}>
            <circle cx={x} cy="56" r="5" fill="url(#dt-iron)" />
            <path d={`M${x - 8} 58 H${x + 8} V68 Q${x} 76 ${x - 8} 68Z`} fill="url(#dt-blue-cloth)" stroke="#c9a24a" strokeWidth="0.9" />
            <path d={`M${x} 60 V70 M${x - 4} 64 H${x + 4}`} stroke="#ffd860" strokeWidth="1" />
          </g>
        );
      })}
      <rect y="72" width="120" height="8" fill="#2a1408" />
      <Vig />
    </>
  ),

  knights: (
    <>
      <Bg fill="dt-sky-dusk" />
      <Glow x={30} y={46} r={50} c="warm" />
      <circle cx="30" cy="46" r="10" fill="#fff0c0" opacity="0.9" />
      <path d="M0 58 Q40 50 80 56 T120 54 V80 H0Z" fill="#1a0c14" />
      <g fill="#5a3a3a" opacity="0.55">
        <circle cx="30" cy="68" r="9" />
        <circle cx="18" cy="70" r="7" />
        <circle cx="42" cy="72" r="6" />
      </g>
      <g fill="#120810">
        <path d="M38 62 Q42 50 56 48 L72 46 Q80 40 86 42 L90 38 L92 44 Q96 50 92 52 L86 52 Q84 58 78 60 L76 74 H72 L72 62 L58 62 L54 74 H50 L52 62 Q44 66 40 74 H36 Q36 66 38 62Z" />
        <path d="M60 46 Q58 36 64 32 Q70 30 72 36 L72 46Z" />
        <circle cx="67" cy="28" r="4" />
      </g>
      <path d="M67 24 Q64 16 70 14" stroke="url(#dt-red-cloth)" strokeWidth="2.4" fill="none" />
      <path d="M60 40 L114 22" stroke="url(#dt-steel)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M96 28 L108 22 L106 30Z" fill="url(#dt-red-cloth)" />
      <ellipse cx="62" cy="44" rx="5" ry="7" fill="url(#dt-blue-cloth)" stroke="#c9a24a" strokeWidth="0.8" />
      <Particles seed={23} n={14} box={[0, 50, 60, 78]} r={[0.4, 1.2]} fill="#c8a080" op={0.6} />
      <Vig />
    </>
  ),

  palisade: (
    <>
      <Bg fill="dt-sky-teal" />
      <path d="M0 52 Q40 44 80 50 T120 48 V80 H0Z" fill="#1e4a3a" />
      <rect y="64" width="120" height="16" fill="url(#dt-earth)" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = i * 9.5 - 2;
        const h = 30 + ((i * 7) % 6);
        return <path key={i} d={`M${x} 74 V${74 - h} L${x + 4} ${70 - h} L${x + 8} ${74 - h} V74Z`} fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.5" />;
      })}
      <path d="M0 50 L120 46 M0 62 L120 58" stroke="#5a3014" strokeWidth="2.2" />
      <path d="M0 50 L120 46" stroke="#c48a52" strokeWidth="0.6" opacity="0.6" />
      <Torch x={60} y={30} />
      <Vig />
    </>
  ),

  castle_wall: (
    <>
      <Bg fill="dt-sky-dusk" />
      <Glow x={90} y={36} r={44} c="warm" />
      <rect x="0" y="34" width="120" height="46" fill="url(#dt-stone)" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 16} y="24" width="10" height="11" fill="url(#dt-stone)" />
      ))}
      {[42, 52, 62, 72].map((y, i) => (
        <path key={y} d={`M0 ${y} H120 ${Array.from({ length: 8 }, (_, k) => `M${k * 16 + (i % 2 ? 8 : 0)} ${y} V${y + 10}`).join(' ')}`} stroke="#5a5040" strokeWidth="0.6" />
      ))}
      <path d="M48 80 V56 Q60 44 72 56 V80Z" fill="#1a1208" />
      <g stroke="#3a3a40" strokeWidth="1.2">
        {[52, 57, 62, 67].map((x) => (
          <line key={x} x1={x} y1="52" x2={x} y2="80" />
        ))}
        {[60, 68, 76].map((y) => (
          <line key={y} x1="49" y1={y} x2="71" y2={y} />
        ))}
      </g>
      <line x1="20" y1="24" x2="20" y2="4" stroke="#1a0a06" strokeWidth="1.2" />
      <path d="M20 5 Q28 3 34 6 Q30 9 34 13 Q27 11 20 13Z" fill="url(#dt-blue-cloth)" />
      <line x1="100" y1="24" x2="100" y2="4" stroke="#1a0a06" strokeWidth="1.2" />
      <path d="M100 5 Q108 3 114 6 Q110 9 114 13 Q107 11 100 13Z" fill="url(#dt-blue-cloth)" />
      <Vig />
    </>
  ),

  even_charm: (
    <>
      <Bg fill="dt-sky-night" />
      <Glow x={60} y={40} r={48} c="blue" />
      <g transform="translate(60 40) rotate(-6)">
        <rect x="-12" y="-28" width="24" height="56" fill="url(#dt-parchment)" stroke="#5a8ad8" strokeWidth="0.8" />
        <text x="0" y="7" fontSize="18" fontWeight="900" textAnchor="middle" fill="#2a6ad8" fontFamily="serif">
          偶
        </text>
      </g>
      {[
        [20, 22, 2],
        [100, 24, 4],
        [96, 62, 6],
      ].map(([x, y, n]) => (
        <g key={n} transform={`translate(${x} ${y}) rotate(${n * 7})`}>
          <Glow x={0} y={0} r={11} c="blue" />
          <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#fffaf0" stroke="#5a8ad8" />
          {(n === 2 ? [[-3, -3], [3, 3]] : n === 4 ? [[-3, -3], [3, -3], [-3, 3], [3, 3]] : [[-3, -3.5], [3, -3.5], [-3, 0], [3, 0], [-3, 3.5], [3, 3.5]]).map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r="1.3" fill="#1a2a4a" />
          ))}
        </g>
      ))}
      <Particles seed={31} n={20} box={[8, 6, 112, 74]} r={[0.3, 0.8]} fill="#bfe6ff" />
      <Vig />
    </>
  ),

  odd_charm: (
    <>
      <Bg fill="dt-sky-dusk" />
      <Glow x={60} y={40} r={48} c="gold" />
      <g transform="translate(60 40) rotate(6)">
        <rect x="-12" y="-28" width="24" height="56" fill="url(#dt-parchment)" stroke="#c9a24a" strokeWidth="0.8" />
        <text x="0" y="7" fontSize="18" fontWeight="900" textAnchor="middle" fill="#b0400e" fontFamily="serif">
          奇
        </text>
      </g>
      {[
        [22, 26, 1],
        [98, 22, 3],
        [24, 62, 5],
      ].map(([x, y, n]) => (
        <g key={n} transform={`translate(${x} ${y}) rotate(${-n * 6})`}>
          <Glow x={0} y={0} r={11} c="gold" />
          <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#fffaf0" stroke="#c9a24a" />
          {(n === 1 ? [[0, 0]] : n === 3 ? [[-3, -3], [0, 0], [3, 3]] : [[-3, -3], [3, -3], [0, 0], [-3, 3], [3, 3]]).map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={n === 1 ? 2 : 1.3} fill={n === 1 ? '#d0201a' : '#2a1a0a'} />
          ))}
        </g>
      ))}
      <Particles seed={32} n={20} box={[8, 6, 112, 74]} r={[0.3, 0.8]} fill="#ffe08a" />
      <Vig />
    </>
  ),

  // 天変地異：嵐と雷、片側は吹雪・片側は日照り、大地が裂ける
  fickle_wind: (
    <>
      <Bg fill="dt-sky-storm" />
      <path d="M0 0 H60 V80 H0Z" fill="#cfe6f5" opacity="0.18" />
      <Glow x={100} y={18} r={26} c="fire" />
      <circle cx="100" cy="18" r="7" fill="#ffd890" />
      <g fill="#2a2430">
        <circle cx="28" cy="14" r="12" />
        <circle cx="44" cy="10" r="14" />
        <circle cx="62" cy="16" r="11" />
        <circle cx="14" cy="20" r="9" />
      </g>
      <Glow x={46} y={44} r={22} c="white" />
      <path d="M50 22 L42 40 L50 40 L40 60 L58 36 L50 36 L56 22Z" fill="#fffbe0" />
      <Particles seed={41} n={22} box={[0, 24, 56, 70]} r={[0.5, 1.2]} fill="#ffffff" op={0.85} />
      <path d="M0 64 Q40 58 80 62 T120 60 V80 H0Z" fill="#3a2a1e" />
      <path d="M44 80 L50 70 L46 66 L54 62 L52 58 M54 62 L62 66 L60 72 L66 80" stroke="#ff7a2a" strokeWidth="2" fill="none" />
      <Glow x={54} y={68} r={12} c="fire" />
      {[18, 30].map((y, i) => (
        <path key={y} d={`M${70 + i * 4} ${y + 20} q10 -8 20 0 t20 0`} stroke="#e8fbff" strokeWidth={1.6 - i * 0.4} fill="none" opacity={0.7} strokeLinecap="round" />
      ))}
      <Vig />
    </>
  ),

  ward: (
    <>
      <Bg fill="dt-sky-night" />
      <Particles seed={33} n={24} box={[0, 0, 120, 40]} r={[0.2, 0.6]} fill="#fff" op={0.7} />
      <rect x="32" y="50" width="56" height="30" fill="url(#dt-stone-dark)" />
      {[32, 42, 52, 62, 72, 82].map((x) => (
        <rect key={x} x={x} y="45" width="6" height="6" fill="url(#dt-stone-dark)" />
      ))}
      <rect x="54" y="36" width="12" height="16" fill="url(#dt-stone-dark)" />
      <path d="M52 36 L60 26 L68 36Z" fill="url(#dt-blue-cloth)" />
      <Glow x={60} y={56} r={52} c="blue" />
      <path d="M10 80 Q10 20 60 18 Q110 20 110 80" fill="none" stroke="#9ae6ff" strokeWidth="2.5" opacity="0.9" />
      <path d="M16 80 Q16 26 60 24 Q104 26 104 80" fill="none" stroke="#5ac8ff" strokeWidth="1" opacity="0.6" />
      {[
        [18, 14, 40],
        [96, 10, 140],
        [104, 34, 160],
      ].map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <line x1="-8" y1="0" x2="4" y2="0" stroke="#3a2a1a" strokeWidth="1" />
          <path d="M4 -1.5 L8 0 L4 1.5Z" fill="#c8d0d8" />
        </g>
      ))}
      <Sparkle x={30} y={30} s={0.8} fill="#e8fbff" />
      <Sparkle x={90} y={28} s={0.6} fill="#e8fbff" />
      <Vig />
    </>
  ),

  cannon: (
    <>
      <rect width="120" height="80" fill="#1a1416" />
      <Glow x={90} y={28} r={55} c="fire" />
      <g fill="#3a3436" opacity="0.85">
        <circle cx="98" cy="14" r="10" />
        <circle cx="108" cy="24" r="9" />
        <circle cx="104" cy="40" r="10" />
        <circle cx="88" cy="44" r="7" />
      </g>
      <path
        d="M90 28 L96 18 L97 25 L108 16 L101 26 L116 26 L102 31 L112 40 L99 34 L98 46 L93 35 L84 42 L88 32Z"
        fill="url(#dt-fire)"
      />
      <circle cx="94" cy="29" r="5" fill="#fffbe0" />
      <path d="M108 8 L118 4" stroke="#ffb040" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="116" cy="5" r="2.4" fill="#14161a" />
      <path d="M0 66 Q60 60 120 66 V80 H0Z" fill="#100c0a" />
      <g transform="translate(36 54) rotate(-22)">
        <rect x="-10" y="-9" width="56" height="18" rx="8" fill="url(#dt-iron)" />
        <rect x="42" y="-10.5" width="7" height="21" rx="2" fill="#14161a" />
        <rect x="-4" y="-9" width="4" height="18" fill="url(#dt-gold)" />
        <rect x="24" y="-9" width="3" height="18" fill="url(#dt-gold)" />
        <rect x="-6" y="-6.5" width="50" height="2" rx="1" fill="#fff" opacity="0.25" />
        <circle cx="-12" cy="0" r="4" fill="url(#dt-iron)" />
      </g>
      <path d="M14 68 L28 56 L50 60 L44 70Z" fill="url(#dt-wood)" />
      <circle cx="32" cy="66" r="11" fill="#2a1408" stroke="url(#dt-gold)" strokeWidth="2" />
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <line key={a} x1={32 - 10 * Math.cos((a * Math.PI) / 180)} y1={66 - 10 * Math.sin((a * Math.PI) / 180)} x2={32 + 10 * Math.cos((a * Math.PI) / 180)} y2={66 + 10 * Math.sin((a * Math.PI) / 180)} stroke="#6a3a14" strokeWidth="1.2" />
      ))}
      <circle cx="32" cy="66" r="2.5" fill="url(#dt-gold)" />
      <Particles seed={9} n={24} box={[70, 6, 120, 56]} r={[0.3, 1]} fill="#ffcf4a" />
      <Vig />
    </>
  ),

  watchtower: (
    <>
      <Bg fill="dt-sky-night" />
      <Particles seed={2} n={40} box={[0, 0, 120, 40]} r={[0.2, 0.7]} fill="#ffffff" op={0.85} />
      <Glow x={96} y={22} r={14} c="white" />
      <circle cx="96" cy="22" r="5" fill="#f6f0d8" />
      <path d="M60 14 L-10 2 L-10 34Z" fill="url(#dt-beam-gold)" opacity="0.8" />
      <path d="M60 14 L130 4 L130 30Z" fill="url(#dt-beam-gold)" opacity="0.5" />
      <path d="M0 54 L20 40 L36 50 L56 36 L80 50 L100 38 L120 48 V80 H0Z" fill="#141a36" />
      <path d="M48 80 L51 26 H69 L72 80Z" fill="url(#dt-stone)" />
      <path d="M62 26 H69 L72 80 H64Z" fill="#000" opacity="0.25" />
      {[34, 42, 50, 58, 66, 74].map((y, i) => (
        <path key={y} d={`M50 ${y} H70 M${i % 2 ? 56 : 60} ${y} V${y + 8}`} stroke="#5a5244" strokeWidth="0.5" />
      ))}
      <rect x="45" y="20" width="30" height="7" fill="url(#dt-stone-dark)" />
      {[45, 52, 59, 66, 72].map((x) => (
        <rect key={x} x={x} y="15" width="4" height="6" fill="url(#dt-stone-dark)" />
      ))}
      <Glow x={60} y={12} r={26} c="fire" />
      <Flame x={60} y={20} s={1.3} />
      <rect x="57" y="40" width="6" height="9" rx="3" fill="#ffc85a" />
      <rect x="57" y="58" width="6" height="8" rx="3" fill="#ffc85a" />
      <Pine x={10} y={80} s={1.4} />
      <Pine x={24} y={80} s={1.1} />
      <Pine x={94} y={80} s={1.3} />
      <Pine x={108} y={80} s={1.6} />
      <Pine x={84} y={80} s={0.9} />
      <Vig />
    </>
  ),

  infirmary: (
    <>
      <Bg fill="dt-sky-teal" />
      <path d="M0 58 Q40 48 80 56 T120 52 V80 H0Z" fill="#1e4a3a" />
      <path d="M0 66 Q60 58 120 66 V80 H0Z" fill="#14342a" />
      <Glow x={58} y={50} r={44} c="green" />
      <path d="M18 72 L58 24 L98 72Z" fill="url(#dt-tent)" />
      <path d="M58 24 L98 72 H80Z" fill="#8a8272" opacity="0.5" />
      <path d="M48 72 L58 46 L68 72Z" fill="#ffc860" />
      <Glow x={58} y={64} r={14} c="warm" />
      <line x1="58" y1="24" x2="58" y2="12" stroke="#3a2a1a" strokeWidth="1.2" />
      <path d="M58 12 Q66 10 72 13 Q68 16 72 20 Q65 18 58 20Z" fill="#fffaf0" />
      <path d="M63 14.5 H67 M65 12.5 V18" stroke="#d8201a" strokeWidth="1.8" />
      <g transform="translate(58 36)">
        <rect x="-5" y="-1.5" width="10" height="3" fill="#d8201a" />
        <rect x="-1.5" y="-5" width="3" height="10" fill="#d8201a" />
      </g>
      <Glow x={96} y={24} r={14} c="red" />
      <path d="M90 22 C90 17 96 17 96 22 C96 17 102 17 102 22 C102 28 96 31 96 33 C96 31 90 28 90 22Z" fill="#ff6a8a" />
      {[
        [30, 40],
        [86, 46],
        [74, 30],
        [40, 28],
        [100, 60],
        [20, 56],
      ].map(([x, y], i) => (
        <Sparkle key={i} x={x} y={y} s={0.35 + (i % 3) * 0.15} fill="#d8ffe0" />
      ))}
      <Particles seed={4} n={20} box={[16, 20, 104, 70]} r={[0.3, 0.8]} fill="#c0ffd0" />
      <Vig />
    </>
  ),

  toll: (
    <>
      <Bg fill="dt-sky-dusk" />
      <path d="M0 56 Q60 46 120 56 V80 H0Z" fill="#2a1a14" />
      <path d="M44 80 L56 56 H64 L76 80Z" fill="url(#dt-earth)" />
      <rect x="14" y="22" width="26" height="46" fill="url(#dt-stone)" />
      <rect x="80" y="22" width="26" height="46" fill="url(#dt-stone)" />
      <path d="M12 23 L27 4 L42 23Z" fill="url(#dt-blue-cloth)" />
      <path d="M78 23 L93 4 L108 23Z" fill="url(#dt-blue-cloth)" />
      <rect x="40" y="28" width="40" height="30" fill="url(#dt-stone-dark)" />
      {[40, 47, 54, 61, 68, 75].map((x) => (
        <rect key={x} x={x} y="24" width="5" height="5" fill="url(#dt-stone-dark)" />
      ))}
      <path d="M46 58 V42 Q60 30 74 42 V58Z" fill="#0e0806" />
      <g stroke="#3a3a40" strokeWidth="1">
        {[50, 55, 60, 65, 70].map((x) => (
          <line key={x} x1={x} y1="36" x2={x} y2="50" />
        ))}
        {[40, 45, 50].map((y) => (
          <line key={y} x1="47" y1={y} x2="73" y2={y} />
        ))}
      </g>
      <rect x="22" y="34" width="10" height="12" rx="5" fill="#ffc85a" />
      <rect x="88" y="34" width="10" height="12" rx="5" fill="#ffc85a" />
      <Torch x={44} y={46} />
      <Torch x={76} y={46} />
      <rect x="20" y="58" width="5" height="16" fill="url(#dt-wood)" />
      <g transform="translate(22 62) rotate(-6)">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={i * 9} y="-2.8" width="9" height="5.6" fill={i % 2 ? '#fffaf0' : 'url(#dt-red-cloth)'} />
        ))}
        <rect x="0" y="-2.8" width="72" height="1.2" fill="#fff" opacity="0.35" />
      </g>
      <Glow x={100} y={70} r={10} c="gold" />
      <Coin x={96} y={72} r={3.4} />
      <Coin x={102} y={70} r={3.4} />
      <Coin x={99} y={67} r={3.4} />
      <Vig />
    </>
  ),

  counter_battery: (
    <>
      <Bg fill="dt-sky-night" />
      <Particles seed={6} n={24} box={[0, 0, 120, 40]} r={[0.2, 0.6]} fill="#fff" op={0.7} />
      <path d="M-4 20 Q14 10 26 22" stroke="url(#dt-fire)" strokeWidth="2" fill="none" opacity="0.7" />
      <Glow x={30} y={26} r={16} c="fire" />
      <circle cx="30" cy="26" r="3" fill="#3a2a22" />
      <Glow x={40} y={36} r={30} c="blue" />
      <path d="M36 72 Q24 40 52 10" stroke="#9ae6ff" strokeWidth="3" fill="none" opacity="0.9" />
      <path d="M40 72 Q30 40 56 12" stroke="#5ac8ff" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M32 72 Q18 40 48 8" stroke="#5ac8ff" strokeWidth="1" fill="none" opacity="0.4" />
      <Sparkle x={34} y={28} s={1} fill="#ffffff" />
      <rect x="0" y="56" width="120" height="24" fill="url(#dt-stone)" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 16} y="48" width="10" height="9" fill="url(#dt-stone)" />
      ))}
      <path d="M0 64 H120 M0 72 H120 M16 56 V64 M48 56 V64 M80 56 V64 M32 64 V72 M64 64 V72 M96 64 V72" stroke="#5a5040" strokeWidth="0.6" />
      <g transform="translate(92 46) rotate(-20) scale(-1 1)">
        <rect x="-6" y="-6" width="34" height="12" rx="5" fill="url(#dt-iron)" />
        <rect x="26" y="-7" width="5" height="14" rx="1.5" fill="#14161a" />
        <rect x="2" y="-6" width="3" height="12" fill="url(#dt-gold)" />
      </g>
      <circle cx="96" cy="54" r="5" fill="#2a1408" stroke="#5a3014" strokeWidth="1.4" />
      <path d="M91 54 H101 M96 49 V59" stroke="#5a3014" strokeWidth="0.8" />
      <Glow x={64} y={34} r={14} c="fire" />
      <path d="M64 34 L68 28 L68 33 L74 30 L69 35 L74 38 L67 37 L66 42 L63 37Z" fill="url(#dt-fire)" />
      <g transform="translate(110 68)">
        <path d="M-7 -7 H7 V0 Q7 6 0 9 Q-7 6 -7 0Z" fill="url(#dt-blue-cloth)" stroke="#9ae6ff" strokeWidth="0.8" />
        <path d="M0 -4 L3 0 L0 5 L-3 0Z" fill="#fff6c4" />
      </g>
      <Vig />
    </>
  ),

  seal: (
    <>
      <Bg fill="dt-sky-magic" />
      <Glow x={60} y={40} r={50} c="purple" />
      <g stroke="#d8b0ff" fill="none" opacity="0.75">
        <circle cx="60" cy="40" r="32" strokeWidth="0.8" />
        <circle cx="60" cy="40" r="27" strokeWidth="1.4" />
        <circle cx="60" cy="40" r="18" strokeWidth="0.6" />
        <path d="M60 13 L83.4 53.5 H36.6Z M60 67 L36.6 26.5 H83.4Z" strokeWidth="0.7" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15 * Math.PI) / 180;
          return <line key={i} x1={60 + 28.5 * Math.cos(a)} y1={40 + 28.5 * Math.sin(a)} x2={60 + 31 * Math.cos(a)} y2={40 + 31 * Math.sin(a)} strokeWidth="1.2" />;
        })}
      </g>
      <Glow x={60} y={40} r={22} c="red" />
      <g transform="translate(60 40) rotate(-6)">
        <rect x="-11" y="-28" width="22" height="56" fill="url(#dt-parchment)" stroke="#8a6a3a" strokeWidth="0.6" />
        <rect x="-8" y="-25" width="16" height="50" fill="none" stroke="#c0201a" strokeWidth="0.6" />
        <text x="0" y="6" fontSize="17" fontWeight="900" textAnchor="middle" fill="#c0201a" fontFamily="serif">
          封
        </text>
        <path d="M-5 -19 H5 M-4 -15 H4 M-5 16 H5 M-3 20 H3" stroke="#3a1a0a" strokeWidth="0.9" />
      </g>
      <Chain x1={2} y1={10} x2={48} y2={34} n={8} />
      <Chain x1={118} y1={70} x2={72} y2={46} n={8} />
      <Chain x1={4} y1={74} x2={46} y2={52} n={7} />
      <Sparkle x={96} y={14} s={0.8} fill="#e8d0ff" />
      <Sparkle x={22} y={40} s={0.5} fill="#e8d0ff" />
      <Particles seed={8} n={20} box={[10, 4, 110, 76]} r={[0.3, 0.8]} fill="#e8d0ff" />
      <Vig />
    </>
  ),

  thieves: (
    <>
      <Bg fill="dt-sky-night" />
      <Particles seed={12} n={30} box={[0, 0, 120, 44]} r={[0.2, 0.6]} fill="#fff" op={0.8} />
      <Glow x={86} y={26} r={34} c="white" />
      <circle cx="86" cy="26" r="17" fill="#f2ecd4" />
      <circle cx="80" cy="22" r="3" fill="#d8d0b4" />
      <circle cx="92" cy="32" r="2" fill="#d8d0b4" />
      <path d="M0 56 L14 48 L28 56 V48 H34 V56 L48 46 L62 56 L80 50 L96 58 L120 50 V80 H0Z" fill="#05060e" />
      <path d="M50 74 Q46 52 58 46 Q52 38 58 30 Q66 24 74 30 Q80 38 74 46 Q86 52 90 64 Q74 58 70 74Z" fill="#020308" />
      <path d="M58 30 Q66 22 74 30 Q70 26 66 26 Q62 26 58 30Z" fill="#1a1e30" />
      <path d="M60 37 H72 V40 H60Z" fill="#0a0c18" />
      <Glow x={63} y={38} r={4} c="gold" />
      <Glow x={69} y={38} r={4} c="gold" />
      <ellipse cx="63" cy="38.5" rx="1.6" ry="0.9" fill="#ffe060" />
      <ellipse cx="69" cy="38.5" rx="1.6" ry="0.9" fill="#ffe060" />
      <g transform="translate(46 54) rotate(-35)">
        <path d="M-1.4 0 V-16 L0 -20 L1.4 -16 V0Z" fill="url(#dt-steel)" />
        <rect x="-4" y="0" width="8" height="1.6" fill="#5a4a3a" />
        <rect x="-1" y="1.6" width="2" height="5" fill="#2a1a0e" />
      </g>
      <Sparkle x={38} y={42} s={0.7} fill="#fff" />
      <g transform="translate(-10 -8)">
      <path d="M84 66 Q80 56 88 54 Q96 54 96 60 Q102 66 98 76 H82 Q78 70 84 66Z" fill="#3a2a1a" stroke="#6a4a2a" strokeWidth="0.6" />
      <path d="M85 56 Q90 58 95 56" stroke="#c8a24a" strokeWidth="1" fill="none" />
      <Glow x={92} y={70} r={10} c="gold" />
      <Coin x={100} y={74} r={2.8} />
      <Coin x={106} y={77} r={2.8} />
      <Coin x={88} y={60} r={2.8} />
      </g>
      <Vig />
    </>
  ),

  tax: (
    <>
      <Bg fill="dt-velvet" />
      <Glow x={60} y={40} r={55} c="gold" />
      <Rays x={60} y={40} n={12} len={70} from={0} to={360} fill="#ffe08a" op={0.12} />
      {[
        [14, 6],
        [24, 4],
        [98, 5],
        [108, 7],
      ].map(([x, h], k) => (
        <g key={k}>
          {Array.from({ length: h }, (_, i) => (
            <ellipse key={i} cx={x} cy={76 - i * 4} rx="7" ry="2.6" fill="url(#dt-gold)" stroke="#6a4208" strokeWidth="0.5" />
          ))}
        </g>
      ))}
      <rect x="36" y="12" width="48" height="58" fill="url(#dt-parchment)" />
      <rect x="32" y="8" width="56" height="6" rx="3" fill="url(#dt-wood)" />
      <rect x="32" y="68" width="56" height="6" rx="3" fill="url(#dt-wood)" />
      <circle cx="31" cy="11" r="3" fill="url(#dt-gold)" />
      <circle cx="89" cy="11" r="3" fill="url(#dt-gold)" />
      <circle cx="31" cy="71" r="3" fill="url(#dt-gold)" />
      <circle cx="89" cy="71" r="3" fill="url(#dt-gold)" />
      <path d="M50 26 L48 18 L54 22 L60 16 L66 22 L72 18 L70 26Z" fill="url(#dt-gold)" stroke="#6a4208" strokeWidth="0.5" />
      {[32, 37, 42, 47].map((y, i) => (
        <line key={y} x1="42" y1={y} x2={i === 3 ? 64 : 78} y2={y} stroke="#5a4030" strokeWidth="1.3" />
      ))}
      <path d="M64 56 L60 68 L64 66 L66 70 Z M68 56 L72 68 L68 66 L66 70Z" fill="#a01818" />
      <circle cx="66" cy="56" r="6" fill="#c0201a" />
      <circle cx="66" cy="56" r="4" fill="none" stroke="#7a0a0a" strokeWidth="0.8" />
      <g transform="translate(92 26) rotate(30)">
        <path d="M0 -22 Q8 -10 2 12 L-1 12 Q-6 -8 0 -22Z" fill="#fffaf0" />
        <path d="M0 -20 V12" stroke="#c8c0b0" strokeWidth="0.5" />
        <path d="M0 12 L0.5 18" stroke="#2a1a0a" strokeWidth="1" />
      </g>
      <Sparkle x={22} y={16} s={0.6} />
      <Sparkle x={104} y={50} s={0.5} />
      <Vig />
    </>
  ),

  silence: (
    <>
      <Bg fill="dt-sky-magic" />
      <Glow x={60} y={42} r={46} c="purple" />
      <g stroke="#b080e8" fill="none" opacity="0.55" strokeWidth="1.4">
        <path d="M4 60 Q20 48 34 58 T64 56" />
        <path d="M60 18 Q76 8 90 18 T118 16" />
        <path d="M80 70 Q94 62 108 70" />
      </g>
      <g transform="translate(60 42)">
        <path d="M-15 -11 L-7 -19 H19 L11 -11Z" fill="#e8dcc0" />
        <path d="M11 -11 L19 -19 V7 L11 15Z" fill="#a8987a" />
        <rect x="-15" y="-11" width="26" height="26" rx="2" fill="url(#dt-ivory)" />
        <circle cx="-8" cy="-4" r="2.6" fill="#2a1a2a" />
        <circle cx="-2" cy="2" r="2.6" fill="#2a1a2a" />
        <circle cx="4" cy="8" r="2.6" fill="#2a1a2a" />
        <path d="M-15 -2 L-6 0 L-2 -8 L4 -4 L11 -10 M-4 15 L-1 6 L6 4 L11 8" stroke="#c070ff" strokeWidth="1" fill="none" />
      </g>
      <Glow x={60} y={42} r={22} c="red" />
      <path d="M38 20 L82 64 M82 20 L38 64" stroke="#ff4a6a" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M38 20 L82 64 M82 20 L38 64" stroke="#ffd0e0" strokeWidth="1.2" strokeLinecap="round" />
      <Glow x={18} y={22} r={8} c="purple" />
      <Glow x={102} y={56} r={8} c="purple" />
      <ellipse cx="15" cy="22" rx="1.8" ry="1" fill="#f0d8ff" />
      <ellipse cx="21" cy="22" rx="1.8" ry="1" fill="#f0d8ff" />
      <ellipse cx="99" cy="56" rx="1.8" ry="1" fill="#f0d8ff" />
      <ellipse cx="105" cy="56" rx="1.8" ry="1" fill="#f0d8ff" />
      <Particles seed={14} n={18} box={[6, 6, 114, 74]} r={[0.3, 0.8]} fill="#d8b0ff" />
      <Vig />
    </>
  ),

  harvest: (
    <>
      <Bg fill="dt-sky-dusk" />
      <Glow x={60} y={52} r={60} c="fire" />
      {[
        [0, 6, 120, 6, 20],
        [0, 18, 120, 14, 12],
      ].map(([x1, y1, x2, y2, sag], k) => (
        <g key={k}>
          <path d={`M${x1} ${y1} Q60 ${y1 + sag} ${x2} ${y2}`} stroke="#2a1a10" strokeWidth="0.5" fill="none" />
          {Array.from({ length: 7 }, (_, i) => {
            const t = (i + 0.5) / 7;
            const x = x1 + (x2 - x1) * t;
            const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (y1 + sag) + t * t * y2;
            return (
              <g key={i}>
                <Glow x={x} y={y + 3} r={6} c="fire" />
                <ellipse cx={x} cy={y + 3} rx="2.4" ry="3" fill={(i + k) % 2 ? '#ff4a2a' : '#ffb02a'} />
              </g>
            );
          })}
        </g>
      ))}
      <path d="M0 70 Q60 62 120 70 V80 H0Z" fill="#1a0a06" />
      {[44, 50, 56, 66, 72, 78].map((x, i) => (
        <g key={x} transform={`rotate(${(i - 2.5) * 9} ${x} 52)`}>
          <line x1={x} y1="52" x2={x} y2="34" stroke="#8a5a1a" strokeWidth="0.8" />
          <ellipse cx={x} cy="33" rx="1.8" ry="5" fill="url(#dt-gold)" />
        </g>
      ))}
      <ellipse cx="62" cy="48" rx="11" ry="8.5" fill="url(#dt-pumpkin)" />
      <path d="M58 41 Q57 48 58 56 M66 41 Q67 48 66 56 M62 40 V57" stroke="#a8480a" strokeWidth="0.6" fill="none" />
      <path d="M62 40 Q63 36 66 35" stroke="#3a6a1a" strokeWidth="1.6" fill="none" />
      <circle cx="46" cy="50" r="5.2" fill="url(#dt-apple)" />
      <circle cx="44.5" cy="48.5" r="1.2" fill="#fff" opacity="0.8" />
      {[
        [78, 46],
        [82, 46],
        [80, 49.5],
        [76, 49.5],
        [84, 49.5],
        [78, 53],
        [82, 53],
        [80, 56.5],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.3" fill="#7a3ab0" stroke="#4a1a70" strokeWidth="0.4" />
      ))}
      <path d="M30 54 H94 L86 76 H38Z" fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.6" />
      {[59, 64, 69, 74].map((y) => (
        <path key={y} d={`M${30 + (y - 54) * 0.35} ${y} H${94 - (y - 54) * 0.35}`} stroke="#3a1a08" strokeWidth="0.7" />
      ))}
      <Particles seed={15} n={26} box={[0, 20, 120, 70]} r={[0.4, 1]} fill="#ffd860" />
      <Vig />
    </>
  ),

  battering_ram: (
    <>
      <Bg fill="dt-sky-storm" />
      <rect x="86" y="0" width="34" height="80" fill="url(#dt-stone-dark)" />
      {[10, 20, 30, 40, 50, 60, 70].map((y, i) => (
        <path key={y} d={`M86 ${y} H120 M${i % 2 ? 96 : 104} ${y} V${y + 10}`} stroke="#1e1a16" strokeWidth="0.5" />
      ))}
      <path d="M88 26 H104 V70 H88Z" fill="url(#dt-wood)" />
      <path d="M88 34 H104 M88 52 H104" stroke="url(#dt-iron)" strokeWidth="2.4" />
      <Glow x={86} y={44} r={26} c="warm" />
      <path d="M86 44 L80 36 L84 42 L74 40 L82 45 L74 50 L84 47 L80 54Z" fill="#fffbe0" />
      <path d="M88 44 L96 36 L100 30 M88 44 L98 48 L104 56 M88 44 L94 58" stroke="#140c08" strokeWidth="0.9" fill="none" />
      {[
        [80, 30, 2.4],
        [76, 56, 2],
        [96, 24, 1.6],
        [72, 34, 1.4],
      ].map(([x, y, r], i) => (
        <rect key={i} x={x} y={y} width={r * 1.6} height={r * 1.2} fill="#6a5a48" transform={`rotate(${i * 30} ${x} ${y})`} />
      ))}
      <g fill="#5a4a40" opacity="0.6">
        <circle cx="80" cy="66" r="7" />
        <circle cx="90" cy="70" r="6" />
        <circle cx="72" cy="70" r="5" />
      </g>
      <path d="M0 72 H120 V80 H0Z" fill="#1a120c" />
      <path d="M6 40 L18 22 H56 L68 40Z" fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.6" />
      {[24, 32, 40, 48].map((x) => (
        <line key={x} x1={x} y1="22" x2={x - 6} y2="40" stroke="#3a1a08" strokeWidth="0.6" />
      ))}
      <rect x="10" y="40" width="3" height="22" fill="#3a1a08" />
      <rect x="60" y="40" width="3" height="22" fill="#3a1a08" />
      <line x1="30" y1="40" x2="30" y2="44" stroke="#2a1206" />
      <line x1="50" y1="40" x2="50" y2="44" stroke="#2a1206" />
      <rect x="4" y="43" width="72" height="9" rx="4.5" fill="url(#dt-wood)" stroke="#2a1206" strokeWidth="0.6" />
      <path d="M8 45 H70" stroke="#e0a868" strokeWidth="0.8" opacity="0.6" />
      <path d="M72 41 H80 Q84 47.5 80 54 H72Z" fill="url(#dt-iron)" />
      <path d="M76 42 Q72 36 78 36 Q82 38 79 42 M76 53 Q72 59 78 59 Q82 57 79 53" stroke="url(#dt-steel)" strokeWidth="1.5" fill="none" />
      {[18, 56].map((x) => (
        <g key={x}>
          <circle cx={x} cy="66" r="8" fill="#2a1408" stroke="url(#dt-iron)" strokeWidth="1.6" />
          <circle cx={x} cy="66" r="2" fill="url(#dt-iron)" />
        </g>
      ))}
      <Vig />
    </>
  ),

  mercenary: (
    <>
      <rect width="120" height="80" fill="#160806" />
      <Glow x={60} y={36} r={60} c="fire" />
      <Sword x={60} y={52} angle={-38} len={48} />
      <Sword x={60} y={52} angle={38} len={48} />
      <g transform="translate(60 38)">
        <path d="M0 -26 Q-4 -34 2 -38 Q8 -32 4 -24" fill="url(#dt-red-cloth)" />
        <path d="M-15 4 Q-16 -18 0 -22 Q16 -18 15 4 L10 14 H-10Z" fill="url(#dt-iron)" stroke="#000" strokeWidth="0.5" />
        <path d="M-12 -4 H12 V-1 H-12Z" fill="#000" />
        <path d="M-1 -1 H1 V12 H-1Z" fill="#000" />
        <path d="M-10 -16 Q0 -20 10 -16" stroke="#c8d0d8" strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M-15 4 L-10 14 H10 L15 4" fill="none" stroke="url(#dt-gold)" strokeWidth="1.2" />
      </g>
      <g transform="translate(22 62) rotate(-10)">
        <rect x="-14" y="-10" width="28" height="22" fill="url(#dt-parchment)" />
        <path d="M-10 -5 H10 M-10 -1 H8 M-10 3 H4" stroke="#5a4030" strokeWidth="0.9" />
        <circle cx="8" cy="7" r="3.6" fill="#a01010" />
      </g>
      <path d="M94 62 Q90 54 98 52 Q106 52 104 58 Q110 64 106 76 H90 Q86 68 94 62Z" fill="#5a3a1a" stroke="#2a1606" strokeWidth="0.6" />
      <path d="M95 54 Q100 57 104 54" stroke="url(#dt-gold)" strokeWidth="1.2" fill="none" />
      <Coin x={110} y={74} r={3} />
      <Coin x={86} y={76} r={3} />
      <Particles seed={17} n={22} box={[0, 0, 120, 80]} r={[0.3, 0.9]} fill="#ff9a3a" />
      <Vig />
    </>
  ),

  goddess: (
    <>
      <Bg fill="dt-sky-holy" />
      <Rays x={60} y={34} n={20} len={90} from={0} to={360} fill="#ffffff" op={0.35} />
      <Glow x={60} y={34} r={50} c="white" />
      <g fill="#fffaf0" stroke="#e8c070" strokeWidth="0.5">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <path d={`M48 46 Q${30 - i * 4} ${30 - i * 6} ${12 - i * 2} ${26 - i * 8} Q${26 - i * 2} ${40 - i * 4} 44 52Z`} />
            <path d={`M72 46 Q${90 + i * 4} ${30 - i * 6} ${108 + i * 2} ${26 - i * 8} Q${94 + i * 2} ${40 - i * 4} 76 52Z`} />
          </g>
        ))}
      </g>
      <ellipse cx="60" cy="14" rx="13" ry="3.2" fill="none" stroke="url(#dt-gold)" strokeWidth="2.4" />
      <Glow x={60} y={14} r={16} c="gold" />
      <path d="M44 34 Q42 14 60 14 Q78 14 76 34 Q80 50 72 60 H48 Q40 50 44 34Z" fill="url(#dt-gold)" />
      <path d="M36 80 Q38 58 60 54 Q82 58 84 80Z" fill="url(#dt-tent)" />
      <path d="M52 58 Q60 66 68 58" stroke="#e8c070" strokeWidth="1" fill="none" />
      <ellipse cx="60" cy="34" rx="10" ry="12" fill="#ffe6d0" />
      <path d="M50 28 Q60 18 70 28 Q66 22 60 22 Q54 22 50 28Z" fill="url(#dt-gold)" />
      <path d="M54 33 q2 -1.6 4 0 M62 33 q2 -1.6 4 0" stroke="#7a4a2a" strokeWidth="1" fill="none" />
      <path d="M56 40 Q60 43 64 40" stroke="#d04a4a" strokeWidth="1.2" fill="none" />
      <circle cx="53.5" cy="37" r="1.8" fill="#ffaaaa" opacity="0.5" />
      <circle cx="66.5" cy="37" r="1.8" fill="#ffaaaa" opacity="0.5" />
      <g transform="translate(20 62) rotate(-18)">
        <Glow x={0} y={0} r={11} c="gold" />
        <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill="#fffaf0" stroke="#e8c070" />
        <circle cx="-2.5" cy="-2.5" r="1.3" fill="#2a1a0e" />
        <circle cx="2.5" cy="2.5" r="1.3" fill="#2a1a0e" />
      </g>
      <g transform="translate(100 60) rotate(14)">
        <Glow x={0} y={0} r={11} c="gold" />
        <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill="#fffaf0" stroke="#e8c070" />
        {[
          [-2.5, -2.5],
          [2.5, -2.5],
          [-2.5, 2.5],
          [2.5, 2.5],
          [-2.5, 0],
          [2.5, 0],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.1" fill="#2a1a0e" />
        ))}
      </g>
      <Sparkle x={30} y={14} s={0.8} fill="#fff" />
      <Sparkle x={92} y={10} s={0.6} fill="#fff" />
      <Sparkle x={86} y={40} s={0.5} fill="#fff" />
      <Vig soft />
    </>
  ),

  war_horn: (
    <>
      <Bg fill="dt-sky-war" />
      <Glow x={88} y={26} r={40} c="warm" />
      {[12, 20, 28, 36].map((r, i) => (
        <path key={r} d={`M${84 + r * 0.25} ${24 - r * 0.85} a${r} ${r} 0 0 1 0 ${r * 1.7}`} stroke="#fff2b0" strokeWidth={2.6 - i * 0.5} fill="none" opacity={0.95 - i * 0.2} strokeLinecap="round" />
      ))}
      <path d="M0 64 L10 58 L20 62 L32 56 L46 62 L60 57 L76 62 L92 58 L106 63 L120 59 V80 H0Z" fill="#120404" />
      {Array.from({ length: 20 }, (_, i) => {
        const x = 3 + i * 6;
        const h = 14 + ((i * 7) % 6);
        return (
          <g key={i}>
            <line x1={x} y1="66" x2={x + 1} y2={66 - h} stroke="#120404" strokeWidth="0.9" />
            <path d={`M${x + 0.3} ${67 - h} L${x + 1} ${62 - h} L${x + 1.7} ${67 - h}Z`} fill="#120404" />
          </g>
        );
      })}
      {[18, 58, 96].map((x) => (
        <g key={x}>
          <line x1={x} y1="62" x2={x} y2="38" stroke="#120404" strokeWidth="1" />
          <path d={`M${x} 39 Q${x + 7} 37 ${x + 12} 40 Q${x + 8} 43 ${x + 12} 47 Q${x + 6} 45 ${x} 47Z`} fill="#3a0a06" />
        </g>
      ))}
      <path d="M14 58 Q22 34 50 28 Q66 25 74 14 L86 36 Q72 36 60 42 Q42 50 30 64Z" fill="url(#dt-ivory)" stroke="#5a3a1a" strokeWidth="0.8" />
      <path d="M22 54 Q30 38 52 32" stroke="#fff" strokeWidth="1" opacity="0.6" fill="none" />
      <ellipse cx="80" cy="25" rx="6" ry="12.5" fill="#3a1a0a" stroke="url(#dt-gold)" strokeWidth="2" transform="rotate(-28 80 25)" />
      <Glow x={80} y={25} r={8} c="warm" />
      {[
        [36, 40, 46, 52],
        [52, 32, 60, 44],
        [66, 22, 74, 36],
      ].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke="url(#dt-gold)" strokeWidth="3.4" />
      ))}
      <Particles seed={19} n={18} box={[0, 0, 120, 56]} r={[0.3, 0.9]} fill="#ffb040" />
      <Vig />
    </>
  ),

  holy_spring: (
    <>
      <Bg fill="dt-sky-grotto" />
      <path d="M44 0 L76 0 L96 80 H24Z" fill="url(#dt-beam)" />
      <Glow x={60} y={56} r={46} c="blue" />
      <path d="M0 0 H26 Q14 30 20 80 H0Z" fill="#02090c" />
      <path d="M120 0 H94 Q108 30 100 80 H120Z" fill="#02090c" />
      <ellipse cx="60" cy="70" rx="40" ry="8" fill="url(#dt-marble)" />
      <ellipse cx="60" cy="68" rx="36" ry="5.5" fill="url(#dt-water)" />
      <Glow x={60} y={68} r={30} c="blue" />
      <ellipse cx="60" cy="68" rx="24" ry="3" fill="none" stroke="#e8ffff" strokeWidth="0.6" opacity="0.8" />
      <ellipse cx="60" cy="68" rx="14" ry="1.8" fill="none" stroke="#e8ffff" strokeWidth="0.6" opacity="0.8" />
      <path d="M56 66 L57 38 H63 L64 66Z" fill="url(#dt-marble)" />
      <path d="M44 38 Q60 46 76 38 L74 35 H46Z" fill="url(#dt-marble)" />
      <path d="M60 34 Q48 34 44 52 Q42 60 38 66" stroke="#bff6ff" strokeWidth="2.2" fill="none" opacity="0.9" />
      <path d="M60 34 Q72 34 76 52 Q78 60 82 66" stroke="#bff6ff" strokeWidth="2.2" fill="none" opacity="0.9" />
      <path d="M60 35 V16" stroke="#e8ffff" strokeWidth="2.6" />
      <Glow x={60} y={14} r={10} c="white" />
      <circle cx="60" cy="14" r="3" fill="#fff" />
      {[
        [30, 70],
        [92, 72],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="5" ry="1.8" fill="#2a8a4a" />
          <path d={`M${x - 2} ${y - 1} L${x} ${y - 5} L${x + 2} ${y - 1}Z`} fill="#fff0f6" />
        </g>
      ))}
      <Sparkle x={36} y={30} s={0.8} fill="#e8ffff" />
      <Sparkle x={86} y={24} s={1} fill="#e8ffff" />
      <Sparkle x={78} y={52} s={0.5} fill="#e8ffff" />
      <Particles seed={21} n={26} box={[26, 4, 94, 66]} r={[0.3, 0.9]} fill="#c8f8ff" />
      <Vig />
    </>
  ),
};

// src/assets/cards/<カードID>.(jpg|png|webp) を置くと、そのカードは画像イラストになる（無ければSVG）
const CARD_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../assets/cards/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.replace(/^.*\/|\.[a-z]+$/g, ''), url]),
);

// src/assets/envs/<環境効果ID>.(jpg|png|webp) を置くと、発表画面などにその絵が出る（無ければアイコン）
const ENV_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../assets/envs/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  ).map(([path, url]) => [path.replace(/^.*\/|\.[a-z]+$/g, ''), url]),
);

export function envImage(id: string): string | undefined {
  return ENV_IMAGES[id];
}

export function CardArt({ id }: { id: string }) {
  const img = CARD_IMAGES[id];
  if (img) return <img className="card-img" src={img} alt="" decoding="async" draggable={false} />;
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      {ART[id] ?? <rect width="120" height="80" fill="#444" />}
    </svg>
  );
}

export function TypeIcon({ category }: { category: CardCategory }) {
  return (
    <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
      {category === 'economy' && (
        <>
          <circle cx="10" cy="10" r="6.5" fill="#f2c94c" stroke="#fff" strokeWidth="1.2" />
          <circle cx="10" cy="10" r="3" fill="none" stroke="#b47a1c" strokeWidth="1.3" />
        </>
      )}
      {category === 'attack' && (
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="4" x2="15" y2="15" />
          <line x1="16" y1="4" x2="5" y2="15" />
          <line x1="12" y1="15" x2="16" y2="11" strokeWidth="1.5" />
          <line x1="8" y1="15" x2="4" y2="11" strokeWidth="1.5" />
        </g>
      )}
      {category === 'counter' && <path d="M4 4 H16 V10 Q16 15 10 17 Q4 15 4 10Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />}
      {category === 'magic' && <path d="M10 2.5 L12 8 L17.5 8.5 L13.2 12 L14.6 17.5 L10 14.5 L5.4 17.5 L6.8 12 L2.5 8.5 L8 8Z" fill="#fff" />}
    </svg>
  );
}
