export const grammarQueryKeys = {
  all: ["grammar"] as const,
  lesson: (topic: string) => [...grammarQueryKeys.all, "lesson", topic] as const,
  stageTest: (stage: string) => [...grammarQueryKeys.all, "stage-test", stage] as const,
  /** Learner-specific data. */
  me: () => [...grammarQueryKeys.all, "me"] as const,
  knownWords: (topic: string) => [...grammarQueryKeys.me(), "known-words", topic] as const,
  mistakes: () => [...grammarQueryKeys.me(), "mistakes"] as const,
  traps: () => [...grammarQueryKeys.me(), "traps"] as const,
  comments: (target: string) => [...grammarQueryKeys.all, "comments", target] as const,
};
