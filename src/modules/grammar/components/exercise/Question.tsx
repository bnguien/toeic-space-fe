/**
 * One exercise question — laid out like the PDF (questions.py) but answered directly: pick A–D, type words, click the
 * underlined part, order pieces, label segments, match pairs, true/false; Part 6 passages with numbered gaps.
 *
 * Graded on the server (ExerciseView calls the API). After submitting: correct parts turn green (locked), wrong ones
 * red and can be fixed in place. A–D are regraded as soon as picked; typed / order / parse / match / judge regrade on
 * Enter or “Kiểm tra”. Colours only show while the answer equals the graded copy (`checked`); the server only says
 * right/wrong for the whole question, so multi-slot kinds (parse, match, part + fix) do not colour single slots while
 * still wrong. Port of Studychill `Question.jsx`.
 */
import { useState, type ReactNode } from "react";
import { Check, HelpCircle, RotateCcw, X } from "lucide-react";

import type { QuestionResultDto, RevealDto } from "../../types/grammar.types";
import type {
  ClozeAnswer,
  ErrorAnswer,
  GrammarQuestion,
  GrammarSubQuestion,
  JudgeAnswer,
  QuestionAnswer,
} from "../../types/exercise.types";
import type { GrammarKnowledge } from "../../types/knowledge.types";
import { cx } from "../../utils/cx";
import { normalizeTyped, orderSentence, subsByPosition } from "../../utils/grammar-answers";
import { codeTitle } from "../../utils/grammar-data";
import {
  BLANK,
  curlyQuotes,
  findPhrase,
  LETTERS,
  optionColumns,
  pad2,
  reviewKind,
} from "../../utils/grammar-text";
import kit from "../shared/GrammarKit.module.css";
import styles from "./Question.module.css";

const PARSE_LABELS = ["S", "V", "O", "C", "M", "LT"];

/** Shared state handed down by AttemptView. */
export interface QuestionContext {
  submitted: boolean;
  results: Record<string, QuestionResultDto>;
  tried: Record<string, string[]>;
  revealed: Record<string, RevealDto>;
  waiting: Record<string, boolean>;
  saved: boolean;
  knowledge?: GrammarKnowledge | null;
  onReview?: (code: string, qid?: string) => void;
  onShowExplanation: (qid: string) => Promise<RevealDto | null>;
}

/** `immediate = false` keeps typed / multi-slot answers from being regraded until Enter / "Kiểm tra". */
export type AnswerSetter = (
  value: QuestionAnswer | ((prev: QuestionAnswer) => QuestionAnswer),
  immediate?: boolean,
) => void;

type Status = "correct" | "wrong" | "";

/** Colour state of a part. */
const statusOf = (graded: boolean, correct: boolean | null): Status =>
  graded ? (correct ? "correct" : "wrong") : "";
const isSame = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const hasText = (v: unknown) => !!String(v ?? "").trim();
const stateClass = (st: Status) =>
  st === "correct" ? styles.isCorrect : st === "wrong" ? styles.isWrong : "";

