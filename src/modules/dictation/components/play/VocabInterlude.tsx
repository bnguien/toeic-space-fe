/**
 * One round of word learning in basic mode (Studychill VocabInterlude): a big intro overlay, then the Reel cards
 * of the vocabulary notebook (PBL-75 ReelCard over its background clips) with the words of the next 2–3 sentences.
 * Done / skipped → onDone() and the play screen shows the sentence.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PencilLine, RotateCcw } from "lucide-react";

import { cx } from "@/shared/components/ui";
import {
  cardThemeOf,
  createLocalStudyCard,
  DEFAULT_STUDY_SETTINGS,
  ReelCard,
  StudyBackdrop,
  useReelBackgrounds,
  type AnswerOptions,
  type PartOfSpeech,
  type ReviewGrade,
  type WordDto,
} from "@/modules/vocabulary";

import type { CourseVocabWordDto } from "../../types/dictation.types";
import { MASCOT } from "../../utils/mascot";
import { playSfx } from "../../utils/sfx";
import { toInterludeWords, type InterludeWord } from "../../utils/vocab-chunks";
import buttons from "./PlayButtons.module.css";
import theme from "./PlayTheme.module.css";
import styles from "./VocabInterlude.module.css";

const INTRO_MS = 2600;
/** How long a revealed card stays before the next one (PBL-75 Reel feedback time). */
const FEEDBACK_MS = 2500;
const PARTS_OF_SPEECH: PartOfSpeech[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "pronoun",
  "determiner",
  "interjection",
  "phrase",
];

const toWord = (word: InterludeWord, index: number): WordDto => ({
  id: `interlude-${index}-${word.word}`,
  headword: word.word,
  phonetic: word.ipa,
  partOfSpeech: (PARTS_OF_SPEECH as string[]).includes(word.partOfSpeech)
    ? (word.partOfSpeech as PartOfSpeech)
    : "other",
  meaningVi: word.meaning,
  definitionEn: "",
  example: "",
  exampleVi: "",
  cefr: "",
  synonyms: [],
});

export interface VocabInterludeProps {
  words: CourseVocabWordDto[];
  sentences?: number;
  onDone: () => void;
}

