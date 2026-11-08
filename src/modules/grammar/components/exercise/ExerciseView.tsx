/**
 * Exercises (SECTION C of the PDF): a quick check per unit + the mini test; and the stage test.
 * Submit → graded on the server; right answers turn green, wrong ones red and are fixed in place (retry) until right.
 * The score is fixed at submission; "Làm lại" clears the block. Unfinished work of each block stays in memory
 * (attemptDrafts) so a trip to Kiến thức and back keeps it. Port of Studychill `ExerciseView.jsx`.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clock, Focus, Lock, RotateCcw, Send, X } from "lucide-react";

import { grammarApi } from "../../api/grammar.api";
import {
  getGrammarState,
  lessonOf,
  recordLessonAttempt,
  recordStageAttempt,
  scheduleResync,
} from "../../store/grammar-progress.store";
import type {
  AnswerResultDto,
  AttemptResultDto,
  FocusControl,
  QuestionResultDto,
  RevealDto,
  StageProgressDto,
  StageTestDto,
} from "../../types/grammar.types";
import type {
  ClozeAnswer,
  GrammarQuestion,
  GrammarTests,
  QuestionAnswer,
} from "../../types/exercise.types";
import type { GrammarKnowledge } from "../../types/knowledge.types";
import { cx } from "../../utils/cx";
import {
  answersApi,
  answerValue,
  countUnanswered,
  scoredQids,
  subsByPosition,
} from "../../utils/grammar-answers";
import { sticker } from "../../utils/grammar-assets";
import type { CurriculumStage } from "../../utils/grammar-curriculum";
import { attemptDrafts, errorMessage, quickCheckBlock } from "../../utils/grammar-session";
import { pad2, questionCount, reviewKind } from "../../utils/grammar-text";
import kit from "../shared/GrammarKit.module.css";
import styles from "./ExerciseView.module.css";
import { Question, type AnswerSetter, type QuestionContext } from "./Question";

/** Current time (only called in event handlers / effects). */
const nowMs = () => Date.now();

const fmt = (s: number) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;

/** Submission result as AttemptView consumes it (Sổ lỗi builds one without an attempt id). */
export type AttemptSubmitResult = Omit<AttemptResultDto, "attemptId"> & {
  attemptId: string | null;
};

export interface AttemptSession {
  answers: Record<string, QuestionAnswer>;
  checked: Record<string, QuestionAnswer>;
  results: Record<string, QuestionResultDto>;
  tried: Record<string, string[]>;
  revealed: Record<string, RevealDto>;
  attemptId: string | null;
  submitted: boolean;
  score: number;
  total: number;
  best: number | null;
  saved: boolean;
  start: number | null;
  finished: number | null;
  luot: number;
  hoanThanh: boolean;
}

const EMPTY_SESSION: AttemptSession = {
  answers: {},
  checked: {},
  results: {},
  tried: {},
  revealed: {},
  attemptId: null,
  submitted: false,
  score: 0,
  total: 0,
  best: null,
  saved: false,
  start: null,
  finished: null,
  luot: 0,
  hoanThanh: false,
};

const LETTER_TYPES = new Set(["mcq5", "pair990"]);

/** Mini test / stage test facts shown in the head and used for the pass mark. */
export interface AttemptMeta {
  questionCount: number;
  timeMinutes: number;
  passMark: number | null;
}

/** Stopwatch from the first answer to submission (self-pacing only, never auto-submits). */
function Stopwatch({
  start: startedAt,
  finished: endedAt,
  minutes,
}: {
  start: number | null;
  finished: number | null;
  minutes: number;
}) {
  const [now, setNow] = useState(() => nowMs());
  useEffect(() => {
    if (!startedAt || endedAt) return undefined;
    const t = setInterval(() => setNow(nowMs()), 1000);
    return () => clearInterval(t);
  }, [startedAt, endedAt]);
  if (!startedAt) {
    return (
      <span className={styles.clock}>
        <Clock size={14} /> {minutes}:00
      </span>
    );
  }
  const seconds = Math.max(0, Math.floor(((endedAt || now) - startedAt) / 1000));
  const overtime = seconds > minutes * 60;
  return (
    <span className={cx(styles.clock, overtime && styles.clockOver)} title="Thời gian đã làm">
      <Clock size={14} /> {fmt(seconds)} / {minutes}:00
    </span>
  );
}