/** Question stem with `-------`: keeps the gap like the ETS test; `filled` = the picked option shown inside the gap. */
function Stem({
  text,
  filled: filledText,
  st = "",
}: {
  text: string;
  filled?: string;
  st?: Status;
}) {
  const parts = String(text).split(BLANK);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span
              className={cx(
                styles.dash,
                filledText && styles.isFilled,
                filledText && stateClass(st),
              )}
            >
              {filledText || BLANK}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

function ReviewTag({ q, home }: { q: GrammarQuestion; home: Set<number> | null }) {
  const { kind, olderTopics } = reviewKind(q, home);
  if (kind === "review") return <span className={cx(styles.tag, styles.tagReview)}>câu ôn</span>;
  if (kind === "spiral") {
    return (
      <span className={cx(styles.tag, styles.tagSpiral)}>
        ↺ kết hợp {olderTopics.map((c) => `CĐ${pad2(c)}`).join(", ")}
      </span>
    );
  }
  return null;
}

interface OptionsProps {
  options: string[];
  selected: string | undefined;
  onSelect: (letter: string | undefined) => void;
  status: Status;
  tried?: string[];
  submitted: boolean;
  pending: boolean;
  name: string;
}

/**
 * Options A–D. After submitting: the picked option right → green (whole group locked); wrong → red, pick again at
 * once. Wrong options already tried stay faded red so they are not picked again by mistake.
 */
function Options({
  options,
  selected,
  onSelect,
  status,
  tried: triedOptions = [],
  submitted,
  pending,
  name,
}: OptionsProps) {
  const columns = optionColumns(options);
  const locked = submitted && status === "correct";
  return (
    <div
      className={cx(styles.opts, columns === 4 ? styles.c4 : columns === 2 ? styles.c2 : styles.c1)}
      role="radiogroup"
      aria-label={name}
      aria-busy={pending || undefined}
    >
      {options.map((o, i) => {
        const L = LETTERS[i];
        const on = selected === L;
        const triedWrong = submitted && !on && triedOptions.includes(L);
        const st: Status = on ? status : triedWrong ? "wrong" : "";
        return (
          <button
            key={L}
            type="button"
            role="radio"
            aria-checked={on}
            className={cx(
              styles.opt,
              on && styles.isOn,
              stateClass(st),
              triedWrong && styles.isOld,
            )}
            disabled={locked || triedWrong || pending}
            onClick={() => {
              if (!submitted) {
                onSelect(on ? undefined : L);
                return;
              }
              if (!on) onSelect(L);
            }}
          >
            <b>({L})</b>
            <span lang="en">{o}</span>
            {st === "correct" && <Check size={15} className={styles.optIc} />}
            {on && st === "wrong" && <X size={15} className={styles.optIc} />}
          </button>
        );
      })}
    </div>
  );
}

function CheckButton({ onCheck, pending }: { onCheck: () => void; pending: boolean }) {
  return (
    <button type="button" className={styles.check} onClick={onCheck} disabled={pending}>
      {pending ? "Đang chấm…" : "Kiểm tra"}
    </button>
  );
}

interface TextInputProps {
  value: string | undefined;
  onChange: (v: string) => void;
  blockKey: boolean;
  st?: Status;
  placeholder?: string;
  label?: string;
  wide?: boolean;
  onCheck?: () => void;
  pendingCheck?: boolean;
  pending?: boolean;
}

/** Text box; after submitting: Enter / “Kiểm tra” regrades what is typed. */
function TextInput({
  value,
  onChange,
  blockKey: locked,
  st = "",
  placeholder,
  label,
  wide,
  onCheck,
  pendingCheck: canCheck,
  pending: pending = false,
}: TextInputProps) {
  return (
    <div className={cx(styles.lnRow, wide && styles.isWide)}>
      <label className={styles.lnLb}>
        {label && <span>{label}</span>}
        <input
          type="text"
          lang="en"
          className={cx(styles.ln, stateClass(st))}
          value={value || ""}
          disabled={locked}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onCheck && canCheck && !pending) {
              e.preventDefault();
              onCheck();
            }
          }}
        />
      </label>
      {st === "correct" && <Check size={16} className={cx(styles.lnIc, styles.isCorrect)} />}
      {st === "wrong" && <X size={16} className={cx(styles.lnIc, styles.isWrong)} />}
      {canCheck && onCheck && <CheckButton onCheck={onCheck} pending={pending} />}
    </div>
  );
}

// ---- Question kinds (stem + answer area) ----

interface KindProps {
  q: GrammarQuestion;
  ans: QuestionAnswer;
  checked: QuestionAnswer;
  onAns: AnswerSetter;
  onCheck: () => void;
  submitted: boolean;
  /** Result of the graded copy (null before submitting). */
  correct: boolean | null;
  pending: boolean;
  tried?: string[];
}

function Mcq({
  q,
  ans,
  checked: checkedAns,
  onAns,
  submitted,
  correct,
  pending,
  tried: triedOptions,
}: KindProps) {
  const options = q.options || [];
  const letter = ans as string | undefined;
  const selectedText = letter ? options[LETTERS.indexOf(letter)] : "";
  const graded = submitted && !pending && letter === checkedAns;
  return (
    <>
      <div className={styles.stem} lang="en">
        <Stem text={q.prompt} filled={selectedText} st={statusOf(graded, correct)} />
      </div>
      <Options
        options={options}
        selected={letter}
        onSelect={(v) => onAns(v)}
        status={statusOf(graded, correct)}
        tried={triedOptions}
        submitted={submitted}
        pending={pending}
        name="Chọn đáp án"
      />
    </>
  );
}

