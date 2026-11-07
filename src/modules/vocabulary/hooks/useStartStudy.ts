import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import type { StudyMode, WordsSessionState } from "../types/vocabulary.types";
import { REVIEW_MODE } from "../utils/study-session";
import { useVocabularyPreferences } from "./useVocabularyPreferences";

/** What to study: a whole source (all selected) or an explicit word list. */
export type StudySelection =
  | { setId: string }
  | { folderId: string }
  | { library: true }
  | { mistakes: true }
  | { wordIds: string[] };

const toSearch = (selection: StudySelection): string => {
  if ("setId" in selection) return `set=${encodeURIComponent(selection.setId)}`;
  if ("folderId" in selection) return `folder=${encodeURIComponent(selection.folderId)}`;
  if ("library" in selection) return "library=1";
  if ("mistakes" in selection) return "mistakes=1";
  return "words=1";
};

/** Starts a study session for a selection and remembers the chosen mode as the default. */
export function useStartStudy() {
  const navigate = useNavigate();
  const { update } = useVocabularyPreferences();

  return useCallback(
    (mode: StudyMode, selection: StudySelection) => {
      update({ defaultMode: REVIEW_MODE[mode] });
      const state: WordsSessionState | undefined =
        "wordIds" in selection ? { wordIds: selection.wordIds } : undefined;
      navigate(`/vocabulary/learn/${mode}?${toSearch(selection)}`, { state });
    },
    [navigate, update],
  );
}
