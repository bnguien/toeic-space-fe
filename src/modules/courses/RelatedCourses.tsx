import { Button, EmptyState } from "@/modules/admin";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import { CourseCard, CourseCardSkeleton } from "./CourseCard";
import { usePublicCourses } from "./courseCatalog";
import { useOwnedCourseIds } from "./purchaseHooks";
import styles from "./courseCatalog.module.css";

export function RelatedCourses({ currentId, query }: { currentId: string; query: string }) {
  const user = useCurrentUser();
  const session = useSessionStatus();
  const owned = useOwnedCourseIds();
  const isLearner = session === "authenticated" && user?.role === "User";
  const courses = usePublicCourses({
    search: "",
    examType: "",
    level: "",
    targetScore: "",
    page: 1,
  });
  const recommendations = courses.data?.items
    .filter((course) => course.id !== currentId && !owned.data?.has(course.id))
    .slice(0, 3);

  return (
    <section className={styles.relatedCourses} aria-labelledby="related-courses-title">
      <h2 id="related-courses-title">Những khóa học bạn có thể khám phá</h2>
      {courses.isPending || session === "restoring" || (isLearner && owned.isPending) ? (
        <div className={styles.grid} role="status" aria-label="Đang tải khóa học gợi ý">
          {Array.from({ length: 3 }, (_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : courses.isError || (isLearner && owned.isError) ? (
        <EmptyState
          title="Chưa tải được khóa học gợi ý"
          action={
            <Button
              onClick={() => {
                void courses.refetch();
                if (isLearner) void owned.refetch();
              }}
            >
              Thử lại
            </Button>
          }
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
