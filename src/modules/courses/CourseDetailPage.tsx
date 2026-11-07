import { isAxiosError } from "axios";
import { BookOpen, CheckCircle2, Target } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, EmptyState, MarkdownPreview } from "@/modules/admin";
import { CourseBanner } from "./CourseBanner";
import { CourseCurriculum } from "./CourseCurriculum";
import { RelatedCourses } from "./RelatedCourses";
import { examLabels, levelLabels, usePublicCourse } from "./courseCatalog";
import styles from "./courseCatalog.module.css";

export function CourseDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const back = `/courses${params.size ? `?${params}` : ""}`;
  const query = usePublicCourse(id);
  return (
    <main className={styles.page}>
      {query.isPending ? (
        <p className={styles.status} role="status">
          Đang tải thông tin khóa học…
        </p>
      ) : query.isError ? (
        <EmptyState
          title={
            isAxiosError(query.error) && query.error.response?.status === 404
              ? "Không tìm thấy khóa học"
              : "Không tải được khóa học"
          }
          action={<Button onClick={() => void query.refetch()}>Thử lại</Button>}
        />
      ) : (
        <>
          <CourseBanner
            title={query.data.title}
            description={query.data.shortDescription || "Khám phá nội dung và lộ trình học."}
            back={back}
          />
          <div className={styles.detailContent}>
            <section className={styles.highlights} aria-label="Thông tin khóa học">
              <div className={styles.learnBlock}>
                <h2>Bạn sẽ học được gì?</h2>
                {query.data.objectives.length ? (
                  <ul>
                    {query.data.objectives.map((item, index) => (
                      <li key={index}>
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Khám phá mục tiêu học tập trong từng bài học.</p>
                )}
              </div>
              <div className={styles.infoBox}>
                <BookOpen size={25} aria-hidden="true" />
                <h3>Loại bài thi</h3>
                <p>{examLabels[query.data.examType]}</p>
                <h3>Trình độ</h3>
                <p>{levelLabels[query.data.level]}</p>
                <h3>Kỹ năng</h3>
                {query.data.skills.length ? (
                  <ul>
                    {query.data.skills.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Phù hợp với mục tiêu TOEIC của bạn.</p>
                )}
              </div>
              <div className={styles.infoBox}>
                <Target size={25} aria-hidden="true" />
                <h3>Điểm mục tiêu</h3>
                <p>
                  {query.data.targetScore === null
                    ? "Theo lộ trình khóa học"
                    : `${query.data.targetScore} điểm`}
                </p>
                <h3>Yêu cầu trước khi học</h3>
                {query.data.prerequisites.length ? (
                  <ul>
                    {query.data.prerequisites.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Không có yêu cầu cụ thể.</p>
                )}
              </div>
            </section>
            <section className={styles.contentArea} id="noi-dung-khoa-hoc">
              <div>
                <h2>Nội dung khóa học</h2>
                <CourseCurriculum
                  modules={query.data.modules}
                  courseId={id!}
                  query={params.size ? `?${params}` : ""}
                />
              </div>
              <div className={styles.descriptionBlock}>
                <h2>Giới thiệu khóa học</h2>
                {query.data.description ? (
                  <MarkdownPreview value={query.data.description} />
                ) : (
                  <p>Khám phá từng học phần trong lộ trình học tập.</p>
                )}
                {query.data.modules.some((module) =>
                  module.lessons.some((lesson) => lesson.isFreePreview),
                ) && (
                  <p className={styles.previewHint}>
                    Chọn bài học có nhãn “Xem trước miễn phí” để trải nghiệm nội dung.
                  </p>
                )}
              </div>
            </section>
          </div>
          <div className={styles.relatedSection}>
            <div className={styles.detailContent}>
              <RelatedCourses currentId={query.data.id} query={params.size ? `?${params}` : ""} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
