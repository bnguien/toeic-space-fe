import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { SITE_MAP_EVENT } from "@/shared/utils/site-map-events";

import { SiteMapPanel } from "./SiteMapPanel";

/**
 * Mounted once in the root layout (pages without the navbar too). Opens the site map on
 * `openSiteMap()`, closes it when the route changes and gives focus back to the opener.
 */
export function SiteMapHost() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const [openedAt, setOpenedAt] = useState(location.key);

  useEffect(() => {
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setOpenedAt(location.key);
      setOpen(true);
    };
    window.addEventListener(SITE_MAP_EVENT, show);
    return () => window.removeEventListener(SITE_MAP_EVENT, show);
  }, [location.key]);

  const close = useCallback(() => {
    setOpen(false);
    const el = opener.current;
    if (el?.isConnected) window.setTimeout(() => el.focus({ preventScroll: true }), 0);
  }, []);

  // Navigating away (a link in the map, back button) closes it.
  if (open && location.key !== openedAt) {
    setOpen(false);
  }

  return open ? <SiteMapPanel onClose={close} /> : null;
}
