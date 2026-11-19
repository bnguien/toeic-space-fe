/**
 * URL-as-state of the grammar page (port of Studychill GrammarPage.jsx helpers), path `/games/grammar`:
 * `?topic=04&part=theory#CĐ04.1` · `?topic=04&part=exercises#<questionId>` · `?stage=01` · `?review=1`
 * (mistake book + traps) · `&discussion=document&comment=<root comment id>` (open the document discussion).
 */
import type { LessonPart, TalkTarget } from "../types/grammar.types";
import { GRAMMAR_STAGES, TOPIC_COUNT, TOPIC_PARTS } from "./grammar-curriculum";
import { parseCode, topicOfCode } from "./grammar-text";

export const GRAMMAR_PATH = "/games/grammar";

export type GrammarView =
  | { kind: "topic"; number: number; part: LessonPart }
  | { kind: "stage"; id: string }
  | { kind: "review" };

/** Where "Quay lại …" returns to after a "Xem lại" jump. */
export interface ReturnTo {
  target: { pathname: string; search: string; hash?: string };
  label: string;
}

export const PART_IDS: LessonPart[] = TOPIC_PARTS.map((p) => p.id);

/** Part shown by the URL: topic part, stage test, revision or null (overview). */
export function readView(params: URLSearchParams): GrammarView | null {
  if (params.get("review")) return { kind: "review" };
  const stageNum = params.get("stage");
  if (stageNum && GRAMMAR_STAGES.some((s) => s.number === stageNum))
    return { kind: "stage", id: `stage-${stageNum}` };
  const topicNum = Number(params.get("topic"));
  if (!Number.isInteger(topicNum) || topicNum < 1 || topicNum > TOPIC_COUNT) return null;
  const raw = params.get("part") as LessonPart | null;
  const part: LessonPart = raw && PART_IDS.includes(raw) ? raw : "theory";
  return { kind: "topic", number: topicNum, part };
}

export const viewKeyOf = (view: GrammarView | null): string => {
  if (!view) return "";
  if (view.kind === "topic") return `topic:${view.number}:${view.part}`;
  if (view.kind === "stage") return `stage:${view.id}:`;
  return "review::";
};

const RE_QID = /^[A-Za-z0-9_.-]{1,40}$/;
const RE_TALK = /^document$/;

/** Discussion opened from a link; `key` = navigation key so another link re-opens it after the learner closed it. */
export function readTalk(params: URLSearchParams, key: string): TalkTarget | null {
  const kind = params.get("discussion") || "";
  if (!RE_TALK.test(kind)) return null;
  const comment = params.get("comment") || "";
  const id = /^\d{1,12}$/.test(comment) ? comment : null;
  return { kind, id, key };
}

/** Code in the hash: a knowledge unit (#CĐ04.1, of the open topic) or the qid of an exercise / stage-test question. */
export function readHash(hash: string, view: GrammarView | null): string | null {
  let code = "";
  try {
    code = decodeURIComponent(String(hash || "").replace(/^#/, ""));
  } catch {
    return null;
  }
  if (!code || !view) return null;
  if (view.kind === "topic" && view.part === "theory")
    return topicOfCode(code) === view.number ? code : null;
  return RE_QID.test(code) ? code : null;
}

/** Roadmap item id (`4:theory:1:0`) of the unit code being read. */
export function selectedIdFromCode(topicNum: number, code: string): string {
  const parsed = parseCode(code);
  if (!parsed || parsed.topic !== topicNum) return `${topicNum}:theory`;
  return parsed.subIndex === null
    ? `${topicNum}:theory:${parsed.unitIndex}`
    : `${topicNum}:theory:${parsed.unitIndex}:${parsed.subIndex}`;
}
