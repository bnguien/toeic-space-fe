import { ChevronLeft, ChevronRight, LayoutGrid, Send, SlidersHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui";

import { partMeta } from "../../utils/parts";
import type { PartJump } from "./workspaceModel";
import styles from "./WorkspaceFooter.module.css";

export interface WorkspaceFooterProps {
  phone: boolean;
  parts: readonly PartJump[];
  currentPart: number;
  /** Title of a practice-set attempt shown next to a single part. */
  setTitle?: string | null;
  onJumpPart: (groupIndex: number) => void;
  /** "Tùy chọn học & tiến độ" (practice-set attempts). */
  onSetup?: () => void;
  gridLabel: string;
  onOpenGrid: () => void;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Last group of an in-progress practice: "Nộp bài ✓" instead of "Tiếp theo". */
  submitHere: boolean;
  onSubmit: () => void;
  submitting: boolean;
  /** Phone primary button (Kiểm tra / Nộp bài / Tiếp). */
  primary: "check" | "submit" | "next";
  onCheck: () => void;
  checking: boolean;
}

/**
 * Footer (port of StudyChill `tp-footer`, 48px): part jump buttons and "Tùy chọn học & tiến độ" on
 * the left; ‹ Quay lại · ▦ a-b/N · Tiếp theo › (or Nộp bài ✓ on the last group). Phones keep
 * ‹ · ▦ · one contextual primary button.
 */
export function WorkspaceFooter({
  phone,
  parts,
  currentPart,
  setTitle,
  onJumpPart,
  onSetup,
  gridLabel,
  onOpenGrid,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  submitHere,
  onSubmit,
  submitting,
  primary,
  onCheck,
  checking,
}: WorkspaceFooterProps) {
  const single = parts.length === 1;

  return (
    <footer className={styles.footer}>
      {!phone && (
        <nav className={styles.parts} aria-label="Chuyển Part">
          {parts.map((jump) => (
            <button
              key={jump.part}
              type="button"
              className={styles.part}
              data-section={partMeta(jump.part).section}
              aria-current={jump.part === currentPart ? "true" : undefined}
              onClick={() => onJumpPart(jump.groupIndex)}
              title={`Part ${jump.part} · ${partMeta(jump.part).name}`}
            >
              Part {jump.part}
              {single && (
                <span className={styles.partMeta}>
                  {setTitle ? ` · ${setTitle}` : ""} ({jump.count} câu)
                </span>
              )}
            </button>
          ))}
          {onSetup && (
            <Button
              variant="ghost"
              size="sm"
              icon={<SlidersHorizontal size={14} aria-hidden="true" />}
              onClick={onSetup}
              title="Tùy chọn số câu, chế độ học và xem tiến độ chi tiết"
            >
              Tùy chọn học &amp; tiến độ
            </Button>
          )}
        </nav>
      )}

      <div className={styles.controls}>
        <Button
          variant="outline"
          size="sm"
          icon={<ChevronLeft size={16} aria-hidden="true" />}
          onClick={onPrevious}
          disabled={!canPrevious}
          title="Quay lại nhóm câu trước (Phím ←)"
          aria-label={phone ? "Câu trước" : undefined}
        >
          {phone ? undefined : "Quay lại"}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className={styles.grid}
          icon={<LayoutGrid size={15} aria-hidden="true" />}
          onClick={onOpenGrid}
          title="Mở bảng danh sách câu hỏi"
          aria-label={`Danh sách câu hỏi, đang ở ${gridLabel}`}
        >
          {gridLabel}
        </Button>

        {phone ? (
          primary === "check" ? (
            <Button variant="primary" size="sm" onClick={onCheck} disabled={checking}>
              {checking ? "Đang chấm…" : "Kiểm tra"}
            </Button>
          ) : primary === "submit" ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Send size={14} aria-hidden="true" />}
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Đang nộp…" : "Nộp bài"}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onNext} disabled={!canNext}>
              Tiếp ›
            </Button>
          )
        ) : submitHere ? (
          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} aria-hidden="true" />}
            onClick={onSubmit}
            disabled={submitting}
            title="Nộp bài để chấm điểm"
          >
            {submitting ? "Đang nộp…" : "Nộp bài ✓"}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onNext}
            disabled={!canNext}
            title="Chuyển sang nhóm câu tiếp theo (Phím →)"
            trailing={<ChevronRight size={16} aria-hidden="true" />}
          >
            Tiếp theo
          </Button>
        )}
      </div>
    </footer>
  );
}
