import { Kbd } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";

import type { SchedulePreviewDto, SelfGrade } from "../types/vocabulary.types";
import { previewFor } from "../utils/study-session";
import { formatInterval } from "../utils/vocabulary-format";
import styles from "./GradeBar.module.css";

const GRADES: ReadonlyArray<{ grade: SelfGrade; label: string; key: string }> = [
  { grade: "Forget", label: "Quên", key: "1" },
  { grade: "Hard", label: "Khó", key: "2" },
  { grade: "Good", label: "Nhớ", key: "3" },
  { grade: "Easy", label: "Dễ", key: "4" },
];

interface GradeBarProps {
  preview: SchedulePreviewDto;
  onGrade: (grade: SelfGrade) => void;
  disabled?: boolean;
}

export function GradeBar({ preview, onGrade, disabled = false }: GradeBarProps) {
  useHotkeys((event) => {
    const match = GRADES.find((item) => item.key === event.key);
    if (match) {
      event.preventDefault();
      onGrade(match.grade);
    }
  }, !disabled);

  return (
    <div className={styles.bar} role="group" aria-label="Mức độ nhớ">
      {GRADES.map(({ grade, label, key }) => (
        <button
          key={grade}
          type="button"
          className={styles.grade}
          data-grade={grade}
          disabled={disabled}
          onClick={() => onGrade(grade)}
        >
          <span className={styles.label}>{label}</span>
          <span className={styles.interval}>{formatInterval(previewFor(preview, grade))}</span>
          <Kbd className={styles.kbd}>{key}</Kbd>
        </button>
      ))}
    </div>
  );
}
