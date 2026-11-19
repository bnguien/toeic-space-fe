import { Bookmark, BookmarkCheck } from "lucide-react";

import { cx } from "@/shared/components/ui";

import styles from "./FlagButton.module.css";

export interface FlagButtonProps {
  flagged: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Icon only (narrow cards); the label stays as the accessible name. */
  compact?: boolean;
  /** Save failed: the value shown is the server's. */
  failed?: boolean;
  className?: string;
}

/** "Đánh dấu xem lại" / "Đã đánh dấu" toggle (pink flag marker, see README). */
export function FlagButton({
  flagged,
  onToggle,
  disabled = false,
  compact = false,
  failed = false,
  className,
}: FlagButtonProps) {
  const label = flagged ? "Đã đánh dấu" : "Đánh dấu xem lại";
  return (
    <button
      type="button"
      className={cx(styles.flag, className)}
      aria-pressed={flagged}
      aria-label={compact ? label : undefined}
      title={failed ? "Chưa lưu được đánh dấu, thử lại" : label}
      data-flagged={flagged || undefined}
      data-compact={compact || undefined}
      data-failed={failed || undefined}
      disabled={disabled}
      onClick={onToggle}
    >
      {flagged ? (
        <BookmarkCheck size={16} aria-hidden="true" />
      ) : (
        <Bookmark size={16} aria-hidden="true" />
      )}
      {!compact && <span>{label}</span>}
    </button>
  );
}
