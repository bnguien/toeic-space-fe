export const dictationQueryKeys = {
  all: ["dictation"] as const,
  config: () => [...dictationQueryKeys.all, "config"] as const,
  /** Learner-specific listings (progress, unlocks); invalidated after playing. */
  progress: () => [...dictationQueryKeys.all, "progress"] as const,
  roadmap: () => [...dictationQueryKeys.progress(), "roadmap"] as const,
  packCourses: (pack: string) => [...dictationQueryKeys.progress(), "pack", pack] as const,
  exercises: (level: number, course: string) =>
    [...dictationQueryKeys.progress(), "exercises", level, course] as const,
  courseVocab: (courseId: string) => [...dictationQueryKeys.all, "vocab", courseId] as const,
  learnerState: () => [...dictationQueryKeys.all, "me", "state"] as const,
};
