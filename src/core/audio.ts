// Soundtrack + sound effects with the Web Audio API. No audio files.
// A small tracker: every song has a hand-written melody, a chord
// progression that drives pad, bass and arpeggio, and a drum pattern.
// The instruments are soft on purpose (bell, flute, pad, room reverb),
// only the fight themes use classic square-wave leads.
import { state } from './state';

type Voice = 'bell' | 'flute' | 'pulse';

export interface Song {
  bpm: number;
  /** one chord per bar, e.g. 'Am F C G' */
  chords: string;
  /** melody: 'note:steps' tokens, 16 steps per bar, '-' is a rest */
  lead: string;
  voice: Voice;
  /** 16-step bass pattern: r root, f fifth, o octave, t third, '.' rest */
  bass: string;
  /** 16-step arpeggio pattern over chord tones 1 3 5 8, '.' rest */
  arp?: string;
  kick?: string;
  snare?: string;
  hat?: string;
  leadVol?: number;
  padVol?: number;
  arpVol?: number;
  bassVol?: number;
  drumVol?: number;
  /** 0..1 how much of the lead goes into the echo */
  echo?: number;
}

// ---------------------------------------------------------------------
// The songs. All original, written for this game.
// ---------------------------------------------------------------------
export const SONGS: Record<string, Song> = {
  // Title: "Lumen". Wistful and hopeful, A minor, music-box lead.
  title: {
    bpm: 88, voice: 'bell',
    chords: 'Am F C G Am F G Am F G Em Am F G Am E',
    lead:
      'a4:2 c5:2 e5:8 d5:2 c5:2 | d5:6 c5:2 a4:8 | g4:2 c5:2 e5:8 d5:2 e5:2 | d5:12 -:2 b4:2 | ' +
      'a4:2 c5:2 e5:8 g5:2 e5:2 | f5:6 e5:2 c5:8 | d5:4 e5:4 d5:4 b4:4 | a4:12 -:4 | ' +
      'a5:6 g5:2 f5:4 c5:4 | g5:6 f5:2 e5:2 d5:6 | e5:4 g5:4 b5:6 a5:2 | a5:12 -:4 | ' +
      'f5:4 a5:4 c6:6 a5:2 | b5:4 g5:4 d5:4 g5:4 | a5:8 e5:4 c5:4 | b4:8 e5:4 g#5:4',
    bass: 'r.......f.......',
    arp: '1.3.5.3.8.5.3.5.',
    leadVol: 0.9, padVol: 0.8, arpVol: 0.35, bassVol: 0.7, echo: 0.5,
  },
  // Haven: a calm night lullaby for the village. C major.
  haven: {
    bpm: 80, voice: 'bell',
    chords: 'C Am F G C Em F G C Am F G Am F G C',
    lead:
      'e5:4 g5:2 e5:2 c5:4 d5:2 e5:2 | a4:6 c5:2 e5:8 | f5:4 a5:2 f5:2 d5:4 e5:2 f5:2 | g5:6 d5:2 b4:8 | ' +
      'e5:4 g5:2 e5:2 c6:4 b5:2 a5:2 | g5:6 e5:2 b4:8 | a4:2 c5:2 f5:4 e5:4 d5:4 | d5:12 -:4 | ' +
      'g5:4 c6:2 g5:2 e5:4 g5:4 | a5:6 g5:2 e5:8 | f5:2 g5:2 a5:4 c6:4 a5:4 | g5:8 d5:4 g5:4 | ' +
      'e5:6 d5:2 c5:4 e5:4 | f5:6 e5:2 d5:2 c5:6 | d5:4 g5:4 f5:4 d5:4 | c5:12 -:4',
    bass: 'r.......f...r...',
    arp: '..1.3.5...1.3.5.',
    leadVol: 0.85, padVol: 0.9, arpVol: 0.3, bassVol: 0.65, echo: 0.45,
  },
  // Woods: the adventure theme. Striding, heroic, E minor, flute lead.
  woods: {
    bpm: 112, voice: 'flute',
    chords: 'Em C D Em Em C D B G D Em C G D C B',
    lead:
      'e5:3 e5:1 g5:4 b5:6 a5:2 | g5:4 e5:2 g5:2 e5:8 | f#5:3 f#5:1 a5:4 d6:6 c6:2 | b5:12 -:4 | ' +
      'e5:3 e5:1 g5:4 b5:4 e6:4 | d6:4 c6:2 b5:2 g5:8 | a5:4 f#5:4 a5:4 d6:4 | b5:8 d#6:4 f#6:4 | ' +
      'd6:6 b5:2 g5:4 b5:4 | a5:6 f#5:2 d5:8 | g5:4 b5:4 e6:6 d6:2 | c6:8 e5:4 g5:4 | ' +
      'd6:6 b5:2 g5:4 d6:4 | f#6:6 e6:2 d6:8 | e6:4 c6:4 g5:4 c6:4 | b5:4 a5:4 f#5:4 d#5:4',
    bass: 'r...r.f.r...f.o.',
    arp: '1.5.3.5.1.5.3.5.',
    kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.',
    leadVol: 0.8, padVol: 0.6, arpVol: 0.22, bassVol: 0.75, drumVol: 0.45, echo: 0.3,
  },
  // Archive: slow and hollow, with a half-step of unease. A minor.
  archive: {
    bpm: 66, voice: 'bell',
    chords: 'Am Bb Am E Dm Am Bb E',
    lead:
      '-:4 e5:4 a5:8 | -:4 f5:4 a#5:6 a5:2 | e5:8 c5:8 | b4:12 -:4 | ' +
      '-:4 d5:4 f5:4 a5:4 | g5:2 e5:6 c5:8 | d5:4 f5:4 a#5:8 | g#5:12 -:4',
    bass: 'r...............',
    arp: '1...5...8...5...',
    kick: 'x...............', hat: '........x.....x.',
    leadVol: 0.7, padVol: 1, arpVol: 0.3, bassVol: 0.7, drumVol: 0.25, echo: 0.8,
  },
  // Boss: fast and driving. D minor.
  boss: {
    bpm: 152, voice: 'pulse',
    chords: 'Dm Dm Bb C Dm Dm Bb A',
    lead:
      'd5:2 d5:2 f5:2 a5:2 d6:4 a5:4 | c6:2 a5:2 f5:2 a5:2 d5:8 | d5:2 f5:2 a#5:2 d6:2 f6:4 d6:4 | e6:2 c6:2 g5:2 c6:2 e6:8 | ' +
      'd6:2 a5:2 d6:2 f6:2 a6:4 f6:4 | e6:2 d6:2 c6:2 a5:2 d6:8 | a#5:4 d6:4 f6:4 d6:4 | e6:4 c#6:4 a5:4 c#6:4',
    bass: 'r.rorfr.r.rorfro',
    arp: '1358135813581358',
    kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    leadVol: 0.75, padVol: 0.45, arpVol: 0.16, bassVol: 0.85, drumVol: 0.6, echo: 0.2,
  },
  // Raid: the short, urgent loop of the opening fight. E minor.
  raid: {
    bpm: 144, voice: 'pulse',
    chords: 'Em Em C D',
    lead: 'e5:2 g5:2 b5:4 a5:2 g5:2 e5:4 | e5:2 g5:2 b5:4 d6:2 b5:2 g5:4 | c6:4 g5:4 e5:4 g5:4 | f#5:4 a5:4 d6:4 f#5:4',
    bass: 'r.r.r.o.r.r.f.o.',
    arp: '1.5.8.5.1.5.8.5.',
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.',
    leadVol: 0.7, padVol: 0.4, arpVol: 0.16, bassVol: 0.85, drumVol: 0.55, echo: 0.2,
  },
};

