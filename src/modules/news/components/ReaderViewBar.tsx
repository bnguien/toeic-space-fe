import { useEffect, useRef, useState } from "react";
import { Brain, ChevronDown, Highlighter, Keyboard, Languages, LogOut } from "lucide-react";

import type { BrainHackModeKey } from "../types/news.types";
import { BRAIN_HACK_MODES } from "../utils/news-reader";
import type { ReaderView } from "./ReaderSentence";
import styles from "./ReaderViewBar.module.css";

/** The "Từ vựng" dropdown: hide prepared words or looked-up words separately. */
const WORD_LAYERS: Array<{ key: "suggested" | "lookedUp"; name: string; description: string }> = [
  { key: "suggested", name: "Từ gợi ý", description: "Gạch chân các từ nên học trong bài" },
  { key: "lookedUp", name: "Từ đã tra", description: "In đậm các từ, cụm từ bạn đã tra" },
];

/** Closes a dropdown on an outside pointer or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, close]);
  return ref;
}

interface ReaderViewBarProps {
  view: ReaderView;
  onToggleView: (key: "suggested" | "lookedUp" | "meaning") => void;
  speechSupported: boolean;
  brainHackOn: boolean;
  brainHackMode: BrainHackModeKey;
  onStartBrainHack: (mode: BrainHackModeKey) => void;
  onExitBrainHack: () => void;
}

/** Display toggles under the article header: vocabulary layers, meaning above words, Hack não, shortcuts. */
export function ReaderViewBar({
  view,
  onToggleView,
  speechSupported,
  brainHackOn,
  brainHackMode,
  onStartBrainHack,
  onExitBrainHack,
}: ReaderViewBarProps) {
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [hackOpen, setHackOpen] = useState(false);
  const vocabularyRef = useDismiss(vocabularyOpen, () => setVocabularyOpen(false));
  const hackRef = useDismiss(hackOpen, () => setHackOpen(false));
  const activeLayers = WORD_LAYERS.filter((layer) => view[layer.key]).length;
  const chip = (on: boolean, extra = "") => [styles.chip, on ? styles.chipOn : "", extra].join(" ");

  return (
    <div className={styles.bar} role="group" aria-label="Tuỳ chọn hiển thị khi đọc">
      <div className={styles.dropdown} ref={vocabularyRef}>
        <button
          type="button"
          className={chip(activeLayers > 0, vocabularyOpen ? styles.chipOpen : "")}
          aria-haspopup="true"
          aria-expanded={vocabularyOpen}
          onClick={() => setVocabularyOpen((value) => !value)}
          title="Chọn loại từ được đánh dấu trong bài"
        >
          <Highlighter size={14} aria-hidden="true" /> Từ vựng
          {activeLayers > 0 && activeLayers < WORD_LAYERS.length && <b>{activeLayers}</b>}
          <ChevronDown size={14} className={styles.caret} aria-hidden="true" />
        </button>
        {vocabularyOpen && (
          <div className={styles.menu} role="group" aria-label="Đánh dấu từ vựng">
            {WORD_LAYERS.map((layer) => (
              <label key={layer.key} className={styles.item}>
                <input
                  type="checkbox"
                  checked={view[layer.key]}
                  onChange={() => onToggleView(layer.key)}
                />
                <span
                  className={`${styles.sample} ${layer.key === "suggested" ? styles.sampleSuggested : styles.sampleLookedUp}`}
                  aria-hidden="true"
                >
                  Ab
                </span>
                <span>
                  <strong>{layer.name}</strong>
                  <small>{layer.description}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className={chip(view.meaning)}
        aria-pressed={view.meaning}
        onClick={() => onToggleView("meaning")}
        title="Hiện nghĩa ngắn ngay trên từ đã tra"
      >
        <Languages size={14} aria-hidden="true" /> Nghĩa trên từ
      </button>
      {speechSupported && (
        <div className={styles.dropdown} ref={hackRef}>
          <button
            type="button"
            className={[
              styles.chip,
              styles.chipHack,
              brainHackOn ? `${styles.chipOn} ${styles.chipHackOn}` : "",
              hackOpen ? styles.chipOpen : "",
            ].join(" ")}
            aria-haspopup="true"
            aria-expanded={hackOpen}
            onClick={() => setHackOpen((value) => !value)}
            title="Nghe + hiểu bằng tiếng Việt — chọn chế độ"
          >
            <Brain size={14} aria-hidden="true" /> Hack não
            {brainHackOn && (
              <em className={styles.hackMode}>
                {BRAIN_HACK_MODES.find((m) => m.key === brainHackMode)?.name}
              </em>
            )}
            <ChevronDown size={14} className={styles.caret} aria-hidden="true" />
          </button>
          {hackOpen && (
            <div
              className={`${styles.menu} ${styles.menuNarrow}`}
              role="menu"
              aria-label="Chế độ Hack não"
            >
              {BRAIN_HACK_MODES.map((m) => {
                const on = brainHackOn && brainHackMode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    className={`${styles.item} ${styles.option} ${on ? styles.optionOn : ""}`}
                    onClick={() => {
                      setHackOpen(false);
                      onStartBrainHack(m.key);
                    }}
                  >
                    <span className={styles.radio} aria-hidden="true" />
                    <span>
                      <strong>{m.name}</strong>
                    </span>
                  </button>
                );
              })}
              {brainHackOn && (
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.item} ${styles.option} ${styles.exit}`}
                  onClick={() => {
                    setHackOpen(false);
                    onExitBrainHack();
                  }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span>
                    <strong>Thoát Hack não</strong>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <span className={styles.keys} tabIndex={0} aria-label="Phím tắt">
        <Keyboard size={15} />
        <span className={styles.keysTip} role="tooltip">
          <kbd>Space</kbd> đọc / dừng · <kbd>←</kbd>
          <kbd>→</kbd> tua 3 giây · <kbd>R</kbd> nghe lại câu
          <br />
          <kbd>T</kbd> song ngữ · <kbd>L</kbd> bố cục · <kbd>D</kbd> từ điển · <kbd>F</kbd> toàn màn
          hình · <kbd>+</kbd>
          <kbd>−</kbd> cỡ chữ
        </span>
      </span>
    </div>
  );
}
