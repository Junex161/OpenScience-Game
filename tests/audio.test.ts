import { describe, expect, it } from 'vitest';
import { chordOf, parseLine, SONGS } from '../src/core/audio';

// The soundtrack is written by hand as text, so typos are easy to make.
// These checks catch wrong note names, bars that do not add up and
// melodies that clash with their chords.
describe('songs', () => {
  for (const [id, s] of Object.entries(SONGS)) {
    describe(id, () => {
      const chords = s.chords.split(/\s+/).map(chordOf);
      const lead = parseLine(s.lead);
      it('melody fills the bars exactly', () => {
        expect(lead.length).toBe(chords.length * 16);
        const bars = s.lead.split('|').map((b) => parseLine(b).length);
        for (const b of bars) expect(b).toBe(16);
      });
      it('uses valid notes in a comfortable range', () => {
        for (const ev of lead.events.values()) {
          expect(ev.midi).toBeGreaterThanOrEqual(67);
          expect(ev.midi).toBeLessThanOrEqual(93);
        }
      });
      it('patterns have 16 steps', () => {
        for (const p of [s.bass, s.arp, s.kick, s.snare, s.hat]) if (p) expect(p.length).toBe(16);
      });
      it('long and accented notes sit on chord tones (or gentle extensions)', () => {
        let ok = 0, n = 0;
        for (const [st, ev] of lead.events) {
          if (st % 8 !== 0 && ev.dur < 6) continue;
          const ch = chords[Math.floor(st / 16)];
          const rel = (((ev.midi - ch.root) % 12) + 12) % 12;
          n++;
          // root, third, fifth, plus 2nd/6th/7th as colour tones
          if (ch.tones.includes(rel) || rel === 0 || [2, 9, 10].includes(rel)) ok++;
        }
        expect(ok / n).toBeGreaterThan(0.85);
      });
    });
  }
});
