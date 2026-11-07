import { useCallback, useState } from "react";
import { Download, LayoutGrid, Library, RefreshCw, Rows3 } from "lucide-react";

import mascot from "@/assets/mascot/oy2-reading.png";

import { STATUS_LABELS } from "../components/exam-bank/bank.constants";
import bank from "../components/exam-bank/bank.module.css";
import { ExamDrawer } from "../components/exam-bank/ExamDrawer";
import library from "../components/exam-bank/ExamLibrary.module.css";
import { ExamLibraryItem } from "../components/exam-bank/ExamLibraryItem";
import { examColumns, exportExams } from "../components/exam-bank/examTable";
import {
  AdminPage,
  ButtonLink,
  DataTable,
  DataToolbar,
  EmptyState,
  ListHero,
  Pagination,
  Segmented,
  useListParams,
} from "../components/ui";
import uiStyles from "../components/ui/ui.module.css";
import { useBankOverview, useExams } from "../hooks/useExamBank";
import { apiErrorMessage } from "../utils/apiError";

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: "", label: "Mọi trạng thái" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function AdminExamsListPage() {
  const list = useListParams();
  const view = list.get("view") === "cards" ? "cards" : "table";
  const status = list.get("status");
  const filters = {
    Page: list.page,
    PageSize: PAGE_SIZE,
    Search: list.get("search") || undefined,
    Status: status || undefined,
  };
  const exams = useExams(filters);
  const overview = useBankOverview();
  const [exporting, setExporting] = useState(false);
  const { set: setParam } = list;
  const onSearch = useCallback((value: string) => setParam("search", value), [setParam]);
  const openExam = (id: string) => list.set("exam", id);
  const error = exams.isError ? apiErrorMessage(exams.error) : undefined;
  const bankData = overview.data;

  const pagination = exams.data && {
    page: list.page,
    pages: exams.data.totalPages,
    total: exams.data.totalCount,
    pageSize: PAGE_SIZE,
    onChange: (page: number) => list.set("page", String(page)),
  };

  return (
    <AdminPage
      theme="rose"
      hero={
        <ListHero
          eyebrow="Ngân hàng đề"
          icon={<Library size={14} />}
          title="Thư viện"
          highlight="đề thi"
          description="Đề TOEIC đầy đủ, mở một đề để xem câu hỏi theo từng Part."
          mascot={mascot}
          actions={
            <ButtonLink to="/admin/exams" icon={<Library size={16} />}>
              Tổng quan ngân hàng
            </ButtonLink>
          }
          items={[
            {
              key: "all",
              label: "Tất cả đề",
              value: bankData?.totalTests,
              active: !status,
              onSelect: () => list.set("status", ""),
            },
            {
              key: "active",
              label: "Đang sử dụng",
              value: bankData?.activeTests,
              active: status === "Active",
              onSelect: () => list.set("status", "Active"),
            },
            { key: "questions", label: "Câu trong đề", value: bankData?.testQuestions },
          ]}
        />
      }
    >
      <DataToolbar
        search={list.get("search")}
        onSearch={onSearch}
        placeholder="Tìm tên hoặc mã đề"
        filters={[{ key: "status", label: "Trạng thái", value: status, options: STATUS_OPTIONS }]}
        onFilterChange={(key, value) => list.set(key, value)}
        onClearFilters={() => list.clear(["view"])}
        leading={
          <Segmented
            label="Kiểu hiển thị"
            value={view}
            options={[
              { value: "table", label: "Bảng", icon: <Rows3 size={15} /> },
              { value: "cards", label: "Thẻ", icon: <LayoutGrid size={15} /> },
            ]}
            onChange={(value) =>
              list.update({ view: value === "cards" ? "cards" : "", page: String(list.page) })
            }
          />
        }
        actions={[
          {
            key: "export",
            label: exporting ? "Đang xuất..." : "Xuất CSV",
            icon: <Download size={16} />,
            disabled: exporting,
            onSelect: () => {
              setExporting(true);
              exportExams(filters)
                .catch((exportError: unknown) => window.alert(apiErrorMessage(exportError)))
                .finally(() => setExporting(false));
            },
          },
          {
            key: "refresh",
            label: "Làm mới",
            icon: <RefreshCw size={16} />,
            onSelect: () => void exams.refetch(),
          },
        ]}
      />

      {view === "table" ? (
        <DataTable
          id="exams"
          label="Danh sách đề thi"
          columns={examColumns}
          rows={exams.data?.items}
          getRowId={(exam) => exam.id}
          onRowClick={(exam) => openExam(exam.id)}
          activeRowId={list.get("exam")}
          loading={exams.isPending}
          fetching={exams.isFetching}
          error={error}
          onRetry={() => void exams.refetch()}
          emptyTitle="Không có đề thi phù hợp"
          pagination={pagination}
        />
      ) : error ? (
        <EmptyState framed title="Chưa tải được dữ liệu" description={error} />
      ) : exams.data && exams.data.items.length === 0 ? (
        <EmptyState framed title="Không có đề thi phù hợp" />
      ) : (
        <div className={library.library}>
          <div className={library.results} aria-busy={exams.isFetching}>
            {exams.data?.items.map((exam) => (
              <ExamLibraryItem key={exam.id} exam={exam} onOpen={(item) => openExam(item.id)} />
            )) ??
              Array.from({ length: 4 }, (_, index) => (
                <span
                  key={index}
                  className={uiStyles.skeleton}
                  style={{ width: "100%", height: 260 }}
                />
              ))}
          </div>
          {pagination && (
            <div className={`${uiStyles.tableCard} ${bank.cardsPagination}`}>
              <Pagination {...pagination} />
            </div>
          )}
        </div>
      )}

      <ExamDrawer examId={list.get("exam") || null} onClose={() => list.set("exam", "")} />
    </AdminPage>
  );
}
