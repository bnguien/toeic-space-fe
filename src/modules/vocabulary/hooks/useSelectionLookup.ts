import { useContext } from "react";

import type { SelectionLookupContextValue } from "../types/dictionary.types";
import {
  DISABLED_SELECTION_LOOKUP,
  SelectionLookupContext,
} from "../utils/selection-lookup-context";

/** Access to the site-wide "select text to look it up" layer (see `SelectionLookupProvider`). */
export function useSelectionLookup(): SelectionLookupContextValue {
  return useContext(SelectionLookupContext) ?? DISABLED_SELECTION_LOOKUP;
}
