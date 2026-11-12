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
    set((state) => ({ items: [...state.items.slice(-3), { id, title, tone }] }));
    window.setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

interface ToastCallable {
  (title: string, tone?: Tone, durationMs?: number): void;
  success: (title: string, durationMs?: number) => void;
  error: (title: string, durationMs?: number) => void;
  info: (title: string, durationMs?: number) => void;
}

/** Status toast notification displayed on the right side of the screen. */
export const toast: ToastCallable = Object.assign(
  (title: string, tone: Tone = "neutral", durationMs = 3500) => {
    useToastStore.getState().show(title, tone, durationMs);
  },
  {
    success: (title: string, durationMs = 4000) => {
      useToastStore.getState().show(title, "green", durationMs);
    },
    error: (title: string, durationMs = 4000) => {
      useToastStore.getState().show(title, "rose", durationMs);
    },
    info: (title: string, durationMs = 3500) => {
      useToastStore.getState().show(title, "blue", durationMs);
    },
  },
);
