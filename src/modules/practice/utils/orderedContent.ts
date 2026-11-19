/** Preserve missing items as well: the preview can report unavailable content in its saved position. */
export function orderedContent<Q extends { passageId?: string | null }>(
  items: readonly { questionId: string }[],
  questions: ReadonlyMap<string, Q>,
) {
  return items.map((item, index) => {
    const question = questions.get(item.questionId);
    const previous = index > 0 ? questions.get(items[index - 1].questionId) : undefined;
    return {
      ...item,
      question,
      number: index + 1,
      firstInPassage: Boolean(question?.passageId && question.passageId !== previous?.passageId),
    };
  });
}
