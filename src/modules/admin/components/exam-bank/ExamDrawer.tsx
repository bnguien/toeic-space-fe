import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { useExamDetail } from "../../hooks/useExamBank";
import { apiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/userManagement";
import { Button, ButtonLink, Drawer, DrawerSection, EmptyState, Facts, Highlights } from "../ui";
import { CATEGORY_LABELS, PART_NAMES, partNumber } from "./bank.constants";
import styles from "./bank.module.css";
import { ContentStatusBadge, SectionSplit } from "./ExamBadges";

/** Exam summary over the library; opening the exam itself stays one click away. */
export function ExamDrawer({ examId, onClose }: { examId: string | null; onClose: () => void }) {
  const detail = useExamDetail(examId);
  const exam = detail.data;
  const examPath = examId ? `/admin/exams/list/${encodeURIComponent(examId)}` : "";

  return (
    <Drawer
      open={Boolean(examId)}
      title={exam?.title ?? "Đề thi"}
      subtitle={exam?.code}
      meta={exam && <ContentStatusBadge status={exam.status} />}
      onClose={onClose}
      footer={
        exam && (
          <ButtonLink to={`${examPath}/part-1`} variant="primary" icon={<ExternalLink size={16} />}>
            Mở câu hỏi của đề
          </ButtonLink>
        )
      }
    >
      {detail.isPending ? (
        <EmptyState title="Đang tải..." image={false} />
      ) : detail.isError ? (
        <EmptyState
          title="Không mở được đề thi"
          description={apiErrorMessage(detail.error)}
          action={
            <Button size="sm" onClick={() => void detail.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <>
          <Highlights
            items={[
              { label: "Câu hỏi", value: detail.data.totalQuestions, accent: true },
              { label: "Thời gian", value: `${detail.data.durationMinutes} phút` },
              { label: "Nhóm câu / đoạn", value: detail.data.passageCount },
            ]}
          />

          <DrawerSection title="Thông tin">
            <Facts
              items={[
                {
                  label: "Danh mục",
                  value: detail.data.category
                    ? (CATEGORY_LABELS[detail.data.category] ?? detail.data.category)
                    : "—",
                },
                { label: "Năm", value: detail.data.year ?? "—" },
                {
                  label: "Cập nhật",
                  value: formatDate(detail.data.updatedAt ?? detail.data.createdAt),
                },
                {
                  label: "Listening / Reading",
                  value: (
                    <SectionSplit
                      listening={detail.data.totalListeningQuestions}
                      reading={detail.data.totalReadingQuestions}
                    />
                  ),
                },
                ...(detail.data.description
                  ? [{ label: "Mô tả", value: detail.data.description, wide: true }]
                  : []),
              ]}
            />
          </DrawerSection>

          <DrawerSection title="Câu hỏi theo Part">
            <div className={styles.partRows}>
              {[...detail.data.parts]
                .sort((left, right) => partNumber(left.part) - partNumber(right.part))
                .map((part) => {
                  const number = partNumber(part.part);
                  const expected = Math.max(1, part.expectedQuestionCount);
                  return (
                    <Link
                      key={part.part}
                      className={styles.partRow}
                      to={`${examPath}/part-${number}`}
                      data-section={number >= 5 ? "reading" : "listening"}
                      data-incomplete={
                        part.questionCount < part.expectedQuestionCount ? "true" : undefined
                      }
                    >
                      <strong>Part {number}</strong>
                      <span>{PART_NAMES[number - 1]}</span>
                      <small>
                        {part.questionCount}/{part.expectedQuestionCount} câu
                      </small>
                      <span className={styles.partProgress} aria-hidden="true">
                        <span
                          style={{
                            width: `${Math.min(100, (part.questionCount / expected) * 100)}%`,
                          }}
                        />
                      </span>
                    </Link>
                  );
                })}
            </div>
          </DrawerSection>
        </>
      )}
    </Drawer>
  );
}
