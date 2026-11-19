import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "./ui";
import { uploadLessonMediaBatch } from "../hooks/useCourseLessons";
import type { CourseLessonResource, LessonMediaDraft } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import styles from "./lessonManagement.module.css";

export function LessonMediaEditor({
  videos,
  onVideosChange,
  resources,
  pendingResources,
  onPendingResourcesChange,
  removedResourceIds,
  onToggleResourceRemoval,
  disabled,
  onError,
  onBusyChange,
  isPersisted,
  onPreviewSavedMedia,
}: {
  videos: LessonMediaDraft[];
  onVideosChange: (videos: LessonMediaDraft[]) => void;
  resources: CourseLessonResource[];
  pendingResources: LessonMediaDraft[];
  onPendingResourcesChange: (resources: LessonMediaDraft[]) => void;
  removedResourceIds: string[];
  onToggleResourceRemoval: (resourceId: string) => void;
  disabled: boolean;
  onError: (message: string) => void;
  onBusyChange: (kind: "video" | "attachments", busy: boolean) => void;
  isPersisted: boolean;
  onPreviewSavedMedia: () => void;
}) {
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const current = urls.current;
    return () => current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const releaseUrl = (url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>, kind: "Video" | "Attachment") => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || disabled) return;
    if (kind === "Video" && videos.length + files.length > 10) {
      onError("Mỗi bài học chỉ được có tối đa 10 video.");
      return;
    }
    const progress = kind === "Video" ? setVideoProgress : setAttachmentProgress;
    const busyKind = kind === "Video" ? "video" : "attachments";
    onError("");
    onBusyChange(busyKind, true);
    progress(0);
    try {
      const results = await uploadLessonMediaBatch(files, kind, (_, percent) => progress(percent));
      const uploaded = results.flatMap((result, index) => {
        if (!result.key) return [];
        const previewUrl = URL.createObjectURL(files[index]);
        urls.current.add(previewUrl);
        return [{ key: result.key, fileName: result.fileName, previewUrl }];
      });
      if (kind === "Video") onVideosChange([...videos, ...uploaded]);
      else onPendingResourcesChange([...pendingResources, ...uploaded]);
      const errors = results
        .filter((result) => result.error)
        .map((result) => `${result.fileName}: ${result.error}`);
      if (errors.length) onError(errors.join("; "));
    } catch (error) {
      onError(courseErrorMessage(error));
    } finally {
      progress(null);
      onBusyChange(busyKind, false);
    }
  };

  const moveVideo = (index: number, direction: -1 | 1) => {
    const next = [...videos];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onVideosChange(next);
  };

  return (
    <>
      <section className={styles.uploadGroup}>
        <div className={styles.uploadHeader}>
          <span>
            Video bài học{" "}
            <span className={styles.muted}>(MP4, tối đa 500 MB/video; tối đa 10 video)</span>
          </span>
          <span className={styles.muted}>{videos.length} video</span>
        </div>
        {videos.map((video, index) => (
          <div className={styles.mediaItem} key={video.key}>
            <span>
              {index + 1}. {video.fileName}
            </span>
            <div className={styles.mediaActions}>
              {video.previewUrl ? (
                <video className={styles.inlineVideoPreview} controls src={video.previewUrl}>
                  Trình duyệt không hỗ trợ phát video.
                </video>
              ) : (
                isPersisted && (
                  <Button size="sm" disabled={disabled} onClick={onPreviewSavedMedia}>
                    Xem trước
                  </Button>
                )
              )}
              <Button
                size="sm"
                disabled={disabled || index === 0}
                onClick={() => moveVideo(index, -1)}
                aria-label={`Đưa ${video.fileName} lên`}
              >
                ↑
              </Button>
              <Button
                size="sm"
                disabled={disabled || index === videos.length - 1}
                onClick={() => moveVideo(index, 1)}
                aria-label={`Đưa ${video.fileName} xuống`}
              >
                ↓
              </Button>
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => {
                  releaseUrl(video.previewUrl);
                  onVideosChange(videos.filter((item) => item.key !== video.key));
                }}
              >
                Gỡ khi lưu
              </Button>
            </div>
          </div>
        ))}
        <input
          className={styles.uploadInput}
          type="file"
          multiple
          accept="video/mp4,.mp4"
          disabled={disabled || videoProgress !== null}
          onChange={(event) => void upload(event, "Video")}
        />
        {videoProgress !== null && <Progress progress={videoProgress} label="Đang tải video" />}
      </section>
      <section className={styles.uploadGroup}>
        <div className={styles.uploadHeader}>
          <span>
            Tệp đính kèm{" "}
            <span className={styles.muted}>(PDF, JPEG, PNG, WebP; tối đa 20 MB/tệp)</span>
          </span>
          <span className={styles.muted}>
            {resources.length - removedResourceIds.length + pendingResources.length} tệp
          </span>
        </div>
        <input
          className={styles.uploadInput}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          disabled={disabled || attachmentProgress !== null}
          onChange={(event) => void upload(event, "Attachment")}
        />
        {attachmentProgress !== null && (
          <Progress progress={attachmentProgress} label="Đang tải tệp đính kèm" />
        )}
        {resources.map((resource) => (
          <div className={styles.mediaItem} key={resource.id}>
            <span>
              {resource.fileName}
              {removedResourceIds.includes(resource.id) ? " · Sẽ được gỡ" : ""}
            </span>
            <div className={styles.mediaActions}>
              {!removedResourceIds.includes(resource.id) && (
                <Button size="sm" disabled={disabled} onClick={onPreviewSavedMedia}>
                  Xem trước
                </Button>
              )}
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => onToggleResourceRemoval(resource.id)}
              >
                {removedResourceIds.includes(resource.id) ? "Hoàn tác" : "Gỡ khi lưu"}
              </Button>
            </div>
          </div>
        ))}
        {pendingResources.map((resource) => (
          <div className={styles.mediaItem} key={resource.key}>
            <span>{resource.fileName} · Đã tải, chờ lưu bài học</span>
            <div className={styles.mediaActions}>
              {resource.previewUrl && (
                <a
                  className={styles.mediaPreviewLink}
                  href={resource.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trước
                </a>
              )}
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => {
                  releaseUrl(resource.previewUrl);
                  onPendingResourcesChange(
                    pendingResources.filter((item) => item.key !== resource.key),
                  );
                }}
              >
                Bỏ
              </Button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function Progress({ progress, label }: { progress: number; label: string }) {
  return (
    <div className={styles.progressWrap} role="status">
      <span>
        {label}: {progress}%
      </span>
      <div className={styles.progressTrack}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
