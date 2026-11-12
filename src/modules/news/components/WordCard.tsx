import { useEffect, useRef, type CSSProperties } from "react";
import { BookmarkPlus, Check, Volume2, X } from "lucide-react";

import { newsApi } from "../api/news.api";
import type { LookedUpWord } from "../types/news.types";
import styles from "./WordCard.module.css";

interface WordCardProps {
  word: LookedUpWord;
  saved: boolean;
  known: boolean;
  onClose: () => void;
  onSave: (word: LookedUpWord) => void;
  onToggleKnown: (word: string) => void;
  onSpeak: (text: string) => void;
}

/** Floating lookup card next to the clicked word (300px; below it, or above when there is no room). */
export function WordCard({
  word,
  saved,
  known,
  onClose,
  onSave,
  onToggleKnown,
  onSpeak,
}: WordCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (ref.current && !ref.current.contains(target) && !target?.closest?.("[data-word]"))
        onClose();
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [onClose]);

  const rect = word.rect ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - 150), window.innerWidth - 312);
  const placeBelow = rect.bottom + 230 < window.innerHeight;
  const style: CSSProperties = placeBelow
    ? { left, top: rect.bottom + 8 }
    : { left, top: rect.top - 8, transform: "translateY(-100%)" };

  // Neural voice of the speech endpoint first; the browser voice when it is unavailable.
  const playAudio = () => {
    try {
      new Audio(newsApi.speechUrl(word.word)).play().catch(() => onSpeak(word.word));
    } catch {
      onSpeak(word.word);
    }
  };

  return (
    <div
      className={styles.card}
      ref={ref}
      style={style}
      role="dialog"
      aria-label={`Nghĩa của ${word.word}`}
    >
      <div className={styles.head}>
        <b>{word.word}</b>
        {word.partOfSpeech && <i>{word.partOfSpeech}</i>}
        <button type="button" onClick={playAudio} aria-label="Nghe phát âm">
          <Volume2 size={15} />
        </button>
        <button type="button" onClick={onClose} aria-label="Đóng">
          <X size={15} />
        </button>
      </div>
      {word.ipa && <p className={styles.ipa}>{word.ipa}</p>}
      <p className={styles.meaning}>
        {word.pending && !word.meaning ? "Đang tra…" : word.meaning || "Chưa có nghĩa cho từ này."}
      </p>
      {word.source && (
        <p className={styles.source}>
          {word.source}
          {word.pending ? " · đang bổ sung…" : ""}
        </p>
      )}
      {word.sentence && <p className={styles.context}>“{word.sentence.text}”</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onSave(word)}
          disabled={saved || word.pending}
        >
          {saved ? (
            <>
              <Check size={14} /> Đã lưu sổ tay
            </>
          ) : (
            <>
              <BookmarkPlus size={14} /> Lưu vào sổ tay
            </>
          )}
        </button>
        {word.inArticle && (
          <button type="button" onClick={() => onToggleKnown(word.word)}>
            {known ? 'Bỏ "đã biết"' : "Mình biết từ này"}
          </button>
        )}
      </div>
    </div>
  );
}
