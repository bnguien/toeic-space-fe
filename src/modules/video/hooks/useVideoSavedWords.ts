import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  importVocabularyWords,
  useInvalidateLibrary,
  useRemoveSavedWord,
  useUpdateSavedWord,
  type SavedWordDto,
} from "@/modules/vocabulary";

import { videoApi } from "../api/video.api";
import { videoQueryKeys } from "../api/video.query-keys";
import type { VideoSavedWordDto, VideoSavedWordsDto } from "../types/video.types";

const IMPORT_BATCH = 50;
const STALE_MS = 60 * 1000;

/** One word to save from the reader (card or lesson summary). */
export interface VideoWordToSave {
  word: string;
  meaning: string;
  phonetic: string;
  partOfSpeech: string;
  example: string;
  exampleVi: string;
}

/** Error whose message is meant for the learner (shown as-is by the save form). */
export class VideoSaveError extends Error {
  readonly userFacing = true;
}

export const normalizeHeadword = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const toVideoSavedWord = (saved: SavedWordDto): VideoSavedWordDto => ({
  savedWordId: saved.id,
  wordId: saved.word.id,
  headword: saved.word.headword,
  normalizedHeadword: normalizeHeadword(saved.word.headword),
  folderId: saved.folderId,
  note: saved.note,
  meaningVi: saved.word.meaningVi,
  phonetic: saved.word.phonetic,
  partOfSpeech: saved.word.partOfSpeech,
  isCustom: saved.isCustom,
  savedAt: saved.savedAt,
});

const optional = (value: string): string | undefined => value.trim() || undefined;

/**
 * Library words of the signed-in learner keyed by normalized headword (saved dots, "Đã lưu" on the card, summary
 * marks) + save / note / remove. Saving goes through the PBL-75 import: an official word with the same headword is
 * saved as is, anything else becomes (or fills) the learner's custom word.
 */
export function useVideoSavedWords(enabled: boolean) {
  const queryClient = useQueryClient();
  const invalidateLibrary = useInvalidateLibrary();
  const update = useUpdateSavedWord();
  const remove = useRemoveSavedWord();
  const [importing, setImporting] = useState(0);

  const query = useQuery({
    queryKey: videoQueryKeys.savedWords(),
    queryFn: ({ signal }) => videoApi.getSavedWords(signal),
    enabled,
    staleTime: STALE_MS,
    retry: false,
  });

  const savedWords = useMemo(() => {
    const map: Record<string, VideoSavedWordDto> = {};
    if (!enabled) return map;
    // Newest first from the server: keep the first entry of a headword.
    for (const item of query.data?.items ?? []) {
      const key = item.normalizedHeadword || normalizeHeadword(item.headword);
      if (!map[key]) map[key] = item;
    }
    return map;
  }, [enabled, query.data]);

  const patchCache = useCallback(
    (change: (items: VideoSavedWordDto[]) => VideoSavedWordDto[]) => {
      queryClient.setQueryData<VideoSavedWordsDto>(videoQueryKeys.savedWords(), (prev) => {
        const items = change(prev?.items ?? []);
        const delta = items.length - (prev?.items.length ?? 0);
        return { total: Math.max(0, (prev?.total ?? 0) + delta), items };
      });
    },
    [queryClient],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: videoQueryKeys.savedWords() });
    void invalidateLibrary();
  }, [invalidateLibrary, queryClient]);

  const saveWords = useCallback(
    async (items: VideoWordToSave[], folderId: string | null): Promise<VideoSavedWordDto[]> => {
      const rows = items.filter((item) => item.word.trim());
      if (!rows.length) return [];
      setImporting((n) => n + 1);
      const saved: VideoSavedWordDto[] = [];
      try {
        for (let i = 0; i < rows.length; i += IMPORT_BATCH) {
          const result = await importVocabularyWords({
            items: rows.slice(i, i + IMPORT_BATCH).map((item) => ({
              headword: item.word.trim(),
              meaningVi: optional(item.meaning),
              phonetic: optional(item.phonetic),
              partOfSpeech: optional(item.partOfSpeech),
              example: optional(item.example),
              exampleVi: optional(item.exampleVi),
            })),
            folderId,
            createFoldersFromCategories: false,
          });
          saved.push(...result.items.map(toVideoSavedWord));
        }
      } finally {
        setImporting((n) => n - 1);
      }
      if (saved.length) {
        const keys = new Set(saved.map((item) => item.normalizedHeadword));
        patchCache((prev) => [...saved, ...prev.filter((x) => !keys.has(x.normalizedHeadword))]);
      }
      refresh();
      if (!saved.length) throw new VideoSaveError("Chưa lưu được, thử lại giúp mình nhé.");
      return saved;
    },
    [patchCache, refresh],
  );

  const saveNote = useCallback(
    async (savedWordId: string, note: string): Promise<void> => {
      await update.mutateAsync({ savedWordId, body: { note: note.trim() ? note : null } });
      patchCache((prev) =>
        prev.map((x) =>
          x.savedWordId === savedWordId ? { ...x, note: note.trim() ? note : null } : x,
        ),
      );
      refresh();
    },
    [patchCache, refresh, update],
  );

  const removeWord = useCallback(
    async (savedWordId: string): Promise<void> => {
      await remove.mutateAsync(savedWordId);
      patchCache((prev) => prev.filter((x) => x.savedWordId !== savedWordId));
      refresh();
    },
    [patchCache, refresh, remove],
  );

  return {
    savedWords,
    saveWords,
    saveNote,
    removeWord,
    saving: importing > 0 || update.isPending || remove.isPending,
  };
}
