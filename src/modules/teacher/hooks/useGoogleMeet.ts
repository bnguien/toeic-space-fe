import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { googleMeetApi } from "../api/google-meet.api";

export const googleMeetKeys = {
  all: ["teacher", "google-meet"] as const,
  status: () => [...googleMeetKeys.all, "status"] as const,
  sessionStatus: (id: string) => ["class-session-meet", id] as const,
  sessionLink: (id: string) => ["class-session-meet-link", id] as const,
};

export function useGoogleMeetStatus() {
  return useQuery({
    queryKey: googleMeetKeys.status(),
    queryFn: ({ signal }) => googleMeetApi.status(signal),
    staleTime: 30_000,
    retry: false,
  });
}

export function useConnectGoogleMeet() {
  return useMutation({
    mutationFn: () => googleMeetApi.connect(),
  });
}

export function useDisconnectGoogleMeet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => googleMeetApi.disconnect(),
    onSuccess: () => {
      // Disconnecting revokes every provisioning row, so cached session statuses are stale.
      void client.invalidateQueries({ queryKey: googleMeetKeys.status() });
      void client.invalidateQueries({ queryKey: ["class-session-meet"] });
    },
  });
}
