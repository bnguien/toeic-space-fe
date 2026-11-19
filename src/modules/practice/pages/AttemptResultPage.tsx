import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, RotateCcw, Target } from "lucide-react";

import notFoundImage from "@/assets/mascot/oy2-404.png";
import errorImage from "@/assets/mascot/oy2-error.png";
import waitingImage from "@/assets/mascot/oy2-waiting.png";
import { Button, ButtonLink, toast } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { ResultDetailDialog } from "../components/result/ResultDetailDialog";
import {
  ResultAnswers,
  ResultOverview,
  ResultPartTable,
} from "../components/result/ResultSections";
import {
  buildResultRows,
  filterCounts,
  filterRows,
  partScores,
  partsOf,
  resultBackLink,
  type ResultRow,
  type RowFilter,
} from "../components/result/resultRows";
import styles from "../components/result/Result.module.css";
import { useRetakeAttempt } from "../hooks/usePracticeExamMutations";
import { useAttempt, useAttemptResult, useAttemptReview } from "../hooks/usePracticeExamQueries";
import type { RetakeScope } from "../types/practice-exam.types";
import { buildAttemptGroups } from "../utils/attemptGroups";
import { errorCodeOf, errorStatusOf, practiceExamError } from "../utils/practiceExamErrors";
import { scoreCounts } from "../utils/scoreDisplay";

const EXAM_SPACE = { to: "/practice/exam", label: "Về Luyện đề" };

function StatusPage({
  image,
  title,
  text,
  children,
  busy = false,
}: {
  image: string;
  title: string;
  text?: string;
  children?: ReactNode;
  busy?: boolean;
}) {
  return (
    <main className={styles.page} data-status>
      <section className={styles.statusCard} role={busy ? "status" : undefined} aria-live="polite">
        <img
          src={image}
          alt=""
          width={132}
          height={132}
          decoding="async"
          className={styles.statusImage}
        />
        <h1 className={styles.statusTitle}>
          {busy && <span className={styles.spinner} aria-hidden="true" />}
          {title}
        </h1>
        {text && <p className={styles.statusText}>{text}</p>}
        {children && <div className={styles.statusActions}>{children}</div>}
      </section>
    </main>
  );
}

const backButton = (link: { to: string; label: string }, variant: "primary" | "outline") => (
  <ButtonLink to={link.to} variant={variant} icon={<ArrowLeft size={16} aria-hidden="true" />}>
    {link.label}
  </ButtonLink>
);

/**
 * Result of a completed attempt `/practice/attempts/:attemptId/result` (port of StudyChill
 * ExamResultPage): predicted score + CEFR (or % when the attempt does not cover whole sections),
 * Listening / Reading cards, KPI, per-part table, answer list with part tabs and filters, and the
 * per-question detail fed by the review (fixes StudyChill's review losing the attempt's answers).
 */
