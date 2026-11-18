import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import { Button } from "@/modules/admin";
import { RichText, mediaUrls } from "@/shared/components/RichText";
import {
  QuestionOptions,
  QuestionMedia,
  ListeningTranscript,
  blankLabels,
} from "@/shared/components/QuestionContent";
import { attemptsApi, type PracticeAttempt } from "../api/attempts.api";
import { AttemptAutosave } from "../utils/attemptAutosave";
import styles from "../components/Attempt.module.css";

type Session = {
  data: PracticeAttempt;
  queue: AttemptAutosave;
  abort: AbortController;
  ownerId: string;
};
const labels = {
  saved: "Đã lưu",
  saving: "Đang lưu",
  unsaved: "Chưa lưu",
  error: "Lỗi lưu",
  conflict: "Xung đột",
};

export function PracticeAttemptPage() {
  const { id = "" } = useParams();
  const user = useCurrentUser();
  const ownerId = user?.id;
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!ownerId) return;
    const abort = new AbortController();
    let queue: AttemptAutosave | undefined;
    void attemptsApi
      .get(id, abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        setError(false);
        queue = new AttemptAutosave(data.questions, (questionId, answer, revision, mutationId) =>
          attemptsApi.save(id, questionId, answer, revision, mutationId, abort.signal),
        );
        setSession({ data, queue, abort, ownerId });
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => {
      abort.abort();
      queue?.dispose();
    };
  }, [id, ownerId, reload]);
  // Session content is never reused across a route/account transition.
  if (error)
    return (
      <main className={styles.page}>
        <h1>Không mở được bài luyện tập</h1>
        <p>Bài có thể đã bị bỏ, hết hạn hoặc không thuộc tài khoản này.</p>
        <Button
          variant="primary"
          className={styles.actionButton}
          onClick={() => {
            setError(false);
            setSession(null);
            setReload((v) => v + 1);
          }}
        >
          Thử lại
        </Button>
      </main>
    );
  return session && session.data.id === id && session.ownerId === ownerId ? (
    <AttemptSession key={`${id}:${ownerId}:${reload}`} session={session} />
  ) : (
    <main className={styles.page} aria-busy="true">
      <p role="status">Đang mở bài…</p>
    </main>
  );
}

