import { Headphones, Image as ImageIcon } from "lucide-react";

import { toPlainText } from "@/shared/components/RichText";
import { examBankApi, type BankFilters } from "../../api/exam-bank.api";
import type { Question } from "../../types/exam-bank.types";
import { collectPages, downloadCsv, type Column } from "../ui";
import uiStyles from "../ui/ui.module.css";
import { DIFFICULTY_LABELS, questionPrompt, STATUS_LABELS } from "./bank.constants";
import styles from "./bank.module.css";
import { ContentStatusBadge, DifficultyBadge } from "./ExamBadges";

const FALLBACK_PROMPTS: Record<number, string> = {
  1: "Mô tả hình ảnh",
  2: "Câu hỏi nghe hiểu",
  3: "Câu hỏi nghe hiểu",
  4: "Câu hỏi nghe hiểu",
  5: "Điền vào câu",
  6: "Điền vào chỗ trống trong đoạn văn",
  7: "Câu hỏi đọc hiểu",
};

/** Plain prompt for lists; parts without their own text get a generic label. */
export const questionSummary = (question: Question, part: number) =>
  toPlainText(questionPrompt(question.questionText)) || FALLBACK_PROMPTS[part] || "Câu hỏi";

export function questionColumns(part: number): Column<Question>[] {
  return [
    {
      key: "question",
      header: "Câu hỏi",
      locked: true,
      render: (question) => (
        <span className={styles.questionCell}>
          <span className={styles.questionNumber}>{question.questionNumber ?? "—"}</span>
          <p className={uiStyles.clamp}>{questionSummary(question, part)}</p>
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Độ khó",
      nowrap: true,
      render: (question) => <DifficultyBadge level={question.difficultyLevel} />,
    },
    {
      key: "status",
      header: "Trạng thái",
      nowrap: true,
      render: (question) => <ContentStatusBadge status={question.status} />,
    },
    {
      key: "media",
      header: "Tệp",
      nowrap: true,
      render: (question) => (
        <span className={uiStyles.muted} style={{ display: "inline-flex", gap: 6 }}>
          {question.audioUrl && <Headphones size={15} aria-label="Có âm thanh" />}
          {question.imageUrl && <ImageIcon size={15} aria-label="Có hình ảnh" />}
          {!question.audioUrl && !question.imageUrl && "—"}
        </span>
      ),
    },
    {
      key: "group",
      header: "Nhóm câu",
      nowrap: true,
      defaultHidden: true,
      render: (question) =>
        question.passageId ? "Theo đoạn" : <span className={uiStyles.muted}>Câu đơn</span>,
    },
    {
      key: "topic",
      header: "Chủ đề",
      defaultHidden: true,
      render: (question) => question.topic ?? <span className={uiStyles.muted}>—</span>,
    },
    {
      key: "id",
      header: "Mã",
      nowrap: true,
      defaultHidden: true,
      render: (question) => <code className={uiStyles.subtle}>{question.id.slice(0, 8)}</code>,
    },
  ];
}

const EXPORT_LIMIT = 1000;

export async function exportQuestions(filters: BankFilters, part: number) {
  const { rows, truncated } = await collectPages(
    (page) => examBankApi.questions({ ...filters, Page: page, PageSize: 100 }),
    EXPORT_LIMIT,
  );

  downloadCsv(
    `cau-hoi-part-${part}`,
    [
      { header: "Số câu", value: (question: Question) => question.questionNumber },
      { header: "Part", value: () => part },
      { header: "Nội dung", value: (question) => questionSummary(question, part) },
      { header: "A", value: (question) => toPlainText(question.optionA) },
      { header: "B", value: (question) => toPlainText(question.optionB) },
      { header: "C", value: (question) => toPlainText(question.optionC) },
      { header: "D", value: (question) => (question.optionD ? toPlainText(question.optionD) : "") },
      {
        header: "Độ khó",
        value: (question) =>
          DIFFICULTY_LABELS[question.difficultyLevel] ?? question.difficultyLevel,
      },
      {
        header: "Trạng thái",
        value: (question) => STATUS_LABELS[question.status] ?? question.status,
      },
      { header: "Mã", value: (question) => question.id },
    ],
    rows,
  );

  return { count: rows.length, truncated };
}
