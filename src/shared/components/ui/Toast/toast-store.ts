import { create } from "zustand";

import type { Tone } from "../types";

export interface ToastItem {
  id: number;
  title: string;
  tone: Tone;
}

interface ToastState {
  items: ToastItem[];
  show: (title: string, tone?: Tone, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  items: [],
  show: (title, tone = "neutral", durationMs = 3500) => {
    const id = nextId++;
    set((state) => ({ items: [...state.items.slice(-2), { id, title, tone }] }));
    window.setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

/** Short status message at the bottom of the screen. */
export const toast = (title: string, tone?: Tone) => useToastStore.getState().show(title, tone);
