import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Pagination } from "@/modules/admin";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import { Select } from "@/shared/components/Select";
import { CourseCatalogHero } from "./CourseCatalogHero";
import { CourseCard, CourseCardSkeleton } from "./CourseCard";
import { CourseLevelCta } from "./CourseLevelCta";
import { examLabels, levelLabels, usePublicCourses } from "./courseCatalog";
import { useOwnedCourseIds } from "./purchaseHooks";
import styles from "./courseCatalog.module.css";

const examOptions = [
  { value: "", label: "Tất cả" },
  ...Object.entries(examLabels).map(([value, label]) => ({ value, label })),
];

const levelOptions = [
  { value: "", label: "Tất cả" },
  ...Object.entries(levelLabels).map(([value, label]) => ({ value, label })),
];

const scoreOptions = [
  { value: "", label: "Tất cả" },
  { value: "350", label: "350+" },
  { value: "650", label: "650+" },
  { value: "850", label: "850+" },
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
  const [showFilter, setShowFilter] = useState(true);

  const query = usePublicCourses({ search, examType, level, targetScore, page });
  const user = useCurrentUser();
  const session = useSessionStatus();
  const owned = useOwnedCourseIds();
  const isLearner = session === "authenticated" && user?.role === "User";
  const visibleCourses = query.data?.items.filter((course) => !owned.data?.has(course.id)) ?? [];

  const setFilter = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });

  const clearFilters = () => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("examType");
      next.delete("level");
      next.delete("targetScore");
      next.delete("page");
      return next;
    });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (searchInput.trim()) next.set("search", searchInput.trim());
      else next.delete("search");
      next.delete("page");
      return next;
    });
  };

  const matchCount = visibleCourses.length;

  return (
    <main className={styles.page}>
      <CourseCatalogHero
        search={searchInput}
        onSearchChange={setSearchInput}
        onSearch={submitSearch}
      />

      <div className={styles.catalogContent}>
        {/* Header Bar below Hero: Title, match count & Toggle filter button */}
        <div className={styles.catalogHeaderBar}>
          <div>
            <h2 className={styles.catalogTitle}>Khám phá khóa học</h2>
            <p className={styles.catalogSubtitle}>
              {query.isPending ? "Đang tải khóa học…" : `${matchCount} khóa học phù hợp`}
            </p>
          </div>
          <button
            type="button"
            className={styles.filterToggleBtn}
            onClick={() => setShowFilter((prev) => !prev)}
            aria-expanded={showFilter}
          >
            <SlidersHorizontal size={16} />
            <span>{showFilter ? "Ẩn bộ lọc" : "Bộ lọc"}</span>
          </button>
        </div>

        {/* Main Catalog Layout: Sidebar (when shown) + Course Grid */}
        <div className={styles.catalogLayout} data-sidebar={showFilter ? "visible" : "hidden"}>
          {showFilter && (
            <aside className={styles.filterSidebar} aria-label="Bộ lọc khóa học">
              <div className={styles.sidebarHeader}>
                <h3 className={styles.sidebarTitle}>Bộ lọc</h3>
                <button type="button" className={styles.sidebarClearBtn} onClick={clearFilters}>
                  Xóa
                </button>
              </div>

              {/* Loại bài thi */}
              <div className={styles.sidebarSection}>
                <h4 className={styles.sidebarSectionTitle}>Loại bài thi</h4>
                <div className={styles.radioList}>
                  {examOptions.map((opt) => (
                    <label key={opt.value} className={styles.radioItem}>
                      <input
                        type="radio"
                        name="examType"
                        value={opt.value}
                        checked={(examType || "") === opt.value}
                        onChange={() => setFilter("examType", opt.value)}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioCircle} />
                      <span className={styles.radioLabel}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className={styles.sidebarDivider} />

              {/* Trình độ */}
              <div className={styles.sidebarSection}>
                <h4 className={styles.sidebarSectionTitle}>Trình độ</h4>
                <div className={styles.radioList}>
                  {levelOptions.map((opt) => (
                    <label key={opt.value} className={styles.radioItem}>
                      <input
                        type="radio"
                        name="level"
                        value={opt.value}
                        checked={(level || "") === opt.value}
                        onChange={() => setFilter("level", opt.value)}
                        className={styles.radioInput}
                      />
                      <span className={styles.radioCircle} />
                      <span className={styles.radioLabel}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className={styles.sidebarDivider} />

              {/* Điểm mục tiêu */}
              <div className={styles.sidebarSection}>
                <h4 className={styles.sidebarSectionTitle}>Điểm mục tiêu</h4>
                <Select
                  id="course-target-score-filter"
                  className={styles.sidebarSelect}
                  value={targetScore}
                  options={scoreOptions}
                  onChange={(value) => setFilter("targetScore", value)}
                  placeholder="Tất cả"
                />
              </div>
            </aside>
          )}

          <div className={styles.catalogMain}>
            {query.isPending || session === "restoring" || (isLearner && owned.isPending) ? (
              <CatalogLoading />
            ) : isLearner && owned.isError ? (
              <EmptyState
                title="Không thể kiểm tra khóa học đã đăng ký"
                description="Vui lòng thử lại để xem các khóa học chưa đăng ký."
                action={<Button onClick={() => void owned.refetch()}>Thử lại</Button>}
              />
            ) : query.isError ? (
              <EmptyState
                title="Không tải được khóa học"
                description="Vui lòng thử lại sau."
                action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
              />
            ) : !visibleCourses.length ? (
              <EmptyState
                title={
                  query.data?.items.length
                    ? "Bạn đã đăng ký các khóa học trên trang này"
                    : "Không tìm thấy khóa học"
                }
                description={
                  query.data?.items.length
                    ? "Hãy xem trang tiếp theo hoặc thay đổi bộ lọc."
                    : "Hãy thử thay đổi bộ lọc hoặc từ khóa."
                }
              />
            ) : (
              <div className={styles.grid}>
                {visibleCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    to={`/courses/${course.id}${params.size ? `?${params}` : ""}`}
                  />
                ))}
              </div>
            )}

            {query.data && !(isLearner && (owned.isPending || owned.isError)) && (
              <div className={styles.paginationWrap}>
                <Pagination
                  page={query.data.page}
                  pages={Math.ceil(query.data.totalCount / query.data.pageSize)}
                  pageSize={
                    isLearner && query.data.totalCount <= query.data.pageSize
                      ? Math.max(1, visibleCourses.length)
                      : query.data.pageSize
                  }
                  total={
                    isLearner && query.data.totalCount <= query.data.pageSize
                      ? visibleCourses.length
                      : query.data.totalCount
                  }
                  showRange={!isLearner || query.data.totalCount <= query.data.pageSize}
                  showSinglePage
                  onChange={(next) => setFilter("page", String(next))}
                />
              </div>
            )}
          </div>
        </div>

        {query.data && <CourseLevelCta />}
      </div>
    </main>
  );
}
