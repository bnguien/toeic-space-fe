/**
 * Exercises of a topic and the stage tests (English shape produced by scripts/grammar_data_pipeline.py). The server strips the
 * answer fields (`answer`, `acceptedAnswers`, `correction`, `explanation`, `grammaticalOptions`, `correctReason`, `toeicTraps`); they only
 * come back through a reveal (`RevealDto`) and are merged into the question to print the answer line.
 */
export type QuestionKind =
  | "mcq5"
  | "pair990"
  | "wordform"
  | "error"
  | "transform"
  | "order"
  | "parse"
  | "match"
  | "judge"
  | "cloze6";

export interface UnderlinedPart {
  label: string;
  text: string;
}

/** One blank of a Part 6 passage — scored on its own id. */
export interface GrammarSubQuestion {
  id: string;
  position: number;
  /** `sentence` = sentence insertion (the option is not written into the gap). */
  kind?: string;
  options: string[];
  unitCodes?: string[];
  recall?: string[];
  answer?: string;
}

export interface GrammarQuestion {
  id: string;
  kind: QuestionKind;
  topic?: number | string;
  unitCodes?: string[];
  recall?: string[];
  difficulty?: string;
  prompt: string;
  /** mcq5 / pair990 */
  options?: string[];
  /** wordform */
  baseWord?: string;
  /** transform */
  hint?: string;
  /** error */
  underlines?: UnderlinedPart[];
  /** order */
  pieces?: string[];
  /** parse */
  segments?: string[];
  /** match */
  left?: string[];
  right?: string[];
  /** judge */
  reasons?: string[];
  /** cloze6 */
  passage?: string;
  subQuestions?: GrammarSubQuestion[];
  // Answer fields: only present after a reveal has been merged in.
  answer?: unknown;
  correction?: string;
  correctReason?: string;
  acceptedAnswers?: string[];
}

export interface GrammarMiniTest {
  questionCount: number;
  timeMinutes: number;
  passMark: number;
  questions: GrammarQuestion[];
}

export interface GrammarTests {
  version?: string;
  topic: string | number;
  stage?: string;
  /** Unit code ("CĐ04.1") → its quick check questions. */
  quickChecks: Record<string, GrammarQuestion[]>;
  miniTest: GrammarMiniTest;
}

// ---- Answers as the UI keeps them (converted to the API `value` by utils/grammar-answers.ts) ----

export interface ErrorAnswer {
  label?: string;
  correction?: string;
}

export interface JudgeAnswer {
  verdict?: string;
  reason?: string;
  correction?: string;
}

/** Part 6 passage: blank position → letter. */
export type ClozeAnswer = Record<number, string | undefined>;

/**
 * mcq5/pair990: 'A'…'D' · wordform/transform: string · error: { nhan, sua } · order: [piece index…] ·
 * parse: [label…] · match: [right letter per left item] · judge: { ketLuan, lyDo, sua } · cloze6: { viTri: letter }.
 */
export type QuestionAnswer =
  string | number[] | string[] | ErrorAnswer | JudgeAnswer | ClozeAnswer | undefined;
