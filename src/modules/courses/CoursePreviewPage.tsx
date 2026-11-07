import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, EmptyState, MarkdownPreview } from "@/modules/admin";
import { usePublicPreview } from "./courseCatalog";
import { PreviewCurriculumSidebar } from "./PreviewCurriculumSidebar";
import styles from "./courseCatalog.module.css";

export function CoursePreviewPage() {
  const { courseId, lessonId } = useParams();
  const [params] = useSearchParams();
  const query = usePublicPreview(courseId, lessonId);
  const [mediaExpired, setMediaExpired] = useState(false);
  const retry = () => {
    setMediaExpired(false);
    void query.refetch();
  };
  return (
    <main className={styles.page}>
      <Link className={styles.back} to={`/courses/${courseId}${params.size ? `?${params}` : ""}`}>
        ← Chi tiết khóa học
      </Link>
      <div className={styles.previewLayout}>
        <div className={styles.previewMain}>
          {query.isPending ? (
            <p className={styles.status} role="status">
              Đang tải bài học xem trước…
            </p>
          ) : query.isError ? (
            <EmptyState
              title={
                isAxiosError(query.error) && query.error.response?.status === 404
                  ? "Bài học không có quyền xem trước"
                  : "Không tải được bài học"
              }
              description="Nội dung có thể đã thay đổi. Vui lòng thử lại."
              action={<Button onClick={retry}>Thử lại</Button>}
            />
          ) : (
            <>
              <h1>{query.data.title}</h1>
              {mediaExpired && (
                <div className={styles.notice} role="alert">
                  Liên kết nội dung có thể đã hết hạn.{" "}
                  <Button onClick={retry}>Tải liên kết mới</Button>
                </div>
              )}
              {query.data.textContent && (
                <section className={styles.section}>
                  <h2>Nội dung bài học</h2>
                  <MarkdownPreview value={query.data.textContent} />
                </section>
              )}
              {query.data.videos.length > 0 && (
                <section className={styles.section}>
                  <h2>Video</h2>
                  {query.data.videos.map((video, index) => (
                    <div key={video.id} className={styles.media}>
                      <video
                        controls
                        preload="metadata"
                        aria-label={`Video ${index + 1}: ${video.fileName}`}
                        src={video.url}
                        onError={() => setMediaExpired(true)}
                      >
                        Trình duyệt không hỗ trợ phát video.
                      </video>
                    </div>
                  ))}
                </section>
              )}
              {!query.data.textContent &&
                !query.data.videos.length &&
                query.data.attachments.length > 0 && (
                  <p className={styles.status}>Tài liệu của bài học nằm trong thanh bên.</p>
                )}
              {!query.data.textContent &&
                !query.data.videos.length &&
                !query.data.attachments.length && (
                  <EmptyState title="Bài học chưa có nội dung xem trước" />
                )}
            </>
          )}
        </div>
        <PreviewCurriculumSidebar
          courseId={courseId}
          lessonId={lessonId}
          query={params.size ? `?${params}` : ""}
          attachments={query.isSuccess ? query.data.attachments : []}
          onRefreshDocuments={retry}
        />
      </div>
    </main>
  );
}
