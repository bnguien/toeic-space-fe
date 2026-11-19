export const sameIds = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export function selectionState(ids: string[], observedAt = 0) {
  return {
    ids,
    saved: ids,
    server: ids,
    observed: ids,
    observedAt,
    saving: null as string[] | null,
    savingObservedAt: null as number | null,
  };
}
export type SelectionState = ReturnType<typeof selectionState>;
type Action =
  | { type: "edit"; ids: string[] }
  | { type: "server"; ids: string[]; observedAt?: number }
  | { type: "save" }
  | { type: "saved"; ids: string[] }
  | { type: "failed" }
  | { type: "reload" };

export function selectionReducer(state: SelectionState, action: Action): SelectionState {
  switch (action.type) {
    case "edit":
      return !state.saving && sameIds(action.ids, state.saved)
        ? { ...state, ids: state.server, saved: state.server }
        : { ...state, ids: action.ids };
    case "server": {
      const clean = !state.saving && sameIds(state.ids, state.saved);
      return {
        ...state,
        observed: action.ids,
        observedAt: action.observedAt ?? state.observedAt,
        server: action.ids,
        ...(clean ? { ids: action.ids, saved: action.ids } : {}),
      };
    }
    case "save":
      return { ...state, saving: state.server, savingObservedAt: state.observedAt };
    case "saved": {
      // A pre-save value must not undo the committed response. A newer refetch may contain
      // another tab's last committed write and remains available for explicit reload.
      const server =
        sameIds(state.server, state.saving ?? []) && state.observedAt === state.savingObservedAt
          ? action.ids
          : state.server;
      const clean = sameIds(state.ids, action.ids);
      return {
        ...state,
        ids: clean ? server : state.ids,
        saved: clean ? server : action.ids,
        server,
        saving: null,
        savingObservedAt: null,
      };
    }
    case "failed":
      return { ...state, saving: null, savingObservedAt: null };
    case "reload":
      return { ...state, ids: state.server, saved: state.server };
  }
}
