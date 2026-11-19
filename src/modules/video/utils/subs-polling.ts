/**
 * Polls subtitles while the server prepares them in the background (202 `{status:"processing"}`).
 * Backoff 3 → 5 → 8 s, gives up after ~2 minutes with code `subs_timeout`; cancellable with an AbortSignal
 * (timers are cleared when the reader unmounts or the video changes).
 */
export const SUBS_POLL_DELAYS: readonly number[] = [3000, 5000, 8000];
export const SUBS_POLL_MAX_MS = 120000;

export const isProcessing = (res: unknown): boolean =>
  !!res && typeof res === "object" && (res as { status?: unknown }).status === "processing";

export function pollDelay(attempt: number, delays: readonly number[] = SUBS_POLL_DELAYS): number {
  return delays[Math.min(Math.max(attempt, 0), delays.length - 1)];
}

/** Error with a machine code (`subs_timeout`). */
export class SubsPollError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function abortError(): Error {
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

export interface PollOptions {
  signal?: AbortSignal;
  /** Called every time the server answers "still preparing" (to show a waiting state). */
  onPending?: (attempt: number) => void;
  delays?: readonly number[];
  maxWaitMs?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}

/** `fetchOnce()` → first response that is no longer "processing". */
export async function pollUntilReady<T>(
  fetchOnce: () => Promise<T>,
  {
    signal,
    onPending,
    delays = SUBS_POLL_DELAYS,
    maxWaitMs = SUBS_POLL_MAX_MS,
    sleep = wait,
    now = Date.now,
  }: PollOptions = {},
): Promise<T> {
  const started = now();
  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw abortError();
    const res = await fetchOnce();
    if (signal?.aborted) throw abortError();
    if (!isProcessing(res)) return res;
    onPending?.(attempt);
    const delay = pollDelay(attempt, delays);
    if (now() - started + delay > maxWaitMs) {
      throw new SubsPollError(
        "Chuẩn bị phụ đề lâu hơn dự kiến. Bấm thử lại sau ít phút nhé.",
        "subs_timeout",
      );
    }
    await sleep(delay, signal);
  }
}
