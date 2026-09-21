import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useParams, Link, Navigate } from "react-router-dom";
import { IconChevronLeft, IconSearch } from "@/shared/components/icons";
import { toPlainText } from "@/shared/components/RichText";
import { examBankApi } from "../api/exam-bank.api";
import { BankStatus, Pagination, PartNavigation } from "../components/exam-bank/BankControls";
import {
  DIFFICULTY_LABELS,
  PART_NAMES,
  questionPrompt,
  STATUS_LABELS,
} from "../components/exam-bank/bank.constants";
import { QuestionPreview } from "../components/exam-bank/QuestionPreview";
import styles from "../components/exam-bank/ExamBrowser.module.css";

export function AdminPartQuestionsPage({ part }: { part: number }) {
  const [params, setParams] = useSearchParams();
  const { testId: routeTestId } = useParams<{ testId: string }>();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const testId = routeTestId || params.get("testId") || undefined;
  const selected = params.get("question");
  const filters = {
    Part: `Part${part}`,
    TestId: testId,
    Search: params.get("search") || undefined,
    DifficultyLevel: params.get("difficulty") || undefined,
    Status: params.get("status") || undefined,
    Page: page,
    PageSize: 12,
  };
  const query = useQuery({
    queryKey: ["exam-bank", "questions", filters],
    queryFn: ({ signal }) => examBankApi.questions(filters, signal),
    retry: false,
  });
  const exam = useQuery({
    queryKey: ["exam-bank", "exam", testId],
    queryFn: ({ signal }) => examBankApi.exam(testId!, signal),
    enabled: Boolean(testId),
    retry: false,
  });
  const update = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "question") next.delete("question");
      if (key !== "page" && key !== "question") next.delete("page");
      return next;
    });
  const activeId = selected || query.data?.items[0]?.id;
  if (!routeTestId && testId) {
    const next = new URLSearchParams(params);
    next.delete("testId");
    return (
      <Navigate
        replace
        to={`/admin/exams/list/${encodeURIComponent(testId)}/part-${part}${next.size ? `?${next}` : ""}`}
      />
    );
  }
  return (
    <div className={styles.page} data-section={part >= 5 ? "reading" : "listening"}>
      {testId && (
        <nav className={styles.breadcrumb} aria-label="Đường dẫn">
          <Link to="/admin/exams/list">Thư viện đề thi</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Chi tiết đề thi</span>
        </nav>
      )}
      <header className={`${styles.heading} ${testId ? styles.examHeading : ""}`}>
        <div>
          <span className={styles.eyebrow}>
            {testId
              ? "ĐANG XEM ĐỀ THI"
              : `NGÂN HÀNG CÂU HỎI / ${part <= 4 ? "LISTENING" : "READING"}`}
          </span>
          <h1>
            {testId ? (
              exam.data?.title || "Chi tiết đề thi"
            ) : (
              <>
                Part {part}
                <span className={styles.titleDivider}>/</span>
                {PART_NAMES[part - 1]}
              </>
            )}
          </h1>
          <p>
            {testId
              ? "Các Part bên dưới chỉ hiển thị câu hỏi thuộc đề thi này."
              : "Tất cả câu hỏi trong ngân hàng"}
          </p>
          {testId && exam.data && (
            <div className={styles.examSummary}>
              <span>{exam.data.code}</span>
              <span>{exam.data.totalQuestions} câu hỏi</span>
              <span>{exam.data.durationMinutes} phút</span>
              <span>{STATUS_LABELS[exam.data.status] ?? exam.data.status}</span>
            </div>
          )}
        </div>
        <Link className={styles.button} to="/admin/exams/list">
          <IconChevronLeft size={16} />
          {testId ? "Về thư viện đề thi" : "Đề thi"}
        </Link>
      </header>
      {testId && exam.isError && (
        <BankStatus error={exam.error} retry={() => void exam.refetch()} />
      )}
      <PartNavigation part={part} testId={testId} />
      {testId && (
        <div className={styles.examScope}>
          <h2>
            Part {part} · {PART_NAMES[part - 1]}
          </h2>
          <span>Câu hỏi trong đề</span>
        </div>
      )}
      <form
        className={styles.toolbar}
        key={`${part}-${params.get("search")}`}
        onSubmit={(e) => {
          e.preventDefault();
          update("search", String(new FormData(e.currentTarget).get("search") || "").trim());
        }}
      >
        <div className={styles.search}>
          <IconSearch size={18} />
          <input
            name="search"
            aria-label="Tìm câu hỏi"
            placeholder={
              testId ? `Tìm câu hỏi Part ${part} trong đề này...` : "Tìm nội dung câu hỏi..."
            }
            defaultValue={params.get("search") || ""}
          />
          <button className={styles.iconButton} title="Tìm kiếm" aria-label="Tìm kiếm">
            <IconChevronLeft style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>
        <select
          aria-label="Độ khó"
          value={params.get("difficulty") || ""}
          onChange={(e) => update("difficulty", e.target.value)}
        >
          <option value="">Tất cả độ khó</option>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Trạng thái"
          value={params.get("status") || ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {(params.get("search") || params.get("difficulty") || params.get("status")) && (
          <button type="button" className={styles.textButton} onClick={() => setParams({})}>
            Xóa bộ lọc
          </button>
        )}
      </form>
      {query.isPending || query.isError ? (
        <BankStatus
          loading={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : !query.data.items.length ? (
        <BankStatus
          empty={testId ? `Không có câu hỏi Part ${part} phù hợp trong đề này` : undefined}
        />
      ) : (
        <div className={`${styles.workspace} ${selected ? styles.detailOpen : ""}`}>
          <section className={styles.questionList} aria-label="Danh sách câu hỏi">
            <div className={styles.listHeading}>
              <h2>{testId ? "Câu hỏi trong đề" : "Câu hỏi"}</h2>
              <span>{query.data.totalCount.toLocaleString("vi-VN")}</span>
            </div>
            {query.data.items.map((q, index) => (
              <button
                key={q.id}
                className={styles.questionRow}
                aria-current={activeId === q.id ? "true" : undefined}
                onClick={() => update("question", q.id)}
              >
                <span className={styles.number}>
                  {String(q.questionNumber ?? (page - 1) * 12 + index + 1).padStart(2, "0")}
                </span>
                <span className={styles.rowContent}>
                  <strong>
                    {toPlainText(questionPrompt(q.questionText)) ||
                      (part === 1
                        ? "Mô tả hình ảnh"
                        : part <= 4
                          ? "Câu hỏi nghe hiểu"
                          : part === 6
                            ? "Điền vào chỗ trống trong đoạn văn"
                            : "Câu hỏi đọc hiểu")}
                  </strong>
                  <span>
                    {DIFFICULTY_LABELS[q.difficultyLevel] ?? q.difficultyLevel}
                    <i />
                    {STATUS_LABELS[q.status] ?? q.status}
                  </span>
                </span>
              </button>
            ))}
            <Pagination
              page={page}
              pages={query.data.totalPages}
              total={query.data.totalCount}
              onChange={(value) => update("page", String(value))}
            />
          </section>
          <section className={styles.detail} aria-label="Chi tiết câu hỏi">
            <button
              className={`${styles.button} ${styles.backButton}`}
              onClick={() => update("question", "")}
            >
              <IconChevronLeft size={16} />
              Danh sách câu hỏi
            </button>
            {activeId && (
              <QuestionPreview
                key={activeId}
                id={activeId}
                part={part}
                onSelect={(id) => update("question", id)}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
