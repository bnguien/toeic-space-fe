/** Workspace split pane maths (pure; see `useSplitRatio`). */

export const SPLIT = { min: 20, max: 80, center: 50, snapFrom: 48.5, snapTo: 51.5 } as const;

/** Drag value → ratio: clamped 20..80, snapped to 50 inside 48.5..51.5. */
export function normalizeDragRatio(ratio: number): number {
  const clamped = Math.min(SPLIT.max, Math.max(SPLIT.min, ratio));
  if (clamped >= SPLIT.snapFrom && clamped <= SPLIT.snapTo) return SPLIT.center;
  return Math.round(clamped * 10) / 10;
}

/** "‹": 100→…→50→35→0 (shrinks the left panel). */
export function stepLeftRatio(ratio: number): number {
  if (ratio > SPLIT.center) return SPLIT.center;
  if (ratio > 35) return 35;
  return 0;
}

/** "›": 0→…→50→65→100 (grows the left panel). */
export function stepRightRatio(ratio: number): number {
  if (ratio < SPLIT.center) return SPLIT.center;
  if (ratio < 65) return 65;
  return 100;
}

/** "62% : 38%" */
export const splitBadge = (ratio: number) => `${Math.round(ratio)}% : ${100 - Math.round(ratio)}%`;
