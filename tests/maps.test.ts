import { describe, expect, it } from 'vitest';
import { SOLID_TERRAIN, terrainGrid } from '../src/art/terrain';
import { KINDS } from '../src/world/kinds';
import { AREAS } from '../src/world/maps';

describe('area maps', () => {
  for (const a of Object.values(AREAS)) {
    describe(a.id, () => {
      it('is rectangular', () => {
        expect(a.rows.length).toBe(a.h);
        for (const r of a.rows) expect(r.length).toBe(a.w);
      });
      it('spawns on walkable ground', () => {
        const g = terrainGrid(a.rows, a.w, a.h);
        for (const [name, [x, y]] of Object.entries(a.spawns)) {
          const tx = Math.floor(x), ty = Math.floor(y - 0.1);
          expect(SOLID_TERRAIN.has(g[ty][tx]), `${a.id}:${name}`).toBe(false);
          expect('TYD'.includes(a.rows[ty][tx]), `${a.id}:${name} in a tree`).toBe(false);
        }
      });
      it('only uses known object kinds', () => {
        for (const o of a.objects) expect(KINDS[o.kind], o.kind).toBeTruthy();
      });
      it('warps lead to existing areas and spawns', () => {
        for (const wp of a.warps) {
          expect(AREAS[wp.to]).toBeTruthy();
          expect(AREAS[wp.to].spawns[wp.spawn], `${a.id} -> ${wp.to}:${wp.spawn}`).toBeTruthy();
          expect(wp.x >= 0 && wp.y >= 0 && wp.x + wp.w <= a.w && wp.y + wp.h <= a.h).toBe(true);
        }
      });
    });
  }
});
