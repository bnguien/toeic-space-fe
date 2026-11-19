import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import errorMascot from "@/assets/mascot/oy2-error.png";
import waitingMascot from "@/assets/mascot/oy2-waiting.png";
import { useLookupGate } from "@/modules/vocabulary";
import { Button, ButtonLink } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { ExamDialog } from "../components/exam-room/ExamDialog";
import { ExamIntro } from "../components/exam-room/ExamIntro";
import { ExamRunner } from "../components/exam-room/ExamRunner";
import {
  backTarget,
  readPosition,
  remainingAtResponse,
} from "../components/exam-room/examRoomState";
import styles from "../components/exam-room/ExamRoom.module.css";
import { usePracticePrefs } from "../hooks/usePracticePrefs";
import { useActiveTestAttempt, useTest } from "../hooks/usePracticeExamQueries";
import { useStartTestAttempt } from "../hooks/usePracticeExamMutations";
import { enterFullscreen, exitFullscreen } from "../hooks/useFullscreen";
import type { Attempt } from "../types/practice-exam.types";
import { primeExamAudio, setExamVolume, stopExamAudio } from "../utils/examAudio";
import { errorStatusOf, practiceExamError } from "../utils/practiceExamErrors";
import { formatClock } from "../utils/scoreDisplay";

/** Phones keep the browser chrome (fullscreen hides the address bar and confuses learners). */
const SMALL_SCREEN = "(max-width: 759px)";

function Waiting({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className={styles.centerScroll}>
      <div className={styles.card} role="status" aria-live="polite">
        <img
          className={styles.cardMascot}
          src={waitingMascot}
          alt=""
          width={120}
          height={120}
          decoding="async"
        />
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorCard({
  title,
  message,
  backTo,
  onRetry,
}: {
  title: string;
  message: string;
  backTo: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.centerScroll}>
      <section className={styles.card} role="alert">
        <img
          className={styles.cardMascot}
          src={errorMascot}
          alt=""
          width={120}
          height={120}
          decoding="async"
        />
        <span className={styles.errorIcon}>
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.cardText}>{message}</p>
        <div className={styles.cardActions}>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Thử lại
            </Button>
          )}
          <ButtonLink
            to={backTo}
            variant="primary"
            icon={<ArrowLeft size={16} aria-hidden="true" />}
          >
            Về Luyện đề
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

/**
 * Mock exam room `/practice/tests/:testId/exam` (port of StudyChill ExamRoom). Loads the test and
 * the learner's in-progress attempt, then: resume dialog | intro → starting (the first start copies
 * the media, up to ~20 s) → running (`ExamRunner`) → result page. The server owns answers, flags
 * and the deadline; navigation state `{ restart: true }` abandons the in-progress attempt.
 */
