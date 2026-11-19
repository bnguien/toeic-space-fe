import { ArrowRight, LoaderCircle, Play, Trophy } from "lucide-react";

import { Badge, ButtonGlyph, NumberTile, ProgressBar } from "@/shared/components/ui";

import type { ToeicTest } from "../../types/practice-exam.types";
import { partMeta } from "../../utils/parts";
import {
  cardTag,
  modeLabel,
  setHeadline,
  setKindLabel,
  setTarget,
  testNumber,
  type CardState,
  type ItemProgress,
  type PracticeSetItem,
} from "./spaceModel";
import styles from "./SpaceCards.module.css";

/* Fixed bar heights of the listening card waveform (decoration, lit by progress). */
const WAVE = [38, 64, 46, 82, 58, 92, 50, 72, 40, 86, 62, 48, 76, 54, 34, 68, 88, 44, 60, 36];

function Foot({ state, percent, extra }: { state: CardState; percent: number; extra?: string }) {
  const next = state === "next";
  return (
    <span className={styles.foot}>
      <ProgressBar
        className={styles.bar}
        value={percent}
        size="xs"
        tone={next ? "outline" : state === "done" ? "neutral" : "tone"}
        inverted={next}
        label={`Tiến độ ${percent}%`}
      />
      <span className={styles.percent}>{percent}%</span>
      {extra && <span className={styles.extra}>{extra}</span>}
      <ButtonGlyph
        round
        size="sm"
        variant={next ? "secondary" : state === "done" ? "outline" : "tone"}
        className={styles.play}
      >
        <Play size={13} />
      </ButtonGlyph>
    </span>
  );
}

function Tag({ state, children }: { state: CardState; children: string }) {
  return (
    <Badge tone={state === "doing" ? "tone" : "outline"} size="md" className={styles.tag}>
      {children}
    </Badge>
  );
}

/* ---- Exam: one full test ---- */

export interface TestCardProps {
  test: ToeicTest;
  progress: ItemProgress & { best: number | null; activeMode: string | null };
  state: CardState;
  busy?: boolean;
  onOpen: () => void;
}

export function TestCard({ test, progress, state, busy, onOpen }: TestCardProps) {
  const number = testNumber(test);
  const listening = test.totalListeningQuestions || 100;
  const reading = test.totalReadingQuestions || 100;
  const tag =
    state === "doing" && progress.activeMode
      ? `${modeLabel(progress.activeMode as "FullTest" | "Practice")} dở`
      : cardTag(state, progress.percent, `${test.totalQuestions} câu`);
  return (
    <button
      type="button"
      className={styles.card}
      data-state={state}
      aria-busy={busy || undefined}
      aria-label={`${test.title}, ${tag}, tiến độ ${progress.percent}%`}
      onClick={onOpen}
    >
      <span className={styles.top}>
        <NumberTile
          label="Test"
          value={number || "—"}
          size="lg"
          inverted={state === "next"}
          className={styles.number}
        />
        <Tag state={state}>{tag}</Tag>
      </span>
      <span className={styles.chips}>
        <Badge tone="outline">Nghe {listening}</Badge>
        <Badge tone="outline">Đọc {reading}</Badge>
        <Badge tone="outline">{test.durationMinutes} phút</Badge>
      </span>
      <span className={styles.range}>
        Part 1 <ArrowRight size={12} aria-hidden="true" /> Part 7
        {progress.best != null && (
          <span className={styles.best} title="Điểm thi thử cao nhất">
            <Trophy size={12} aria-hidden="true" /> {progress.best}/990
          </span>
        )}
      </span>
      <Foot state={state} percent={progress.percent} />
    </button>
  );
}

/* ---- Listening / Reading: one practice set ---- */

export interface SetCardProps {
  set: PracticeSetItem;
  index: number;
  variant: "listen" | "read";
  progress: ItemProgress & { answered: number; total: number };
  state: CardState;
  onOpen: () => void;
}

export function SetCard({ set, index, variant, progress, state, onOpen }: SetCardProps) {
  const kicker = `Bộ ${String(index + 1).padStart(2, "0")}`;
  const tag = state === "todo" ? null : cardTag(state, progress.percent, "", "Đã xong");
  const headline = setHeadline(set);
  const target = setTarget(set);
  const meta = `${set.questionCount} câu · ${set.durationMinutes} phút`;
  const label = `${set.title}, ${meta}, tiến độ ${progress.percent}%`;

  if (variant === "listen") {
    const lit = Math.round((progress.percent / 100) * WAVE.length);
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.disc}`}
        data-state={state}
        aria-label={label}
        title={set.title}
        onClick={onOpen}
      >
        <span className={styles.discHead}>
          <span className={styles.vinyl} aria-hidden="true">
            <span>{target ?? "★"}</span>
          </span>
          <span className={styles.discText}>
            <span className={styles.kicker}>
              {kicker}
              {tag && <em>{tag}</em>}
            </span>
            <b>{headline}</b>
            <small>{set.kind === "Level" ? meta : `${setKindLabel(set.kind)} · ${meta}`}</small>
          </span>
        </span>
        <span className={styles.wave} aria-hidden="true">
          {WAVE.map((height, i) => (
            <i key={i} style={{ height: `${height}%` }} data-lit={i < lit || undefined} />
          ))}
        </span>
        <Foot
          state={state}
          percent={progress.percent}
          extra={`${progress.answered}/${progress.total} câu`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${styles.page}`}
      data-state={state}
      aria-label={label}
      title={set.title}
      onClick={onOpen}
    >
      <span className={styles.spine} aria-hidden="true" />
      <span className={styles.pageIn}>
        <span className={styles.kicker}>
          {kicker}
          {tag && <em>{tag}</em>}
        </span>
        <span className={styles.target}>
          {target ?? set.questionCount}
          <small>{target ? "mục tiêu" : "câu"}</small>
        </span>
        <span className={styles.level}>{headline}</span>
        <span className={styles.lines} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <small className={styles.meta}>
          {set.kind === "Level" ? meta : `${setKindLabel(set.kind)} · ${meta}`}
        </small>
        <Foot
          state={state}
          percent={progress.percent}
          extra={`${progress.answered}/${progress.total} câu`}
        />
      </span>
    </button>
  );
}

/* ---- "Từ đề thi": one part of a full test, practised alone ---- */

export interface PartTestCardProps {
  test: ToeicTest;
  series: string;
  part: number;
  inProgress: boolean;
  busy: boolean;
  onOpen: () => void;
}

export function PartTestCard({ test, series, part, inProgress, busy, onOpen }: PartTestCardProps) {
  const meta = partMeta(part);
  return (
    <button
      type="button"
      className={styles.mini}
      aria-busy={busy || undefined}
      aria-label={`${test.title}, Part ${part}${inProgress ? ", đang làm dở" : ""}`}
      onClick={onOpen}
      disabled={busy}
    >
      <span className={styles.miniNo}>
        <small>Test</small>
        {testNumber(test) || "—"}
      </span>
      <span className={styles.miniText}>
        <b>
          Part {part} · {meta.count} câu
        </b>
        <small data-busy={busy || undefined} data-open={(inProgress && !busy) || undefined}>
          {busy
            ? "Đang chuẩn bị đề…"
            : inProgress
              ? "Đề đang có bài làm dở"
              : `~${meta.minutes} phút · ${series}`}
        </small>
      </span>
      <ButtonGlyph round size="sm" variant="tone" className={styles.play}>
        {busy ? <LoaderCircle size={13} className={styles.spin} /> : <Play size={13} />}
      </ButtonGlyph>
    </button>
  );
}
