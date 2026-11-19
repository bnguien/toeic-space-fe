import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";

import errorMascot from "@/assets/mascot/oy2-error.png";
import { restoreSession, useSessionStatus } from "@/modules/auth";
import { ButtonLink, ErrorState, PageContainer, Skeleton } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { useDiscardAttempt, useStartSetAttempt } from "../../hooks/usePracticeExamMutations";
import {
  useActiveSetAttempt,
  useAttemptHistory,
  useLearner,
  useSetQuestions,
} from "../../hooks/usePracticeExamQueries";
import { usePracticeSet } from "../../hooks/usePracticeSets";
import type { Part1GameMode } from "../../utils/part1Games";
import { levelTargetLabel, partSpacePath } from "../../utils/parts";
import { practiceExamError } from "../../utils/practiceExamErrors";
import { countSetQuestions } from "../../utils/practiceSelection";
import { partNumberOf } from "../space/spaceModel";
import styles from "./Setup.module.css";
import { ActiveAttemptCard, QuestionProgressGrid, SetAttemptsList } from "./SetupAttempts";
import { SetupForm, type SetupStart } from "./SetupForm";
import { SetupHero } from "./SetupHero";
import type { SetupContext } from "./setupModel";

const GROUPED_PARTS = [3, 4, 6, 7];

/**
 * Learner view of "Góc luyện tập" (`/practice/parts/:id`): how to study this practice set today,
 * the attempt in progress, the set's attempts and per-question progress. Guests see the set and a
 * sign-in call; answers are never shown before an attempt.
 */