function AttemptSession({ session }: { session: Session }) {
  const { data, queue, abort } = session;
  const states = useSyncExternalStore(queue.subscribe, queue.snapshot);
  const [index, setIndex] = useState(0);
  const [dialog, setDialog] = useState<"discard" | "exit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const questionGrid = useRef<HTMLDivElement>(null);
  const activeQuestion = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useCurrentUser();
  const dirty = states.some((s) => s.status !== "saved");
  const answeredCount = states.filter((s) => s.selected != null).length;
  const question = data.questions[index];
  const state = states[index];
  const part = Number(question.part.replace("Part", ""));
  const passage = data.passages.find((p) => p.id === question.passageId);
  const groupQuestions = passage ? data.questions.filter((q) => q.passageId === passage.id) : [];
  const groupAudio = passage?.audioUrl || groupQuestions.find((q) => q.audioUrl)?.audioUrl;
  const sharedMedia = [...mediaUrls(passage?.imageUrl), ...mediaUrls(groupAudio)];
  const separateAudio = mediaUrls(question.audioUrl).some((url) => !sharedMedia.includes(url));
  const hasQuestionMedia = [...mediaUrls(question.imageUrl), ...mediaUrls(question.audioUrl)].some(
    (url) => !sharedMedia.includes(url),
  );
  const sourceLabels = new Map(data.questions.map((q, i) => [q.sourceQuestionId, String(i + 1)]));
  const sourceQuestions = groupQuestions.map((q) => ({ ...q, id: q.sourceQuestionId }));
  const destination = `/practice/parts/${data.practiceSetId}`;
  const allowNavigation = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigation.current &&
      currentLocation.pathname !== nextLocation.pathname &&
      queue.snapshot().some((s) => s.status !== "saved"),
  );
  const shownDialog = dialog ?? (blocker.state === "blocked" ? "exit" : null);
  const leaveConfirmed = () => {
    allowNavigation.current = true;
    if (blocker.state === "blocked") blocker.proceed();
    else navigate(destination);
  };
  useEffect(() => {
    const grid = questionGrid.current;
    const button = activeQuestion.current;
    if (!grid || !button) return;
    // Reveal the current number without scrolling the question or the page.
    const top = button.offsetTop;
    const bottom = top + button.offsetHeight;
    if (top < grid.scrollTop) grid.scrollTop = top;
    else if (bottom > grid.scrollTop + grid.clientHeight)
      grid.scrollTop = bottom - grid.clientHeight;
  }, [index]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (queue.snapshot().some((s) => s.status !== "saved")) event.preventDefault();
    };
    const sync = () => {
      if (abort.signal.aborted) return;
      void attemptsApi
        .get(data.id, abort.signal)
        .then((fresh) => queue.reconcile(fresh.questions))
        .catch(() => {
          if (!abort.signal.aborted)
            setMessage(
              "Không đồng bộ được. Bài có thể đã hết hạn/bị bỏ ở phiên khác; các lựa chọn chưa lưu vẫn đang hiển thị.",
            );
        });
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
    };
  }, [queue, abort, data.id]);
  const exit = async () => {
    setBusy(true);
    const saved = await queue.flush();
    setBusy(false);
    if (saved) navigate(destination);
    else setDialog("exit");
  };
  const discard = async () => {
    setBusy(true);
    try {
      await attemptsApi.discard(data.id, abort.signal);
      queue.dispose();
      abort.abort();
      allowNavigation.current = true;
      client.removeQueries({ queryKey: ["practice-attempt-active", user?.id, data.practiceSetId] });
      navigate(destination, { replace: true });
    } catch {
      setMessage(
        "Chưa xác nhận xóa thành công. Hãy thử lại hoặc tải lại để kiểm tra trạng thái bài.",
      );
    } finally {
      setBusy(false);
    }
  };
  const refreshConflict = async () => {
    try {
      queue.reconcile((await attemptsApi.get(data.id, abort.signal)).questions);
    } catch {
      setMessage("Không tải được đáp án đang lưu. Hãy thử lại.");
    }
  };
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>LUYỆN TẬP · {data.set.part}</p>
          <h1>{data.set.title}</h1>
          <p className={styles.sessionStatus} role="status">
            {!dirty && <CheckCircle2 size={16} aria-hidden="true" />}
            {dirty ? "Có đáp án chưa lưu" : "Tất cả đáp án đã lưu"}
          </p>
        </div>
        <div className={styles.buttonRow}>
          <Button className={styles.actionButton} disabled={busy} onClick={() => void exit()}>
            Rời bài
          </Button>
          <Button
            className={styles.actionButton}
            variant="danger-outline"
            disabled={busy}
            onClick={() => setDialog("discard")}
          >
            Bỏ bài
          </Button>
        </div>
      </header>
      {message && (
        <p className={styles.notice} role="alert">
          {message}
        </p>
      )}
      <div className={styles.layout}>
        <nav className={styles.navigator} aria-label="Điều hướng câu hỏi">
          <div className={styles.navigatorHeader}>
            <h2>
              <ListChecks size={18} aria-hidden="true" />
              Danh sách câu hỏi
            </h2>
            <p>
              <strong>
                {answeredCount}/{states.length}
              </strong>{" "}
              đã trả lời
            </p>
            <progress value={answeredCount} max={states.length} aria-label="Tiến độ trả lời" />
          </div>
          <div ref={questionGrid} className={styles.questionGrid}>
            {states.map((s, i) => (
              <Button
                key={s.id}
                ref={index === i ? activeQuestion : undefined}
                type="button"
                aria-current={index === i ? "step" : undefined}
                data-answered={s.selected != null}
                data-save-status={s.status}
                aria-label={`Câu ${i + 1}: ${s.selected ? "đã trả lời" : "chưa trả lời"}${s.status === "error" || s.status === "conflict" ? `, ${labels[s.status]}` : ""}`}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <div className={styles.legend}>
            <span>
              <i className={styles.currentKey} aria-hidden="true" />
              Đang xem
            </span>
            <span>
              <i className={styles.answeredKey} aria-hidden="true" />
              Đã trả lời
            </span>
            <span>
              <i className={styles.pendingKey} aria-hidden="true" />
              Chưa trả lời
            </span>
          </div>
        </nav>
        <article className={styles.content} data-reading={part > 4}>
          <header className={styles.questionHeader}>
            <div>
              <p className={styles.eyebrow}>{question.part}</p>
              <h2>
                Câu {index + 1} <span>/ {states.length}</span>
              </h2>
            </div>
            <span className={styles.answerBadge} data-answered={state.selected != null}>
              {state.selected ? `Đã chọn ${state.selected}` : "Chưa trả lời"}
            </span>
          </header>
          {passage && (
            <section key={passage.id} className={styles.passage} aria-label="Ngữ cảnh câu hỏi">
              <p className={styles.sectionLabel}>
                Ngữ cảnh chung · {groupQuestions.length} câu hỏi
              </p>
              {passage.title && <h3>{passage.title}</h3>}
              <div className={styles.media}>
                <QuestionMedia
                  image={passage.imageUrl}
                  audio={groupAudio}
                  imageClassName={styles.image}
                />
              </div>
              {part <= 4 ? (
                <ListeningTranscript
                  part={part}
                  scripts={[
                    passage.content,
                    passage.transcript,
                    ...groupQuestions
                      .filter((q) => !q.audioUrl || q.audioUrl === groupAudio)
                      .map((q) => q.transcript),
                  ]}
                />
              ) : (
                <RichText
                  value={passage.content}
                  variant="document"
                  blankLabel={
                    part === 6
                      ? blankLabels(sourceQuestions, sourceLabels, question.sourceQuestionId)
                      : undefined
                  }
                />
              )}
            </section>
          )}
          <div className={styles.questionBody} data-split-media={hasQuestionMedia && part <= 4}>
            {(hasQuestionMedia || (part <= 4 && (!passage || separateAudio))) && (
              <div className={styles.resources} key={question.id}>
                <div className={styles.media}>
                  <QuestionMedia
                    image={question.imageUrl}
                    audio={question.audioUrl}
                    shown={sharedMedia}
                    imageClassName={styles.image}
                  />
                </div>
                {(!passage || separateAudio) && (
                  <ListeningTranscript part={part} scripts={[question.transcript]} />
                )}
              </div>
            )}
            <div className={styles.answerPanel}>
              <RichText value={question.questionText} dashBlanks lang="en" />
              <fieldset className={styles.answerChoices}>
                <legend>Chọn một đáp án</legend>
                <QuestionOptions
                  part={part}
                  variant="cards"
                  optionA={question.optionA}
                  optionB={question.optionB}
                  optionC={question.optionC}
                  optionD={question.optionD}
                  selected={state.selected}
                  groupName={question.id}
                  onChange={(answer) => queue.select(question.id, answer)}
                  disabled={busy}
                />
              </fieldset>
              <p className={styles.saveStatus} data-status={state.status} role="status">
                {state.status === "saved" && <CheckCircle2 size={15} aria-hidden="true" />}
                {labels[state.status]}
              </p>
            </div>
          </div>
          {state.status === "error" && (
            <Button className={styles.actionButton} onClick={() => void queue.retry(question.id)}>
              Thử lưu lại
            </Button>
          )}
          {state.status === "conflict" && (
            <section role="alert">
              <p>
                Đáp án đã thay đổi ở phiên khác. Lựa chọn của bạn: {state.selected ?? "chưa chọn"}.
              </p>
              <Button className={styles.actionButton} onClick={() => void refreshConflict()}>
                Xem bản đang lưu
              </Button>
              {state.server && (
                <>
                  <p>Bản đang lưu: {state.server.answer ?? "chưa chọn"}.</p>
                  <div className={styles.buttonRow}>
                    <Button
                      className={styles.actionButton}
                      onClick={() => queue.resolve(question.id, false)}
                    >
                      Dùng bản đang lưu
                    </Button>
                    <Button
                      className={styles.actionButton}
                      variant="primary"
                      onClick={() => queue.resolve(question.id, true)}
                    >
                      Xác nhận lưu lựa chọn của tôi
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
          <div className={styles.actions}>
            <Button
              className={styles.actionButton}
              disabled={index === 0}
              onClick={() => setIndex((v) => v - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              Câu trước
            </Button>
            <span className={styles.position}>
              Câu {index + 1} / {states.length}
            </span>
            <Button
              className={styles.actionButton}
              variant="primary"
              disabled={index === states.length - 1}
              onClick={() => setIndex((v) => v + 1)}
            >
              Câu tiếp
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </article>
      </div>
      {shownDialog && (
        <div className={styles.overlay}>
          <section role="dialog" aria-modal="true" aria-labelledby="attempt-dialog-title">
            <h2 id="attempt-dialog-title">
              {shownDialog === "discard" ? "Bỏ bài luyện tập?" : "Còn đáp án chưa lưu"}
            </h2>
            <p>
              {shownDialog === "discard"
                ? "Toàn bộ tiến trình đã lưu và lựa chọn chưa gửi sẽ bị xóa vĩnh viễn. Bạn không thể tiếp tục bài này sau khi bỏ."
                : "Đáp án chưa được máy chủ xác nhận có thể mất khi rời trang. Bài và các đáp án đã lưu vẫn được giữ để tiếp tục."}
            </p>
            <div className={styles.buttonRow}>
              <Button
                className={styles.actionButton}
                disabled={busy}
                onClick={() => {
                  setDialog(null);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Ở lại
              </Button>
              <Button
                className={styles.actionButton}
                variant={shownDialog === "discard" ? "danger" : "primary"}
                disabled={busy}
                onClick={() => (shownDialog === "discard" ? void discard() : leaveConfirmed())}
              >
                {busy
                  ? "Đang xử lý…"
                  : shownDialog === "discard"
                    ? "Xác nhận bỏ bài"
                    : "Rời bài, giữ tiến trình đã lưu"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
