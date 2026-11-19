import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";

import { newsApi } from "../api/news.api";
import { newsQueryKeys } from "../api/news.query-keys";
import { ArticleReader } from "../components/ArticleReader";
import { useNewsArticle } from "../hooks/useNewsArticle";
import { useNewsViewer } from "../hooks/useNewsViewer";
import type { NewsReaderSettingsDto, NewsReadingStateDto } from "../types/news.types";
import {
  clearGuestReadings,
  collectGuestReadings,
  readStored,
  STORAGE_KEYS,
  writeStored,
} from "../utils/news-storage";
import styles from "./NewsArticlePage.module.css";

/** Server settings newer than this browser's → written to local storage before the reader mounts. */
function applyServerSettings(state: NewsReadingStateDto | null): boolean {
  const localTime = readStored<number>(STORAGE_KEYS.settingsUpdatedAt, 0);
  const serverTime = state?.settingsUpdatedAt ? Date.parse(state.settingsUpdatedAt) : 0;
  if (!state?.settings || serverTime < localTime) return localTime > 0 && localTime > serverTime;
  const s: NewsReaderSettingsDto = state.settings;
  const pairs: Array<[string, unknown]> = [
    [STORAGE_KEYS.palette, s.palette],
    [STORAGE_KEYS.mode, s.mode],
    [STORAGE_KEYS.layout, s.layout],
    [STORAGE_KEYS.fontSize, s.fontSize],
    [STORAGE_KEYS.dark, s.dark],
    [STORAGE_KEYS.panelWidth, s.panelWidth],
    [STORAGE_KEYS.split, s.split],
    [STORAGE_KEYS.hackMode, s.hackMode],
    [STORAGE_KEYS.voice, s.voice],
  ];
  pairs.forEach(([key, value]) => {
    if (value != null) writeStored(key, value);
  });
  if (s.showSuggested != null || s.showLookedUp != null || s.showMeaning != null) {
    writeStored(STORAGE_KEYS.view, {
      suggested: s.showSuggested ?? true,
      lookedUp: s.showLookedUp ?? true,
      meaning: s.showMeaning ?? true,
    });
  }
  writeStored(STORAGE_KEYS.settingsUpdatedAt, serverTime);
  return false;
}

/**
 * `/games/news/:slug` — full-screen reader (no site navbar). A signed-in learner's guest state is merged first,
 * then the article is opened on the server so the reader starts from the learner's own state and settings.
 */
export function NewsArticlePage() {
  const { slug = "" } = useParams();
  const article = useNewsArticle(slug);
  const { signedIn, resolving, viewerKey } = useNewsViewer();
  const reading = useQuery({
    queryKey: [...newsQueryKeys.article(slug), "reading", viewerKey],
    queryFn: async () => {
      const guest = collectGuestReadings();
      if (guest.length) {
        await newsApi
          .mergeGuestReadings(guest)
          .then(() => clearGuestReadings(guest.map((x) => x.slug)))
          .catch(() => undefined);
      }
      return newsApi.openArticle(slug);
    },
    enabled: signedIn && !!slug,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const waitingForReading = signedIn && reading.isPending;
  if (!article.data || resolving || waitingForReading) {
    const notFound = isAxiosError(article.error) && article.error.response?.status === 404;
    const message = article.isError
      ? notFound
        ? "Không tìm thấy bài báo này."
        : "Chưa tải được bài báo, thử tải lại trang nhé."
      : "Đang mở bài báo…";
    return (
      <div className={styles.loading}>
        <p>{message}</p>
        {article.isError && <Link to="/games/news">Về danh sách bài báo</Link>}
      </div>
    );
  }

  const state = signedIn ? (reading.data ?? null) : null;
  const pushLocalSettings = signedIn ? applyServerSettings(state) : false;
  return (
    <ArticleReader
      key={`${article.data.slug}:${viewerKey}`}
      article={article.data}
      signedIn={signedIn}
      initialState={state}
      pushLocalSettings={pushLocalSettings}
    />
  );
}
