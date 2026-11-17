// Save game: everything the player has done lives here and in localStorage.
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SaveData {
  name: string;
  difficulty: Difficulty;
  area: string;
  spawn: string; // spawn point id inside the area
  hp: number; // in half hearts
  maxHp: number; // in half hearts
  heartPieces: number;
  shards: number;
  keys: Record<string, number>; // small keys per dungeon
  items: string[]; // sword, lantern, bigkey-archive ...
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  quests: Record<string, number>; // quest id -> stage (0 = unknown)
  notes: string[]; // unlocked Field Notes
  startedAt: number;
  playMs: number;
  deaths: number;
}

const KEY = 'replica.save.v1';

export const DIFF = {
  easy: { dmg: 1, hearts: 4, enemySpeed: 0.8, label: 'Explorer', blurb: 'Gentle enemies, more hearts. Enjoy the story.' },
  normal: { dmg: 1, hearts: 3, enemySpeed: 1, label: 'Adventurer', blurb: 'The intended balance.' },
  hard: { dmg: 2, hearts: 3, enemySpeed: 1.2, label: 'Reviewer #2', blurb: 'Enemies hit twice as hard. No mercy.' },
} as const;

function fresh(): SaveData {
  return {
    name: '', difficulty: 'normal', area: 'haven', spawn: 'start', hp: 6, maxHp: 6, heartPieces: 0, shards: 0,
    keys: {}, items: [], flags: {}, counters: {}, quests: {}, notes: [], startedAt: Date.now(), playMs: 0, deaths: 0,
  };
}

class GameState {
  data: SaveData = fresh();
  admin = false;
  muted = false;
  god = false;

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
      this.muted = localStorage.getItem('replica.muted') === '1';
    } catch { /* no storage: keep defaults */ }
    try {
      if (new URLSearchParams(location.search).has('admin')) this.admin = true;
    } catch { /* ignore */ }
  }

  get hasSave() {
    try { return !!localStorage.getItem(KEY); } catch { return false; }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  newGame(name: string, difficulty: Difficulty) {
    this.data = { ...fresh(), name, difficulty };
    this.data.maxHp = DIFF[difficulty].hearts * 2;
    this.data.hp = this.data.maxHp;
    this.save();
  }

  get diff() { return DIFF[this.data.difficulty]; }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem('replica.muted', m ? '1' : '0'); } catch { /* ignore */ }
  }

  has(item: string) { return this.data.items.includes(item); }
  give(item: string) { if (!this.has(item)) this.data.items.push(item); }
  flag(f: string) { return !!this.data.flags[f]; }
  set(f: string, v = true) { this.data.flags[f] = v; }
  count(c: string) { return this.data.counters[c] ?? 0; }
  inc(c: string, n = 1) { this.data.counters[c] = this.count(c) + n; return this.data.counters[c]; }
  quest(q: string) { return this.data.quests[q] ?? 0; }
  setQuest(q: string, stage: number) { this.data.quests[q] = Math.max(this.quest(q), stage); }
}

export const state = new GameState();
