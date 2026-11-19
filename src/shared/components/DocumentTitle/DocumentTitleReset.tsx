import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** The tab title from `index.html`, used whenever the current page does not set its own. */
export const DEFAULT_DOCUMENT_TITLE = "TOEICSpace — Nền Tảng Luyện Thi TOEIC";

/**
 * Puts the site title back on every navigation. Rendered before the routed page so
 * page effects (e.g. the news reader's "Đọc báo song ngữ") always win on their own
 * screen, while pages without a title fall back to the site title instead of keeping
 * the previous page's title in the browser tab.
 */
export function DocumentTitleReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = DEFAULT_DOCUMENT_TITLE;
  }, [pathname]);

  return null;
}
