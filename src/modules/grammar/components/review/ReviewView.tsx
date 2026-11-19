/**
 * Personal revision (lesson column, ?on-tap=1): mistake log grouped by knowledge unit + "Bẫy bạn hay mắc".
 * A question is redone in place through the single-question endpoint `questions/{qid}/answer` (no attempt, no topic
 * submission). Fixed → the question fades out of the log and "Cần ôn" goes down. Port of Studychill `ReviewView.jsx`.
 */
import { useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Loader2, RotateCcw } from "lucide-react";

import { grammarApi } from "../../api/grammar.api";
import { grammarQueryKeys } from "../../api/grammar.query-keys";
import { LESSON_TTL_MS } from "../../hooks/useGrammarLesson";
import { adjustReviewCount, scheduleResync } from "../../store/grammar-progress.store";
import type {
  AnswerResultDto,
  MistakeGroupDto,
  MistakeQuestionDto,
  TrapDto,
} from "../../types/grammar.types";
import type { GrammarQuestion } from "../../types/exercise.types";
import { cx } from "../../utils/cx";
import { scoredQids } from "../../utils/grammar-answers";
import { errorMessage } from "../../utils/grammar-session";
import { BLANK } from "../../utils/grammar-text";
import { AttemptView, type AttemptSubmitResult } from "../exercise/ExerciseView";
import kit from "../shared/GrammarKit.module.css";
import styles from "./ReviewView.module.css";

const MIN_TRAP_COUNT = 3;

interface QuestionSource {
  questions: GrammarQuestion[][];
}

const stageCache = new Map<string, Promise<QuestionSource>>();

/** Questions of the topic (shared lesson query cache) or of the stage test the mistake comes from. */
function loadContent(queryClient: QueryClient, entry: MistakeQuestionDto): Promise<QuestionSource> {
  if (entry.stage) {
    const key = `stage-${entry.stage}`;
    let p = stageCache.get(key);
    if (!p) {
      p = grammarApi.getStageTest(entry.stage).then((t) => ({ questions: [t.questions] }));
      p.catch(() => stageCache.delete(key));
      stageCache.set(key, p);
    }
    return p;
  }
  const topicItem = entry.topic || "";
  return queryClient
    .fetchQuery({
      queryKey: grammarQueryKeys.lesson(topicItem),
      queryFn: ({ signal }) => grammarApi.getTopic(topicItem, signal),
      staleTime: LESSON_TTL_MS,
    })
    .then((l) => ({
      questions: [...Object.values(l.exercises.quickChecks), l.exercises.miniTest.questions],
    }));
}

/** The question (or a Part 6 passage reduced to the one blank to revise) of `qid` in the loaded content. */
function findQuestion(data: QuestionSource, qid: string): GrammarQuestion | null {
  for (const qs of data.questions) {
    for (const q of qs) {
      if (q.id === qid) return q;
      const s = q.kind === "cloze6" ? (q.subQuestions || []).find((x) => x.id === qid) : null;
      if (s) return { ...q, subQuestions: [s] };
    }
  }
  return null;
}

/** "Submits" the open questions as an attempt, each through the single-question endpoint — same result shape. */
async function submitSingles(
  questions: GrammarQuestion[],
  answers: Record<string, unknown>,
): Promise<AttemptSubmitResult> {
  const qids = questions.flatMap(scoredQids);
  const results: AnswerResultDto[] = await Promise.all(
    qids.map((qid) =>
      qid in answers
        ? grammarApi.answerQuestion(qid, answers[qid])
        : Promise.resolve({ correct: false, saved: false }),
    ),
  );
  const byQid = Object.fromEntries(
    qids.map((qid, i) => [
      qid,
      results[i].correct
        ? { correct: true, explanation: results[i].explanation }
        : { correct: false },
    ]),
  );
  return {
    attemptId: null,
    results: byQid,
    score: results.filter((r) => r.correct).length,
    total: qids.length,
    passMark: null,
    best: null,
    saved: results.some((r) => r.saved),
  };
}

const retrySingle = (_attemptId: string | null, qid: string, value: unknown) =>
  grammarApi.answerQuestion(qid, value);
const revealSingle = (_attemptId: string | null, qid: string) => grammarApi.revealQuestion(qid);

function summarize(q: GrammarQuestion): string {
  const s =
    q.kind === "cloze6" ? `${q.prompt} · chỗ trống ${q.subQuestions?.[0]?.position}` : q.prompt;
  const t = String(s || "")
    .replaceAll(BLANK, "___")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 120 ? `${t.slice(0, 118)}…` : t;
}

type ReviewHandler = (code: string, qid?: string) => void;

function MistakeItem({
  questions: entry,
  onReview,
  onDone,
}: {
  questions: MistakeQuestionDto;
  onReview: ReviewHandler;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState<GrammarQuestion | false | null>(null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadContent(queryClient, entry)
      .then((data) => {
        if (alive) setQ(findQuestion(data, entry.questionId) || false);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err));
      });
    return () => {
      alive = false;
    };
  }, [entry, queryClient]);

  const handleCorrect = () => {
    setLeaving(true);
    adjustReviewCount(-1);
    scheduleResync();
    setTimeout(onDone, 650);
  };

  if (q === false) return null;
  return (
    <li className={cx(styles.mistakeQuestion, leaving && styles.mistakeQuestionLeaving)}>
      <div className={styles.mistakeRow}>
        <p className={styles.mistakePrompt} lang="en">
          {q ? summarize(q) : error || "Đang mở câu…"}
        </p>
        <span className={styles.mistakeCount}>sai {entry.wrongCount} lần</span>
        {q && (
          <button
            type="button"
            className={kit.whyBtn}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? (
              "Thu gọn"
            ) : (
              <>
                <RotateCcw size={13} /> Làm lại
              </>
            )}
          </button>
        )}
      </div>
      {open && q && (
        <div className={styles.mistakeRedo}>
          <AttemptView
            compact
            blockKey={`mistake:${entry.questionId}`}
            questions={[q]}
            home={null}
            submitLabel="Kiểm tra"
            submit={(answers) => submitSingles([q], answers)}
            sendRetry={retrySingle}
            sendReveal={revealSingle}
            onReview={onReview}
            onCorrect={handleCorrect}
            head={() => null}
          />
        </div>
      )}
    </li>
  );
}

