import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, HelpCircle } from "lucide-react";

import { useLookupGate } from "@/modules/vocabulary";
import { Button, ConfirmDialog, Modal, toast } from "@/shared/components/ui";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import {
  UnsavedAnswersError,
  useAttemptSession,
  useQuestionTimer,
} from "../../hooks/useAttemptSession";
import { exitFullscreen, useFullscreen } from "../../hooks/useFullscreen";
import { useRetakeAttempt, useStartTestAttempt } from "../../hooks/usePracticeExamMutations";
import type { Answer, Attempt, AttemptResult, RetakeScope } from "../../types/practice-exam.types";
import { isGroupRevealed, type QuestionGroup } from "../../utils/attemptGroups";
import { practiceExamError } from "../../utils/practiceExamErrors";
import { isListeningPart } from "../../utils/parts";
import { buildGridCells } from "../../utils/questionGrid";
import { scoreHeadline } from "../../utils/scoreDisplay";
import { PracticeAudioPlayer, QuestionGridDrawer, SplitPane } from "../common";
import { Part1GameSession } from "../part1-games/Part1GameSession";
import { QuestionPanel } from "./QuestionPanel";
import { ScoreOverlay } from "./ScoreOverlay";
import { StimulusPanel } from "./StimulusPanel";
import { UnansweredDialog, UnsavedDialog } from "./SubmitDialogs";
import { WorkspaceFooter } from "./WorkspaceFooter";
import { WorkspaceHeader } from "./WorkspaceHeader";
import {
  exitPath,
  findQuestion,
  gridButtonLabel,
  initialGroupIndex,
  numberByPosition,
  partJumps,
  primaryAction,
  progressLabel,
  questionsThrough,
  setupPath,
  totalQuestions,
  unansweredQuestions,
  type Part1GameId,
  type WorkspaceNavState,
} from "./workspaceModel";
import { useAutoFullscreen, useElapsedSeconds, useWorkspaceKeys } from "./useWorkspaceKeys";
import styles from "./PracticeWorkspace.module.css";

export interface PracticeWorkspaceProps {
  attempt: Attempt;
  /** `/review`: everything revealed, nothing editable. */
  reviewOnly: boolean;
  nav: WorkspaceNavState;
  /** Result of an attempt that is already completed (score overlay / review chip). */
  result: AttemptResult | null;
}

type CheckState = { groupId: string; status: "checking" | "failed" } | null;
type ReadingTab = "passage" | "questions";

const PHONE = "(max-width: 768px), (max-width: 1024px) and (max-height: 500px)";
const STACKED = "(max-width: 1023px), (max-width: 1024px) and (max-height: 500px)";

/**
 * Practice workspace (port of StudyChill `ToeicPracticePage` workspace): header, split pane with
 * the stimulus and the question cards, per-group check, footer navigation, question grid,
 * submit flow and the score overlay. Remount with `key = attempt.id`.
 */
