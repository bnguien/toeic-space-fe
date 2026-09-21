import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { httpClient, installAuthInterceptors } from "@/services/http";

import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import type { AuthUser, LoginPayload } from "../types/auth.types";

const REFRESH_LOCK = "toeicspace-auth-refresh";
const SESSION_CHANNEL = "toeicspace-auth";
const LOGOUT_MESSAGE = "logout";

let installed = false;
let queryClient: QueryClient | null = null;
let channel: BroadcastChannel | null = null;
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Every refresh rotates the shared refresh cookie. Two tabs refreshing with the same cookie
 * would look like a stolen token and end the session, so refreshes run one at a time across tabs.
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task();
}

function endSession() {
  useAuthStore.getState().clearSession();
  // Drop cached questions and answer keys so nothing outlives the session.
  queryClient?.clear();
}

/**
 * Resolves with a new access token, or null when the server says the session is over.
 * Network and server errors are rethrown so a temporary outage does not sign the user out.
 */
export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= withRefreshLock(async () => {
    try {
      const response = await authApi.refresh();
      useAuthStore.getState().setSession(response);
      return response.accessToken;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) {
        return null;
      }
      throw error;
    }
  }).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Restores the session from the refresh cookie after a page load.
 */
export async function restoreSession() {
  if (useAuthStore.getState().status !== "idle") {
    return;
  }

  useAuthStore.getState().setRestoring();

  try {
    if (!(await refreshSession())) {
      endSession();
    }
  } catch {
    endSession();
  }
}

export async function signIn(payload: LoginPayload): Promise<AuthUser> {
  const response = await withRefreshLock(() => authApi.login(payload));

  // Never show data cached for a previous account.
  queryClient?.clear();
  useAuthStore.getState().setSession(response);

  return response.user;
}

export async function signOut() {
  try {
    await withRefreshLock(() => authApi.logout());
  } catch {
    // The local session is cleared even if the server cannot be reached.
  }

  endSession();
  channel?.postMessage(LOGOUT_MESSAGE);
}

/**
 * Connects the shared HTTP client to the session. Call once at startup.
 */
export function setupAuthSession(client: QueryClient) {
  queryClient = client;

  if (installed) {
    return;
  }
  installed = true;

  installAuthInterceptors(httpClient, {
    getAccessToken: () => useAuthStore.getState().accessToken,
    refreshAccessToken: refreshSession,
    onSessionExpired: endSession,
  });

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === LOGOUT_MESSAGE) {
        endSession();
      }
    };
  }
}
