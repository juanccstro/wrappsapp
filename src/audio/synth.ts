import { createRng } from '../core';

export const SYNTH_BPM = 100;
const BEAT = 60 / SYNTH_BPM;
const LOOKAHEAD_S = 0.3;
const SCHEDULER_MS = 60;

/** Four-chord loops, as scale degrees of a major key. */
const PROGRESSIONS = [
  [0, 4, 5, 3],
  [0, 5, 3, 4],
  [5, 3, 0, 4],
  [0, 3, 5, 4],
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Chord tones the arpeggio walks over (in scale steps above the root). */
const ARP_STEPS = [0, 2, 4, 7, 9, 4, 7, 2];

const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * What plays in each part of the story. The music moves from one scene to another as the
 * slides go by: it builds up, calms down for the quizzes and winds down at the end.
 */
export type Scene = {
  kick: 'none' | 'four' | 'half';
  hat: 'none' | 'off' | 'eighth';
  clap: boolean;
  bass: boolean;
  /** 0 = no melody, 1 = flowing arpeggio, 2 = sparse and an octave higher. */
  arp: 0 | 1 | 2;
};

export const SCENES: readonly Scene[] = [
  { kick: 'none', hat: 'off', clap: false, bass: false, arp: 0 }, // 0 · opening: pads only
  { kick: 'four', hat: 'off', clap: false, bass: true, arp: 0 }, // 1 · the beat comes in
  { kick: 'four', hat: 'eighth', clap: false, bass: true, arp: 1 }, // 2 · melody
  { kick: 'half', hat: 'off', clap: false, bass: true, arp: 2 }, // 3 · suspense
  { kick: 'four', hat: 'eighth', clap: true, bass: true, arp: 1 }, // 4 · full
  { kick: 'none', hat: 'none', clap: false, bass: false, arp: 1 }, // 5 · closing: pads + melody
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
 * Music made with Web Audio, so the experience has sound before any licensed track is added:
 * warm pads, a soft kick, brushed hats, a round bass and a plucked arpeggio with echo, at a
 * relaxed 100 BPM. Key, chord progression and melody come from the seed, so each chat gets
 * its own tune.
 */
export function createSynthLoop(ctx: AudioContext, seed: string): SynthLoop {
  const rng = createRng(seed, 'music:synth');
  const key = 57 + rng.int(6);
  const progression = rng.pick(PROGRESSIONS);
  const arpOrder = rng.shuffle(ARP_STEPS);

  // Output chain: everything → gentle low-pass → compressor.
  const bus = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 6500;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  bus.connect(tone).connect(compressor);

  // Echo for the melody.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = 0.35;
  echo.connect(feedback).connect(echo);
  echo.connect(echoLevel).connect(bus);

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = rng.next() * 2 - 1;

  const degree = (step: number, octave = 0) =>
    key + (MAJOR[((step % 7) + 7) % 7] as number) + 12 * (Math.floor(step / 7) + octave);

  /** A note with a soft attack and release. */
  const voice = (
    midi: number,
    t: number,
    duration: number,
    type: OscillatorType,
    level: number,
    cutoff: number,
    attack: number,
    destination: AudioNode = bus,
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
    gain.gain.setValueAtTime(level, t + Math.max(attack, duration * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  };

  const kick = (t: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(105, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + 0.36);
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
  const hat = (t: number, level: number) => burst(t, 'highpass', 8000, level, 0.05);
  const clap = (t: number) => burst(t, 'bandpass', 1700, 0.11, 0.16);

  const pluck = (midi: number, t: number, level: number) => {
    voice(midi, t, 0.32, 'triangle', level, 2400, 0.008);
    voice(midi, t, 0.32, 'triangle', level * 0.8, 2400, 0.008, echo);
  };

  const startTime = ctx.currentTime + 0.12;
  let nextBeat = 0;
  let scene = SCENES[0] as Scene;

  const schedule = () => {
    while (startTime + nextBeat * BEAT < ctx.currentTime + LOOKAHEAD_S) {
      const t = startTime + nextBeat * BEAT;
      const beatInBar = nextBeat % 4;
      const bar = Math.floor(nextBeat / 4);
      const root = progression[bar % progression.length] as number;
      const now = scene;

      // Pads: always there, they are the thread between scenes.
      if (beatInBar === 0) {
        for (const step of [0, 2, 4]) {
          voice(degree(root + step), t, BEAT * 4.2, 'sine', 0.075, 1100, 0.5, bus, -6);
          voice(degree(root + step), t, BEAT * 4.2, 'triangle', 0.04, 900, 0.5, bus, 7);
        }
      }

      if (now.kick === 'four' || (now.kick === 'half' && beatInBar % 2 === 0)) kick(t);
      if (now.clap && beatInBar % 2 === 1) clap(t);
      if (now.hat !== 'none') hat(t + BEAT / 2, 0.055);
      if (now.hat === 'eighth') hat(t, 0.03);

      if (now.bass && (beatInBar === 0 || beatInBar === 2)) {
        voice(degree(root, -2), t, BEAT * 0.9, 'sine', 0.3, 320, 0.015);
      }
      if (now.bass && now.kick === 'four' && beatInBar === 3) {
        voice(degree(root, -2), t + BEAT / 2, BEAT * 0.45, 'sine', 0.22, 320, 0.015);
      }

      if (now.arp === 1) {
        const a = arpOrder[(nextBeat * 2) % arpOrder.length] as number;
        const b = arpOrder[(nextBeat * 2 + 1) % arpOrder.length] as number;
        pluck(degree(root + a, 1), t, 0.07);
        pluck(degree(root + b, 1), t + BEAT / 2, 0.055);
      } else if (now.arp === 2 && beatInBar % 2 === 0) {
        pluck(degree(root + (arpOrder[(bar + beatInBar) % arpOrder.length] as number), 2), t, 0.06);
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
