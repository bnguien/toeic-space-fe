import { useState } from "react";
import { ArrowDown, Check, Timer, X } from "lucide-react";

import { Kbd } from "@/shared/components/ui";
import { useCountdown } from "@/shared/hooks/useCountdown";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { sfx, tickGapMs } from "@/shared/utils/sfx";

import type { QuizQuestionDto } from "../types/vocabulary.types";
import { speak } from "../utils/speech";
import { formatPartOfSpeechName } from "../utils/vocabulary-format";
import {
  CardAction,
  CardColumns,
  CardExample,
  CardNote,
  CardVerdictLabel,
  CardWordLine,
  PauseCover,
} from "./CardParts";
import { CountdownRing } from "./CountdownRing";
import styles from "./QuizCard.module.css";
import { CardChip, StudyCard } from "./StudyCard";
import { StudyFrame } from "./StudyFrame";
import { StudyRail } from "./StudyRail";
import type { StudyModeProps } from "./StudySession";

/** Correct answers move on by themselves after this pause. */
const CORRECT_HOLD_MS = 1300;
const TIMEOUT = "timeout";
/** Longer options stack one per row; longer prompts use a smaller size. */
const LONG_OPTION = 14;
const LONG_PROMPT = 60;

type OptionState = "idle" | "correct" | "wrong" | "dim";

interface QuizCardProps extends StudyModeProps {
  question: QuizQuestionDto;
}

/**
 * Meaning prompt and four headword options on one card, timed by `quizSeconds` (0 = no timer).
 * Portrait: prompt above, options below; landscape: prompt left, options right. A wrong pick or
 * a timeout counts as Forget and leaves the right word, its example and note on the card (only
 * the picked and the right option stay) until the learner continues. Remount per card.
 */
export function QuizCard({ card, theme, settings, autoPlay, question }: QuizCardProps) {
  const { item } = card;
  const { word } = item;
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const answered = picked !== null;
  const correct = picked === question.wordId;
  const durationMs = settings.quizSeconds * 1000;
  const timed = durationMs > 0;
  const options = question.options.slice(0, 4);
  const longOptions = options.some((option) => option.headword.length > LONG_OPTION);

  const finish = (choice: string) => {
    if (answered || card.saving) return;
    setPicked(choice);
    if (choice === question.wordId) {
      sfx.play("correct");
      card.answer("Good", { manual: true });
    } else {
      sfx.play(choice === TIMEOUT ? "timeUp" : "wrong");
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      card.answer("Forget", { manual: true });
    }
    if (autoPlay) speak(word.headword, "en-US");
  };

  const timer = useCountdown(durationMs, {
    running: timed && !answered && !card.paused,
    onDone: () => finish(TIMEOUT),
    onBeat: (progress, alt) => sfx.play("tick", { intensity: progress, alt }),
    beatGap: tickGapMs,
  });

  // A correct answer moves on by itself; pausing holds it.
  useCountdown(CORRECT_HOLD_MS, {
    running: answered && correct && !card.paused,
    onDone: card.advance,
  });

  const listen = () => {
    if (answered) speak(word.headword, "en-US");
    else speak(word.meaningVi, "vi-VN");
  };

  useHotkeys((event) => {
    const key = event.key.toLowerCase();
    const index = Number(event.key) - 1;
    if (!answered && index >= 0 && index < options.length) {
      event.preventDefault();
      finish(options[index].wordId);
    } else if (answered && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      card.advance();
    } else if (key === "r") {
      event.preventDefault();
      listen();
    }
  }, !card.paused);

  const stateOf = (wordId: string): OptionState => {
    if (!answered) return "idle";
    if (wordId === question.wordId) return "correct";
    if (wordId === picked) return "wrong";
    return "dim";
  };

  const verdict = answered ? (correct ? "correct" : "wrong") : null;
  // Feedback keeps only the picked and the right option, so the cue fits on the card.
  const shown = answered ? options.filter((option) => stateOf(option.wordId) !== "dim") : options;

  return (
    <StudyFrame
      rail={
        <StudyRail
          word={word}
          savedWordId={item.savedWordId}
          onAudio={listen}
          pause={
            timed
              ? { paused: card.userPaused, onToggle: card.togglePause, disabled: answered }
              : undefined
          }
        />
      }
    >
      <StudyCard
        theme={theme}
        cardStyle={settings.cardStyle}
        verdict={verdict}
        shake={shake}
        head={<CardChip>{formatPartOfSpeechName(word.partOfSpeech)}</CardChip>}
        foot={
          answered && !correct ? (
            <CardAction
              icon={<ArrowDown size={16} />}
              hotkey="Space"
              autoFocus
              onClick={card.advance}
            >
              Tiếp tục
            </CardAction>
          ) : undefined
        }
      >
        <CardColumns
          start={
            <div className={styles.ask}>
              <p
                className={styles.prompt}
                data-answered={answered || undefined}
                data-long={word.meaningVi.length > LONG_PROMPT || undefined}
              >
                {word.meaningVi}
              </p>
              {!answered && timed && (
                <CountdownRing
                  remaining={timer.remaining}
                  progress={timer.progress}
                  paused={card.paused}
                  ending={timer.progress >= 0.55}
                />
              )}
              {answered && (
                <>
                  <CardVerdictLabel
                    tone={correct ? "ok" : "bad"}
                    icon={
                      correct ? (
                        <Check size={14} />
                      ) : picked === TIMEOUT ? (
                        <Timer size={14} />
                      ) : (
                        <X size={14} />
                      )
                    }
                  >
                    {correct ? "Đúng" : picked === TIMEOUT ? "Hết giờ" : "Sai"}
                  </CardVerdictLabel>
                  <CardWordLine word={word} size={correct ? "lg" : "md"} />
                  {!correct && settings.showExample && <CardExample word={word} />}
                  {!correct && <CardNote note={word.note} />}
                </>
              )}
            </div>
          }
          end={
            <div
              className={styles.options}
              data-stacked={longOptions || undefined}
              role="group"
              aria-label="Đáp án"
            >
              {shown.map((option) => {
                const state = stateOf(option.wordId);
                return (
                  <button
                    key={option.wordId}
                    type="button"
                    className={styles.option}
                    data-state={state}
                    disabled={answered || card.saving || card.paused}
                    aria-pressed={picked === option.wordId}
                    onClick={() => finish(option.wordId)}
                  >
                    <Kbd>{options.indexOf(option) + 1}</Kbd>
                    <span className={styles.headword} lang="en">
                      {option.headword}
                    </span>
                    {state === "correct" && <Check size={18} aria-label="Đúng" />}
                    {state === "wrong" && <X size={18} aria-label="Sai" />}
                  </button>
                );
              })}
            </div>
          }
        />
      </StudyCard>
      {card.userPaused && !answered && <PauseCover onResume={card.togglePause} />}
    </StudyFrame>
  );
}
