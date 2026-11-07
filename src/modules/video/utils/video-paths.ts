export const VIDEO_CATALOG_PATH = "/games/video";
export const VIDEO_WATCH_PATH = "/games/video/watch";

/** Reader URL; `t` = start second (deep link), kept like Studychill's `?v=&t=`. */
export const videoWatchUrl = (videoId: string, startAt = 0): string => {
  const params = new URLSearchParams({ v: videoId });
  if (startAt > 0) params.set("t", String(Math.floor(startAt)));
  return `${VIDEO_WATCH_PATH}?${params.toString()}`;
};

/** `/login` returning to the video page (and opening `videoOrLink` after sign-in when given). */
export const videoLoginUrl = (videoOrLink?: string): string => {
  const back = videoOrLink
    ? `${VIDEO_CATALOG_PATH}?v=${encodeURIComponent(videoOrLink)}`
    : VIDEO_CATALOG_PATH;
  return `/login?next=${encodeURIComponent(back)}`;
};
