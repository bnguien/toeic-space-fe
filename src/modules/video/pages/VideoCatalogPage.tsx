import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { restoreSession, useCurrentUser } from "@/modules/auth";
import { useIsLearner, useLearnerSummary } from "@/modules/vocabulary";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import { VideoCatalogView } from "../components/catalog";
import { useMyVideos } from "../hooks/useMyVideos";
import { useRemoveMyVideo } from "../hooks/useRemoveMyVideo";
import { useSetVideoPublic } from "../hooks/useSetVideoPublic";
import { useVideoCatalog } from "../hooks/useVideoCatalog";
import {
  localStateChangedAt,
  markLocalStateChanged,
  serverStateChangedAt,
  useVideoLearnerState,
} from "../hooks/useVideoLearnerState";
import { useVideoPath } from "../hooks/useVideoPath";
import { useVideoProgress } from "../hooks/useVideoProgress";
import type {
  CatalogPathDto,
  VideoLearnerStateDto,
  VideoResolveDto,
  VideoTrack,
  WatchedVideoDto,
} from "../types/video.types";
import type { DuplicateShareNote, MyVideoItem } from "../types/video-catalog.types";
import {
  getVideoErrorCode,
  isAuthError,
  openVideoErrorMessage,
  type OpenVideoContext,
} from "../utils/open-video-error";
import { readSelectedGroup, resumePosition, saveSelectedGroup } from "../utils/video-progress";
import { videoLoginUrl, videoWatchUrl } from "../utils/video-paths";

/** Back from the reader with an error (resolve failed on a deep link / refresh). */
interface CatalogLocationState {
  error?: string;
  code?: string;
  videoId?: string;
}

const NO_ENGLISH_NOTICE = "Video này chưa có phụ đề tiếng Anh — thử video khác nhé.";

function requestFullscreen() {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
  } catch {
    /* ignore */
  }
}

function exitFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch {
    /* ignore */
  }
}

