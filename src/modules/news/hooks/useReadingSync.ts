import { useCallback, useEffect, useRef } from "react";

import { newsApi } from "../api/news.api";
import type { UpdateReadingStateRequest } from "../types/news.types";

const FLUSH_DELAY_MS = 1500;

/**
 * Batches the signed-in learner's reading changes (reading clock, known words, notes, dictation flags, settings)
 * into `PUT articles/{slug}/state`: patches are merged and sent 1.5 s after the last change, immediately with
 * `now`, and on unmount / page hide. Guests do nothing (their state stays in this browser).
 */
export function useReadingSync(slug: string, enabled: boolean) {
  const pending = useRef<UpdateReadingStateRequest>({});
  const timer = useRef(0);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (!enabled || Object.keys(patch).length === 0) return;
    newsApi.updateState(slug, patch).catch(() => {
      // Keep what failed for the next attempt; newer values already queued win.
      pending.current = {
        ...patch,
        ...pending.current,
        dictation: { ...patch.dictation, ...pending.current.dictation },
      };
    });
  }, [slug, enabled]);

  const save = useCallback(
    (patch: UpdateReadingStateRequest, now = false) => {
      if (!enabled) return;
      const current = pending.current;
      pending.current = {
        ...current,
        ...patch,
        dictation:
          patch.dictation || current.dictation
            ? { ...current.dictation, ...patch.dictation }
            : undefined,
        resetDictation: current.resetDictation || patch.resetDictation || undefined,
      };
      if (patch.resetDictation) pending.current.dictation = patch.dictation;
      if (pending.current.dictation === undefined) delete pending.current.dictation;
      if (pending.current.resetDictation === undefined) delete pending.current.resetDictation;
      window.clearTimeout(timer.current);
      if (now) flush();
      else timer.current = window.setTimeout(flush, FLUSH_DELAY_MS);
    },
    [enabled, flush],
  );

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  return { save, flush };
}
