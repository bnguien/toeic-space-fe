import { useEffect, useSyncExternalStore } from "react";

import { useCurrentUser, useSessionStatus } from "@/modules/auth";

import { getLearnerSnapshot, setLearnerAccount, subscribeLearner } from "../utils/learner-store";

/**
 * Keeps the learner state in step with the session: signing in merges the local copy into the server copy
 * (and loads the server copy), signing out stops pushing. Returns the live snapshot.
 */
export function useDictationLearnerSync() {
  const status = useSessionStatus();
  const user = useCurrentUser();
  const userId = status === "authenticated" ? (user?.id ?? null) : null;
  const resolving = status === "idle" || status === "restoring";

  useEffect(() => {
    if (!resolving) void setLearnerAccount(userId);
  }, [resolving, userId]);

  return useSyncExternalStore(subscribeLearner, getLearnerSnapshot, getLearnerSnapshot);
}
