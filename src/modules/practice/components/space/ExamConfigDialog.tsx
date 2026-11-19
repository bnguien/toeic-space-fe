import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Headphones,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import { Button, Modal, Segmented } from "@/shared/components/ui";

import { useStartTestAttempt } from "../../hooks/usePracticeExamMutations";
import { useActiveTestAttempt } from "../../hooks/usePracticeExamQueries";
import type { ToeicTest } from "../../types/practice-exam.types";
import {
  ALL_PARTS,
  LISTENING_PARTS,
  PART_META,
  READING_PARTS,
  partsSummary,
} from "../../utils/parts";
import { practiceExamError } from "../../utils/practiceExamErrors";
import { formatClock } from "../../utils/scoreDisplay";
import styles from "./ExamConfigDialog.module.css";
import {
  AUDIO_SPEEDS,
  activeRelation,
  configModeOf,
  modeLabel,
  partsLabel,
  secondsLeft,
  type ConfigMode,
} from "./spaceModel";

export interface ExamConfigDialogProps {
  test: ToeicTest;
  /** Where "back" leads from the attempt (the series or part list). */
  from: string;
  /** Preselected parts (e.g. [7] from a part's "Từ đề thi" list). */
  initialParts?: readonly number[];
  onClose: () => void;
}

const MODE_OPTIONS = [
  { value: "Practice", label: "Luyện tập", icon: <Lightbulb size={14} aria-hidden="true" /> },
  { value: "FullTest", label: "Thi thử", icon: <Clock size={14} aria-hidden="true" /> },
] as const;

const SPEED_OPTIONS = AUDIO_SPEEDS.map((speed) => ({
  value: String(speed.value),
  label: speed.label,
}));

/** Shows a pending label only when the wait is noticeable (StudyChill: after 400 ms). */
function useDelayedFlag(active: boolean, delayMs: number) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setShown(false);
    };
  }, [active, delayMs]);
  return active && shown;
}

/**
 * "Cấu hình làm bài" (StudyChill ExamConfigDialog): parts with quick picks, Luyện tập / Thi thử,
 * audio speed, the note about the in-progress attempt and the start buttons. Thi thử opens the exam
 * room; Luyện tập starts (or resumes) a Practice attempt with the chosen parts.
 */
