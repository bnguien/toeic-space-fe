import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button, Kbd } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { sfx } from "@/shared/utils/sfx";

import { speak, stopSpeaking } from "../utils/speech";
import { formatPartOfSpeechName } from "../utils/vocabulary-format";
import { CardColumns, CardExample, CardNote, CardSynonyms, CardWordLine } from "./CardParts";
import styles from "./FlashcardCard.module.css";
import { FlipCard } from "./FlipCard";
import { GradeBar } from "./GradeBar";
import { CardChip, StudyCard } from "./StudyCard";
import { StudyFrame } from "./StudyFrame";
import { StudyRail } from "./StudyRail";
import type { StudyModeProps } from "./StudySession";

/** Flashcard mode for one card; remount per card to reset the flip. */
export function FlashcardCard({ card, theme, settings, autoPlay }: StudyModeProps) {
  const { item } = card;
  const { word } = item;
  const [flipped, setFlipped] = useState(false);
  const meaningFront = settings.flashcardFront === "meaning";

  useEffect(() => {
    if (!autoPlay || meaningFront) return;
    speak(word.headword, "en-US");
    return stopSpeaking;
  }, [word.headword, autoPlay, meaningFront]);

  const flip = () => {
    if (!flipped) {
      sfx.play("reveal");
      if (autoPlay && meaningFront) speak(word.headword, "en-US");
    }
    setFlipped(!flipped);
  };

  const listen = () => {
    if (meaningFront && !flipped) speak(word.meaningVi, "vi-VN");
    else speak(word.headword, "en-US");
  };

  useHotkeys((event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      flip();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      listen();
    }
  }, !card.paused);

  const chips = (
    <>
      <CardChip>{formatPartOfSpeechName(word.partOfSpeech)}</CardChip>
      {word.cefr && <CardChip>{word.cefr}</CardChip>}
    </>
  );

  const front = (
    <StudyCard theme={theme} cardStyle={settings.cardStyle} head={chips}>
      {meaningFront ? (
        <p className={styles.frontMeaning}>{word.meaningVi}</p>
      ) : (
        <CardWordLine word={word} size="lg" />
      )}
    </StudyCard>
  );

  const back = (
    <StudyCard theme={theme} cardStyle={settings.cardStyle} head={chips}>
      <CardColumns
        start={
          <>
            <CardWordLine word={word} />
            <p className={styles.meaning}>{word.meaningVi}</p>
            {word.definitionEn && (
              <p className={styles.definition} lang="en">
                {word.definitionEn}
              </p>
            )}
          </>
        }
        end={
          <>
            {settings.showExample && <CardExample word={word} />}
            <CardSynonyms synonyms={word.synonyms} />
            <CardNote note={word.note} />
          </>
        }
      />
    </StudyCard>
  );

  return (
    <StudyFrame
      rail={<StudyRail word={word} savedWordId={item.savedWordId} onAudio={listen} />}
      footer={
        flipped ? (
          <GradeBar
            preview={card.preview}
            onGrade={(grade) => card.answer(grade)}
            disabled={card.saving || card.paused}
          />
        ) : (
          <Button
            variant="primary"
            size="lg"
            block
            icon={<RefreshCw size={18} />}
            trailing={<Kbd inverted>Space</Kbd>}
            onClick={flip}
          >
            Lật thẻ
          </Button>
        )
      }
    >
      <FlipCard flipped={flipped} onFlip={flip} front={front} back={back} />
    </StudyFrame>
  );
}
