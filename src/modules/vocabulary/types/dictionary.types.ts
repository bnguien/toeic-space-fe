/** POST dictionary/lookup — the text a learner selected and the sentence around it. */
export interface SelectionLookupRequest {
  text: string;
  context?: string;
  /** Second pass: lets the server use AI (honoured only for signed-in learners). */
  allowAi: boolean;
}

export type SelectionKind = "word" | "phrase" | "sentence";

export interface SelectionLookupDto {
  text: string;
  kind: SelectionKind;
  found: boolean;
  meaning: string;
  phonetic: string;
  /** Enum name from the server ("Noun", "Verb"…); null for sentences. */
  partOfSpeech: string | null;
  cefr: string;
  definitionEn: string;
  example: string;
  exampleVi: string;
  phraseType: string | null;
  complete: boolean;
  aiUsed: boolean;
  /** The server may run AI for this caller (signed in): a second pass can still add phonetics/examples. */
  aiAllowed: boolean;
  savedWordId: string | null;
  officialWordId: string | null;
}

/** Viewport position of the selection: the bubble sits above it, or below when there is no room. */
export interface SelectionAnchor {
  x: number;
  y: number;
  below: boolean;
}

/** What a page receives when it registers itself to draw selection lookups on its own. */
export interface SelectionLookupEvent {
  text: string;
  context: string;
  anchor?: SelectionAnchor;
  /** Whether the provider looks the selection up by itself (`autoLookup` of the receiver). */
  autoLookup: boolean;
  result?: SelectionLookupDto | null;
  lookingUp?: boolean;
  enriching?: boolean;
  error?: string;
}

export type SelectionLookupReceiver = (event: SelectionLookupEvent) => void;

export interface SelectionLookupContextValue {
  /** Selecting text looks it up right now. */
  enabled: boolean;
  /** A page has put lookups behind its own switch (exam-style pages). */
  locked: boolean;
  /** The switch of a locked page. */
  switchOn: boolean;
  setSwitchOn: (on: boolean) => void;
  registerLock: (() => () => void) | null;
  registerReceiver:
    ((receiver: SelectionLookupReceiver, options?: { autoLookup?: boolean }) => () => void) | null;
  requestLookup: (text: string, context?: string) => void;
  close: () => void;
}