export function ExamRoomPage() {
  const { testId = "" } = useParams();
  useColorModeScope();
  useLookupGate();
  const location = useLocation();
  const navigate = useNavigate();
  const [entry] = useState(() => ({
    restart: Boolean((location.state as { restart?: unknown } | null)?.restart),
    backTo: backTarget(location.state),
  }));
  const test = useTest(testId);
  const active = useActiveTestAttempt(testId);
  const start = useStartTestAttempt();
  const { volume, setVolume } = usePracticePrefs((s) => ({
    volume: s.examVolume,
    setVolume: s.setExamVolume,
  }));
  const [restart, setRestart] = useState(entry.restart);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  /** In-progress Practice attempt of this test returned instead of a FullTest. */
  const [practiceConflict, setPracticeConflict] = useState<string | null>(null);

  // `state.restart` is used once: drop it so F5 does not restart again.
  useEffect(() => {
    if ((location.state as { restart?: unknown } | null)?.restart) {
      navigate(location.pathname, { replace: true, state: { from: entry.backTo } });
    }
  }, [location.state, location.pathname, navigate, entry.backTo]);

  useEffect(() => setExamVolume(volume), [volume]);
  // Leaving the room: silence and leave fullscreen.
  useEffect(
    () => () => {
      stopExamAudio();
      exitFullscreen();
    },
    [],
  );

  const detail = test.data;
  const title = detail?.title || "Đề thi TOEIC";
  useEffect(() => {
    document.title = `Thi thử · ${title} | TOEIC Space`;
  }, [title]);

  const begin = (restartFlag: boolean) => {
    if (!window.matchMedia?.(SMALL_SCREEN).matches) enterFullscreen();
    primeExamAudio();
    start.mutate(
      { testId, mode: "FullTest", ...(restartFlag ? { restart: true } : {}) },
      {
        onSuccess: (next) => {
          if (next.mode !== "FullTest") {
            exitFullscreen();
            setPracticeConflict(next.id);
            return;
          }
          if (next.status === "Completed") {
            exitFullscreen();
            navigate(`/practice/attempts/${next.id}/result`, { replace: true });
            return;
          }
          setAttempt(next);
        },
        onError: () => exitFullscreen(),
      },
    );
  };

  let content: ReactNode;
  if (attempt) {
    content = (
      <ExamRunner
        key={attempt.id}
        attempt={attempt}
        title={attempt.source.title || title}
        backTo={entry.backTo}
        volume={volume}
        onVolume={setVolume}
      />
    );
  } else if (start.isPending) {
    content = (
      <Waiting label="Đang chuẩn bị phòng thi…">
        <p className={styles.cardText}>
          Lần đầu mở đề có thể mất khoảng 20 giây để chuẩn bị âm thanh và hình ảnh.
        </p>
        <div className={styles.cardActions}>
          <ButtonLink
            to={entry.backTo}
            variant="outline"
            icon={<ArrowLeft size={16} aria-hidden="true" />}
          >
            Huỷ, về Luyện đề
          </ButtonLink>
        </div>
      </Waiting>
    );
  } else if (start.isError) {
    content = (
      <ErrorCard
        title="Chưa mở được phòng thi"
        message={practiceExamError(start.error)}
        backTo={entry.backTo}
        onRetry={() => {
          start.reset();
          begin(restart || Boolean(practiceConflict));
        }}
      />
    );
  } else if (test.isPending || (active.isPending && active.fetchStatus !== "idle")) {
    content = <Waiting label="Đang mở đề…" />;
  } else if (test.isError || !detail) {
    content = (
      <ErrorCard
        title="Không mở được đề"
        message={
          errorStatusOf(test.error) === 404
            ? "Không tìm thấy đề này, hoặc đề chưa được mở cho học viên."
            : practiceExamError(test.error, "Không tải được đề. Kiểm tra mạng rồi thử lại.")
        }
        backTo={entry.backTo}
        onRetry={errorStatusOf(test.error) === 404 ? undefined : () => void test.refetch()}
      />
    );
  } else if ((detail.questionCount || detail.totalQuestions) === 0) {
    content = (
      <ErrorCard title="Không mở được đề" message="Đề này chưa có câu hỏi." backTo={entry.backTo} />
    );
  } else {
    const total = detail.questionCount || detail.totalQuestions;
    const listeningCount = detail.listeningQuestionCount || detail.totalListeningQuestions;
    const readingCount = detail.readingQuestionCount || detail.totalReadingQuestions;
    const info = active.data;
    const activeId = info?.attemptId ?? null;
    const activeIsExam = info?.mode === "FullTest";
    const practiceId = practiceConflict ?? (activeId && !activeIsExam ? activeId : null);
    const showResume = Boolean(activeId && activeIsExam && !restart);
    const showPractice = Boolean(practiceId && (practiceConflict || !restart));
    const remaining = remainingAtResponse(info?.deadline, info?.serverNow);
    const timeLeft = remaining === null || remaining > 0;
    const answered = info?.answeredCount ?? 0;
    const stored = readPosition(activeId);
    const resumeInListening = stored?.section
      ? stored.section === "listening"
      : answered < listeningCount;
    const note =
      restart && activeId
        ? activeIsExam
          ? "Bài thi đang làm dở sẽ được huỷ và đồng hồ chạy lại từ đầu khi bạn bắt đầu."
          : "Bài luyện tập đang làm dở của đề này sẽ được huỷ khi bạn bắt đầu."
        : undefined;

    content = (
      <>
        <ExamIntro
          title={title}
          total={total}
          minutes={detail.durationMinutes || 120}
          listeningCount={listeningCount}
          readingCount={readingCount}
          volume={volume}
          onVolume={setVolume}
          onStart={() => begin(restart)}
          backTo={entry.backTo}
          note={note}
        />
        {showResume && !practiceConflict && (
          <ExamDialog
            title="Bạn có bài đang làm dở"
            onCancel={null}
            actions={
              <>
                <Button variant="outline" onClick={() => setRestart(true)}>
                  Làm lại từ đầu
                </Button>
                <Button variant="primary" onClick={() => begin(false)} data-autofocus>
                  Tiếp tục bài đang làm
                </Button>
              </>
            }
          >
            <p>
              Đã làm{" "}
              <strong>
                {answered}/{info?.totalQuestions || total}
              </strong>{" "}
              câu ·{" "}
              {timeLeft ? (
                <>
                  còn <strong>{formatClock(remaining ?? 0)}</strong>
                </>
              ) : (
                <strong>đã hết giờ — bài sẽ được nộp ngay</strong>
              )}
              .
            </p>
            {resumeInListening && timeLeft && (
              <p className={styles.muted}>
                Bạn đang ở phần Listening: audio của nhóm câu hiện tại sẽ phát lại từ đầu.
              </p>
            )}
          </ExamDialog>
        )}
        {showPractice && (
          <ExamDialog
            title="Đề này đang có bài Luyện tập làm dở"
            onCancel={null}
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPracticeConflict(null);
                    setRestart(true);
                  }}
                >
                  Bắt đầu thi thử mới
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/practice/attempts/${practiceId}`)}
                  data-autofocus
                >
                  Mở bài luyện tập
                </Button>
              </>
            }
          >
            <p>
              Mỗi đề chỉ giữ một bài đang làm. Bắt đầu thi thử mới sẽ{" "}
              <strong>huỷ bài luyện tập</strong> (tiến độ chưa nộp của bài đó không được giữ).
            </p>
            <p className={styles.muted}>
              Chưa muốn quyết định?{" "}
              <Link to={entry.backTo} className={styles.inlineLink}>
                Về Luyện đề
              </Link>
            </p>
          </ExamDialog>
        )}
      </>
    );
  }

  return (
    <div className={styles.room} data-running={attempt ? true : undefined}>
      {content}
    </div>
  );
}
