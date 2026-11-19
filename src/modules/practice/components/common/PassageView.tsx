import { useMemo, type CSSProperties } from "react";
import { AArrowDown, AArrowUp } from "lucide-react";

import { mediaUrls, RichText } from "@/shared/components/RichText";
import { Segmented, cx } from "@/shared/components/ui";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

import { usePracticePrefs } from "../../hooks/usePracticePrefs";
import { PASSAGE_FONT, type TranslationMode } from "../../store/practicePrefs.store";
import type { QuestionGroup } from "../../utils/attemptGroups";
import { part6BlankLabels, passageHighlights } from "../../utils/passageMarks";
import styles from "./PassageView.module.css";

export interface PassageViewProps {
  group: QuestionGroup;
  /** Question in focus (its Part 6 blank is highlighted). */
  currentQuestionId?: string;
  /** Show the A−/A+ font controls (13–18px, remembered). */
  fontControls?: boolean;
  /** Read-only exam room: no translation, no evidence, no controls beyond font size. */
  examMode?: boolean;
  className?: string;
}

const TRANSLATION_OPTIONS = [
  { value: "parallel", label: "Song song" },
  { value: "bottom", label: "Cuối bài" },
  { value: "hidden", label: "Ẩn" },
] as const;

/**
 * Reading passage (port of StudyChill ReadingPassageView): image scans with "Đoạn văn i / n" or
 * HTML through RichText, font size A−/A+, and once questions are revealed: evidence highlights
 * ("Câu N"), Part 6 blank badges with the correct word, and the translation shown side by side
 * (desktop), at the end, or hidden.
 */
export function PassageView({
  group,
  currentQuestionId,
  fontControls = true,
  examMode = false,
  className,
}: PassageViewProps) {
  const { fontSize, stepFont, mode, setMode } = usePracticePrefs((s) => ({
    fontSize: s.passageFontSize,
    stepFont: s.stepPassageFont,
    mode: s.translationMode,
    setMode: s.setTranslationMode,
  }));
  const wide = useMediaQuery("(min-width: 1024px)");
  const images = useMemo(() => group.imageUrls.flatMap((url) => mediaUrls(url)), [group.imageUrls]);
  const revealed = !examMode && group.questions.some((q) => q.reveal !== null);
  const highlights = useMemo(
    () => (revealed ? passageHighlights(group.questions) : []),
    [revealed, group.questions],
  );
  const blankLabel = useMemo(
    () =>
      group.part === 6
        ? part6BlankLabels(
            examMode ? group.questions.map((q) => ({ ...q, reveal: null })) : group.questions,
            currentQuestionId,
          )
        : undefined,
    [group.part, group.questions, currentQuestionId, examMode],
  );
  const translation = revealed ? group.translation : null;
  // Side by side needs room; phones fall back to "at the end".
  const shownMode: TranslationMode = mode === "parallel" && !wide ? "bottom" : mode;
  const style = { "--passage-font": `${fontSize}px` } as CSSProperties;

  return (
    <article
      className={cx(styles.passage, className)}
      style={style}
      data-section={group.section}
      data-mode={translation ? shownMode : undefined}
    >
      {(fontControls || translation) && (
        <div className={styles.toolbar} data-no-lookup="true">
          {translation && (
            <Segmented
              size="sm"
              label="Kiểu bản dịch"
              options={
                wide
                  ? TRANSLATION_OPTIONS
                  : TRANSLATION_OPTIONS.filter((o) => o.value !== "parallel")
              }
              value={shownMode}
              onChange={setMode}
            />
          )}
          {fontControls && (
            <div className={styles.font} role="group" aria-label="Cỡ chữ bài đọc">
              <button
                type="button"
                onClick={() => stepFont(-1)}
                disabled={fontSize <= PASSAGE_FONT.min}
                aria-label="Giảm cỡ chữ"
              >
                <AArrowDown size={16} aria-hidden="true" />
              </button>
              <span>{fontSize}px</span>
              <button
                type="button"
                onClick={() => stepFont(1)}
                disabled={fontSize >= PASSAGE_FONT.max}
                aria-label="Tăng cỡ chữ"
              >
                <AArrowUp size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
      {group.title && <h3 className={styles.title}>{group.title}</h3>}
      <div className={styles.columns}>
        <div className={styles.english} lang="en">
          {images.map((src, i) => (
            <figure key={src} className={styles.figure}>
              <img src={src} alt={`Đoạn văn ${i + 1}`} loading="lazy" />
              {images.length > 1 && (
                <figcaption>
                  Đoạn văn {i + 1} / {images.length}
                </figcaption>
              )}
            </figure>
          ))}
          <RichText
            value={group.content}
            variant="document"
            blankLabel={blankLabel}
            highlights={highlights}
          />
        </div>
        {translation && shownMode !== "hidden" && (
          <div className={styles.translation} lang="vi" data-no-lookup="true">
            <p className={styles.translationLabel}>Bản dịch</p>
            <RichText value={translation} variant="document" />
          </div>
        )}
      </div>
    </article>
  );
}
