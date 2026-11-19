import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
} from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type {
  CatalogTopic,
  CatalogVideoItem,
  LoadTopicPage,
  WatchProgressMap,
} from "../../types/video-catalog.types";
import { VideoCard } from "./VideoCard";
import styles from "./TopicRow.module.css";

/** Cards fetched per page when the row scrolls near its end. */
export const TOPIC_PAGE_SIZE = 12;
/** px — a mouse drag beyond this is not a click on the card. */
const DRAG_THRESHOLD = 6;

export interface TopicRowProps {
  /** Topic with its first page; the row keeps paging on its own through `onLoadMore`. */
  topic: CatalogTopic;
  onOpen: (video: CatalogVideoItem) => void;
  /** videoId being resolved right now (its card shows the spinner). */
  openingId?: string;
  /** Videos hidden for this visitor (no English subtitles after an open attempt). */
  hiddenIds?: ReadonlySet<string>;
  progress?: WatchProgressMap;
  /** Next page loader; without it the row never pages. */
  onLoadMore?: LoadTopicPage;
}

interface DragState {
  x: number;
  scrollLeft: number;
  dragged: boolean;
}

/** One horizontally scrolling topic row: drag / swipe / arrows, scroll-snap, infinite paging. */
export function TopicRow({
  topic,
  onOpen,
  openingId = "",
  hiddenIds,
  progress,
  onLoadMore,
}: TopicRowProps) {
  const [videos, setVideos] = useState<CatalogVideoItem[]>(topic.videos || []);
  const [hasMore, setHasMore] = useState(!!topic.hasMore && !!onLoadMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: !!(topic.videos || []).length });
  const offsetRef = useRef(topic.nextOffset || (topic.videos || []).length);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !onLoadMore) return;
    setLoadingMore(true);
    onLoadMore(topic.slug, offsetRef.current, TOPIC_PAGE_SIZE)
      .then((page) => {
        offsetRef.current = page.nextOffset;
        setHasMore(!!page.hasMore);
        // Order may shift when a video just changed its subtitle status → drop duplicates.
        setVideos((previous) => {
          const existing = new Set(previous.map((video) => video.videoId));
          return [...previous, ...(page.videos || []).filter((v) => !existing.has(v.videoId))];
        });
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, onLoadMore, topic.slug]);

  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root, rootMargin: "0px 480px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const updateEdges = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const canScrollLeft = element.scrollLeft > 4;
    const canScrollRight = element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
    setEdges((current) =>
      current.left === canScrollLeft && current.right === canScrollRight
        ? current
        : { left: canScrollLeft, right: canScrollRight },
    );
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateEdges);
    window.addEventListener("resize", updateEdges);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, videos.length]);

  const slide = (direction: -1 | 1) => {
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(240, element.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  // Mouse drag (touch already scrolls natively).
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const element = scrollerRef.current;
    if (!element) return;
    dragRef.current = { x: event.clientX, scrollLeft: element.scrollLeft, dragged: false };
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = moveEvent.clientX - drag.x;
      if (!drag.dragged && Math.abs(dx) > DRAG_THRESHOLD) {
        drag.dragged = true;
        element.classList.add(styles.isDragging);
      }
      if (drag.dragged) element.scrollLeft = drag.scrollLeft - dx;
    };
    const release = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", release);
      element.classList.remove(styles.isDragging);
      // Keep the flag through the click that follows pointerup, then clear it.
      setTimeout(() => {
        dragRef.current = null;
      }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", release);
  };

  const blockClickAfterDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.dragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const visibleVideos =
    hiddenIds && hiddenIds.size ? videos.filter((video) => !hiddenIds.has(video.videoId)) : videos;
  if (!visibleVideos.length && !hasMore) return null;

  return (
    <div className={styles.row}>
      <div className={styles.head}>
        <h3 className={styles.title}>{topic.title}</h3>
        <div className={styles.arrows}>
          <button
            type="button"
            onClick={() => slide(-1)}
            disabled={!edges.left}
            aria-label={`Lùi hàng ${topic.title}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => slide(1)}
            disabled={!edges.right && !hasMore}
            aria-label={`Tới hàng ${topic.title}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={updateEdges}
        onPointerDown={startDrag}
        onClickCapture={blockClickAfterDrag}
      >
        {visibleVideos.map((video) => (
          <VideoCard
            key={video.videoId}
            video={video}
            isOpening={openingId === video.videoId}
            onOpen={onOpen}
            progress={progress && progress[video.videoId]}
          />
        ))}
        {hasMore && (
          <span ref={sentinelRef} className={styles.more} aria-hidden={!loadingMore}>
            {loadingMore && <Loader2 size={20} className={styles.spin} />}
          </span>
        )}
      </div>
    </div>
  );
}

/** Placeholder row while the catalog loads. */
export function TopicRowSkeleton() {
  return (
    <div className={styles.row} aria-busy="true">
      <div className={styles.head}>
        <span className={cx(styles.skeleton, styles.skeletonTitle)} />
      </div>
      <div className={styles.scroller}>
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} className={cx(styles.skeleton, styles.skeletonCard)} />
        ))}
      </div>
    </div>
  );
}
