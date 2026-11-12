import { useMemo, useRef } from "react";
import { Clapperboard } from "lucide-react";

import type { SharedVideoItem } from "../../types/video-catalog.types";
import { REF_PAGE_SIZE } from "./catalog-format";
import { HeaderPagination, PaginationBar } from "./RefPagination";
import { SectionHeader } from "./SectionHeader";
import { SlideSearch } from "./SlideSearch";
import { useSharedVideosControls, type SharedVideosControls } from "./useVideoListControls";
import { AuthorRow, EmptyBox, RowPlayButton, VideoThumbBox } from "./VideoListParts";
import styles from "./SharedVideosSection.module.css";

export interface SharedVideosSectionProps {
  /** `desktop` = cream card with a 4-column grid; `mobile` = plain heading with one row per video. */
  variant: "desktop" | "mobile";
  /** Videos other learners made public (one card per video, grouped by the server). */
  videos: SharedVideoItem[];
  onOpen: (videoId: string) => void;
  /** Search / page state shared between the desktop and mobile instances; own state when omitted. */
  controls?: SharedVideosControls;
}

/** "Video tham khảo": sharer row (avatar, name, +N), search by title/sharer/channel, 20 per page. */
export function SharedVideosSection({
  variant,
  videos,
  onOpen,
  controls,
}: SharedVideosSectionProps) {
  const ownControls = useSharedVideosControls();
  const { searchOpen, query, setQuery, clearQuery, toggleSearch, page, setPage } =
    controls ?? ownControls;
  const sectionRef = useRef<HTMLElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return videos;
    return videos.filter(
      (video) =>
        video.title?.toLowerCase().includes(needle) ||
        video.userName?.toLowerCase().includes(needle) ||
        video.channel?.toLowerCase().includes(needle),
    );
  }, [videos, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REF_PAGE_SIZE));
  // A shorter list after a search or a deletion falls back to page 1.
  const currentPage = page > totalPages ? 1 : page;
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * REF_PAGE_SIZE;
    return filtered.slice(start, start + REF_PAGE_SIZE);
  }, [filtered, currentPage]);

  const goToPage = (next: number) => {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const actions = (
    <>
      <SlideSearch
        open={searchOpen}
        query={query}
        onQueryChange={setQuery}
        onClear={clearQuery}
        onToggle={toggleSearch}
        placeholder="Tìm theo tên hoặc người chia sẻ..."
        toggleTitle="Tìm kiếm video tham khảo"
      />
      <HeaderPagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </>
  );

  if (variant === "mobile") {
    return (
      <section ref={sectionRef} className={styles.mobileSection}>
        <SectionHeader variant="plain" title="Video tham khảo" count={filtered.length}>
          {actions}
        </SectionHeader>

        {displayed.length === 0 ? (
          <EmptyBox>
            {query.trim()
              ? "Không tìm thấy video tham khảo nào phù hợp."
              : "Chưa có video tham khảo nào được chia sẻ."}
          </EmptyBox>
        ) : (
          <div className={styles.rows}>
            {displayed.map((video) => (
              <article key={video.id || video.videoId} className={styles.rowCard}>
                <VideoThumbBox variant="row" video={video} onOpen={() => onOpen(video.videoId)} />

                <div className={styles.rowBody}>
                  <div className={styles.rowBodyTop}>
                    <h3
                      className={styles.rowTitle}
                      title={video.title}
                      onClick={() => onOpen(video.videoId)}
                    >
                      {video.title}
                    </h3>
                  </div>

                  <div className={styles.rowBodyBottom}>
                    <AuthorRow video={video} />
                    <div className={styles.rowActions}>
                      <RowPlayButton onOpen={() => onOpen(video.videoId)} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <PaginationBar page={currentPage} totalPages={totalPages} onChange={goToPage} />
      </section>
    );
  }

  return (
    <section ref={sectionRef} className={styles.card}>
      <SectionHeader
        variant="card"
        icon={<Clapperboard size={18} className={styles.monoIcon} />}
        title="Video tham khảo"
        count={filtered.length}
      >
        {actions}
      </SectionHeader>

      {displayed.length === 0 ? (
        <EmptyBox>
          {query.trim()
            ? "Không tìm thấy video tham khảo nào phù hợp."
            : "Chưa có ai chia sẻ video công khai."}
        </EmptyBox>
      ) : (
        <div className={styles.grid}>
          {displayed.map((video) => (
            <div key={video.id || video.videoId} className={styles.item}>
              <VideoThumbBox variant="grid" video={video} onOpen={() => onOpen(video.videoId)} />

              <div className={styles.body}>
                <h3
                  className={styles.title}
                  title={video.title}
                  onClick={() => onOpen(video.videoId)}
                >
                  {video.title}
                </h3>
                <AuthorRow video={video} />
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationBar page={currentPage} totalPages={totalPages} onChange={goToPage} />
    </section>
  );
}
