/**
 * Opens the site map ("Bản đồ") from anywhere: the navbar item, the practice space toolbar, the home
 * page. The host mounted in the root layout listens for this window event, so callers need no
 * import from the landing module.
 */
export const SITE_MAP_EVENT = "toeicspace:site-map";

export function openSiteMap() {
  window.dispatchEvent(new Event(SITE_MAP_EVENT));
}
