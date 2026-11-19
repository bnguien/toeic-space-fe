import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { PART_META, partSpacePath } from "../../utils/parts";
import styles from "./SpaceMaps.module.css";
import { partTone, toneStyle } from "./spaceTones";

export interface PartNode {
  part: number;
  name: string;
  /** Second line, e.g. "5 bộ · 2 đã làm". */
  meta: string;
}

/** Listening map: the parts as circles joined by short links. */
export function PartCircles({
  nodes,
  onPick,
}: {
  nodes: PartNode[];
  onPick: (part: number) => void;
}) {
  return (
    <ol className={styles.circles} aria-label="Các Part">
      {nodes.map((node, index) => (
        <li key={node.part} className={styles.circleCell}>
          {index > 0 && <span className={styles.link} aria-hidden="true" />}
          <button
            type="button"
            className={styles.circle}
            style={toneStyle(partTone(node.part))}
            onClick={() => onPick(node.part)}
          >
            <span className={styles.kicker}>Part {node.part}</span>
            <b>{node.name}</b>
            <span className={styles.meta}>{node.meta}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

const STEP_UNIT: Record<number, string> = { 5: "Một câu", 6: "Một đoạn văn", 7: "Cả bài đọc" };

/** Reading map: steps rising with the text length (sentence → paragraph → whole reading). */
export function PartSteps({
  nodes,
  onPick,
}: {
  nodes: PartNode[];
  onPick: (part: number) => void;
}) {
  return (
    <ol className={styles.steps} aria-label="Các Part">
      {nodes.map((node, index) => (
        <li key={node.part} style={{ "--h": `${52 + index * 24}%` } as CSSProperties}>
          <button
            type="button"
            className={styles.step}
            style={toneStyle(partTone(node.part))}
            onClick={() => onPick(node.part)}
          >
            <span className={styles.kicker}>Part {node.part}</span>
            <b>{node.name}</b>
            <span className={styles.meta}>
              {STEP_UNIT[node.part] ? `${STEP_UNIT[node.part]} · ` : ""}
              {node.meta}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

const SECTIONS = [
  { key: "listening", title: "Listening · Nghe", minutes: 45 },
  { key: "reading", title: "Reading · Đọc", minutes: 75 },
] as const;

/** Exam map: the structure of one test, two section cards with parts sized by question count. */
export function ExamCriteria() {
  return (
    <ol className={styles.exam} aria-label="Cấu trúc một đề TOEIC: 200 câu, 120 phút">
      {SECTIONS.map((section) => {
        const parts = PART_META.filter((meta) => meta.section === section.key);
        const questions = parts.reduce((sum, meta) => sum + meta.count, 0);
        return (
          <li key={section.key} className={styles.examCard} data-section={section.key}>
            <span className={styles.examHead}>
              <span className={styles.kicker}>{section.title}</span>
              <span className={styles.examNums}>
                <b>
                  {questions}
                  <small>câu</small>
                </b>
                <b>
                  {section.minutes}
                  <small>phút</small>
                </b>
              </span>
            </span>
            <span className={styles.examParts}>
              {parts.map((meta) => (
                <Link
                  key={meta.part}
                  to={partSpacePath(meta.part)}
                  className={styles.examPart}
                  style={{ flexGrow: meta.count }}
                  title={`Part ${meta.part} · ${meta.name} · ${meta.count} câu`}
                >
                  <b>P{meta.part}</b>
                  <small>{meta.count}</small>
                </Link>
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
