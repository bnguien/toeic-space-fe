import styles from "./LetterSlots.module.css";

interface LetterSlotsProps {
  word: string;
  /** Reveal the last letter (end of the countdown). */
  showLast?: boolean;
  /** Reveal every letter. */
  showAll?: boolean;
}

const isLetter = (char: string) => /\p{L}/u.test(char);

/** One slot per letter; the first letter is always hinted. */
export function LetterSlots({ word, showLast = false, showAll = false }: LetterSlotsProps) {
  const chars = Array.from(word);
  const letterIndexes = chars.flatMap((char, index) => (isLetter(char) ? [index] : []));
  const first = letterIndexes[0];
  const last = letterIndexes[letterIndexes.length - 1];

  return (
    <div className={styles.slots} aria-label={`${letterIndexes.length} chữ cái`} role="img">
      {chars.map((char, index) => {
        if (char === " ") return <span key={index} className={styles.gap} />;
        if (!isLetter(char)) {
          return (
            <span key={index} className={styles.mark}>
              {char}
            </span>
          );
        }
        const visible = showAll || index === first || (showLast && index === last);
        return (
          <span
            key={index}
            className={styles.slot}
            data-visible={visible || undefined}
            data-hint={(!showAll && visible) || undefined}
          >
            {visible ? char : ""}
          </span>
        );
      })}
    </div>
  );
}
