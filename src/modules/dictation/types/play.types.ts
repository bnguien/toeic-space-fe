/**
 * Contract between a play page (which loads sentences from the API) and the play session UI
 * (`components/play/DictationPlaySession`), ported from Studychill's `source` object.
 */
import type { ReactNode } from "react";

import type { Mistake, TargetWord } from "@/shared/utils/dictation-check";

import type { PlaySettings } from "../utils/dictation-settings";
import type { ProofState, WordProofMatcher } from "../utils/word-proof";
import type {
  DictationKeywordDto,
  DictationNoteDto,
  DictationVoice,
  HintMode,
} from "./dictation.types";

export interface PlayEntry {
  key: string;
  number: number;
}

/** A loaded sentence. `known` is the frame with the answer letters (null until the server returns them). */
export interface PlayItem {
  key: string;
  number: number;
  id: number;
  target: TargetWord[];
  known: TargetWord[] | null;
  /** Correct sentence text once known ("" while playing a server sentence). */
  display: string;
  translation: string;
  keywords: DictationKeywordDto[];
  ipa: string;
  notes: DictationNoteDto[];
  /** From the support-gated level: keywords and meaning open only after the first submission. */
  gated: boolean;
  matcher: WordProofMatcher | null;
}

export type AudioKind = "normal" | "slow";

/** Server audio (`url`, browser voice fallback with `text` when known) or browser voice only. */
export interface AudioSpec {
  url?: string;
  text: string;
  lang: string;
  rate: number;
}

export interface GradeMeta {
  hints: number;
  assisted: boolean;
}

export interface GradeOutcome {
  known: TargetWord[] | null;
  display: string;
  translation: string;
  /** Server (or guest rule) says the next sentence opens. */
  unlocks: boolean;
}

export interface HintOutcome {
  index: number;
  word: string | null;
  letter: string | null;
}

export interface Interlude {
  key: string;
  render: (done: () => void) => ReactNode;
}

export type SentenceStatus = "clean" | "passed" | "revealed";

/** Grade mark of one word: a full letter grade, a plain ok, or a proof verdict without letter marks. */
export type WordMark = {
  status: "ok" | "wrong" | "missing";
  marks?: boolean[] | null;
  answerMarks?: boolean[];
  extra?: number;
} | null;

/** Result of one sentence kept in the session (`results[entry.key]`). */
export interface SentenceResult {
  status: SentenceStatus;
  attempts: number;
  hints: number;
  words: string[];
  marks: WordMark[];
  mistakes: Mistake[];
  unlocks?: boolean;
  known?: TargetWord[] | null;
  display?: string;
  translation?: string;
  retry?: SentenceStatus;
}

export interface PlaySource {
  key: string;
  title: string;
  subtitle: string;
  server: boolean;
  /** TOEIC roadmap: a sentence is done only when it unlocks the next one. */
  mustPass: boolean;
  /** Resume the session from localStorage (static sources only). */
  persist: boolean;
  guestNote: string;
  onLogin: (() => void) | null;
  entries: PlayEntry[];
  unlocked?: boolean[];
  initialDone?: boolean[];
  voices: DictationVoice[];
  voice: string;
  onVoice: (key: string) => void;
  peek: (index: number) => PlayItem | null;
  prepare: (index: number) => Promise<PlayItem>;
  audio: (item: PlayItem, kind: AudioKind, settings: PlaySettings) => AudioSpec | null;
  grade?: (item: PlayItem, words: string[], meta: GradeMeta) => Promise<GradeOutcome>;
  hint?: (item: PlayItem, words: string[], mode: HintMode) => Promise<HintOutcome>;
  checkWord?: (item: PlayItem, index: number, word: string) => Promise<ProofState | null>;
  interludeAt?: (index: number) => Interlude | null;
  /** When set, the session hands its results over instead of showing the finish screen. */
  onFinish?: (results: Record<string, SentenceResult>, seconds: number) => void;
  /** Label of the back button (default "Bản đồ"). */
  backLabel?: string;
}
