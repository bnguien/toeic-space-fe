import { ArrowLeft, Settings2 } from "lucide-react";

import styles from "./ReaderHeader.module.css";

interface ReaderHeaderProps {
  title: string;
  /** A gloss request is running. */
  fetchingGloss: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onClose: () => void;
}

export function ReaderHeader({
  title,
  fetchingGloss,
  settingsOpen,
  onToggleSettings,
  onClose,
}: ReaderHeaderProps) {
  return (
    <header className={styles.top}>
      <button type="button" className={styles.back} onClick={onClose} aria-label="Đổi video">
        <ArrowLeft size={18} aria-hidden="true" />
        <span className={styles.backText}>Đổi video</span>
      </button>
      <div className={styles.title} title={title}>
        {title}
      </div>
      {fetchingGloss && (
        <span className={styles.ai} role="status">
          <span className={styles.aiDot} aria-hidden="true" />
          <span className={styles.aiText}>đang tra nghĩa…</span>
        </span>
      )}
      <button
        type="button"
        className={`${styles.icon} ${styles.gear}`}
        onClick={onToggleSettings}
        aria-label="Cài đặt đọc"
        aria-expanded={settingsOpen}
        title="Cài đặt đọc"
      >
        <Settings2 size={20} aria-hidden="true" />
      </button>
    </header>
  );
}
