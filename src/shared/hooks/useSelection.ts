import { useState } from "react";

interface SelectionState<K> {
  /** Everything selected except `flipped`, or nothing selected except `flipped`. */
  base: "all" | "none";
  flipped: ReadonlySet<K>;
  /** Last clicked id, the start of a shift-click range. */
  anchor: K | null;
}

/**
 * Multi-select over a list of ids. Stored as "all/none + exceptions", so the selection stays
 * right when the list arrives later or grows (no syncing effect needed).
 */
export function useSelection<K extends string>(
  ids: readonly K[],
  initial: "all" | "none" = "none",
) {
  const [state, setState] = useState<SelectionState<K>>({
    base: initial,
    flipped: new Set(),
    anchor: null,
  });

  const isSelected = (id: K) => (state.base === "all") !== state.flipped.has(id);
  const selectedIds = ids.filter(isSelected);

  const setMany = (targets: readonly K[], selected: boolean, anchor: K | null) =>
    setState((current) => {
      const flipped = new Set(current.flipped);
      for (const id of targets) {
        const flip = (current.base === "all") !== selected;
        if (flip) flipped.add(id);
        else flipped.delete(id);
      }
      return { base: current.base, flipped, anchor };
    });

  /** Toggles one id; with `range` (shift-click) applies the new state from the anchor to it. */
  const toggle = (id: K, range = false) => {
    const next = !isSelected(id);
    const from = state.anchor ? ids.indexOf(state.anchor) : -1;
    const to = ids.indexOf(id);
    if (range && from >= 0 && to >= 0) {
      const [start, end] = from < to ? [from, to] : [to, from];
      setMany(ids.slice(start, end + 1), next, id);
    } else {
      setMany([id], next, id);
    }
  };

  return {
    isSelected,
    selectedIds,
    count: selectedIds.length,
    total: ids.length,
    allSelected: ids.length > 0 && selectedIds.length === ids.length,
    toggle,
    selectAll: () => setState({ base: "all", flipped: new Set(), anchor: null }),
    clear: () => setState({ base: "none", flipped: new Set(), anchor: null }),
    /** Removes ids from the selection (e.g. after a bulk delete). */
    deselect: (targets: readonly K[]) => setMany(targets, false, null),
  };
}

export type Selection<K extends string> = ReturnType<typeof useSelection<K>>;
