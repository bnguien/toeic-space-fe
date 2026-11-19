/**
 * Sound effects of the dictation screen: typing, correct, wrong, countdown tick, reveal, swipe, finish.
 * Synthesised with Web Audio (no files). The master switch, volume, tick style and chime style are learner
 * preferences kept in the learner store (localStorage for guests, server copy when signed in).
 */
import { useSyncExternalStore } from "react";

import type { SoundPrefs } from "../types/dictation.types";
import { getLearnerSnapshot, subscribeLearner, updateLearner } from "./learner-store";

export const TICK_STYLES: [string, string][] = [
  ["wood", "Đồng hồ gỗ"],
  ["mechanical", "Đồng hồ cơ"],
  ["wall", "Đồng hồ treo tường"],
  ["digital", "Bíp điện tử"],
  ["drop", "Giọt nước"],
  ["drum", "Nhịp trống"],
  ["heart", "Nhịp tim"],
  ["off", "Im lặng"],
];

export const CHIME_STYLES: [string, string][] = [
  ["bell", "Chuông trong"],
  ["game", "Trò chơi 8-bit"],
  ["soft", "Nhẹ nhàng"],
];

export type SoundName =
  "type" | "erase" | "correct" | "wrong" | "tick" | "timeUp" | "reveal" | "swipe" | "finish";

export interface SoundOptions {
  style?: string;
  intensity?: number;
  alt?: boolean;
}

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
let master: GainNode | null = null;

const prefs = (): SoundPrefs => getLearnerSnapshot().sound;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    context = new Ctor();
    master = context.createGain();
    master.connect(context.destination);
  }
  if (master) master.gain.value = prefs().volume;
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

interface ToneOptions {
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number | null;
}

/** A short note with an envelope (fast attack, decay) so it never "pops". */
function tone(
  freq: number,
  { at = 0, dur = 0.12, type = "sine", gain = 0.18, slideTo = null }: ToneOptions = {},
) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

interface NoiseOptions {
  dur?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  gain?: number;
  rate?: number;
  at?: number;
}

/** Short filtered noise burst — the material of key clicks, wood and metal sounds. */
function noise({
  dur = 0.03,
  filter = "highpass",
  freq = 1800,
  q = 1,
  gain = 0.22,
  rate = 1,
  at = 0,
}: NoiseOptions = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const length = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4;
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const biquad = ac.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = freq;
  biquad.Q.value = q;
  const amp = ac.createGain();
  amp.gain.value = gain;
  source.connect(biquad).connect(amp).connect(master);
  source.start(ac.currentTime + at);
}

type TickFn = (level: number, alt: boolean, k: number) => void;

/** Countdown tick by style. intensity 0→1 = elapsed time: louder (and higher for some styles) near the end. */
const TICKS: Record<string, TickFn> = {
  wood: (level, alt, k) => {
    noise({ dur: 0.025, filter: "bandpass", freq: alt ? 2600 : 3400, q: 4, gain: level * 1.6 });
    tone((alt ? 1250 : 1650) * k, { dur: 0.035, type: "square", gain: level * 0.35 });
  },
  mechanical: (level, alt) => {
    noise({ dur: 0.012, filter: "highpass", freq: alt ? 3800 : 5200, gain: level * 1.8 });
    tone(alt ? 2900 : 3500, { dur: 0.07, type: "sine", gain: level * 0.18 });
  },
  wall: (level, alt) => {
    noise({ dur: 0.05, filter: "bandpass", freq: alt ? 900 : 1300, q: 3, gain: level * 2 });
    tone(alt ? 420 : 560, { dur: 0.12, type: "triangle", gain: level * 0.4 });
  },
  digital: (level, alt, k) =>
    tone((alt ? 1000 : 1200) * k, { dur: 0.05, type: "square", gain: level * 0.22 }),
  drop: (level, alt, k) =>
    tone((alt ? 1300 : 1600) * k, { dur: 0.1, type: "sine", gain: level * 0.55, slideTo: 520 }),
  drum: (level, alt) => {
    tone(alt ? 130 : 160, { dur: 0.14, type: "sine", gain: level * 1.1, slideTo: 45 });
    noise({ dur: 0.02, filter: "lowpass", freq: 900, gain: level * 0.8 });
  },
  heart: (level, alt) => {
    if (!alt) return; // "lub – dub" every two clock beats
    tone(70, { dur: 0.11, type: "sine", gain: level * 1.4, slideTo: 42 });
    tone(62, { at: 0.16, dur: 0.12, type: "sine", gain: level * 1, slideTo: 40 });
  },
  off: () => {},
};

