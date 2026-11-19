import { Trash2 } from "lucide-react";

import type { MyVideoItem } from "../../types/video-catalog.types";
import styles from "./DeleteVideoModal.module.css";

export interface DeleteVideoModalProps {
  /** The video about to be removed; null hides the modal. */
  video: MyVideoItem | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "Xác nhận xóa video" — backdrop click cancels, buttons lock while deleting. */
export function DeleteVideoModal({
  video,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteVideoModalProps) {
  if (!video) return null;
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.top}>
          <div className={styles.dangerCircle}>
            <Trash2 size={22} />
          </div>
          <h3 id="video-delete-title" className={styles.title}>
            Xác nhận xóa video
          </h3>
        </div>

        <p className={styles.description}>
          Bạn có chắc chắn muốn bỏ video <strong>"{video.title}"</strong> khỏi danh sách học của
          mình không?
        </p>

        <div className={styles.buttons}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={isDeleting}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
