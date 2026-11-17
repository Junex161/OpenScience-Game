// Publication bias toy model: many studies of the same small true effect,
// only the "significant" ones (plus a few others) get published.
import { normal, rng } from './stats';

export interface MiniStudy { d: number; se: number; n: number; published: boolean; sig: boolean }

export function makeLiterature(trueD: number, count: number, seed: number): MiniStudy[] {
  const r = rng(seed);
  const out: MiniStudy[] = [];
  for (let i = 0; i < count; i++) {
    const n = Math.round(10 + Math.pow(r(), 1.8) * 190); // many small, few large studies
    const se = Math.sqrt(2 / n + (trueD * trueD) / (4 * n));
    const d = trueD + normal(r) * se;
    const sig = d / se > 1.96;
    const published = sig || r() < 0.12;
    out.push({ d, se, n, published, sig });
  }
  return out;
}

/** Fixed-effect (inverse-variance weighted) meta-analytic estimate. */
export function pooled(studies: MiniStudy[]): number {
  let w = 0;
  let s = 0;
  for (const st of studies) {
    const wi = 1 / (st.se * st.se);
    w += wi;
    s += wi * st.d;
  }
  return w ? s / w : 0;
}

/** Normal CDF (Abramowitz-Stegun approximation). */
export function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Approximate power of a two-sided two-sample t-test (normal approximation). */
export function power(d: number, nPerGroup: number, alpha = 0.05): number {
  const z = alpha === 0.05 ? 1.959964 : 1.959964;
  return phi(d * Math.sqrt(nPerGroup / 2) - z);
}

/** n per group needed for the given power. */
export function nFor(d: number, target = 0.8): number {
  for (let n = 4; n < 5000; n++) if (power(d, n) >= target) return n;
  return 5000;
}
