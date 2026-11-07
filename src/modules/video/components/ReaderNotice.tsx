import type { ReactNode } from "react";

import { formatTime } from "../utils/subtitle-reading";
import styles from "./ReaderNotice.module.css";

interface ReaderNoticeProps {
  children: ReactNode;
  /** Shows "Thử lại" (temporary errors only). */
  onRetry?: (() => void) | null;
}

/** Warning box under the transport (player sync error, subtitle error). */
export function ReaderNotice({ children, onRetry = null }: ReaderNoticeProps) {
  return (
    <div className={styles.warn}>
      {children}
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

interface ReaderResumePromptProps {
  resumeAt: number;
  playerReady: boolean;
  onResume: () => void;
  onDismiss: () => void;
}

/** "Lần trước bạn xem tới m:ss" — Xem tiếp / Từ đầu. */
export function ReaderResumePrompt({
  resumeAt,
  playerReady,
  onResume,
  onDismiss,
}: ReaderResumePromptProps) {
  return (
    <div className={styles.resume} role="status">
      <span>{`Lần trước bạn xem tới ${formatTime(resumeAt)}.`}</span>
      <button type="button" className={styles.resumeGo} onClick={onResume} disabled={!playerReady}>
        Xem tiếp
      </button>
      <button type="button" className={styles.resumeNo} onClick={onDismiss}>
        Từ đầu
      </button>
    </div>
  );
}