/** Single typed box (wordform, transform): coloured by the graded copy while unchanged since grading. */
function SingleInput({
  ans,
  checked: checkedAns,
  onAns,
  onCheck,
  submitted,
  correct,
  pending,
  label,
  placeholder,
  wide,
}: KindProps & { label: string; placeholder: string; wide?: boolean }) {
  const sameAsChecked = normalizeTyped(ans) === normalizeTyped(checkedAns);
  return (
    <TextInput
      label={label}
      value={ans as string | undefined}
      onChange={(v) => onAns(v, false)}
      blockKey={(submitted && !!correct) || pending}
      st={submitted && sameAsChecked && !pending ? statusOf(true, correct) : ""}
      placeholder={placeholder}
      wide={wide}
      onCheck={onCheck}
      pending={pending}
      pendingCheck={submitted && !correct && !sameAsChecked && hasText(ans)}
    />
  );
}

function Wordform(p: KindProps) {
  return (
    <>
      <div className={styles.stem} lang="en">
        <Stem text={p.q.prompt} />
        <span className={styles.root}>{p.q.baseWord}</span>
      </div>
      <SingleInput {...p} label="Viết dạng đúng:" placeholder="gõ từ…" />
    </>
  );
}

function Transform(p: KindProps) {
  return (
    <>
      <div className={styles.stem} lang="en">
        <Stem text={p.q.prompt} />
      </div>
      <SingleInput {...p} label={`→ ${p.q.hint}`} placeholder="viết tiếp (hoặc cả câu)…" wide />
    </>
  );
}

/** Underlines the 4 phrases (A)–(D) in order, whole-word match — click to pick the wrong part, then type the fix. */
function ErrorQ({ q, ans, checked, onAns, onCheck, submitted, correct, pending }: KindProps) {
  const a = (ans || {}) as ErrorAnswer;
  const checkedAns = checked as ErrorAnswer | undefined;
  const stem = q.prompt;
  const out: ReactNode[] = [];
  let pos = 0;
  let notFound = false;
  const locked = submitted && !!correct;
  const sameAsChecked =
    a.label === checkedAns?.label &&
    normalizeTyped(a.correction) === normalizeTyped(checkedAns?.correction);
  const graded = submitted && sameAsChecked && !pending;
  (q.underlines || []).forEach((g) => {
    if (notFound) return;
    const i = findPhrase(stem, g.text, pos);
    if (i < 0) {
      notFound = true;
      return;
    }
    out.push(<span key={`t${g.label}`}>{stem.slice(pos, i)}</span>);
    const on = a.label === g.label;
    out.push(
      <button
        key={g.label}
        type="button"
        className={cx(styles.ul, on && styles.isOn, on && graded && correct && styles.isCorrect)}
        disabled={locked || pending}
        aria-pressed={on}
        onClick={() =>
          onAns(
            (prev) => ({
              ...((prev || {}) as ErrorAnswer),
              label: on && !submitted ? undefined : g.label,
            }),
            false,
          )
        }
      >
        {g.text}
        <i>({g.label})</i>
      </button>,
    );
    pos = i + g.text.length;
  });
  out.push(<span key="end">{stem.slice(pos)}</span>);
  return (
    <>
      <div className={cx(styles.stem, styles.err)} lang="en">
        {notFound ? stem : out}
      </div>
      <div className={styles.errAns}>
        <span>
          Phần sai:{" "}
          <b className={cx(styles.lbox, graded && correct && styles.isCorrect)}>{a.label || ""}</b>
        </span>
        <TextInput
          label="Sửa thành:"
          value={a.correction}
          onChange={(v) =>
            onAns((prev) => ({ ...((prev || {}) as ErrorAnswer), correction: v }), false)
          }
          blockKey={locked || pending}
          st={graded && hasText(a.correction) ? statusOf(true, correct) : ""}
          placeholder="gõ phần sửa…"
          onCheck={onCheck}
          pending={pending}
          pendingCheck={
            submitted && !correct && !sameAsChecked && !!a.label && hasText(a.correction)
          }
        />
      </div>
      {graded && !correct && a.label && (
        <p className={styles.hint}>Xem lại cả phần gạch chân bạn chọn lẫn chữ sửa.</p>
      )}
    </>
  );
}

