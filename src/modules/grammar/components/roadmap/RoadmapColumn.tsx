import { lessonOf, type GrammarProgressState } from "../../store/grammar-progress.store";
import { GRAMMAR_STAGES, TOPIC_COUNT } from "../../utils/grammar-curriculum";
import { RoadmapStats } from "./RoadmapStats";
import styles from "./RoadmapColumn.module.css";
import { StageTestItem } from "./StageTestItem";
import { ThemeToggle } from "./ThemeToggle";
import { TopicItem } from "./TopicItem";

interface RoadmapColumnProps {
  progress: GrammarProgressState;
  openTopic: number | null;
  onToggleTopic: (topicNum: number) => void;
  theoryTopic: number | null;
  onToggleTheory: (topicNum: number) => void;
  selected: string | null;
  onSelectItem: (id: string) => void;
  onSelectStage: (id: string) => void;
  onOpenRevision: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

/** Roadmap: stats, 5 stages × topics (parts, units), stage tests. */
export function RoadmapColumn({
  progress,
  openTopic,
  onToggleTopic,
  theoryTopic,
  onToggleTheory,
  selected,
  onSelectItem,
  onSelectStage,
  onOpenRevision,
  dark,
  onToggleDark,
}: RoadmapColumnProps) {
  return (
    <>
      <ThemeToggle dark={dark} onToggle={onToggleDark} className={styles.theme} />
      <RoadmapStats stats={progress.stats} onOpenReview={onOpenRevision} />

      {GRAMMAR_STAGES.map((stage) => (
        <section key={stage.id} className={styles.stage}>
          <div className={styles.stageHead}>
            <h2>
              Chặng {stage.number} · {stage.title}
            </h2>
            <span>
              {stage.score} · {stage.topics.length} chuyên đề
            </span>
          </div>
          <ol className={styles.topicList}>
            {stage.topics.map((topicItem) => (
              <TopicItem
                key={topicItem.number}
                topic={topicItem}
                l={lessonOf(progress, topicItem.number)}
                open={openTopic === topicItem.number}
                onToggle={() => onToggleTopic(topicItem.number)}
                selected={selected}
                onSelect={onSelectItem}
                theoryOpen={theoryTopic === topicItem.number}
                onToggleTheory={() => onToggleTheory(topicItem.number)}
              />
            ))}
          </ol>
          <StageTestItem
            stage={stage}
            st={progress.stages[stage.number]}
            on={selected === stage.id}
            onSelect={() => onSelectStage(stage.id)}
          />
        </section>
      ))}
      <p className={styles.foot}>{TOPIC_COUNT} chuyên đề · 5 chặng · 0 → 990</p>
    </>
  );
}
