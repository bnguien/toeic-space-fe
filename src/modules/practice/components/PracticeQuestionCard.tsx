import { FileText, Headphones, Image as ImageIcon } from "lucide-react";
import { DIFFICULTY_LABELS, PART_NAMES, type Question } from "@/modules/admin";
import { mediaUrls, toPlainText } from "@/shared/components/RichText";
import styles from "./Practice.module.css";

export type PracticeQuestionSummary = Pick<
  Question,
  | "questionNumber"
  | "questionText"
  | "audioUrl"
  | "imageUrl"
  | "optionA"
  | "difficultyLevel"
  | "status"
> & { topic?: string | null };

const instructions = [
  "Nghe và chọn câu mô tả phù hợp với hình ảnh.",
  "Nghe câu hỏi và chọn câu trả lời phù hợp.",
  "Nghe đoạn hội thoại và trả lời câu hỏi.",
  "Nghe bài nói ngắn và trả lời câu hỏi.",
  "Chọn phương án hoàn thành câu.",
  "Chọn phương án điền vào chỗ trống trong đoạn văn.",
  "Đọc đoạn văn và trả lời câu hỏi.",
];

export function PracticeQuestionCard({
  question,
  part,
  number,
  onClick,
  selected = false,
}: {
  question?: PracticeQuestionSummary;
  part: string;
  number: number;
  onClick: () => void;
  selected?: boolean;
}) {
  const partNumber = Number(part.replace("Part", ""));
  const questionNumber = question?.questionNumber ?? number;
  const image = mediaUrls(question?.imageUrl)[0];
  const text = toPlainText(question?.questionText);
  const firstOption = toPlainText(question?.optionA);
  const optionPreview =
    firstOption && !/^\(?[A-D]\)?[.)]?$/i.test(firstOption) ? `A. ${firstOption}` : null;
  const preview = text || optionPreview || instructions[partNumber - 1];
  const Icon = partNumber <= 4 ? Headphones : FileText;
  return (
    <button type="button" className={styles.questionCard} onClick={onClick}>
      {image ? (
        <img
          className={styles.questionThumb}
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={styles.questionIcon}>
          <Icon size={23} aria-hidden="true" />
        </span>
      )}
      <span className={styles.questionInfo}>
        <strong>
          {selected ? `Vị trí ${number} · Câu gốc ${questionNumber}` : `Câu ${questionNumber}`}{" "}
          <span>· Part {partNumber}</span>
        </strong>
        <span className={styles.questionSnippet}>
          {question ? preview : "Mở để xem nội dung chi tiết."}
        </span>
        {question && question.status !== "Active" && (
          <strong>Không hoạt động ({question.status})</strong>
        )}
        <span className={styles.questionMeta}>
          <span>{PART_NAMES[partNumber - 1]}</span>
          {question && (
            <span>{DIFFICULTY_LABELS[question.difficultyLevel] ?? question.difficultyLevel}</span>
          )}
          {question?.audioUrl && (
            <span>
              <Headphones size={12} aria-hidden="true" /> Âm thanh
            </span>
          )}
          {image && (
            <span>
              <ImageIcon size={12} aria-hidden="true" /> Hình ảnh
            </span>
          )}
          {question?.topic && <span>{question.topic}</span>}
        </span>
      </span>
    </button>
  );
}
