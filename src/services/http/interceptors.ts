import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

/**
 * Supplied by the auth module. The HTTP layer never stores tokens itself.
 */
export interface AuthSessionHandlers {
  getAccessToken: () => string | null;
  /** Resolves with a new access token, or null when the session has ended. */
  refreshAccessToken: () => Promise<string | null>;
  onSessionExpired: () => void;
}

type RetriableRequestConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i;

/**
 * The access token is only sent to our own API: relative URLs (same origin) or the configured base URL.
 */
function isOwnApiRequest(client: AxiosInstance, config: InternalAxiosRequestConfig) {
  const url = config.url ?? "";
  if (!ABSOLUTE_URL.test(url) && !url.startsWith("//")) {
    return true;
  }

  const baseUrl = client.defaults.baseURL;
  return Boolean(baseUrl) && url.startsWith(`${baseUrl}/`);
}

export function installAuthInterceptors(client: AxiosInstance, handlers: AuthSessionHandlers) {
  const requestInterceptor = client.interceptors.request.use((config) => {
    const token = handlers.getAccessToken();
    if (token && isOwnApiRequest(client, config)) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  const responseInterceptor = client.interceptors.response.use(
    undefined,
    async (error: AxiosError) => {
      const config = error.config as RetriableRequestConfig | undefined;

      if (error.response?.status !== 401 || !config || config._authRetried) {
        throw error;
      }

      // Retry once with a fresh token; a second 401 means the session is really over.
      config._authRetried = true;
      const token = await handlers.refreshAccessToken();

      if (!token) {
        handlers.onSessionExpired();
        throw error;
      }

      config.headers.set("Authorization", `Bearer ${token}`);
      return client(config);
    },
  );

  return () => {
    client.interceptors.request.eject(requestInterceptor);
    client.interceptors.response.eject(responseInterceptor);
  };
}
