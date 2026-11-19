/**
 * Synthesized sound effects (Web Audio, no audio files): typing, erase, correct, wrong,
 * countdown ticks, time-up, reveal, swipe and finish. The caller owns the settings and pushes
 * them with `sfx.configure`; every call is a no-op while disabled or when audio is unavailable.
 */

export type SfxTickStyle =
  "wood" | "mechanical" | "wall" | "digital" | "drop" | "drum" | "heart" | "off";
export type SfxChimeStyle = "bell" | "game" | "soft";
export type SfxName =
  "type" | "erase" | "correct" | "wrong" | "tick" | "timeUp" | "reveal" | "swipe" | "finish";

export interface SfxConfig {
  enabled: boolean;
  /** 0 … 1 */
  volume: number;
  tick: SfxTickStyle;
  chime: SfxChimeStyle;
}

export interface SfxOptions {
  /** Countdown progress 0 → 1: later ticks are louder and slightly higher. */
  intensity?: number;
  /** Alternates "tick" and "tock". */
  alt?: boolean;
  /** Overrides the configured style (previews). */
  tick?: SfxTickStyle;
  chime?: SfxChimeStyle;
}

interface ToneOptions {
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number | null;
}

interface NoiseOptions {
  at?: number;
  dur?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  gain?: number;
  rate?: number;
}

type AudioContextCtor = typeof AudioContext;

let config: SfxConfig = { enabled: true, volume: 0.8, tick: "wood", chime: "bell" };
let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context || !master) {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = config.volume;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return { ctx: context, out: master };
}

/** Short enveloped note (fast attack, exponential release) so it never pops. */
function tone(
  freq: number,
  { at = 0, dur = 0.12, type = "sine", gain = 0.18, slideTo = null }: ToneOptions = {},
) {
  const node = audio();
  if (!node) return;
  const { ctx, out } = node;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Filtered noise burst: the material of key clicks, wood and metal ticks. */
function noise({
  at = 0,
  dur = 0.03,
  filter = "highpass",
  freq = 1800,
  q = 1,
  gain = 0.22,
  rate = 1,
}: NoiseOptions = {}) {
  const node = audio();
  if (!node) return;
  const { ctx, out } = node;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.frequency.value = freq;
  band.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(band).connect(amp).connect(out);
  source.start(ctx.currentTime + at);
}

/** level = loudness, alt = tick/tock, pitch = slight rise near the end. */
type TickVoice = (level: number, alt: boolean, pitch: number) => void;

const TICKS: Record<SfxTickStyle, TickVoice> = {
  wood: (level, alt, pitch) => {
    noise({ dur: 0.025, filter: "bandpass", freq: alt ? 2600 : 3400, q: 4, gain: level * 1.6 });
    tone((alt ? 1250 : 1650) * pitch, { dur: 0.035, type: "square", gain: level * 0.35 });
  },
  mechanical: (level, alt) => {
    noise({ dur: 0.012, filter: "highpass", freq: alt ? 3800 : 5200, gain: level * 1.8 });
    tone(alt ? 2900 : 3500, { dur: 0.07, type: "sine", gain: level * 0.18 });
  },
  wall: (level, alt) => {
    noise({ dur: 0.05, filter: "bandpass", freq: alt ? 900 : 1300, q: 3, gain: level * 2 });
    tone(alt ? 420 : 560, { dur: 0.12, type: "triangle", gain: level * 0.4 });
  },
  digital: (level, alt, pitch) =>
    tone((alt ? 1000 : 1200) * pitch, { dur: 0.05, type: "square", gain: level * 0.22 }),
  drop: (level, alt, pitch) =>
    tone((alt ? 1300 : 1600) * pitch, { dur: 0.1, type: "sine", gain: level * 0.55, slideTo: 520 }),
  drum: (level, alt) => {
    tone(alt ? 130 : 160, { dur: 0.14, type: "sine", gain: level * 1.1, slideTo: 45 });
    noise({ dur: 0.02, filter: "lowpass", freq: 900, gain: level * 0.8 });
  },
  heart: (level, alt) => {
    // "lub-dub" every second tick.
    if (!alt) return;
    tone(70, { dur: 0.11, type: "sine", gain: level * 1.4, slideTo: 42 });
    tone(62, { at: 0.16, dur: 0.12, type: "sine", gain: level, slideTo: 40 });
  },
  off: () => undefined,
};

const CHIMES: Record<SfxChimeStyle, { correct: () => void; wrong: () => void }> = {
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
      [523, 659, 784, 1047].forEach((freq, i) =>
        tone(freq, { at: i * 0.06, dur: 0.09, type: "square", gain: 0.08 }),
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

const SOUNDS: Record<SfxName, (options: SfxOptions) => void> = {
  type: () => noise({ dur: 0.03, rate: 0.9 + Math.random() * 0.3 }),
  erase: () => tone(320, { dur: 0.05, type: "triangle", gain: 0.07 }),
  correct: (options) => CHIMES[options.chime ?? config.chime].correct(),
  wrong: (options) => CHIMES[options.chime ?? config.chime].wrong(),
  tick: ({ intensity = 0, alt = false, tick }) => {
    const progress = Math.min(1, Math.max(0, intensity));
    TICKS[tick ?? config.tick](0.12 + 0.48 * progress, alt, 1 + progress * 0.12);
  },
  timeUp: () => {
    if (config.tick === "off") return;
    tone(1568, { dur: 0.09, type: "square", gain: 0.12 });
    tone(1568, { at: 0.12, dur: 0.22, type: "square", gain: 0.12 });
  },
  reveal: () => {
    tone(523, { dur: 0.1, type: "sine", gain: 0.1 });
    tone(784, { at: 0.07, dur: 0.18, type: "sine", gain: 0.1 });
  },
  swipe: () => tone(420, { dur: 0.16, type: "sine", gain: 0.05, slideTo: 900 }),
  finish: () =>
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(freq, { at: i * 0.1, dur: 0.3, type: "triangle", gain: 0.12 }),
    ),
};

/** Milliseconds between two countdown ticks: ~0.5 s at the start, ~0.15 s at the end. */
export const tickGapMs = (progress: number): number =>
  500 - 350 * Math.min(1, Math.max(0, progress));

export const sfx = {
  configure(next: Partial<SfxConfig>) {
    config = { ...config, ...next };
    if (master) master.gain.value = config.volume;
  },

  play(name: SfxName, options: SfxOptions = {}) {
    if (!config.enabled) return;
    try {
      SOUNDS[name](options);
    } catch {
      /* Blocked audio never breaks the lesson. */
    }
  },

  /** A few ticks that speed up and grow louder, in `style`. */
  previewTick(style: SfxTickStyle) {
    let at = 0;
    [0, 0.3, 0.55, 0.75, 0.9, 1].forEach((progress, index) => {
      window.setTimeout(
        () => sfx.play("tick", { intensity: progress, alt: index % 2 === 1, tick: style }),
        at,
      );
      at += tickGapMs(progress);
    });
  },

  /** Correct then wrong chime in `style`. */
  previewChime(style: SfxChimeStyle) {
    sfx.play("correct", { chime: style });
    window.setTimeout(() => sfx.play("wrong", { chime: style }), 650);
  },

  /** Typing sound for printable keys, erase sound for Backspace. */
  forKey(event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    isComposing?: boolean;
  }) {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Backspace") sfx.play("erase");
    else if (event.key.length === 1) sfx.play("type");
  },
};
