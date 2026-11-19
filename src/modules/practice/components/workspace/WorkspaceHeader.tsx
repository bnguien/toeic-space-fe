import { Link } from "react-router-dom";
import { BookOpen, Eye, LogOut, Maximize, Minimize, Send, Trophy } from "lucide-react";

import logo from "@/assets/mascot/oy2-hello.png";
import { Button, ProgressBar, Switch } from "@/shared/components/ui";

import { ClockBadge } from "../common";
import styles from "./WorkspaceHeader.module.css";

export interface WorkspaceHeaderProps {
  title: string;
  progressLabel: string;
  progress: { value: number; max: number };
  section: "listening" | "reading";
  phone: boolean;
  fullscreen: { supported: boolean; active: boolean; toggle: () => void };
  lookup: { on: boolean; toggle: (on: boolean) => void; disabled?: boolean };
  /** Elapsed seconds (practice) or the duration of a submitted attempt. */
  seconds: number;
  clockLabel: string;
  /** "Nộp bài" (in-progress practice). */
  onSubmit?: () => void;
  submitting?: boolean;
  /** "Xem điểm: 650/990" after submit. */
  scoreLabel?: string | null;
  onShowScore?: () => void;
  /** Review mode: "Xem lại" + link to the result page. */
  review?: { resultHref: string; scoreLabel: string | null } | null;
  onExit: () => void;
  exiting?: boolean;
}

/**
 * Workspace header (port of StudyChill `tp-header`, 54px; one 48px row on phones): brand, progress
 * "Câu X / N", fullscreen, the lookup switch, the clock, Nộp bài / Xem điểm and Thoát.
 */
export function WorkspaceHeader({
  title,
  progressLabel,
  progress,
  section,
  phone,
  fullscreen,
  lookup,
  seconds,
  clockLabel,
  onSubmit,
  submitting = false,
  scoreLabel,
  onShowScore,
  review,
  onExit,
  exiting = false,
}: WorkspaceHeaderProps) {
  return (
    <header className={styles.header} data-section={section}>
      <div className={styles.brand}>
        <img src={logo} alt="" width={34} height={34} className={styles.logo} />
        <div className={styles.brandText}>
          <strong>TOEIC Space</strong>
          <span title={title}>{title}</span>
        </div>
      </div>

      <button
        type="button"
        className={styles.exitPhone}
        onClick={onExit}
        disabled={exiting}
        aria-label="Thoát"
      >
        <LogOut size={17} aria-hidden="true" />
      </button>

      <div className={styles.progress}>
        <p className={styles.progressLabel} aria-live="polite">
          {progressLabel}
        </p>
        <ProgressBar
          value={progress.value}
          max={progress.max}
          size="xs"
          tone={section === "reading" ? "rose" : "blue"}
          label="Tiến độ trong bài"
        />
      </div>

      <div className={styles.actions}>
        {fullscreen.supported && !phone && (
          <Button
            variant="ghost"
            size="sm"
            className={styles.fullscreen}
            icon={
              fullscreen.active ? (
                <Minimize size={15} aria-hidden="true" />
              ) : (
                <Maximize size={15} aria-hidden="true" />
              )
            }
            onClick={fullscreen.toggle}
            title={fullscreen.active ? "Thu nhỏ màn hình (Esc)" : "Bật toàn màn hình"}
          >
            <span className={styles.fullscreenText}>
              {fullscreen.active ? "Thu nhỏ" : "Toàn màn hình"}
            </span>
          </Button>
        )}

        <Switch
          className={styles.lookup}
          checked={lookup.on}
          onChange={lookup.toggle}
          disabled={lookup.disabled}
          label={
            <span
              className={styles.lookupLabel}
              title={
                lookup.on
                  ? "Đang bật: bôi đen chữ bất kỳ trong bài để tra nghĩa và lưu từ"
                  : "Bật lên để bôi đen tra từ ngay trong bài"
              }
            >
              <BookOpen size={14} aria-hidden="true" />
              <span className={styles.lookupLong}>Chế độ tra từ</span>
              <span className={styles.lookupShort}>Tra từ</span>
            </span>
          }
        />

        <ClockBadge
          className={styles.clock}
          seconds={seconds}
          label={phone ? undefined : clockLabel}
        />

        {review && (
          <Link to={review.resultHref} className={styles.reviewChip}>
            <Eye size={14} aria-hidden="true" />
            <span>Xem lại</span>
            {review.scoreLabel && <strong>{review.scoreLabel}</strong>}
          </Link>
        )}

        {onSubmit && (
          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} aria-hidden="true" />}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </Button>
        )}

        {scoreLabel && onShowScore && (
          <Button
            variant="secondary"
            size="sm"
            className={styles.score}
            icon={<Trophy size={14} aria-hidden="true" />}
            onClick={onShowScore}
          >
            <span className={styles.scoreWord}>Xem điểm: </span>
            {scoreLabel}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className={styles.exit}
          icon={<LogOut size={14} aria-hidden="true" />}
          onClick={onExit}
          disabled={exiting}
          title="Rời khỏi bài làm và quay về trang trước"
        >
          Thoát
        </Button>
      </div>
    </header>
  );
}
