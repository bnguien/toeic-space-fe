import { FileText, Library, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";

import mascot from "@/assets/mascot/oy2-focus.png";
import {
  difficultyRow,
  questionSourceRow,
  questionStatusRow,
} from "../components/exam-bank/bankBreakdown";
import { PART_NAMES, partNumber, sortedParts } from "../components/exam-bank/bank.constants";
import {
  AdminPage,
  Badge,
  Breakdown,
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  OverviewHero,
  type Column,
} from "../components/ui";
import { useBankOverview } from "../hooks/useExamBank";
import type { BankPartStats } from "../types/exam-bank.types";
import { apiErrorMessage } from "../utils/apiError";

const count = (value: number) => value.toLocaleString("vi-VN");

const partColumns: Column<BankPartStats>[] = [
  {
    key: "part",
    header: "Part",
    locked: true,
    nowrap: true,
    render: (part) => (
      <span>
        <strong>Part {partNumber(part.part)}</strong> · {PART_NAMES[partNumber(part.part) - 1]}
      </span>
    ),
  },
  {
    key: "section",
    header: "Phần thi",
    nowrap: true,
    render: (part) => (
      <Badge tone={part.section === "Listening" ? "theme" : "neutral"}>{part.section}</Badge>
    ),
  },
  { key: "questions", header: "Số câu", align: "right", render: (part) => count(part.questions) },
  { key: "test", header: "Trong đề", align: "right", render: (part) => count(part.testQuestions) },
  {
    key: "bank",
    header: "Chỉ ở ngân hàng",
    align: "right",
    render: (part) => count(part.bankQuestions),
  },
  {
    key: "passages",
    header: "Nhóm / đoạn",
    align: "right",
    defaultHidden: true,
    render: (part) => (part.passages ? count(part.passages) : "Câu đơn"),
  },
  {
    key: "perTest",
    header: "Mỗi đề",
    align: "right",
    defaultHidden: true,
    render: (part) => `${part.questionsPerTest} câu`,
  },
];

export const AdminExamBankPage = () => {
  const navigate = useNavigate();
  const query = useBankOverview();
  const overview = query.data;
  const loading = <EmptyState title="Đang tải..." image={false} />;

  return (
    <AdminPage
      theme="rose"
      hero={
        <OverviewHero
          eyebrow="Ngân hàng đề"
          icon={<Library size={15} />}
          title="Kho"
          highlight="câu hỏi TOEIC"
          description="Đề thi, câu hỏi và bộ luyện tập theo từng Part."
          watermark="BANK"
          mascot={mascot}
          actions={
            <>
              <ButtonLink
                to="/admin/exams/part-1"
                variant="primary"
                icon={<ListChecks size={15} />}
              >
                Duyệt câu hỏi
              </ButtonLink>
              <ButtonLink to="/admin/exams/list" icon={<FileText size={15} />}>
                Đề thi
              </ButtonLink>
            </>
          }
          panelLabel="Đang sử dụng"
          panelTitle={
            overview ? `${overview.activeTests}/${overview.totalTests} đề thi` : "Đang tải..."
          }
          stats={[
            { key: "questions", label: "Câu hỏi", value: overview?.totalQuestions },
            {
              key: "listening",
              label: "Listening",
              value: overview?.listeningQuestions,
              to: "/admin/exams/part-1",
            },
            {
              key: "reading",
              label: "Reading",
              value: overview?.readingQuestions,
              to: "/admin/exams/part-5",
            },
            {
              key: "sets",
              label: "Bộ luyện tập",
              value: overview?.totalPracticeSets,
              highlight: true,
            },
          ]}
        />
      }
    >
      {query.isError ? (
        <EmptyState
          framed
          title="Chưa tải được ngân hàng đề"
          description={apiErrorMessage(query.error)}
          action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
        />
      ) : (
        <>
          <Card title="Phân bổ câu hỏi">
            {overview ? (
              <Breakdown
                rows={[
                  questionSourceRow(overview),
                  difficultyRow(overview),
                  questionStatusRow(overview),
                ]}
              />
            ) : (
              loading
            )}
          </Card>

          <DataTable
            id="bank-parts"
            label="Chi tiết theo Part"
            summary={<strong>Chi tiết theo Part</strong>}
            columns={partColumns}
            rows={overview && sortedParts(overview)}
            getRowId={(part) => part.part}
            onRowClick={(part) => navigate(`/admin/exams/part-${partNumber(part.part)}`)}
            loading={query.isPending}
            emptyTitle="Ngân hàng chưa có câu hỏi"
          />
        </>
      )}
    </AdminPage>
  );
};
