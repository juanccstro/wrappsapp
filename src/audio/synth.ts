import { createRng } from '../core';

export const SYNTH_BPM = 118;
const BEAT = 60 / SYNTH_BPM;
const LOOKAHEAD_S = 0.3;
const SCHEDULER_MS = 60;

/** Four-chord pop loops, as scale degrees of a major key. */
const PROGRESSIONS = [
  [5, 3, 0, 4],
  [0, 4, 5, 3],
  [0, 5, 3, 4],
  [3, 0, 4, 5],
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Chord tones the lead walks over (in scale steps above the root). */
const LEAD_STEPS = [0, 2, 4, 7, 4, 9, 7, 2];
/** Chord stabs on a 3-3-2 pattern over the eight half-beats of a bar. */
const STAB_PATTERN = [1, 0, 0, 1, 0, 0, 1, 0];

const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * What plays in each part of the story. The music moves from one scene to another as the
 * slides go by: it builds up, holds back for the quizzes and eases off at the end.
 */
export type Scene = {
  kick: 'none' | 'four' | 'half';
  hat: 'none' | 'off' | 'eighth';
  clap: boolean;
  bass: boolean;
  stabs: boolean;
  /** 0 = no lead, 1 = flowing, 2 = sparse and an octave higher. */
  lead: 0 | 1 | 2;
};

export const SCENES: readonly Scene[] = [
  { kick: 'none', hat: 'eighth', clap: false, bass: false, stabs: true, lead: 0 }, // 0 · opening
  { kick: 'four', hat: 'off', clap: false, bass: true, stabs: true, lead: 0 }, // 1 · the beat drops
  { kick: 'four', hat: 'eighth', clap: true, bass: true, stabs: false, lead: 1 }, // 2 · lead
  { kick: 'half', hat: 'off', clap: false, bass: true, stabs: false, lead: 2 }, // 3 · suspense
  { kick: 'four', hat: 'eighth', clap: true, bass: true, stabs: true, lead: 1 }, // 4 · everything
  { kick: 'none', hat: 'off', clap: false, bass: false, stabs: true, lead: 1 }, // 5 · closing
];

export type SynthLoop = {
  /** Connect this to the output chain. */
  output: AudioNode;
  /** Seconds since the first beat (negative just before it). */
  position(): number;
  /** Changes what is playing. Takes effect on the next beat, so it never cuts mid-note. */
  setScene(index: number): void;
  stop(): void;
};

/**
 * Upbeat music made with Web Audio, in the spirit of a year-in-review video: four-on-the-floor
 * kick, claps, off-beat hats, a bouncing bass, bright chord stabs on a 3-3-2 rhythm and a
 * plucked lead with echo, at 118 BPM. Chords and lead duck slightly on every kick, which
 * gives the groove its pump. Key, progression and melody come from the seed, so each chat
 * gets its own tune. It exists so there is sound before any licensed track is added.
 */
export function createSynthLoop(ctx: AudioContext, seed: string): SynthLoop {
  const rng = createRng(seed, 'music:synth');
  const key = 55 + rng.int(6);
  const progression = rng.pick(PROGRESSIONS);
  const leadOrder = rng.shuffle(LEAD_STEPS);

  // Output chain: everything → soft top-end roll-off → compressor.
  const bus = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 9000;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.ratio.value = 3.5;
  bus.connect(tone).connect(compressor);

  // Chords and lead go through this gain, which dips on every kick.
  const pump = ctx.createGain();
  pump.connect(bus);

  // Echo for the lead.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = 0.3;
  echo.connect(feedback).connect(echo);
  echo.connect(echoLevel).connect(pump);

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = rng.next() * 2 - 1;

  const degree = (step: number, octave = 0) =>
    key + (MAJOR[((step % 7) + 7) % 7] as number) + 12 * (Math.floor(step / 7) + octave);

  /** One note with its own filter and envelope. */
  const voice = (
    midi: number,
    t: number,
    duration: number,
    type: OscillatorType,
    level: number,
    cutoff: number,
    attack: number,
    destination: AudioNode,
    detune = 0,
  ) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency(midi);
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  };

  const kick = (t: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + 0.32);
    // Sidechain: chords and lead dip and swell back before the next beat.
    pump.gain.cancelScheduledValues(t);
    pump.gain.setValueAtTime(0.45, t);
    pump.gain.linearRampToValueAtTime(1, t + BEAT * 0.5);
  };

  const burst = (
    t: number,
    type: BiquadFilterType,
    cutoff: number,
    level: number,
    length: number,
  ) => {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noise;
    filter.type = type;
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    source.connect(filter).connect(gain).connect(bus);
    source.start(t);
    source.stop(t + length + 0.02);
  };
  const closedHat = (t: number, level: number) => burst(t, 'highpass', 9000, level, 0.04);
  const openHat = (t: number) => burst(t, 'highpass', 7500, 0.05, 0.16);
  const clap = (t: number) => {
    burst(t, 'bandpass', 1500, 0.13, 0.03);
    burst(t + 0.012, 'bandpass', 1500, 0.15, 0.18);
  };

  const stab = (root: number, t: number) => {
    for (const step of [0, 2, 4]) {
      voice(degree(root + step), t, 0.3, 'sawtooth', 0.05, 2600, 0.006, pump, -7);
      voice(degree(root + step), t, 0.3, 'sawtooth', 0.04, 2600, 0.006, pump, 8);
    }
  };

  const pluck = (midi: number, t: number, level: number) => {
    voice(midi, t, 0.26, 'triangle', level, 3200, 0.005, pump);
    voice(midi, t, 0.26, 'triangle', level * 0.8, 3200, 0.005, echo);
  };

  const bassNote = (midi: number, t: number, duration: number, level: number) => {
    voice(midi, t, duration, 'sine', level, 400, 0.01, bus);
    voice(midi, t, duration, 'sawtooth', level * 0.3, 520, 0.01, bus);
  };

  const startTime = ctx.currentTime + 0.12;
  let nextBeat = 0;
  let scene = SCENES[0] as Scene;

  const schedule = () => {
    while (startTime + nextBeat * BEAT < ctx.currentTime + LOOKAHEAD_S) {
      const t = startTime + nextBeat * BEAT;
      const half = t + BEAT / 2;
      const beatInBar = nextBeat % 4;
      const bar = Math.floor(nextBeat / 4);
      const root = progression[bar % progression.length] as number;
      const now = scene;

      // A soft pad under everything: the thread between scenes.
      if (beatInBar === 0) {
        for (const step of [0, 2, 4]) {
          voice(degree(root + step), t, BEAT * 4.1, 'sine', 0.05, 1200, 0.35, pump);
        }
      }

      if (now.kick === 'four' || (now.kick === 'half' && beatInBar % 2 === 0)) kick(t);
      if (now.clap && beatInBar % 2 === 1) clap(t);
      if (now.hat === 'off') openHat(half);
      if (now.hat === 'eighth') {
        closedHat(t, 0.035);
        openHat(half);
      }

      if (now.bass) {
        // Root on the bar, then the classic off-beat bounce an octave up.
        if (beatInBar === 0) bassNote(degree(root, -2), t, BEAT * 0.4, 0.26);
        bassNote(degree(root, -1), half, BEAT * 0.42, 0.2);
      }

      if (now.stabs) {
        if (STAB_PATTERN[beatInBar * 2]) stab(root, t);
        if (STAB_PATTERN[beatInBar * 2 + 1]) stab(root, half);
      }

      if (now.lead === 1) {
        const a = leadOrder[(nextBeat * 2) % leadOrder.length] as number;
        const b = leadOrder[(nextBeat * 2 + 1) % leadOrder.length] as number;
        pluck(degree(root + a, 1), t, 0.075);
        pluck(degree(root + b, 1), half, 0.06);
      } else if (now.lead === 2 && beatInBar % 2 === 0) {
        const step = leadOrder[(bar + beatInBar) % leadOrder.length] as number;
        pluck(degree(root + step, 2), t, 0.06);
      }

      nextBeat++;
    }
  };

  schedule();
  const timer = setInterval(schedule, SCHEDULER_MS);

  return {
    output: compressor,
    position: () => ctx.currentTime - startTime,
    setScene: (index) => {
      scene = SCENES[Math.min(Math.max(0, Math.floor(index)), SCENES.length - 1)] as Scene;
    },
    stop: () => clearInterval(timer),
  };
}
