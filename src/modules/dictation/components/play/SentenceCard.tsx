/**
 * One sentence of the play screen (Studychill SentenceCard): listen, type every word into letter slots through a
 * hidden input, submit (server grades), live check per word with word proofs, hints, reveal, answer panel.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Eye,
  EyeOff,
  Lightbulb,
  RotateCcw,
  Snail,
  Tags,
  Volume2,
  WandSparkles,
} from "lucide-react";

import { cx } from "@/shared/components/ui";
import {
  allCorrect,
  clampWord,
  firstOpen,
  gradeWords,
  hintWord,
  letterCount,
  looksVietnameseIme,
  mistakesOf,
  nextOpen,
  prevOpen,
  receiveInput,
  wordIsRight,
  type Mistake,
  type TargetWord,
} from "@/shared/utils/dictation-check";

import type {
  AudioKind,
  PlayItem,
  PlaySource,
  SentenceResult,
  SentenceStatus,
  WordMark,
} from "../../types/play.types";
import type { PlaySettings } from "../../utils/dictation-settings";
import { MASCOT } from "../../utils/mascot";
import { playSfx, type SoundName } from "../../utils/sfx";
import styles from "./DictationPlaySession.module.css";

type Phase = "typing" | "correct" | "revealed" | "review";

interface Turn {
  words: string[];
  cur: number;
  locked: boolean[];
  marks: WordMark[];
  attempts: number;
  hints: number;
  hinted: string[];
  liveFixes: number;
  phase: Phase;
  mistakes: Mistake[] | null;
  reveal: WordMark[] | null;
  peekMeaning: boolean;
  peekKeywords: boolean;
  assisted: boolean;
  status?: SentenceStatus;
  unlocks?: boolean;
  display?: string;
  translation?: string;
}

/** Result handed to the session when the sentence ends. */
export type SentenceOutcome = SentenceResult & { status: SentenceStatus };

const CLEAN_LINES = [
  "Tai thính quá! 🎉",
  "Chuẩn không cần chỉnh!",
  "Sạch bong, không cần gợi ý!",
  "Nghe một lần là chép đúng — đỉnh!",
];

function freshTurn(n: number): Turn {
  return {
    words: Array<string>(n).fill(""),
    cur: 0,
    locked: Array<boolean>(n).fill(false),
    marks: Array<WordMark>(n).fill(null),
    attempts: 0,
    hints: 0,
    hinted: [],
    liveFixes: 0,
    phase: "typing",
    mistakes: null,
    reveal: null,
    peekMeaning: false,
    peekKeywords: false,
    assisted: false,
  };
}

function reviewTurn(n: number, result: SentenceResult): Turn {
  return {
    ...freshTurn(n),
    phase: "review",
    words: result.words || Array<string>(n).fill(""),
    marks: result.marks || Array<WordMark>(n).fill(null),
    locked: Array<boolean>(n).fill(true),
    attempts: result.attempts || 1,
    hints: result.hints || 0,
    mistakes: result.mistakes || [],
    reveal: result.status === "revealed" ? result.marks : null,
    status: result.status,
    unlocks: true,
  };
}

const answerWords = (target: TargetWord[]) => target.map((w) => hintWord("", w, Infinity).word);
const errorText = (error: unknown): string => {
  const response = (error as { response?: { data?: { detail?: string } } })?.response;
  return response?.data?.detail || (error as Error)?.message || "Không kết nối được máy chủ.";
};

export interface SentenceCardProps {
  item: PlayItem;
  source: PlaySource;
  again: boolean;
  done: SentenceResult | null;
  settings: PlaySettings;
  inactive: boolean;
  speaking: boolean;
  audioFailed: boolean;
  play: (kind?: AudioKind) => Promise<boolean>;
  onDone: (result: SentenceOutcome) => void;
  onBrowse: () => void;
  onAdvance: () => void;
  onRetry: () => void;
  hasNext: boolean;
  streak: number;
}

