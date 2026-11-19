// "Viết lại" mode of the bilingual video: listen to a sentence, then rewrite the WHOLE sentence with the sentence
// dictation core (shared/utils/dictation-check): one slot per letter, Space moves to the next word and grades the word
// just left (right = locked green), Enter submits, Tab reveals one letter, Shift+Tab the whole word, Ctrl+Enter shows
// the answer (after the first submit), Esc clears what is not right. Tap-release Ctrl replays the sentence, Alt slow.
// Meaning: follows the Hiện/Ẩn nghĩa button (shared with the settings); while hidden, MISSES_TO_SHOW_MEANING wrong
// submits show it. MISSES_TO_SHOW_ANSWER wrong submits reveal the answer (orange letters = not heard).
import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Eye, EyeOff, Lightbulb, RotateCcw, Snail, WandSparkles } from "lucide-react";

import {
  allCorrect,
  firstOpen,
  gradeWords,
  hintWord,
  letterCount,
  looksVietnameseIme,
  nextOpen,
  prevOpen,
  receiveInput,
  wordIsRight,
  type TargetWord,
} from "@/shared/utils/dictation-check";

import {
  MISSES_TO_SHOW_ANSWER,
  MISSES_TO_SHOW_MEANING,
  type RewriteTarget,
  type RewriteTurn,
} from "../utils/rewrite-exercise";
import styles from "./VideoRewrite.module.css";

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

const answerWords = (target: RewriteTarget) => target.map((w) => hintWord("", w, Infinity).word);

const SLOT_CLASS: Record<string, string> = {
  ok: styles.ok,
  fixed: styles.fixed,
  typed: styles.typed,
  near: styles.near,
  bad: styles.bad,
  "empty-bad": styles.emptyBad,
  hint: styles.hint,
};

interface WordSlotsProps {
  word: TargetWord;
  index: number;
  turn: RewriteTurn;
  hinted: Set<string>;
  caret: boolean;
  onPick: (index: number) => void;
}

/** One word = one group of slots, never broken across lines. */
function WordSlots({ word, index, turn, hinted, caret, onPick }: WordSlotsProps) {
  const typed = [...(turn.words[index] || "")];
  const mark = turn.marks[index];
  const isRevealed = turn.phase === "revealed";
  const reveal = turn.reveal && turn.reveal[index];
  const isCorrect = !isRevealed && (turn.locked[index] || (mark && mark.status === "ok"));
  const slots = word.parts.map((p, j) => {
    if (!p.slot)
      return (
        <span key={j} className={styles.punct}>
          {p.ch}
        </span>
      );
    const k = p.idx ?? 0;
    const ch = typed[k] || "";
    let cls = "";
    if (isRevealed) cls = reveal && reveal.answerMarks && reveal.answerMarks[k] ? "ok" : "fixed";
    else if (isCorrect) cls = "ok";
    else if (mark)
      cls = ch ? (!mark.marks ? "typed" : mark.marks[k] ? "near" : "bad") : "empty-bad";
    else if (hinted.has(`${index}:${k}`)) cls = "hint";
    else if (ch) cls = "typed";
    return (
      <span
        key={j}
        className={cx(styles.slot, SLOT_CLASS[cls], caret && k === typed.length && styles.caret)}
      >
        {ch}
      </span>
    );
  });
  const extraChars = isRevealed
    ? []
    : typed.slice(word.size).map((ch, j) => (
        <span key={`x${j}`} className={cx(styles.slot, styles.extra)}>
          {ch}
        </span>
      ));
  return (
    <span
      className={cx(
        styles.word,
        caret && styles.cur,
        isCorrect && styles.locked,
        mark && mark.status !== "ok" && !isRevealed && styles.wrong,
      )}
      onMouseDown={(e) => {
        if (turn.phase !== "typing" || turn.locked[index]) return;
        e.preventDefault();
        onPick(index);
      }}
    >
      {slots}
      {extraChars}
      {caret && typed.length >= word.size && (
        <span className={cx(styles.slot, styles.caret, styles.ghost)} />
      )}
    </span>
  );
}

export interface VideoRewriteProps {
  index: number;
  target: RewriteTarget;
  turn: RewriteTurn;
  translation: string;
  showMeaning: boolean;
  /** Sentence currently playing. */
  active: boolean;
  onTurn: (index: number, turn: RewriteTurn) => void;
  /** Replays the sentence; `slow` = 0.75×. */
  onListen: (index: number, slow: boolean) => void;
  /** Next sentence. */
  onNext: (index: number) => void;
}

/**
 * Typing area of one sentence. The turn is kept by the reader per sentence index, so scrolling back and forth never
 * loses letters.
 */
