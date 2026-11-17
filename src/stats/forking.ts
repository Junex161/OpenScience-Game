// "Garden of forking paths": a study with NO true effect, and the analysis
// choices (researcher degrees of freedom) that can still make it "significant".
// Modelled on the four choices in Simmons, Nelson & Simonsohn (2011).
import { normal, rng, tTest, mean, sd } from './stats';

export type Measure = 'dv1' | 'dv2' | 'avg';
export type Comparison = 'low' | 'high' | 'both';

export interface Choices {
  measure: Measure;
  comparison: Comparison;
  removeOutliers: boolean;
  moreData: boolean;
}

export const BASE_N = 20; // participants per group as planned
export const EXTRA_N = 10; // collected "a bit more" if not significant

export interface Person { dv1: number; dv2: number }
export interface Study { control: Person[]; low: Person[]; high: Person[] }

/** All groups come from the same population: the true effect is exactly zero. */
export function makeStudy(seed: number, r = 0.5): Study {
  const rand = rng(seed);
  const person = (): Person => {
    const z1 = normal(rand);
    const z2 = normal(rand);
    return { dv1: z1, dv2: r * z1 + Math.sqrt(1 - r * r) * z2 };
  };
  const group = () => Array.from({ length: BASE_N + EXTRA_N }, person);
  return { control: group(), low: group(), high: group() };
}

function score(p: Person, m: Measure): number {
  return m === 'dv1' ? p.dv1 : m === 'dv2' ? p.dv2 : (p.dv1 + p.dv2) / 2;
}

function trimOutliers(xs: number[]): number[] {
  const m = mean(xs);
  const s = sd(xs);
  return xs.filter((x) => Math.abs(x - m) <= 2 * s);
}

export interface Analysis {
  treatment: number[];
  control: number[];
  /** values dropped by the outlier rule (for the visualisation) */
  droppedTreatment: number[];
  droppedControl: number[];
  p: number;
  d: number;
}

export function analyse(study: Study, c: Choices): Analysis {
  const n = c.moreData ? BASE_N + EXTRA_N : BASE_N;
  const take = (g: Person[]) => g.slice(0, n).map((p) => score(p, c.measure));
  let control = take(study.control);
  let treatment =
    c.comparison === 'low' ? take(study.low)
      : c.comparison === 'high' ? take(study.high)
        : [...take(study.low), ...take(study.high)];
  let droppedControl: number[] = [];
  let droppedTreatment: number[] = [];
  if (c.removeOutliers) {
    const kc = trimOutliers(control);
    const kt = trimOutliers(treatment);
    droppedControl = control.filter((x) => !kc.includes(x));
    droppedTreatment = treatment.filter((x) => !kt.includes(x));
    control = kc;
    treatment = kt;
  }
  const res = tTest(treatment, control);
  return { treatment, control, droppedTreatment, droppedControl, p: res.p, d: res.d };
}

export const PLANNED: Choices = { measure: 'dv1', comparison: 'both', removeOutliers: false, moreData: false };

export function allChoices(): Choices[] {
  const out: Choices[] = [];
  for (const measure of ['dv1', 'dv2', 'avg'] as Measure[])
    for (const comparison of ['low', 'high', 'both'] as Comparison[])
      for (const removeOutliers of [false, true])
        for (const moreData of [false, true]) out.push({ measure, comparison, removeOutliers, moreData });
  return out;
}

/** Smallest p-value a flexible researcher can find in this study. */
export function bestP(study: Study): number {
  return Math.min(...allChoices().map((c) => analyse(study, c).p));
}

/**
 * Simulate many null studies. Returns the share that comes out significant
 * with the single planned analysis vs. when every fork may be tried.
 */
export function falsePositiveRates(nStudies: number, seed = 1): { planned: number; hacked: number; perStudy: { planned: boolean; hacked: boolean }[] } {
  const perStudy = [];
  let planned = 0;
  let hacked = 0;
  for (let i = 0; i < nStudies; i++) {
    const s = makeStudy(seed * 100003 + i);
    const pl = analyse(s, PLANNED).p < 0.05;
    const hk = pl || bestP(s) < 0.05;
    planned += pl ? 1 : 0;
    hacked += hk ? 1 : 0;
    perStudy.push({ planned: pl, hacked: hk });
  }
  return { planned: planned / nStudies, hacked: hacked / nStudies, perStudy };
}

/**
 * Find a study for the interactive workshop: the planned analysis is clearly
 * not significant, but some fork reaches p < .05 (so the player can "succeed").
 */
export function findPlayableStudy(startSeed = 7): { seed: number; study: Study } {
  for (let seed = startSeed; ; seed++) {
    const study = makeStudy(seed);
    if (analyse(study, PLANNED).p < 0.3) continue;
    const ps = allChoices().map((c) => analyse(study, c).p);
    const hits = ps.filter((p) => p < 0.05).length;
    if (hits >= 1 && hits <= 4) return { seed, study };
  }
}
