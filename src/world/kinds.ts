// Static description of every placeable object: sprite, solid footprint
// (relative to the foot point), shadow and behaviour tags.
export interface Kind {
  tex: string;
  frames?: number; // animated sheet frame count
  fps?: number;
  solid?: [number, number, number, number]; // x, y, w, h relative to the foot point
  shadow?: [number, number]; // rx, ry baked into the ground
  tags?: string[]; // interact | cut | break | pickup | glow | wall
  glow?: number; // tint of a soft light
  originY?: number;
  /** Painted for the night already (or glowing): do not apply the moonlight tint. */
  lit?: boolean;
  /** Small lights: x, y relative to the foot point, tint, scale. */
  lights?: [number, number, number, number][];
}

export const KINDS: Record<string, Kind> = {
  'tree-green': { tex: 'tree-green', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true, lights: [[0, -18, 0x7af3ff, 0.5]] },
  'tree-green2': { tex: 'tree-green2', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true, lights: [[0, -18, 0x7af3ff, 0.5]] },
  'tree-violet': { tex: 'tree-violet', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true, lights: [[0, -18, 0xff8fe0, 0.5]] },
  'tree-dark': { tex: 'tree-dark', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true },
  'tree-dark2': { tex: 'tree-dark2', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true },
  'tree-gold': { tex: 'tree-gold', solid: [-6, -7, 12, 7], shadow: [14, 5], lit: true, lights: [[0, -18, 0xffd77a, 0.5]] },
  bush: { tex: 'bush', solid: [-7, -11, 14, 11], tags: ['cut'], shadow: [7, 3], lit: true },
  rock: { tex: 'rock', solid: [-7, -11, 14, 11], shadow: [7, 3] },
  mushroom: { tex: 'mushroom', frames: 2, fps: 1.5, tags: ['glow'], glow: 0x5ef0ff, lit: true },
  fence: { tex: 'fence', solid: [-8, -9, 16, 7] },
  sign: { tex: 'sign', solid: [-5, -7, 10, 7], tags: ['interact'], shadow: [6, 2] },
  lamp: { tex: 'lamp', frames: 2, fps: 3, solid: [-3, -4, 6, 4], tags: ['glow'], glow: 0xffd77a, shadow: [5, 2], lit: true },
  chest: { tex: 'chest', solid: [-7, -11, 14, 11], tags: ['interact', 'chest'], shadow: [7, 2] },
  bigchest: { tex: 'bigchest', solid: [-10, -14, 20, 14], tags: ['interact', 'chest'], shadow: [11, 3] },
  pot: { tex: 'pot', solid: [-6, -10, 12, 10], tags: ['break'], shadow: [6, 2] },
  crate: { tex: 'crate', solid: [-7, -12, 14, 12], shadow: [7, 2] },
  barrel: { tex: 'barrel', solid: [-6, -11, 12, 11], shadow: [6, 2] },
  'house-red': { tex: 'house-red', solid: [-26, -30, 52, 28], tags: ['interact'], shadow: [30, 5], lights: [[-14, -20, 0xffc860, 0.42], [14, -20, 0xffc860, 0.42], [0, -44, 0x7af3ff, 0.25]] },
  'house-teal': { tex: 'house-teal', solid: [-26, -30, 52, 28], tags: ['interact'], shadow: [30, 5], lights: [[-14, -20, 0xffc860, 0.42], [14, -20, 0xffc860, 0.42], [0, -44, 0x7af3ff, 0.25]] },
  'house-violet': { tex: 'house-violet', solid: [-26, -30, 52, 28], tags: ['interact'], shadow: [30, 5], lights: [[-14, -20, 0xffc860, 0.42], [14, -20, 0xffc860, 0.42], [0, -44, 0x7af3ff, 0.25]] },
  'house-gold': { tex: 'house-gold', solid: [-26, -30, 52, 28], tags: ['interact'], shadow: [30, 5], lights: [[-14, -20, 0xffc860, 0.42], [14, -20, 0xffc860, 0.42], [0, -44, 0x7af3ff, 0.25]] },
  library: { tex: 'library', solid: [-42, -36, 84, 34], tags: ['interact'], shadow: [44, 5], lights: [[0, -56, 0x5ec8e8, 1], [-27, -24, 0x9ee8ff, 0.3], [27, -24, 0x9ee8ff, 0.3]] },
  beacon: { tex: 'beacon', solid: [-12, -12, 24, 10], tags: ['interact', 'glow'], glow: 0x5ef0ff, shadow: [13, 3], lit: true },
  'stall-red': { tex: 'stall-red', solid: [-23, -14, 46, 12], tags: ['interact'], shadow: [22, 3] },
  'stall-blue': { tex: 'stall-blue', solid: [-23, -14, 46, 12], tags: ['interact'], shadow: [22, 3] },
  well: { tex: 'well', solid: [-12, -14, 24, 12], tags: ['interact'], shadow: [13, 3] },
  'archive-gate': { tex: 'archive-gate', shadow: [38, 4], lights: [[0, -48, 0x2bb7d6, 0.35]] },
  'statue-gold': { tex: 'statue-gold', solid: [-9, -9, 18, 8], shadow: [9, 3] },
  drawer: { tex: 'drawer', solid: [-7, -8, 14, 8], tags: ['interact'] },
  torch: { tex: 'torch', frames: 3, fps: 8, tags: ['glow', 'wall'], glow: 0xffa040 },
  'door-locked': { tex: 'door-locked', solid: [-16, -32, 32, 32], tags: ['interact', 'door'] },
  'door-boss': { tex: 'door-boss', solid: [-16, -32, 32, 32], tags: ['interact', 'door'] },
  pillar: { tex: 'pillar', solid: [-6, -7, 12, 7], shadow: [7, 2] },
  'beetle-gold': { tex: 'beetle-gold', frames: 2, fps: 4, tags: ['pickup'], lit: true },
  'beetle-red': { tex: 'beetle-red', frames: 2, fps: 4, tags: ['pickup'], lit: true },
  'beetle-green': { tex: 'beetle-green', frames: 2, fps: 4, tags: ['pickup'], lit: true },
  'heart-piece': { tex: 'heart-piece', tags: ['pickup', 'glow'], glow: 0xff7a9a, lit: true },
};

/** Map characters that spawn objects. */
export const CHAR_OBJECT: Record<string, (x: number, y: number, h: number) => string> = {
  T: (x, y, h) => (h < 0.5 ? 'tree-green' : 'tree-green2'),
  Y: () => 'tree-violet',
  D: (x, y, h) => (h < 0.5 ? 'tree-dark' : 'tree-dark2'),
  b: () => 'bush',
  o: () => 'rock',
  f: () => 'fence',
  m: () => 'mushroom',
};
