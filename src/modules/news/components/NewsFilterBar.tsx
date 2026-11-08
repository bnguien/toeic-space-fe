import { forwardRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import type { NewsLength, NewsTopic } from "../types/news.types";
import { LENGTHS, TOPICS } from "../utils/news-catalog";
import styles from "./NewsFilterBar.module.css";

interface NewsFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  length: NewsLength | "all";
  onLengthChange: (value: NewsLength | "all") => void;
  topic: NewsTopic | "all";
  onTopicChange: (value: NewsTopic | "all") => void;
}

/** Search box + filter button; the filters (length, topic) open in a panel below. */
export const NewsFilterBar = forwardRef<HTMLDivElement, NewsFilterBarProps>(function NewsFilterBar(
  { query, onQueryChange, length, onLengthChange, topic, onTopicChange },
  ref,
) {
  const [open, setOpen] = useState(false);
  const activeCount = Number(length !== "all") + Number(topic !== "all");
  const buttonClass = [
    styles.filterButton,
    open ? styles.filterOpen : "",
    activeCount ? styles.filterActive : "",
  ].join(" ");

  return (
    <>
      <div className={styles.toolbar} ref={ref}>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm bài báo, nguồn…"
            aria-label="Tìm bài báo"
          />
          {query && (
            <button type="button" onClick={() => onQueryChange("")} aria-label="Xoá tìm kiếm">
              <X size={14} />
            </button>
          )}
        </label>
        <button
          type="button"
          className={buttonClass}
          aria-expanded={open}
          aria-controls="news-filter-panel"
          aria-label="Bộ lọc"
          title="Bộ lọc"
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal size={18} />
          {activeCount > 0 && <span className={styles.filterCount}>{activeCount}</span>}
        </button>
      </div>

      <div
        id="news-filter-panel"
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        inert={!open}
      >
        <div className={styles.panelInner}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Độ dài</span>
            <div className={styles.pills}>
              {LENGTHS.map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  className={length === key ? styles.pillActive : ""}
                  aria-pressed={length === key}
                  onClick={() => onLengthChange(key)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Chủ đề</span>
            <div className={styles.pills}>
              <button
                type="button"
                className={topic === "all" ? styles.pillActive : ""}
                onClick={() => onTopicChange("all")}
              >
                Tất cả
              </button>
              {TOPICS.map((info) => (
                <button
                  key={info.key}
                  type="button"
                  className={topic === info.key ? styles.pillActive : ""}
                  aria-pressed={topic === info.key}
                  onClick={() => onTopicChange(info.key)}
                >
                  {info.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
