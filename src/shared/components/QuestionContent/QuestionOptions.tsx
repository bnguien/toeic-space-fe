import { RichText } from "../RichText";
import styles from "./QuestionContent.module.css";

interface QuestionOptionsProps {
  part: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string | null;
  variant?: "plain" | "cards";
}

export function QuestionOptions({
  part,
  optionA,
  optionB,
  optionC,
  optionD,
  variant = "plain",
}: QuestionOptionsProps) {
  // Part 2 has three options. Every other Part retains all four labelled slots,
  // including an explicit notice when the source has incomplete option content.
  const options = part === 2 ? [optionA, optionB, optionC] : [optionA, optionB, optionC, optionD];

  return (
    <ol
      className={styles.options}
      data-variant={variant}
      aria-label="Các lựa chọn trả lời"
      lang="en"
    >
      {options.map((option, index) => (
        <li key={index}>
          <span className={styles.optionLabel}>{String.fromCharCode(65 + index)}.</span>
          <div className={styles.optionContent}>
            {option?.trim() ? (
              <RichText value={option} inline />
            ) : (
              <span className={styles.unavailable} lang="vi">
                Chưa có nội dung đáp án.
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
