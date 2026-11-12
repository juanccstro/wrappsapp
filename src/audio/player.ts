import type { Howl } from 'howler';
import { createSynthLoop, SYNTH_BPM, type SynthLoop } from './synth';
import { loadTracks, pickTrack, trackUrl, type Track } from './tracks';

const BASE_VOLUME = 0.55;
const FADE_IN_S = 1.5;
const MUTE_KEY = 'wrappsapp:muted';

/** The only thing Wrappsapp ever stores on the device: whether the sound is off. */
export function readMutePreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMutePreference(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Private mode or storage disabled: the preference just lasts for this visit.
  }
}

export type AudioPlayer = {
  /** Call inside a click/tap: browsers only allow sound that starts from a user gesture. */
  unlock(): void;
  /** Starts the music of a Wrapped (a licensed track if there is one, the synth otherwise). */
  start(options: { seed: string; vibe: string; muted: boolean }): Promise<void>;
  setMuted(muted: boolean): void;
  /** Relative level (0–1) reached over some seconds: e.g. duck the music on the last slide. */
  setLevel(level: number, seconds: number): void;
  /** Tab hidden / visible again. */
  suspend(): void;
  resume(): void;
  /** Fades out and stops. */
  stop(seconds?: number): void;
  /** Tempo and position inside the current beat (0–1), or null if nothing is playing. */
  beat(): { bpm: number; phase: number } | null;
  track(): Track | null;
};

export function createAudioPlayer(): AudioPlayer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let synth: SynthLoop | null = null;
  let howl: Howl | null = null;
  let current: Track | null = null;
  let muted = false;
  let level = 1;
  /** Each start/stop invalidates whatever the previous one was still loading. */
  let generation = 0;

  const target = () => (muted ? 0 : BASE_VOLUME * level);

  const getContext = () => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const ramp = (seconds: number) => {
    if (howl) {
      howl.fade(howl.volume(), target(), Math.max(30, seconds * 1000));
    } else if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target(), now + Math.max(0.03, seconds));
    }
  };

  const teardown = () => {
    synth?.stop();
    synth?.output.disconnect();
    synth = null;
    howl?.unload();
    howl = null;
    current = null;
  };

  return {
    unlock() {
      void getContext().resume();
    },

    async start({ seed, vibe, muted: startMuted }) {
      const id = ++generation;
      teardown();
      muted = startMuted;
      level = 1;

      const track = pickTrack(await loadTracks(), vibe, seed);
      if (id !== generation) return;

      if (track) {
        const { Howl: HowlClass } = await import('howler');
        if (id !== generation) return;
        current = track;
        howl = new HowlClass({ src: [trackUrl(track)], loop: true, volume: 0, html5: false });
        howl.once('loaderror', () => {
          // A broken file must not leave the Wrapped silent.
          if (id !== generation) return;
          howl?.unload();
          howl = null;
          current = null;
          const audio = getContext();
          synth = createSynthLoop(audio, seed);
          if (master) synth.output.connect(master);
          ramp(FADE_IN_S);
        });
        howl.play();
        ramp(FADE_IN_S);
        return;
      }

      const audio = getContext();
      void audio.resume();
      synth = createSynthLoop(audio, seed);
      if (master) synth.output.connect(master);
      ramp(FADE_IN_S);
    },

    setMuted(next) {
      muted = next;
      ramp(0.25);
    },

    setLevel(next, seconds) {
      level = next;
      ramp(seconds);
    },

    suspend() {
      howl?.pause();
      void ctx?.suspend();
    },

    resume() {
      if (howl && !howl.playing()) howl.play();
      void ctx?.resume();
    },

    stop(seconds = 0.8) {
      const id = ++generation;
      level = 0;
      ramp(seconds);
      setTimeout(
        () => {
          if (id === generation) teardown();
        },
        seconds * 1000 + 60,
      );
    },

    beat() {
      if (howl && current) {
        const position = howl.seek();
        if (typeof position !== 'number') return null;
        return { bpm: current.bpm, phase: ((position * current.bpm) / 60) % 1 };
      }
      if (synth) {
        const position = synth.position();
        if (position < 0) return null;
        return { bpm: SYNTH_BPM, phase: ((position * SYNTH_BPM) / 60) % 1 };
      }
      return null;
    },

    track: () => current,
  };
}
