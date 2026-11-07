import { useCallback, useEffect, useRef, useState } from "react";

import { videoApi } from "../api/video.api";
import type { Cue, VideoSubtitlesDto } from "../types/video.types";
import {
  isAbortError,
  isRetryableSubtitleError,
  subtitleErrorMessage,
} from "../utils/reader-errors";
import { pollUntilReady } from "../utils/subs-polling";
import { cleanCues } from "../utils/subtitle-reading";

/**
 * Subtitles of the primary + secondary language. Not cached yet → the server answers 202 and prepares them in the
 * background; we poll with backoff (subs-polling) and cancel when the reader closes. Cues are cleaned once on arrival.
 */
export function useReaderSubtitles(videoId: string, primaryLang: string, secondaryLang: string) {
  const [cues, setCues] = useState<Record<string, Cue[]>>({});
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  // Temporary errors (YouTube 429 → server 503) can be retried; "no subtitles" cannot.
  const [canRetry, setCanRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    const requested = requestedRef.current;
    const missingLangs = [primaryLang, secondaryLang].filter((l) => l && !requested.has(l));
    if (!missingLangs.length) return undefined;
    missingLangs.forEach((l) => requested.add(l));
    const controller = new AbortController();
    let settled = false;
    pollUntilReady(() => videoApi.getSubs(videoId, missingLangs, controller.signal), {
      signal: controller.signal,
      onPending: () => setPreparing(true),
    })
      .then((response) => {
        settled = true;
        setPreparing(false);
        const res = response as VideoSubtitlesDto;
        const cleaned: Record<string, Cue[]> = {};
        Object.entries(res.cues || {}).forEach(([lang, trackCues]) => {
          cleaned[lang] = cleanCues(trackCues);
        });
        setCues((prev) => ({ ...prev, ...cleaned }));
        if (res.levels && Object.keys(res.levels).length) {
          setLevels((prev) => ({ ...prev, ...res.levels }));
        }
        const emptyLangs = missingLangs.filter((l) => !(cleaned[l] || []).length);
        setError(emptyLangs.length ? `Không có phụ đề cho: ${emptyLangs.join(", ")}` : "");
        setCanRetry(false);
      })
      .catch((e: unknown) => {
        settled = true;
        if (isAbortError(e)) return;
        setPreparing(false);
        // Forget "requested" so a language change / retry asks again.
        missingLangs.forEach((l) => requested.delete(l));
        setError(subtitleErrorMessage(e));
        setCanRetry(isRetryableSubtitleError(e));
      });
    return () => {
      // Cancel the pending round (clears timers); forget "requested" NOW so the next effect run asks again.
      if (!settled) missingLangs.forEach((l) => requested.delete(l));
      controller.abort();
    };
  }, [videoId, primaryLang, secondaryLang, retryCount]);

  const retry = useCallback(() => {
    setError("");
    setRetryCount((n) => n + 1);
  }, []);

  return { cues, levels, error, canRetry, preparing, retry };
}