export const VideoRewrite = memo(function VideoRewrite({
  index,
  target,
  turn,
  translation,
  showMeaning,
  active,
  onTurn,
  onListen,
  onNext,
}: VideoRewriteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const turnRef = useRef(turn);
  const [focused, setFocused] = useState(false);
  const [shake, setShake] = useState(false);
  const [imeWarn, setImeWarn] = useState(false);
  const tap = useRef<string | null>(null);
  useLayoutEffect(() => {
    turnRef.current = turn;
  });

  // IMEs / phones often put the caret back at the start after React sets the value → typed letters come out
  // reversed. Keep it at the end.
  const keepCaretAtEnd = useCallback(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el && el.selectionStart !== el.value.length) {
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);
  useLayoutEffect(keepCaretAtEnd);

  const commitTurn = useCallback(
    (t: RewriteTurn) => {
      turnRef.current = t;
      onTurn(index, t);
    },
    [index, onTurn],
  );
  const focus = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);

  /** Leaving a word (Space / switching words): grade it at once, right = locked green. */
  const leaveWord = useCallback(
    (t: RewriteTurn, i: number): RewriteTurn => {
      if (t.locked[i] || !t.words[i]) return t;
      const correct = wordIsRight(t.words[i], target[i]);
      const marks = [...t.marks];
      const locked = [...t.locked];
      marks[i] = correct ? { status: "ok" } : gradeWords([t.words[i]], [target[i]])[0];
      if (correct) locked[i] = true;
      return { ...t, marks, locked, liveFixes: t.liveFixes + (correct ? 0 : 1) };
    },
    [target],
  );

  const goToWord = useCallback(
    (i: number) => {
      const t = turnRef.current;
      if (i < 0 || i >= target.length || i === t.cur || t.locked[i]) return;
      commitTurn({ ...leaveWord(t, t.cur), cur: i });
    },
    [target.length, leaveWord, commitTurn],
  );

  const submit = useCallback(() => {
    const t = turnRef.current;
    if (t.phase !== "typing") {
      onNext(index);
      return;
    }
    if (t.words.every((w, i) => t.locked[i] || !w) && !t.locked.some(Boolean)) {
      onListen(index, false);
      return;
    }
    const grades = gradeWords(t.words, target);
    const attempts = t.attempts + 1;
    if (allCorrect(grades)) {
      const isClean = attempts === 1 && !t.hints && !t.liveFixes;
      commitTurn({
        ...t,
        attempts,
        phase: "correct",
        status: isClean ? "clean" : "passed",
        marks: grades.map(() => ({ status: "ok" as const })),
        locked: grades.map(() => true),
      });
      return;
    }
    if (attempts >= MISSES_TO_SHOW_ANSWER) {
      commitTurn({
        ...t,
        attempts,
        phase: "revealed",
        status: "revealed",
        words: answerWords(target),
        marks: grades,
        reveal: grades,
      });
      return;
    }
    const locked = grades.map((g, i) => t.locked[i] || g.status === "ok");
    const marks = grades.map((g) => (g.status === "ok" ? { status: "ok" as const } : g));
    commitTurn({
      ...t,
      attempts,
      marks,
      locked,
      cur: Math.max(0, firstOpen(locked, target.length)),
    });
    setShake(true);
    setTimeout(() => setShake(false), 420);
  }, [target, commitTurn, index, onListen, onNext]);

  const revealAnswer = useCallback(() => {
    const t = turnRef.current;
    if (t.phase !== "typing" || !t.attempts) return;
    const grades = gradeWords(t.words, target);
    commitTurn({
      ...t,
      phase: "revealed",
      status: "revealed",
      words: answerWords(target),
      marks: grades,
      reveal: grades,
    });
  }, [target, commitTurn]);

  const giveHint = useCallback(
    (count: number) => {
      const t = turnRef.current;
      if (t.phase !== "typing") return;
      const w = t.locked[t.cur] ? firstOpen(t.locked, target.length) : t.cur;
      if (w === -1) return;
      const { word, revealed } = hintWord(t.words[w], target[w], count);
      if (!revealed.length) return;
      const words = [...t.words];
      const marks = [...t.marks];
      const locked = [...t.locked];
      words[w] = word;
      marks[w] = null;
      let cur = w;
      if (wordIsRight(word, target[w])) {
        marks[w] = { status: "ok" };
        locked[w] = true;
        const nx = nextOpen(w, locked, target.length);
        cur = nx === -1 ? w : nx;
      }
      commitTurn({
        ...t,
        words,
        marks,
        locked,
        cur,
        hints: t.hints + 1,
        hinted: [...t.hinted, ...revealed.map((x) => `${w}:${x}`)],
      });
      focus();
    },
    [target, commitTurn, focus],
  );

  const clearUnlocked = useCallback(() => {
    const t = turnRef.current;
    if (t.phase !== "typing") return;
    commitTurn({
      ...t,
      words: t.words.map((w, i) => (t.locked[i] ? w : "")),
      marks: t.marks.map((m, i) => (t.locked[i] ? m : null)),
      cur: Math.max(0, firstOpen(t.locked, target.length)),
    });
  }, [target.length, commitTurn]);

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const t = turnRef.current;
    if (t.phase !== "typing") return;
    const raw = e.target.value;
    if (looksVietnameseIme(raw)) setImeWarn(true);
    const prevWord = t.words[t.cur];
    const appended = raw.startsWith(prevWord) ? raw.slice(prevWord.length) : "";
    // Red word: typing a new letter rewrites the whole word (Backspace edits letter by letter).
    const curMark = t.marks[t.cur];
    const value = curMark && curMark.status === "wrong" && /^\S/.test(appended) ? appended : raw;
    const { words, cur } = receiveInput(
      { words: t.words, cur: t.cur, locked: t.locked, target },
      value,
    );
    const marks = [...t.marks];
    words.forEach((w, i) => {
      if (w !== t.words[i]) marks[i] = null;
    });
    let next: RewriteTurn = { ...t, words, marks, cur };
    for (let i = t.cur; i < cur; i += 1) next = leaveWord(next, i);
    commitTurn(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const t = turnRef.current;
    if (e.key === "Control" || e.key === "Alt") {
      tap.current = e.repeat ? tap.current : e.key;
      if (e.key === "Alt") e.preventDefault();
      return;
    }
    tap.current = null;
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) revealAnswer();
      else submit();
      return;
    }
    if (t.phase !== "typing") return;
    if (e.key === "Tab") {
      e.preventDefault();
      giveHint(e.shiftKey ? Infinity : 1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      clearUnlocked();
      return;
    }
    const el = e.currentTarget;
    if (e.key === "Backspace" && !el.value) {
      e.preventDefault();
      const k = prevOpen(t.cur, t.locked);
      if (k !== -1) goToWord(k);
    } else if (e.key === "ArrowLeft" || e.key === "Home") {
      e.preventDefault();
      const k = prevOpen(t.cur, t.locked);
      if (k !== -1) goToWord(k);
    } else if (e.key === "ArrowRight" || e.key === "End") {
      e.preventDefault();
      const k = nextOpen(t.cur, t.locked, target.length);
      if (k !== -1) goToWord(k);
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Control" || e.key === "Alt") && tap.current === e.key) {
      e.preventDefault();
      onListen(index, e.key === "Alt");
    }
    if (e.key === "Control" || e.key === "Alt") tap.current = null;
  };

  const typing = turn.phase === "typing";
  const autoShowMeaning = !showMeaning && turn.attempts >= MISSES_TO_SHOW_MEANING;
  const meaningVisible = showMeaning || turn.peek || autoShowMeaning || !typing;
  const hinted = new Set(turn.hinted);
  const wrongCount = typing
    ? turn.marks.filter((m, i) => m && m.status !== "ok" && !turn.locked[i]).length
    : 0;
  const letterTotal = letterCount(target);
  // Only the playing / focused / attempted sentence shows the instructions and buttons: identical buttons on every
  // sentence are noise.
  const expanded = typing && (active || focused || turn.attempts > 0 || turn.hints > 0);
  const triesLeft = MISSES_TO_SHOW_ANSWER - turn.attempts;

  let statusText = "Nghe xong gõ lại cả câu. Space sang từ kế (từ đúng sáng xanh), Enter để nộp.";
  if (wrongCount) {
    statusText =
      triesLeft === 1
        ? "Sai thêm lần nữa là mở đáp án. Nhấn-thả Alt để nghe chậm rồi sửa ô đỏ nhé."
        : `Còn ${wrongCount} từ chưa đúng — gõ đè để viết lại từ đỏ. Nhấn-thả Ctrl nghe lại, Alt nghe chậm.`;
  } else if (turn.attempts > 0) statusText = "Các từ xanh đã đúng. Viết nốt rồi Enter.";

  return (
    <div
      className={cx(styles.rewrite, shake && styles.shake)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        e.preventDefault();
        focus();
      }}
    >
      <div
        className={styles.slots}
        role="group"
        aria-label={`Ô viết lại câu ${index + 1}: ${target.length} từ, ${letterTotal} chữ cái`}
      >
        {target.map((w, i) => (
          <WordSlots
            key={i}
            word={w}
            index={i}
            turn={turn}
            hinted={hinted}
            caret={typing && focused && turn.cur === i}
            onPick={(k) => {
              goToWord(k);
              focus();
            }}
          />
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          data-rewrite={index}
          value={typing ? turn.words[turn.cur] || "" : ""}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onFocus={() => {
            setFocused(true);
            setTimeout(keepCaretAtEnd, 0);
          }}
          onSelect={keepCaretAtEnd}
          onBlur={() => {
            setFocused(false);
            tap.current = null;
          }}
          readOnly={!typing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={typing ? "done" : "next"}
          aria-label="Gõ từ đang chọn"
        />
      </div>

      {typing && (meaningVisible || expanded) && (
        <div className={cx(styles.translation, !meaningVisible && styles.translationHidden)}>
          {meaningVisible ? (
            <span>
              {translation || "Câu này chưa có bản dịch."}
              {autoShowMeaning && !turn.peek && (
                <em> · tự hiện sau {MISSES_TO_SHOW_MEANING} lần sai</em>
              )}
            </span>
          ) : (
            <span aria-hidden="true">Nghĩa đang ẩn</span>
          )}
          {!showMeaning && !autoShowMeaning && (
            <button
              type="button"
              onClick={() => commitTurn({ ...turnRef.current, peek: !turnRef.current.peek })}
              aria-pressed={turn.peek}
            >
              {turn.peek ? (
                <EyeOff size={13} aria-hidden="true" />
              ) : (
                <Eye size={13} aria-hidden="true" />
              )}
              {turn.peek ? "Ẩn nghĩa" : "Xem nghĩa"}
            </button>
          )}
        </div>
      )}

      {imeWarn && typing && (
        <p className={styles.ime} role="alert">
          Hình như bộ gõ tiếng Việt đang bật (ra chữ có dấu). Tắt nó (Ctrl+Shift hoặc Alt+Z với
          Unikey/EVKey) để gõ tiếng Anh.
          <button type="button" onClick={() => setImeWarn(false)}>
            Đã hiểu
          </button>
        </p>
      )}

      {expanded && (
        <>
          <p className={cx(styles.status, wrongCount > 0 && styles.statusBad)} aria-live="polite">
            {turn.attempts > 0 && <b>{`Lần ${turn.attempts + 1}/${MISSES_TO_SHOW_ANSWER}`}</b>}
            {turn.hints > 0 && <b>{`${turn.hints} gợi ý`}</b>}
            {statusText}
          </p>
          <div className={styles.acts}>
            <button type="button" className={styles.check} onClick={submit}>
              Kiểm tra <kbd>Enter</kbd>
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => giveHint(1)}
              title="Hé chữ kế tiếp của từ đang gõ (Tab)"
            >
              <Lightbulb size={14} aria-hidden="true" /> Gợi ý chữ
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => giveHint(Infinity)}
              title="Hé cả từ (Shift+Tab)"
            >
              <WandSparkles size={14} aria-hidden="true" /> Hé cả từ
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => onListen(index, false)}
              title="Nghe lại câu (nhấn-thả Ctrl)"
            >
              <RotateCcw size={14} aria-hidden="true" /> Nghe lại
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => onListen(index, true)}
              title="Nghe chậm 0.75× (nhấn-thả Alt)"
            >
              <Snail size={14} aria-hidden="true" /> Nghe chậm
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={revealAnswer}
              disabled={!turn.attempts}
              title={turn.attempts ? "Xem đáp án (Ctrl+Enter)" : "Tự nộp thử một lần trước đã"}
            >
              <Eye size={14} aria-hidden="true" /> Xem đáp án
            </button>
          </div>
        </>
      )}
    </div>
  );
});

const RESULT_CLASS: Record<string, string> = {
  clean: styles.resultClean,
  passed: styles.resultPassed,
  revealed: styles.resultRevealed,
};

/** Finished sentence (right / answer revealed): result line + retry. */
export function RewriteResult({ turn, onRetry }: { turn: RewriteTurn; onRetry: () => void }) {
  const label =
    turn.status === "clean"
      ? "Chuẩn ngay lần đầu"
      : turn.status === "passed"
        ? `Đúng sau ${turn.attempts} lần${turn.hints ? ` · ${turn.hints} gợi ý` : ""}`
        : "Đã mở đáp án — chữ cam là chỗ chưa nghe ra";
  return (
    <div
      className={cx(styles.result, RESULT_CLASS[turn.status])}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{label}</span>
      <button type="button" className={cx(styles.btn, styles.btnGhost)} onClick={onRetry}>
        <RotateCcw size={13} aria-hidden="true" /> Viết lại câu này
      </button>
      <span className={styles.resultNext}>Enter: câu tiếp</span>
    </div>
  );
}