function tick({ intensity = 0, alt = false, style }: SoundOptions = {}) {
  const p = Math.min(1, Math.max(0, intensity));
  (TICKS[style || prefs().tick] || TICKS.wood)(0.12 + 0.48 * p, alt, 1 + p * 0.12);
}

const CHIMES: Record<string, { correct: () => void; wrong: () => void }> = {
  bell: {
    correct: () => {
      tone(659, { dur: 0.13, type: "triangle", gain: 0.16 });
      tone(880, { at: 0.09, dur: 0.14, type: "triangle", gain: 0.16 });
      tone(1319, { at: 0.18, dur: 0.28, type: "sine", gain: 0.12 });
    },
    wrong: () => {
      tone(220, { dur: 0.16, type: "square", gain: 0.06, slideTo: 170 });
      tone(165, { at: 0.13, dur: 0.24, type: "square", gain: 0.06, slideTo: 120 });
    },
  },
  game: {
    correct: () =>
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, { at: i * 0.06, dur: 0.09, type: "square", gain: 0.08 }),
      ),
    wrong: () => {
      tone(311, { dur: 0.12, type: "square", gain: 0.09 });
      tone(233, { at: 0.12, dur: 0.12, type: "square", gain: 0.09 });
      tone(156, { at: 0.24, dur: 0.26, type: "square", gain: 0.09, slideTo: 110 });
    },
  },
  soft: {
    correct: () => {
      tone(784, { dur: 0.35, type: "sine", gain: 0.14 });
      tone(1175, { at: 0.12, dur: 0.45, type: "sine", gain: 0.1 });
    },
    wrong: () => {
      tone(294, { dur: 0.25, type: "sine", gain: 0.14 });
      tone(247, { at: 0.18, dur: 0.35, type: "sine", gain: 0.12 });
    },
  },
};

const chime = (style?: string) => CHIMES[style || prefs().chime] || CHIMES.bell;

const SOUNDS: Record<SoundName, (options?: SoundOptions) => void> = {
  type: () => noise({ dur: 0.03, rate: 0.9 + Math.random() * 0.3 }),
  erase: () => tone(320, { dur: 0.05, type: "triangle", gain: 0.07 }),
  correct: (options) => chime(options?.style).correct(),
  wrong: (options) => chime(options?.style).wrong(),
  tick,
  timeUp: () => {
    if (prefs().tick === "off") return;
    tone(1568, { dur: 0.09, type: "square", gain: 0.12 });
    tone(1568, { at: 0.12, dur: 0.22, type: "square", gain: 0.12 });
  },
  reveal: () => {
    tone(523, { dur: 0.1, type: "sine", gain: 0.1 });
    tone(784, { at: 0.07, dur: 0.18, type: "sine", gain: 0.1 });
  },
  swipe: () => tone(420, { dur: 0.16, type: "sine", gain: 0.05, slideTo: 900 }),
  finish: () =>
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, { at: i * 0.1, dur: 0.3, type: "triangle", gain: 0.12 }),
    ),
};

export function playSfx(name: SoundName, options?: SoundOptions): void {
  if (!prefs().enabled || !SOUNDS[name]) return;
  try {
    SOUNDS[name](options);
  } catch {
    /* The browser blocks audio: ignore, the lesson goes on. */
  }
}

/** Preview of a countdown style: a few beats, faster and louder. */
export function previewTick(style: string): void {
  if (!prefs().enabled) return;
  [0, 0.3, 0.55, 0.75, 0.9, 1].forEach((p, i) => {
    setTimeout(
      () => playSfx("tick", { intensity: p, alt: i % 2 === 1, style }),
      i * (420 - 250 * p),
    );
  });
}

export function setSfxEnabled(value: boolean): void {
  updateLearner(["sound"], (state) => ({
    ...state,
    sound: { ...state.sound, enabled: Boolean(value) },
  }));
}

export function setSfxPrefs(patch: Partial<SoundPrefs>): void {
  updateLearner(["sound"], (state) => ({ ...state, sound: { ...state.sound, ...patch } }));
  if (master && typeof patch.volume === "number") master.gain.value = patch.volume;
}

/** Regular keys (letters, digits, punctuation) click; Backspace erases. */
export function sfxForKey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  nativeEvent?: { isComposing?: boolean };
}): void {
  if (event.nativeEvent?.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Backspace") playSfx("erase");
  else if (event.key.length === 1) playSfx("type");
}

const readSound = () => getLearnerSnapshot().sound;

/** { enabled, volume, tick, chime } — a new object on every change, safe to use directly. */
export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(subscribeLearner, readSound, readSound);
}
