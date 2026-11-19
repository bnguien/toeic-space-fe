/**
 * "Học từ vựng" of a grammar topic. Studychill ran its notebook Reel (NotebookReel) on the topic's words; TOEIC Space
 * runs the PBL-75 study cards on them instead — Reel ("Tự nhớ": hear the Vietnamese meaning → 5 s to recall the word
 * with letter hints → the word is spoken → next card) and Quiz ("Trắc nghiệm": meaning → pick 1 of 4 words).
 * PBL-75 sessions are stored on the server and keyed by official word ids, which grammar words do not have, so this
 * round is local: nothing is graded into the spaced-repetition schedule (as for Studychill guests). A word answered
 * wrong comes back 4 cards later (once); the end screen mirrors NotebookReel (first verdict per word). Full-screen layer rendered through a portal so the scrolling lesson column never
 * clips it; the end screen reports back (`onDone` / `onShowList`) so the page suggests "Đã học qua các từ".
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PencilLine, RotateCcw, X } from "lucide-react";

import {
  cardThemeOf,
  createLocalStudyCard,
  DEFAULT_STUDY_SETTINGS,
  QuizCard,
  ReelCard,
  StudyBackdrop,
  useReelBackgrounds,
  type AnswerOptions,
  type PartOfSpeech,
  type QuizQuestionDto,
  type ReviewGrade,
  type WordDto,
} from "@/modules/vocabulary";
import { Button, IconButton, ProgressBar } from "@/shared/components/ui";

import type { GrammarVocabEntry } from "../../types/vocab.types";
import { sticker } from "../../utils/grammar-assets";
import { pad2 } from "../../utils/grammar-text";
import styles from "./GrammarReel.module.css";

export type ReelKind = "recall" | "quiz";

const QUIZ_FEEDBACK_MS = 1200;
const REEL_FEEDBACK_MS = 2500;
const REQUEUE_GAP = 4;

/** vocab.json part of speech → PBL-75 part of speech. */
const POS: Record<string, PartOfSpeech> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  prep: "preposition",
  conj: "conjunction",
  pron: "pronoun",
  det: "determiner",
  phrase: "phrase",
};

const toWord = (e: GrammarVocabEntry): WordDto => ({
  id: e.id,
  headword: e.word,
  phonetic: e.ipa || "",
  partOfSpeech: POS[e.partOfSpeech] || "other",
  meaningVi: e.meaning,
  definitionEn: "",
  example: e.example?.sentence || "",
  exampleVi: e.example?.translation || "",
  cefr: e.level || "",
  synonyms: [],
});

/** Small deterministic PRNG (mulberry32) so a card's options stay put across renders. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Meaning prompt + the answer and 3 other words of the topic (same part of speech first), shuffled. */
function quizFor(entries: GrammarVocabEntry[], index: number, seed: number): QuizQuestionDto {
  const answer = entries[index];
  const rand = seeded(seed);
  const others = entries.filter(
    (e, i) => i !== index && !sameText(e.word, answer.word) && !sameText(e.meaning, answer.meaning),
  );
  const samePos = shuffle(
    others.filter((e) => e.partOfSpeech === answer.partOfSpeech),
    rand,
  );
  const rest = shuffle(
    others.filter((e) => e.partOfSpeech !== answer.partOfSpeech),
    rand,
  );
  const picked: GrammarVocabEntry[] = [];
  for (const e of [...samePos, ...rest]) {
    if (picked.length === 3) break;
    if (!picked.some((p) => sameText(p.word, e.word))) picked.push(e);
  }
  return {
    wordId: answer.id,
    prompt: answer.meaning,
    partOfSpeech: POS[answer.partOfSpeech] || "other",
    options: shuffle([answer, ...picked], rand).map((e) => ({
      wordId: e.id,
      headword: e.word,
    })) as QuizQuestionDto["options"],
  };
}

type Verdict = "correct" | "wrong" | "watched";

