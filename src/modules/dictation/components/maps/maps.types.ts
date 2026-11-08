/**
 * Shapes shared by the Dictation map screens. Data flows in from the parent page (API hooks live
 * there); the maps only render and call back. Field names mirror Studychill's map components in
 * English (`sub_level` → `subLevel`, `stages_done` → `stagesDone`, …).
 */

/** A dictation topic pack (the "chặng") shown on the topic map. */
export interface DictationPack {
  slug: string;
  title: string;
  /** One-line description under the title at the top of the map. */
  description?: string;
}

/** One course ("màn") on the topic map. */
export interface DictationMapCourse {
  /** Stable key used by the stars map (Studychill: the course code). */
  id: string;
  /** Database id used to open the play session. */
  courseId?: number | string;
  title: string;
  /** Number of sentences; the mode modal shows it (defaults to 30). */
  statementCount?: number;
  order?: number;
}

/** Stars earned per course id (0–3); a course with at least one star counts as passed. */
export type DictationStarsMap = Record<string, number>;

export type DictationGameMode = "basic" | "pro";

export interface DictationSoundSettings {
  bgmEnabled: boolean;
  typingSoundEnabled: boolean;
  feedbackSoundEnabled: boolean;
}

/** What the mode modal hands back when the learner presses Start. */
export interface DictationStartOptions extends DictationSoundSettings {
  mode: DictationGameMode;
}

export type RoadmapStageState = "done" | "current" | "locked";

/** One stage of a TOEIC roadmap level. */
export interface RoadmapStage {
  no: number;
  /** Branch label (3A/3B/3C…); a change between two stages draws a gate on the map. */
  subLevel?: string | null;
  /** Course title when the stage is a bundled course (enables Cơ bản / Nâng cao). */
  title?: string | null;
  /** Sentences in the stage. */
  count: number;
  /** Sentences already passed. */
  passed: number;
  /** Average words per sentence. */
  words: number;
  stars: number;
  state: RoadmapStageState;
  topics: string[];
  itemIds: number[];
  courseId?: number | string | null;
  /** The course has vocabulary warm-ups between sentences (changes the Cơ bản caption). */
  vocab?: boolean;
}

/** One roadmap level ("chặng"), drawn as its own map. */
export interface RoadmapLevel {
  level: number;
  /** TOEIC band label, e.g. "450+". */
  band: string;
  stages: RoadmapStage[];
  stagesDone: number;
  /** Sentences passed across the level. */
  passed: number;
  /** Sentences in the level. */
  items: number;
}
