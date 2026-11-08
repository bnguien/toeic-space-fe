import { ArrowRight, Trophy } from "lucide-react";

import type { NewsStage } from "../types/news.types";
import { STAGES, stageLabel } from "../utils/news-catalog";
import styles from "./NewsStagePanel.module.css";

interface NewsStagePanelProps {
  stage: NewsStage | "all";
  counts: Partial<Record<NewsStage, number>>;
  onPick: (stage: NewsStage) => void;
  onClear: () => void;
}

/** The five TOEIC stages: a card toggles the stage filter (a horizontal snap strip under 900px). */
export function NewsStagePanel({ stage, counts, onPick, onClear }: NewsStagePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <span className={styles.kicker}>Từ dễ đến khó</span>
          <h3>Mỗi bài báo, một bước tiến.</h3>
        </div>
        <span className={styles.goal}>
          <Trophy size={16} /> Đọc hiểu TOEIC
        </span>
      </div>
      <div className={styles.stages} role="group" aria-label="Chọn chặng theo điểm TOEIC">
        {STAGES.map((info, index) => {
          const active = stage === info.key;
          return (
            <button
              key={info.key}
              type="button"
              className={`${styles.stage} ${active ? styles.stageActive : ""}`}
              aria-pressed={active}
              onClick={() => onPick(info.key)}
            >
              <span className={styles.stageTop}>
                CHẶNG {String(index + 1).padStart(2, "0")} <ArrowRight size={15} />
              </span>
              <span className={styles.stageScore}>
                {info.score}
                <small>TOEIC</small>
              </span>
              <b>{info.name}</b>
              <span className={styles.stageNote}>{info.description}</span>
              <span className={styles.stageBottom}>
                <small>{counts[info.key] ?? 0} bài</small>
                <span>{active ? "Đang lọc" : "Xem bài"}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.foot}>
        {stage === "all" ? "Đang hiện mọi chặng" : `Đang lọc: ${stageLabel(stage)}`}
        {stage !== "all" && (
          <button type="button" onClick={onClear}>
            Bỏ lọc chặng <ArrowRight size={13} />
          </button>
        )}
      </p>
    </div>
  );
}
