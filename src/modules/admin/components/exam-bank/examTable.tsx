import { examBankApi, type BankFilters } from "../../api/exam-bank.api";
import type { Exam } from "../../types/exam-bank.types";
import { formatDate } from "../../utils/userManagement";
import { collectPages, downloadCsv, type Column } from "../ui";
import uiStyles from "../ui/ui.module.css";
import { CATEGORY_LABELS, STATUS_LABELS } from "./bank.constants";
import styles from "./bank.module.css";
import { ContentStatusBadge, SectionSplit } from "./ExamBadges";

const categoryLabel = (exam: Exam) =>
  exam.category ? (CATEGORY_LABELS[exam.category] ?? exam.category) : null;

export const examColumns: Column<Exam>[] = [
  {
    key: "exam",
    header: "Đề thi",
    locked: true,
    render: (exam) => (
      <span className={styles.titleCell}>
        <strong>{exam.title}</strong>
        <small>{exam.code}</small>
      </span>
    ),
  },
  {
    key: "questions",
    header: "Số câu",
    align: "right",
    nowrap: true,
    render: (exam) => exam.totalQuestions,
  },
  {
    key: "duration",
    header: "Thời gian",
    align: "right",
    nowrap: true,
    render: (exam) => `${exam.durationMinutes} phút`,
  },
  {
    key: "split",
    header: "LC / RC",
    render: (exam) => (
      <SectionSplit listening={exam.totalListeningQuestions} reading={exam.totalReadingQuestions} />
    ),
  },
  {
    key: "status",
    header: "Trạng thái",
    nowrap: true,
    render: (exam) => <ContentStatusBadge status={exam.status} />,
  },
  {
    key: "category",
    header: "Danh mục",
    nowrap: true,
    defaultHidden: true,
    render: (exam) => categoryLabel(exam) ?? <span className={uiStyles.muted}>—</span>,
  },
  {
    key: "year",
    header: "Năm",
    nowrap: true,
    defaultHidden: true,
    render: (exam) => exam.year ?? <span className={uiStyles.muted}>—</span>,
  },
  {
    key: "createdAt",
    header: "Ngày tạo",
    nowrap: true,
    defaultHidden: true,
    render: (exam) => formatDate(exam.createdAt),
  },
];

/** Exports every exam matching the filters. */
export async function exportExams(filters: BankFilters) {
  const { rows } = await collectPages(
    (page) => examBankApi.exams({ ...filters, Page: page, PageSize: 100 }),
    2000,
  );

  downloadCsv(
    "de-thi",
    [
      { header: "Mã", value: (exam: Exam) => exam.code },
      { header: "Tên đề", value: (exam) => exam.title },
      { header: "Danh mục", value: (exam) => categoryLabel(exam) },
      { header: "Năm", value: (exam) => exam.year },
      { header: "Số câu", value: (exam) => exam.totalQuestions },
      { header: "Listening", value: (exam) => exam.totalListeningQuestions },
      { header: "Reading", value: (exam) => exam.totalReadingQuestions },
      { header: "Thời gian (phút)", value: (exam) => exam.durationMinutes },
      { header: "Trạng thái", value: (exam) => STATUS_LABELS[exam.status] ?? exam.status },
      { header: "Ngày tạo", value: (exam) => formatDate(exam.createdAt) },
    ],
    rows,
  );
}
