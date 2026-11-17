import { describe, expect, it } from 'vitest';
import { pFromT, tTest } from '../src/stats/stats';
import { analyse, falsePositiveRates, findPlayableStudy, PLANNED } from '../src/stats/forking';

describe('t-test', () => {
  it('matches reference p-values', () => {
    expect(pFromT(2.0, 38)).toBeCloseTo(0.0527, 3);
    expect(pFromT(2.024, 38)).toBeCloseTo(0.05, 3);
    expect(pFromT(0, 10)).toBeCloseTo(1, 6);
    expect(pFromT(3.5, 20)).toBeCloseTo(0.00224, 4);
  });

  it('computes a known two-sample example', () => {
    const r = tTest([5, 6, 7, 8, 9], [1, 2, 3, 4, 5]);
    expect(r.t).toBeCloseTo(4, 6);
    expect(r.df).toBe(8);
    expect(r.p).toBeCloseTo(0.00395, 4);
  });
});

describe('forking paths', () => {
  it('planned analysis keeps the nominal 5% error rate', () => {
    const { planned } = falsePositiveRates(2000, 3);
    expect(planned).toBeGreaterThan(0.03);
    expect(planned).toBeLessThan(0.07);
  });

  it('flexible analysis inflates false positives a lot', () => {
    const { hacked } = falsePositiveRates(2000, 3);
    expect(hacked).toBeGreaterThan(0.2);
  });

  it('finds a playable study that starts non-significant', () => {
    const { study } = findPlayableStudy();
    expect(analyse(study, PLANNED).p).toBeGreaterThan(0.3);
  });
});
