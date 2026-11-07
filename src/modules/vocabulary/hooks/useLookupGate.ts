import { useContext, useEffect } from "react";

import type { SelectionLookupContextValue } from "../types/dictionary.types";
import {
  DISABLED_SELECTION_LOOKUP,
  SelectionLookupContext,
} from "../utils/selection-lookup-context";

/**
 * Puts selection lookups behind the page's own switch while the page is mounted (exam / part practice pages).
 * Returns `{ switchOn, setSwitchOn }` so the page draws its own on/off toggle.
 */
export function useLookupGate(active = true): SelectionLookupContextValue {
  const context = useContext(SelectionLookupContext);
  const registerLock = context?.registerLock;

  useEffect(() => {
    if (!active || !registerLock) return undefined;
    return registerLock();
  }, [active, registerLock]);

  return context ?? DISABLED_SELECTION_LOOKUP;
}
