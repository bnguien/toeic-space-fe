// End-of-lesson summary (video ended, 95 % watched once, or "Kết thúc"): study time, sentences heard, the lesson's
// vocabulary (saved/opened words first, then tiered words) → save to the library / review now.
// Desktop: 560 px centred dialog; phones: 92dvh bottom sheet with sticky actions.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkCheck, Check, Play, X } from "lucide-react";

import type { GlossEntryDto } from "../types/video.types";
import { formatLessonDuration, splitMeanings, type LessonWordItem } from "../utils/video-lesson";
import { SaveToLibrary } from "./SaveToLibrary";
import styles from "./VideoLessonSummary.module.css";

const TIER_LABELS: Record<string, string> = { toeic: "TOEIC", b2: "B2", c1: "C1+" };
const TIER_CLASS: Record<string, string> = {
  toeic: styles.levelToeic,
  b2: styles.levelB2,
  c1: styles.levelC1,
};

export interface LessonScore {
  correct: number;
  total: number;
}

export interface VideoLessonSummaryProps {
  seconds: number;
  sentenceCount: number;
  totalSentences: number;
  /** Cloze score when the lesson was in "Điền từ" mode, else null. */
  score?: LessonScore | null;
  items: LessonWordItem[];
  selected: Set<string>;
  gloss: Record<string, Partial<GlossEntryDto>>;
  isGuest: boolean;
  loginHref: string;
  lookingUpMeanings?: boolean;
  onToggleSelect: (k: string) => void;
  /** true = select every item, false = clear the selection. */
  onSelectAll: (all: boolean) => void;
  /** Saves the selected unsaved items that have a meaning (`items`) into `folderId` (null = unfiled). */
  onSave: (folderId: string | null, items: LessonWordItem[]) => Promise<void>;
  onReview: () => void;
  onClose: () => void;
}

export function VideoLessonSummary({
  seconds,
  sentenceCount,
  totalSentences,
  score = null,
  items,
  selected,
  gloss,
  isGuest,
  loginHref,
  lookingUpMeanings = false,
  onToggleSelect,
  onSelectAll,
  onSave,
  onReview,
  onClose,
}: VideoLessonSummaryProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [justSavedCount, setJustSavedCount] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meaningOf = (it: LessonWordItem) =>
    splitMeanings(gloss[it.k]?.meaning || it.meaning || "", 2, it.k).primary;
  const hasMeaning = (it: LessonWordItem) => !!meaningOf(it);
  const selectedItems = items.filter((it) => selected.has(it.k));
  // Words without a meaning are not saved or reviewed (an empty card is useless).
  const unsavedItems = selectedItems.filter((it) => !it.saved && hasMeaning(it));
  const reviewCount = selectedItems.filter(hasMeaning).length;
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const save = async (folderId: string | null) => {
    const n = unsavedItems.length;
    await onSave(folderId, unsavedItems);
    setJustSavedCount(n);
    setPickerOpen(false);
  };

  return (
    <div className={styles.wrap} role="presentation" onClick={onClose}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vls-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>Kết thúc buổi học</p>
            <h2 id="vls-title" className={styles.title}>
              Bạn đã học xong phần này
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Đóng tổng kết"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <dl className={styles.stats}>
          <div>
            <dt>Thời gian học</dt>
            <dd>{formatLessonDuration(seconds)}</dd>
          </div>
          <div>
            <dt>Câu đã nghe</dt>
            <dd>
              {sentenceCount}
              <small>{` / ${totalSentences}`}</small>
            </dd>
          </div>
          {score && score.total > 0 && (
            <div>
              <dt>Điền từ đúng</dt>
              <dd>
                {score.correct}
                <small>{` / ${score.total}`}</small>
              </dd>
            </div>
          )}
        </dl>

        <div className={styles.secHead}>
          <h3>{`Từ vựng của bài · ${items.length}`}</h3>
          {items.length > 0 && (
            <button type="button" className={styles.link} onClick={() => onSelectAll(!allSelected)}>
              {allSelected ? "Bỏ chọn hết" : "Chọn hết"}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>
            Phần bạn vừa xem chưa có từ TOEIC / B2 / C1+ nào. Bấm vào từ trong lời thoại để lưu từ
            muốn học.
          </p>
        ) : (
          <ul className={styles.list}>
            {items.map((it) => {
              const on = selected.has(it.k);
              const meaning = meaningOf(it);
              return (
                <li key={it.k}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    className={`${styles.item} ${on ? styles.on : ""}`}
                    onClick={() => onToggleSelect(it.k)}
                  >
                    <span className={styles.box} aria-hidden="true">
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className={styles.word} lang="en">
                      {it.word}
                    </span>
                    {it.tier && (
                      <span className={`${styles.level} ${TIER_CLASS[it.tier] ?? ""}`}>
                        {TIER_LABELS[it.tier]}
                      </span>
                    )}
                    <span className={`${styles.meaning} ${meaning ? "" : styles.meaningMissing}`}>
                      {meaning || (lookingUpMeanings ? "đang tra…" : "chưa có nghĩa")}
                    </span>
                    {it.saved && (
                      <span className={styles.saved} title="Đã có trong sổ từ vựng">
                        <BookmarkCheck size={15} aria-hidden="true" />
                        <span className={styles.sr}>đã lưu</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <div className={styles.save}>
            {isGuest ? (
              <p className={styles.note}>
                <Link to={loginHref}>Đăng nhập</Link>
                {" để lưu các từ này vào sổ và ôn ngay."}
              </p>
            ) : pickerOpen ? (
              <SaveToLibrary
                onSave={save}
                onCancel={() => setPickerOpen(false)}
                saveLabel={`Lưu ${unsavedItems.length} từ`}
              />
            ) : unsavedItems.length > 0 ? (
              <button type="button" className={styles.ghost} onClick={() => setPickerOpen(true)}>
                {`Lưu ${unsavedItems.length} từ chưa lưu vào sổ`}
              </button>
            ) : (
              <p className={`${styles.note} ${styles.ok}`} role="status">
                <BookmarkCheck size={15} aria-hidden="true" />
                {justSavedCount
                  ? `Đã lưu ${justSavedCount} từ vào sổ.`
                  : "Các từ đã chọn đều có trong sổ."}
              </p>
            )}
          </div>
        )}

        <footer className={styles.foot}>
          <p className={styles.ask}>Bạn có muốn ôn các từ này không?</p>
          <div className={styles.acts}>
            <button type="button" className={styles.ghost} onClick={onClose}>
              Để sau
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={onReview}
              disabled={!reviewCount}
            >
              <Play size={16} aria-hidden="true" />
              {reviewCount ? `Ôn ngay · ${reviewCount} từ` : "Ôn ngay"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
