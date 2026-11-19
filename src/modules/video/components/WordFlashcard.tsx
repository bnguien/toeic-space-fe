// Word card of the video reader (left tray on desktop, bottom sheet on phones). Spec: Studychill
// content/docs/frontend/ui/video-reader.md, "Thẻ từ".
//
// ONE SIDE, no flip: the learner taps a word because they need it NOW, inside the sentence they just heard — hiding
// the meaning behind a flip adds a step and separates it from the context sentence. Active recall is left to the
// study session after the lesson summary. Reading order: word + audio → meaning → sentence in the video → other
// example → related words → save.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Play, Volume2, X } from "lucide-react";

import type { GlossEntryDto, VideoSavedWordDto, WordInfoDto } from "../types/video.types";
import type { VideoWordToSave } from "../hooks/useVideoSavedWords";
import { wordTier } from "../utils/subtitle-reading";
import {
  firstDefinition,
  highlightWordInSentence,
  posLabel,
  splitMeanings,
} from "../utils/video-lesson";
import { playWordAudio } from "../utils/word-audio";
import { SaveToLibrary } from "./SaveToLibrary";
import styles from "./WordFlashcard.module.css";

const TIER_LABELS: Record<string, string> = { toeic: "TOEIC", b2: "B2", c1: "C1+" };
const TIER_CLASS: Record<string, string> = {
  toeic: styles.levelToeic,
  b2: styles.levelB2,
  c1: styles.levelC1,
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface NoteEditorProps {
  initialText: string | null;
  saving: boolean;
  onSave: (text: string) => void;
}

function NoteEditor({ initialText, onSave, saving }: NoteEditorProps) {
  const [text, setText] = useState(initialText || "");
  const changed = text !== (initialText || "");
  return (
    <div className={styles.note}>
      <textarea
        className={styles.noteInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ghi chú riêng: mẹo nhớ, dễ lẫn với từ nào…"
        aria-label="Ghi chú của bạn về từ này"
        rows={2}
        maxLength={2000}
      />
      {changed && (
        <button
          type="button"
          className={styles.mini}
          disabled={saving}
          onClick={() => onSave(text)}
        >
          {saving ? "Đang lưu…" : "Lưu ghi chú"}
        </button>
      )}
    </div>
  );
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  return (
    <>
      {highlightWordInSentence(sentence, word).map((p, i) =>
        p.on ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

export interface WordFlashcardProps {
  word: string;
  gloss?: Partial<GlossEntryDto> | null;
  info?: WordInfoDto | null;
  cefr?: string;
  /** The video sentence containing the word. */
  context?: string;
  contextVi?: string;
  /** "m:ss" of the sentence, null when unknown. */
  contextAt?: string | null;
  saved?: VideoSavedWordDto | null;
  loading?: boolean;
  saving?: boolean;
  isGuest?: boolean;
  loginHref?: string;
  /** Saves into `folderId` (null = unfiled); `item` = the word as shown on the card (example = video sentence). */
  onSave: (folderId: string | null, item: VideoWordToSave) => Promise<void>;
  onNote: (savedWordId: string, note: string) => void;
  onRemove: (savedWordId: string) => void;
  /** Plays the sentence of the video then pauses; null hides the button. */
  onPlayContext?: (() => void) | null;
  onClose: () => void;
}

export function WordFlashcard({
  word,
  gloss = null,
  info = null,
  cefr = "",
  context = "",
  contextVi = "",
  contextAt = null,
  saved = null,
  loading = false,
  saving = false,
  isGuest = false,
  loginHref = "/login",
  onSave,
  onNote,
  onRemove,
  onPlayContext,
  onClose,
}: WordFlashcardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const base: Partial<GlossEntryDto> = info?.base ?? {};
  const g: Partial<GlossEntryDto> = gloss ?? {};
  const meaningVi = g.meaning || saved?.meaningVi || base.meaning || "";
  const ipa = info?.ipa || g.ipa || saved?.phonetic || base.ipa || "";
  const pos =
    g.partOfSpeech || saved?.partOfSpeech || base.partOfSpeech || info?.partOfSpeech || "";
  // The example and its translation must come from the same source (never a dictionary example with the
  // translation of another sentence).
  const [ex, rawExVi] = ([
    g.example ? [g.example, g.exampleTranslation || ""] : null,
    base.example ? [base.example, base.exampleTranslation || ""] : null,
  ].find(Boolean) as [string, string] | undefined) ?? ["", ""];
  const exVi = rawExVi && !same(rawExVi, ex) ? rawExVi : "";
  const defs = info?.definitions ?? [];
  const enDef = defs[0]?.definition || firstDefinition(g.definition || base.definition);
  const otherSenses = defs.slice(1).filter((d) => d.definition);
  const { primary: primaryMeaning, others: secondaryMeaning } = splitMeanings(meaningVi, 2, word);
  const tier = wordTier(cefr);
  const syn = info?.synonyms ?? [];
  const ant = info?.antonyms ?? [];
  const family = info?.family ?? [];
  const posText = posLabel(pos);
  const hasRelated = syn.length || ant.length || family.length || otherSenses.length;
  const contextTranslation = contextVi && !same(contextVi, context) ? contextVi : "";
  const aiMeaning = (g.source || "").includes("ai");

  const save = (folderId: string | null) =>
    onSave(folderId, {
      word,
      meaning: meaningVi,
      phonetic: ipa,
      partOfSpeech: pos,
      // The library keeps one example: the sentence of the video is the one worth reviewing.
      example: context || ex,
      exampleVi: context ? contextTranslation : exVi,
    });

  return (
    <article className={styles.card} aria-label={`Thẻ từ: ${word}`}>
      <header className={styles.top}>
        <div className={styles.wordline}>
          <h3 className={styles.word}>{word}</h3>
          <button
            type="button"
            className={styles.speak}
            onClick={() => playWordAudio(word)}
            aria-label={`Nghe phát âm ${word}`}
            title="Nghe phát âm (giọng Mỹ)"
          >
            <Volume2 size={18} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Đóng thẻ từ"
          title="Đóng (Esc)"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className={styles.meta}>
          {ipa && <span className={styles.ipa}>{ipa}</span>}
          {ipa && <span className={styles.accentTag}>US</span>}
          {posText && <span className={styles.tag}>{posText}</span>}
          {tier && (
            <span
              className={`${styles.tag} ${styles.level} ${TIER_CLASS[tier] ?? ""}`}
              title="Bậc từ theo kho TOEIC / CEFR"
            >
              {tier === "toeic" && /^[AB][12]$/.test(cefr) ? `TOEIC · ${cefr}` : TIER_LABELS[tier]}
            </span>
          )}
        </div>
      </header>

      <section className={styles.sec}>
        {primaryMeaning ? (
          <>
            <p className={styles.meaning}>{primaryMeaning}</p>
            {secondaryMeaning && (
              <p className={styles.meaningOthers}>{`Nghĩa khác: ${secondaryMeaning}`}</p>
            )}
          </>
        ) : (
          <p className={styles.dim}>
            {loading ? "Đang tra nghĩa…" : "Chưa có nghĩa tiếng Việt cho từ này."}
          </p>
        )}
        {enDef && (
          <p className={styles.definition} lang="en">
            {enDef}
          </p>
        )}
      </section>

      {context && (
        <section className={`${styles.sec} ${styles.ctx}`}>
          <div className={styles.secHead}>
            <span className={styles.lbl}>Trong video</span>
            {onPlayContext && (
              <button
                type="button"
                className={styles.mini}
                onClick={onPlayContext}
                aria-label="Phát lại đoạn video có câu này"
              >
                <Play size={12} aria-hidden="true" />
                {contextAt !== null ? contextAt : "Phát đoạn"}
              </button>
            )}
          </div>
          <p className={styles.sentence} lang="en">
            <HighlightedSentence sentence={context} word={word} />
          </p>
          {contextTranslation && <p className={styles.sentenceVi}>{contextTranslation}</p>}
        </section>
      )}

      {ex && !same(ex, context) && (
        <section className={styles.sec}>
          <span className={styles.lbl}>Ví dụ khác</span>
          <p className={styles.sentence} lang="en">
            <HighlightedSentence sentence={ex} word={word} />
          </p>
          {exVi && <p className={styles.sentenceVi}>{exVi}</p>}
        </section>
      )}

      {hasRelated ? (
        <section className={`${styles.sec} ${styles.rel}`}>
          {family.length > 0 && (
            <div className={styles.relRow}>
              <span className={styles.lbl}>Họ từ</span>
              <span className={styles.relList}>
                {family.map((f) => (
                  <span key={f.word} className={styles.fam}>
                    <b lang="en">{f.word}</b>
                    {f.partOfSpeech && f.partOfSpeech !== "other" ? (
                      <i>{posLabel(f.partOfSpeech)}</i>
                    ) : null}
                    {f.meaning ? ` ${f.meaning}` : ""}
                  </span>
                ))}
              </span>
            </div>
          )}
          {syn.length > 0 && (
            <div className={styles.relRow}>
              <span className={styles.lbl}>Đồng nghĩa</span>
              <span className={styles.relList} lang="en">
                {syn.join(", ")}
              </span>
            </div>
          )}
          {ant.length > 0 && (
            <div className={styles.relRow}>
              <span className={styles.lbl}>Trái nghĩa</span>
              <span className={styles.relList} lang="en">
                {ant.join(", ")}
              </span>
            </div>
          )}
          {otherSenses.length > 0 && (
            <div className={styles.relRow}>
              <span className={styles.lbl}>Cách dùng khác</span>
              <span className={styles.relList}>
                {otherSenses.map((d) => (
                  <span key={d.definition} className={styles.def} lang="en">
                    {d.partOfSpeech && <i>{posLabel(d.partOfSpeech)}</i>}
                    {` ${d.definition}`}
                  </span>
                ))}
              </span>
            </div>
          )}
        </section>
      ) : null}

      <footer className={styles.foot}>
        {saved ? (
          <>
            <div className={styles.savedRow}>
              <span className={styles.saved} role="status">
                <BookmarkCheck size={16} aria-hidden="true" />
                Đã lưu trong sổ từ vựng
              </span>
              <button
                type="button"
                className={styles.link}
                onClick={() => onRemove(saved.savedWordId)}
              >
                Bỏ khỏi sổ
              </button>
            </div>
            <NoteEditor
              key={saved.savedWordId}
              initialText={saved.note}
              saving={saving}
              onSave={(t) => onNote(saved.savedWordId, t)}
            />
          </>
        ) : isGuest ? (
          <p className={styles.guest}>
            <Link to={loginHref}>Đăng nhập</Link>
            {" để lưu từ này vào sổ và ôn lại sau."}
          </p>
        ) : pickerOpen ? (
          <SaveToLibrary
            onSave={save}
            onCancel={() => setPickerOpen(false)}
            saveLabel="Lưu vào sổ"
          />
        ) : (
          <button
            type="button"
            className={styles.save}
            onClick={() => setPickerOpen(true)}
            disabled={saving}
          >
            <Bookmark size={16} aria-hidden="true" />
            Lưu vào sổ từ vựng
          </button>
        )}
        {aiMeaning && (
          <p className={styles.sourceNote}>Nghĩa có phần do AI dịch — đối chiếu câu trong video.</p>
        )}
      </footer>
    </article>
  );
}
