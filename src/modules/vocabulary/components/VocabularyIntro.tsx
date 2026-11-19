import { ArrowRight, LogIn, Play, RotateCcw, Target } from "lucide-react";

import mascot from "@/assets/mascot/oy2-reading.png";
import { ButtonLink, Eyebrow, NumberTile, ProgressBar, Skeleton } from "@/shared/components/ui";

import type { LearnerSummaryDto, ReviewMode, StageDto } from "../types/vocabulary.types";
import { toStudyMode } from "../utils/study-session";
import { formatCount, padOrder } from "../utils/vocabulary-format";
import { StageMap, type StageMapNode } from "./StageMap";
import styles from "./VocabularyIntro.module.css";

interface VocabularyIntroProps {
  stages: StageDto[];
  signedIn: boolean;
  loading: boolean;
  summary: LearnerSummaryDto | undefined;
  defaultMode: ReviewMode;
  dailyGoal: number;
  onSelectStage: (stageId: string) => void;
}

/** Overview shown on `/vocabulary` before a stage is chosen. */
export function VocabularyIntro({
  stages,
  signedIn,
  loading,
  summary,
  defaultMode,
  dailyGoal,
  onSelectStage,
}: VocabularyIntroProps) {
  const byStage = new Map((summary?.stages ?? []).map((row) => [row.stageId, row]));
  const nodes: StageMapNode[] = stages.map((stage) => ({
    stage,
    setsCompleted: summary ? (byStage.get(stage.id)?.setsCompleted ?? 0) : undefined,
  }));
  const mode = toStudyMode(defaultMode);
  const active = summary?.activeSession;
  const goal = summary?.dailyGoal || dailyGoal;

  return (
    <div className={styles.intro}>
      <section className={styles.hero} aria-labelledby="vocabulary-title">
        <div className={styles.lead}>
          <Eyebrow>Lộ trình từ vựng · TOEIC</Eyebrow>
          <h1 id="vocabulary-title" className={styles.title}>
            Học <span className={styles.highlight}>từ vựng</span>
          </h1>
          <p className={styles.subtitle}>5 chặng theo dải điểm TOEIC</p>
        </div>
        <figure className={styles.polaroid} aria-hidden="true">
          <div className={styles.photo}>
            <img src={mascot} alt="" />
          </div>
          <figcaption className={styles.caption}>TOEIC 0 → 990</figcaption>
        </figure>
      </section>

      {/* Stats, goal and actions belong together: one row. */}
      <div className={styles.row}>
        {signedIn &&
          (loading || !summary ? (
            <Skeleton width={360} height={56} />
          ) : (
            <>
              <div className={styles.stats}>
                <NumberTile value={formatCount(summary.lessonCount)} caption="Bài học" />
                <NumberTile
                  value={formatCount(summary.due)}
                  caption="Đến hạn"
                  tone={summary.due > 0 ? "pink" : undefined}
                />
                <NumberTile
                  value={
                    <>
                      {formatCount(summary.lessonsCompleted)}
                      <span className={styles.of}>/{formatCount(summary.lessonCount)}</span>
                    </>
                  }
                  caption="Đã xong"
                />
              </div>
              <div className={styles.goal} title="Mục tiêu hôm nay">
                <Target size={16} className={styles.goalIcon} />
                <ProgressBar
                  className={styles.goalBar}
                  value={summary.reviewedToday}
                  max={Math.max(goal, 1)}
                  tone={summary.reviewedToday >= goal ? "green" : "pink"}
                  label="Mục tiêu hôm nay"
                />
                <span className={styles.goalCount}>
                  {formatCount(summary.reviewedToday)}/{formatCount(goal)}
                </span>
              </div>
            </>
          ))}

        <div className={styles.actions}>
          {signedIn && active && (
            <ButtonLink
              to={`/vocabulary/learn/${toStudyMode(active.mode)}?session=${active.id}`}
              variant="primary"
              icon={<Play size={16} />}
            >
              Học tiếp {Math.min(active.position + 1, active.total)}/{active.total}
            </ButtonLink>
          )}
          {signedIn && summary?.nextSet && (
            <ButtonLink
              to={`/vocabulary/sets/${summary.nextSet.setId}`}
              variant={active ? "outline" : "primary"}
              trailing={<ArrowRight size={16} />}
            >
              Bắt đầu Bài {padOrder(summary.nextSet.order)}
            </ButtonLink>
          )}
          {signedIn && summary && summary.due > 0 && (
            <ButtonLink
              to={`/vocabulary/learn/${mode}?due=1`}
              variant="mark"
              icon={<RotateCcw size={16} />}
            >
              Ôn {formatCount(summary.due)} từ
            </ButtonLink>
          )}
          {!signedIn && !loading && (
            <ButtonLink
              to={`/login?next=${encodeURIComponent("/vocabulary")}`}
              variant="primary"
              icon={<LogIn size={16} />}
            >
              Đăng nhập
            </ButtonLink>
          )}
        </div>
      </div>

      <StageMap nodes={nodes} onSelect={onSelectStage} />
    </div>
  );
}
