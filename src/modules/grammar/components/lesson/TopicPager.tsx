import { ChevronLeft, ChevronRight } from "lucide-react";

import type { LessonPart } from "../../types/grammar.types";
import { TOPIC_COUNT } from "../../utils/grammar-curriculum";
import { cx } from "../../utils/cx";
import { topicInfo } from "../../utils/grammar-data";
import { pad2 } from "../../utils/grammar-text";
import styles from "./TopicPager.module.css";

interface TopicPagerProps {
  number: number;
  part: LessonPart;
  onSelectPart: (topicNum: number, part: LessonPart) => void;
}

/** Previous / next topic, keeping the current part. */
export function TopicPager({ number: topicNum, part, onSelectPart }: TopicPagerProps) {
  const prevTopic = topicNum > 1 ? topicInfo(topicNum - 1) : null;
  const nextTopic = topicNum < TOPIC_COUNT ? topicInfo(topicNum + 1) : null;
  return (
    <nav className={styles.pager} aria-label="Chuyên đề trước / sau">
      {prevTopic ? (
        <button type="button" onClick={() => onSelectPart(prevTopic.number, part)}>
          <ChevronLeft size={16} />
          <span>
            <small>Chuyên đề {pad2(prevTopic.number)}</small>
            {prevTopic.title}
          </span>
        </button>
      ) : (
        <span />
      )}
      {nextTopic && (
        <button
          type="button"
          className={cx(styles.next)}
          onClick={() => onSelectPart(nextTopic.number, part)}
        >
          <span>
            <small>Chuyên đề {pad2(nextTopic.number)}</small>
            {nextTopic.title}
          </span>
          <ChevronRight size={16} />
        </button>
      )}
    </nav>
  );
}
