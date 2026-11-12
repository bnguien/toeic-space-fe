import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, Check, Keyboard, Volume2, X } from "lucide-react";

import { Button, Kbd } from "@/shared/components/ui";
import { useCountdown } from "@/shared/hooks/useCountdown";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { sfx, tickGapMs } from "@/shared/utils/sfx";

import type { ReviewGrade } from "../types/vocabulary.types";
import { speak, stopSpeaking } from "../utils/speech";
import { hintIndexes, reelGrade } from "../utils/study-session";
import { formatPartOfSpeechName } from "../utils/vocabulary-format";
import {
  CardAudio,
  CardColumns,
  CardExample,
  CardNote,
  CardVerdictLabel,
  PauseCover,
} from "./CardParts";
import { CountdownRing } from "./CountdownRing";
import { LetterSlots } from "./LetterSlots";
import styles from "./ReelCard.module.css";
import { CardChip, StudyCard } from "./StudyCard";
import { StudyFrame } from "./StudyFrame";
import { StudyRail } from "./StudyRail";
import type { StudyModeProps } from "./StudySession";

type Phase = "listen" | "typing" | "reveal";

/** How long the revealed answer stays before the next card (pausing holds it). */
const REVEAL_HOLD_MS: Partial<Record<ReviewGrade, number>> = {
  Good: 1700,
  Forget: 3200,
  Seen: 2400,
};
/** Progressive hint: the last letters appear once this share of the time has passed. */
const LAST_LETTER_AT = 0.55;

/**
 * Reel: the Vietnamese meaning, empty letter slots and a ticking countdown. Space opens the
 * answer field (the clock stops while typing); time-up reveals the word. The answer stays on
 * the card for a moment, then the next card comes in. Remount per card.
 */