export function AttemptResultPage() {
  const { attemptId = "" } = useParams();
  useColorModeScope();
  const navigate = useNavigate();
  const result = useAttemptResult(attemptId);
  const review = useAttemptReview(attemptId);
  const notCompleted =
    result.isError &&
    (errorCodeOf(result.error) === "attempt_not_completed" || errorStatusOf(result.error) === 409);
  const pending = useAttempt(notCompleted ? attemptId : undefined);
  const retake = useRetakeAttempt();
  const [part, setPart] = useState(0);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const answersRef = useRef<HTMLElement>(null);

  const data = result.data;
  const groups = useMemo(
    () => (review.data ? buildAttemptGroups(review.data) : null),
    [review.data],
  );
  const rows = useMemo(() => (data ? buildResultRows(data.answers, groups) : []), [data, groups]);
  const parts = useMemo(() => partsOf(rows), [rows]);
  const visible = useMemo(() => filterRows(rows, part, filter), [rows, part, filter]);
  const counts = useMemo(() => filterCounts(rows, part), [rows, part]);
  const byPart = useMemo(() => (data ? partScores(data.byPart, rows) : []), [data, rows]);
  const openIndex = openId === null ? -1 : visible.findIndex((row) => row.questionId === openId);
  const openRow = openIndex >= 0 ? visible[openIndex] : null;

  const title = data?.title || data?.source.title || "Bài làm TOEIC";
  useEffect(() => {
    document.title = `Kết quả · ${title} | TOEIC Space`;
  }, [title]);

  if (result.isPending) {
    return <StatusPage image={waitingImage} title="Đang tải kết quả…" busy />;
  }

  if (result.isError || !data) {
    const status = errorStatusOf(result.error);
    if (notCompleted) {
      const attempt = pending.data;
      const continueTo =
        attempt && attempt.mode === "FullTest" && attempt.source.kind === "Test"
          ? `/practice/tests/${attempt.source.id}/exam`
          : `/practice/attempts/${attemptId}`;
      return (
        <StatusPage
          image={waitingImage}
          title="Bài làm chưa được nộp"
          text="Bài này vẫn đang làm dở nên chưa có kết quả. Làm tiếp rồi nộp bài để xem điểm nhé."
        >
          <ButtonLink to={continueTo} variant="primary">
            Làm tiếp bài này
          </ButtonLink>
          {backButton(EXAM_SPACE, "outline")}
        </StatusPage>
      );
    }
    if (status === 401 || status === 403 || status === 404) {
      return (
        <StatusPage
          image={notFoundImage}
          title="Không tìm thấy kết quả"
          text={
            status === 401
              ? "Hãy đăng nhập đúng tài khoản đã làm bài để xem lại kết quả này."
              : "Lượt làm bài này không tồn tại hoặc không thuộc tài khoản của bạn."
          }
        >
          {backButton(EXAM_SPACE, "primary")}
        </StatusPage>
      );
    }
    return (
      <StatusPage
        image={errorImage}
        title="Chưa tải được kết quả"
        text="Mạng đang chập chờn hoặc máy chủ bận. Thử lại sau ít phút nhé."
      >
        <Button
          variant="primary"
          icon={<RotateCcw size={16} aria-hidden="true" />}
          onClick={() => void result.refetch()}
        >
          Thử lại
        </Button>
        {backButton(EXAM_SPACE, "outline")}
      </StatusPage>
    );
  }

  const back = resultBackLink(data.source);
  const isFullTest = data.mode === "FullTest" && data.source.kind === "Test";
  const { wrong, skipped } = scoreCounts(data.score);
  const retakeScope = retake.isPending ? retake.variables?.scope : undefined;

  const startRetake = (scope: RetakeScope) =>
    retake.mutate(
      { attemptId, scope },
      {
        onSuccess: (next) => navigate(`/practice/attempts/${next.id}`),
        onError: (error) => toast.error(practiceExamError(error)),
      },
    );
  const redo = () => {
    if (isFullTest) {
      navigate(`/practice/tests/${data.source.id}/exam`, {
        state: { restart: true, from: back.to },
      });
    } else {
      startRetake("All");
    }
  };
  const jumpToPart = (next: number) => {
    setPart(next);
    setFilter("all");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    answersRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const open = (row: ResultRow) => setOpenId(row.questionId);
  const step = (delta: number) => {
    const next = visible[openIndex + delta];
    if (next) setOpenId(next.questionId);
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <ButtonLink
          to={back.to}
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} aria-hidden="true" />}
          aria-label={back.label}
          className={styles.backLink}
        >
          <span className={styles.wide}>{back.label}</span>
        </ButtonLink>
        <div className={styles.topbarTitle}>
          <span>{isFullTest ? "Kết quả thi thử" : "Kết quả luyện tập"}</span>
          <h1 title={title}>{title}</h1>
        </div>
        <div className={styles.topbarActions}>
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw size={16} aria-hidden="true" />}
            onClick={redo}
            disabled={retake.isPending}
            aria-label={isFullTest ? "Làm lại đề" : "Làm lại bài"}
          >
            <span className={styles.wide}>
              {retakeScope === "All" ? "Đang tạo bài…" : isFullTest ? "Làm lại đề" : "Làm lại bài"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Target size={16} aria-hidden="true" />}
            onClick={() => startRetake("Wrong")}
            disabled={retake.isPending || wrong + skipped === 0}
            title={wrong + skipped === 0 ? "Không có câu sai hay bỏ qua" : undefined}
            aria-label="Luyện lại câu sai"
          >
            <span className={styles.wide}>
              {retakeScope === "Wrong" ? "Đang tạo bài…" : "Luyện lại câu sai"}
            </span>
          </Button>
          <ButtonLink
            to={`/practice/attempts/${attemptId}/review`}
            variant="primary"
            size="sm"
            icon={<Eye size={16} aria-hidden="true" />}
          >
            Xem lại toàn bài
          </ButtonLink>
        </div>
      </header>

      <div className={styles.content}>
        <ResultOverview result={data} />
        <ResultPartTable parts={byPart} onPart={jumpToPart} />
        <ResultAnswers
          ref={answersRef}
          parts={parts}
          part={part}
          onPart={setPart}
          filter={filter}
          onFilter={setFilter}
          counts={counts}
          visible={visible}
          onOpen={open}
          contentMissing={review.isError}
        />
      </div>

      {openRow && (
        <ResultDetailDialog
          row={openRow}
          groups={groups}
          index={openIndex}
          count={visible.length}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onClose={() => setOpenId(null)}
        />
      )}
    </main>
  );
}
