/**
 * "Hack não" mode of the reader — listen first, understand in Vietnamese (port of Studychill BrainHackMode):
 *
 * - english    · under each Vietnamese sentence, blanks as wide as each word; the read-aloud karaoke marks the words
 *                (`data-karaoke`) and CSS turns that into "the word drops into its slot".
 * - vietnamese · ears get the English, eyes only the Vietnamese; hover a heard sentence to see the English.
 * - dictation  · one sentence at a time, then it stops; the learner types the sentence, the server grades it.
 *
 * Words being memorised (article vocabulary not marked known + saved words) are bold and drop slower;
 * hover / focus shows the meaning.
 */
import { memo, useMemo, useState } from "react";
import { BookmarkPlus, Check, Eye, Headphones, RotateCcw, X } from "lucide-react";

import type {
  BrainHackModeKey,
  DictationProgress,
  DictationRecord,
  NewsArticle,
  NewsSentenceDto,
  NewsVocabularyItemDto,
} from "../types/news.types";
import type { ReadAloudPosition } from "../hooks/useReadAloud";
import {
  attachVocabulary,
  normalizeToken,
  splitWords,
  type MatchedToken,
  type VocabularyIndex,
} from "../utils/news-reader";
import styles from "./BrainHackMode.module.css";

type WordHandler = (token: MatchedToken, sentence: NewsSentenceDto, element: HTMLElement) => void;

export interface MemorizedWord {
  word: string;
  ipa?: string;
  partOfSpeech?: string;
  meaning?: string;
  sentence?: NewsSentenceDto;
}

interface EnglishLineProps {
  sentence: NewsSentenceDto;
  tokens: MatchedToken[];
  memorizing: Set<string>;
  lookedUpMeanings: Map<string, string>;
  focusable: boolean;
  onWord: WordHandler;
}

/** English line with clickable words (`data-word` = karaoke index of useReadAloud). */
function EnglishLine({
  sentence,
  tokens,
  memorizing,
  lookedUpMeanings,
  focusable,
  onWord,
}: EnglishLineProps) {
  const wordOrdinals = useMemo(() => {
    let count = 0;
    return tokens.map((x) => (x.isWord ? count++ : -1));
  }, [tokens]);
  return (
    <p className={styles.english} lang="en">
      {tokens.map((x, i) => {
        if (!x.isWord) return <span key={i}>{x.text}</span>;
        const isMemorizing = x.entry
          ? memorizing.has(x.entry.word)
          : memorizing.has(normalizeToken(x.text));
        const meaning = x.entry?.meaning || lookedUpMeanings.get(normalizeToken(x.text)) || "";
        return (
          <span
            key={i}
            role="button"
            tabIndex={focusable ? 0 : -1}
            className={`${styles.word} ${isMemorizing ? styles.memorizing : ""}`}
            data-word={wordOrdinals[i]}
            data-entry={x.entry ? x.entry.word : undefined}
            data-hint={isMemorizing && meaning ? meaning : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onWord(x, sentence, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onWord(x, sentence, e.currentTarget);
              }
            }}
          >
            {x.text}
          </span>
        );
      })}
    </p>
  );
}

interface DictationBoxProps {
  sentence: NewsSentenceDto;
  record?: DictationRecord;
  onCheck: (sentence: NewsSentenceDto, input: string) => void;
  onReplay: () => void;
  onReveal: (sentence: NewsSentenceDto) => void;
}

