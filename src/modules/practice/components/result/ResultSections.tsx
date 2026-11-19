import { forwardRef, type CSSProperties } from "react";
import { Check, Clock, Minus, Star, X } from "lucide-react";

import { Segmented } from "@/shared/components/ui";

import type { AttemptResult, PartScore } from "../../types/practice-exam.types";
import { isListeningPart, partMeta } from "../../utils/parts";
import {
  barLevel,
  cefrOf,
  formatClock,
  percentOf,
  scoreComment,
  scoreCounts,
  scoreHeadline,
} from "../../utils/scoreDisplay";
import { SectionBar } from "../common";
import {
  emptyMessage,
  sumParts,
  type ResultRow,
  type RowFilter,
  type RowStatus,
} from "./resultRows";
import styles from "./Result.module.css";

/* ---- Overview: predicted score, sections, KPI ---- */

export function ResultOverview({ result }: { result: AttemptResult }) {
  const { score } = result;
  const headline = scoreHeadline(score);
  const cefr = cefrOf(score);
  const counts = scoreCounts(score);
  const scaled = headline.kind === "scaled";
  return (
    <section className={styles.overview} aria-label="Tổng quan điểm">
      <div className={styles.total} data-kind={headline.kind}>
        <span className={styles.kicker}>{scaled ? "Điểm dự đoán" : "Tỉ lệ đúng"}</span>
        <p className={styles.totalScore}>
          <strong>{headline.value}</strong>
          <small>{scaled ? "/990" : "%"}</small>
        </p>
        {cefr && (
          <span className={styles.cefr}>
            CEFR {cefr.level}
            {cefr.title ? ` · ${cefr.title}` : ""}
          </span>
        )}
        <p className={styles.totalNote}>
          {scaled
            ? scoreComment(headline.value)
            : `Đúng ${score.correct}/${score.questionCount} câu. Bài chưa trọn phần Listening và Reading nên chưa quy đổi ra thang 990.`}
        </p>
      </div>
      <div className={styles.sections}>
        {score.listeningTotal > 0 && (
          <SectionBar
            section="listening"
            scaled={score.listeningScaled}
            correct={score.listeningCorrect}
            total={score.listeningTotal}
            className={styles.section}
          />
        )}
        {score.readingTotal > 0 && (
          <SectionBar
            section="reading"
            scaled={score.readingScaled}
            correct={score.readingCorrect}
            total={score.readingTotal}
            className={styles.section}
          />
        )}
      </div>
      <ul className={styles.stats} aria-label="Thống kê">
        <li data-kind="correct">
          <Check size={18} aria-hidden="true" />
          <div>
            <strong>{counts.correct}</strong>
            <span>Đúng · {counts.correctPercent}%</span>
          </div>
        </li>
        <li data-kind="wrong">
          <X size={18} aria-hidden="true" />
          <div>
            <strong>{counts.wrong}</strong>
            <span>Sai</span>
          </div>
        </li>
        <li data-kind="skip">
          <Minus size={18} aria-hidden="true" />
          <div>
            <strong>{counts.skipped}</strong>
            <span>Bỏ qua</span>
          </div>
        </li>
        <li data-kind="time">
          <Clock size={18} aria-hidden="true" />
          <div>
            <strong>
              {result.durationSeconds > 0 ? formatClock(result.durationSeconds) : "—"}
            </strong>
            <span>Thời gian làm</span>
          </div>
        </li>
      </ul>
    </section>
  );
}

/* ---- Part table ---- */

function MiniBar({ percent }: { percent: number }) {
  return (
    <span className={styles.miniBar} aria-hidden="true">
      <i data-level={barLevel(percent)} style={{ "--fill": `${percent}%` } as CSSProperties} />
    </span>
  );
}