/** "/games/video": paste-a-link hero, curated catalog, listening path, my/shared videos (Studychill VideoGamePage). */
export function VideoCatalogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signedIn, resolving } = useIsLearner();
  const user = useCurrentUser();
  const isGuest = !signedIn && !resolving;

  const [url, setUrl] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState(
    () => (location.state as CatalogLocationState | null)?.error ?? "",
  );
  const [duplicate, setDuplicate] = useState<DuplicateShareNote | null>(null);
  const [openingCatalogId, setOpeningCatalogId] = useState("");
  const [hiddenCatalogIds, setHiddenCatalogIds] = useState<ReadonlySet<string>>(() => {
    const state = location.state as CatalogLocationState | null;
    return state?.code === "no_english" && state.videoId ? new Set([state.videoId]) : new Set();
  });
  const [catalogNotice, setCatalogNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MyVideoItem | null>(null);
  const [pathGroup, setPathGroup] = useState<VideoTrack>(readSelectedGroup);

  useEffect(() => {
    document.title = "Video song ngữ · TOEIC Space";
    void restoreSession();
  }, []);

  const catalog = useVideoCatalog();
  const path = useVideoPath(pathGroup);
  const myVideos = useMyVideos(signedIn);
  const setPublic = useSetVideoPublic();
  const removeVideo = useRemoveMyVideo();
  const { progress, inProgress } = useVideoProgress(signedIn);
  const summary = useLearnerSummary(signedIn);
  // Path track: the learner's server copy wins unless this device changed it later (guest choice before sign-in).
  const adoptTrack = useCallback((state: VideoLearnerStateDto) => {
    const serverAt = serverStateChangedAt(state);
    if (state.pathTrack && serverAt >= localStateChangedAt()) {
      setPathGroup(state.pathTrack);
      saveSelectedGroup(state.pathTrack);
    } else if (localStateChangedAt() > serverAt) {
      void videoApi.updateLearnerState({ pathTrack: readSelectedGroup() }).catch(() => {});
    }
  }, []);
  const learnerState = useVideoLearnerState(signedIn, "catalog", adoptTrack);

  const changeGroup = useCallback(
    (group: VideoTrack) => {
      setPathGroup(group);
      saveSelectedGroup(group);
      markLocalStateChanged();
      learnerState.save({ pathTrack: group });
    },
    [learnerState],
  );

  // Tab counts stay visible while another group loads: take them from any path already in the cache.
  const queryClient = useQueryClient();
  const pathTotals =
    path.data?.tracks ??
    queryClient
      .getQueriesData<CatalogPathDto>({ queryKey: [...videoQueryKeys.all, "path"] })
      .map(([, data]) => data?.tracks)
      .find(Boolean);

  const openResolved = useCallback(
    (video: VideoResolveDto) => {
      const resumeAt = resumePosition(progress[video.videoId]);
      navigate(videoWatchUrl(video.videoId), {
        state: { video, resumeAt, startAt: 0, fromCatalog: true },
      });
    },
    [navigate, progress],
  );

  const openLink = useCallback(
    async (linkOrId: string, context: OpenVideoContext) => {
      if (context !== "auto") requestFullscreen();
      setIsOpening(true);
      setError("");
      try {
        openResolved(await videoApi.resolve(linkOrId));
      } catch (err) {
        exitFullscreen();
        // Not signed in is not a wrong link: no error text, the page shows the guest state.
        if (isAuthError(err)) navigate(videoLoginUrl(linkOrId));
        else setError(openVideoErrorMessage(err, context));
      } finally {
        setIsOpening(false);
      }
    },
    [navigate, openResolved],
  );

  const submitLink = useCallback(() => {
    const link = url.trim();
    if (isGuest) {
      navigate(videoLoginUrl(link));
      return;
    }
    if (link) void openLink(link, "link");
  }, [url, isGuest, navigate, openLink]);

  // After sign-in "/games/video?v=<link or id>" opens that video.
  const autoOpened = useRef(false);
  useEffect(() => {
    const v = (searchParams.get("v") || "").trim();
    if (!v || autoOpened.current || !signedIn) return;
    autoOpened.current = true;
    const t = Number(searchParams.get("t") || 0) || 0;
    navigate(videoWatchUrl(v, t), { replace: true });
  }, [searchParams, signedIn, navigate]);

  const openCatalogVideo = useCallback(
    (video: { videoId: string }) => {
      if (isGuest) {
        navigate(videoLoginUrl(video.videoId));
        return;
      }
      if (openingCatalogId) return;
      setOpeningCatalogId(video.videoId);
      setCatalogNotice("");
      requestFullscreen();
      videoApi
        .resolve(video.videoId)
        .then(openResolved)
        .catch((err: unknown) => {
          exitFullscreen();
          if (isAuthError(err)) {
            navigate(videoLoginUrl(video.videoId));
            return;
          }
          if (getVideoErrorCode(err) === "no_english") {
            setHiddenCatalogIds((prev) => new Set(prev).add(video.videoId));
            setCatalogNotice(NO_ENGLISH_NOTICE);
            return;
          }
          setCatalogNotice(openVideoErrorMessage(err, "catalog"));
        })
        .finally(() => setOpeningCatalogId(""));
    },
    [isGuest, openingCatalogId, navigate, openResolved],
  );

  const openCard = useCallback((videoId: string) => void openLink(videoId, "catalog"), [openLink]);

  const togglePublic = useCallback(
    (video: MyVideoItem) => {
      setPublic.mutate(
        {
          watchedId: video.id,
          isPublic: !video.isPublic,
          displayName: user?.fullName || undefined,
          avatarUrl: user?.avatarUrl || undefined,
        },
        {
          onSuccess: (result) => {
            // Sharing a video someone already shares is allowed; just say so.
            if (result.duplicate)
              setDuplicate({ name: result.duplicate.firstBy, count: result.duplicate.count });
          },
        },
      );
    },
    [setPublic, user],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    removeVideo.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
  }, [deleteTarget, removeVideo]);

  const libraryCount = summary.data?.libraryWordCount ?? 0;
  const reviewedPercent = useMemo(() => {
    const data = summary.data;
    if (!data || data.libraryWordCount <= 0) return null;
    return Math.min(
      100,
      Math.round(((data.learning + data.mastered) / data.libraryWordCount) * 100),
    );
  }, [summary.data]);

  const mine: WatchedVideoDto[] = myVideos.data?.mine ?? [];
  const shared: WatchedVideoDto[] = myVideos.data?.shared ?? [];

  return (
    <VideoCatalogView
      isGuest={isGuest}
      link={{
        url,
        onUrlChange: setUrl,
        onSubmit: submitLink,
        isOpening,
        error: error || undefined,
        duplicate,
        onDismissDuplicate: () => setDuplicate(null),
      }}
      rows={{
        topics: catalog.data ? catalog.data.topics : catalog.isError ? [] : null,
        onLoadMoreTopic: (slug, offset, limit) => videoApi.getCatalogTopic(slug, offset, limit),
        onOpen: openCatalogVideo,
        openingId: openingCatalogId,
        hiddenIds: hiddenCatalogIds,
        notice: catalogNotice || undefined,
        onDismissNotice: () => setCatalogNotice(""),
        progress,
        inProgress,
        group: pathGroup,
        onChangeGroup: changeGroup,
        pathData: path.data ?? null,
        pathError: path.isError ? "Chưa tải được lộ trình. Thử lại sau ít phút nhé." : undefined,
        pathTotals,
      }}
      myVideos={{
        items: mine,
        onOpen: openCard,
        onTogglePublic: togglePublic,
        onRequestDelete: setDeleteTarget,
      }}
      sharedVideos={{ items: shared, onOpen: openCard }}
      deleteDialog={{
        video: deleteTarget,
        isDeleting: removeVideo.isPending,
        onCancel: () => setDeleteTarget(null),
        onConfirm: confirmDelete,
      }}
      sidebar={{
        vocabCount: signedIn && libraryCount > 0 ? libraryCount : null,
        reviewedPercent,
      }}
    />
  );
}
