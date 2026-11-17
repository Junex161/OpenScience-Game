// Scoreboard: always local (this browser), optionally global via Supabase.
//
// Global scores need a tiny free backend because a static site cannot store
// shared data. To switch it on, create a Supabase project with a table
//   scores(id bigint generated always as identity, name text, score int,
//          difficulty text, created_at timestamptz default now())
// allow anonymous insert + select via row level security, and set
//   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.
// Without those variables the game silently uses the local board only.
import type { Difficulty } from './state';

export interface ScoreEntry { name: string; score: number; difficulty: Difficulty; date: string }

const LOCAL_KEY = 'osgame.scores.v1';
const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const onlineEnabled = !!(URL_ && KEY_);

export function localScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch { return []; }
}

export function addLocal(e: ScoreEntry) {
  const all = [...localScores(), e].sort((a, b) => b.score - a.score).slice(0, 200);
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return all;
}

/** Share of entries with a lower score, in percent. */
export function percentile(all: { score: number }[], score: number) {
  const others = all.length - 1;
  if (others <= 0) return null;
  const lower = all.filter((e) => e.score < score).length;
  return Math.round((lower / others) * 100);
}

const headers = () => ({ apikey: KEY_, Authorization: `Bearer ${KEY_}`, 'Content-Type': 'application/json' });

export async function submitOnline(e: ScoreEntry): Promise<boolean> {
  if (!onlineEnabled) return false;
  try {
    const r = await fetch(`${URL_}/rest/v1/scores`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ name: e.name.slice(0, 16), score: e.score, difficulty: e.difficulty }) });
    return r.ok;
  } catch { return false; }
}

export async function fetchOnline(): Promise<ScoreEntry[] | null> {
  if (!onlineEnabled) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/scores?select=name,score,difficulty,created_at&order=score.desc&limit=1000`, { headers: headers() });
    if (!r.ok) return null;
    const rows = (await r.json()) as { name: string; score: number; difficulty: Difficulty; created_at: string }[];
    return rows.map((x) => ({ name: x.name, score: x.score, difficulty: x.difficulty, date: x.created_at }));
  } catch { return null; }
}
