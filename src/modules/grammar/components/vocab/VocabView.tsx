/**
 * Vocabulary part of a topic, two modes:
 * - List: one airy row per word — word · IPA · listen · part of speech; meaning; one example with the word
 *   highlighted (+ small translation). Collocations on a small extra line; word family and trap note behind “Thêm”.
 *   Save to the PBL-75 library (folder picker) and mark “đã thuộc” are small icons.
 * - Học từ vựng: the PBL-75 Reel / Quiz cards on the topic's words (GrammarReel), opened on "Bắt đầu học".
 * Pronunciation: browser speech (PBL-75 speech util, en-US). Port of Studychill `VocabView.jsx`.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Clapperboard,
  Eye,
  EyeOff,
  List,
  Loader2,
  Play,
  Volume2,
} from "lucide-react";

import { speak, type ImportItem } from "@/modules/vocabulary";

import { grammarApi } from "../../api/grammar.api";
import type { GrammarVocab, GrammarVocabEntry } from "../../types/vocab.types";
import { cx } from "../../utils/cx";
import { NOUN_COUNTABILITY, POS_ABBR, POS_NAMES } from "../../utils/grammar-data";
import { findEntrySpan, pad2 } from "../../utils/grammar-text";
import { GRAMMAR_STORAGE_KEYS } from "../../utils/storage-keys";
import kit from "../shared/GrammarKit.module.css";
import { GrammarReel, type ReelKind } from "./GrammarReel";
import styles from "./VocabView.module.css";
import { WordSaveBox } from "./WordSaveBox";

/** vocab.json part of speech → the label the PBL-75 import normalises. */
const POS_EN: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  prep: "preposition",
  conj: "conjunction",
  pron: "pronoun",
  det: "determiner",
  phrase: "phrase",
};

function readKnown(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(GRAMMAR_STORAGE_KEYS.knownWords) || "[]") as unknown;
    return new Set(Array.isArray(v) ? (v as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeKnown(set: Set<string>): void {
  try {
    localStorage.setItem(GRAMMAR_STORAGE_KEYS.knownWords, JSON.stringify([...set]));
  } catch {
    /* private mode: not remembered */
  }
}

function ExampleHighlight({ sentence, word }: { sentence: string; word: string }) {
  const r = findEntrySpan(sentence, word);
  if (!r) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, r[0])}
      <mark className={kit.hl}>{sentence.slice(r[0], r[1])}</mark>
      {sentence.slice(r[1])}
    </>
  );
}

interface WordItemProps {
  e: GrammarVocabEntry;
  known: boolean;
  onKnown: () => void;
  hideMeaning: boolean;
  onListen: (e: GrammarVocabEntry) => void;
  onReadSentence: (text: string) => void;
  isGuest: boolean | undefined;
}

