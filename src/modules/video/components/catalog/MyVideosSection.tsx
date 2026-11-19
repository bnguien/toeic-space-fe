import { useMemo } from "react";
import { Video } from "lucide-react";

import type { MyVideoItem } from "../../types/video-catalog.types";
import { MY_VIDEOS_PREVIEW_COUNT, formatDuration } from "./catalog-format";
import { SectionHeader } from "./SectionHeader";
import { SlideSearch } from "./SlideSearch";
import { useMyVideosControls, type MyVideosControls } from "./useVideoListControls";
import {
  DeleteButton,
  EmptyBox,
  PublicToggle,
  RowPlayButton,
  VideoThumbBox,
  ViewAllButton,
} from "./VideoListParts";
import styles from "./MyVideosSection.module.css";

export interface MyVideosSectionProps {
  /** `desktop` = cream card with a 4-column grid; `mobile` = plain heading with one row per video. */
  variant: "desktop" | "mobile";
  /** Only the learner's own videos, straight from the server (never sample data). */
  videos: MyVideoItem[];
  onOpen: (videoId: string) => void;
  onTogglePublic: (video: MyVideoItem) => void;
  /** Opens the delete confirmation (the page owns `DeleteVideoModal`). */
  onRequestDelete: (video: MyVideoItem) => void;
  /** Search / "Xem tất cả" state shared between the desktop and mobile instances; own state when omitted. */
  controls?: MyVideosControls;
}

/** "Video của tôi": count badge, sliding search, "Xem tất cả" (first 4 otherwise), public pill, delete. */
export function MyVideosSection({
  variant,
  videos,
  onOpen,
  onTogglePublic,
  onRequestDelete,
  controls,
}: MyVideosSectionProps) {
  const ownControls = useMyVideosControls();
  const { searchOpen, query, setQuery, clearQuery, toggleSearch, showAll, toggleShowAll } =
    controls ?? ownControls;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return videos;
    return videos.filter((video) => video.title?.toLowerCase().includes(needle));
  }, [videos, query]);

  const displayed = showAll || query.trim() ? filtered : filtered.slice(0, MY_VIDEOS_PREVIEW_COUNT);

  const actions = (
    <>
      <SlideSearch
        open={searchOpen}
        query={query}
        onQueryChange={setQuery}
        onClear={clearQuery}
        onToggle={toggleSearch}
        placeholder="Tìm video của tôi..."
        toggleTitle="Tìm kiếm video"
      />
      <ViewAllButton showAll={showAll} onToggle={toggleShowAll} />
    </>
  );

  if (variant === "mobile") {
    return (
      <section className={styles.mobileSection}>
        <SectionHeader variant="plain" title="Video của tôi" count={filtered.length}>
          {actions}
        </SectionHeader>

        {displayed.length === 0 ? (
          <EmptyBox>
            {query.trim()
              ? "Không tìm thấy video nào phù hợp với tìm kiếm của bạn."
              : "Chưa có video nào. Bấm nút Tạo video song ngữ phía trên để mở video đầu tiên."}
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
                    <div className={styles.rowMeta}>
                      <span className={styles.rowTag}>Song ngữ YouTube</span>
                      {video.duration > 0 && (
                        <span className={styles.rowDuration}>
                          Thời lượng: {formatDuration(video.duration)}
                        </span>
                      )}
                    </div>

                    <div className={styles.rowActions}>
                      <PublicToggle
                        isPublic={video.isPublic}
                        onToggle={() => onTogglePublic(video)}
                      />
                      <DeleteButton onDelete={() => onRequestDelete(video)} />
                      <RowPlayButton onOpen={() => onOpen(video.videoId)} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <SectionHeader
        variant="card"
        icon={<Video size={18} className={styles.monoIcon} />}
        title="Video của tôi"
        count={filtered.length}
      >
        {actions}
      </SectionHeader>

      {displayed.length === 0 ? (
        <EmptyBox>
          {query.trim()
            ? "Không tìm thấy video nào phù hợp với tìm kiếm của bạn."
            : "Chưa có video nào. Dán link YouTube phía trên để mở video đầu tiên."}
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

                <div className={styles.footActions}>
                  <PublicToggle isPublic={video.isPublic} onToggle={() => onTogglePublic(video)} />
                  <DeleteButton onDelete={() => onRequestDelete(video)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
