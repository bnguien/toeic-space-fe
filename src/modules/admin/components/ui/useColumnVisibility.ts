import { useCallback, useState } from "react";

const storageKey = (tableId: string) => `admin.table.${tableId}.hidden`;

function readHidden(tableId: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tableId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.every((key) => typeof key === "string") ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Hidden columns of a table, remembered per browser. Storage may be unavailable (private mode),
 * so the defaults are used whenever it cannot be read or written.
 */
export function useColumnVisibility(tableId: string, defaultHidden: string[]) {
  const [hidden, setHidden] = useState<string[]>(() => readHidden(tableId) ?? defaultHidden);

  const toggle = useCallback(
    (key: string) =>
      setHidden((previous) => {
        const next = previous.includes(key)
          ? previous.filter((item) => item !== key)
          : [...previous, key];
        try {
          window.localStorage.setItem(storageKey(tableId), JSON.stringify(next));
        } catch {
          // Keep the choice for this visit only.
        }
        return next;
      }),
    [tableId],
  );

  const reset = useCallback(() => {
    setHidden(defaultHidden);
    try {
      window.localStorage.removeItem(storageKey(tableId));
    } catch {
      // Nothing stored.
    }
  }, [tableId, defaultHidden]);

  return { hidden, toggle, reset };
}
