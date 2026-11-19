import listeningMascot from "@/assets/mascot/oy2-listening.png";
import readingMascot from "@/assets/mascot/oy2-reading.png";
import { ProgressBar, Skeleton } from "@/shared/components/ui";

import type { SetQuestionCounts } from "../../utils/practiceSelection";
import styles from "./Setup.module.css";

interface SetupHeroProps {
  part: number;
  title: string;
  /** "Căn bản 450+ · 95 câu · 60 phút" */
  meta: string;
  counts: SetQuestionCounts | null;
  loading: boolean;
}

/** Greeting + progress of the set: bar and Đã làm / Chưa làm / Chấm sai. */
export function SetupHero({ part, title, meta, counts, loading }: SetupHeroProps) {
  return (
    <header className={styles.hero} data-section={part <= 4 ? "listening" : "reading"}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Góc luyện tập · Part {part || "?"}</p>
        <h1 id="setup-title">Hôm nay bạn muốn học thế nào?</h1>
        <p className={styles.heroSet}>
          <b>{title}</b>
          {meta && <span>{meta}</span>}
        </p>
        {loading ? (
          <Skeleton width="80%" height={52} className={styles.heroSkeleton} />
        ) : (
          counts && (
            <div className={styles.progress}>
              <ProgressBar
                value={counts.percent}
                tone="outline"
                inverted
                size="md"
                label={`Đã làm ${counts.percent}% bộ luyện`}
              />
              <dl className={styles.kpis}>
                <div>
                  <dt>Đã làm</dt>
                  <dd>
                    {counts.answered}
                    <small>/{counts.total}</small>
                  </dd>
                </div>
                <div>
                  <dt>Chưa làm</dt>
                  <dd>{counts.unanswered}</dd>
                </div>
                <div data-wrong={counts.wrong > 0 || undefined}>
                  <dt>Chấm sai</dt>
                  <dd>{counts.wrong}</dd>
                </div>
              </dl>
            </div>
          )
        )}
      </div>
      <img
        className={styles.heroMascot}
        src={part <= 4 ? listeningMascot : readingMascot}
        alt=""
        width="168"
        height="168"
      />
    </header>
  );
}
