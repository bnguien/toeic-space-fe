import { useCallback, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";

import { PartNavigation } from "../components/exam-bank/BankControls";
import {
  DIFFICULTY_LABELS,
  PART_NAMES,
  STATUS_LABELS,
} from "../components/exam-bank/bank.constants";
import { QuestionPreview } from "../components/exam-bank/QuestionPreview";
import { exportQuestions, questionColumns } from "../components/exam-bank/questionTable";
import {
  AdminPage,
  ButtonLink,
  DataTable,
  DataToolbar,
  Drawer,
  useListParams,
} from "../components/ui";
import { useExamDetail, useQuestions } from "../hooks/useExamBank";
import { apiErrorMessage } from "../utils/apiError";

const PAGE_SIZE = 20;

const options = (labels: Record<string, string>, all: string) => [
  { value: "", label: all },
  ...Object.entries(labels).map(([value, label]) => ({ value, label })),
];

export function AdminPartQuestionsPage({ part }: { part: number }) {
  const list = useListParams();
  const { testId: routeTestId } = useParams<{ testId: string }>();
  const testId = routeTestId || list.get("testId") || undefined;
  const difficulty = list.get("difficulty");
  const status = list.get("status");
  const questionId = list.get("question");
  const filters = {
    Part: `Part${part}`,
    TestId: testId,
    Search: list.get("search") || undefined,
    DifficultyLevel: difficulty || undefined,
    Status: status || undefined,
    Page: list.page,
    PageSize: PAGE_SIZE,
  };
  const questions = useQuestions(filters);
  const exam = useExamDetail(testId);
  const [exporting, setExporting] = useState(false);
  const { set: setParam } = list;
  const onSearch = useCallback((value: string) => setParam("search", value), [setParam]);
  const section = part >= 5 ? "reading" : "listening";

  // Old links carried the exam as ?testId=; the exam route keeps the Part tabs inside it.
  if (!routeTestId && testId) {
    const next = new URLSearchParams(list.params);
    next.delete("testId");
    return (
      <Navigate
        replace
        to={`/admin/exams/list/${encodeURIComponent(testId)}/part-${part}${next.size ? `?${next}` : ""}`}
      />
    );
  }

  return (
    <AdminPage
      theme="rose"
      eyebrow={
        testId
          ? `Đề thi${exam.data ? ` · ${exam.data.code}` : ""}`
          : `Ngân hàng câu hỏi · ${section === "reading" ? "Reading" : "Listening"}`
      }
      title={testId ? (exam.data?.title ?? "Đề thi") : `Part ${part} · ${PART_NAMES[part - 1]}`}
      actions={
        <ButtonLink
          to={testId ? `/admin/exams/list?exam=${testId}` : "/admin/exams"}
          icon={<ArrowLeft size={16} />}
        >
          {testId ? "Thư viện đề" : "Tổng quan"}
        </ButtonLink>
      }
    >
      <PartNavigation part={part} testId={testId} />

      <DataToolbar
        search={list.get("search")}
        onSearch={onSearch}
        placeholder={testId ? `Tìm trong Part ${part} của đề` : "Tìm nội dung câu hỏi"}
        filters={[
          {
            key: "difficulty",
            label: "Độ khó",
            value: difficulty,
            options: options(DIFFICULTY_LABELS, "Mọi độ khó"),
          },
          {
            key: "status",
            label: "Trạng thái",
            value: status,
            options: options(STATUS_LABELS, "Mọi trạng thái"),
          },
        ]}
        onFilterChange={(key, value) => list.set(key, value)}
        onClearFilters={() => list.clear()}
        actions={[
          {
            key: "export",
            label: exporting ? "Đang xuất..." : "Xuất CSV",
            icon: <Download size={16} />,
            disabled: exporting,
            onSelect: () => {
              setExporting(true);
              exportQuestions(filters, part)
                .then((result) => {
                  if (result.truncated) window.alert("Chỉ xuất 1.000 câu đầu. Hãy lọc hẹp hơn.");
                })
                .catch((error: unknown) => window.alert(apiErrorMessage(error)))
                .finally(() => setExporting(false));
            },
          },
          {
            key: "refresh",
            label: "Làm mới",
            icon: <RefreshCw size={16} />,
            onSelect: () => void questions.refetch(),
          },
        ]}
      />

      <div data-section={section}>
        <DataTable
          id={`questions-part-${part}`}
          label={`Câu hỏi Part ${part}`}
          columns={questionColumns(part)}
          rows={questions.data?.items}
          getRowId={(question) => question.id}
          onRowClick={(question) => list.set("question", question.id)}
          activeRowId={questionId}
          loading={questions.isPending}
          fetching={questions.isFetching}
          error={questions.isError ? apiErrorMessage(questions.error) : undefined}
          onRetry={() => void questions.refetch()}
          emptyTitle={
            testId ? `Đề này chưa có câu Part ${part} phù hợp` : "Không có câu hỏi phù hợp"
          }
          pagination={
            questions.data && {
              page: list.page,
              pages: questions.data.totalPages,
              total: questions.data.totalCount,
              pageSize: PAGE_SIZE,
              onChange: (page) => list.set("page", String(page)),
            }
          }
        />
      </div>

      <Drawer
        open={Boolean(questionId)}
        size="lg"
        title={`Part ${part} · ${PART_NAMES[part - 1]}`}
        subtitle={testId ? exam.data?.title : "Ngân hàng câu hỏi"}
        onClose={() => list.set("question", "")}
      >
        {questionId && (
          <QuestionPreview
            key={questionId}
            id={questionId}
            part={part}
            onSelect={(id) => list.set("question", id)}
          />
        )}
      </Drawer>
    </AdminPage>
  );
}