// ---------------------------------------------------------------------
const NOTE: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function noteToMidi(n: string): number {
  const m = /^([a-g])(#|b)?(\d)$/.exec(n);
  if (!m) return -1;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

interface Ev { midi: number; dur: number }
/** Parses 'a4:2 c5:2 | -:4 ...' into a map from start step to event. */
export function parseLine(src: string): { events: Map<number, Ev>; length: number } {
  const events = new Map<number, Ev>();
  let step = 0;
  for (const tok of src.replace(/\|/g, ' ').split(/\s+/)) {
    if (!tok) continue;
    const [n, d] = tok.split(':');
    const dur = Number(d ?? 2);
    if (n !== '-') events.set(step, { midi: noteToMidi(n), dur });
    step += dur;
  }
  return { events, length: step };
}

/** Chord name -> root (MIDI, octave 3) and chord tones in semitones. */
export function chordOf(name: string): { root: number; tones: number[] } {
  const m = /^([A-G])(#|b)?(m)?$/.exec(name)!;
  const root = 48 + NOTE[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const third = m[3] ? 3 : 4;
  return { root, tones: [0, third, 7, 12] };
}

/** All instruments. Works on a live AudioContext and on an offline one (tests). */
class Synth {
  music: GainNode;
  private delayIn: GainNode;
  private verbIn: GainNode;
  private noise: AudioBuffer;
  private waves: Record<string, PeriodicWave> = {};

  constructor(private ctx: BaseAudioContext, out: AudioNode) {
    this.music = ctx.createGain();
    this.music.gain.value = 0.78;
    // a gentle low-pass keeps everything round
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 6000;
    this.music.connect(soft).connect(out);
    // echo
    this.delayIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 2400;
    this.delayIn.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    lp.connect(wet).connect(this.music);
    // room reverb from a generated impulse response
    this.verbIn = ctx.createGain();
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const n = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        prev = prev * 0.55 + n * 0.45; // darken the tail
        d[i] = prev;
      }
    }
    conv.buffer = ir;
    const vWet = ctx.createGain();
    vWet.gain.value = 0.5;
    this.verbIn.connect(conv).connect(vWet).connect(this.music);
    // pulse waves (the classic console sound) for the fight themes
    for (const duty of [0.125, 0.25]) {
      const n = 24;
      const real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      this.waves[String(duty)] = ctx.createPeriodicWave(real, imag);
    }
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  private send(g: AudioNode, echo: number, verb: number) {
    g.connect(this.music);
    if (echo > 0) { const e = this.ctx.createGain(); e.gain.value = echo; g.connect(e).connect(this.delayIn); }
    if (verb > 0) { const v = this.ctx.createGain(); v.gain.value = verb; g.connect(v).connect(this.verbIn); }
  }

  /** Music-box / celesta: a few sine partials with a long natural decay. */
  bell(f: number, t: number, len: number, vol: number, echo: number) {
    const ctx = this.ctx;
    const ring = Math.max(0.9, len * 1.6);
    for (const [mul, amp, dec] of [[1, 1, 1], [2, 0.32, 0.55], [3, 0.1, 0.3], [4.2, 0.05, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ring * dec);
      o.connect(g);
      this.send(g, echo * 0.6, 0.5);
      o.start(t);
      o.stop(t + ring * dec + 0.05);
    }
  }

  /** Soft flute: triangle with a breathy attack and late vibrato. */
  flute(f: number, t: number, len: number, vol: number, echo: number) {
    const ctx = this.ctx;
    const end = t + Math.max(0.08, len * 0.94);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.035);
    g.gain.linearRampToValueAtTime(vol * 0.8, t + 0.12);
    g.gain.setValueAtTime(vol * 0.8, Math.max(t + 0.12, end - 0.07));
    g.gain.linearRampToValueAtTime(0.0001, end);
    for (const [mul, amp, type] of [[1, 1, 'triangle'], [2, 0.18, 'sine']] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      if (len > 0.3) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5.2;
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(f * mul * 0.006, t + 0.35);
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t); lfo.stop(end + 0.02);
      }
      o.connect(og).connect(g);
      o.start(t);
      o.stop(end + 0.02);
    }
    this.send(g, echo, 0.35);
  }

  pulse(f: number, t: number, len: number, vol: number, duty: number, echo: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.setPeriodicWave(this.waves[String(duty)]);
    o.frequency.value = f;
    const g = ctx.createGain();
    const end = t + Math.max(0.05, len * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.linearRampToValueAtTime(vol * 0.65, t + 0.08);
    g.gain.setValueAtTime(vol * 0.65, Math.max(t + 0.08, end - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, end);
    o.connect(g);
    this.send(g, echo, 0.2);
    o.start(t);
    o.stop(end + 0.02);
  }

  /** Warm chord pad: detuned triangles behind a low-pass, slow swell. */
  pad(root: number, tones: number[], t: number, len: number, vol: number) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, len * 0.3));
    g.gain.setValueAtTime(vol, t + len * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    for (const tone of tones.slice(0, 3)) {
      for (const det of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(root + 12 + tone);
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.3);
      }
    }
    lp.connect(g);
    this.send(g, 0, 0.6);
  }

  bassNote(f: number, t: number, len: number, vol: number) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.linearRampToValueAtTime(vol * 0.55, t + len * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    for (const [mul, amp, type] of [[1, 1, 'triangle'], [0.5, 0.5, 'sine']] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + len + 0.02);
    }
    g.connect(this.music);
  }

  env(g: GainNode, t: number, a: number, peak: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  kick(t: number, vol: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    this.env(g, t, 0.003, 0.5 * vol, 0.2);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.22);
  }

  noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, bus?: AudioNode) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, 0.002, Math.max(vol, 0.0002), dur);
    src.connect(f).connect(g).connect(bus ?? this.music);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Schedules everything that starts on one 16th-note step of a song. */
  step(s: Song, lead: ReturnType<typeof parseLine>, chords: ReturnType<typeof chordOf>[], st: number, t: number) {
    const dur = 60 / s.bpm / 4;
    const bar = Math.floor(st / 16), i = st % 16;
    const ch = chords[bar % chords.length];
    const lv = (s.leadVol ?? 0.8) * 0.2;
    const ev = lead.events.get(st % lead.length);
    if (ev) {
      const f = mtof(ev.midi), len = ev.dur * dur, echo = s.echo ?? 0.3;
      if (s.voice === 'bell') this.bell(f, t, len, lv, echo);
      else if (s.voice === 'flute') this.flute(f, t, len, lv * 0.9, echo);
      else this.pulse(f, t, len, lv * 0.42, 0.25, echo);
    }
    if (i === 0) this.pad(ch.root, ch.tones, t, dur * 16, (s.padVol ?? 0.6) * 0.03);
    const b = s.bass[i];
    if (b && b !== '.') {
      const off = b === 'f' ? 7 : b === 'o' ? 12 : b === 't' ? ch.tones[1] : 0;
      let rest = 1;
      while (i + rest < 16 && s.bass[i + rest] === '.') rest++;
      this.bassNote(mtof(ch.root - 12 + off), t, dur * Math.min(rest, 6) * 0.95 + 0.05, (s.bassVol ?? 0.7) * 0.2);
    }
    const a = s.arp?.[i];
    if (a && a !== '.') {
      const tone = ch.tones[{ '1': 0, '3': 1, '5': 2, '8': 3 }[a] ?? 0];
      const f = mtof(ch.root + 12 + tone);
      if (s.voice === 'pulse') this.pulse(f, t, dur * 0.9, (s.arpVol ?? 0.2) * 0.07, 0.125, 0.2);
      else this.bell(f, t, dur * 2, (s.arpVol ?? 0.2) * 0.16, 0.3);
    }
    const dv = s.drumVol ?? 0;
    if (dv > 0) {
      if (s.kick?.[i] === 'x') this.kick(t, dv);
      if (s.snare?.[i] === 'x') this.noiseHit(t, 0.14, 0.16 * dv, 'bandpass', 1800);
      if (s.hat?.[i] === 'x') this.noiseHit(t, 0.04, 0.07 * dv, 'highpass', 7000);
    }
  }
}

