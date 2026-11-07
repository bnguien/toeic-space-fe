/**
 * Context of the site-wide "select text to look it up" layer. Kept apart from the provider file so the provider
 * file exports one component only (React Fast Refresh keeps its state while editing).
 */
import { createContext } from "react";

import type { SelectionLookupContextValue } from "../types/dictionary.types";

export const SelectionLookupContext = createContext<SelectionLookupContextValue | null>(null);

/** Value used when a component calls the hooks outside the provider. */
export const DISABLED_SELECTION_LOOKUP: SelectionLookupContextValue = {
  enabled: false,
  locked: false,
  switchOn: false,
  setSwitchOn: () => {},
  registerLock: null,
  registerReceiver: null,
  requestLookup: () => {},
  close: () => {},
};