function PartGroup({
  label,
  parts,
  onPart,
}: {
  label: string;
  parts: readonly PartScore[];
  onPart: (part: number) => void;
}) {
  if (!parts.length) return null;
  const sum = sumParts(parts);
  const sumPercent = percentOf(sum.correct, sum.total);
  return (
    <tbody>
      <tr
        className={styles.groupRow}
        data-section={label === "Listening" ? "listening" : "reading"}
      >
        <th scope="rowgroup" colSpan={2}>
          {label}
        </th>
        <td className={styles.num}>
          {sum.correct}/{sum.total}
        </td>
        <td>
          <span className={styles.pct}>
            <MiniBar percent={sumPercent} />
            <span>{sumPercent}%</span>
          </span>
        </td>
      </tr>
      {parts.map((p) => {
        const meta = partMeta(p.part);
        const percent = percentOf(p.correct, p.total);
        return (
          <tr key={p.part}>
            <th scope="row">
              <button
                type="button"
                className={styles.partLink}
                onClick={() => onPart(p.part)}
                title={`Xem đáp án Part ${p.part}`}
              >
                Part {p.part}
              </button>
            </th>
            <td className={styles.partName}>
              {meta.name}
              <small lang="en">{meta.enName}</small>
            </td>
            <td className={styles.num}>
              {p.correct}/{p.total}
            </td>
            <td>
              <span className={styles.pct}>
                <MiniBar percent={percent} />
                <span>{percent}%</span>
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

export function ResultPartTable({
  parts,
  onPart,
}: {
  parts: readonly PartScore[];
  onPart: (part: number) => void;
}) {
  if (!parts.length) return null;
  return (
    <section className={styles.card} aria-labelledby="result-parts-title">
      <h2 id="result-parts-title" className={styles.cardTitle}>
        Phân tích theo Part
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Part</th>
              <th scope="col">Dạng bài</th>
              <th scope="col">Đúng</th>
              <th scope="col">Tỉ lệ</th>
            </tr>
          </thead>
          <PartGroup
            label="Listening"
            parts={parts.filter((p) => isListeningPart(p.part))}
            onPart={onPart}
          />
          <PartGroup
            label="Reading"
            parts={parts.filter((p) => !isListeningPart(p.part))}
            onPart={onPart}
          />
        </table>
      </div>
    </section>
  );
}

/* ---- Answer list ---- */

const FILTERS: { value: RowFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "wrong", label: "Sai" },
  { value: "skip", label: "Bỏ qua" },
];

function StatusIcon({ status }: { status: RowStatus }) {
  const label = status === "correct" ? "Đúng" : status === "wrong" ? "Sai" : "Bỏ qua";
  return (
    <span className={styles.statusIcon} data-status={status} title={label}>
      {status === "correct" ? (
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      ) : status === "wrong" ? (
        <X size={14} strokeWidth={3} aria-hidden="true" />
      ) : (
        <Minus size={14} strokeWidth={3} aria-hidden="true" />
      )}
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}

export interface ResultAnswersProps {
  parts: readonly number[];
  part: number;
  onPart: (part: number) => void;
  filter: RowFilter;
  onFilter: (filter: RowFilter) => void;
  counts: Record<RowFilter, number>;
  visible: readonly ResultRow[];
  onOpen: (row: ResultRow) => void;
  /** Review content missing: the detail only has the answer key. */
  contentMissing: boolean;
}

export const ResultAnswers = forwardRef<HTMLElement, ResultAnswersProps>(function ResultAnswers(
  { parts, part, onPart, filter, onFilter, counts, visible, onOpen, contentMissing },
  ref,
) {
  const shownParts = part ? parts.filter((p) => p === part) : parts;
  return (
    <section ref={ref} className={styles.card} aria-labelledby="result-answers-title">
      <div className={styles.answersHead}>
        <h2 id="result-answers-title" className={styles.cardTitle}>
          Đáp án
        </h2>
        {contentMissing && (
          <p className={styles.hint}>
            Chưa mở được nội dung đề — phần chi tiết chỉ có đáp án của từng câu.
          </p>
        )}
      </div>
      {parts.length > 1 && (
        <div className={styles.scrollX}>
          <Segmented
            size="sm"
            label="Chọn Part"
            value={String(part)}
            onChange={(value) => onPart(Number(value))}
            options={[
              { value: "0", label: "Tất cả" },
              ...parts.map((p) => ({ value: String(p), label: `Part ${p}` })),
            ]}
          />
        </div>
      )}
      <Segmented
        size="sm"
        variant="subtle"
        label="Lọc câu"
        value={filter}
        onChange={onFilter}
        options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
        className={styles.filters}
      />
      {visible.length === 0 ? (
        <p className={styles.empty}>{emptyMessage(filter)}</p>
      ) : (
        shownParts.map((p) => {
          const list = visible.filter((row) => row.part === p);
          if (!list.length) return null;
          const meta = partMeta(p);
          return (
            <div key={p} className={styles.answerPart} data-section={meta.section}>
              <h3>
                Part {p} <small>{meta.name}</small>
              </h3>
              <ul className={styles.answerGrid}>
                {list.map((row) => (
                  <li key={row.questionId} className={styles.answer} data-status={row.status}>
                    <span className={styles.answerNumber}>{row.number}.</span>
                    <span className={styles.answerKey} title="Đáp án đúng">
                      {row.correct}
                    </span>
                    <span className={styles.answerSep} aria-hidden="true">
                      :
                    </span>
                    <span className={styles.answerUser} title="Bạn chọn">
                      {!row.user ? "—" : row.status === "wrong" ? <s>{row.user}</s> : row.user}
                    </span>
                    <StatusIcon status={row.status} />
                    {row.flagged && (
                      <Star
                        size={13}
                        className={styles.answerFlag}
                        aria-label="Đã đánh dấu"
                        role="img"
                      />
                    )}
                    <button
                      type="button"
                      className={styles.detailButton}
                      onClick={() => onOpen(row)}
                      aria-label={`Chi tiết câu ${row.number}`}
                    >
                      Chi tiết
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
});