function MistakeLog({
  group: groups,
  onReview,
  onRemove,
}: {
  group: MistakeGroupDto[];
  onReview: ReviewHandler;
  onRemove: (code: string, qid: string) => void;
}) {
  return (
    <ol className={styles.mistakes}>
      {groups.map((g) => (
        <li key={g.unitCode} className={styles.mistakeGroup}>
          <div className={styles.mistakeHead}>
            <b>{g.unitCode}</b>
            <span>{g.unitTitle}</span>
            <button type="button" className={kit.reviewLink} onClick={() => onReview(g.unitCode)}>
              <RotateCcw size={12} /> Xem lại bài
            </button>
          </div>
          <ul>
            {g.questions.map((c) => (
              <MistakeItem
                key={c.questionId}
                questions={c}
                onReview={onReview}
                onDone={() => onRemove(g.unitCode, c.questionId)}
              />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function FrequentTraps({ traps, onReview }: { traps: TrapDto[]; onReview: ReviewHandler }) {
  const total = traps.reduce((n, t) => n + t.wrongCount, 0);
  if (total < MIN_TRAP_COUNT) return null;
  return (
    <section className={styles.bayList}>
      <h3>Bẫy bạn hay mắc</h3>
      <ol>
        {traps.slice(0, 3).map((t) => (
          <li key={t.trapCode}>
            <div>
              <p>{t.description}</p>
              <small>
                {t.unitCode} · sai {t.wrongCount} lần
                {t.questionCount > 1 ? ` ở ${t.questionCount} câu` : ""}
              </small>
            </div>
            <button type="button" className={kit.whyBtn} onClick={() => onReview(t.unitCode)}>
              <BookOpen size={13} /> Ôn bẫy này
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ReviewData {
  group: MistakeGroupDto[] | null;
  traps: TrapDto[];
  core: string;
}

interface ReviewViewProps {
  /** `undefined` while the session resolves. */
  isGuest: boolean | undefined;
  onReview: ReviewHandler;
  onLogin: () => void;
}

export function ReviewView({ isGuest, onReview, onLogin }: ReviewViewProps) {
  const [data, setData] = useState<ReviewData>({ group: null, traps: [], core: "" });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (isGuest !== false) return undefined;
    let alive = true;
    Promise.all([grammarApi.getMistakes(), grammarApi.getTraps().catch(() => [] as TrapDto[])])
      .then(([groups, traps]) => {
        if (alive) setData({ group: groups, traps, core: "" });
      })
      .catch((err) => {
        if (alive) setData({ group: [], traps: [], core: errorMessage(err) });
      });
    return () => {
      alive = false;
    };
  }, [isGuest]);

  if (isGuest) {
    return (
      <div className={styles.review}>
        <p className={kit.lead}>
          Sổ lỗi note lại những câu bạn làm sai để ôn lại đúng chỗ. Đăng nhập để có sổ lỗi riêng.
        </p>
        <button type="button" className={cx(kit.btn, kit.btnMoss)} onClick={onLogin}>
          Đăng nhập
        </button>
      </div>
    );
  }
  if (!data.group) {
    return (
      <div className={kit.loading} role="status">
        <Loader2 size={18} className={kit.spin} /> Đang mở sổ lỗi…
      </div>
    );
  }

  const groupsAll = data.group;
  const bot = (code: string, qid: string) =>
    setData((d) => ({
      ...d,
      group: (d.group || [])
        .map((g) =>
          g.unitCode === code
            ? { ...g, questions: g.questions.filter((c) => c.questionId !== qid) }
            : g,
        )
        .filter((g) => g.questions.length),
    }));
  const mistakeCount = groupsAll.reduce((n, g) => n + g.questions.length, 0);
  const visibleGroups = showAll ? groupsAll : groupsAll.slice(0, 8);

  return (
    <div className={styles.review}>
      <FrequentTraps traps={data.traps} onReview={onReview} />
      <h2 className={kit.sectionTitle}>
        <b>SỔ LỖI</b>
        <span>{mistakeCount ? `${mistakeCount} câu cần ôn` : "Chưa có câu cần ôn"}</span>
      </h2>
      {data.core && <p className={kit.error}>{data.core}</p>}
      {!mistakeCount && !data.core && (
        <p className={kit.lead}>
          Câu nào làm sai sẽ vào đây. Sửa đúng là câu rời sổ — cứ làm bài thoải mái nhé.
        </p>
      )}
      <MistakeLog group={visibleGroups} onReview={onReview} onRemove={bot} />
      {groupsAll.length > visibleGroups.length && (
        <button
          type="button"
          className={cx(kit.btn, kit.btnGhost)}
          onClick={() => setShowAll(true)}
        >
          <ChevronDown size={15} /> Xem thêm {groupsAll.length - visibleGroups.length} đơn vị
        </button>
      )}
    </div>
  );
}
