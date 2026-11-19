/**
 * Exam room sound (port of StudyChill `examMedia.js`). ONE shared `<audio>` element plays the
 * directions and every Listening group: after the "Bắt đầu" click the browser allows playback, so
 * reusing the same element lets later groups autoplay; the volume is set in one place.
 */

let element: HTMLAudioElement | null = null;
let volume = 0.8;

/** The shared exam audio element (created on first use; null outside the browser). */
export function examAudio(): HTMLAudioElement | null {
  if (!element && typeof Audio !== "undefined") {
    element = new Audio();
    element.preload = "auto";
    element.volume = volume;
  }
  return element;
}

export function setExamVolume(value: number) {
  volume = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  if (element) element.volume = volume;
}

export const getExamVolume = () => volume;

/** Pauses the shared element (leaving the room, submitting). */
export function stopExamAudio() {
  try {
    element?.pause();
  } catch {
    /* already detached */
  }
}

/** Whether the element currently plays `src` (events of an older source are ignored). */
export function isCurrentSrc(audio: HTMLAudioElement | null, src: string | null | undefined) {
  if (!audio || !src) return false;
  try {
    return audio.src === new URL(src, window.location.href).href;
  } catch {
    return false;
  }
}

/** Unlocks autoplay inside a click handler ("Bắt đầu làm bài") by playing silence once. */
export function primeExamAudio() {
  const audio = examAudio();
  if (!audio) return;
  try {
    audio.muted = true;
    void audio
      .play()
      .catch(() => {})
      .finally(() => {
        audio.pause();
        audio.muted = false;
      });
  } catch {
    audio.muted = false;
  }
}

let beepContext: AudioContext | null = null;

/** Short two-tone beep (660/880 Hz) to test the volume; WebAudio, no file needed. */
export function playBeep(level = volume) {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    beepContext ??= new Context();
    const context = beepContext;
    if (context.state === "suspended") void context.resume().catch(() => {});
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    const peak = Math.max(0.0001, 0.35 * level);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.setValueAtTime(peak, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    [660, 880].forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + i * 0.25);
      oscillator.connect(gain);
      oscillator.start(now + i * 0.25);
      oscillator.stop(now + 0.25 + i * 0.45);
    });
  } catch {
    /* no WebAudio */
  }
}