function WordItem({
  e,
  known,
  onKnown: onToggleKnown,
  hideMeaning,
  onListen,
  onReadSentence: onSpeakSentence,
  isGuest,
}: WordItemProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = hideMeaning && !revealed;
  const hasMore = e.wordFamily?.length > 0 || !!e.trapNote;

  const saveItem: ImportItem = {
    headword: e.word,
    phonetic: e.ipa,
    partOfSpeech: POS_EN[e.partOfSpeech] || e.partOfSpeech,
    meaningVi: e.meaning,
    example: e.example.sentence,
    exampleVi: e.example.translation,
  };
  const onSaved = useCallback(() => {
    setSaved(true);
    setPickerOpen(false);
  }, []);

  const posLabel = [
    POS_ABBR[e.partOfSpeech] || e.partOfSpeech,
    e.countability && (NOUN_COUNTABILITY[e.countability] || e.countability),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={cx(styles.w, known && styles.isKnown)}>
      <div className={styles.wordText}>
        <button
          type="button"
          className={styles.word}
          onClick={() => onListen(e)}
          title="Nghe phát âm"
          lang="en"
        >
          {e.word}
        </button>
        <div className={styles.sub}>
          <span className={styles.ipa}>{e.ipa}</span>
          <button
            type="button"
            className={cx(kit.ic, kit.icSm)}
            onClick={() => onListen(e)}
            aria-label={`Nghe phát âm ${e.word}`}
            title="Nghe phát âm"
          >
            <Volume2 size={15} />
          </button>
          <span className={styles.pos} title={POS_NAMES[e.partOfSpeech]}>
            {posLabel}
          </span>
          {e.isReview && (
            <span className={styles.on}>
              {e.sourceTopic ? `ôn CĐ${pad2(e.sourceTopic)}` : "ôn"}
            </span>
          )}
        </div>
      </div>

      <div className={styles.signals}>
        {hidden ? (
          <button type="button" className={styles.an} onClick={() => setRevealed(true)}>
            <Eye size={14} /> Xem nghĩa
          </button>
        ) : (
          <div className={styles.meaning}>{e.meaning}</div>
        )}
        <p className={styles.examples}>
          <span lang="en">
            <ExampleHighlight sentence={e.example.sentence} word={e.word} />
          </span>
          <button
            type="button"
            className={cx(kit.ic, kit.icSm)}
            onClick={() => onSpeakSentence(e.example.sentence)}
            aria-label="Nghe câu ví dụ"
            title="Nghe câu ví dụ"
          >
            <Volume2 size={13} />
          </button>
          {!hidden && <small className={styles.translation}>{e.example.translation}</small>}
        </p>
        {(e.collocations?.length > 0 || hasMore) && (
          <p className={styles.extra}>
            {e.collocations?.length > 0 && <span lang="en">{e.collocations.join(" · ")}</span>}
            {hasMore && (
              <button
                type="button"
                className={styles.addMore}
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
              >
                {showMore ? "Thu gọn" : "Thêm"}
              </button>
            )}
          </p>
        )}
        {showMore && (
          <div className={styles.more}>
            {e.wordFamily?.length > 0 && (
              <p>
                <b>Họ từ:</b>{" "}
                <span lang="en">
                  {e.wordFamily.map((h) => `${h.word} (${h.partOfSpeech})`).join(", ")}
                </span>
              </p>
            )}
            {e.trapNote && (
              <p>
                <b>Bẫy:</b> {e.trapNote}
              </p>
            )}
          </div>
        )}
        {pickerOpen && (
          <WordSaveBox
            item={saveItem}
            isGuest={isGuest}
            onSaved={onSaved}
            onCancel={() => setPickerOpen(false)}
          />
        )}
      </div>

      <div className={styles.acts}>
        <button
          type="button"
          className={cx(kit.ic, saved && kit.icOn)}
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Lưu vào sổ từ vựng"
          title={saved ? "Đã lưu vào sổ" : "Lưu vào sổ từ vựng"}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
        <button
          type="button"
          className={cx(kit.ic, styles.ok, known && styles.okOn)}
          onClick={onToggleKnown}
          aria-pressed={known}
          aria-label={known ? "Bỏ đánh dấu đã thuộc" : "Đánh dấu đã thuộc"}
          title={known ? "Đã thuộc — bấm để bỏ" : "Đánh dấu đã thuộc"}
        >
          <Check size={16} />
        </button>
      </div>
    </li>
  );
}

export interface VocabEnding {
  learned: boolean;
  isGuest: boolean | undefined;
  onConfirm: () => Promise<void> | void;
  onOpenExercises: () => void;
}

