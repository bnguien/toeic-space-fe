import { BookOpen, ClipboardCheck } from "lucide-react";

import type { LessonPart } from "../../types/grammar.types";
import { GRAMMAR_STAGES, TOPIC_COUNT } from "../../utils/grammar-curriculum";
import { sticker } from "../../utils/grammar-assets";
import { cx } from "../../utils/cx";
import { pad2 } from "../../utils/grammar-text";
import styles from "./GrammarIntro.module.css";

const TONES = [styles.t1, styles.t2, styles.t3, styles.t4, styles.t5];

interface GrammarIntroProps {
  onSelectPart: (topicNum: number, part: LessonPart) => void;
  onSelectStage: (id: string) => void;
}

/* Overview screen in the TOEIC Space "space" style (two-tone hero + polaroids · progress box · stage circles),
   no breadcrumb; fills the lesson column. */
export function GrammarIntro({ onSelectPart, onSelectStage }: GrammarIntroProps) {
  const first = GRAMMAR_STAGES[0];
  return (
    <div className={styles.intro}>
      <header className={styles.hero} aria-labelledby="gpx-title">
        <div className={styles.lead}>
          <p className={styles.eyebrow}>Lộ trình TOEIC · 0 → 990</p>
          <h1 className={styles.title} id="gpx-title">
            Ngữ Pháp <em aria-hidden="true">~</em>
          </h1>
          <p className={styles.sub}>Từ mất gốc tới 990, học chắc từng chuyên đề</p>
        </div>
        <div className={styles.booth} aria-hidden="true">
          <span className={cx(styles.strip, styles.stripOne)}>
            <span className={styles.shot}>
              <img src={sticker("reading")} alt="" />
            </span>
            <small>TOEIC Space</small>
          </span>
          <span className={cx(styles.strip, styles.stripTwo)}>
            <span className={styles.shot}>
              <img src={sticker("idea")} alt="" />
            </span>
            <span className={styles.shot}>
              <img src={sticker("thinking")} alt="" />
            </span>
            <small>Grammar</small>
          </span>
        </div>
      </header>

      <div className={styles.stats}>
        <span className={styles.tile}>
          <b>{TOPIC_COUNT}</b>
          <span>Chuyên đề</span>
        </span>
        <span className={styles.tile}>
          <b>{GRAMMAR_STAGES.length}</b>
          <span>Chặng</span>
        </span>
        <span className={styles.tile}>
          <b>{GRAMMAR_STAGES.length}</b>
          <span>Bài test</span>
        </span>
        <span className={styles.actions}>
          <button type="button" className={styles.cta} onClick={() => onSelectPart(1, "theory")}>
            <BookOpen size={16} /> Bắt đầu Chuyên đề 01
          </button>
          <button type="button" className={styles.ghost} onClick={() => onSelectStage(first.id)}>
            <ClipboardCheck size={15} /> {first.test.title}
          </button>
        </span>
      </div>

      <ol className={styles.circles} aria-label="5 chặng ngữ pháp">
        {GRAMMAR_STAGES.map((s, i) => (
          <li key={s.id} className={styles.cell}>
            {i > 0 && <span className={styles.link} aria-hidden="true" />}
            <button
              type="button"
              className={cx(styles.circle, TONES[i])}
              onClick={() => onSelectPart(s.topics[0].number, "theory")}
            >
              <small>Chặng {pad2(s.number)}</small>
              <b>{s.score}</b>
              <span>{s.title}</span>
              <em>{s.topics.length} chuyên đề</em>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
