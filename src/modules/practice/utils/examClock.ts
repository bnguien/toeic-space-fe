/** Exam clock maths (pure; see `useExamClock`). */

/** Seconds left from which the clock turns red. */
export const EXAM_CLOCK_WARNING_SECONDS = 300;

/** Local timestamp (ms) of a server deadline, corrected by the server/device clock offset. */
export function localDeadline(deadline: string, serverNow: string | null | undefined, now: number) {
  const end = Date.parse(deadline);
  if (Number.isNaN(end)) return null;
  const server = serverNow ? Date.parse(serverNow) : NaN;
  // Server ahead of this device by `offset` ms → the deadline is earlier in local time.
  const offset = Number.isNaN(server) ? 0 : server - now;
  return end - offset;
}
