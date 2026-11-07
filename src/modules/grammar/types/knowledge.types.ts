/**
 * Knowledge document of a topic (English shape produced by scripts/grammar_data_pipeline.py; diagram kinds in docs/grammar.md).
 * Answers are stripped by the server; the teaching block `toeicTraps` is kept.
 */

/** Diagram colour roles of the PDF: moss = main, lime = the slot asked about, gold = trap, soft = context. */
export type DiagramColor = "moss" | "lime" | "gold" | "soft";

export interface DiagramNode {
  text: string;
  tone: DiagramColor;
}

interface DiagramBase {
  title: string;
  memoryHook: string;
}

export interface SlotDiagram extends DiagramBase {
  kind: "slot";
  cells: {
    label?: string;
    text: string;
    tone: DiagramColor;
    highlight?: boolean;
    optional?: boolean;
  }[];
}

export interface BranchDiagram extends DiagramBase {
  kind: "branch";
  root: DiagramNode;
  branches: { text: string; tone: DiagramColor; example?: string; children?: DiagramNode[] }[];
}

export interface CompareDiagram extends DiagramBase {
  kind: "compare";
  columns: DiagramNode[];
  rows: { criterion: string; cells: string[]; tone?: DiagramColor | null }[];
}

export interface DecisionNode {
  id: string;
  text: string;
  tone: DiagramColor;
  kind: "question" | "results" | string;
  yes?: string;
  no?: string;
}

export interface DecisionDiagram extends DiagramBase {
  kind: "decision";
  start: string;
  nodes: DecisionNode[];
}

export interface TimelineMilestone {
  id: string;
  text: string;
  tone: DiagramColor;
  kind: "point" | "range" | "repeat";
  position: number;
  end?: number;
}

export interface TimelineDiagram extends DiagramBase {
  kind: "timeline";
  now?: boolean;
  marks: TimelineMilestone[];
}

export interface LadderDiagram extends DiagramBase {
  kind: "ladder";
  axis: { high: string; low: string };
  steps: { text: string; tone: DiagramColor; example?: string }[];
}

export interface FamilyDiagram extends DiagramBase {
  kind: "family";
  root: { text: string; tone: DiagramColor; partOfSpeech?: string };
  members: { text: string; tone: DiagramColor; partOfSpeech: string; suffix?: string }[];
}

export interface FormulaDiagram extends DiagramBase {
  kind: "formula";
  blocks: {
    text: string;
    tone: DiagramColor;
    label?: string;
    example?: string;
    optional?: boolean;
    joinBefore?: string;
  }[];
}

export interface LayersDiagram extends DiagramBase {
  kind: "layers";
  core: { text: string; tone: DiagramColor; label?: string };
  layers: {
    text: string;
    tone: DiagramColor;
    label: string;
    side: "before" | "after" | "inside";
  }[];
  fullSentence?: string;
}

export interface MatrixDiagram extends DiagramBase {
  kind: "matrix";
  root?: string;
  columns: DiagramNode[];
  rows: DiagramNode[];
  cells: string[][];
  caption?: string;
}

export type GrammarDiagram =
  | SlotDiagram
  | BranchDiagram
  | CompareDiagram
  | DecisionDiagram
  | TimelineDiagram
  | LadderDiagram
  | FamilyDiagram
  | FormulaDiagram
  | LayersDiagram
  | MatrixDiagram;

export type DiagramKind = GrammarDiagram["kind"];

export interface KnowledgeExample {
  sentence: string;
  translation: string;
  /** Phrase highlighted in the sentence. */
  label: string;
  caption?: string;
}

/** "Bẫy TOEIC" teaching block (not an answer field). */
export interface KnowledgeTrap {
  trap: string;
  why: string;
  avoid: string;
  part?: string;
}

/** "↺ Nhắc lại" link to older units. */
export interface KnowledgeRecall {
  code: string[];
  note: string;
}

/** A unit (CĐ04.1) or a sub-unit (CĐ04.1.2). */
export interface GrammarKnowledgeUnit {
  number: string;
  code: string;
  title: string;
  mainIdea: string;
  signals?: string[];
  formula?: string | null;
  examples?: KnowledgeExample[];
  toeicTraps?: KnowledgeTrap[];
  diagram?: GrammarDiagram | null;
  /** Tip of the mascot (content key kept from the source data). */
  tip?: string | null;
  recall?: KnowledgeRecall | null;
  subItems?: GrammarKnowledgeUnit[];
}

export interface GrammarKnowledge {
  version?: string;
  code: string;
  number: number;
  stage: string;
  title: string;
  goals: string[];
  units: GrammarKnowledgeUnit[];
  summary: string[];
}
