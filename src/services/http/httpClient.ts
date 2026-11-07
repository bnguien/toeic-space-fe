import axios from "axios";

import { env } from "@/config/env";
import { repairVietnamesePayload } from "@/shared/utils/text";

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
  // A path that no API serves falls through to the SPA's index.html with status 200.
  // Strict parsing turns that HTML into an error instead of handing it to the UI as data.
  responseType: "json",
  transitional: {
    silentJSONParsing: false,
    forcedJSONParsing: true,
    clarifyTimeoutError: false,
  },
});

// Some legacy records have UTF-8 bytes decoded as Windows-1252 before reaching
// the client. Repair every JSON response centrally so each feature sees the same
// correctly rendered Vietnamese text.
httpClient.interceptors.response.use((response) => {
  response.data = repairVietnamesePayload(response.data);
  return response;
});
