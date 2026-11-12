import { createRng } from '../core';

export const SYNTH_BPM = 120;
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

const frequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export type SynthLoop = {
  /** Connect this to the output chain. */
  output: GainNode;
  /** Seconds since the first beat (negative just before it). */
  position(): number;
  stop(): void;
};

/**
 * Placeholder music made with Web Audio: kick, hi-hat, bass and a simple chord at 120 BPM.
 * It exists so the experience has sound before any licensed track is added. The key and the
 * chord progression come from the seed, so each chat gets its own loop.
 */
export function createSynthLoop(ctx: AudioContext, seed: string): SynthLoop {
  const rng = createRng(seed, 'music:synth');
  const key = 55 + rng.int(7);
  const progression = rng.pick(PROGRESSIONS);

  const output = ctx.createGain();
  output.gain.value = 0.9;

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = rng.next() * 2 - 1;

  const degree = (step: number, octave = 0) =>
    key + (MAJOR[step % 7] as number) + 12 * (Math.floor(step / 7) + octave);

  const kick = (t: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain).connect(output);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  const hat = (t: number, level: number) => {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    source.connect(filter).connect(gain).connect(output);
    source.start(t);
    source.stop(t + 0.08);
  };

  const tone = (
    midi: number,
    t: number,
    duration: number,
    type: OscillatorType,
    level: number,
    cutoff: number,
  ) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency(midi);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.04);
    gain.gain.setValueAtTime(level, t + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(filter).connect(gain).connect(output);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  };

  const startTime = ctx.currentTime + 0.12;
  let nextBeat = 0;

  const schedule = () => {
    while (startTime + nextBeat * BEAT < ctx.currentTime + LOOKAHEAD_S) {
      const t = startTime + nextBeat * BEAT;
      const beatInBar = nextBeat % 4;
      const root = progression[Math.floor(nextBeat / 4) % progression.length] as number;

      kick(t);
      hat(t + BEAT / 2, 0.16);
      if (beatInBar === 3) hat(t + BEAT * 0.75, 0.09);
      tone(degree(root, -1), t, BEAT * 0.5, 'triangle', 0.32, 500);
      if (beatInBar === 0) {
        for (const step of [0, 2, 4])
          tone(degree(root + step), t, BEAT * 4, 'sawtooth', 0.045, 1500);
      }
      nextBeat++;
    }
  };

  schedule();
  const timer = setInterval(schedule, SCHEDULER_MS);

  return {
    output,
    position: () => ctx.currentTime - startTime,
    stop: () => clearInterval(timer),
  };
}