/** Closing block of the Vocabulary part — the learner confirms having gone through the words. */
function VocabEnd({
  learned,
  onConfirm: onLearned,
  onOpenExercises: onExercise,
  hint,
}: VocabEnding & { hint?: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    try {
      await onLearned();
    } catch {
      setError("Chưa lưu được, thử lại nhé.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={cx(kit.ending, learned && kit.endingDone)}>
      <div className={kit.endingTitle}>
        {learned ? "Đã học qua các từ của chuyên đề" : hint || "Đã đọc hết danh sách?"}
      </div>
      <div className={kit.endingRow}>
        {learned ? (
          <>
            <span className={kit.endingOk}>
              <Check size={16} /> Đã học qua các từ
            </span>
            <button type="button" className={cx(kit.btn, kit.btnMoss)} onClick={onExercise}>
              Làm bài tập <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className={cx(kit.btn, kit.btnSon)}
            onClick={() => void handleConfirm()}
            disabled={saving}
          >
            {saving ? <Loader2 size={15} className={kit.spin} /> : <Check size={15} />} Đã học qua
            các từ
          </button>
        )}
        {error && (
          <span className={kit.error} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

/** Waiting screen of the Học từ vựng mode: pick the kind, then open the full-screen study layer. */
function ReelLauncher({
  entries,
  number: topicNum,
  onShowList,
  ending,
}: {
  entries: GrammarVocabEntry[];
  number: number;
  onShowList: () => void;
  ending: VocabEnding;
}) {
  const [mode, setMode] = useState<ReelKind>("recall");
  const [open, setOpen] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  return (
    <div className={styles.study}>
      <div className={styles.studyIcon} aria-hidden="true">
        <Clapperboard size={26} />
      </div>
      <div className={styles.studyText}>
        <b>Học {entries.length} từ của chuyên đề như xem video ngắn</b>
        <p>
          Mỗi từ một thẻ: nghe nghĩa tiếng Việt → 5 giây đoán từ tiếng Anh (có hé chữ cái) → tự phát
          âm → tự chuyển sang từ tiếp theo. Bấm <kbd>Space</kbd> để tự gõ, <kbd>Esc</kbd> tạm dừng.
        </p>
        <div className={styles.studyRow}>
          <div className={styles.seg} role="radiogroup" aria-label="Kiểu học">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "recall"}
              className={cx(mode === "recall" && styles.segOn)}
              onClick={() => setMode("recall")}
            >
              Tự nhớ
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "quiz"}
              className={cx(mode === "quiz" && styles.segOn)}
              onClick={() => setMode("quiz")}
            >
              Trắc nghiệm
            </button>
          </div>
          <button type="button" className={cx(kit.btn, kit.btnMoss)} onClick={() => setOpen(true)}>
            <Play size={15} fill="currentColor" /> Bắt đầu học
          </button>
        </div>
      </div>
      {open && entries.length > 0 && (
        <GrammarReel
          entries={entries}
          number={topicNum}
          kind={mode === "quiz" && entries.length >= 2 ? "quiz" : "recall"}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setRoundDone(true);
          }}
          onShowList={() => {
            setOpen(false);
            setRoundDone(true);
            onShowList();
          }}
        />
      )}
      {roundDone && !open && <VocabEnd {...ending} hint="Bạn vừa học hết một lượt Reel." />}
    </div>
  );
}

/** Known words: signed in → server (the old local copy of the topic is merged once); guest → localStorage. */
function useKnownWords(
  entries: GrammarVocabEntry[],
  topicNum: number,
  isGuest: boolean | undefined,
) {
  const [knownLocal, setKnownLocal] = useState(readKnown);
  const [server, setServer] = useState<{ topic: string; words: Set<string> } | null>(null);
  const topicItem = pad2(topicNum);
  const serverWords =
    server && server.topic === topicItem && isGuest === false ? server.words : null;

  useEffect(() => {
    if (isGuest !== false) return undefined;
    let alive = true;
    (async () => {
      try {
        const serverKnown = new Set(await grammarApi.getKnownWords(topicItem));
        const legacy = readKnown();
        const toMerge = entries.filter((e) => legacy.has(e.id) && !serverKnown.has(e.word));
        await Promise.all(
          toMerge.map((e) =>
            grammarApi
              .setKnownWord(topicItem, e.word, true)
              .then(() => {
                serverKnown.add(e.word);
              })
              .catch(() => {}),
          ),
        );
        const remaining = new Set(
          [...legacy].filter((id) => !entries.some((e) => e.id === id && serverKnown.has(e.word))),
        );
        writeKnown(remaining);
        if (alive) setServer({ topic: topicItem, words: serverKnown });
      } catch {
        if (alive) setServer(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [topicItem, isGuest, entries]);

  const isKnown = (e: GrammarVocabEntry) =>
    serverWords ? serverWords.has(e.word) : knownLocal.has(e.id);

  const toggle = (e: GrammarVocabEntry) => {
    if (serverWords) {
      const nextKnown = !serverWords.has(e.word);
      const applyKnown = (enabled: boolean) =>
        setServer((s) => {
          if (!s) return s;
          const n = new Set(s.words);
          if (enabled) n.add(e.word);
          else n.delete(e.word);
          return { ...s, words: n };
        });
      applyKnown(nextKnown);
      grammarApi.setKnownWord(topicItem, e.word, nextKnown).catch(() => applyKnown(!nextKnown));
      return;
    }
    setKnownLocal((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(e.id)) nextSet.delete(e.id);
      else nextSet.add(e.id);
      writeKnown(nextSet);
      return nextSet;
    });
  };

  return { isKnown, toggle };
}

export interface VocabViewProps {
  vocab: GrammarVocab;
  number: number;
  /** true = guest, undefined = session still resolving. */
  isGuest: boolean | undefined;
  ending: VocabEnding;
}

export function VocabView({ vocab, number: topicNum, isGuest, ending }: VocabViewProps) {
  const entries = vocab.entries;
  const { isKnown, toggle: toggleKnown } = useKnownWords(entries, topicNum, isGuest);
  const [viewMode, setViewMode] = useState<"list" | "hoc">("list");
  const [hideMeaning, setHideMeaning] = useState(false);

  // Studychill played server neural TTS for single words (falling back to Web Speech); here: Web Speech en-US.
  const listen = (e: GrammarVocabEntry) => {
    speak(e.word, "en-US");
  };

  const newCount = entries.filter((e) => !e.isReview).length;
  const reviewCount = entries.length - newCount;
  const knownCount = entries.filter(isKnown).length;

  return (
    <div className={styles.vv}>
      <h2 className={kit.sectionTitle}>
        <b>SECTION B</b>
        <span>
          Từ vựng — {newCount} từ mới{reviewCount ? ` + ${reviewCount} từ ôn` : ""}
        </span>
      </h2>

      <div className={styles.bar}>
        <div className={styles.seg} role="tablist" aria-label="Chế độ">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "list"}
            className={cx(viewMode === "list" && styles.segOn)}
            onClick={() => setViewMode("list")}
          >
            <List size={15} /> Danh sách
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "hoc"}
            className={cx(viewMode === "hoc" && styles.segOn)}
            onClick={() => setViewMode("hoc")}
          >
            <Clapperboard size={15} /> Học từ vựng
          </button>
        </div>
        {viewMode === "list" && (
          <button
            type="button"
            className={cx(styles.toggle, hideMeaning && styles.toggleOn)}
            onClick={() => setHideMeaning((v) => !v)}
            aria-pressed={hideMeaning}
          >
            {hideMeaning ? <EyeOff size={15} /> : <Eye size={15} />} Ẩn nghĩa
          </button>
        )}
        <span className={styles.count} title="Số từ đã đánh dấu thuộc">
          Đã thuộc{" "}
          <b>
            {knownCount}/{entries.length}
          </b>
        </span>
      </div>

      {viewMode === "hoc" ? (
        <ReelLauncher
          entries={entries}
          number={topicNum}
          onShowList={() => setViewMode("list")}
          ending={ending}
        />
      ) : (
        <>
          <ul className={styles.wl}>
            {entries.map((e) => (
              <WordItem
                key={`${e.id}-${hideMeaning ? "an" : "hien"}`}
                e={e}
                isGuest={isGuest}
                known={isKnown(e)}
                onKnown={() => toggleKnown(e)}
                hideMeaning={hideMeaning}
                onListen={listen}
                onReadSentence={(t) => speak(t, "en-US")}
              />
            ))}
          </ul>
          <VocabEnd {...ending} />
        </>
      )}
    </div>
  );
}
