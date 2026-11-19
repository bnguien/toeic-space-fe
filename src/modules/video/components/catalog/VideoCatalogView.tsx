import type { MyVideoItem, SharedVideoItem } from "../../types/video-catalog.types";
import { CatalogHero } from "./CatalogHero";
import { DeleteVideoModal, type DeleteVideoModalProps } from "./DeleteVideoModal";
import { DesktopCatalog } from "./DesktopCatalog";
import { GuestIntro } from "./GuestIntro";
import { MobileCatalog } from "./MobileCatalog";
import { MobileCreateSection } from "./MobileCreateSection";
import { MyVideosSection } from "./MyVideosSection";
import type { PasteLinkBoxProps } from "./PasteLinkBox";
import { SharedVideosSection } from "./SharedVideosSection";
import { useIsMobileLayout } from "./useIsMobileLayout";
import { useMyVideosControls, useSharedVideosControls } from "./useVideoListControls";
import { VideoCatalogRows, type VideoCatalogRowsProps } from "./VideoCatalogRows";
import { VideoSidebar, type VideoSidebarProps } from "./VideoSidebar";
import styles from "./VideoCatalogView.module.css";

export interface VideoCatalogViewProps {
  isGuest: boolean;
  /** Paste-URL box state (shared by the hero and the mobile collapse). */
  link: Omit<PasteLinkBoxProps, "variant" | "isGuest">;
  /** Curated rows + listening path. */
  rows: VideoCatalogRowsProps;
  myVideos: {
    items: MyVideoItem[];
    onOpen: (videoId: string) => void;
    onTogglePublic: (video: MyVideoItem) => void;
    onRequestDelete: (video: MyVideoItem) => void;
  };
  sharedVideos: {
    items: SharedVideoItem[];
    onOpen: (videoId: string) => void;
  };
  deleteDialog: DeleteVideoModalProps;
  sidebar: Omit<VideoSidebarProps, "isGuest">;
}

/**
 * Whole catalog page body: 2-column grid (main + 350px sidebar), both the desktop and the mobile
 * layout rendered and swapped by CSS at 768px; the self-paging rows mount only in the visible one.
 */
export function VideoCatalogView({
  isGuest,
  link,
  rows,
  myVideos,
  sharedVideos,
  deleteDialog,
  sidebar,
}: VideoCatalogViewProps) {
  const isMobile = useIsMobileLayout();
  const myControls = useMyVideosControls();
  const sharedControls = useSharedVideosControls();
  const pastedLink = link.url.trim();

  const catalogRows = <VideoCatalogRows {...rows} />;

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            <DesktopCatalog>
              <CatalogHero {...link} isGuest={isGuest} />
              {!isMobile && catalogRows}
              {isGuest ? (
                <GuestIntro linkVideo={pastedLink} />
              ) : (
                <>
                  <MyVideosSection
                    variant="desktop"
                    videos={myVideos.items}
                    onOpen={myVideos.onOpen}
                    onTogglePublic={myVideos.onTogglePublic}
                    onRequestDelete={myVideos.onRequestDelete}
                    controls={myControls}
                  />
                  <SharedVideosSection
                    variant="desktop"
                    videos={sharedVideos.items}
                    onOpen={sharedVideos.onOpen}
                    controls={sharedControls}
                  />
                </>
              )}
            </DesktopCatalog>

            <MobileCatalog>
              <MobileCreateSection {...link} isGuest={isGuest} />
              {isMobile && catalogRows}
              {isGuest ? (
                <GuestIntro linkVideo={pastedLink} />
              ) : (
                <>
                  <MyVideosSection
                    variant="mobile"
                    videos={myVideos.items}
                    onOpen={myVideos.onOpen}
                    onTogglePublic={myVideos.onTogglePublic}
                    onRequestDelete={myVideos.onRequestDelete}
                    controls={myControls}
                  />
                  <SharedVideosSection
                    variant="mobile"
                    videos={sharedVideos.items}
                    onOpen={sharedVideos.onOpen}
                    controls={sharedControls}
                  />
                </>
              )}
            </MobileCatalog>
          </div>

          <VideoSidebar isGuest={isGuest} {...sidebar} />
        </div>
      </main>

      <DeleteVideoModal {...deleteDialog} />
    </div>
  );
}
