import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, EmptyState, Pagination } from "@/modules/admin";
import { Select } from "@/shared/components/Select";
import { CourseCatalogHero } from "./CourseCatalogHero";
import { CourseCard, CourseCardSkeleton } from "./CourseCard";
import { CourseLevelCta } from "./CourseLevelCta";
import { examLabels, isExamType, isLevel, levelLabels, usePublicCourses } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

const examOptions = [
  { value: "", label: "Tất cả" },
  ...Object.entries(examLabels).map(([value, label]) => ({ value, label })),
];
const levelOptions = [
  { value: "", label: "Tất cả" },
  ...Object.entries(levelLabels).map(([value, label]) => ({ value, label })),
];

function CatalogLoading() {
  return (
    <div role="status" aria-label="Đang tải khóa học">
      <div className={styles.grid}>
        {Array.from({ length: 6 }, (_, index) => (
          <CourseCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function CourseCatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const examType = params.get("examType") ?? "";
  const level = params.get("level") ?? "";
  const targetScore = params.get("targetScore") ?? "";
  const parsedPage = Number(params.get("page") ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [searchInput, setSearchInput] = useState(search);
  const [scoreInput, setScoreInput] = useState(targetScore);
  const query = usePublicCourses({ search, examType, level, targetScore, page });
  const setFilter = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const score = scoreInput.trim();
    if (score && (!/^\d+$/.test(score) || !Number.isSafeInteger(Number(score)))) return;
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of [
        ["search", searchInput.trim()],
        ["targetScore", score],
      ]) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page");
      return next;
    });
  };
  return (
    <main className={styles.page}>
      <CourseCatalogHero search={searchInput} onSearchChange={setSearchInput} onSearch={submit} />
      <div className={styles.catalogContent}>
        <form id="course-filters" className={styles.filters} onSubmit={submit}>
          <div className={styles.filterField}>
            <label htmlFor="course-exam-filter">Loại bài thi</label>
            <Select
              id="course-exam-filter"
              className={styles.filterSelect}
              value={isExamType(examType) ? examType : ""}
              options={examOptions}
              onChange={(value) => setFilter("examType", value)}
            />
          </div>
          <div className={styles.filterField}>
            <label htmlFor="course-level-filter">Trình độ</label>
            <Select
              id="course-level-filter"
              className={styles.filterSelect}
              value={isLevel(level) ? level : ""}
              options={levelOptions}
              onChange={(value) => setFilter("level", value)}
            />
          </div>
          <label>
            Điểm mục tiêu
            <input
              type="number"
              min="0"
              step="1"
              value={scoreInput}
              onChange={(event) => setScoreInput(event.target.value)}
              placeholder="Điểm cần tìm"
            />
          </label>
          <Button variant="primary" type="submit">
            Áp dụng
          </Button>
        </form>
        <div className={styles.listHeader}>
          <p>
            {query.data
              ? query.data.items.length
                ? `Hiển thị ${(query.data.page - 1) * query.data.pageSize + 1}–${Math.min(query.data.page * query.data.pageSize, query.data.totalCount)} trong ${query.data.totalCount.toLocaleString("vi-VN")} khóa học`
                : `${query.data.totalCount.toLocaleString("vi-VN")} khóa học`
              : "Khám phá các khóa học phù hợp với bạn"}
          </p>
        </div>
        {query.isPending ? (
          <CatalogLoading />
        ) : query.isError ? (
          <EmptyState
            title="Không tải được khóa học"
            description="Vui lòng thử lại sau."
            action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
          />
        ) : !query.data.items.length ? (
          <EmptyState
            title="Không tìm thấy khóa học"
            description="Hãy thử thay đổi bộ lọc hoặc từ khóa."
          />
        ) : (
          <>
            <div className={styles.grid}>
              {query.data.items.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  to={`/courses/${course.id}${params.size ? `?${params}` : ""}`}
                />
              ))}
            </div>
            <div className={styles.paginationWrap}>
              <Pagination
                page={query.data.page}
                pages={Math.ceil(query.data.totalCount / query.data.pageSize)}
                pageSize={query.data.pageSize}
                total={query.data.totalCount}
                showSinglePage
                onChange={(next) => setFilter("page", String(next))}
              />
            </div>
          </>
        )}
        {query.data && <CourseLevelCta />}
      </div>
    </main>
  );
}
