import type { BlankLabel } from "../RichText";

type SourceQuestion = { id: string; questionNumber?: number | null };

/** Positional fallback is only safe for the bank's complete source passage, never a selection. */
export function blankLabels(
  questions: readonly SourceQuestion[],
  labels: ReadonlyMap<string, string>,
  currentId?: string,
  completeSource = false,
) {
  return (sourceNumber: number, index: number): BlankLabel => {
    const matches = questions.filter((question) => question.questionNumber === sourceNumber);
    const match = matches.length === 1 ? matches[0] : completeSource ? questions[index] : undefined;
    const label = match && labels.get(match.id);
    return label === undefined
      ? { label: String(sourceNumber) }
      : { label, active: match?.id === currentId };
  };
}