function Order({ q, ans, checked, onAns, onCheck, submitted, correct, pending }: KindProps) {
  const pieces = q.pieces || [];
  const picked = (ans as number[] | undefined) || [];
  const remaining = pieces.map((_, i) => i).filter((i) => !picked.includes(i));
  const locked = (submitted && !!correct) || pending;
  const sameAsChecked =
    orderSentence(q, picked) === orderSentence(q, (checked as number[] | undefined) || []);
  const st: Status =
    submitted && sameAsChecked && picked.length && !pending ? statusOf(true, correct) : "";
  return (
    <>
      <div className={styles.stem}>
        <i>{q.prompt}</i> <span className={styles.tag}>sắp xếp</span>
      </div>
      <div className={styles.chips} aria-label="Mảnh ghép">
        {remaining.map((i) => (
          <button
            key={i}
            type="button"
            className={cx(styles.chip, styles.chipBtn)}
            lang="en"
            disabled={locked}
            onClick={() => onAns((prev) => [...((prev as number[] | undefined) || []), i], false)}
          >
            {pieces[i]}
          </button>
        ))}
        {!remaining.length && !locked && (
          <small className={kit.muted}>Đã dùng hết mảnh — bấm mảnh bên dưới để gỡ.</small>
        )}
      </div>
      <div className={cx(styles.orderLine, stateClass(st))} aria-label="Câu của bạn">
        {picked.length ? (
          picked.map((i, k) => (
            <button
              key={i}
              type="button"
              className={cx(styles.chip, styles.chipOn)}
              lang="en"
              disabled={locked}
              onClick={() =>
                onAns(
                  (prev) => ((prev as number[] | undefined) || []).filter((_, j) => j !== k),
                  false,
                )
              }
            >
              {pieces[i]}
            </button>
          ))
        ) : (
          <span className={kit.muted}>Bấm các mảnh theo đúng thứ tự…</span>
        )}
        {st === "correct" && <Check size={16} className={cx(styles.lnIc, styles.isCorrect)} />}
        {st === "wrong" && <X size={16} className={cx(styles.lnIc, styles.isWrong)} />}
      </div>
      {submitted && !correct && !sameAsChecked && picked.length > 0 && (
        <CheckButton onCheck={onCheck} pending={pending} />
      )}
    </>
  );
}

/** Parse / match: graded as a whole — right = all green; wrong = only the number turns red, change slots then “Kiểm tra”. */
function multiSlotState({
  ans,
  checked: checkedAns,
  submitted,
  correct,
  pending,
  complete: allFilled,
}: Pick<KindProps, "ans" | "checked" | "submitted" | "correct" | "pending"> & {
  complete: boolean;
}) {
  const sameAsChecked = isSame(ans, checkedAns);
  return {
    stO: (v: string | undefined) =>
      submitted && sameAsChecked && !pending && correct && v ? styles.isCorrect : "",
    blockKey: (submitted && !!correct) || pending,
    pendingCheck: submitted && !correct && !sameAsChecked && allFilled,
    hint: submitted && sameAsChecked && !correct && !pending,
  };
}

