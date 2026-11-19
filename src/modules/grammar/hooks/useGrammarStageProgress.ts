import { useEffect } from "react";

import { useSessionStatus } from "@/modules/auth";

import { loadProgress, useGrammarProgress } from "../store/grammar-progress.store";
import { GRAMMAR_STAGES } from "../utils/grammar-curriculum";
import { pad2 } from "../utils/grammar-text";

export interface GrammarStageProgress {
  completed: number;
  total: number;
}

/**
 * Finished topics per stage for other pages (e.g. the home page stage cards). Loads the same
 * progress as the grammar page (signed in: the API; guest: this browser); null until it is loaded.
 */
export function useGrammarStageProgress(): Record<string, GrammarStageProgress> | null {
  const sessionStatus = useSessionStatus();
  const resolved = sessionStatus === "authenticated" || sessionStatus === "anonymous";
  const signedIn = sessionStatus === "authenticated";
  const progress = useGrammarProgress();

  useEffect(() => {
    if (resolved) void loadProgress({ signedIn });
  }, [resolved, signedIn]);

  if (!progress.loaded) return null;
  return Object.fromEntries(
    GRAMMAR_STAGES.map((stage) => [
      stage.id,
      {
        completed: stage.topics.filter((topic) => progress.lessons[pad2(topic.number)]?.completed)
          .length,
        total: stage.topics.length,
      },
    ]),
  );
}
