import { Button, EmptyState } from "@/modules/admin";
import { CourseCard, CourseCardSkeleton } from "./CourseCard";
import { usePublicCourses } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

export function RelatedCourses({ currentId, query }: { currentId: string; query: string }) {
  const courses = usePublicCourses({
    search: "",
    examType: "",
    level: "",
    targetScore: "",
    page: 1,
  });
  const recommendations = courses.data?.items
    .filter((course) => course.id !== currentId)
    .slice(0, 3);

  return (
    <section className={styles.relatedCourses} aria-labelledby="related-courses-title">
      <h2 id="related-courses-title">Những khóa học bạn có thể khám phá</h2>
      {courses.isPending ? (
        <div className={styles.grid} role="status" aria-label="Đang tải khóa học gợi ý">
          {Array.from({ length: 3 }, (_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : courses.isError ? (
        <EmptyState
          title="Chưa tải được khóa học gợi ý"
          action={<Button onClick={() => void courses.refetch()}>Thử lại</Button>}
        />
      ) : recommendations?.length ? (
        <div className={styles.grid}>
          {recommendations.map((course) => (
            <CourseCard key={course.id} course={course} to={`/courses/${course.id}${query}`} />
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có khóa học khác để khám phá" />
      )}
    </section>
  );
}
