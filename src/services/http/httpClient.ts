import axios from "axios";

import { env } from "@/config/env";

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