export function ReelCard({ card, theme, settings, autoPlay }: StudyModeProps) {
  const { item } = card;
  const { word } = item;
  const [readMeaning] = useState(settings.speakMeaning);
  const [ready, setReady] = useState(!readMeaning);
  const [phase, setPhase] = useState<Phase>("listen");
  const [typed, setTyped] = useState("");
  const [grade, setGrade] = useState<ReviewGrade | null>(null);
  const [shake, setShake] = useState(false);
  const durationMs = settings.reelSeconds * 1000;

  // Read the meaning first; the clock starts when it ends.
  useEffect(() => {
    if (!readMeaning) return;
    let settled = false;
    const start = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };
    const started = speak(word.meaningVi, "vi-VN", { onEnd: start });
    const fallback = window.setTimeout(start, started ? 6000 : 0);
    return () => {
      settled = true;
      window.clearTimeout(fallback);
      stopSpeaking();
    };
  }, [readMeaning, word.meaningVi]);

  const reveal = (answer: string | null) => {
    if (phase === "reveal") return;
    const result = reelGrade(answer, word.headword);
    setGrade(result);
    setPhase("reveal");
    if (result === "Good") sfx.play("correct");
    else if (result === "Forget") {
      sfx.play("wrong");
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    } else sfx.play("timeUp");
    if (autoPlay) {
      speak(word.headword, "en-US", {
        onEnd: () => {
          if (settings.speakMeaning) speak(word.meaningVi, "vi-VN");
        },
      });
    }
    card.answer(result, { manual: true });
  };

  const timer = useCountdown(durationMs, {
    running: phase === "listen" && ready && !card.paused,
    onDone: () => reveal(null),
    onBeat: (progress, alt) => sfx.play("tick", { intensity: progress, alt }),
    beatGap: tickGapMs,
  });

  useCountdown((grade && REVEAL_HOLD_MS[grade]) ?? 0, {
    running: phase === "reveal" && !card.paused,
    onDone: card.advance,
  });

  const startTyping = () => {
    if (phase !== "listen" || card.paused) return;
    stopSpeaking();
    setReady(true);
    setPhase("typing");
  };

  const listen = () => {
    if (phase === "reveal") speak(word.headword, "en-US");
    else speak(word.meaningVi, "vi-VN");
  };

  useHotkeys(
    (event) => {
      const key = event.key.toLowerCase();
      if (event.key === " " || event.key === "Enter" || key === "arrowdown") {
        event.preventDefault();
        if (phase === "listen") startTyping();
        else if (phase === "reveal") card.advance();
      } else if (key === "r") {
        event.preventDefault();
        listen();
      }
    },
    !card.paused && phase !== "typing",
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (typed.trim()) reveal(typed);
  };

  const handleInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    sfx.forKey(event.nativeEvent);
    if (event.key === "Escape") {
      event.preventDefault();
      setTyped("");
      setPhase("listen");
    }
  };

  const hints =
    phase === "reveal"
      ? undefined
      : hintIndexes(word.headword, {
          first: settings.hintFirstLetter,
          last: settings.hintProgressive && timer.progress >= LAST_LETTER_AT,
        });

  const verdict = grade === "Good" ? "correct" : grade === "Forget" ? "wrong" : null;

  const footer =
    phase === "typing" ? (
      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.input}
          value={typed}
          maxLength={word.headword.length + 4}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={handleInputKey}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Từ tiếng Anh"
          lang="en"
        />
        <Button type="submit" variant="primary" size="lg" disabled={!typed.trim()}>
          Kiểm tra
        </Button>
      </form>
    ) : phase === "reveal" ? (
      <Button
        variant="primary"
        size="lg"
        block
        icon={<ArrowDown size={18} />}
        trailing={<Kbd inverted>Space</Kbd>}
        onClick={card.advance}
      >
        Tiếp
      </Button>
    ) : (
      <Button
        variant="primary"
        size="lg"
        block
        icon={<Keyboard size={18} />}
        trailing={<Kbd inverted>Space</Kbd>}
        disabled={card.paused}
        onClick={startTyping}
      >
        Nhập từ
      </Button>
    );

  return (
    <StudyFrame
      className={styles.frame}
      rail={
        <StudyRail
          word={word}
          savedWordId={item.savedWordId}
          onAudio={listen}
          pause={{
            paused: card.userPaused,
            onToggle: card.togglePause,
            disabled: phase === "reveal",
          }}
        />
      }
      footer={footer}
    >
      <StudyCard
        theme={theme}
        cardStyle={settings.cardStyle}
        verdict={verdict}
        shake={shake}
        head={<CardChip>{formatPartOfSpeechName(word.partOfSpeech)}</CardChip>}
      >
        <CardColumns
          start={
            <>
              <p className={styles.meaning}>{word.meaningVi}</p>
              <LetterSlots
                word={word.headword}
                hints={hints}
                typed={phase === "typing" || grade === "Forget" ? typed : ""}
                revealed={phase === "reveal"}
                checkTyped={grade === "Forget"}
              />
              {phase === "listen" &&
                (ready ? (
                  <CountdownRing
                    remaining={timer.remaining}
                    progress={timer.progress}
                    paused={card.paused}
                    ending={timer.progress >= LAST_LETTER_AT}
                  />
                ) : (
                  <span className={styles.speaking} aria-label="Đang đọc nghĩa">
                    <Volume2 size={22} />
                  </span>
                ))}
              {phase === "reveal" && (
                <div className={styles.answerLine}>
                  {grade === "Good" && (
                    <CardVerdictLabel tone="ok" icon={<Check size={14} />}>
                      Đúng
                    </CardVerdictLabel>
                  )}
                  {grade === "Forget" && (
                    <CardVerdictLabel tone="bad" icon={<X size={14} />}>
                      <s>{typed.trim()}</s>
                    </CardVerdictLabel>
                  )}
                  {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
                  <CardAudio text={word.headword} />
                </div>
              )}
            </>
          }
          end={
            phase === "reveal" && (
              <>
                {settings.showExample && <CardExample word={word} />}
                <CardNote note={word.note} />
              </>
            )
          }
        />
      </StudyCard>
      {card.userPaused && phase === "listen" && <PauseCover onResume={card.togglePause} />}
    </StudyFrame>
  );
}
