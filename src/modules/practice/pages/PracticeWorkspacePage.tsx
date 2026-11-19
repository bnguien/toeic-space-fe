import { Navigate, useLocation, useParams } from "react-router-dom";

import errorMascot from "@/assets/mascot/oy2-error.png";
import waitingMascot from "@/assets/mascot/oy2-waiting.png";
import { ButtonLink, ErrorState } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { PracticeWorkspace } from "../components/workspace/PracticeWorkspace";
import styles from "../components/workspace/WorkspaceStatus.module.css";
import { exitPath, readNavState } from "../components/workspace/workspaceModel";
import { useAttempt, useAttemptResult, useAttemptReview } from "../hooks/usePracticeExamQueries";
import { practiceExamError } from "../utils/practiceExamErrors";

export interface PracticeWorkspacePageProps {
  /** `/practice/attempts/:attemptId/review`: completed attempt, read-only. */
  reviewOnly?: boolean;
}

/**
 * Practice workspace (`/practice/attempts/:attemptId`) and its read-only review (`…/review`).
 * Loads the attempt (or the review), sends an in-progress mock exam to the exam room, and opens a
 * completed attempt with its score overlay.
 */
export function PracticeWorkspacePage({ reviewOnly = false }: PracticeWorkspacePageProps) {
  const { attemptId = "" } = useParams();
  const location = useLocation();
  const nav = readNavState(location.state);
  useColorModeScope();

  const live = useAttempt(reviewOnly ? undefined : attemptId);
  const review = useAttemptReview(reviewOnly ? attemptId : undefined);
  const query = reviewOnly ? review : live;
  const attempt = query.data;
  const completed = attempt?.status === "Completed";
  const result = useAttemptResult(completed ? attemptId : undefined);

  if (query.isError) {
    return (
      <main className={styles.status}>
        <ErrorState
          image={errorMascot}
          title={practiceExamError(
            query.error,
            reviewOnly ? "Chưa mở được bài xem lại." : "Chưa mở được bài làm.",
          )}
          onRetry={() => void query.refetch()}
          action={
            <ButtonLink to={nav.from ?? "/practice/exam"} variant="outline">
              Về Luyện đề
            </ButtonLink>
          }
        />
      </main>
    );
  }

  // A completed attempt waits for its result so the score overlay opens with real numbers.
  if (!attempt || (completed && result.isPending)) {
    return (
      <main className={styles.status} aria-busy="true">
        <div className={styles.loading} role="status">
          <img src={waitingMascot} alt="" width={140} height={140} decoding="async" />
          <p>{reviewOnly ? "Đang mở bài xem lại…" : "Đang chuẩn bị bài làm…"}</p>
        </div>
      </main>
    );
  }

  if (attempt.status === "Abandoned") {
    return (
      <main className={styles.status}>
        <ErrorState
          image={errorMascot}
          title="Bài làm này đã được thay bằng một lượt mới hoặc đã bị bỏ."
          action={
            <ButtonLink to={exitPath(attempt.source, nav.from)} variant="primary">
              Quay lại
            </ButtonLink>
          }
        />
      </main>
    );
  }

  // A running mock exam belongs to the exam room (timer, audio rules).
  if (!reviewOnly && attempt.mode === "FullTest" && attempt.status === "InProgress") {
    const testId = attempt.testId ?? attempt.source.id;
    return <Navigate to={`/practice/tests/${testId}/exam`} replace state={{ from: nav.from }} />;
  }

  return (
    <PracticeWorkspace
      key={`${attempt.id}:${reviewOnly ? "review" : "live"}`}
      attempt={attempt}
      reviewOnly={reviewOnly}
      nav={nav}
      result={result.data ?? null}
    />
  );
}
