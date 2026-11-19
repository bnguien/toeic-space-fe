import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { newsApi } from "../api/news.api";
import { newsQueryKeys } from "../api/news.query-keys";
import { clearGuestReadings, collectGuestReadings } from "../utils/news-storage";
import { useNewsViewer } from "./useNewsViewer";

/**
 * After sign-in, merges the reading state a guest kept in this browser into the account (larger reading clock and
 * completion win, newer known words / notes win, dictation progress only moves forward), then removes it here.
 */
export function useGuestReadingMerge() {
  const { signedIn, viewerKey } = useNewsViewer();
  const queryClient = useQueryClient();
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!signedIn || mergedFor.current === viewerKey) return;
    mergedFor.current = viewerKey;
    const items = collectGuestReadings();
    if (!items.length) return;
    newsApi
      .mergeGuestReadings(items)
      .then(() => {
        clearGuestReadings(items.map((x) => x.slug));
        void queryClient.invalidateQueries({ queryKey: newsQueryKeys.lists() });
      })
      .catch(() => {
        mergedFor.current = null;
      });
  }, [signedIn, viewerKey, queryClient]);
}
