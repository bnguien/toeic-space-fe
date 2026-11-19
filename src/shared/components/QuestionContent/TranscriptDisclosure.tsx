import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import styles from "./QuestionContent.module.css";

export function TranscriptDisclosure({ children }: { children: ReactNode }) {
  return (
    <details className={styles.transcript}>
      <summary>
        <ChevronRight className={styles.arrow} size={16} aria-hidden="true" />
        <span>Bản chép lời</span>
      </summary>
      <div className={styles.transcriptBody}>{children}</div>
    </details>
  );
}