function Parse({
  q,
  ans,
  checked,
  onAns,
  onCheck,
  submitted,
  correct: isCorrect,
  pending,
}: KindProps) {
  const segments = q.segments || [];
  const labels = (ans as string[] | undefined) || [];
  const o = multiSlotState({
    ans,
    checked,
    submitted,
    correct: isCorrect,
    pending,
    complete: segments.every((_, i) => labels[i]),
  });
  return (
    <>
      <div className={styles.stem}>
        Gắn nhãn pending từng đoạn: <b lang="en">{q.prompt}</b>
      </div>
      <div className={styles.parse}>
        {segments.map((p, i) => (
          <div key={i}>
            <span className={styles.seg} lang="en">
              {p}
            </span>
            <select
              className={cx(styles.sel, o.stO(labels[i]))}
              value={labels[i] || ""}
              disabled={o.blockKey}
              aria-label={`Nhãn cho “${p}”`}
              onChange={(e) => {
                const v = e.target.value;
                onAns(
                  (prev) => Object.assign([...((prev as string[] | undefined) || [])], { [i]: v }),
                  false,
                );
              }}
            >
              <option value="">—</option>
              {PARSE_LABELS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <b>S</b> chủ ngữ · <b>V</b> động từ · <b>O</b> tân ngữ · <b>C</b> bổ ngữ · <b>M</b> bổ nghĩa
        · <b>LT</b> liên từ / từ nối
      </div>
      {o.hint && <p className={styles.hint}>Còn nhãn chưa đúng — đổi vài ô rồi bấm Kiểm tra.</p>}
      {o.pendingCheck && <CheckButton onCheck={onCheck} pending={pending} />}
    </>
  );
}

function Match({
  q,
  ans,
  checked,
  onAns,
  onCheck,
  submitted,
  correct: isCorrect,
  pending,
}: KindProps) {
  const left = q.left || [];
  const right = q.right || [];
  const picked = (ans as string[] | undefined) || [];
  const rightKeys = right.map((_, i) => String.fromCharCode(65 + i));
  const o = multiSlotState({
    ans,
    checked,
    submitted,
    correct: isCorrect,
    pending,
    complete: left.every((_, i) => picked[i]),
  });
  return (
    <>
      <div className={styles.stem}>{q.prompt}</div>
      <div className={styles.match}>
        <ol>
          {left.map((x, i) => (
            <li key={i}>
              <b>{i + 1}</b>
              <span lang="en">{x}</span>
              <select
                className={cx(styles.sel, o.stO(picked[i]))}
                value={picked[i] || ""}
                disabled={o.blockKey}
                aria-label={`Nối mục ${i + 1}`}
                onChange={(e) => {
                  const v = e.target.value;
                  onAns(
                    (prev) =>
                      Object.assign([...((prev as string[] | undefined) || [])], { [i]: v }),
                    false,
                  );
                }}
              >
                <option value="">→ ?</option>
                {rightKeys.map((L) => (
                  <option key={L} value={L}>
                    → {L}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ol>
        <ol>
          {right.map((x, i) => (
            <li key={i}>
              <b>{rightKeys[i]}</b>
              <span lang="en">{x}</span>
            </li>
          ))}
        </ol>
      </div>
      {o.hint && <p className={styles.hint}>Còn cặp chưa đúng — đổi vài ô rồi bấm Kiểm tra.</p>}
      {o.pendingCheck && <CheckButton onCheck={onCheck} pending={pending} />}
    </>
  );
}

function Judge({ q, ans, checked, onAns, onCheck, submitted, correct, pending }: KindProps) {
  const a = (ans || {}) as JudgeAnswer;
  const checkedAns = checked as JudgeAnswer | undefined;
  const sameAsChecked = a.verdict === checkedAns?.verdict && a.reason === checkedAns?.reason;
  const graded = submitted && sameAsChecked && !pending;
  const locked = (submitted && !!correct) || pending;
  const pickButton = (key: "verdict" | "reason") => (val: string, text: ReactNode) => {
    const on = a[key] === val;
    const st: Status = on && graded ? statusOf(true, correct) : "";
    return (
      <button
        key={val}
        type="button"
        className={cx(styles.pick, on && styles.isOn, stateClass(st))}
        disabled={locked}
        aria-pressed={on}
        onClick={() =>
          onAns(
            (prev) => ({
              ...((prev || {}) as JudgeAnswer),
              [key]: on && !submitted ? undefined : val,
            }),
            false,
          )
        }
      >
        <span className={styles.box}>
          {on && (st === "wrong" ? <X size={11} /> : <Check size={11} />)}
        </span>
        {text}
      </button>
    );
  };
  const verdictButton = pickButton("verdict");
  const reasonButton = pickButton("reason");
  return (
    <>
      <div className={styles.stem}>
        <b lang="en">{q.prompt}</b> <span className={styles.tag}>đúng hay sai?</span>
      </div>
      <div className={styles.judge}>
        {verdictButton("correct", "Đúng")}
        {verdictButton("incorrect", "Sai")}
      </div>
      <div className={styles.reasons}>
        <span className={kit.muted}>Chọn lý do:</span>
        {(q.reasons || []).map((r, i) =>
          reasonButton(
            LETTERS[i],
            <>
              <b>({LETTERS[i]})</b> {r}
            </>,
          ),
        )}
      </div>
      <TextInput
        label="Nếu sai, sửa:"
        value={a.correction}
        onChange={(v) =>
          onAns((prev) => ({ ...((prev || {}) as JudgeAnswer), correction: v }), false)
        }
        blockKey={locked}
        placeholder="(không bắt buộc)"
      />
      {submitted && !correct && !sameAsChecked && a.verdict && a.reason && (
        <CheckButton onCheck={onCheck} pending={pending} />
      )}
    </>
  );
}

// ---- Explanations ----

type RevealedQuestion = Omit<GrammarQuestion, "kind"> & {
  kind: GrammarQuestion["kind"] | "cloze-sub";
} & Partial<RevealDto>;

/** Answer line (only after the learner chose “Xem đáp án”); `q` already merges the server reveal. */
function AnswerLine({ q }: { q: RevealedQuestion }) {
  const d = q.kind;
  const u = (x: ReactNode) => <u>{x}</u>;
  const answer = q.answer as string | string[] | undefined;
  if (d === "mcq5" || d === "pair990" || d === "cloze-sub") {
    return (
      <>
        ({String(answer)}) {u((q.options || [])[LETTERS.indexOf(String(answer))])}
      </>
    );
  }
  if (d === "wordform") return u(String(answer ?? ""));
  if (d === "error") {
    const g = (q.underlines || []).find((x) => x.label === answer);
    return (
      <>
        ({String(answer)}) {g?.text} → {u(q.correction || "(bỏ phần này)")}
      </>
    );
  }
  if (d === "transform" || d === "order") return u(String(answer ?? ""));
  if (d === "parse") {
    return (
      <>
        {((answer as string[] | undefined) || []).map((p, i) => (
          <span key={i} className={styles.parseAns}>
            {(q.segments || [])[i]} <u>{p}</u>
          </span>
        ))}
      </>
    );
  }
  if (d === "match") {
    return (
      <>
        {((answer as string[] | undefined) || []).map((x, i) => (
          <span key={x}>
            {i > 0 && " · "}
            {u(x)}
          </span>
        ))}
      </>
    );
  }
  if (d === "judge") {
    return (
      <>
        {u(answer === "correct" ? "Đúng" : "Sai")} · lý do ({q.correctReason})
        {answer === "incorrect" && q.correction && <> · sửa: {u(q.correction)}</>}
      </>
    );
  }
  return <>{String(answer ?? "")}</>;
}

interface BriefExplanationProps {
  q: RevealedQuestion;
  qid: string;
  correct: boolean;
  ctx: QuestionContext;
  extra?: ReactNode;
}

/**
 * After submitting: a correct question shows its 1–2 line “dấu hiệu · quy tắc” at once (sent with the result); a
 * wrong one gets a small “Vì sao?” pill that opens the server explanation (reveal) + “Xem đáp án”.
 */
function BriefExplanation({ q, qid, correct, ctx, extra }: BriefExplanationProps) {
  const [open, setOpen] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [opening, setOpening] = useState(false);
  const reveal = ctx.revealed[qid];
  const lg = (correct ? ctx.results[qid]?.explanation : reveal?.explanation) as
    { signal?: string; rule?: string } | undefined;
  const showDetails = correct || (open && reveal);
  const toggleExplanation = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!reveal) {
      setOpening(true);
      await ctx.onShowExplanation(qid);
      setOpening(false);
    }
  };
  return (
    <div className={cx(styles.why, correct && styles.isCorrect)}>
      {!correct && (
        <div className={styles.whyRow}>
          <button
            type="button"
            className={kit.whyBtn}
            onClick={toggleExplanation}
            aria-expanded={open}
          >
            <HelpCircle size={14} /> {opening ? "Đang mở…" : open ? "Ẩn gợi ý" : "Vì sao?"}
          </button>
          {extra}
        </div>
      )}
      {showDetails && (
        <div className={styles.whyB}>
          {lg?.signal && (
            <p>
              <b>Dấu hiệu:</b> {curlyQuotes(lg.signal)}
            </p>
          )}
          {lg?.rule && (
            <p>
              <b>Quy tắc:</b> {curlyQuotes(lg.rule)}
            </p>
          )}
          {!correct &&
            reveal &&
            (answerShown ? (
              <p className={styles.whyDone}>
                <b>Đáp án:</b> <AnswerLine q={{ ...q, ...reveal }} />
              </p>
            ) : (
              <button
                type="button"
                className={cx(kit.whyBtn, kit.whyBtnSmall)}
                onClick={() => setAnswerShown(true)}
              >
                Xem đáp án
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/** Pill under a wrong question: opens the knowledge of its main unit (maDonVi[0]). */
function ReviewLink({
  code,
  qid,
  ctx,
}: {
  code: string | undefined;
  qid: string;
  ctx: QuestionContext;
}) {
  if (!code || !ctx.onReview) return null;
  const titleText = codeTitle(code, ctx.knowledge);
  return (
    <button type="button" className={kit.reviewLink} onClick={() => ctx.onReview?.(code, qid)}>
      <RotateCcw size={12} /> Xem lại {code}
      {titleText ? ` · ${titleText}` : ""}
    </button>
  );
}

// ---- Part 6 ----

const META = /^(To|From|Subject|Date|Re|Cc|Attn|Sent)\s*:/;

interface PassageProps {
  q: GrammarQuestion;
  num: number;
  ans: ClozeAnswer;
  checked: ClozeAnswer | undefined;
  ctx: QuestionContext;
}

function Passage({ q, num, ans, checked: checkedAns, ctx }: PassageProps) {
  const subs: Record<number, GrammarSubQuestion> = Object.fromEntries(
    (q.subQuestions || []).map((s) => [s.position, s]),
  );
  const raw = (q.passage || "")
    .trim()
    .split("\n")
    .map((x) => x.trim());
  const paras: ReactNode[] = [];
  let meta: string[] = [];
  const gap = (ln: string) =>
    ln.split(/\{\{(\d)\}\}/).map((part, i) => {
      if (i % 2 === 0) return part;
      const k = Number(part);
      const s = subs[k];
      const picked = ans?.[k];
      const selectedText =
        s && s.kind !== "sentence" && picked ? s.options[LETTERS.indexOf(picked)] : "";
      const graded =
        ctx.submitted && !!s && !!picked && picked === checkedAns?.[k] && !ctx.waiting[s.id];
      const st = graded ? statusOf(true, !!ctx.results[s.id]?.correct) : "";
      return (
        <span
          key={i}
          className={cx(
            styles.gap,
            s?.kind === "sentence" && styles.gapWide,
            selectedText && styles.isFilled,
            stateClass(st),
          )}
        >
          <b>{num + k - 1}</b>
          {selectedText && <span>{selectedText}</span>}
        </span>
      );
    });
  raw.forEach((ln, idx) => {
    if (!ln) return;
    if (META.test(ln)) {
      meta.push(ln);
      return;
    }
    if (meta.length) {
      paras.push(
        <p key={`m${idx}`} className={styles.meta}>
          {meta.map((m, j) => (
            <span key={j}>
              {gap(m)}
              <br />
            </span>
          ))}
        </p>,
      );
      meta = [];
    }
    const title =
      idx === 0 &&
      ln.length < 80 &&
      !/[.,:?!]$/.test(ln) &&
      !ln.includes("{{") &&
      !ln.startsWith("Dear");
    const short =
      (ln.length < 40 && !ln.includes("{{") && !/[.?!]$/.test(ln)) ||
      (ln.endsWith(",") && ln.length < 30);
    paras.push(
      <p key={idx} className={title ? styles.titleText : short && idx > 0 ? styles.sig : undefined}>
        {gap(ln)}
      </p>,
    );
  });
  if (meta.length) {
    paras.push(
      <p key="m-end" className={styles.meta}>
        {meta.map((m, j) => (
          <span key={j}>
            {gap(m)}
            <br />
          </span>
        ))}
      </p>,
    );
  }
  return (
    <div className={styles.passage} lang="en">
      {paras}
    </div>
  );
}

interface ClozeProps {
  q: GrammarQuestion;
  num: number;
  ans: QuestionAnswer;
  checked: QuestionAnswer;
  onAns: AnswerSetter;
  home: Set<number> | null;
  ctx: QuestionContext;
}

function Cloze({ q, num, ans, checked, onAns, home, ctx }: ClozeProps) {
  const a = (ans || {}) as ClozeAnswer;
  const checkedAns = checked as ClozeAnswer | undefined;
  const head = q.prompt.replace(/Questions \d+\s*[-–]\s*\d+/, `Questions ${num}-${num + 3}`);
  const subs = subsByPosition(q);
  return (
    <div className={styles.cloze}>
      <div className={styles.clozeH}>
        <ReviewTag q={q} home={home} /> {head}
      </div>
      <Passage q={q} num={num} ans={a} checked={checkedAns} ctx={ctx} />
      <div className={styles.subs}>
        {subs.map((s) => {
          const k = num + s.position - 1;
          const pending = !!ctx.waiting[s.id];
          const graded =
            ctx.submitted &&
            !!a[s.position] &&
            a[s.position] === checkedAns?.[s.position] &&
            !pending;
          const correct = !!ctx.results[s.id]?.correct;
          const wrong = ctx.submitted && !correct;
          return (
            <div
              key={s.id}
              className={cx(styles.q, ctx.submitted && stateClass(statusOf(true, correct)))}
              id={`q-${s.id}`}
              data-q=""
              data-code={s.id}
            >
              <span className={styles.n}>{k}</span>
              <div className={styles.qBody}>
                {s.kind === "sentence" && <span className={styles.tag}>chèn câu</span>}
                <Options
                  options={s.options}
                  selected={a[s.position]}
                  onSelect={(v) =>
                    onAns((prev) => ({ ...((prev || {}) as ClozeAnswer), [s.position]: v }))
                  }
                  status={graded ? statusOf(true, correct) : ""}
                  tried={ctx.tried[s.id]}
                  submitted={ctx.submitted}
                  pending={pending}
                  name={`Câu ${k}`}
                />
                {ctx.submitted && (
                  <BriefExplanation
                    q={{ ...q, ...s, kind: "cloze-sub" }}
                    qid={s.id}
                    correct={correct}
                    ctx={ctx}
                    extra={
                      wrong && (
                        <ReviewLink
                          code={(s.unitCodes || q.unitCodes || [])[0]}
                          qid={s.id}
                          ctx={ctx}
                        />
                      )
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KINDS: Partial<Record<GrammarQuestion["kind"], (p: KindProps) => ReactNode>> = {
  mcq5: Mcq,
  pair990: Mcq,
  wordform: Wordform,
  error: ErrorQ,
  transform: Transform,
  order: Order,
  parse: Parse,
  match: Match,
  judge: Judge,
};

export interface QuestionProps {
  q: GrammarQuestion;
  num: number;
  ans: QuestionAnswer;
  checked: QuestionAnswer;
  onAns: AnswerSetter;
  onCheck: () => void;
  home: Set<number> | null;
  ctx: QuestionContext;
}

export function Question({
  q,
  num,
  ans,
  checked: checkedAns,
  onAns,
  onCheck,
  home,
  ctx,
}: QuestionProps) {
  if (q.kind === "cloze6") {
    return (
      <Cloze q={q} num={num} ans={ans} checked={checkedAns} onAns={onAns} home={home} ctx={ctx} />
    );
  }
  const Kind = KINDS[q.kind];
  if (!Kind) return null;
  const correct = ctx.submitted ? !!ctx.results[q.id]?.correct : null;
  const pending = !!ctx.waiting[q.id];
  const attempted =
    q.kind === "order" ? orderSentence(q, (ans as number[] | undefined) || []) : ans;
  return (
    <div
      className={cx(styles.q, ctx.submitted && stateClass(statusOf(true, correct)))}
      id={`q-${q.id}`}
      data-q=""
      data-code={q.id}
      data-answered={attempted ? "1" : undefined}
    >
      <span className={styles.n}>{num}</span>
      <div className={styles.qBody}>
        <ReviewTag q={q} home={home} />
        <Kind
          q={q}
          ans={ans}
          checked={checkedAns}
          onAns={onAns}
          onCheck={onCheck}
          submitted={ctx.submitted}
          correct={correct}
          pending={pending}
          tried={ctx.tried[q.id]}
        />
        {ctx.submitted && (
          <BriefExplanation
            q={q}
            qid={q.id}
            correct={!!correct}
            ctx={ctx}
            extra={!correct && <ReviewLink code={(q.unitCodes || [])[0]} qid={q.id} ctx={ctx} />}
          />
        )}
      </div>
    </div>
  );
}