/** Dictation of the current sentence: word slots (shown when right), input, replay and reveal. */
function DictationBox({ sentence, record, onCheck, onReplay, onReveal }: DictationBoxProps) {
  const [input, setInput] = useState(record?.input || "");
  const words =
    record?.result?.words ||
    sentence.text
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ text, ok: false }));
  const revealed = !!record?.revealed;
  return (
    <div>
      <p className={styles.slots} lang="en" aria-label="Các từ của câu">
        {words.map((x, i) => (
          <span key={i} className={x.ok ? styles.slotOk : revealed ? styles.slotRevealed : ""}>
            {x.ok || revealed ? x.text : x.text.replace(/[A-Za-z0-9’']/g, " ")}
          </span>
        ))}
      </p>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) onCheck(sentence, input);
        }}
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Control") {
              e.preventDefault();
              onReplay();
            }
          }}
          placeholder="Gõ lại câu tiếng Anh bạn vừa nghe…"
          aria-label="Câu tiếng Anh bạn nghe được"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.primary} disabled={!input.trim()}>
          Kiểm tra
        </button>
        <button
          type="button"
          onClick={onReplay}
          title="Nghe lại câu (Ctrl)"
          aria-label="Nghe lại câu"
        >
          <Headphones size={16} />
        </button>
        <button
          type="button"
          onClick={() => onReveal(sentence)}
          disabled={revealed}
          title="Xem đáp án"
          aria-label="Xem đáp án"
        >
          <Eye size={16} />
        </button>
      </form>
      <p className={styles.status} role="status">
        {record?.result
          ? `Đúng ${record.result.correctCount}/${record.result.total} từ${record.result.extra ? ` · dư ${record.result.extra} từ` : ""} — sửa rồi kiểm tra lại`
          : "Nghe xong gõ lại cả câu · Enter để kiểm tra · Ctrl nghe lại"}
      </p>
    </div>
  );
}

type SentenceStatus = "done" | "now" | "next";

interface BrainHackSentenceProps {
  sentence: NewsSentenceDto;
  status: SentenceStatus;
  mode: BrainHackModeKey;
  vocabulary: NewsVocabularyItemDto[];
  vocabularyIndex: VocabularyIndex;
  memorizing: Set<string>;
  lookedUpMeanings: Map<string, string>;
  record?: DictationRecord;
  onWord: WordHandler;
  onCheck: DictationBoxProps["onCheck"];
  onReplay: () => void;
  onReveal: DictationBoxProps["onReveal"];
}

const BrainHackSentence = memo(function BrainHackSentence({
  sentence,
  status,
  mode,
  vocabulary,
  vocabularyIndex,
  memorizing,
  lookedUpMeanings,
  record,
  onWord,
  onCheck,
  onReplay,
  onReveal,
}: BrainHackSentenceProps) {
  const tokens = useMemo(
    () => attachVocabulary(splitWords(sentence.text), vocabulary, vocabularyIndex),
    [sentence.text, vocabulary, vocabularyIndex],
  );
  const dictationPassed = mode === "dictation" && !!record?.passed;
  const line = (focusable: boolean) => (
    <EnglishLine
      sentence={sentence}
      tokens={tokens}
      memorizing={memorizing}
      lookedUpMeanings={lookedUpMeanings}
      focusable={focusable}
      onWord={onWord}
    />
  );
  let body = null;
  if (mode === "english" && status !== "next") body = line(status === "done");
  else if (mode === "vietnamese" && status === "done")
    body = <div className={styles.hidden}>{line(true)}</div>;
  else if (mode === "dictation") {
    if (dictationPassed) {
      body = (
        <div className={styles.passedLine}>
          {line(true)}
          <span className={`${styles.tag} ${record?.unaided ? styles.tagUnaided : ""}`}>
            {record?.unaided ? (
              <>
                <Check size={12} /> tự nghe
              </>
            ) : (
              <>
                <Eye size={12} /> đã xem đáp án
              </>
            )}
          </span>
        </div>
      );
    } else if (status === "now") {
      body = (
        <DictationBox
          key={sentence.id}
          sentence={sentence}
          record={record}
          onCheck={onCheck}
          onReplay={onReplay}
          onReveal={onReveal}
        />
      );
    }
  }
  const shown: SentenceStatus = dictationPassed ? "done" : status;
  const statusClass = shown === "done" ? styles.done : shown === "now" ? styles.now : styles.next;
  return (
    <div className={`${styles.sentence} ${statusClass}`} data-sentence={sentence.id}>
      <p className={styles.vietnamese} lang="vi">
        {sentence.translation}
      </p>
      {body}
    </div>
  );
});