/** Renders a few bars of a song offline. Used by the sound check in tests/e2e. */
export async function renderSong(id: string, seconds = 12): Promise<{ peak: number; rms: number }> {
  const s = SONGS[id];
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, Math.floor(rate * seconds), rate);
  const synth = new Synth(ctx, ctx.destination);
  const lead = parseLine(s.lead), chords = s.chords.split(/\s+/).map(chordOf);
  const dur = 60 / s.bpm / 4;
  for (let st = 0; st * dur < seconds - 0.5; st++) synth.step(s, lead, chords, st % (chords.length * 16), 0.05 + st * dur);
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0, sum = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; }
  return { peak, rms: Math.sqrt(sum / d.length) };
}

class AudioEngine {
  private ctx?: AudioContext;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private synth!: Synth;
  private song?: Song;
  private songId = '';
  private lead?: ReturnType<typeof parseLine>;
  private chords: ReturnType<typeof chordOf>[] = [];
  private stepNo = 0;
  private nextTime = 0;
  private timer?: number;

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    } catch { return; }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = state.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.synth = new Synth(ctx, this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.6;
    this.sfxBus.connect(this.master);
    if (this.songId) this.play(this.songId, true);
  }

  setMuted(m: boolean) {
    state.setMuted(m);
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  get current() { return this.songId; }

  play(id: string, force = false) {
    if (id === this.songId && !force) return;
    this.songId = id;
    this.song = SONGS[id];
    if (!this.song) return;
    this.lead = parseLine(this.song.lead);
    this.chords = this.song.chords.split(/\s+/).map(chordOf);
    if (!this.ctx) return;
    if (this.timer) clearInterval(this.timer);
    this.stepNo = 0;
    this.nextTime = this.ctx.currentTime + 0.12;
    // short fade-in so track changes never click
    const g = this.synth.music.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(0.0001, this.ctx.currentTime);
    g.linearRampToValueAtTime(0.78, this.ctx.currentTime + 0.5);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.songId = '';
    if (this.ctx) this.synth.music.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
  }

  private schedule() {
    const ctx = this.ctx!, s = this.song, lead = this.lead;
    if (!s || !lead) return;
    const dur = 60 / s.bpm / 4;
    const total = this.chords.length * 16;
    // if the tab was in the background, do not replay everything that was missed
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.synth.step(s, lead, this.chords, this.stepNo % total, this.nextTime);
      this.nextTime += dur;
      this.stepNo++;
    }
  }

  // ---------- sound effects ----------
  private tone(f: number, dur: number, wave: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    this.synth.env(g, t, 0.005, vol, dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, type: BiquadFilterType, freq: number) {
    if (!this.ctx) return;
    this.synth.noiseHit(this.ctx.currentTime, dur, vol, type, freq, this.sfxBus);
  }

  sfx(name: string) {
    if (!this.ctx) return;
    switch (name) {
      case 'blip': this.tone(880, 0.05, 'triangle', 0.05); break;
      case 'type': this.tone(700 + Math.random() * 80, 0.018, 'triangle', 0.025); break;
      case 'select': this.tone(660, 0.07, 'triangle', 0.1); this.tone(990, 0.09, 'triangle', 0.08, undefined, 0.06); break;
      case 'fail': this.tone(300, 0.5, 'triangle', 0.1, 70); break;
      case 'boom': this.hiss(0.5, 0.3, 'lowpass', 600); this.tone(90, 0.4, 'sine', 0.25, 30); break;
      case 'stamp': this.hiss(0.12, 0.35, 'lowpass', 1200); this.tone(70, 0.15, 'sine', 0.35, 40); break;
      case 'coin': this.tone(1320, 0.05, 'triangle', 0.06); this.tone(1980, 0.14, 'triangle', 0.06, undefined, 0.05); break;
      case 'hurt': this.tone(330, 0.2, 'square', 0.06, 110); this.hiss(0.08, 0.1, 'bandpass', 1500); break;
      case 'whoosh': this.hiss(0.35, 0.08, 'bandpass', 900); break;
      case 'sword': this.hiss(0.1, 0.1, 'highpass', 2600); this.tone(700, 0.09, 'triangle', 0.04, 1600); break;
      case 'hit': this.tone(200, 0.09, 'square', 0.07, 90); this.hiss(0.07, 0.2, 'lowpass', 2400); break;
      case 'kill': this.hiss(0.2, 0.18, 'lowpass', 1800); this.tone(520, 0.08, 'triangle', 0.08, 1040); this.tone(780, 0.12, 'triangle', 0.08, 1560, 0.07); break;
      case 'cut': this.hiss(0.12, 0.12, 'bandpass', 2600); break;
      case 'break': this.hiss(0.18, 0.2, 'bandpass', 1800); this.tone(500, 0.08, 'triangle', 0.06, 200); break;
      case 'pickup': [0, 7, 12].forEach((iv, i) => this.tone(mtof(79 + iv), 0.08, 'triangle', 0.07, undefined, i * 0.05)); break;
      case 'heart': [0, 4, 7].forEach((iv, i) => this.tone(mtof(76 + iv), 0.1, 'triangle', 0.09, undefined, i * 0.06)); break;
      case 'chest': this.tone(220, 0.15, 'triangle', 0.1, 330); this.tone(440, 0.2, 'triangle', 0.08, undefined, 0.15); break;
      case 'fanfare': [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [11, 0.6], [12, 0.72]].forEach(([iv, d]) => { this.tone(mtof(72 + iv), d >= 0.6 ? 0.5 : 0.14, 'triangle', 0.1, undefined, d); this.tone(mtof(60 + iv), 0.14, 'sine', 0.08, undefined, d); }); break;
      case 'secret': [0, 3, 7, 10, 14, 17].forEach((iv, i) => this.tone(mtof(74 + iv), 0.12, 'triangle', 0.07, undefined, i * 0.07)); break;
      case 'door': this.hiss(0.3, 0.15, 'lowpass', 500); this.tone(110, 0.3, 'triangle', 0.1, 80); break;
      case 'fall': this.tone(800, 0.6, 'triangle', 0.08, 100); break;
      case 'lantern': this.tone(mtof(84), 0.2, 'sine', 0.08); this.tone(mtof(91), 0.3, 'sine', 0.06, undefined, 0.08); break;
      case 'note': [0, 5, 9].forEach((iv, i) => this.tone(mtof(81 + iv), 0.18, 'sine', 0.08, undefined, i * 0.1)); break;
      case 'screech': this.tone(1400, 0.4, 'sawtooth', 0.04, 600); this.tone(1700, 0.3, 'triangle', 0.04, 900, 0.1); break;
      case 'shine': this.tone(mtof(96), 0.25, 'sine', 0.06); this.tone(mtof(100), 0.25, 'sine', 0.05, undefined, 0.06); break;
      case 'clang': this.tone(1200, 0.18, 'triangle', 0.07, 1100); this.tone(1800, 0.2, 'triangle', 0.05); break;
      case 'bosshit': this.tone(200, 0.3, 'sawtooth', 0.08, 60); this.hiss(0.2, 0.25, 'lowpass', 1500); break;
      case 'dark': this.tone(220, 1.2, 'triangle', 0.14, 40); this.hiss(0.9, 0.12, 'lowpass', 400); break;
      case 'room': this.hiss(0.25, 0.05, 'bandpass', 600); break;
    }
  }
}

export const audio = new AudioEngine();
(globalThis as unknown as { __renderSong?: typeof renderSong }).__renderSong = renderSong;
