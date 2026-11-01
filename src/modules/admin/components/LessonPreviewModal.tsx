import { useState } from "react";
import { Modal, Button } from "./ui";
import { useCourseLessonPreview } from "../hooks/useCourseLessons";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import { MarkdownPreview } from "./MarkdownPreview";
import styles from "./lessonManagement.module.css";

export function LessonPreviewModal({
  courseId,
  moduleId,
  lessonId,
  onClose,
}: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  onClose: () => void;
}) {
  const preview = useCourseLessonPreview(courseId, moduleId, lessonId);
  const [expired, setExpired] = useState(false);
  return (
    <Modal
      open
      wide
      title={preview.data?.lesson.title ?? "Xem trước bài học"}
      busy={false}
      onClose={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {preview.isPending ? (
        <p className={styles.state} role="status">
          Đang tạo liên kết xem trước...
        </p>
      ) : preview.isError || !preview.data ? (
        <div className={styles.error} role="alert">
          {courseErrorMessage(preview.error)}{" "}
          <button onClick={() => void preview.refetch()}>Làm mới liên kết xem trước</button>
        </div>
      ) : (
        <div className={styles.previewContent}>
          {preview.data.videos
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((video) => (
              <div key={video.videoId}>
                <p>{video.fileName}</p>
                <video
                  className={styles.previewVideo}
                  controls
                  src={video.streamUrl}
                  onError={() => setExpired(true)}
                >
                  Trình duyệt không hỗ trợ phát video.
                </video>
              </div>
            ))}
          {expired && (
            <p className={styles.error} role="alert">
              Liên kết video xem trước có thể đã hết hạn.{" "}
              <button
                onClick={() => {
                  setExpired(false);
                  void preview.refetch();
                }}
              >
                Làm mới liên kết
              </button>
            </p>
          )}
          {preview.data.lesson.textContent && (
            <MarkdownPreview value={preview.data.lesson.textContent} />
          )}
          {preview.data.attachments.length > 0 && (
            <section>
              <h3>Tệp đính kèm</h3>
              <p className={styles.muted}>
                Liên kết tải có thời hạn; nếu hết hạn, hãy đóng và mở lại phần xem trước.
              </p>
              <ul>
                {preview.data.attachments.map((item) => (
                  <li key={item.resourceId}>
                    <a href={item.downloadUrl} target="_blank" rel="noreferrer">
                      {item.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!preview.data.videos.length &&
            !preview.data.lesson.textContent &&
            !preview.data.attachments.length && (
              <p className={styles.muted}>Bài học chưa có nội dung xem trước.</p>
            )}
        </div>
      )}
    </Modal>
  );
}
