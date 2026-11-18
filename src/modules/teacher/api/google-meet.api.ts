import { httpClient } from "@/services/http";

export interface GoogleMeetConnectionStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

export interface GoogleMeetConnectResponse {
  authorizationUrl: string;
}

const base = "/classroom/api/v1/teachers/me/google-meet";

export const googleMeetApi = {
  status: async (signal?: AbortSignal) =>
    (await httpClient.get<GoogleMeetConnectionStatus>(`${base}/status`, { signal })).data,

  connect: async () => (await httpClient.post<GoogleMeetConnectResponse>(`${base}/connect`)).data,

  disconnect: async () => {
    await httpClient.delete(base);
  },
};
