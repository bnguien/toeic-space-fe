import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { CloudOff, LayoutGrid, LogOut, Send, Volume2 } from "lucide-react";

import mascot from "@/assets/mascot/oy2-hello.png";
import { Button, IconButton } from "@/shared/components/ui";

import { UnsavedAnswersError, useAttemptSession } from "../../hooks/useAttemptSession";
import { useExamClock } from "../../hooks/useExamClock";
import { exitFullscreen } from "../../hooks/useFullscreen";
import type { Answer, Attempt } from "../../types/practice-exam.types";
import { stopExamAudio } from "../../utils/examAudio";
import {
  buildExamSteps,
  isGroupLocked,
  nextStepIndex,
  previousReadingStepIndex,
  stepIndexOf,
  stepKey,
  stepLabel,
  stepQuestions,
} from "../../utils/examSteps";
import { practiceExamError } from "../../utils/practiceExamErrors";
import { buildGridCells, type GridCell } from "../../utils/questionGrid";
import { ClockBadge, QuestionGridDrawer } from "../common";
import { ExamDialog } from "./ExamDialog";
import { ExamDirections } from "./ExamDirections";
import { ExamListeningScreen } from "./ExamListeningScreen";
import { ExamReadingScreen } from "./ExamReadingScreen";
import {
  clearPosition,
  optionFromKey,
  ownsKeys,
  readPosition,
  resumePosition,
  writePosition,
  type ExamPosition,
} from "./examRoomState";
import styles from "./ExamRoom.module.css";

export interface ExamRunnerProps {
  /** In-progress FullTest attempt. Remount (key = attempt id) for another one. */
  attempt: Attempt;
  title: string;
  backTo: string;
  volume: number;
  onVolume: (volume: number) => void;
}

type Phase = "running" | "submitting" | "expired";
type DialogKind = "submit" | "exit" | "error" | null;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** The clock lives in its own component so the room does not re-render every second. */
function ExamClock({
  deadline,
  serverNow,
  onExpire,
}: {
  deadline: string | null;
  serverNow: string;
  onExpire: () => void;
}) {
  const clock = useExamClock({ deadline, serverNow, onExpire });
  return (
    <ClockBadge
      seconds={clock.remaining}
      warning={clock.warning}
      className={styles.clock}
      label="Còn lại"
    />
  );
}

/**
 * Running exam room (port of StudyChill ExamRoom "running"): header with clock, volume, question
 * grid, submit and exit; the step sequence (directions → Listening groups → Reading screens → end
 * card); dialogs; auto-submit when the server deadline passes. Answers and flags are saved to the
 * server by `useAttemptSession`; only the screen position is remembered in this browser.
 */
