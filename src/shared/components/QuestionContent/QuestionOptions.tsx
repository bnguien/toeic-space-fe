import { useId } from "react";
import { RichText } from "../RichText";
import styles from "./QuestionContent.module.css";

interface QuestionOptionsProps {
  part: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  variant?: "plain" | "cards";
  selected?: string | null;
  groupName?: string;
  onChange?: (answer: "A" | "B" | "C" | "D") => void;
  disabled?: boolean;
}

export function QuestionOptions({
  part,
  optionA,
  optionB,
  optionC,
  optionD,
  variant = "plain",
  selected,
  groupName,
  onChange,
  disabled,
}: QuestionOptionsProps) {
  const optionId = useId();
  // Part 2 has three options. Every other Part retains all four labelled slots,
  // including an explicit notice when the source has incomplete option content.
  const options = part === 2 ? [optionA, optionB, optionC] : [optionA, optionB, optionC, optionD];

  return (
    <ol
      className={styles.options}
      data-variant={variant}
      data-interactive={Boolean(onChange)}
      aria-label="Các lựa chọn trả lời"
      lang="en"
    >
      {options.map((option, index) => {
        const answer = (["A", "B", "C", "D"] as const)[index];
        const content = (
          <>
            <span className={styles.optionLabel}>{answer}.</span>
            <span className={styles.optionContent}>
              {option?.trim() ? (
                <RichText value={option} inline />
              ) : (
                <span className={styles.unavailable} lang="vi">
                  Chưa có nội dung đáp án.
                </span>
              )}
            </span>
          </>
        );
        return (
          <li key={answer} data-selected={Boolean(onChange) && selected === answer}>
            {onChange ? (
              <label className={styles.optionChoice}>
                <input
                  type="radio"
                  name={groupName ?? optionId}
                  checked={selected === answer}
                  disabled={disabled}
                  onChange={() => onChange(answer)}
                />
                {content}
              </label>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
