import { Fragment } from "react";

import type { StageDto } from "../types/vocabulary.types";
import { stageToneStyle } from "../utils/stage-tones";
import { formatToeicTarget, padOrder } from "../utils/vocabulary-format";
import styles from "./StageMap.module.css";

export interface StageMapNode {
  stage: StageDto;
  /** Finished lessons; undefined for guests. */
  setsCompleted?: number;
}

interface StageMapProps {
  nodes: StageMapNode[];
  onSelect: (stageId: string) => void;
}

/** Five stage nodes joined by a line, each in its stage tone. */
export function StageMap({ nodes, onSelect }: StageMapProps) {
  return (
    <ol className={styles.map} aria-label="Lộ trình">
      {nodes.map(({ stage, setsCompleted }, index) => (
        <Fragment key={stage.id}>
          {index > 0 && <li className={styles.link} aria-hidden="true" />}
          <li className={styles.cell}>
            <button
              type="button"
              className={styles.node}
              style={stageToneStyle(stage.order)}
              onClick={() => onSelect(stage.id)}
            >
              <span className={styles.step}>Chặng {padOrder(index + 1)}</span>
              <span className={styles.target}>{formatToeicTarget(stage.toeicTarget)}</span>
              <span className={styles.name}>{stage.title}</span>
              <span className={styles.meta}>
                {stage.setCount} bài
                {setsCompleted !== undefined && ` · ${setsCompleted} đã xong`}
              </span>
            </button>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
