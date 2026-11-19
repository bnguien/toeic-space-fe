/** Relative time labels of lesson comments (port of Studychill community `timeUtils.js` relativeTime/useNow). */
import { useEffect, useState } from "react";

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 10) return "Vừa xong";
  if (s < 60) return `${s} giây`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// Shared clock tick (every 20 s) so every label updates together.
const tickListeners = new Set<(now: number) => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function subscribeTick(listener: (now: number) => void): () => void {
  tickListeners.add(listener);
  if (!tickTimer) {
    tickTimer = setInterval(() => {
      const now = Date.now();
      tickListeners.forEach((fn) => fn(now));
    }, 20000);
  }
  return () => {
    tickListeners.delete(listener);
    if (!tickListeners.size && tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribeTick(setNow), []);
  return now;
}
