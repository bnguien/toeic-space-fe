import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button, EmptyState, Pagination } from "@/modules/admin";
import { useCurrentUser } from "@/modules/auth";
import { CourseCard, CourseCardSkeleton } from "./CourseCard";
import { CourseCatalogHero } from "./CourseCatalogHero";
import { myCoursesKey } from "./purchaseHooks";
import { purchaseApi } from "./purchaseApi";
import { purchaseError } from "./purchaseError";
import styles from "./courseCatalog.module.css";

export function MyCoursesPage() {
  const user = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [imageError, setImageError] = useState(false);
  const courses = useQuery({
    queryKey: [...myCoursesKey(user?.id ?? ""), page, search],
    queryFn: ({ signal }) => purchaseApi.mine(page, search, signal),
    enabled: Boolean(user?.id),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.items.some((course) => course.thumbnailUrl) ? 240_000 : false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };
  return (
    <main className={styles.page}>
      <CourseCatalogHero
        title="Khóa học của tôi"
        description="Tiếp tục lộ trình TOEIC của bạn với những khóa học đã đăng ký."
        search={searchInput}
        onSearchChange={setSearchInput}
        onSearch={submit}
      />
      <div className={`${styles.catalogContent} ${styles.myCoursesContent}`}>
        {imageError && (
          <p role="alert">
            Không tải được một số ảnh khóa học.{" "}
            <Button
              onClick={() => {
                setImageError(false);
                void courses.refetch();
              }}
            >
              Tải liên kết ảnh mới
            </Button>
          </p>
        )}
        <div className={styles.listHeader}>
          <p>
            {courses.data
              ? `${courses.data.totalCount.toLocaleString("vi-VN")} khóa học của tôi`
              : "Khóa học của tôi"}
          </p>
        </div>
        {courses.isPending ? (
          <div className={styles.grid} role="status" aria-label="Đang tải khóa học của tôi">
            {Array.from({ length: 6 }, (_, index) => (
              <CourseCardSkeleton key={index} />
            ))}
          </div>
        ) : courses.isError ? (
          <EmptyState
            title="Không tải được khóa học"
            description={purchaseError(courses.error)}
            action={<Button onClick={() => void courses.refetch()}>Thử lại</Button>}
          />
        ) : !courses.data.items.length ? (
          <EmptyState
            title="Chưa có khóa học phù hợp"
            action={<Link to="/courses">Khám phá khóa học</Link>}
          />
        ) : (
          <>
            <div className={styles.grid}>
              {courses.data.items.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  to={`/my-courses/${course.courseId}`}
                  onImageError={() => setImageError(true)}
                />
              ))}
            </div>
            <div className={styles.paginationWrap}>
              <Pagination
                page={courses.data.page}
                pages={Math.ceil(courses.data.totalCount / courses.data.pageSize)}
                pageSize={courses.data.pageSize}
                total={courses.data.totalCount}
                showSinglePage
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
