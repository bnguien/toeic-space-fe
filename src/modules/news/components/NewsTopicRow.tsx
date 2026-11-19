import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useNewsArticleRow } from "../hooks/useNewsArticleRow";
import type { NewsArticleListParams } from "../types/news.types";
import { toNewsCard } from "../utils/news-catalog";
import { NewsArticleCard, NewsArticleCardSkeleton } from "./NewsArticleCard";
import styles from "./NewsTopicRow.module.css";

interface NewsTopicRowProps {
  title: string;
  description?: string;
  filters: NewsArticleListParams;
  /** Reports the number of articles matching the filters once loaded. */
  onTotal?: (total: number) => void;
}

/**
 * One topic = one horizontal row that loads its own cards, 12 per page: the first page once the row gets near the
 * viewport (400px), the next ones when scrolled (or arrowed) near the end. A row without articles hides itself.
 */
export function NewsTopicRow({ title, description, filters, onTotal }: NewsTopicRowProps) {
  const rowRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver every row loads at once.
  const [nearViewport, setNearViewport] = useState(() => !("IntersectionObserver" in window));
  const [edges, setEdges] = useState({ left: false, right: true });
  const query = useNewsArticleRow(filters, nearViewport);
  const onTotalRef = useRef(onTotal);

  useEffect(() => {
    onTotalRef.current = onTotal;
  }, [onTotal]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el || nearViewport) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNearViewport(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nearViewport]);

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items).map(toNewsCard),
    [query.data],
  );
  const firstPageFailed = query.isError && !query.data;
  const total = query.data?.pages[0]?.total ?? (firstPageFailed ? 0 : null);
  const hasMore = !!query.hasNextPage;
  const loading = query.isFetching;
  const error = query.isError;

  useEffect(() => {
    if (total != null) onTotalRef.current?.(total);
  }, [total]);

  const loadMore = () => {
    if (hasMore && !loading) void query.fetchNextPage();
  };

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: hasMore || el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    // Less than one screen of cards left: load the next page in time for the swipe.
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - el.clientWidth) loadMore();
  };

  useEffect(() => {
    updateEdges();
  }, [items.length, hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollBy = (direction: number) => {
    scrollerRef.current?.scrollBy({
      left: direction * scrollerRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
    if (direction > 0) loadMore();
  };

  const retry = () => {
    if (query.data) void query.fetchNextPage();
    else void query.refetch();
  };

  if (total === 0 && !error) return null;
  const railClass = [
    styles.rail,
    edges.left ? styles.hasLeft : "",
    edges.right ? styles.hasRight : "",
  ].join(" ");
  return (
    <section className={styles.row} ref={rowRef}>
      <header className={styles.head}>
        <div>
          <h3>
            {title} <span className={styles.count}>{total == null ? "…" : `${total} bài`}</span>
          </h3>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className={railClass}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scrollBy(-1)}
          aria-label={`Lùi hàng ${title}`}
          tabIndex={edges.left ? 0 : -1}
        >
          <ChevronLeft size={18} />
        </button>
        <div className={styles.scroller} ref={scrollerRef} onScroll={updateEdges}>
          {items.map((card) => (
            <NewsArticleCard key={card.slug} card={card} />
          ))}
          {loading &&
            Array.from({ length: items.length ? 2 : 4 }, (_, i) => (
              <NewsArticleCardSkeleton key={`skeleton-${i}`} />
            ))}
          {error && !loading && (
            <div className={styles.retry}>
              <p>Chưa tải được hàng này.</p>
              <button type="button" onClick={retry}>
                Thử lại
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scrollBy(1)}
          aria-label={`Tới hàng ${title}`}
          tabIndex={edges.right ? 0 : -1}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
