import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

// 4xx answers (unauthenticated, forbidden, not found, rate limited) will not change on retry.
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return failureCount < 1 && (status === undefined || status >= 500);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