function FocusButton({
  on,
  onToggle,
  hint: showHint,
}: {
  on: boolean;
  onToggle: () => void;
  hint: boolean;
}) {
  return (
    <span className={styles.focusWrap}>
      {showHint && !on && (
        <span className={styles.focusHint}>Gợi ý: bật để chỉ còn đề và đồng hồ</span>
      )}
      <button
        type="button"
        className={cx(styles.focusBtn, on && styles.focusOn, showHint && !on && styles.focusHinted)}
        onClick={onToggle}
        aria-pressed={on}
      >
        {on ? (
          <>
            <X size={14} /> Thoát tập trung
          </>
        ) : (
          <>
            <Focus size={14} /> Tập trung
          </>
        )}
      </button>
    </span>
  );
}

export interface AttemptViewProps {
  /** Session key ("04:mt", "04:qc-1", "stage-01", "mistake:<questionId>"). */
  blockKey: string;
  questions: GrammarQuestion[];
  home: Set<number> | null;
  head: (timer: ReactNode, focusButton: ReactNode) => ReactNode;
  meta?: AttemptMeta;
  submitLabel?: string;
  /** Part key of a question (stage test) to insert part headings. */
  group?: (q: GrammarQuestion) => string;
  groupTitle?: (group: string) => [string, string];
  lessonEnding?: ReactNode;
  startNumber?: number;
  submit: (answers: Record<string, unknown>) => Promise<AttemptSubmitResult>;
  afterSubmit?: (res: AttemptSubmitResult) => void;
  knowledge?: GrammarKnowledge | null;
  onReview?: (code: string, qid?: string) => void;
  focus?: FocusControl | null;
  /** Compact (Sổ lỗi): no score box, no "Làm lại". */
  compact?: boolean;
  onCorrect?: () => void;
  sendRetry?: (attemptId: string | null, qid: string, value: unknown) => Promise<AnswerResultDto>;
  sendReveal?: (attemptId: string | null, qid: string) => Promise<RevealDto>;
}

const defaultRetry = (attemptId: string | null, qid: string, value: unknown) =>
  grammarApi.retryAnswer(attemptId ?? "", qid, value);
const defaultReveal = (attemptId: string | null, qid: string) =>
  grammarApi.revealAnswer(attemptId ?? "", qid);

/**
 * One exercise block. `blockKey` = session key ("04:mt"); `submit(answers)` sends to the server; `group(q)` (optional)
 * returns the part key to insert part headings (stage test); `meta` = { questionCount, timeMinutes, passMark } for the
 * mini test / test. `sendRetry` / `sendReveal` default to the attempt retry / reveal (Sổ lỗi uses single questions).
 */
