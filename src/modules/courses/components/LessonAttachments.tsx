import {
  FileText,
  FileAudio,
  FileImage,
  FileArchive,
  File,
  Download,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import type { PublicPreview } from "../courseCatalog";
import styles from "./LessonAttachments.module.css";

interface LessonAttachmentsProps {
  attachments: PublicPreview["attachments"];
  onRefresh?: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Tệp đính kèm";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getFileIcon(fileName: string, contentType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || contentType.includes("pdf")) return <FileText size={17} />;
  if (["mp3", "wav", "m4a", "ogg"].includes(ext) || contentType.includes("audio"))
    return <FileAudio size={17} />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || contentType.includes("image"))
    return <FileImage size={17} />;
  if (["zip", "rar", "7z", "tar"].includes(ext)) return <FileArchive size={17} />;
  return <File size={17} />;
}

function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase();
  return ext || "FILE";
}

export function LessonAttachments({ attachments, onRefresh }: LessonAttachmentsProps) {
  if (!attachments || !attachments.length) return null;

  return (
    <section className={styles.attachmentsCard} aria-labelledby="attachments-title">
      <div className={styles.cardHeader}>
        <h3 id="attachments-title" className={styles.headerTitle}>
          <Paperclip size={18} />
          <span>Tài liệu bài học</span>
          <span className={styles.countBadge}>{attachments.length}</span>
        </h3>

        {onRefresh && (
          <button type="button" className={styles.refreshBtn} onClick={onRefresh}>
            Làm mới liên kết tải
          </button>
        )}
      </div>

      <ul className={styles.fileList}>
        {attachments.map((file) => {
          const typeLabel = getFileTypeLabel(file.fileName);
          return (
            <li key={file.id} className={styles.fileItem}>
              <div className={styles.fileLeft}>
                <div className={styles.fileIconWrapper}>
                  {getFileIcon(file.fileName, file.contentType)}
                </div>
                <div className={styles.fileMeta}>
                  <span className={styles.fileName} title={file.fileName}>
                    {file.fileName}
                  </span>
                  <div className={styles.fileSubText}>
                    <span className={styles.fileTypeBadge}>{typeLabel}</span>
                    <span>•</span>
                    <span>{formatBytes(file.fileSize)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.fileActions}>
                <a
                  href={file.url}
                  className={styles.actionBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Xem tài liệu trực tiếp"
                  aria-label={`Xem tài liệu ${file.fileName}`}
                >
                  <ExternalLink size={14} />
                  <span>Xem</span>
                </a>
                <a
                  href={file.url}
                  download={file.fileName}
                  className={`${styles.actionBtn} ${styles.downloadBtn}`}
                  title="Tải tệp xuống máy"
                  aria-label={`Tải xuống ${file.fileName}`}
                >
                  <Download size={14} />
                  <span>Tải về</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
