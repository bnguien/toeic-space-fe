import { useCurrentUser, useSessionStatus } from "@/modules/auth";

/** Who is reading: personal requests only run once the session is known. */
export function useNewsViewer() {
  const status = useSessionStatus();
  const user = useCurrentUser();
  const signedIn = status === "authenticated";
  return {
    signedIn,
    resolving: status === "idle" || status === "restoring",
    /** Query-key segment so lists refetch when the viewer changes. */
    viewerKey: signedIn && user ? `u:${user.id}` : "guest",
  };
}
