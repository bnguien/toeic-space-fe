import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { httpClient, installAuthInterceptors } from "@/services/http";
import { normalizeAvatarUrl, profileApi } from "@/modules/profile";

import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import type { AuthResponse, AuthUser, LoginPayload } from "../types/auth.types";

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
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (!navigator.locks) {
    return await task();
  }

  return await navigator.locks.request(REFRESH_LOCK, task);
}

function endSession() {
  useAuthStore.getState().clearSession();
  // Drop cached questions and answer keys so nothing outlives the session.
  queryClient?.clear();
}

/**
 * Resolves avatar with fallback to cached value in localStorage.
 */
function resolveUserWithAvatar(user: AuthUser): AuthUser {
  let avatarUrl = user.avatarUrl ? normalizeAvatarUrl(user.avatarUrl) : null;
  if (user.id) {
    try {
      const cached = localStorage.getItem(`ts_avatar_${user.id}`);
      if (cached) {
        // Prioritize cached avatar if it contains a cache-busting timestamp or if server has no timestamp
        if (!avatarUrl || cached.includes("?v=") || !avatarUrl.includes("?v=")) {
          avatarUrl = cached;
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }
  return {
    ...user,
    avatarUrl,
  };
}

/**
 * Fetches latest profile from user service (/api/v1/users/me) and updates store & cache.
 */
export async function syncUserProfile(userId?: string) {
  try {
    const profile = await profileApi.getProfile();
    if (profile) {
      const normalizedAvatar = normalizeAvatarUrl(profile.avatarUrl);
      const targetId = userId ?? profile.id;
      if (normalizedAvatar && targetId) {
        try {
          localStorage.setItem(`ts_avatar_${targetId}`, normalizedAvatar);
        } catch {
          // ignore
        }
      }

      const userPatch: Partial<AuthUser> = {
        fullName: profile.fullName,
        avatarUrl: normalizedAvatar,
      };

      useAuthStore.getState().updateUser(userPatch);
      broadcastUserUpdate(userPatch);
    }
  } catch {
    // Silently ignore if profile service is unreachable or unauthenticated
  }
}

/**
 * Broadcasts an updated user state (e.g. name, avatarUrl) to all open browser tabs.
 */
export function broadcastUserUpdate(patch: Partial<AuthUser>) {
  if (patch.avatarUrl) {
    const currentId = useAuthStore.getState().user?.id;
    if (currentId) {
      try {
        localStorage.setItem(`ts_avatar_${currentId}`, patch.avatarUrl);
      } catch {
        // ignore
      }
    }
  }
  try {
    channel?.postMessage({ type: "user_updated", patch });
  } catch {
    // Ignore channel broadcast error
  }
}

/**
 * Resolves with a new access token, or null when the server says the session is over.
 * Network and server errors are rethrown so a temporary outage does not sign the user out.
 */
export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= withRefreshLock(async () => {
    try {
      const response = await authApi.refresh();
      const userWithAvatar = resolveUserWithAvatar(response.user);
      const authResponse = { ...response, user: userWithAvatar };

      useAuthStore.getState().setSession(authResponse);

      // Background profile sync to ensure latest avatar
      void syncUserProfile(response.user.id);

      // Broadcast fresh session across open tabs to keep them synchronized
      try {
        channel?.postMessage({ type: "sync", response: authResponse });
      } catch {
        // Ignore channel broadcast error
      }

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
 * Restores the session from the refresh cookie after a page load or tab switch.
 * @param force If true, attempts restore even if current status is already 'anonymous'
 */
export async function restoreSession(force = false) {
  const currentStatus = useAuthStore.getState().status;
  if (!force && currentStatus !== "idle") {
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

  const userWithAvatar = resolveUserWithAvatar(response.user);
  const authResponse = { ...response, user: userWithAvatar };

  useAuthStore.getState().setSession(authResponse);

  // Broadcast login immediately to all other open tabs
  try {
    channel?.postMessage({ type: "login", response: authResponse });
  } catch {
    // Ignore channel broadcast error
  }

  // Fetch full user profile immediately in background to sync latest avatar & info
  void syncUserProfile(response.user.id);

  return userWithAvatar;
}

export async function signOut() {
  try {
    await withRefreshLock(() => authApi.logout());
  } catch {
    // The local session is cleared even if the server cannot be reached.
  }

  endSession();

  try {
    channel?.postMessage(LOGOUT_MESSAGE);
    channel?.postMessage({ type: "logout" });
  } catch {
    // Ignore channel broadcast error
  }
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

  // Cross-tab message exchange via BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        data === LOGOUT_MESSAGE ||
        (typeof data === "object" && data !== null && (data as { type?: string }).type === "logout")
      ) {
        endSession();
      } else if (typeof data === "object" && data !== null) {
        const msg = data as {
          type?: string;
          response?: AuthResponse;
          patch?: Partial<AuthUser>;
        };

        if ((msg.type === "login" || msg.type === "sync") && msg.response) {
          useAuthStore.getState().setSession(msg.response);
        } else if (msg.type === "user_updated" && msg.patch) {
          useAuthStore.getState().updateUser(msg.patch);
        }
      }
    };
  }

  // Cross-tab visibility & window focus synchronization:
  // When switching between browser tabs, check and restore session if unauthenticated
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const handleTabFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        const currentStatus = useAuthStore.getState().status;
        if (currentStatus === "idle" || currentStatus === "anonymous") {
          void restoreSession(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleTabFocusOrVisible);
    window.addEventListener("focus", handleTabFocusOrVisible);
  }

  // Automatically restore session upon application boot for all tabs/pages
  void restoreSession();
}