export function PracticeWorkspace({
  attempt,
  reviewOnly,
  nav,
  result: loadedResult,
}: PracticeWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fatal, setFatal] = useState<"attempt_time_up" | "attempt_not_active" | null>(null);
  const session = useAttemptSession(attempt, { reviewOnly, onFatal: setFatal });
  const groups = useMemo(
    () =>
      attempt.source.kind === "PracticeSet" ? numberByPosition(session.groups) : session.groups,
    [attempt.source.kind, session.groups],
  );
  const practice = !session.readOnly;
  const result = session.result ?? loadedResult;

  /* ---- Position ---- */
  // Deep link `?q=`: read once when the workspace opens.
  const [deepLink] = useState(() => findQuestion(groups, searchParams.get("q")));
  const pendingScroll = useRef<string | null>(deepLink?.questionId ?? null);
  const [index, setIndex] = useState(() =>
    deepLink ? deepLink.groupIndex : practice ? initialGroupIndex(groups, session.answerOf) : 0,
  );
  const current = Math.max(0, Math.min(index, groups.length - 1));
  const group = groups[current];
  const isLast = current >= groups.length - 1;
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusedId =
    focusId && group.questions.some((q) => q.id === focusId) ? focusId : group.questions[0]?.id;
  const bodyRef = useRef<HTMLElement>(null);

  const goTo = useCallback(
    (next: number, questionId?: string) => {
      const target = Math.max(0, Math.min(next, groups.length - 1));
      pendingScroll.current = questionId ?? null;
      setIndex(target);
      if (questionId) setFocusId(questionId);
    },
    [groups.length],
  );

  // New group: back to the top of both columns, or straight to the requested question.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const target = pendingScroll.current;
    pendingScroll.current = null;
    if (target) {
      document.getElementById(`q-${target}`)?.scrollIntoView?.({ block: "center" });
      return;
    }
    body.scrollTop = 0;
    body.querySelectorAll("section").forEach((section) => {
      section.scrollTop = 0;
    });
  }, [current]);

  /* ---- Layout, lookup, fullscreen ---- */
  const phone = useMediaQuery(PHONE);
  const stacked = useMediaQuery(STACKED);
  const fullscreen = useFullscreen();
  useAutoFullscreen(!phone);
  const lookup = useLookupGate();
  const setLookup = lookup.setSwitchOn;
  useEffect(() => () => setLookup(false), [setLookup]);

  /* ---- Part 1 games ---- */
  const gameEligible =
    practice && groups.length > 0 && groups.every((g) => g.part === 1) && nav.part1Game !== null;
  const [gameMode, setGameMode] = useState<Part1GameId | null>(gameEligible ? nav.part1Game : null);

  /* ---- Audio, time ---- */
  const audioSrc = !gameMode && isListeningPart(group.part) ? group.audioUrl : null;
  const player = useAudioPlayer(audioSrc, { autoplay: practice, initialRate: nav.speed });
  const timedIds = useMemo(
    () => (practice ? group.questions.filter((q) => q.reveal === null).map((q) => q.id) : []),
    [practice, group.questions],
  );
  useQuestionTimer(session, timedIds);
  const baseSeconds = useMemo(
    () => attempt.questions.reduce((sum, q) => sum + q.timeSpentSeconds, 0),
    [attempt.questions],
  );
  const elapsed = useElapsedSeconds(baseSeconds, practice);

  /* ---- Check ---- */
  const [checkState, setCheckState] = useState<CheckState>(null);
  const [tabs, setTabs] = useState<Record<string, ReadingTab>>({});
  const readingTabs = phone && group.part === 7 && !gameMode;
  const tab: ReadingTab | null = readingTabs ? (tabs[group.id] ?? "passage") : null;
  const switchTab = (groupId: string, next: ReadingTab) => {
    setTabs((value) => ({ ...value, [groupId]: next }));
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  const runCheck = async (target: QuestionGroup, questionIds?: readonly string[]) => {
    const ids = questionIds ?? target.questions.filter((q) => q.reveal === null).map((q) => q.id);
    if (!practice || ids.length === 0) return;
    setCheckState({ groupId: target.id, status: "checking" });
    if (phone && target.part === 7) switchTab(target.id, "questions");
    try {
      await session.check(ids);
      setCheckState(null);
    } catch (error) {
      setCheckState({ groupId: target.id, status: "failed" });
      toast.error(practiceExamError(error, "Chưa lấy được đáp án. Thử lại nhé."));
    }
  };
  const checking = checkState?.groupId === group.id && checkState.status === "checking";
  const checkFailed = checkState?.groupId === group.id && checkState.status === "failed";
  const groupRevealed = isGroupRevealed(group);

  /* ---- Answers & flags ---- */
  const { select, toggleFlag, isFlagged, queue } = session;
  const onSelect = useCallback(
    (questionId: string, answer: Answer) => select(questionId, answer),
    [select],
  );
  const onToggleFlag = useCallback(
    (questionId: string) => toggleFlag(questionId, !isFlagged(questionId)),
    [toggleFlag, isFlagged],
  );
  const onRetrySave = useCallback((questionId: string) => void queue?.retry(questionId), [queue]);
  const onResolveConflict = useCallback(
    (questionId: string, keepLocal: boolean) => queue?.resolve(questionId, keepLocal),
    [queue],
  );

  /* ---- Submit ---- */
  const [unansweredOpen, setUnansweredOpen] = useState(false);
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(() => Boolean(loadedResult) && !reviewOnly);
  const unanswered = useMemo(
    () => (practice ? unansweredQuestions(groups, session.answerOf) : []),
    [practice, groups, session.answerOf],
  );

  const submit = async (force = false) => {
    setUnansweredOpen(false);
    try {
      await session.submit({ force });
      setUnsavedCount(0);
      player.pause();
      setOverlayOpen(true);
    } catch (error) {
      if (error instanceof UnsavedAnswersError) setUnsavedCount(Math.max(1, error.unsaved));
      else toast.error(practiceExamError(error, "Chưa nộp được bài. Thử nộp lại nhé."));
    }
  };
  const requestSubmit = () => {
    if (!practice) return;
    if (unanswered.length > 0) setUnansweredOpen(true);
    else void submit();
  };

  /* ---- Leaving, retakes ---- */
  const [exiting, setExiting] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const retake = useRetakeAttempt();
  const restartTest = useStartTestAttempt();
  const exitTo = exitPath(attempt.source, nav.from);
  const setupTo = setupPath(attempt.source);
  const reviewHref = `/practice/attempts/${attempt.id}/review`;
  const resultHref = `/practice/attempts/${attempt.id}/result`;

  const leave = (to: string) => {
    player.pause();
    exitFullscreen();
    navigate(to);
  };
  const exit = async (to = exitTo) => {
    if (session.readOnly) return leave(to);
    setExiting(true);
    const saved = await session.flush().catch(() => false);
    setExiting(false);
    if (saved) leave(to);
    else setLeaveOpen(true);
  };

  const startRetake = (scope: RetakeScope) => {
    const testId = attempt.testId ?? (attempt.source.kind === "Test" ? attempt.source.id : null);
    if (scope === "All" && attempt.mode === "FullTest" && testId) {
      restartTest.mutate(
        { testId, mode: "FullTest", restart: true },
        {
          onSuccess: () => leave(`/practice/tests/${testId}/exam`),
          onError: (error) => toast.error(practiceExamError(error)),
        },
      );
      return;
    }
    retake.mutate(
      { attemptId: attempt.id, scope },
      {
        onSuccess: (next) => {
          setOverlayOpen(false);
          setRestartOpen(false);
          navigate(`/practice/attempts/${next.id}`, {
            state: { from: nav.from, speed: player.rate },
          });
        },
        onError: (error) => toast.error(practiceExamError(error)),
      },
    );
  };
  const retaking = retake.isPending || restartTest.isPending;

  /* ---- Grid ---- */
  const [gridOpen, setGridOpen] = useState(false);
  const cells = useMemo(
    () =>
      buildGridCells(groups, {
        answerOf: session.answerOf,
        isFlagged: session.isFlagged,
        currentGroupIndex: current,
        showResults: true,
      }),
    [groups, session.answerOf, session.isFlagged, current],
  );
  const jumps = useMemo(() => partJumps(groups), [groups]);

  /* ---- Shortcuts ---- */
  useWorkspaceKeys(
    {
      togglePlay: () => {
        if (!audioSrc) return false;
        player.toggle();
        return true;
      },
      back: () => {
        if (audioSrc) player.back();
      },
      previous: () => goTo(current - 1),
      next: () => goTo(current + 1),
      answer: (i) => {
        const q = group.questions[0];
        const key = q?.options[i]?.key;
        if (!practice || group.questions.length !== 1 || !key || q.reveal) return false;
        select(q.id, key);
        return true;
      },
    },
    !gameMode,
  );

  /* ---- Derived labels ---- */
  const total = totalQuestions(groups);
  const answeredInGroup = group.questions.filter((q) => session.answerOf(q.id) !== null).length;
  const primary = primaryAction({
    canCheck: practice && !groupRevealed,
    answeredInGroup,
    canSubmit: practice,
    isLast,
  });
  const scoreLabel = result ? scoreHeadline(result.score).label : null;
  const exitLabel =
    attempt.source.kind === "PracticeSet" && attempt.source.part
      ? isListeningPart(attempt.source.part)
        ? "Về Luyện nghe"
        : "Về Luyện đọc"
      : "Về Luyện đề";

  const overlay = result && !reviewOnly && (
    <ScoreOverlay
      open={overlayOpen}
      onClose={() => setOverlayOpen(false)}
      result={result}
      groups={groups}
      onJump={(cell) =>
        navigate(`${reviewHref}?q=${cell.questionId}`, { state: { from: nav.from } })
      }
      onReview={() => navigate(reviewHref, { state: { from: nav.from } })}
      onRetakeWrong={() => startRetake("Wrong")}
      onRetakeAll={() => setRestartOpen(true)}
      retaking={retaking}
      resultHref={resultHref}
      onExit={() => leave(exitTo)}
      exitLabel={exitLabel}
    />
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={restartOpen}
        title="Làm lại đề này từ đầu?"
        description={
          scoreLabel
            ? `Kết quả vừa nộp (${scoreLabel}) đã được lưu lại. Lượt mới bắt đầu trắng với đề tải mới nhất.`
            : "Kết quả vừa nộp đã được lưu lại. Lượt mới bắt đầu trắng với đề tải mới nhất."
        }
        confirmLabel="Làm lại từ đầu"
        pending={retaking}
        onConfirm={() => startRetake("All")}
        onClose={() => setRestartOpen(false)}
      />
      <ConfirmDialog
        open={leaveOpen}
        title="Còn đáp án chưa lưu"
        description="Máy chủ chưa nhận một số đáp án vừa chọn. Ở lại để hệ thống thử lưu tiếp, hoặc thoát và bỏ các đáp án đó."
        confirmLabel="Vẫn thoát"
        tone="danger"
        onConfirm={() => {
          setLeaveOpen(false);
          leave(exitTo);
        }}
        onClose={() => setLeaveOpen(false)}
      />
      <Modal
        open={fatal !== null}
        title={fatal === "attempt_time_up" ? "Đã hết giờ làm bài" : "Bài làm đã kết thúc"}
        description={practiceExamError({ response: { data: { code: fatal ?? "" } } })}
        onClose={() => setFatal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => leave(exitTo)}>
              Thoát
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Tải lại bài
            </Button>
          </>
        }
      />
    </>
  );

  if (gameMode) {
    return (
      <>
        <Part1GameSession
          mode={gameMode}
          groups={groups}
          index={current}
          onIndex={(next) => goTo(next)}
          session={session}
          checkState={checkState}
          onCheck={(target, questionId) => void runCheck(target, [questionId])}
          onChangeMode={() => void exit(setupTo ?? exitTo)}
          onClassic={() => setGameMode(null)}
        />
        {dialogs}
      </>
    );
  }

  const stimulus = (inColumn: boolean) => (
    <StimulusPanel
      group={group}
      player={player}
      showPlayer={!inColumn}
      phone={phone}
      answerOf={session.answerOf}
      currentQuestionId={focusedId}
    />
  );
  const questions = (
    <QuestionPanel
      group={group}
      session={session}
      practice={practice}
      checking={checking}
      checkFailed={checkFailed}
      compact={phone}
      onSelect={onSelect}
      onToggleFlag={onToggleFlag}
      onCheck={() => void runCheck(group)}
      onRetrySave={onRetrySave}
      onResolveConflict={onResolveConflict}
      onFocusQuestion={setFocusId}
    />
  );
  const showStimulus = !(phone && group.part === 5) && (tab === null || tab === "passage");
  const showQuestions = tab === null || tab === "questions";

  return (
    <div
      className={styles.workspace}
      data-lookup={lookup.switchOn || undefined}
      data-phone={phone || undefined}
    >
      <WorkspaceHeader
        title={attempt.title || attempt.source.title}
        progressLabel={
          // Phones keep the row short: "Câu 149-150 · 3-4/54".
          phone
            ? progressLabel(groups, current).replace(/^Nhóm câu /, "Câu ")
            : progressLabel(groups, current)
        }
        progress={{ value: questionsThrough(groups, current), max: total }}
        section={group.section}
        phone={phone}
        fullscreen={{
          supported: fullscreen.supported,
          active: fullscreen.isFullscreen,
          toggle: fullscreen.toggle,
        }}
        lookup={{ on: lookup.switchOn, toggle: setLookup }}
        seconds={result ? result.durationSeconds : elapsed}
        clockLabel={result ? "Thời gian làm" : "Đã làm"}
        onSubmit={practice ? requestSubmit : undefined}
        submitting={session.submitting}
        scoreLabel={reviewOnly ? null : scoreLabel}
        onShowScore={() => setOverlayOpen(true)}
        review={reviewOnly ? { resultHref, scoreLabel } : null}
        onExit={() => void exit()}
        exiting={exiting}
      />

      <main ref={bodyRef} className={styles.body} data-stacked={stacked || undefined}>
        {stacked ? (
          <div className={styles.column}>
            {readingTabs && (
              <div className={styles.tabs} role="tablist" aria-label="Bài đọc và câu hỏi">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "passage"}
                  onClick={() => switchTab(group.id, "passage")}
                >
                  <BookOpen size={15} aria-hidden="true" /> Bài đọc
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "questions"}
                  onClick={() => switchTab(group.id, "questions")}
                >
                  <HelpCircle size={15} aria-hidden="true" /> Câu hỏi
                  <span className={styles.tabCount}>
                    {answeredInGroup}/{group.questions.length}
                  </span>
                </button>
              </div>
            )}
            {audioSrc && (
              <div className={styles.stickyPlayer}>
                <PracticeAudioPlayer player={player} seed={audioSrc} compact />
              </div>
            )}
            {showStimulus && stimulus(true)}
            {showQuestions && questions}
          </div>
        ) : (
          <SplitPane
            className={styles.split}
            left={stimulus(false)}
            right={questions}
            leftLabel="Đề bài"
            rightLabel="Câu hỏi"
          />
        )}
      </main>

      <WorkspaceFooter
        phone={phone}
        parts={jumps}
        currentPart={group.part}
        setTitle={attempt.source.kind === "PracticeSet" ? attempt.source.title : null}
        onJumpPart={(groupIndex) => goTo(groupIndex)}
        onSetup={setupTo ? () => void exit(setupTo) : undefined}
        gridLabel={gridButtonLabel(groups, current)}
        onOpenGrid={() => setGridOpen(true)}
        canPrevious={current > 0}
        canNext={!isLast}
        onPrevious={() => goTo(current - 1)}
        onNext={() => goTo(current + 1)}
        submitHere={practice && isLast}
        onSubmit={requestSubmit}
        submitting={session.submitting}
        primary={primary}
        onCheck={() => void runCheck(group)}
        checking={checking}
      />

      <QuestionGridDrawer
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        cells={cells}
        showResults
        onJump={(cell) => {
          setGridOpen(false);
          goTo(cell.groupIndex, cell.questionId);
        }}
        footer={
          <p className={styles.gridFooter}>
            Cố lên nhé! Tập trung hoàn thành để nâng cao điểm số TOEIC.
          </p>
        }
      />

      <UnansweredDialog
        open={unansweredOpen}
        questions={unanswered}
        submitting={session.submitting}
        onJump={(questionId) => {
          setUnansweredOpen(false);
          const where = groups.findIndex((g) => g.questions.some((q) => q.id === questionId));
          if (where >= 0) goTo(where, questionId);
        }}
        onContinue={() => setUnansweredOpen(false)}
        onSubmit={() => void submit()}
      />
      <UnsavedDialog
        count={unsavedCount}
        submitting={session.submitting}
        onRetry={() => void submit()}
        onForce={() => void submit(true)}
        onClose={() => setUnsavedCount(0)}
      />
      {overlay}
      {dialogs}
    </div>
  );
}