export function AttemptView({
  blockKey: sessionKey,
  questions,
  home,
  head,
  meta,
  submitLabel: submitLabel = "Nộp bài",
  group: groupOf,
  groupTitle,
  lessonEnding: ending,
  startNumber: startNumber = 1,
  submit: submitAnswers,
  afterSubmit,
  knowledge,
  onReview,
  focus,
  compact: compact = false,
  onCorrect: onAllCorrect,
  sendRetry: sendRetry = defaultRetry,
  sendReveal: sendReveal = defaultReveal,
}: AttemptViewProps) {
  const [st, setSt] = useState<AttemptSession>(
    () => (attemptDrafts.get(sessionKey) as AttemptSession | undefined) || EMPTY_SESSION,
  );
  const [blankWarning, setBlankWarning] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [showHint, setShowHint] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const stRef = useRef(st);
  const focusOn = !!focus && focus.blockKey === sessionKey;

  useEffect(() => {
    stRef.current = st;
    attemptDrafts.set(sessionKey, st);
  }, [st, sessionKey]);

  useEffect(() => {
    if (!showHint) return undefined;
    const t = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(t);
  }, [showHint]);

  const updateState = (fn: (prev: AttemptSession) => Partial<AttemptSession>) =>
    setSt((prev) => ({ ...prev, ...fn(prev) }));
  const isAllCorrect = (results: Record<string, QuestionResultDto>) =>
    questions.every((q) => scoredQids(q).every((id) => results[id]?.correct));

  const retry = async (
    q: GrammarQuestion,
    qid: string,
    value: unknown,
    updateChecked: (prev: QuestionAnswer) => QuestionAnswer,
  ) => {
    const { attemptId, submitted } = stRef.current;
    if (!submitted) return;
    setPending((d) => ({ ...d, [qid]: true }));
    setError("");
    try {
      const res = await sendRetry(attemptId, qid, value);
      updateState((prev) => {
        const triedOptions = { ...prev.tried };
        if (!res.correct && (LETTER_TYPES.has(q.kind) || q.kind === "cloze6")) {
          triedOptions[qid] = [...new Set([...(triedOptions[qid] || []), String(value)])];
        }
        return {
          checked: { ...prev.checked, [q.id]: updateChecked(prev.checked[q.id]) },
          results: {
            ...prev.results,
            [qid]: res.correct
              ? { correct: true, explanation: res.explanation }
              : { correct: false },
          },
          tried: triedOptions,
        };
      });
      if (res.correct) {
        scheduleResync();
        if (compact && isAllCorrect({ ...stRef.current.results, [qid]: { correct: true } }))
          onAllCorrect?.();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending((d) => ({ ...d, [qid]: false }));
    }
  };

  /** Regrades an item after submitting (pick kinds: on pick; typed kinds: Enter / "Kiểm tra"). */
  const regrade = (q: GrammarQuestion, prevAns: QuestionAnswer, nextAns: QuestionAnswer) => {
    if (q.kind === "cloze6") {
      const prevMap = (prevAns || {}) as ClozeAnswer;
      const nextMap = (nextAns || {}) as ClozeAnswer;
      const s = subsByPosition(q).find((x) => prevMap[x.position] !== nextMap[x.position]);
      const v = s ? nextMap[s.position] : null;
      if (!s || !v) return;
      retry(q, s.id, v, (k) => ({ ...((k || {}) as ClozeAnswer), [s.position]: v }));
      return;
    }
    const v = answerValue(q, nextAns);
    if (v === null) return;
    retry(q, q.id, v, () => nextAns);
  };

  const setAns = (id: string, v: Parameters<AnswerSetter>[0], immediate = true) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;
    if (!st.start) {
      updateState(() => ({ start: nowMs() }));
      if (meta && focus && !focusOn) setShowHint(true);
    }
    setBlankWarning(0);
    const prevAns = st.answers[id];
    const nextValue = typeof v === "function" ? v(prevAns) : v;
    updateState((prev) => ({ answers: { ...prev.answers, [id]: nextValue } }));
    if (st.submitted && immediate) regrade(q, prevAns, nextValue);
  };

  const checkQuestion = (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (q) regrade(q, st.checked[id], st.answers[id]);
  };

  const revealExplanation = async (qid: string): Promise<RevealDto | null> => {
    if (st.revealed[qid]) return st.revealed[qid];
    try {
      const res = await sendReveal(st.attemptId, qid);
      updateState((prev) => ({ revealed: { ...prev.revealed, [qid]: res } }));
      return res;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  };

  const blankCount = questions.reduce((n, q) => n + countUnanswered(q, st.answers[q.id]), 0);

  const submit = async () => {
    if (submitting) return;
    if (blankCount > 0 && !blankWarning) {
      setBlankWarning(blankCount);
      return;
    }
    setSubmitting(true);
    setError("");
    const answers = st.answers;
    const wasDone = !!lessonOf(getGrammarState(), sessionKey.split(":")[0])?.completed;
    try {
      const res = await submitAnswers(answersApi(questions, answers));
      const triedOptions: Record<string, string[]> = {};
      questions.forEach((q) => {
        if (q.kind === "cloze6") {
          subsByPosition(q).forEach((s) => {
            const v = ((answers[q.id] || {}) as ClozeAnswer)[s.position];
            if (v && !res.results[s.id]?.correct) triedOptions[s.id] = [v];
          });
        } else if (LETTER_TYPES.has(q.kind) && answers[q.id] && !res.results[q.id]?.correct) {
          triedOptions[q.id] = [answers[q.id] as string];
        }
      });
      updateState(() => ({
        submitted: true,
        checked: answers,
        results: res.results,
        tried: triedOptions,
        revealed: {},
        attemptId: res.attemptId,
        score: res.score,
        total: res.total,
        best: res.best,
        saved: !!res.saved,
        finished: nowMs(),
        hoanThanh: !wasDone && !!res.lesson?.completed,
      }));
      afterSubmit?.(res);
      if (compact && isAllCorrect(res.results)) onAllCorrect?.();
      requestAnimationFrame(() =>
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setSt({ ...EMPTY_SESSION, luot: st.luot + 1 });
    setBlankWarning(0);
    setError("");
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const total = st.total || questions.reduce((n, q) => n + questionCount(q), 0);
  const wrongAtSubmit = st.submitted ? total - st.score : 0;
  const correctNow = st.submitted ? Object.values(st.results).filter((k) => k.correct).length : 0;
  const fixedCount = Math.max(0, correctNow - st.score);
  const passMark = meta?.passMark ?? 0;
  const passed = meta && st.submitted ? st.score >= passMark : null;

  const ctx: QuestionContext = {
    submitted: st.submitted,
    results: st.results,
    tried: st.tried,
    revealed: st.revealed,
    waiting: pending,
    saved: st.saved,
    knowledge,
    onReview,
    onShowExplanation: revealExplanation,
  };

  let num = startNumber;
  let prevGroup: string | null = null;
  const items: ReactNode[] = [];
  questions.forEach((q) => {
    const g = groupOf ? groupOf(q) : null;
    if (groupOf && groupTitle && g !== null && g !== prevGroup) {
      prevGroup = g;
      const [titleText, description] = groupTitle(g);
      items.push(
        <div key={`h-${g}-${q.id}`} className={styles.partHead}>
          <b>{titleText}</b>
          <span>{description}</span>
        </div>,
      );
    }
    items.push(
      <Question
        key={`${q.id}-${st.luot}`}
        q={q}
        num={num}
        ans={st.answers[q.id]}
        checked={st.checked[q.id]}
        onAns={(v, immediate) => setAns(q.id, v, immediate)}
        onCheck={() => checkQuestion(q.id)}
        home={home}
        ctx={ctx}
      />,
    );
    num += questionCount(q);
  });

  const focusButton =
    meta && focus ? (
      <FocusButton
        on={focusOn}
        hint={showHint}
        onToggle={() => {
          setShowHint(false);
          focus.toggle(focusOn ? null : sessionKey);
        }}
      />
    ) : null;

  return (
    <section
      className={cx(styles.block, focusOn && styles.blockFocus, compact && styles.blockCompact)}
      ref={rootRef}
      data-block={sessionKey}
    >
      {head(
        meta ? (
          <Stopwatch start={st.start} finished={st.finished} minutes={meta.timeMinutes} />
        ) : null,
        focusButton,
      )}
      {st.submitted && !compact && (
        <div className={cx(styles.score, passed === false && styles.scoreFail)} role="status">
          <strong>
            Đúng {st.score}/{total}
            {wrongAtSubmit > 0 && (
              <span className={styles.scoreFixed}>
                {" "}
                · đã sửa {Math.min(fixedCount, wrongAtSubmit)}/{wrongAtSubmit}
              </span>
            )}
          </strong>
          {meta ? (
            <span>
              {passed
                ? `Đạt — ngưỡng ${passMark}/${meta.questionCount}`
                : `Chưa đạt — cần ${passMark}/${meta.questionCount}`}
            </span>
          ) : (
            st.score === total && <span>Chuẩn hết! Sang đơn vị tiếp theo thôi.</span>
          )}
          {wrongAtSubmit > 0 && fixedCount < wrongAtSubmit && (
            <span className={styles.scoreFix}>Câu tô đỏ: chọn lại / sửa ngay tại chỗ.</span>
          )}
          {st.best !== null && st.best > st.score && (
            <span className={styles.scoreBest}>
              Tốt nhất {st.best}/{total}
            </span>
          )}
          {st.hoanThanh && <span className={styles.scoreDone}>Hoàn thành chuyên đề!</span>}
          <button
            type="button"
            className={cx(kit.btn, kit.btnGhost, styles.scoreAgain)}
            onClick={restart}
          >
            <RotateCcw size={15} /> Làm lại
          </button>
        </div>
      )}
      <div className={styles.qs}>{items}</div>
      <div className={styles.blockFoot}>
        {st.submitted ? (
          !compact && (
            <button type="button" className={cx(kit.btn, kit.btnGhost)} onClick={restart}>
              <RotateCcw size={15} /> Làm lại
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              className={cx(kit.btn, kit.btnMoss)}
              onClick={submit}
              disabled={submitting}
            >
              <Send size={15} />{" "}
              {submitting
                ? "Đang chấm…"
                : blankWarning
                  ? `Vẫn ${submitLabel.toLowerCase()}`
                  : submitLabel}
            </button>
            {blankWarning > 0 && (
              <span className={kit.muted}>
                Còn {blankWarning} câu chưa làm — câu bỏ trống tính sai.
              </span>
            )}
          </>
        )}
        {error && (
          <span className={kit.error} role="alert">
            {error}
          </span>
        )}
      </div>
      {st.submitted && !compact && ending}
    </section>
  );
}

function LessonEnd({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.end}>
      <div>
        <div className={styles.endTitle}>{title}</div>
        <p>{children}</p>
      </div>
      <img src={sticker("celebrate")} alt="" loading="lazy" width="110" height="110" />
    </div>
  );
}

interface ExerciseViewProps {
  number: number;
  knowledge?: GrammarKnowledge | null;
  tests: GrammarTests;
  onReview: (code: string, qid?: string) => void;
  focus: FocusControl;
}

export function ExerciseView({
  number: topicNum,
  knowledge,
  tests,
  onReview,
  focus,
}: ExerciseViewProps) {
  const topicKey = pad2(topicNum);
  const home = new Set([topicNum]);
  const units = Object.fromEntries((knowledge?.units || []).map((u) => [u.code, u]));
  const miniTest = tests.miniTest;
  const quickCheckTotal = Object.values(tests.quickChecks).reduce((n, qs) => n + qs.length, 0);
  const afterSubmit = (block: string) => (res: AttemptSubmitResult) =>
    recordLessonAttempt(topicNum, block, res as AttemptResultDto);
  return (
    <div className={styles.exercises}>
      <h2 className={cx(kit.sectionTitle, styles.evTitle)}>
        <b>SECTION C</b>
        <span>Bài tập — Quick check &amp; Mini test</span>
      </h2>
      <p className={cx(kit.lead, styles.evLead)}>
        Quick check {quickCheckTotal} câu theo từng đơn vị — làm ngay sau khi học đơn vị đó. Mini
        test {miniTest.questionCount} câu tổng hợp cả chuyên đề, {miniTest.timeMinutes} phút, đạt từ{" "}
        {miniTest.passMark}/{miniTest.questionCount}.
      </p>

      {Object.entries(tests.quickChecks).map(([code, qs], k, all) => {
        const u = units[code];
        const block = quickCheckBlock(code);
        // Quick checks are numbered across units like the PDF (1–12); the mini test restarts at 1.
        const startNumber =
          1 +
          all.slice(0, k).reduce((n, [, x]) => n + x.reduce((m, q) => m + questionCount(q), 0), 0);
        return (
          <AttemptView
            key={code}
            blockKey={`${topicKey}:${block}`}
            startNumber={startNumber}
            questions={qs}
            home={home}
            submitLabel="Kiểm tra"
            submit={(answers) => grammarApi.submitTopic(topicKey, block, answers)}
            afterSubmit={afterSubmit(block)}
            knowledge={knowledge}
            onReview={onReview}
            head={() => (
              <div className={styles.quickHead} id={`bt-${code}`}>
                <b>Quick check · Đơn vị {u ? `${u.number} — ${u.title}` : code}</b>
                <span>{qs.length} câu</span>
              </div>
            )}
          />
        );
      })}

      <AttemptView
        blockKey={`${topicKey}:mt`}
        questions={miniTest.questions}
        home={home}
        meta={miniTest}
        submit={(answers) => grammarApi.submitTopic(topicKey, "mt", answers)}
        afterSubmit={afterSubmit("mt")}
        knowledge={knowledge}
        onReview={onReview}
        focus={focus}
        head={(timer, focusButton) => (
          <div className={styles.miniHead} id={`bt-mini-test-${topicKey}`}>
            <div className={styles.miniTitle}>MINI TEST {topicKey}</div>
            <div className={styles.miniMeta}>
              <span>{miniTest.questionCount} câu</span>
              <span>{miniTest.timeMinutes} phút</span>
              <span>
                Đạt ≥ {miniTest.passMark}/{miniTest.questionCount}
              </span>
              {timer}
              {focusButton}
            </div>
          </div>
        )}
        lessonEnding={
          <LessonEnd title={`Xong Mini test ${topicKey}!`}>
            Dò lại những câu sai, đọc phần “Bẫy” và “Nhớ quick”, rồi ôn lại từ vựng của chuyên đề
            trước khi sang bài mới.
          </LessonEnd>
        }
      />
    </div>
  );
}

type StagePart =
  | "p5"
  | "p6"
  | "wordform"
  | "error"
  | "transform"
  | "order"
  | "parse"
  | "match"
  | "judge"
  | "review";

const PARTS: Record<StagePart, [string, string]> = {
  p5: ["PART 5", "Incomplete Sentences — chọn từ hoặc cụm từ đúng nhất để hoàn thành câu."],
  p6: ["PART 6", "Text Completion — đọc đoạn văn, chọn đáp án đúng cho mỗi chỗ trống."],
  wordform: ["WORD FORM", "Viết dạng đúng của từ trong ngoặc vào chỗ trống."],
  error: [
    "ERROR",
    "Mỗi câu có 4 phần gạch chân (A)–(D), đúng một phần sai. Chọn phần sai và sửa lại.",
  ],
  transform: ["TRANSFORM", "Viết lại câu sao cho nghĩa không đổi, bắt đầu bằng phần gợi ý."],
  order: ["ORDER", "Sắp xếp các mảnh thành câu hoàn chỉnh đúng với nghĩa tiếng Việt cho sẵn."],
  parse: ["PARSE", "Gắn nhãn S / V / O / C / M / LT cho từng đoạn của câu."],
  match: ["MATCH", "Nối mỗi mục bên trái với một mục bên phải; có một mục thừa."],
  judge: ["JUDGE", "Câu đúng hay sai? Chọn lý do đúng; nếu sai, sửa lại."],
  review: ["ÔN TẬP", "Câu ôn kiến thức các chặng trước — làm như các câu khác."],
};

const partOf = (q: GrammarQuestion): StagePart => {
  if (q.kind === "mcq5" || q.kind === "pair990") return "p5";
  if (q.kind === "cloze6") return "p6";
  return q.kind;
};

function StageLock({
  status,
  isGuest,
}: {
  status: StageProgressDto | null | undefined;
  isGuest?: boolean;
}) {
  const requirement = status?.requirement || { completed: 0, required: 0, total: 0 };
  return (
    <div className={styles.lock}>
      <Lock size={18} />
      <div>
        <b>
          Test chặng mở khi bạn done {requirement.required}/{requirement.total} chuyên đề của chặng
        </b>
        <p>
          {isGuest
            ? "Đăng nhập để lưu tiến độ — xong mỗi chuyên đề là Kiến thức + Từ vựng đã xác nhận và Mini test đạt."
            : `Bạn đã xong ${requirement.completed}/${requirement.total}. Mỗi chuyên đề xong khi Kiến thức + Từ vựng đã xác nhận và Mini test đạt.`}
        </p>
        <span className={styles.lockBar}>
          <span
            style={{
              width: `${requirement.required ? Math.min(100, (100 * requirement.completed) / requirement.required) : 0}%`,
            }}
          />
        </span>
      </div>
    </div>
  );
}

/** Stage test content (the GET stages/{so}/test payload; status fields optional). */
export type StageTestContent = Pick<
  StageTestDto,
  "title" | "questionCount" | "timeMinutes" | "questions"
> & {
  kind?: string;
  passMark: number | null;
};

interface StageTestViewProps {
  stage: CurriculumStage;
  test: StageTestContent;
  status: StageProgressDto | null | undefined;
  isGuest?: boolean;
  onReview: (code: string, qid?: string) => void;
  focus: FocusControl;
}

/** Stage test: instructions (questions, minutes, pass mark, structure) → test by parts (like stage_test.py) → submit. */
export function StageTestView({
  stage,
  test,
  status,
  isGuest,
  onReview,
  focus,
}: StageTestViewProps) {
  const home = new Set(stage.topics.map((c) => c.number));
  const groupOf = (q: GrammarQuestion): StagePart =>
    reviewKind(q, home).kind === "review" ? "review" : partOf(q);
  const partCounts = new Map<StagePart, number>();
  test.questions.forEach((q) =>
    partCounts.set(groupOf(q), (partCounts.get(groupOf(q)) || 0) + questionCount(q)),
  );
  const passMark = test.passMark ?? 0;
  const pct = Math.round((100 * passMark) / test.questionCount);
  const unlocked = !!status?.unlocked;
  return (
    <div className={styles.exercises}>
      <div className={styles.intro}>
        <div className={styles.introStats}>
          <div>
            <b>{test.questionCount}</b>
            <small>câu hỏi</small>
          </div>
          <div>
            <b>{test.timeMinutes}</b>
            <small>phút</small>
          </div>
          <div>
            <b>{passMark}</b>
            <small>câu để đạt ({pct}%)</small>
          </div>
          <div>
            <b>{partCounts.size}</b>
            <small>phần</small>
          </div>
        </div>
        {status?.best !== null && status?.best !== undefined && (
          <p className={cx(styles.stageBest, status.passed && styles.stageBestDone)}>
            {status.passed ? "Đã đạt" : "Chưa đạt"} · tốt nhất {status.best}/
            {status.total || test.questionCount}
          </p>
        )}
        <span className={kit.lbl}>Hướng dẫn làm bài</span>
        <ul>
          <li>
            Làm liên tục trong <b>{test.timeMinutes} phút</b>, không xem tài liệu, không tra từ
            điển.
          </li>
          <li>Mỗi câu 1 điểm; mỗi chỗ trống của Part 6 tính 1 câu.</li>
          <li>
            Đạt khi đúng từ{" "}
            <b>
              {passMark}/{test.questionCount}
            </b>{" "}
            câu (tính lần nộp). Nộp bài done, câu sai tô đỏ — sửa ngay tại chỗ tới khi xanh.
          </li>
        </ul>
        <span className={kit.lbl}>Cấu trúc đề</span>
        <ul>
          {[...partCounts.entries()].map(([p, c]) => (
            <li key={p}>
              <b>{PARTS[p][0]}</b> — {c} câu. {PARTS[p][1]}
            </li>
          ))}
        </ul>
      </div>
      {!unlocked ? (
        <StageLock status={status} isGuest={isGuest} />
      ) : (
        <AttemptView
          blockKey={stage.id}
          questions={test.questions}
          home={home}
          meta={test}
          group={groupOf}
          groupTitle={(g) => PARTS[g as StagePart]}
          submit={(answers) => grammarApi.submitStage(stage.number, answers)}
          afterSubmit={(res) => recordStageAttempt(stage.number, res as AttemptResultDto)}
          onReview={onReview}
          focus={focus}
          head={(timer, focusButton) => (
            <div className={styles.miniHead}>
              <div className={styles.miniTitle}>{test.title.toUpperCase()}</div>
              <div className={styles.miniMeta}>
                <span>{test.questionCount} câu</span>
                <span>{test.timeMinutes} phút</span>
                <span>
                  Đạt ≥ {passMark}/{test.questionCount}
                </span>
                {timer}
                {focusButton}
              </div>
            </div>
          )}
          lessonEnding={
            <LessonEnd title={`Xong ${test.title}!`}>
              Câu nào sai thì bấm “Xem lại” ngay dưới câu để mở đúng phần kiến thức, rồi làm lại
              Quick check của đơn vị đó.
            </LessonEnd>
          }
        />
      )}
    </div>
  );
}
