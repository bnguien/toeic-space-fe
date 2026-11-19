import {
  BookOpen,
  Check,
  ChevronDown,
  Languages,
  PencilLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { isInProgress } from "../../store/grammar-progress.store";
import type { LessonPart, LessonProgressDto } from "../../types/grammar.types";
import { TOPIC_PARTS, type CurriculumTopic } from "../../utils/grammar-curriculum";
import { cx } from "../../utils/cx";
import { Collapse } from "./Collapse";
import styles from "./TopicItem.module.css";

const PART_ICONS: Record<LessonPart, LucideIcon> = {
  theory: BookOpen,
  vocab: Languages,
  exercises: PencilLine,
};

/** Marks the highlighted roadmap item so the page can scroll the column to it. */
const activeAttr = (on: boolean) => (on ? { "data-active": "true" } : {});

interface TheoryListProps {
  topic: CurriculumTopic;
  selected: string | null;
  onSelect: (id: string) => void;
  completed: boolean;
}

function TheoryList({ topic: topicItem, selected, onSelect, completed: done }: TheoryListProps) {
  return (
    <ol className={cx(styles.theoryList, done && styles.theoryDone)}>
      {topicItem.units.map((unit, i) => {
        const id = `${topicItem.number}:theory:${i}`;
        return (
          <li key={unit.title}>
            <button
              type="button"
              className={cx(styles.theoryButton, selected === id && styles.isOn)}
              onClick={() => onSelect(id)}
              {...activeAttr(selected === id)}
            >
              <span className={styles.theoryNumber}>{i + 1}.</span>
              <span>{unit.title}</span>
            </button>
            {unit.subItems.length > 0 && (
              <ul className={styles.theorySubList}>
                {unit.subItems.map((m, j) => {
                  const mid = `${id}:${j}`;
                  return (
                    <li key={m}>
                      <button
                        type="button"
                        className={cx(styles.subButton, selected === mid && styles.isOn)}
                        onClick={() => onSelect(mid)}
                        {...activeAttr(selected === mid)}
                      >
                        <span className={styles.subNumber}>
                          {i + 1}.{j + 1}
                        </span>{" "}
                        {m}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ScoreChip({ l }: { l: LessonProgressDto | null }) {
  if (!l?.miniTest) return null;
  return (
    <span
      className={cx(styles.scoreChip, l.miniTestPassed && styles.isPassed)}
      title={
        l.miniTestPassed
          ? "Mini test đã đạt"
          : `Mini test tốt nhất — cần ${l.passMark}/${l.miniTest.total} để đạt`
      }
    >
      {l.miniTest.correct}/{l.miniTest.total}
    </span>
  );
}

interface TopicItemProps {
  topic: CurriculumTopic;
  l: LessonProgressDto | null;
  open: boolean;
  onToggle: () => void;
  selected: string | null;
  onSelect: (id: string) => void;
  theoryOpen: boolean;
  onToggleTheory: () => void;
}

export function TopicItem({
  topic: topicItem,
  l,
  open,
  onToggle: onOpen,
  selected,
  onSelect,
  theoryOpen,
  onToggleTheory,
}: TopicItemProps) {
  const status = l?.completed ? styles.isDone : isInProgress(l) ? styles.isLearning : "";
  const confirmed: Partial<Record<LessonPart, boolean>> = {
    theory: !!l?.theoryDone,
    vocab: !!l?.vocabDone,
  };
  return (
    <li className={cx(styles.topic, open && styles.isOpen, status)}>
      <button type="button" className={styles.head} onClick={onOpen} aria-expanded={open}>
        <span className={styles.number} title={l?.completed ? "Đã xong chuyên đề" : undefined}>
          {topicItem.number}
        </span>
        <span className={styles.title}>
          {topicItem.number}. {topicItem.title}
          {topicItem.featured && (
            <span className={cx(styles.badge, styles.badgeFeatured)}>
              <Sparkles size={11} /> Đặc trưng
            </span>
          )}
          {topicItem.extended && <span className={styles.badge}>Mở rộng</span>}
        </span>
        <span className={styles.meta}>{topicItem.units.length} mục</span>
        <ChevronDown size={15} className={styles.chevron} />
      </button>
      <Collapse open={open}>
        <ul className={styles.parts}>
          {TOPIC_PARTS.map((p) => {
            const Icon = confirmed[p.id] ? Check : PART_ICONS[p.id];
            const id = `${topicItem.number}:${p.id}`;
            const isTheory = p.id === "theory";
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={cx(
                    styles.partButton,
                    selected === id && styles.isOn,
                    confirmed[p.id] && styles.isDone,
                  )}
                  onClick={() => {
                    onSelect(id);
                    if (isTheory) onToggleTheory();
                  }}
                  aria-expanded={isTheory ? theoryOpen : undefined}
                  {...activeAttr(selected === id)}
                >
                  <Icon size={15} className={styles.partIcon} />
                  <span>{p.title}</span>
                  {p.id === "exercises" && <ScoreChip l={l} />}
                  {isTheory && (
                    <>
                      <span className={styles.count}>{topicItem.units.length}</span>
                      <ChevronDown
                        size={14}
                        className={cx(styles.chevron, theoryOpen && styles.isUp)}
                      />
                    </>
                  )}
                </button>
                {isTheory && (
                  <Collapse open={theoryOpen}>
                    <TheoryList
                      topic={topicItem}
                      selected={selected}
                      onSelect={onSelect}
                      completed={!!confirmed.theory}
                    />
                  </Collapse>
                )}
              </li>
            );
          })}
        </ul>
      </Collapse>
    </li>
  );
}
