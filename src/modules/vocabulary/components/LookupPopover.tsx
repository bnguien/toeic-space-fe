/**
 * Result bubble of "select text to look it up" (port of Studychill `LookupPopover`). One card for words, phrases
 * and sentences on every page; saving to the notebook happens right here, while the learner is reading the meaning.
 */
import { useCallback, useState, type MouseEvent } from "react";
import { Bookmark, Check, Loader2, Volume2, X } from "lucide-react";

import { useIsLearner } from "../hooks/useIsLearner";
import type { SelectionAnchor, SelectionLookupDto } from "../types/dictionary.types";
import { forgetLookup } from "../utils/selection-lookup";
import { speak } from "../utils/speech";
import { formatPartOfSpeechName } from "../utils/vocabulary-format";
import { LookupSaveForm } from "./LookupSaveForm";
import styles from "./LookupPopover.module.css";

/** Longest text that can be saved as a word (headword limit of the vocabulary import). */
const MAX_SAVE_LENGTH = 100;
const CLOSE_AFTER_SAVE_MS = 1100;

interface SaveState {
  text: string | null;
  open: boolean;
  saved: boolean;
}

interface LookupPopoverProps {
  anchor: SelectionAnchor;
  text: string;
  context?: string;
  result: SelectionLookupDto | null;
  lookingUp: boolean;
  /** The AI is filling in phonetics / part of speech of the card on screen. */
  enriching?: boolean;
  error: string;
  /** Long selection: ask before spending a translation. */
  needsConfirm: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function LookupPopover({
  anchor,
  text,
  context = "",
  result,
  lookingUp,
  enriching = false,
  error,
  needsConfirm,
  onConfirm,
  onClose,
}: LookupPopoverProps) {
  const { signedIn } = useIsLearner();
  // Save state belongs to the text being looked up: a new selection resets it.
  const [saveState, setSaveState] = useState<SaveState>({ text: null, open: false, saved: false });
  const saveOpen = saveState.text === text && saveState.open;
  const saved = saveState.text === text && saveState.saved;

  const handleSaved = useCallback(() => {
    setSaveState({ text, open: false, saved: true });
    forgetLookup(text);
    setTimeout(onClose, CLOSE_AFTER_SAVE_MS);
  }, [text, onClose]);

  const tooLongToSave = text.length > MAX_SAVE_LENGTH;
  const isPhrase = result?.kind === "phrase" || result?.kind === "sentence";
  const alreadySaved = !!result?.savedWordId;
  // Studychill shows the part of speech in lower case ("danh từ").
  const partOfSpeech = result?.partOfSpeech
    ? (formatPartOfSpeechName(result.partOfSpeech) ?? "").toLowerCase()
    : "";

  return (
    <div
      className={`${styles.popover} ${anchor.below ? styles.below : ""}`}
      style={{ left: `${anchor.x}px`, top: `${anchor.y}px` }}
      data-no-lookup="true"
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
    >
      <div className={styles.head}>
        <div className={styles.headMain}>
          <strong className={styles.text} title={text}>
            {text}
          </strong>
          {result?.phonetic ? <em className={styles.phonetic}>{result.phonetic}</em> : null}
          {partOfSpeech ? <span className={styles.partOfSpeech}>{partOfSpeech}</span> : null}
          {result?.cefr ? (
            <span className={styles.cefr} title="Trình độ CEFR">
              {result.cefr}
            </span>
          ) : null}
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => speak(text, "en-US", { rate: 0.9 })}
            title="Nghe phát âm"
          >
            <Volume2 size={14} />
          </button>
          <button type="button" className={styles.iconButton} onClick={onClose} title="Đóng (Esc)">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {needsConfirm ? (
          <div className={styles.confirm}>
            <p>Đoạn bạn bôi đen khá dài. Dịch cả đoạn nhé?</p>
            <button type="button" className={styles.primaryButton} onClick={onConfirm}>
              Dịch đoạn này
            </button>
          </div>
        ) : lookingUp ? (
          <div className={styles.status}>
            <Loader2 size={14} className={styles.spin} />
            <span>Oysteic đang tra…</span>
          </div>
        ) : error ? (
          <div className={styles.status}>{error}</div>
        ) : result?.found ? (
          <>
            <div className={`${styles.meaning} ${isPhrase ? styles.meaningPhrase : ""}`}>
              {result.meaning}
            </div>

            {result.definitionEn ? (
              <div className={styles.definition}>{result.definitionEn}</div>
            ) : null}

            {result.example ? (
              <div className={styles.example}>
                <span className={styles.exampleEn}>“{result.example}”</span>
                {result.exampleVi ? (
                  <span className={styles.exampleVi}>{result.exampleVi}</span>
                ) : null}
              </div>
            ) : null}

            {enriching ? (
              <div className={styles.enriching}>
                <Loader2 size={11} className={styles.spin} />
                <span>Đang bổ sung phiên âm &amp; ví dụ…</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.status}>Chưa tra được đoạn này. Thử bôi đen ngắn hơn nhé.</div>
        )}
      </div>

      {/* ── Save to the notebook ── */}
      {result?.found && !needsConfirm ? (
        <div className={styles.foot}>
          {saved || alreadySaved ? (
            <span className={styles.saved}>
              <Check size={14} /> {saved ? "Đã lưu vào sổ từ vựng!" : "Đã có trong sổ từ vựng"}
            </span>
          ) : tooLongToSave ? (
            <span className={styles.status}>
              Đoạn quá dài để lưu — bôi đen cụm ngắn hơn {MAX_SAVE_LENGTH} ký tự.
            </span>
          ) : !saveOpen ? (
            <button
              type="button"
              className={styles.saveButton}
              onClick={() => setSaveState({ text, open: true, saved: false })}
            >
              <Bookmark size={13} /> <span>Lưu vào sổ từ vựng</span>
            </button>
          ) : (
            <LookupSaveForm
              text={text}
              context={context}
              result={result}
              signedIn={signedIn}
              onSaved={handleSaved}
              onCancel={() => setSaveState({ text, open: false, saved: false })}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
