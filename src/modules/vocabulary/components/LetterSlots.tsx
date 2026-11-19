import { isLetter, normalizeAnswer } from "../utils/study-session";
import styles from "./LetterSlots.module.css";

interface LetterSlotsProps {
  word: string;
  /** Character indexes shown as hints. */
  hints?: ReadonlySet<number>;
  /** Letters typed so far (shown in their slots). */
  typed?: string;
  /** Reveal every letter. */
  revealed?: boolean;
  /** With `revealed`: mark letters that differ from `typed`. */
  checkTyped?: boolean;
}

/** One underlined slot per letter; hints, typed letters and the reveal draw in the card colours. */
export function LetterSlots({
  word,
  hints,
  typed = "",
  revealed = false,
  checkTyped = false,
}: LetterSlotsProps) {
  const chars = Array.from(word);
  const typedChars = Array.from(typed);
  const letterCount = chars.filter(isLetter).length;
  const size = letterCount > 14 ? "tiny" : letterCount > 9 ? "small" : undefined;

  return (
    <div className={styles.slots} data-size={size} aria-label={`${letterCount} chữ cái`} role="img">
      {chars.map((char, index) => {
        if (char === " ") return <span key={index} className={styles.gap} />;
        if (!isLetter(char)) {
          return (
            <span key={index} className={styles.mark}>
              {char}
            </span>
          );
        }
        let shown = "";
        let state: string | undefined;
        if (revealed) {
          shown = char;
          state =
            checkTyped && normalizeAnswer(typedChars[index] ?? "") !== normalizeAnswer(char)
              ? "miss"
              : "shown";
        } else if (typedChars[index]) {
          shown = typedChars[index];
          state = "typed";
        } else if (hints?.has(index)) {
          shown = char;
          state = "hint";
        }
        return (
          <span
            key={index}
            className={styles.slot}
            data-state={state}
            style={revealed ? { animationDelay: `${index * 45}ms` } : undefined}
          >
            {shown}
          </span>
        );
      })}
    </div>
  );
}
