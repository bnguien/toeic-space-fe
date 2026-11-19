/* Presentational components of the catalog page (`/games/video`): data in, callbacks out. */

export { VideoCatalogView, type VideoCatalogViewProps } from "./VideoCatalogView";
export { DesktopCatalog } from "./DesktopCatalog";
export { MobileCatalog } from "./MobileCatalog";

export { CatalogHero, type CatalogHeroProps } from "./CatalogHero";
export { MobileCreateSection, type MobileCreateSectionProps } from "./MobileCreateSection";
export { PasteLinkBox, type PasteLinkBoxProps } from "./PasteLinkBox";
export { GuestIntro, type GuestIntroProps } from "./GuestIntro";

export { VideoCatalogRows, type VideoCatalogRowsProps } from "./VideoCatalogRows";
export { VideoPathPanel, type VideoPathPanelProps } from "./VideoPathPanel";
export { ContinueRow, CONTINUE_ROW_SLUG, type ContinueRowProps } from "./ContinueRow";
export { TopicRow, TopicRowSkeleton, TOPIC_PAGE_SIZE, type TopicRowProps } from "./TopicRow";
export { VideoCard, type VideoCardProps } from "./VideoCard";

export { MyVideosSection, type MyVideosSectionProps } from "./MyVideosSection";
export { SharedVideosSection, type SharedVideosSectionProps } from "./SharedVideosSection";
export { DeleteVideoModal, type DeleteVideoModalProps } from "./DeleteVideoModal";
export { VideoSidebar, DEFAULT_VOCAB_HREF, type VideoSidebarProps } from "./VideoSidebar";

export { useIsMobileLayout, MOBILE_LAYOUT_QUERY } from "./useIsMobileLayout";
export {
  useMyVideosControls,
  useSharedVideosControls,
  type MyVideosControls,
  type SharedVideosControls,
} from "./useVideoListControls";

export {
  EXAMPLE_VIDEO_URL,
  MY_VIDEOS_PREVIEW_COUNT,
  PATH_GROUPS,
  PATH_GROUP_KEYS,
  REF_PAGE_SIZE,
  formatCount,
  formatDuration,
  formatTime,
  levelBadge,
  youtubeThumb,
  type LevelBadge,
} from "./catalog-format";
