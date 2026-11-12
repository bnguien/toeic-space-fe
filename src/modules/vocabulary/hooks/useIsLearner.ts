import { useSessionStatus } from "@/modules/auth";

/** Session state for public pages: personal queries run only once signed in. */
export function useIsLearner() {
  const status = useSessionStatus();
  return {
    signedIn: status === "authenticated",
    resolving: status === "idle" || status === "restoring",
  };
}
