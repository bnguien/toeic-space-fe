import { useState } from "react";
import { CheckCircle2, Clock, Eye, Play, Trash2, Trophy } from "lucide-react";

import { Button, ButtonLink, ConfirmDialog, Segmented } from "@/shared/components/ui";

import type { AttemptSummary, SetQuestionProgress } from "../../types/practice-exam.types";
import {
  filterSetQuestions,
  statusSymbol,
  type QuestionFilter,
} from "../../utils/practiceSelection";
import { formatDateTime } from "../../utils/scoreDisplay";
import styles from "./Setup.module.css";

/* ---- The attempt in progress ---- */

interface ActiveAttemptCardProps {
  attempt: AttemptSummary;
  onContinue: () => void;
  onDiscard: () => void;
  discarding: boolean;
  discardError: string | null;
}

export function ActiveAttemptCard({
  attempt,
  onContinue,
  onDiscard,
  discarding,
  discardError,
}: ActiveAttemptCardProps) {
  const [confirming, setConfirming] = useState(false);
  const percent = attempt.questionCount
    ? Math.round((attempt.answered / attempt.questionCount) * 100)
    : 0;
  return (
    <section className={styles.active} aria-labelledby="setup-active">
      <span className={styles.activeIcon} aria-hidden="true">
        <Clock size={20} />
      </span>
      <div className={styles.activeText}>
        <p className={styles.activeKicker}>Bài đang làm dở</p>
        <h2 id="setup-active">{attempt.title || "Bài luyện tập"}</h2>
        <p>
          Đã làm {attempt.answered}/{attempt.questionCount} câu ({percent}%) · bắt đầu{" "}
          {formatDateTime(attempt.startTime)}
        </p>
      </div>
      <div className={styles.activeActions}>
        <Button variant="primary" icon={<Play size={15} />} onClick={onContinue}>
          Làm tiếp
        </Button>
        <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirming(true)}>
          Bỏ bài
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Bỏ bài đang làm dở?"
        description={`“${attempt.title || "Bài luyện tập"}” sẽ dừng lại và không được chấm. Kết quả các câu đã kiểm tra vẫn được giữ trong tiến độ của bộ.`}
        confirmLabel="Bỏ bài"
        tone="danger"
        pending={discarding}
        error={discardError}
        onConfirm={() => {
          onDiscard();
        }}
        onClose={() => setConfirming(false)}
      />
    </section>
  );
}

/* ---- This set's attempts ---- */

export function SetAttemptsList({
  attempts,
  activeId,
  onContinue,
}: {
  attempts: AttemptSummary[];
  activeId: string | null;
  onContinue: (attemptId: string) => void;
}) {
  return (
    <section className={`${styles.sheet} ${styles.history}`} aria-labelledby="setup-history">
      <h2 id="setup-history" className={styles.sectionTitle}>
        Bài đã làm ({attempts.length})
      </h2>
      <ul className={styles.historyList}>
        {attempts.map((attempt) => {
          const done = attempt.status === "Completed";
          return (
            <li key={attempt.id} className={styles.historyRow}>
              <div className={styles.historyInfo}>
                <strong>{attempt.title || "Bài luyện tập"}</strong>
                <p>
                  <span data-status={done ? "done" : "doing"}>
                    {done ? (
                      <CheckCircle2 size={13} aria-hidden="true" />
                    ) : (
                      <Clock size={13} aria-hidden="true" />
                    )}
                    {done ? "Đã nộp" : "Đang làm dở"}
                  </span>
                  {" · "}
                  {formatDateTime(attempt.endTime ?? attempt.startTime)}
                  {" · "}Đã làm {attempt.answered}/{attempt.questionCount} câu
                  {done && ` · Đúng ${attempt.correct}/${attempt.questionCount}`}
                </p>
              </div>
              <div className={styles.historyActions}>
                {done ? (
                  <>
                    <ButtonLink
                      to={`/practice/attempts/${attempt.id}/review`}
                      size="sm"
                      variant="ghost"
                      icon={<Eye size={14} />}
                    >
                      Xem chữa
                    </ButtonLink>
                    <ButtonLink
                      to={`/practice/attempts/${attempt.id}/result`}
                      size="sm"
                      variant="ghost"
                      icon={<Trophy size={14} />}
                    >
                      Kết quả
                    </ButtonLink>
                  </>
                ) : (
                  attempt.id === activeId && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Play size={14} />}
                      onClick={() => onContinue(attempt.id)}
                    >
                      Làm tiếp
                    </Button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---- Per-question progress ---- */

const FILTERS: readonly { value: QuestionFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "answered", label: "Đã làm" },
  { value: "unanswered", label: "Chưa làm" },
];

const STATUS_LABEL = { Correct: "Đúng", Wrong: "Sai", Unanswered: "Chưa làm" } as const;

export function QuestionProgressGrid({ rows }: { rows: SetQuestionProgress[] }) {
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const visible = filterSetQuestions(rows, filter);
  const ordered = filterSetQuestions(rows, "all");
  const numberOf = new Map(ordered.map((row, index) => [row.sourceQuestionId, index + 1]));
  return (
    <details className={`${styles.sheet} ${styles.questions}`}>
      <summary>Xem tiến độ từng câu trong toàn bộ bộ luyện</summary>
      <div className={styles.questionsBody}>
        <Segmented
          label="Lọc câu"
          size="sm"
          options={FILTERS.map((f) => ({
            ...f,
            count: filterSetQuestions(rows, f.value).length,
          }))}
          value={filter}
          onChange={setFilter}
        />
        <p className={styles.legend}>
          <span data-status="Correct">✓ Đúng</span>
          <span data-status="Wrong">× Sai</span>
          <span data-status="Unanswered">– Chưa làm</span>
        </p>
        {visible.length ? (
          <ol className={styles.grid}>
            {visible.map((row) => {
              const number = numberOf.get(row.sourceQuestionId) ?? 0;
              const label = `Câu ${number}: ${STATUS_LABEL[row.status]}${
                row.lastAnsweredAt ? ` · ${formatDateTime(row.lastAnsweredAt)}` : ""
              }`;
              return (
                <li
                  key={row.sourceQuestionId}
                  data-status={row.status}
                  title={label}
                  aria-label={label}
                >
                  {number}
                  <small aria-hidden="true">{statusSymbol(row.status)}</small>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.legend}>Chưa có câu nào trong mục này.</p>
        )}
      </div>
    </details>
  );
}
