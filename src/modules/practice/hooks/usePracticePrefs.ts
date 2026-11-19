import { useShallow } from "zustand/react/shallow";

import { usePracticePrefsStore, type PracticePrefsState } from "../store/practicePrefs.store";

const everything = (state: PracticePrefsState) => state;

/**
 * Practice display preferences (sidebar, font scale, passage font, translation mode, split ratio,
 * exam volume), persisted in this browser. Pass a selector to subscribe to a slice only, e.g.
 * `usePracticePrefs((s) => ({ size: s.passageFontSize, step: s.stepPassageFont }))`.
 */
export function usePracticePrefs(): PracticePrefsState;
export function usePracticePrefs<T>(selector: (state: PracticePrefsState) => T): T;
export function usePracticePrefs<T>(
  selector?: (state: PracticePrefsState) => T,
): T | PracticePrefsState {
  return usePracticePrefsStore(
    useShallow((selector ?? everything) as (state: PracticePrefsState) => T | PracticePrefsState),
  );
}
