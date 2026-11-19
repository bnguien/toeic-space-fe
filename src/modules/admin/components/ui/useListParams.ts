import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Keys that open a detail drawer; changing them must not reset the page. */
const DETAIL_KEYS = new Set(["user", "exam", "question"]);

/**
 * List state kept in the URL (search, filters, page, open detail), so a view can be shared,
 * refreshed and navigated with the back button.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const get = useCallback((key: string) => params.get(key) ?? "", [params]);

  /**
   * Applies several changes in one navigation. Two separate calls in the same event would
   * each start from the current URL and the second would undo the first.
   */
  const update = useCallback(
    (changes: Record<string, string>) => {
      const keys = Object.keys(changes);
      const detailOnly = keys.every((key) => DETAIL_KEYS.has(key));
      const opensDetail = detailOnly && keys.some((key) => changes[key]);

      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          keys.forEach((key) => {
            if (changes[key]) next.set(key, changes[key]);
            else next.delete(key);
          });
          // A new search or filter starts again from the first page.
          if (!detailOnly && !("page" in changes)) next.delete("page");
          return next;
        },
        // Opening a detail adds history so Back closes it; everything else replaces the entry.
        { replace: !opensDetail },
      );
    },
    [setParams],
  );

  const set = useCallback((key: string, value: string) => update({ [key]: value }), [update]);

  const clear = useCallback(
    (keep: string[] = []) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams();
          keep.forEach((key) => {
            const value = previous.get(key);
            if (value) next.set(key, value);
          });
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const page = Math.max(1, Number(params.get("page")) || 1);

  return { params, get, set, update, clear, page };
}
