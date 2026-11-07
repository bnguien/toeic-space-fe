/**
 * Web Audio synthesiser of the dictation screen: lively effects and the lofi background music,
 * no external files.
 */

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | null = null;
let musicOscillators: OscillatorNode[] = [];
let musicGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext && typeof window !== "undefined") {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (Ctor) audioContext = new Ctor();
  }
  if (audioContext && audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

/** Mechanical keyboard click. */
export function playKeyClickSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    // A slightly random pitch sounds like a real key.
    const freq = 600 + Math.random() * 200;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    /* ignore audio errors */
  }
}

/** Sweet chime on a correct answer (C-major arpeggio C5, E5, G5, C6). */
export function playCorrectChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch {
    /* ignore audio errors */
  }
}

/** Soft reminder buzz on a wrong answer. */
export function playWrongBuzzer(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    /* ignore audio errors */
  }
}

/** Starts the relaxing lofi ambient background music. */
export function startLofiMusic(): void {
  stopLofiMusic();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.035, ctx.currentTime); // soft background level
    gainNode.connect(ctx.destination);
    musicGain = gainNode;

    // Warm lofi progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    const chords = [
      [174.61, 220.0, 261.63, 329.63],
      [164.81, 196.0, 246.94, 293.66],
      [146.83, 174.61, 220.0, 261.63],
      [130.81, 164.81, 196.0, 246.94],
    ];
    let chordIndex = 0;

    const playChord = () => {
      if (!musicGain || ctx.state === "closed") return;
      const chord = chords[chordIndex];
      chordIndex = (chordIndex + 1) % chords.length;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        noteGain.gain.setValueAtTime(0.001, ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1.2);
        noteGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 3.8);
        osc.connect(noteGain);
        noteGain.connect(musicGain as GainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 4.0);
        musicOscillators.push(osc);
        // Finished notes leave the list and disconnect, so a long session never piles them up.
        osc.onended = () => {
          const index = musicOscillators.indexOf(osc);
          if (index !== -1) musicOscillators.splice(index, 1);
          try {
            osc.disconnect();
            noteGain.disconnect();
          } catch {
            /* noop */
          }
        };
      });
    };

    playChord();
    musicInterval = setInterval(playChord, 3800);
  } catch {
    /* ignore audio errors */
  }
}

/** Stops the background music. */
export function stopLofiMusic(): void {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicOscillators.length) {
    musicOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* noop */
      }
    });
    musicOscillators = [];
  }
  if (musicGain) {
    try {
      musicGain.disconnect();
    } catch {
      /* noop */
    }
    musicGain = null;
  }
}
