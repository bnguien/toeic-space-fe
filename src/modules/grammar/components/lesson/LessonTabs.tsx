import {
  BookOpen,
  Languages,
  MessageSquare,
  NotebookPen,
  PencilLine,
  type LucideIcon,
} from "lucide-react";

import type { LessonPart } from "../../types/grammar.types";
import { cx } from "../../utils/cx";
import { TOPIC_PARTS } from "../../utils/grammar-curriculum";
import styles from "./LessonTabs.module.css";

const ICON_PHAN: Record<LessonPart, LucideIcon> = {
  theory: BookOpen,
  vocab: Languages,
  exercises: PencilLine,
};

interface LessonTabsProps {
  number: number;
  part: LessonPart;
  onSelectPart: (topicNum: number, part: LessonPart) => void;
  onOpenReview?: () => void;
  comments: { open: boolean; toggle: () => void } | null;
}

/** Parts bar (Kiến thức / Từ vựng / Bài tập) under the banner + Bình luận (documents) and Ôn tập shortcuts. */
export function LessonTabs({
  number: topicNum,
  part,
  onSelectPart,
  onOpenReview: onRevision,
  comments,
}: LessonTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Phần của chuyên đề">
      {TOPIC_PARTS.map((p) => {
        const Icon = ICON_PHAN[p.id];
        return (
          <button
            key={p.id}
            type="button"
            className={cx(styles.tab, part === p.id && styles.isOn)}
            aria-current={part === p.id ? "page" : undefined}
            onClick={() => onSelectPart(topicNum, p.id)}
          >
            <Icon size={16} /> {p.title}
          </button>
        );
      })}
      <span className={styles.extra}>
        {comments && (
          <button
            type="button"
            className={cx(styles.tabLink, comments.open && styles.isOn)}
            onClick={comments.toggle}
            aria-pressed={comments.open}
          >
            <MessageSquare size={15} /> Bình luận
          </button>
        )}
        {onRevision && (
          <button type="button" className={styles.tabLink} onClick={onRevision}>
            <NotebookPen size={15} /> Ôn tập
          </button>
        )}
      </span>
    </nav>
  );
}
