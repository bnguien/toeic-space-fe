import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Time ranges shared by every trend in the admin area. The keys match the `period` parameter
 * of the statistics APIs, so a new chart only has to pass the range through.
 */
export const TIME_RANGES = [
  { value: "24h", label: "24 giờ", previous: "24 giờ trước" },
  { value: "3d", label: "3 ngày", previous: "3 ngày trước" },
  { value: "7d", label: "7 ngày", previous: "7 ngày trước" },
  { value: "30d", label: "30 ngày", previous: "30 ngày trước" },
  { value: "90d", label: "90 ngày", previous: "90 ngày trước" },
] as const;

export type TimeRange = (typeof TIME_RANGES)[number]["value"];

export const DEFAULT_TIME_RANGE: TimeRange = "7d";

const isTimeRange = (value: string | null): value is TimeRange =>
  TIME_RANGES.some((range) => range.value === value);

export const timeRangeInfo = (range: TimeRange) =>
  TIME_RANGES.find((item) => item.value === range) ?? TIME_RANGES[2];

/** Selected range kept in the URL (`?range=`), so it survives reloads and can be shared. */
export function useTimeRange(defaultRange: TimeRange = DEFAULT_TIME_RANGE) {
  const [params, setParams] = useSearchParams();
  const value = params.get("range");
  const range = isTimeRange(value) ? value : defaultRange;

  const setRange = useCallback(
    (next: TimeRange) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next === defaultRange) updated.delete("range");
          else updated.set("range", next);
          return updated;
        },
        { replace: true },
      ),
    [setParams, defaultRange],
  );

  return [range, setRange] as const;
}