interface BrainHackModeProps {
  mode: BrainHackModeKey;
  article: NewsArticle;
  sentenceIndex: Map<string, number>;
  position: ReadAloudPosition;
  atEnd: boolean;
  vocabularyIndex: VocabularyIndex;
  memorizing: Set<string>;
  lookedUpMeanings: Map<string, string>;
  savedWords: Set<string>;
  summaryWords: MemorizedWord[];
  dictation: DictationProgress;
  onWord: WordHandler;
  onSpeak: (text: string) => void;
  onSave: (word: MemorizedWord) => void;
  onSaveAll: () => void;
  onRestart: () => void;
  onExit: () => void;
  onCheck: DictationBoxProps["onCheck"];
  onReplaySentence: () => void;
  onReveal: DictationBoxProps["onReveal"];
}

export function BrainHackMode({
  mode,
  article,
  sentenceIndex,
  position,
  atEnd,
  vocabularyIndex,
  memorizing,
  lookedUpMeanings,
  savedWords,
  summaryWords,
  dictation,
  onWord,
  onSpeak,
  onSave,
  onSaveAll,
  onRestart,
  onExit,
  onCheck,
  onReplaySentence,
  onReveal,
}: BrainHackModeProps) {
  const total = sentenceIndex.size;
  const passedCount = Object.values(dictation).filter((x) => x.passed).length;
  const unaidedCount = Object.values(dictation).filter((x) => x.passed && x.unaided).length;
  const finished = mode === "dictation" ? passedCount >= total : atEnd;
  const unsaved = summaryWords.filter((x) => !savedWords.has(x.word));
  return (
    <div className={styles.root} aria-live="off">
      {mode === "dictation" && (
        <div className={styles.dictationBar}>
          <span>
            <b>{passedCount}</b>/{total} câu
          </span>
          <span>
            <b>{unaidedCount}</b> tự nghe không xem đáp án
          </span>
          <i style={{ width: `${(passedCount / Math.max(1, total)) * 100}%` }} aria-hidden="true" />
        </div>
      )}
      {article.paragraphs.map((paragraph) => (
        <div key={paragraph.id} className={styles.paragraph}>
          {paragraph.sentences.map((sentence) => {
            const k = sentenceIndex.get(sentence.id) ?? 0;
            const status: SentenceStatus =
              (mode !== "dictation" && atEnd) || k < position.sentence
                ? "done"
                : k === position.sentence
                  ? "now"
                  : "next";
            return (
              <BrainHackSentence
                key={sentence.id}
                sentence={sentence}
                status={status}
                mode={mode}
                vocabulary={article.vocabulary}
                vocabularyIndex={vocabularyIndex}
                memorizing={memorizing}
                lookedUpMeanings={lookedUpMeanings}
                record={dictation[sentence.id]}
                onWord={onWord}
                onCheck={onCheck}
                onReplay={onReplaySentence}
                onReveal={onReveal}
              />
            );
          })}
        </div>
      ))}

      {finished && (
        <section className={styles.end} aria-label="Tổng kết Hack não">
          <span className={styles.endKicker}>
            {mode === "dictation" ? "Nghe chép xong cả bài" : "Nghe xong cả bài"}
          </span>
          <h3>
            {mode === "dictation"
              ? `${unaidedCount}/${total} câu tự nghe ra`
              : `${summaryWords.length} từ bạn đang ghi nhớ đã đi qua tai`}
          </h3>
          {summaryWords.length > 0 && (
            <ul className={styles.endList}>
              {summaryWords.map((x) => (
                <li key={x.word}>
                  <button type="button" onClick={() => onSpeak(x.word)} title="Nghe lại từ này">
                    <b>{x.word}</b>
                    <span>{x.meaning}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.endSave}
                    onClick={() => onSave(x)}
                    disabled={savedWords.has(x.word)}
                    aria-label={savedWords.has(x.word) ? `Đã lưu ${x.word}` : `Lưu ${x.word}`}
                  >
                    {savedWords.has(x.word) ? <Check size={14} /> : <BookmarkPlus size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.endActions}>
            {unsaved.length > 0 && (
              <button type="button" className={styles.endPrimary} onClick={onSaveAll}>
                <BookmarkPlus size={15} /> Lưu {unsaved.length} từ vào sổ tay
              </button>
            )}
            <button type="button" onClick={onRestart}>
              <RotateCcw size={15} /> {mode === "dictation" ? "Làm lại từ đầu" : "Nghe lại từ đầu"}
            </button>
            <button type="button" onClick={onExit}>
              <X size={15} /> Thoát Hack não
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