export function ExamConfigDialog({ test, from, initialParts, onClose }: ExamConfigDialogProps) {
  const navigate = useNavigate();
  // Until the learner changes them, mode and parts follow the attempt in progress (if any), so
  // the default action is to continue it.
  const [partsChoice, setParts] = useState<number[] | null>(() =>
    initialParts?.length ? [...initialParts] : null,
  );
  const [modeChoice, setMode] = useState<ConfigMode | null>(null);
  const [speed, setSpeed] = useState("1");
  const active = useActiveTestAttempt(test.id);
  const start = useStartTestAttempt();
  const pending = start.isPending;
  const loadingLabel = useDelayedFlag(pending, 400);
  const preparing = useDelayedFlag(pending, 3000);

  const activeData = active.data?.attemptId ? active.data : null;
  const activeMode = activeData ? configModeOf(activeData.mode) : null;
  const mode: ConfigMode =
    modeChoice ?? (initialParts?.length ? "Practice" : (activeMode ?? "Practice"));
  const parts: readonly number[] =
    partsChoice ??
    (activeMode === "Practice" && activeData?.parts.length ? activeData.parts : ALL_PARTS);
  const exam = mode === "FullTest";
  const chosen = exam ? [...ALL_PARTS] : [...parts].sort((a, b) => a - b);
  const summary = partsSummary(chosen);
  const relation = activeRelation(activeData, mode, chosen);
  const nothingChosen = !exam && chosen.length === 0;
  const blocked = nothingChosen || pending || active.isPending;
  const speedValue = Number(speed);

  const toggle = (part: number) =>
    setParts(parts.includes(part) ? parts.filter((p) => p !== part) : [...parts, part]);
  const pick = (next: readonly number[]) => setParts([...next]);

  const go = (restart: boolean) => {
    if (blocked) return;
    if (exam) {
      onClose();
      navigate(`/practice/tests/${test.id}/exam`, { state: { restart, from } });
      return;
    }
    start.mutate(
      { testId: test.id, mode: "Practice", parts: chosen, restart },
      {
        onSuccess: (attempt) => {
          onClose();
          navigate(`/practice/attempts/${attempt.id}`, { state: { speed: speedValue, from } });
        },
      },
    );
  };

  const continueActive = () => {
    if (!activeData?.attemptId) return;
    onClose();
    if (configModeOf(activeData.mode) === "FullTest")
      navigate(`/practice/tests/${test.id}/exam`, { state: { restart: false, from } });
    else
      navigate(`/practice/attempts/${activeData.attemptId}`, {
        state: { speed: speedValue, from },
      });
  };

  const left = activeData ? secondsLeft(activeData.deadline, activeData.serverNow) : null;
  const activeFacts = activeData
    ? [
        `đã làm ${activeData.answeredCount}/${activeData.totalQuestions} câu`,
        configModeOf(activeData.mode) === "Practice" && activeData.parts.length < 7
          ? partsLabel(activeData.parts)
          : null,
        left != null ? (left > 0 ? `còn ${formatClock(left)}` : "đã hết giờ") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <Modal
      open
      wide
      title={test.title}
      description="Cấu hình làm bài"
      busy={pending}
      onClose={onClose}
      footer={
        <div className={styles.foot}>
          <p className={styles.summary}>
            <b>{exam ? "7/7" : `${chosen.length}/7`} phần</b>
            <span>
              {exam
                ? `${test.totalQuestions} câu · ${test.durationMinutes} phút`
                : `${summary.questions} câu · ~${summary.minutes} phút`}
            </span>
          </p>
          <div className={styles.buttons}>
            {relation === "conflict" ? (
              <>
                <Button variant="outline" onClick={continueActive} disabled={pending}>
                  Tiếp tục bài đó
                </Button>
                <Button
                  variant="primary"
                  onClick={() => go(true)}
                  disabled={blocked}
                  icon={pending ? <LoaderCircle size={15} className={styles.spin} /> : undefined}
                >
                  {loadingLabel ? "Đang tải đề…" : "Làm lại với cấu hình mới"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  icon={<RotateCcw size={14} aria-hidden="true" />}
                  onClick={() => go(true)}
                  disabled={blocked}
                  title="Bỏ bài đang làm dở (nếu có) và làm đề từ đầu"
                >
                  Làm lại đề
                </Button>
                <Button
                  variant="primary"
                  onClick={() => go(false)}
                  disabled={blocked}
                  icon={pending ? <LoaderCircle size={15} className={styles.spin} /> : undefined}
                  trailing={pending ? undefined : <ArrowRight size={15} aria-hidden="true" />}
                >
                  {loadingLabel
                    ? "Đang tải đề…"
                    : relation === "same"
                      ? "Tiếp tục làm bài"
                      : "Bắt đầu làm bài"}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.body} aria-busy={pending || undefined}>
        <section className={styles.section} aria-labelledby="cfg-parts">
          <div className={styles.sectionHead}>
            <span id="cfg-parts" className={styles.label}>
              Chọn phần thi
            </span>
            {!exam && (
              <div className={styles.quick} role="group" aria-label="Chọn nhanh">
                <button type="button" onClick={() => pick([...LISTENING_PARTS])}>
                  Nghe
                </button>
                <button type="button" onClick={() => pick([...READING_PARTS])}>
                  Đọc
                </button>
                <button type="button" onClick={() => pick([...ALL_PARTS])}>
                  Cả đề
                </button>
                <button type="button" data-clear onClick={() => pick([])}>
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
          {exam && <p className={styles.hint}>Thi thử luôn làm trọn 200 câu, tốc độ chuẩn.</p>}
          <div className={styles.parts} data-locked={exam || undefined}>
            {(["listening", "reading"] as const).map((section) => (
              <div key={section} className={styles.column} data-section={section}>
                <span className={styles.columnHead}>
                  {section === "listening" ? <Headphones size={14} /> : <BookOpen size={14} />}
                  {section === "listening" ? "Listening" : "Reading"}
                </span>
                {PART_META.filter((meta) => meta.section === section).map((meta) => {
                  const on = exam || parts.includes(meta.part);
                  return (
                    <label key={meta.part} className={styles.part} data-on={on || undefined}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={exam || pending}
                        onChange={() => toggle(meta.part)}
                      />
                      <span className={styles.check} aria-hidden="true">
                        {on && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className={styles.partText}>
                        <span>
                          <b>Part {meta.part}</b> {meta.name}
                        </span>
                        <small>
                          {meta.count} câu · ~{meta.minutes} phút
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.settings}>
          <div className={styles.setting}>
            <span className={styles.label}>Chế độ làm bài</span>
            <Segmented
              label="Chế độ làm bài"
              size="sm"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(value) => setMode(value)}
            />
            <p className={styles.hint}>
              {exam
                ? "Tính giờ như thi thật, chấm điểm khi nộp bài."
                : "Chấm và xem giải thích ngay sau từng câu."}
            </p>
          </div>
          {!exam && (
            <div className={styles.setting}>
              <span className={styles.label}>Tốc độ audio</span>
              <Segmented
                label="Tốc độ audio"
                size="sm"
                options={SPEED_OPTIONS}
                value={speed}
                onChange={setSpeed}
              />
              <p className={styles.hint}>
                {
                  (AUDIO_SPEEDS.find((s) => String(s.value) === speed) ?? AUDIO_SPEEDS[0])
                    .description
                }
              </p>
            </div>
          )}
        </section>

        <p className={styles.note} data-tone={relation === "none" ? undefined : relation}>
          <RotateCcw size={14} aria-hidden="true" />
          {active.isPending ? (
            <span>Đang kiểm tra bài làm dở của đề này…</span>
          ) : relation === "conflict" && activeData ? (
            <span>
              <b>Đề này đang có bài {modeLabel(activeData.mode)} làm dở</b> ({activeFacts}). Mỗi đề
              chỉ giữ một bài làm dở: “Tiếp tục bài đó” mở lại bài cũ; “Làm lại với cấu hình mới” bỏ
              bài cũ và bắt đầu {modeLabel(mode).toLowerCase()} {exam ? "" : partsLabel(chosen)}.
            </span>
          ) : relation === "same" ? (
            <span>
              <b>Đề này có bài làm trước</b> ({activeFacts}). “Tiếp tục làm bài” giữ nguyên đáp án;
              “Làm lại đề” bỏ bài đang dở và bắt đầu lại từ đầu.
            </span>
          ) : (
            <span>
              Bài làm được lưu tự động trên tài khoản, rời đi rồi quay lại vẫn làm tiếp được.
            </span>
          )}
        </p>

        {preparing && (
          <p className={styles.preparing} role="status">
            <LoaderCircle size={14} className={styles.spin} aria-hidden="true" />
            Đang chuẩn bị hình ảnh và âm thanh của đề. Lần đầu mở một đề có thể mất khoảng 20 giây.
          </p>
        )}
        {nothingChosen && (
          <p className={styles.hint} role="status">
            Chọn ít nhất một Part để bắt đầu.
          </p>
        )}
        {start.isError && (
          <p className={styles.error} role="alert">
            {practiceExamError(start.error, "Không mở được đề. Kiểm tra mạng rồi thử lại.")}
          </p>
        )}
      </div>
    </Modal>
  );
}