export function ExamRunner({ attempt, title, backTo, volume, onVolume }: ExamRunnerProps) {
  const navigate = useNavigate();
  const fatal = useRef<() => void>(() => {});
  const session = useAttemptSession(attempt, { onFatal: () => fatal.current() });
  const { groups } = session;
  const steps = useMemo(() => buildExamSteps(groups), [groups]);
  const [nav, setNav] = useState<ExamPosition>(() => {
    const answered = new Set(attempt.questions.filter((q) => q.userAnswer).map((q) => q.id));
    return resumePosition(steps, groups, (id) => answered.has(id), readPosition(attempt.id));
  });
  const [phase, setPhase] = useState<Phase>("running");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [gridOpen, setGridOpen] = useState(false);
  const [jumpStep, setJumpStep] = useState(-1);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [exiting, setExiting] = useState(false);
  const submitting = useRef(false);
  const expired = useRef(false);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  });

  const stepIndex = nav.step;
  const current = steps[stepIndex];
  const currentGroupIndex = current?.type === "group" ? current.groupIndex : -1;
  const seen = useMemo(() => new Set(nav.seen), [nav.seen]);

  // Remember the screen (not the answers: the server has those).
  useEffect(() => {
    writePosition(attempt.id, { ...nav, section: steps[nav.step]?.section ?? null });
  }, [attempt.id, nav, steps]);

  /* ---- Navigation ---- */

  /** Moves on from step `from` (ignored once the room has left it: late audio events). */
  const advanceFrom = useCallback(
    (from: number) =>
      setNav((state) => {
        if (state.step !== from) return state;
        const step = steps[from];
        const key = step?.type === "directions" ? stepKey(step) : null;
        const seenNow = key && !state.seen.includes(key) ? [...state.seen, key] : state.seen;
        const next = nextStepIndex(steps, from, new Set(seenNow));
        return { ...state, seen: seenNow, step: next < 0 ? steps.length : next };
      }),
    [steps],
  );

  const nextReading = nextStepIndex(steps, stepIndex, seen);
  const previousReading = previousReadingStepIndex(steps, stepIndex);
  const readingNext = useCallback(() => {
    if (nextReading < 0) setDialog("submit");
    else setNav((state) => ({ ...state, step: nextReading }));
  }, [nextReading]);
  const readingBack = useCallback(() => {
    if (previousReading >= 0) setNav((state) => ({ ...state, step: previousReading }));
  }, [previousReading]);

  const isLocked = useCallback(
    (groupIndex: number) => isGroupLocked(groups, steps, stepIndex, groupIndex),
    [groups, steps, stepIndex],
  );

  const jumpTo = (cell: GridCell) => {
    if (cell.locked || isLocked(cell.groupIndex)) return;
    const index = stepIndexOf(steps, cell.groupIndex, cell.questionIndex);
    if (index < 0) return;
    setGridOpen(false);
    setJumpStep(index);
    setNav((state) => ({ ...state, step: index }));
    window.setTimeout(
      () =>
        document
          .getElementById(`exam-q-${cell.questionId}`)
          ?.scrollIntoView({ block: "center", behavior: "auto" }),
      60,
    );
  };

  /* ---- Answers & flags ---- */

  const { select, toggleFlag, stateOf } = session;
  const onAnswer = useCallback(
    (questionId: string, answer: Answer) => {
      if (phaseRef.current === "running") select(questionId, answer);
    },
    [select],
  );
  const onFlag = useCallback((questionId: string) => toggleFlag(questionId), [toggleFlag]);
  const flagFailed = (questionId: string) => stateOf(questionId)?.flagStatus === "error";
  const failedSaves = session.states.filter((s) => s.status === "error" || s.status === "conflict");
  const retrySaves = () => {
    for (const state of failedSaves) {
      if (state.status === "conflict") session.queue?.resolve(state.id, true);
      else void session.queue?.retry(state.id);
    }
  };

  /* ---- Submit / exit ---- */

  const doSubmit = async (auto: boolean, force = false) => {
    if (submitting.current) return;
    submitting.current = true;
    setDialog(null);
    setGridOpen(false);
    setPhase("submitting");
    stopExamAudio();
    try {
      const result = await session.submit({ force: auto || force });
      clearPosition(attempt.id);
      exitFullscreen();
      navigate(`/practice/attempts/${result.attemptId}/result`, { replace: true });
    } catch (error) {
      submitting.current = false;
      setSubmitError(error);
      setPhase(auto || expired.current ? "expired" : "running");
      setDialog("error");
    }
  };
  // The server refused a save: time is up or the attempt ended elsewhere → submit what is saved.
  useEffect(() => {
    fatal.current = () => void doSubmit(true);
  });

  const onExpire = () => {
    expired.current = true;
    if (phaseRef.current === "running") void doSubmit(true);
  };

  const exitRoom = async () => {
    setExiting(true);
    await Promise.race([session.flush().catch(() => false), wait(3000)]);
    stopExamAudio();
    exitFullscreen();
    navigate(backTo);
  };

  /* ---- Keys: 1–4 / A–D on screens with exactly one question ---- */

  const keysEnabled = phase === "running" && dialog === null && !gridOpen;
  const screenQuestions = stepQuestions(groups, current);
  const single = screenQuestions.length === 1 ? screenQuestions[0] : null;
  const onOptionKey = useEffectEvent((event: KeyboardEvent) => {
    if (!single || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.repeat || ownsKeys(event.target)) return;
    const key = optionFromKey(event.key);
    if (key && single.options.some((option) => option.key === key)) {
      event.preventDefault();
      onAnswer(single.id, key);
    }
  });
  useEffect(() => {
    if (!keysEnabled || !single) return;
    const listener = (event: KeyboardEvent) => onOptionKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [keysEnabled, single]);

  /* ---- Render ---- */

  const answeredCount = session.answeredCount;
  const total = session.total;
  const answerOf = session.answerOf;
  const isFlagged = session.isFlagged;

  let body: ReactNode;
  if (!current) {
    body = (
      <div className={styles.centerScroll}>
        <section className={styles.card} aria-labelledby="exam-end-title">
          <h2 id="exam-end-title" className={styles.cardTitle}>
            Bạn đã làm đến cuối bài thi
          </h2>
          <p className={styles.cardText}>
            Đã làm {answeredCount}/{total} câu. Mở bảng câu hỏi để xem lại, hoặc nộp bài.
          </p>
          <div className={styles.cardActions}>
            <Button
              variant="outline"
              icon={<LayoutGrid size={16} aria-hidden="true" />}
              onClick={() => setGridOpen(true)}
            >
              Bảng câu hỏi
            </Button>
            <Button
              variant="ink"
              trailing={<Send size={15} aria-hidden="true" />}
              onClick={() => setDialog("submit")}
            >
              Nộp bài
            </Button>
          </div>
        </section>
      </div>
    );
  } else if (current.type === "directions") {
    body = (
      <ExamDirections
        key={`d${stepIndex}`}
        dirKey={current.key}
        section={current.section}
        onContinue={() => advanceFrom(stepIndex)}
      />
    );
  } else if (current.section === "listening") {
    body = (
      <ExamListeningScreen
        key={`l${stepIndex}`}
        group={groups[current.groupIndex]}
        answerOf={answerOf}
        isFlagged={isFlagged}
        flagFailed={flagFailed}
        onAnswer={onAnswer}
        onFlag={onFlag}
        onAdvance={() => advanceFrom(stepIndex)}
        keysEnabled={keysEnabled}
      />
    );
  } else {
    body = (
      <ExamReadingScreen
        key={`r${stepIndex}`}
        group={groups[current.groupIndex]}
        questions={screenQuestions}
        answerOf={answerOf}
        isFlagged={isFlagged}
        flagFailed={flagFailed}
        onAnswer={onAnswer}
        onFlag={onFlag}
        onBack={readingBack}
        onNext={readingNext}
        canBack={previousReading >= 0}
        isLast={nextReading < 0}
        total={total}
        keysEnabled={keysEnabled}
        initialTab={jumpStep === stepIndex ? "questions" : "passage"}
      />
    );
  }

  const unsavedError = submitError instanceof UnsavedAnswersError ? submitError : null;

  return (
    <div className={styles.run} data-frozen={phase !== "running" || undefined}>
      <header className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.brand} aria-hidden="true">
            <img src={mascot} alt="" />
            <span>TOEICSpace</span>
          </span>
          <span className={styles.headTitle} title={title}>
            {title}
          </span>
        </div>
        <div className={styles.headMid}>
          <strong data-section={current?.section}>{stepLabel(steps, stepIndex)}</strong>
          <span>
            {answeredCount}/{total} câu
          </span>
        </div>
        <div className={styles.headRight}>
          <ExamClock
            deadline={attempt.deadline}
            serverNow={attempt.serverNow}
            onExpire={onExpire}
          />
          {failedSaves.length > 0 && (
            <button
              type="button"
              className={styles.saveError}
              onClick={retrySaves}
              title="Bấm để lưu lại"
            >
              <CloudOff size={15} aria-hidden="true" />
              <span>Chưa lưu {failedSaves.length} câu</span>
            </button>
          )}
          <label className={styles.headVolume} title="Âm lượng">
            <Volume2 size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Âm lượng</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => onVolume(Number(event.target.value))}
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            icon={<LayoutGrid size={16} aria-hidden="true" />}
            onClick={() => setGridOpen(true)}
            aria-label="Bảng câu hỏi"
            className={styles.gridButton}
          >
            <span className={styles.hideSmall}>Bảng câu hỏi</span>
          </Button>
          <Button
            variant="ink"
            size="sm"
            icon={<Send size={14} aria-hidden="true" />}
            onClick={() => setDialog("submit")}
            disabled={phase !== "running"}
          >
            Nộp bài
          </Button>
          <IconButton
            label="Thoát phòng thi"
            variant="outline"
            size="sm"
            onClick={() => setDialog("exit")}
          >
            <LogOut size={17} aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <main className={styles.main}>{body}</main>

      {phase === "submitting" && (
        <div className={styles.overlay} role="status" aria-live="polite">
          <div className={styles.overlayCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Đang nộp bài và chấm điểm…</span>
          </div>
        </div>
      )}

      <QuestionGridDrawer
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        title="Bảng câu hỏi"
        cells={
          gridOpen
            ? buildGridCells(groups, {
                answerOf,
                isFlagged,
                currentGroupIndex,
                isLocked,
              })
            : []
        }
        onJump={jumpTo}
        showLocks
      />

      {dialog === "submit" && (
        <ExamDialog
          title="Nộp bài thi?"
          onCancel={() => setDialog(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setDialog(null)} data-autofocus>
                Tiếp tục làm
              </Button>
              <Button
                variant="ink"
                icon={<Send size={15} aria-hidden="true" />}
                onClick={() => void doSubmit(false)}
              >
                Nộp bài
              </Button>
            </>
          }
        >
          <ul className={styles.submitStats}>
            <li>
              <strong>
                {answeredCount}/{total}
              </strong>
              <span>đã làm</span>
            </li>
            <li data-warn={total - answeredCount > 0 || undefined}>
              <strong>{total - answeredCount}</strong>
              <span>chưa làm</span>
            </li>
            <li data-flag>
              <strong>{session.flaggedCount}</strong>
              <span>đánh dấu</span>
            </li>
          </ul>
          <p className={styles.muted}>Nộp rồi thì không sửa được đáp án.</p>
        </ExamDialog>
      )}

      {dialog === "exit" && (
        <ExamDialog
          title="Thoát phòng thi?"
          onCancel={exiting ? null : () => setDialog(null)}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => setDialog(null)}
                disabled={exiting}
                data-autofocus
              >
                Ở lại
              </Button>
              <Button variant="primary" onClick={() => void exitRoom()} disabled={exiting}>
                {exiting ? "Đang lưu…" : "Thoát"}
              </Button>
            </>
          }
        >
          <p>Bài làm được lưu, có thể làm tiếp. Đồng hồ vẫn chạy trong lúc bạn rời phòng thi.</p>
        </ExamDialog>
      )}

      {dialog === "error" && (
        <ExamDialog
          title="Chưa nộp được bài"
          tone="danger"
          onCancel={phase === "expired" ? null : () => setDialog(null)}
          actions={
            <>
              {phase === "expired" ? (
                <Button variant="outline" onClick={() => void exitRoom()} disabled={exiting}>
                  Thoát (bài đã lưu)
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setDialog(null)} data-autofocus>
                  Đóng
                </Button>
              )}
              {unsavedError && (
                <Button variant="outline" onClick={() => void doSubmit(false, true)}>
                  Nộp với đáp án đã lưu
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => void doSubmit(phase === "expired")}
                data-autofocus={phase === "expired" || undefined}
              >
                Thử nộp lại
              </Button>
            </>
          }
        >
          <p role="alert">
            {unsavedError
              ? `Còn ${unsavedError.unsaved} đáp án chưa lưu được lên máy chủ. Kiểm tra mạng rồi thử lại.`
              : practiceExamError(submitError, "Không nộp được bài. Kiểm tra mạng rồi thử lại.")}
          </p>
          <p className={styles.muted}>Các đáp án đã lưu vẫn được giữ trên máy chủ.</p>
        </ExamDialog>
      )}
    </div>
  );
}
