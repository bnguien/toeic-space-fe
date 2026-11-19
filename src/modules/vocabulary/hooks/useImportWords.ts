import { useCallback, useState } from "react";

import { vocabularyApi } from "../api/vocabulary.api";
import type { ImportItem, SavedWordDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export const IMPORT_BATCH_SIZE = 50;

export interface ImportTarget {
  folderId: string | null;
  createFoldersFromCategories: boolean;
}

export interface FailedImportRow {
  item: ImportItem;
  code: string;
}

export interface ImportRunState {
  status: "idle" | "running" | "done";
  done: number;
  total: number;
  created: number;
  updated: number;
  saved: SavedWordDto[];
  failed: FailedImportRow[];
}

const IDLE: ImportRunState = {
  status: "idle",
  done: 0,
  total: 0,
  created: 0,
  updated: 0,
  saved: [],
  failed: [],
};

/**
 * Imports items in sequential batches of 50, tracking progress and per-row failures.
 * A failed request marks its whole batch as failed so it can be retried.
 */
export function useImportWords() {
  const invalidate = useInvalidateLibrary();
  const [state, setState] = useState<ImportRunState>(IDLE);

  const run = useCallback(
    async (items: ImportItem[], target: ImportTarget) => {
      if (items.length === 0) return;
      setState({ ...IDLE, status: "running", total: items.length });

      for (let start = 0; start < items.length; start += IMPORT_BATCH_SIZE) {
        const batch = items.slice(start, start + IMPORT_BATCH_SIZE);
        try {
          const result = await vocabularyApi.importWords({
            items: batch,
            folderId: target.createFoldersFromCategories ? null : target.folderId,
            createFoldersFromCategories: target.createFoldersFromCategories,
          });
          const failed = result.failed.map((row) => ({
            item: batch[row.index] ?? { headword: row.headword },
            code: row.code,
          }));
          setState((current) => ({
            ...current,
            done: current.done + batch.length,
            created: current.created + result.created,
            updated: current.updated + result.updated,
            saved: [...current.saved, ...result.items],
            failed: [...current.failed, ...failed],
          }));
        } catch (error) {
          const code = getVocabularyErrorMessage(error);
          setState((current) => ({
            ...current,
            done: current.done + batch.length,
            failed: [...current.failed, ...batch.map((item) => ({ item, code }))],
          }));
        }
      }

      setState((current) => ({ ...current, status: "done" }));
      void invalidate();
    },
    [invalidate],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, run, reset };
}
