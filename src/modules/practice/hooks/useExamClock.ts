import { useEffect, useEffectEvent, useState } from "react";

import { EXAM_CLOCK_WARNING_SECONDS, localDeadline } from "../utils/examClock";

export { EXAM_CLOCK_WARNING_SECONDS };

export interface ExamClockOptions {
  /** Absolute server deadline (ISO); null = no clock. */
  deadline: string | null | undefined;
  /** Server time of the response that carried the deadline (corrects the local clock offset). */
  serverNow?: string | null;
  /** Fires once per deadline when the time is up (auto-submit). */
  onExpire?: () => void;
}

export interface ExamClock {
  /** Whole seconds left, null before the first tick or without a deadline. */
  remaining: number | null;
  expired: boolean;
  /** ≤ 5 minutes left. */
  warning: boolean;
}

/**
 * Countdown to an absolute deadline (port of StudyChill `useExamClock`): F5 or a sleeping tab
 * stays exact. The local/server offset is measured once per `serverNow`; ticks every second and
 * re-syncs when the tab becomes visible again.
 */
export function useExamClock({ deadline, serverNow, onExpire }: ExamClockOptions): ExamClock {
  const [clock, setClock] = useState<{ key: string; remaining: number } | null>(null);
  const expire = useEffectEvent(() => onExpire?.());
  const key = `${deadline ?? ""}|${serverNow ?? ""}`;

  useEffect(() => {
    if (!deadline) return;
    const endsAt = localDeadline(deadline, serverNow, Date.now());
    if (endsAt === null) return;
    let fired = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setClock({ key, remaining: left });
      if (left <= 0 && !fired) {
        fired = true;
        expire();
      }
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadline, serverNow, key]);

  // A value of a previous deadline is never shown.
  const remaining = deadline && clock?.key === key ? clock.remaining : null;
  return {
    remaining,
    expired: remaining === 0,
    warning: remaining !== null && remaining <= EXAM_CLOCK_WARNING_SECONDS,
  };
}
