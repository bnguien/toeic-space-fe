import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Play } from "lucide-react";

import focusMascot from "@/assets/mascot/oy2-focus.png";
import { GRAMMAR_PATH, GRAMMAR_STAGES, useGrammarStageProgress } from "@/modules/grammar";

import styles from "./GrammarRoadmapSection.module.css";

/** Stage colours, in the order of the dictation roadmap cards (tokens, so light and dark). */
const TONES = [
  { main: "var(--ui-green)", soft: "var(--ui-green-soft)" },
  { main: "var(--ui-blue)", soft: "var(--ui-blue-soft)" },
  { main: "var(--ui-pearl-text)", soft: "var(--ui-pearl)" },
  { main: "var(--ui-pink)", soft: "var(--ui-pink-soft)" },
  { main: "var(--ui-rose)", soft: "var(--ui-rose-soft)" },
];

/** First topic of a stage: the grammar page opens its theory (`?topic=N`). */
const stageLink = (stage: (typeof GRAMMAR_STAGES)[number]) =>
  `${GRAMMAR_PATH}?topic=${stage.topics[0]?.number ?? 1}`;

/**
 * Home section "Lộ trình ngữ pháp": a navy band with one card per grammar stage (the dictation
 * page's roadmap cards), each opening the first topic of the stage, with the learner's finished
 * topics when the grammar progress is known.
 */
export function GrammarRoadmapSection() {
  const progress = useGrammarStageProgress();
  const topicCount = GRAMMAR_STAGES.reduce((sum, stage) => sum + stage.topics.length, 0);

  return (
    <section id="ngu-phap" className={styles.band} aria-labelledby="ngu-phap-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            <BookOpenCheck size={14} aria-hidden="true" /> Lộ trình ngữ pháp
          </p>
          <h2 id="ngu-phap-title" className={styles.title}>
            Ngữ pháp <span>0 → 990</span>
          </h2>
          <p className={styles.subtitle}>
            {GRAMMAR_STAGES.length} chặng, {topicCount} chủ đề theo dải điểm TOEIC. Chọn chặng hợp
            với bạn và vào học ngay.
          </p>
          <Link to={stageLink(GRAMMAR_STAGES[0])} className={styles.cta}>
            <Play size={17} aria-hidden="true" /> Bắt đầu học ngữ pháp
          </Link>
          <img
            className={styles.mascot}
            src={focusMascot}
            alt=""
            width={180}
            height={180}
            loading="lazy"
            decoding="async"
          />
        </header>

        <ol className={styles.roadmap}>
          {GRAMMAR_STAGES.map((stage, index) => {
            const tone = TONES[index % TONES.length];
            const done = progress?.[stage.id];
            return (
              <li
                key={stage.id}
                className={styles.stepItem}
                style={
                  { "--step": index, "--lv": tone.main, "--lv-soft": tone.soft } as CSSProperties
                }
              >
                <Link
                  to={stageLink(stage)}
                  className={styles.step}
                  aria-label={`Chặng ${stage.number} · ${stage.title} (TOEIC ${stage.score}) — vào học`}
                >
                  <span className={styles.stepScore}>
                    <small>TOEIC</small>
                    <strong>{stage.score}</strong>
                  </span>
                  <span className={styles.stepCopy}>
                    <span className={styles.stepMeta}>Chặng {stage.number}</span>
                    <span className={styles.stepTitle}>{stage.title}</span>
                    <span className={styles.stepDescription}>{stage.description}</span>
                  </span>
                  <span className={styles.stepStats}>
                    {done ? (
                      <span>
                        <strong>
                          {done.completed}/{done.total}
                        </strong>{" "}
                        chủ đề
                      </span>
                    ) : (
                      <span>
                        <strong>{stage.topics.length}</strong> chủ đề
                      </span>
                    )}
                  </span>
                  <span className={styles.stepGo} aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {stage.number}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