export function LearnerSetup({ setId }: { setId: string }) {
  useColorModeScope();
  const navigate = useNavigate();
  const location = useLocation();
  const learner = useLearner();
  const sessionStatus = useSessionStatus();
  const resolving = sessionStatus === "idle" || sessionStatus === "restoring";
  const set = usePracticeSet(setId);
  const questions = useSetQuestions(setId);
  const activeSet = useActiveSetAttempt(setId);
  const history = useAttemptHistory({ kind: "PracticeSet", sourceId: setId, pageSize: 20 });
  const start = useStartSetAttempt();
  const discard = useDiscardAttempt();

  const part = set.data ? partNumberOf(set.data.part) : 0;
  const fromState = (location.state as { from?: unknown } | null)?.from;
  const backTo = typeof fromState === "string" && fromState.startsWith("/") ? fromState : null;
  const backPath = backTo ?? (part ? partSpacePath(part) : "/practice/listening");
  const here = `/practice/parts/${setId}`;

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (set.data) document.title = `Góc luyện tập · ${set.data.title} | TOEICSpace`;
  }, [set.data]);

  const attempts = useMemo(
    () => (history.data?.items ?? []).filter((a) => a.status !== "Abandoned"),
    [history.data],
  );
  const completed = useMemo(() => attempts.filter((a) => a.status === "Completed"), [attempts]);
  const activeId = activeSet.data?.attemptId ?? null;
  const activeSummary =
    (activeId && attempts.find((a) => a.id === activeId)) ||
    attempts.find((a) => a.status === "InProgress") ||
    null;

  const counts = useMemo(
    () => (questions.data ? countSetQuestions(questions.data) : null),
    [questions.data],
  );
  const total = questions.data?.length ?? set.data?.items.length ?? 0;
  const ctx: SetupContext | null = counts
    ? { counts, active: activeSummary, completed, grouped: GROUPED_PARTS.includes(part) }
    : null;

  // The workspace reads `{ from, part1Game? }`; the classic A–D mode is its default.
  const goAttempt = (attemptId: string, part1Game: Part1GameMode = "classic") =>
    navigate(`/practice/attempts/${attemptId}`, {
      state: part1Game === "classic" ? { from: here } : { from: here, part1Game },
    });

  const onStart = ({ plan, part1Game }: SetupStart) => {
    if (plan.kind === "review") return navigate(`/practice/attempts/${plan.attemptId}/review`);
    if (plan.kind === "resume") return goAttempt(plan.attemptId, part1Game);
    start.mutate(
      {
        setId,
        selection: plan.selection,
        ...(plan.count ? { count: plan.count } : {}),
        restart: plan.restart,
      },
      { onSuccess: (attempt) => goAttempt(attempt.id, part1Game) },
    );
  };

  const level = set.data ? levelTargetLabel(set.data.level, set.data.targetScore) : null;
  const meta = set.data
    ? [
        // Titles such as "… (Mục tiêu 450+)" already say the level.
        level && set.data.targetScore && set.data.title.includes(`${set.data.targetScore}+`)
          ? null
          : level,
        `${total} câu`,
        `${set.data.durationMinutes} phút`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <PageContainer width="narrow" className={styles.page}>
      <Link to={backPath} className={styles.back}>
        <ArrowLeft size={17} aria-hidden="true" /> Danh sách bộ luyện
      </Link>

      {set.isPending ? (
        <div className={styles.loading}>
          <Skeleton shape="block" height={220} />
          <Skeleton shape="block" height={320} />
        </div>
      ) : set.isError || set.data.status !== "Active" ? (
        <ErrorState
          image={errorMascot}
          title={
            set.isError
              ? `Không mở được bộ luyện tập. ${practiceExamError(set.error)}`
              : "Bộ luyện tập này chưa được xuất bản."
          }
          onRetry={set.isError ? () => void set.refetch() : undefined}
          action={
            <ButtonLink to={backPath} variant="outline">
              Về danh sách
            </ButtonLink>
          }
        />
      ) : (
        <>
          <SetupHero
            part={part}
            title={set.data.title}
            meta={meta}
            counts={learner ? counts : null}
            loading={resolving || (Boolean(learner) && questions.isPending)}
          />

          {resolving ? (
            <Skeleton shape="block" height={320} />
          ) : !learner ? (
            <section className={`${styles.sheet} ${styles.guest}`}>
              <h2 className={styles.sectionTitle}>Đăng nhập để luyện bộ này</h2>
              <p>
                Tiến độ từng câu, bài ngẫu nhiên, ôn câu sai và bài chữa được lưu trên tài khoản học
                viên của bạn.
              </p>
              <ButtonLink
                to={`/login?next=${encodeURIComponent(here)}`}
                variant="primary"
                icon={<LogIn size={16} />}
              >
                Đăng nhập
              </ButtonLink>
            </section>
          ) : questions.isError ? (
            <ErrorState
              image={errorMascot}
              title={`Chưa tải được tiến độ của bộ. ${practiceExamError(questions.error)}`}
              onRetry={() => void questions.refetch()}
            />
          ) : !ctx ? (
            <Skeleton shape="block" height={320} />
          ) : (
            ctx && (
              <>
                {activeSummary && (
                  <ActiveAttemptCard
                    attempt={activeSummary}
                    onContinue={() => goAttempt(activeSummary.id)}
                    onDiscard={() => discard.mutate(activeSummary.id)}
                    discarding={discard.isPending}
                    discardError={discard.isError ? practiceExamError(discard.error) : null}
                  />
                )}
                <SetupForm
                  key={`${activeSummary?.id ?? "none"}-${completed.length}`}
                  part={part}
                  ctx={ctx}
                  completed={completed}
                  pending={start.isPending}
                  error={start.isError ? practiceExamError(start.error) : null}
                  onStart={onStart}
                />
                {attempts.length > 0 && (
                  <SetAttemptsList attempts={attempts} activeId={activeId} onContinue={goAttempt} />
                )}
                {questions.data && questions.data.length > 0 && (
                  <QuestionProgressGrid rows={questions.data} />
                )}
              </>
            )
          )}
        </>
      )}
    </PageContainer>
  );
}
