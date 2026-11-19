import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { emptyFilters, type FilterValues } from "../utils/practice";

export function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 350);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function usePracticeFilters() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(
    Object.keys(emptyFilters).map((key) => [key, params.get(key) ?? ""]),
  ) as unknown as FilterValues;
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const setFilters = (next: FilterValues) =>
    setParams(
      (current) => {
        const result = new URLSearchParams(current);
        Object.entries(next).forEach(([key, value]) =>
          value ? result.set(key, value) : result.delete(key),
        );
        result.delete("page");
        return result;
      },
      { replace: true },
    );
  const setPage = (next: number) =>
    setParams((current) => {
      const result = new URLSearchParams(current);
      result.set("page", String(next));
      return result;
    });
  return { filters, setFilters, page, setPage, search: useDebouncedValue(filters.search) };
}
