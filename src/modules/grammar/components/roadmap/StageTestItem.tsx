import { ClipboardCheck, Lock } from "lucide-react";

import type { StageProgressDto } from "../../types/grammar.types";
import type { CurriculumStage } from "../../utils/grammar-curriculum";
import { cx } from "../../utils/cx";
import styles from "./StageTestItem.module.css";

interface StageTestItemProps {
  stage: CurriculumStage;
  st: StageProgressDto | undefined;
  on: boolean;
  onSelect: () => void;
}

/** End-of-stage test button: locked (lock + "Xong x/y chuyên đề để mở" with a thin bar), open, or passed. */
export function StageTestItem({ stage, st, on, onSelect }: StageTestItemProps) {
  const locked = !st?.unlocked;
  const requirement = st?.requirement;
  const hasBest = st?.best !== null && st?.best !== undefined;
  return (
    <button
      type="button"
      className={cx(
        styles.test,
        on && styles.isOn,
        locked && styles.isLocked,
        st?.passed && styles.isPassed,
      )}
      onClick={onSelect}
      {...(on ? { "data-active": "true" } : {})}
    >
      {locked ? <Lock size={16} /> : <ClipboardCheck size={16} />}
      <span className={styles.title}>
        {stage.test.title}
        {hasBest && (
          <span className={styles.best}>
            {st?.best}/{st?.total}
          </span>
        )}
      </span>
      {locked && requirement ? (
        <span className={styles.description}>
          Xong {requirement.required}/{requirement.total} chuyên đề để mở
          <span className={styles.bar}>
            <span
              style={{
                width: `${requirement.required ? Math.min(100, (100 * requirement.completed) / requirement.required) : 0}%`,
              }}
            />
          </span>
        </span>
      ) : (
        <span className={styles.description}>{stage.test.description}</span>
      )}
    </button>
  );
}