export function VocabInterlude({ words, sentences = 0, onDone }: VocabInterludeProps) {
  const cards = useMemo(() => toInterludeWords(words), [words]);
  const [phase, setPhase] = useState<"intro" | "reel">("intro");

  useEffect(() => {
    if (phase !== "intro") return undefined;
    const timer = setTimeout(() => setPhase("reel"), INTRO_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // A round without words reports done at once so the play screen never waits.
  useEffect(() => {
    if (!cards.length) onDone();
  }, [cards.length, onDone]);

  if (!cards.length) return null;
  if (phase === "reel") return <InterludeReel words={cards} onDone={onDone} />;
  return (
    <div
      className={styles.intro}
      role="dialog"
      aria-modal="true"
      aria-label="Học nhanh từ vựng"
      data-play-panel=""
    >
      <div className={styles.introInner}>
        <p className={styles.kicker}>Trước khi nghe & viết</p>
        <h1 className={styles.introTitle}>Học nhanh {cards.length} từ vựng sau</h1>
        <p className={styles.introSub}>
          {sentences > 1
            ? `Bạn sẽ gặp chúng ngay trong ${sentences} câu tiếp theo.`
            : "Bạn sẽ gặp chúng ngay trong câu tiếp theo."}
        </p>
        <div className={styles.meanings}>
          {cards.map((card) => (
            <span key={card.word}>{card.meaning}</span>
          ))}
        </div>
        <div className={styles.introActions}>
          <button type="button" className={styles.go} onClick={() => setPhase("reel")}>
            Bắt đầu
          </button>
          <button type="button" className={styles.skip} onClick={onDone}>
            Bỏ qua
          </button>
        </div>
        <i className={styles.timer} style={{ animationDuration: `${INTRO_MS}ms` }} />
      </div>
    </div>
  );
}

/** Reel cards of the round, then a short summary with "write the sentence" actions. */
function InterludeReel({ words, onDone }: { words: InterludeWord[]; onDone: () => void }) {
  const backgrounds = useReelBackgrounds(true);
  const [queue, setQueue] = useState(() =>
    words.map((word, i) => ({ key: `c${i}`, word: toWord(word, i) })),
  );
  const [index, setIndex] = useState(0);
  const [grades, setGrades] = useState<Record<string, ReviewGrade>>({});
  const done = index >= queue.length;
  const card = queue[index];

  useEffect(() => {
    if (done) playSfx("finish");
  }, [done]);

  const next = () => {
    setIndex((i) => i + 1);
    playSfx("swipe");
  };

  // The PBL-75 Reel card answers with `manual` (it advances itself after its feedback); otherwise move on after
  // Studychill's feedback delay.
  const answer = (grade: ReviewGrade, options?: AnswerOptions) => {
    const current = card;
    setGrades((all) =>
      all[current.word.headword] ? all : { ...all, [current.word.headword]: grade },
    );
    if (!options?.manual) setTimeout(next, options?.holdMs ?? FEEDBACK_MS);
  };

  const needWork = words.filter((w) => grades[w.word] === "Hard");
  const correct = Object.values(grades).filter((grade) => grade === "Good").length;
  const watched = Object.values(grades).filter((grade) => grade === "Seen").length;

  const restart = (list: InterludeWord[]) => {
    setQueue(list.map((word, i) => ({ key: `r${Date.now()}-${i}`, word: toWord(word, i) })));
    setIndex(0);
    setGrades({});
  };

  return (
    <div
      className={cx(theme.theme, styles.reel)}
      role="dialog"
      aria-modal="true"
      aria-label="Học nhanh từ vựng"
      data-play-panel=""
    >
      <header className={styles.reelTop}>
        <button type="button" className={styles.ghost} onClick={onDone}>
          <ArrowLeft size={16} /> Bỏ qua, viết câu
        </button>
        <div className={styles.reelTitle}>
          <strong>Học nhanh từ vựng</strong>
          <span>
            Tự nhớ · {Math.min(index + 1, queue.length)}/{queue.length} thẻ
          </span>
        </div>
        <span className={styles.reelScore}>
          ✓ {correct} · 👁 {watched}
        </span>
      </header>
      <div className={styles.reelProgress} aria-hidden="true">
        <i style={{ width: `${(Math.min(index, queue.length) / queue.length) * 100}%` }} />
      </div>

      {done ? (
        <section className={styles.reelFinish}>
          <img src={MASCOT.success} alt="Oysteic chúc mừng" />
          <h2>Hết bài · {words.length} từ</h2>
          <div className={styles.reelStats}>
            <div>
              <strong>{correct}</strong>
              <span>tự gõ đúng</span>
            </div>
            <div>
              <strong>{watched}</strong>
              <span>đã xem</span>
            </div>
            <div>
              <strong>{needWork.length}</strong>
              <span>cần ôn thêm</span>
            </div>
          </div>
          {needWork.length > 0 && (
            <div className={styles.reelWords}>
              {needWork.map((w) => (
                <span key={w.word}>
                  <b>{w.word}</b> {w.meaning}
                </span>
              ))}
            </div>
          )}
          <div className={buttons.actions}>
            {needWork.length > 0 && (
              <button
                type="button"
                className={cx(buttons.button, buttons.primary)}
                onClick={() => restart(needWork)}
              >
                <RotateCcw size={16} /> Học lại {needWork.length} từ chưa nhớ
              </button>
            )}
            <button type="button" className={buttons.button} onClick={onDone}>
              <PencilLine size={16} /> Viết câu ngay
            </button>
            <button type="button" className={buttons.button} onClick={onDone}>
              Vào viết câu
            </button>
          </div>
        </section>
      ) : (
        <div className={styles.reelStage}>
          <StudyBackdrop kind="video" backgrounds={backgrounds.data ?? []} scene={index} />
          <div className={styles.reelCard}>
            <ReelCard
              key={card.key}
              card={createLocalStudyCard({
                word: card.word,
                cardKey: card.key,
                position: index,
                onAnswer: answer,
                onAdvance: next,
              })}
              theme={cardThemeOf(card.word.headword)}
              settings={DEFAULT_STUDY_SETTINGS}
              autoPlay
            />
          </div>
        </div>
      )}
    </div>
  );
}