/** PBL-75 grade → NotebookReel verdict (Good = typed / picked right, Seen = time ran out, else wrong). */
const verdictOf = (grade: ReviewGrade): Verdict =>
  grade === "Good" || grade === "Easy" ? "correct" : grade === "Seen" ? "watched" : "wrong";

interface RoundState {
  run: number;
  /** Entry indexes in study order, re-queued cards included. */
  queue: number[];
  position: number;
  requeued: number[];
  /** Verdict of the first meeting of each entry (statistics). */
  first: Record<number, Verdict>;
}

const freshRound = (indexes: number[], run: number): RoundState => ({
  run,
  queue: indexes,
  position: 0,
  requeued: [],
  first: {},
});

export interface GrammarReelProps {
  entries: GrammarVocabEntry[];
  number: number;
  kind: ReelKind;
  /** "Về chuyên đề" (leave mid-round). */
  onClose: () => void;
  /** "Về bài học" on the end screen. */
  onDone: () => void;
  /** "Xem danh sách từ" on the end screen. */
  onShowList: () => void;
}

export function GrammarReel({
  entries,
  number: topicNum,
  kind,
  onClose,
  onDone,
  onShowList,
}: GrammarReelProps) {
  const [round, setRound] = useState<RoundState>(() =>
    freshRound(
      entries.map((_, i) => i),
      1,
    ),
  );
  /** Grade of the answered card on screen, kept until the learner continues (or the feedback delay ends). */
  const [pending, setPending] = useState<{
    grade: ReviewGrade;
    autoAdvanceMs: number | null;
  } | null>(null);
  const holding = pending !== null;
  const backgrounds = useReelBackgrounds(kind === "recall");

  const total = round.queue.length;
  const finished = round.position >= total;
  const index = finished ? -1 : round.queue[round.position];
  const entry = index >= 0 ? entries[index] : null;
  const cardKey = `${round.run}-${round.position}`;

  /** Records the first verdict of the card on screen, requeues a wrong one once and moves on. */
  const commit = (grade: ReviewGrade) => {
    setPending(null);
    setRound((r) => {
      const at = r.queue[r.position];
      const queue = [...r.queue];
      const requeued = [...r.requeued];
      const verdict = verdictOf(grade);
      if (verdict === "wrong" && !requeued.includes(at)) {
        queue.splice(Math.min(r.position + 1 + REQUEUE_GAP, queue.length), 0, at);
        requeued.push(at);
      }
      const first = at in r.first ? r.first : { ...r.first, [at]: verdict };
      return { ...r, queue, requeued, first, position: r.position + 1 };
    });
  };

  // An answer without `manual` moves on by itself after the feedback delay of the mode.
  useEffect(() => {
    if (!pending || pending.autoAdvanceMs === null) return undefined;
    const grade = pending.grade;
    const timer = window.setTimeout(() => commit(grade), pending.autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [pending]);

  // The PBL-75 study cards answer with `manual` and call `advance` once the learner continues.
  const answer = (grade: ReviewGrade, options: AnswerOptions | undefined, holdMs: number) => {
    if (holding) return;
    setPending({ grade, autoAdvanceMs: options?.manual ? null : (options?.holdMs ?? holdMs) });
  };

  const advance = () => {
    if (pending) commit(pending.grade);
  };

  const restartWith = (indexes: number[]) => {
    setPending(null);
    setRound((r) => freshRound(indexes, r.run + 1));
  };

  const studied = [...new Set(round.queue)];
  const verdicts = Object.values(round.first);
  const correctCount = verdicts.filter((v) => v === "correct").length;
  const watchedCount = verdicts.filter((v) => v === "watched").length;
  const needWork = studied.filter((i) => round.first[i] === "wrong");
  const notTyped = studied.filter((i) => round.first[i] === "watched");

  const host =
    (typeof document !== "undefined" &&
      document.querySelector<HTMLElement>("[data-grammar-root]")) ||
    document.body;

  return createPortal(
    <div
      className={styles.shell}
      role="dialog"
      aria-modal="true"
      aria-label={`Từ vựng · Chuyên đề ${pad2(topicNum)}`}
    >
      <header className={styles.bar}>
        <IconButton label="Về chuyên đề" onClick={onClose}>
          <X size={20} />
        </IconButton>
        <span className={styles.title}>Từ vựng · Chuyên đề {pad2(topicNum)}</span>
        <ProgressBar
          className={styles.progress}
          value={finished ? total : round.position}
          max={Math.max(total, 1)}
          tone={finished ? "green" : "blue"}
          label="Tiến độ"
        />
        <span className={styles.count}>
          {Math.min(round.position + 1, total)}/{total}
        </span>
        <IconButton
          label="Làm lại từ đầu"
          onClick={() => restartWith(entries.map((_, i) => i))}
          disabled={holding || (round.position === 0 && !finished)}
        >
          <RotateCcw size={18} />
        </IconButton>
      </header>

      <div className={styles.stage}>
        {entry ? (
          kind === "quiz" ? (
            <QuizCard
              key={cardKey}
              card={createLocalStudyCard({
                word: toWord(entry),
                cardKey,
                position: round.position,
                onAnswer: (grade, options) => answer(grade, options, QUIZ_FEEDBACK_MS),
                onAdvance: advance,
              })}
              theme={cardThemeOf(entry.word)}
              settings={DEFAULT_STUDY_SETTINGS}
              autoPlay={false}
              question={quizFor(entries, index, round.run * 7919 + round.position)}
            />
          ) : (
            <>
              <StudyBackdrop
                kind="video"
                backgrounds={backgrounds.data ?? []}
                scene={round.position}
              />
              <div className={styles.cardLayer}>
                <ReelCard
                  key={cardKey}
                  card={createLocalStudyCard({
                    word: toWord(entry),
                    cardKey,
                    position: round.position,
                    onAnswer: (grade, options) => answer(grade, options, REEL_FEEDBACK_MS),
                    onAdvance: advance,
                  })}
                  theme={cardThemeOf(entry.word)}
                  settings={DEFAULT_STUDY_SETTINGS}
                  autoPlay
                />
              </div>
            </>
          )
        ) : (
          <section className={styles.summary} aria-labelledby="grammar-reel-done">
            <img className={styles.image} src={sticker("celebrate")} alt="Oysteic chúc mừng" />
            <h2 id="grammar-reel-done" className={styles.doneTitle}>
              Hết bài · {studied.length} từ
            </h2>
            <div className={styles.stats}>
              <div>
                <strong>{correctCount}</strong>
                <span>{kind === "quiz" ? "chọn đúng" : "tự gõ đúng"}</span>
              </div>
              <div>
                <strong>{watchedCount}</strong>
                <span>đã xem</span>
              </div>
              <div>
                <strong>{needWork.length}</strong>
                <span>cần ôn thêm</span>
              </div>
            </div>
            {needWork.length > 0 && (
              <div className={styles.words}>
                {needWork.map((i) => (
                  <span key={entries[i].id}>
                    <b lang="en">{entries[i].word}</b> {entries[i].meaning}
                  </span>
                ))}
              </div>
            )}
            <div className={styles.actions}>
              {needWork.length > 0 && (
                <Button
                  variant="primary"
                  icon={<RotateCcw size={16} />}
                  onClick={() => restartWith(needWork)}
                >
                  Học lại {needWork.length} từ chưa nhớ
                </Button>
              )}
              {notTyped.length > 0 && (
                <Button onClick={() => restartWith(notTyped)}>
                  Thử tự gõ {notTyped.length} từ mới chỉ xem
                </Button>
              )}
              <Button icon={<PencilLine size={16} />} onClick={onShowList}>
                Xem danh sách từ
              </Button>
              <Button variant="ghost" onClick={onDone}>
                Về bài học
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>,
    host,
  );
}
