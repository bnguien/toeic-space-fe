import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { NewsFilterBar } from "../components/NewsFilterBar";
import { NewsHero } from "../components/NewsHero";
import { NewsStagePanel } from "../components/NewsStagePanel";
import { NewsTopicRow } from "../components/NewsTopicRow";
import { useGuestReadingMerge } from "../hooks/useGuestReadingMerge";
import { useNewsSummary } from "../hooks/useNewsSummary";
import type { NewsLength, NewsStage, NewsTopic } from "../types/news.types";
import { STAGES, TOPICS } from "../utils/news-catalog";
import styles from "./NewsListPage.module.css";

/** Topic rows shown at once; more behind "Xem thêm chủ đề". */
const INITIAL_ROWS = 6;

/**
 * `/games/news` — bilingual news list. One small request gives the totals (count per stage, the viewer's done /
 * reading counts); every topic row loads its own cards page by page. Filters (stage, length, search) run on the
 * server; the search waits 300 ms after the last keystroke.
 */
export function NewsListPage() {
  const [query, setQuery] = useState("");
  const searchText = useDebouncedValue(query.trim(), 300);
  const [stage, setStage] = useState<NewsStage | "all">("all");
  const [length, setLength] = useState<NewsLength | "all">("all");
  const [topic, setTopic] = useState<NewsTopic | "all">("all");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const summary = useNewsSummary();
  useGuestReadingMerge();

  useEffect(() => {
    document.title = "Đọc báo song ngữ Anh – Việt | TOEIC Space";
  }, []);

  // Total of every row for the current filters (the key carries the filter signature, so old totals expire).
  const [totals, setTotals] = useState<Record<string, number>>({});
  const reportTotal = useCallback(
    (key: string, n: number) =>
      setTotals((current) => (current[key] === n ? current : { ...current, [key]: n })),
    [],
  );
  const sharedFilters = useMemo(
    () => ({ stage, length, q: searchText }),
    [stage, length, searchText],
  );
  const filterKey = `${stage}|${length}|${searchText}|${topic}:`;

  // A stage card filters and scrolls to the list; clicking the active stage clears it (no scroll).
  const pickStage = (key: NewsStage) => {
    if (stage === key) {
      setStage("all");
      return;
    }
    setStage(key);
    requestAnimationFrame(() =>
      toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const isFiltering = !!searchText || stage !== "all" || length !== "all" || topic !== "all";
  const clearFilters = () => {
    setQuery("");
    setStage("all");
    setLength("all");
    setTopic("all");
  };
  const selectedTopics = TOPICS.filter((x) => topic === "all" || x.key === topic);
  const visibleTopics =
    showAllTopics || topic !== "all" ? selectedTopics : selectedTopics.slice(0, INITIAL_ROWS);
  const hiddenTopicCount = selectedTopics.length - visibleTopics.length;
  const allReported = visibleTopics.every((x) => filterKey + x.key in totals);
  const matchCount = visibleTopics.reduce((n, x) => n + (totals[filterKey + x.key] || 0), 0);
  const isEmpty = allReported && visibleTopics.every((x) => totals[filterKey + x.key] === 0);
  const meta = summary.data;
  const totalArticles = meta?.total ?? 0;
  const doneCount = meta?.doneCount ?? 0;
  const readingCount = meta?.readingCount ?? 0;
  const percentDone = totalArticles ? Math.round((doneCount / totalArticles) * 100) : 0;

  return (
    <div className={styles.page}>
      <main className={styles.inner}>
        <NewsHero
          articleCount={meta ? totalArticles : null}
          topicCount={TOPICS.length}
          stageCount={STAGES.length}
          onStart={() =>
            document.getElementById("news-library")?.scrollIntoView({ behavior: "smooth" })
          }
        />

        <section className={styles.library} id="news-library" aria-labelledby="news-library-title">
          <header className={styles.libraryHead}>
            <div className={styles.libraryTitle}>
              <span className={styles.kicker}>Báo tuyển chọn</span>
              <h2 id="news-library-title">Đọc theo chặng TOEIC</h2>
              <p>
                {STAGES.length} chặng theo điểm TOEIC, {TOPICS.length} chủ đề gần với đề thi
              </p>
            </div>
            <div className={styles.progress}>
              <div>
                <b>{percentDone}%</b>
                <span>
                  {doneCount}/{totalArticles} bài đã đọc
                </span>
              </div>
              <span className={styles.track} aria-hidden="true">
                <i style={{ width: `${percentDone}%` }} />
              </span>
              <small>
                <i className={styles.legendDone} /> Đã đọc {doneCount}{" "}
                <i className={styles.legendReading} /> Đang đọc {readingCount}
              </small>
            </div>
          </header>

          <NewsStagePanel
            stage={stage}
            counts={meta?.facets.stage ?? {}}
            onPick={pickStage}
            onClear={() => setStage("all")}
          />

          <NewsFilterBar
            ref={toolbarRef}
            query={query}
            onQueryChange={setQuery}
            length={length}
            onLengthChange={setLength}
            topic={topic}
            onTopicChange={setTopic}
          />
          {isFiltering && (
            <p className={styles.summary}>
              {allReported ? (
                <>
                  <b>{matchCount}</b> bài phù hợp
                </>
              ) : (
                "Đang tìm…"
              )}{" "}
              ·{" "}
              <button type="button" onClick={clearFilters}>
                Xoá bộ lọc
              </button>
            </p>
          )}

          <div className={styles.rows}>
            {!isFiltering && readingCount > 0 && (
              <NewsTopicRow
                title="Đang đọc dở"
                description="Đọc tiếp từ chỗ bạn dừng"
                filters={{ state: "reading" }}
              />
            )}
            {visibleTopics.map((info) => (
              <NewsTopicRow
                key={info.key}
                title={info.name}
                description={info.description}
                filters={{ ...sharedFilters, topic: info.key }}
                onTotal={(n) => reportTotal(filterKey + info.key, n)}
              />
            ))}
            {hiddenTopicCount > 0 && (
              <button
                type="button"
                className={styles.moreTopics}
                onClick={() => setShowAllTopics(true)}
              >
                Xem thêm {hiddenTopicCount} chủ đề <ChevronDown size={16} />
              </button>
            )}
            {summary.isError && (
              <p className={styles.empty}>Chưa tải được bài báo, thử tải lại trang nhé.</p>
            )}
            {meta && totalArticles === 0 && (
              <p className={styles.empty}>Chưa có bài báo nào được đăng.</p>
            )}
            {isFiltering && isEmpty && (
              <p className={styles.empty}>
                Không có bài báo nào khớp bộ lọc.{" "}
                <button type="button" onClick={clearFilters}>
                  Xoá bộ lọc
                </button>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
