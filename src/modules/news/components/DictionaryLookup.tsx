import { useState, type FormEvent } from "react";
import { BookA, BookmarkPlus, Check, Volume2, X } from "lucide-react";

import type { LookedUpWord } from "../types/news.types";
import { lookupWord } from "../utils/word-lookup";
import styles from "./DictionaryLookup.module.css";

interface DictionaryResult extends LookedUpWord {
  error?: string;
}

interface DictionaryLookupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
  savedWords: Set<string>;
  onSave: (word: LookedUpWord) => void;
  onSpeak: (text: string) => void;
}

const SOURCE_LABEL = "Từ điển TOEIC Space";

/** Round dictionary button at the bottom (key D) and the lookup form that slides up from it. */
export function DictionaryLookup({
  open,
  onOpenChange,
  signedIn,
  savedWords,
  onSave,
  onSpeak,
}: DictionaryLookupProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DictionaryResult | null>(null);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const word = text.trim();
    if (!word) return;
    const apply = (entry: Awaited<ReturnType<typeof lookupWord>>, pending: boolean) =>
      setResult({
        word,
        pending,
        ipa: entry?.ipa || "",
        partOfSpeech: entry?.partOfSpeech || "",
        meaning: entry?.meaning || "",
        isPhrase: entry?.isPhrase,
        officialWordId: entry?.officialWordId ?? null,
        source: entry?.found ? SOURCE_LABEL : "",
        error: !pending && !entry?.found ? "Không tìm thấy nghĩa." : "",
      });
    setResult({ word, pending: true });
    lookupWord(word, { ai: false, signedIn })
      .then((entry) => {
        if (entry?.complete || !entry?.aiAllowed) {
          apply(entry, false);
          return null;
        }
        apply(entry, true);
        return lookupWord(word, { ai: true, signedIn }).then((deep) =>
          apply(deep?.found ? deep : entry, false),
        );
      })
      .catch(() => apply(null, false));
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label="Tra từ điển (phím D)"
        title="Tra từ điển (D)"
      >
        <BookA size={20} />
      </button>
      {open && (
        <section className={styles.panel} aria-label="Tra từ điển">
          <form className={styles.form} onSubmit={submit}>
            <BookA size={18} aria-hidden="true" />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Gõ từ hoặc cụm từ tiếng Anh cần tra…"
              aria-label="Từ cần tra"
            />
            <button type="submit" disabled={!text.trim()}>
              Tra
            </button>
            <button
              type="button"
              className={styles.close}
              onClick={() => onOpenChange(false)}
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </form>
          {result && (
            <div className={styles.result}>
              <div className={styles.head}>
                <b>{result.word}</b>
                {result.ipa && <span>{result.ipa}</span>}
                {result.partOfSpeech && <i>{result.partOfSpeech}</i>}
                <button
                  type="button"
                  onClick={() => onSpeak(result.word)}
                  aria-label="Nghe phát âm"
                >
                  <Volume2 size={15} />
                </button>
              </div>
              <p className={styles.meaning}>
                {result.pending && !result.meaning ? "Đang tra…" : result.meaning || result.error}
              </p>
              {result.source && (
                <p className={styles.source}>
                  {result.source}
                  {result.pending ? " · đang bổ sung…" : ""}
                </p>
              )}
              {result.meaning && !result.pending && (
                <button
                  type="button"
                  className={styles.save}
                  disabled={savedWords.has(result.word)}
                  onClick={() => onSave(result)}
                >
                  {savedWords.has(result.word) ? (
                    <>
                      <Check size={14} /> Đã lưu
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={14} /> Lưu vào sổ tay
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
