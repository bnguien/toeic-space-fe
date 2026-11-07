import { BookmarkPlus, Check, Clock, Eye, EyeOff, Gauge, PauseCircle, Search } from "lucide-react";

import type { LookedUpWord, NewsVocabularyItemDto } from "../types/news.types";
import { formatDuration } from "../utils/news-reader";
import styles from "./ReaderSidePanel.module.css";

export type PanelTab = "words" | "lookedUp" | "notes";

interface ReaderSidePanelProps {
  seconds: number;
  idle: boolean;
  wpm: number;
  percentRead: number;
  vocabulary: NewsVocabularyItemDto[];
  occurrences: Record<string, number>;
  knownWords: Set<string>;
  savedWords: Set<string>;
  lookedUpWords: LookedUpWord[];
  notes: string;
  onNotesChange: (value: string) => void;
  onGoToWord: (word: string) => void;
  onToggleKnown: (word: string) => void;
  onSaveVocabulary: (item: NewsVocabularyItemDto) => void;
  onSaveLookedUp: (word: LookedUpWord) => void;
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}

/** Side panel: reading stats + tabs "Từ trong bài", "Đã tra", "Ghi chú" (also the mobile bottom sheet). */
export function ReaderSidePanel({
  seconds,
  idle,
  wpm,
  percentRead,
  vocabulary,
  occurrences,
  knownWords,
  savedWords,
  lookedUpWords,
  notes,
  onNotesChange,
  onGoToWord,
  onToggleKnown,
  onSaveVocabulary,
  onSaveLookedUp,
  tab,
  onTabChange: setTab,
  filter,
  onFilterChange: setFilter,
}: ReaderSidePanelProps) {
  const filtered = vocabulary.filter(
    (item) =>
      !filter || `${item.word} ${item.meaning}`.toLowerCase().includes(filter.toLowerCase()),
  );
  const tabs: Array<[PanelTab, string]> = [
    ["words", `Từ trong bài · ${vocabulary.length}`],
    ["lookedUp", `Đã tra · ${lookedUpWords.length}`],
    ["notes", "Ghi chú"],
  ];

  return (
    <aside className={styles.panel} aria-label="Từ vựng và thống kê">
      <section className={styles.stats}>
        <div className={styles.stat}>
          <span>
            <Clock size={13} /> Thời gian đọc
          </span>
          <b className={idle ? styles.paused : ""}>{formatDuration(seconds)}</b>
          {idle && (
            <small>
              <PauseCircle size={11} /> Tạm dừng khi bạn rời bàn
            </small>
          )}
        </div>
        <div className={styles.stat}>
          <span>
            <Gauge size={13} /> Tốc độ
          </span>
          <b>
            {wpm || "—"}
            <small> từ/phút</small>
          </b>
        </div>
        <div className={styles.statRow}>
          <span>
            <b>{percentRead}%</b> đã đọc
          </span>
          <span>
            <b>{lookedUpWords.length}</b> từ đã tra
          </span>
          <span>
            <b>{savedWords.size}</b> đã lưu
          </span>
        </div>
      </section>

      <div className={styles.tabs} role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? styles.tabActive : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === "words" && (
          <>
            <label className={styles.find}>
              <Search size={14} />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Lọc từ…"
                aria-label="Lọc từ vựng"
              />
            </label>
            <p className={styles.hint}>
              Bấm một từ để nhảy tới chỗ nó trong bài. Đánh dấu <b>đã biết</b> để bỏ gạch chân.
            </p>
            <ol className={styles.list}>
              {filtered.map((item) => {
                const known = knownWords.has(item.word);
                const saved = savedWords.has(item.word);
                return (
                  <li key={item.word} className={known ? styles.known : ""}>
                    <button
                      type="button"
                      className={styles.main}
                      onClick={() => onGoToWord(item.word)}
                    >
                      <span className={styles.word}>
                        {item.word}
                        <i>{item.partOfSpeech}</i>
                        <em>×{occurrences[item.word] || 0}</em>
                      </span>
                      <span className={styles.ipa}>{item.ipa}</span>
                      <span className={styles.meaning}>{item.meaning}</span>
                    </button>
                    <span className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => onToggleKnown(item.word)}
                        aria-label={
                          known ? `Bỏ đã biết ${item.word}` : `Đánh dấu đã biết ${item.word}`
                        }
                        title={known ? "Bỏ đã biết" : "Đã biết"}
                      >
                        {known ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveVocabulary(item)}
                        disabled={saved}
                        aria-label={`Lưu ${item.word}`}
                        title={saved ? "Đã lưu" : "Lưu vào sổ tay"}
                      >
                        {saved ? <Check size={14} /> : <BookmarkPlus size={14} />}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {tab === "lookedUp" &&
          (lookedUpWords.length ? (
            <ol className={styles.list}>
              {lookedUpWords.map((x) => (
                <li key={x.word}>
                  <button
                    type="button"
                    className={styles.main}
                    onClick={() => (x.inArticle ? onGoToWord(x.word) : null)}
                  >
                    <span className={styles.word}>
                      {x.word}
                      {x.partOfSpeech && <i>{x.partOfSpeech}</i>}
                    </span>
                    {x.ipa && <span className={styles.ipa}>{x.ipa}</span>}
                    <span className={styles.meaning}>{x.meaning || "—"}</span>
                  </button>
                  <span className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => onSaveLookedUp(x)}
                      disabled={savedWords.has(x.word)}
                      aria-label={`Lưu ${x.word}`}
                    >
                      {savedWords.has(x.word) ? <Check size={14} /> : <BookmarkPlus size={14} />}
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.hint}>
              Bấm vào bất kỳ từ nào trong bài để tra nghĩa — từ đã tra sẽ nằm ở đây.
            </p>
          ))}
        {tab === "notes" && (
          <textarea
            className={styles.notes}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            maxLength={4000}
            placeholder="Ghi ý chính, cấu trúc hay, câu muốn nhớ… (tự lưu trên máy này)"
          />
        )}
      </div>
    </aside>
  );
}
