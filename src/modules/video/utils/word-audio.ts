// Word / phrase pronunciation: neural voice of the speech endpoint, browser speechSynthesis (en-US) on any failure
// (503 SPEECH_UNAVAILABLE, network, autoplay block). One clip at a time: a new call stops the previous one.
import { speak, stopSpeaking } from "@/modules/vocabulary";

import { speechUrl } from "../api/video.api";

let current: HTMLAudioElement | null = null;
let playback = 0;

export function stopWordAudio(): void {
  playback += 1;
  stopSpeaking();
  if (current) {
    try {
      current.pause();
      current.removeAttribute("src");
    } catch {
      /* media already detached */
    }
  }
  current = null;
}

export function playWordAudio(text: string, voice = "andrew"): void {
  const value = String(text || "").trim();
  if (!value) return;
  stopWordAudio();
  const id = playback;
  let fellBack = false;
  // `error` and the rejected play() can both fire for one failure: speak once.
  const fallback = () => {
    if (fellBack || id !== playback) return;
    fellBack = true;
    speak(value, "en-US");
  };
  try {
    const audio = new Audio(speechUrl(value, voice));
    audio.preload = "auto";
    audio.onerror = fallback;
    current = audio;
    audio.play().catch(fallback);
  } catch {
    fallback();
  }
}
