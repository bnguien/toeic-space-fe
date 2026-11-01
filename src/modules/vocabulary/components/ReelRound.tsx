import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Check, Pause, Play, X } from "lucide-react";

import { Badge, Button, IconButton, Kbd } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";

import { useCountdown } from "../hooks/useCountdown";
import type { ReviewGrade, WordDto } from "../types/vocabulary.types";
import { speak, stopSpeaking } from "../utils/speech";
import { reelGrade } from "../utils/study-session";
import { formatPartOfSpeech } from "../utils/vocabulary-format";
import { CountdownRing } from "./CountdownRing";
import { LetterSlots } from "./LetterSlots";
import styles from "./ReelRound.module.css";

const REEL_DURATION_MS = 5000;
/** The last letter appears for the final stretch of the countdown. */
const LAST_LETTER_AT_MS = 3800;

type Phase = "listen" | "typing" | "reveal";

interface ReelRoundProps {
  word: WordDto;
  onAnswer: (grade: ReviewGrade) => void;
  /** Shown with the revealed word (e.g. the save toggle). */
  revealExtra?: ReactNode;
}

const RESULT_BADGE: Partial<Record<ReviewGrade, { label: string; tone: "green" | "rose" }>> = {
  Good: { label: "Đúng", tone: "green" },
  Hard: { label: "Sai", tone: "rose" },
};

/** One Reel prompt; remount per card to restart the countdown. */
export function ReelRound({ word, onAnswer, revealExtra }: ReelRoundProps) {
  const [phase, setPhase] = useState<Phase>("listen");
  const [paused, setPaused] = useState(false);
  const [typed, setTyped] = useState("");
  const [grade, setGrade] = useState<ReviewGrade | null>(null);

  const reveal = (answer: string | null) => {
    const result = reelGrade(answer, word.headword);
    setGrade(result);
    setPhase("reveal");
    speak(word.headword, "en-US");
    onAnswer(result);
  };

  const elapsed = useCountdown(REEL_DURATION_MS, phase === "listen" && !paused, () => reveal(null));

  useEffect(() => {
    speak(word.meaningVi, "vi-VN");
    return stopSpeaking;
  }, [word.meaningVi]);

  const openInput = (initial = "") => {
    if (phase !== "listen") return;
    setPaused(false);
    setTyped(initial);
    setPhase("typing");
  };

  const togglePause = () => {
    if (phase !== "listen") return;
    if (!paused) stopSpeaking();
    setPaused((value) => !value);
  };

  useHotkeys((event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      togglePause();
    } else if (event.key === " ") {
      event.preventDefault();
      if (paused) togglePause();
      else openInput();
    } else if (!paused && /^\p{L}$/u.test(event.key)) {
      event.preventDefault();
      openInput(event.key);
    }
  }, phase === "listen");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (typed.trim()) reveal(typed);
  };

  const cancelInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setPhase("listen");
    }
  };

  const badge = grade ? RESULT_BADGE[grade] : undefined;

  return (
    <div className={styles.round}>
      <div className={styles.toolbar}>
        <CountdownRing
          elapsed={phase === "reveal" ? REEL_DURATION_MS : elapsed}
          duration={REEL_DURATION_MS}
          paused={paused || phase === "typing"}
        />
        <IconButton
          label={paused ? "Tiếp tục" : "Tạm dừng"}
          variant="secondary"
          onClick={togglePause}
          disabled={phase !== "listen"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </IconButton>
      </div>

      <div className={styles.panel}>
        <div className={styles.meaningRow}>
          <Badge tone="blue">{formatPartOfSpeech(word.partOfSpeech)}</Badge>
          <p className={styles.meaning}>{word.meaningVi}</p>
        </div>

        <LetterSlots
          word={word.headword}
          showLast={elapsed >= LAST_LETTER_AT_MS}
          showAll={phase === "reveal"}
        />

        {phase === "reveal" && (
          <div className={styles.reveal}>
            {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
            {badge && (
              <Badge
                tone={badge.tone}
                size="md"
                icon={badge.tone === "green" ? <Check size={14} /> : <X size={14} />}
              >
                {badge.label}
              </Badge>
            )}
            {grade === "Hard" && <s className={styles.typed}>{typed}</s>}
            {revealExtra}
          </div>
        )}

        {phase === "typing" && (
          <form className={styles.form} onSubmit={submit}>
            <input
              className={styles.input}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={cancelInput}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Từ tiếng Anh"
              lang="en"
            />
            <Button type="submit" variant="primary" disabled={!typed.trim()}>
              OK
            </Button>
          </form>
        )}

        {phase === "listen" && (
          <Button
            variant="secondary"
            onClick={() => openInput()}
            disabled={paused}
            trailing={<Kbd>Space</Kbd>}
          >
            Nhập từ
          </Button>
        )}
      </div>
    </div>
  );
}