export function SentenceCard({
  item,
  source,
  again,
  done,
  settings,
  inactive,
  speaking,
  audioFailed,
  play,
  onDone,
  onBrowse,
  onAdvance,
  onRetry,
  hasNext,
  streak,
}: SentenceCardProps) {
  const { target } = item;
  const [known, setKnown] = useState<TargetWord[] | null>(item.known);
  const [turn, setTurn] = useState<Turn>(() =>
    done && item.known ? reviewTurn(target.length, done) : freshTurn(target.length),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [focused, setFocused] = useState(false);
  const [imeWarn, setImeWarn] = useState(false);
  const [cleanLine] = useState(() => CLEAN_LINES[item.id % CLEAN_LINES.length]);
  const [autoLeft, setAutoLeft] = useState<number | null>(null);
  const [autoCancelled, setAutoCancelled] = useState(false);
  // Opened to review a finished sentence → "next" browses in order; just finished → next unfinished sentence.
  const [openedAsReview] = useState(Boolean(done && item.known));
  const onNext = openedAsReview ? onBrowse : onAdvance;
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const turnRef = useRef(turn);
  const knownRef = useRef(known);
  // Key and input handlers read the latest turn through refs (updated right after every render).
  useLayoutEffect(() => {
    turnRef.current = turn;
    knownRef.current = known;
  });
  // The slots only draw the caret at the end of a word, so keep the real caret at the end too
  // (IMEs and phones put it back at the start after React rewrites the value, reversing the letters).
  const caretToEnd = useCallback(() => {
    const element = inputRef.current;
    if (
      element &&
      document.activeElement === element &&
      element.selectionStart !== element.value.length
    ) {
      element.setSelectionRange(element.value.length, element.value.length);
    }
  }, []);
  useLayoutEffect(caretToEnd);

  const shape = known || target; // frame being drawn: with letters once the answer is known
  const typing = turn.phase === "typing";
  const finishedTurn = !typing;
  // TOEIC roadmap from level 3: meaning + keywords open only after the first submission (listen first).
  const gatedNow = Boolean(item.gated) && turn.attempts === 0 && typing;
  const liveOn =
    settings.liveCheck === "word" || (settings.liveCheck === "after" && turn.attempts > 0);
  const meaningVisible =
    finishedTurn ||
    (!gatedNow &&
      (turn.peekMeaning ||
        settings.showMeaning === "always" ||
        (settings.showMeaning === "after" && turn.attempts > 0)));
  const cueOn = settings.firstLetter && Boolean(known);
  const sfx = useCallback(
    (name: SoundName) => {
      if (name === "type" || name === "erase" ? settings.typingSound : settings.feedbackSound)
        playSfx(name);
    },
    [settings.typingSound, settings.feedbackSound],
  );

  const focusInput = useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);

  // A new sentence: play the audio (per settings) and focus the input.
  const opening = useRef({ openedAsReview, autoPlay: settings.autoPlay, play, focusInput });
  useEffect(() => {
    const { openedAsReview: review, autoPlay, play: playNow, focusInput: focus } = opening.current;
    const timer = setTimeout(() => {
      focus();
      if (!review && autoPlay) void playNow("normal");
    }, 380);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!inactive) focusInput();
  }, [inactive, focusInput]);

  // ── Record the sentence result ──
  const complete = useCallback(
    (t: Turn, status: SentenceStatus, extra: Partial<Turn> = {}) => {
      const next: Turn = {
        ...t,
        ...extra,
        phase: status === "revealed" ? "revealed" : "correct",
        status,
      };
      setTurn(next);
      onDone({
        status,
        attempts: next.attempts,
        hints: next.hints,
        words: next.words,
        marks: next.marks,
        mistakes: next.mistakes || [],
        unlocks: next.unlocks,
        known: knownRef.current,
        display: next.display,
        translation: next.translation,
      });
      if (status === "revealed") {
        sfx("reveal");
        if (settings.autoPlay) setTimeout(() => void play("normal"), 500);
      } else {
        sfx("correct");
      }
    },
    [onDone, sfx, play, settings.autoPlay],
  );

  /** Grades a word the learner just left (Space / moving) in live-check mode. With the answer known it is graded
   * here; before the first submission of a server sentence the server's word proof decides (asynchronously). */
  const leaveWord = useCallback(
    (t: Turn, i: number): Turn => {
      if (!liveOn || t.locked[i] || !t.words[i]) return t;
      const k = knownRef.current;
      if (!k) {
        const word = t.words[i];
        void source.checkWord?.(item, i, word).then((state) => {
          if (!state) return;
          setTurn((current) => {
            if (current.phase !== "typing" || current.words[i] !== word || current.locked[i])
              return current;
            const marks = [...current.marks];
            const locked = [...current.locked];
            marks[i] = state === "ok" ? { status: "ok" } : { status: "wrong", marks: null };
            if (state === "ok") locked[i] = true;
            return {
              ...current,
              marks,
              locked,
              liveFixes: current.liveFixes + (state === "ok" ? 0 : 1),
            };
          });
        });
        return t;
      }
      const right = wordIsRight(t.words[i], k[i]);
      const marks = [...t.marks];
      const locked = [...t.locked];
      marks[i] = right ? { status: "ok" } : gradeWords([t.words[i]], [k[i]])[0];
      if (right) locked[i] = true;
      return { ...t, marks, locked, liveFixes: t.liveFixes + (right ? 0 : 1) };
    },
    [liveOn, source, item],
  );

  const moveTo = useCallback(
    (i: number) => {
      const t = turnRef.current;
      if (i < 0 || i >= target.length || i === t.cur || t.locked[i]) return;
      setTurn({ ...leaveWord(t, t.cur), cur: i });
    },
    [leaveWord, target.length],
  );

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (!typing || busyRef.current) return;
    const raw = event.target.value;
    if (looksVietnameseIme(raw)) setImeWarn(true);
    const t = turnRef.current;
    const old = t.words[t.cur];
    const added = raw.startsWith(old) ? raw.slice(old.length) : "";
    // Word painted red: typing a new letter rewrites the whole word (Backspace edits letter by letter).
    const value = t.marks[t.cur]?.status === "wrong" && /^\S/.test(added) ? added : raw;
    const { words, cur } = receiveInput(
      { words: t.words, cur: t.cur, locked: t.locked, target },
      value,
    );
    const marks = [...t.marks];
    words.forEach((w, i) => {
      if (w !== t.words[i]) marks[i] = null;
    });
    let next: Turn = { ...t, words, marks, cur };
    // Leaving words behind (Space / pasting a sentence) grades them in live-check mode.
    for (let i = t.cur; i < cur; i += 1) next = leaveWord(next, i);
    setTurn(next);
    const grew = words.join("").length > t.words.join("").length;
    sfx(grew || cur !== t.cur ? "type" : "erase");
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!typing) return;
    const element = event.currentTarget;
    const t = turnRef.current;
    if (event.key === "Backspace" && !element.value) {
      event.preventDefault();
      const k = prevOpen(t.cur, t.locked);
      if (k !== -1) {
        moveTo(k);
        sfx("erase");
      }
    } else if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      const k = prevOpen(t.cur, t.locked);
      if (k !== -1) moveTo(k);
    } else if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      const k = nextOpen(t.cur, t.locked, target.length);
      if (k !== -1) moveTo(k);
    }
  };

  /** Runs a server call, blocking double submissions (Enter twice quickly). */
  const withBusy = useCallback(async (job: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await job();
    } catch (err) {
      setError(errorText(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  // ── Actions ──
  const submit = useCallback(
    () =>
      withBusy(async () => {
        let t = turnRef.current;
        if (t.phase !== "typing") return;
        if (t.words.every((w, i) => t.locked[i] || !w) && !t.locked.some(Boolean)) {
          void play("normal");
          return;
        }
        let k = knownRef.current;
        let server: Awaited<ReturnType<NonNullable<PlaySource["grade"]>>> | null = null;
        const assisted = t.assisted || t.hints > 0 || settings.firstLetter;
        if (source.grade) {
          server = await source.grade(item, t.words, { hints: t.hints, assisted });
          if (server.known && server.known.length === target.length) {
            k = server.known;
            setKnown(k);
            knownRef.current = k;
          }
          t = turnRef.current;
        }
        if (!k) return;
        const grades = gradeWords(t.words, k);
        const attempts = t.attempts + 1;
        const mistakes = t.mistakes || mistakesOf(t.words, k);
        const info = {
          display: server?.display || item.display,
          translation: server?.translation || item.translation,
        };
        if (allCorrect(grades)) {
          const clean = attempts === 1 && t.hints === 0 && t.liveFixes === 0 && !assisted;
          const unlocks = server ? Boolean(server.unlocks) : true;
          complete(
            {
              ...t,
              attempts,
              mistakes,
              marks: grades.map(() => ({ status: "ok" as const })),
              locked: grades.map(() => true),
              unlocks,
              ...info,
            },
            clean ? "clean" : "passed",
          );
          return;
        }
        if (settings.revealAfter && attempts >= settings.revealAfter) {
          complete(
            {
              ...t,
              attempts,
              mistakes,
              marks: grades,
              words: answerWords(k),
              unlocks: false,
              ...info,
            },
            "revealed",
            {
              reveal: grades,
            },
          );
          return;
        }
        const locked = grades.map((g, i) => t.locked[i] || g.status === "ok");
        const marks: WordMark[] = grades.map((g) => (g.status === "ok" ? { status: "ok" } : g));
        setTurn({
          ...t,
          attempts,
          mistakes,
          marks,
          locked,
          cur: Math.max(0, firstOpen(locked, target.length)),
          ...info,
        });
        setShake(true);
        setTimeout(() => setShake(false), 450);
        sfx("wrong");
      }),
    [
      withBusy,
      target.length,
      item,
      source,
      settings.firstLetter,
      settings.revealAfter,
      complete,
      play,
      sfx,
    ],
  );

  const canReveal = typing && turn.attempts > 0 && Boolean(known);
  const reveal = useCallback(() => {
    const t = turnRef.current;
    const k = knownRef.current;
    if (t.phase !== "typing" || t.attempts === 0 || !k) return;
    const grades = gradeWords(t.words, k);
    complete({ ...t, marks: grades, words: answerWords(k), unlocks: false }, "revealed", {
      reveal: grades,
    });
  }, [complete]);

  /** Hint: with the answer known it is revealed here; before the first submission of a server sentence the
   * server finds the first wrong/missing word and returns its first letter or the whole word. */
  const applyHint = useCallback(
    (t: Turn, w: number, word: string, revealed: number[], isWhole: boolean) => {
      const k = knownRef.current;
      const words = [...t.words];
      const marks = [...t.marks];
      const locked = [...t.locked];
      words[w] = word;
      marks[w] = null;
      let cur = w;
      if (k ? wordIsRight(word, k[w]) : isWhole) {
        marks[w] = { status: "ok" };
        locked[w] = true;
        const next = nextOpen(w, locked, target.length);
        cur = next === -1 ? w : next;
      }
      setTurn({
        ...t,
        words,
        marks,
        locked,
        cur,
        hints: t.hints + 1,
        hinted: [...t.hinted, ...revealed.map((x) => `${w}:${x}`)],
      });
      sfx("reveal");
    },
    [target.length, sfx],
  );

  const hint = useCallback(
    (letters: number) => {
      const t = turnRef.current;
      if (t.phase !== "typing") return;
      const k = knownRef.current;
      if (k) {
        const w = t.locked[t.cur] ? firstOpen(t.locked, target.length) : t.cur;
        if (w === -1) return;
        const { word, revealed } = hintWord(t.words[w], k[w], letters);
        if (revealed.length) applyHint(t, w, word, revealed, false);
        return;
      }
      if (!source.hint) return;
      const requestHint = source.hint;
      void withBusy(async () => {
        const whole = letters === Infinity;
        const result = await requestHint(item, t.words, whole ? "RevealWord" : "FirstLetter");
        const current = turnRef.current;
        const w = Math.max(0, Math.min(target.length - 1, result.index));
        const word = clampWord(whole ? result.word : result.letter, target[w]);
        const revealed = [...word].map((_, x) => x);
        applyHint(current, w, word, revealed, whole);
      });
    },
    [target, item, source, withBusy, applyHint],
  );

  const clearAll = useCallback(() => {
    setTurn((t) => {
      if (t.phase !== "typing") return t;
      const words = t.words.map((w, i) => (t.locked[i] ? w : ""));
      const marks = t.marks.map((m, i) => (t.locked[i] ? m : null));
      return { ...t, words, marks, cur: Math.max(0, firstOpen(t.locked, target.length)) };
    });
    sfx("erase");
  }, [target.length, sfx]);

  // TOEIC roadmap: when the sentence does not open the next one, the main button is "retry".
  const blocked =
    Boolean(source.mustPass) &&
    (turn.phase === "correct" || turn.phase === "revealed") &&
    !turn.unlocks;
  const primaryNext = blocked ? onRetry : onNext;

  // Auto-advance after a correct sentence (if enabled). Any key cancels the countdown.
  const autoActive =
    turn.phase === "correct" &&
    !blocked &&
    hasNext &&
    settings.autoNext > 0 &&
    !inactive &&
    !autoCancelled;
  useEffect(() => {
    if (!autoActive) return undefined;
    const started = Date.now();
    const id = setInterval(() => {
      const left = settings.autoNext - (Date.now() - started) / 1000;
      if (left <= 0) {
        clearInterval(id);
        onNext();
      } else setAutoLeft(left);
    }, 100);
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Enter") setAutoCancelled(true);
    };
    window.addEventListener("keydown", cancel);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", cancel);
    };
  }, [autoActive, settings.autoNext, onNext]);
  const countdown = autoActive ? (autoLeft ?? settings.autoNext) : null;

  // ── Shortcuts: tap Ctrl / Alt alone to listen; Enter, Tab, Esc ──
  const keys = useRef({
    submit,
    reveal,
    hint,
    clearAll,
    play,
    next: primaryNext,
    typing,
    inactive,
  });
  useLayoutEffect(() => {
    keys.current = { submit, reveal, hint, clearAll, play, next: primaryNext, typing, inactive };
  });
  useEffect(() => {
    let tap: string | null = null;
    const down = (event: globalThis.KeyboardEvent) => {
      const k = keys.current;
      if (k.inactive) {
        tap = null;
        return;
      }
      if (event.key === "Control" || event.key === "Alt") {
        tap = event.repeat ? tap : event.key;
        if (event.key === "Alt") event.preventDefault();
        return;
      }
      tap = null;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest("[data-play-panel]") || event.isComposing) return;
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        k.reveal();
        return;
      }
      if (event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement) return; // Enter on a button keeps its own behaviour
        event.preventDefault();
        if (k.typing) void k.submit();
        else k.next();
        return;
      }
      if (event.key === "Tab" && k.typing) {
        event.preventDefault();
        k.hint(event.shiftKey ? Infinity : 1);
        return;
      }
      if (event.key === "Escape" && k.typing) {
        event.preventDefault();
        k.clearAll();
      }
    };
    const up = (event: globalThis.KeyboardEvent) => {
      if (
        (event.key === "Control" || event.key === "Alt") &&
        tap === event.key &&
        !keys.current.inactive
      ) {
        event.preventDefault();
        void keys.current.play(event.key === "Control" ? "normal" : "slow");
      }
      if (event.key === "Control" || event.key === "Alt") tap = null;
    };
    const blur = () => {
      tap = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // ── Rendering ──
  const letters = letterCount(target);
  const size =
    letters > 150
      ? styles.slotsTiny
      : letters > 95
        ? styles.slotsSmall
        : letters > 55
          ? styles.slotsMid
          : "";
  const hinted = new Set(turn.hinted);
  const openWrong = typing
    ? turn.marks.filter((m, i) => m && m.status !== "ok" && !turn.locked[i]).length
    : 0;
  const status = turn.status;
  const revealAt = settings.revealAfter;
  const meaning = turn.translation || item.translation || "";
  const keywords = item.keywords || [];
  const keywordsVisible = keywords.length > 0 && (finishedTurn || (turn.peekKeywords && !gatedNow));
  const display = turn.display || item.display || "";

  let mascot: { image: string; say: string } = {
    image: MASCOT.peeking,
    say: "Nghe kỹ rồi gõ từng từ nhé. Space để sang từ kế, Enter để nộp.",
  };
  if (blocked) {
    mascot = {
      image: MASCOT.idea,
      say:
        turn.phase === "revealed"
          ? "Gõ lại câu này một lượt để mở câu kế nhé!"
          : "Đạt rồi! Từ Level 3 cần một lần tự làm không gợi ý để mở câu kế.",
    };
  } else if (turn.phase === "correct") {
    mascot = {
      image: MASCOT.celebrate,
      say:
        status === "clean"
          ? streak >= 3
            ? `🔥 ${streak} câu sạch liên tiếp!`
            : cleanLine
          : "Đạt rồi! Lần sau thử không cần gợi ý nhé.",
    };
  } else if (turn.phase === "revealed") {
    mascot = {
      image: MASCOT.thinking,
      say: again
        ? "Vẫn khó hả? Đọc kỹ từ đỏ rồi nghe lại vài lần nhé."
        : "Không sao! Đọc kỹ đáp án — câu này sẽ quay lại sau vài câu.",
    };
  } else if (turn.phase === "review") {
    mascot = { image: MASCOT.reading, say: "Đang xem lại câu đã làm. Enter để đi tiếp." };
  } else if (openWrong) {
    mascot = {
      image: MASCOT.thinking,
      say:
        revealAt && turn.attempts === revealAt - 1
          ? "Sai thêm lần nữa là mình mở đáp án nhé. Thử nghe chậm (Alt)!"
          : `Còn ${openWrong} từ chưa đúng. Nghe chậm (Alt) rồi sửa các ô đỏ nhé.`,
    };
  } else if (again) {
    mascot = { image: MASCOT.idea, say: "Câu này gặp lại nè — thử nhớ lại đáp án lúc nãy!" };
  }

  const nextLabel = blocked
    ? turn.phase === "revealed"
      ? "Gõ lại câu này"
      : "Làm lại không trợ giúp"
    : countdown != null
      ? `Tự chuyển sau ${countdown.toFixed(1).replace(".", ",")}s`
      : hasNext
        ? "Câu tiếp"
        : "Xem kết quả";

  return (
    <article
      className={cx(styles.card, shake && styles.shaking)}
      data-phase={turn.phase}
      data-status={status}
      onMouseDown={(event) => {
        // Buttons inside the card never take the focus from the input (Enter stays check / next).
        const element = event.target as Element;
        if (element.closest("a, input, summary, [data-answer]")) return;
        event.preventDefault();
        if (!element.closest("button")) focusInput();
      }}
    >
      <div className={styles.mascot} aria-hidden="true">
        <span className={styles.bubble}>{mascot.say}</span>
        <img
          src={mascot.image}
          alt=""
          onError={(event) => {
            event.currentTarget.src = MASCOT.smile;
          }}
        />
      </div>
      <div className={styles.cardDeco} aria-hidden="true">
        <i />
        <i />
      </div>

      <div className={styles.cardHead}>
        <span className={styles.chip}>Câu {String(item.number).padStart(2, "0")}</span>
        {again && <span className={cx(styles.chip, styles.chipWarm)}>Gặp lại</span>}
        {typing && turn.attempts > 0 && (
          <span className={cx(styles.chip, styles.chipSoft)}>
            Lần thử {turn.attempts + 1}
            {revealAt ? `/${revealAt}` : ""}
          </span>
        )}
        {turn.hints > 0 && (
          <span className={cx(styles.chip, styles.chipSoft)}>{turn.hints} gợi ý</span>
        )}
        <span className={cx(styles.chip, styles.chipSoft, styles.chipRight)}>
          {target.length} từ · {letters} ô
        </span>
      </div>

      <section className={styles.listen}>
        <button
          type="button"
          className={cx(styles.play, speaking && styles.speaking)}
          onClick={() => void play("normal")}
          aria-label="Nghe câu (Ctrl)"
          title="Nghe câu (Ctrl)"
        >
          <Volume2 size={34} />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </button>
        <div className={styles.listenTools}>
          <button type="button" onClick={() => void play("slow")} title="Nghe chậm (Alt)">
            <Snail size={16} /> Nghe chậm
          </button>
          {keywords.length > 0 && typing && (
            <button
              type="button"
              disabled={gatedNow}
              aria-pressed={turn.peekKeywords}
              onClick={() =>
                setTurn((t) => ({
                  ...t,
                  peekKeywords: !t.peekKeywords,
                  assisted: t.assisted || (t.attempts === 0 && !t.peekKeywords),
                }))
              }
              title={
                gatedNow
                  ? "Từ Level 3, từ khoá mở sau lần nộp đầu"
                  : "Xem từ khoá (mở trước khi nộp tính là có trợ giúp)"
              }
            >
              <Tags size={16} /> {turn.peekKeywords ? "Ẩn từ khoá" : "Từ khoá"}
            </button>
          )}
          <span className={styles.rate} title="Tốc độ đọc — đổi trong Cài đặt">
            {settings.rate}×
          </span>
        </div>
        {audioFailed && (
          <small className={styles.audioError}>
            Không tải được âm thanh — kiểm tra mạng rồi bấm loa lần nữa.
          </small>
        )}
      </section>

      <div className={cx(styles.meaning, !meaningVisible && styles.meaningHidden)}>
        {meaningVisible ? (
          <p>{meaning || "Câu này chưa có nghĩa tiếng Việt."}</p>
        ) : (
          <p aria-hidden="true">
            {gatedNow ? "Nghĩa mở sau lần nộp đầu" : "Nghĩa tiếng Việt đang ẩn"}
          </p>
        )}
        {!finishedTurn &&
          !gatedNow &&
          settings.showMeaning !== "always" &&
          !(settings.showMeaning === "after" && turn.attempts > 0) && (
            <button
              type="button"
              onClick={() => setTurn((t) => ({ ...t, peekMeaning: !t.peekMeaning }))}
              aria-pressed={turn.peekMeaning}
            >
              {turn.peekMeaning ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
              {turn.peekMeaning ? "Ẩn nghĩa" : "Xem nghĩa"}
            </button>
          )}
      </div>
      {keywordsVisible && (
        <div className={styles.keywords}>
          {keywords.map((keyword) => (
            <span key={keyword.word}>
              <b>{keyword.word}</b> {keyword.meaning}
            </span>
          ))}
        </div>
      )}

      <div
        className={cx(styles.slots, size)}
        role="group"
        aria-label={typing ? "Ô viết lại câu — mỗi gạch chân là một chữ cái" : `Đáp án: ${display}`}
      >
        {shape.map((word, i) => (
          <WordSlots
            key={i}
            word={word}
            index={i}
            turn={turn}
            hinted={hinted}
            caret={typing && focused && turn.cur === i && !inactive}
            cue={typing && cueOn}
            onPick={() => {
              moveTo(i);
              focusInput();
            }}
          />
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={typing ? turn.words[turn.cur] || "" : ""}
          onChange={onInput}
          onKeyDown={onInputKey}
          onFocus={() => {
            setFocused(true);
            setTimeout(caretToEnd, 0);
          }}
          onSelect={caretToEnd}
          onBlur={() => setFocused(false)}
          readOnly={!typing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={typing ? "done" : "next"}
          aria-label="Gõ từ đang chọn"
        />
      </div>

      {imeWarn && typing && (
        <p className={styles.ime} role="alert">
          Hình như bộ gõ tiếng Việt đang bật (gõ ra chữ có dấu). Tắt nó (Ctrl+Shift hoặc Alt+Z với
          Unikey/EVKey) để gõ tiếng Anh.
          <button type="button" onClick={() => setImeWarn(false)}>
            Đã hiểu
          </button>
        </p>
      )}

      <p
        className={cx(styles.status, (openWrong > 0 || error) && styles.statusBad)}
        aria-live="polite"
      >
        {error || (busy ? "Đang chấm…" : "")}
        {!error &&
          !busy &&
          typing &&
          !openWrong &&
          turn.attempts === 0 &&
          (liveOn
            ? "Gõ xong mỗi từ bấm Space — từ đúng sáng xanh ngay."
            : "Gõ cả câu rồi bấm Enter để kiểm tra.")}
        {!error &&
          !busy &&
          typing &&
          !openWrong &&
          turn.attempts > 0 &&
          "Các từ xanh đã đúng. Sửa nốt rồi Enter."}
        {!error &&
          !busy &&
          typing &&
          openWrong > 0 &&
          `Còn ${openWrong} từ chưa đúng — gõ đè để viết lại từ đỏ, Backspace để sửa từng chữ.`}
        {!error &&
          blocked &&
          (turn.phase === "revealed"
            ? "Câu chưa đạt — gõ lại một lượt để mở câu kế."
            : "Từ Level 3, câu đạt nhờ gợi ý/từ khoá chưa mở câu kế — làm lại một lần không trợ giúp nhé.")}
      </p>

      {finishedTurn && (
        <AnswerPanel item={item} display={display} turn={turn} settings={settings} play={play} />
      )}

      <div className={styles.cardFoot}>
        {typing ? (
          <>
            <div className={styles.help}>
              <button
                type="button"
                onClick={() => hint(1)}
                disabled={busy}
                title={
                  known
                    ? "Hé chữ kế tiếp của từ đang gõ (Tab)"
                    : "Hé chữ cái đầu của từ sai đầu tiên (Tab)"
                }
              >
                <Lightbulb size={15} /> {known ? "Gợi ý chữ" : "Chữ cái đầu"}
              </button>
              <button
                type="button"
                onClick={() => hint(Infinity)}
                disabled={busy}
                title="Hé cả từ (Shift+Tab)"
              >
                <WandSparkles size={15} /> Hé cả từ
              </button>
              <button
                type="button"
                onClick={reveal}
                disabled={!canReveal}
                title={canReveal ? "Xem đáp án (Ctrl+Enter)" : "Hãy tự nộp thử một lần trước đã"}
              >
                <Eye size={15} /> Xem đáp án
              </button>
            </div>
            <button
              type="button"
              className={styles.cta}
              onClick={() => void submit()}
              disabled={busy}
            >
              Kiểm tra <kbd>Enter</kbd>
            </button>
          </>
        ) : (
          <>
            <div className={styles.help}>
              {!blocked && (
                <button type="button" onClick={onRetry}>
                  <RotateCcw size={15} /> Làm lại câu này
                </button>
              )}
            </div>
            <button type="button" className={styles.cta} onClick={primaryNext}>
              {nextLabel} <kbd>Enter</kbd>
            </button>
          </>
        )}
      </div>
    </article>
  );
}

interface WordSlotsProps {
  word: TargetWord;
  index: number;
  turn: Turn;
  hinted: Set<string>;
  caret: boolean;
  cue: boolean;
  onPick: () => void;
}

/** One word = one group of slots (never broken across lines). */
function WordSlots({ word, index, turn, hinted, caret, cue, onPick }: WordSlotsProps) {
  const typed = [...(turn.words[index] || "")];
  const mark = turn.marks[index];
  const reveal =
    turn.reveal?.[index] ||
    (turn.phase === "review" && turn.status === "revealed" ? turn.marks[index] : null);
  const showAnswer =
    turn.phase === "revealed" || (turn.phase === "review" && turn.status === "revealed");
  const isOk = !showAnswer && (turn.locked[index] || mark?.status === "ok");
  const cells = word.parts.map((part, j) => {
    if (!part.slot) {
      return (
        <span key={j} className={styles.punct}>
          {part.ch}
        </span>
      );
    }
    const k = part.idx ?? 0;
    const ch = typed[k] || "";
    let className = "";
    let shown = ch;
    if (showAnswer) {
      className = reveal?.answerMarks?.[k] ? styles.slotOk : styles.slotFixed;
    } else if (isOk) className = styles.slotOk;
    else if (mark)
      className = ch
        ? !mark.marks
          ? styles.slotTyped
          : mark.marks[k]
            ? styles.slotNear
            : styles.slotBad
        : styles.slotEmptyBad;
    else if (hinted.has(`${index}:${k}`)) className = styles.slotHint;
    else if (ch) className = styles.slotTyped;
    else if (cue && k === 0 && part.ch) {
      shown = part.ch;
      className = styles.slotCue;
    }
    const caretHere = caret && k === typed.length;
    return (
      <span
        key={j}
        className={cx(styles.slot, className, caretHere && styles.slotCaret)}
        style={showAnswer ? { animationDelay: `${(index * 3 + k) * 18}ms` } : undefined}
      >
        {shown}
      </span>
    );
  });
  const extra = typed.slice(word.size).map((ch, j) => (
    <span key={`x${j}`} className={cx(styles.slot, styles.slotExtra)}>
      {ch}
    </span>
  ));
  const caretAfter = caret && typed.length >= word.size;
  return (
    <span
      className={cx(
        styles.word,
        caret && styles.wordCurrent,
        isOk && styles.wordLocked,
        mark && mark.status !== "ok" && !showAnswer && styles.wordWrong,
      )}
      onMouseDown={(event) => {
        if (!turn.locked[index] && turn.phase === "typing") {
          event.preventDefault();
          onPick();
        }
      }}
    >
      {cells}
      {extra}
      {caretAfter && <span className={cx(styles.slot, styles.slotCaret, styles.slotGhost)} />}
    </span>
  );
}

interface AnswerPanelProps {
  item: PlayItem;
  display: string;
  turn: Turn;
  settings: PlaySettings;
  play: (kind?: AudioKind) => Promise<boolean>;
}

function AnswerPanel({ item, display, turn, settings, play }: AnswerPanelProps) {
  const notes = (item.notes || []).filter((note) => note.explanation);
  const phrases = notes.filter((note) => note.type === "Phrase");
  const shownNotes = (phrases.length ? phrases : notes).slice(0, 4);
  const mistakes = (turn.mistakes || []).filter((m) => m.expected);
  const verdict =
    turn.status === "clean"
      ? "Chính xác ngay lần đầu — câu sạch! 🎉"
      : turn.status === "passed"
        ? `Đạt sau ${turn.attempts} lần nộp${turn.hints ? ` · ${turn.hints} gợi ý` : ""}`
        : "Đáp án đây — đọc kỹ chữ cam (chỗ bạn nghe chưa ra)";
  return (
    <div className={styles.answer} data-answer="">
      <span className={styles.verdict}>{verdict}</span>
      <div className={styles.answerLine}>
        <strong>{display}</strong>
        <button type="button" onClick={() => void play("normal")} aria-label="Nghe lại">
          <Volume2 size={16} />
        </button>
        <button type="button" onClick={() => void play("slow")} aria-label="Nghe chậm">
          <Snail size={16} />
        </button>
      </div>
      {settings.showIpa && item.ipa && (
        <p className={styles.ipa}>{item.ipa.replace(/\/\s+\//g, " ")}</p>
      )}
      {mistakes.length > 0 && (
        <div className={styles.mistakes}>
          <span>Lần đầu bạn nghe:</span>
          {mistakes.slice(0, 6).map((m, i) => (
            <span key={i} className={styles.mistake}>
              <s>{m.typed || "(bỏ trống)"}</s> → <b>{m.expected}</b>
            </span>
          ))}
        </div>
      )}
      {shownNotes.length > 0 && (
        <details className={styles.notes}>
          <summary>Ghi chú ngữ pháp ({shownNotes.length})</summary>
          <ul>
            {shownNotes.map((note) => (
              <li key={note.id}>
                <b>{note.text}</b> {note.explanation}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
