/**
 * Response schemas of the learner attempt flow (Assessment `api/v1/attempts`, `tests/{id}/attempts`,
 * `practice-sets/{id}/attempts`). Spec: practice exam v1, section 2. Only imports zod, so pure
 * utilities and Node tests can use the inferred types without loading the HTTP client.
 */
import { z } from "zod";

/** Value that may be absent, sent as null or omitted; always parsed to `T | null`. */
export const nullable = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((value): z.output<T> | null => value ?? null);

/** TOEIC part as a number 1..7. Accepts `3`, `"3"` and the enum name `"Part3"`. */
export const partSchema = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value.replace(/\D/g, ""))))
  .pipe(z.number().int().min(1).max(7));

export const answerOptionSchema = z.enum(["A", "B", "C", "D"]);
export const answerSchema = nullable(answerOptionSchema);
/** Unknown future modes degrade to "Practice" instead of breaking a page. */
export const attemptModeSchema = z.enum(["FullTest", "Practice", "PartPractice"]).catch("Practice");
export const attemptStatusSchema = z.enum(["InProgress", "Completed", "Abandoned"]);
export const sourceKindSchema = z.enum(["Test", "PracticeSet"]);
export const practiceSelectionSchema = z.enum(["All", "Continue", "Random", "Mistakes"]);
export const retakeScopeSchema = z.enum(["Wrong", "All"]);

export const attemptSourceSchema = z.object({
  kind: sourceKindSchema,
  id: z.string().uuid(),
  code: z.string().catch(""),
  title: z.string().catch(""),
  category: nullable(z.string()),
  part: nullable(partSchema),
  level: nullable(z.number().int()),
  targetScore: nullable(z.number().int()),
});

export const attemptQuestionSchema = z.object({
  id: z.string().uuid(),
  sourceQuestionId: z.string().uuid(),
  passageId: nullable(z.string().uuid()),
  part: partSchema,
  orderIndex: z.number().int(),
  questionNumber: nullable(z.number().int()),
  questionText: nullable(z.string()),
  optionA: z.string().catch(""),
  optionB: z.string().catch(""),
  optionC: z.string().catch(""),
  optionD: nullable(z.string()),
  audioUrl: nullable(z.string()),
  imageUrl: nullable(z.string()),
  userAnswer: answerSchema,
  revision: z.number().int(),
  flagged: z.boolean().catch(false),
  checked: z.boolean().catch(false),
  timeSpentSeconds: z.number().int().catch(0),
});

export const attemptPassageSchema = z.object({
  id: z.string().uuid(),
  part: partSchema,
  passageType: nullable(z.string()),
  title: nullable(z.string()),
  content: nullable(z.string()),
  audioUrl: nullable(z.string()),
  imageUrl: nullable(z.string()),
  orderIndex: z.number().int().catch(0),
});

export const questionHistoryEntrySchema = z.object({
  attemptId: z.string().uuid(),
  answeredAt: z.string(),
  userAnswer: answerSchema,
  isCorrect: nullable(z.boolean()),
});

export const questionRevealSchema = z.object({
  questionId: z.string().uuid(),
  correctAnswer: answerOptionSchema,
  userAnswer: answerSchema,
  /** null = skipped. */
  isCorrect: nullable(z.boolean()),
  explanation: nullable(z.string()),
  transcript: nullable(z.string()),
  history: z.array(questionHistoryEntrySchema).catch([]),
});

export const passageRevealSchema = z.object({
  id: z.string().uuid(),
  content: nullable(z.string()),
  translation: nullable(z.string()),
});

export const revealSchema = z.object({
  questions: z.array(questionRevealSchema).catch([]),
  passages: z.array(passageRevealSchema).catch([]),
});

const emptyReveal = { questions: [], passages: [] };

export const attemptSchema = z.object({
  id: z.string().uuid(),
  mode: attemptModeSchema,
  status: attemptStatusSchema,
  title: z.string().catch(""),
  source: attemptSourceSchema,
  testId: nullable(z.string().uuid()),
  practiceSetId: nullable(z.string().uuid()),
  parts: z.array(partSchema).catch([]),
  startTime: z.string(),
  lastActivityAt: z.string(),
  expiresAt: nullable(z.string()),
  /** FullTest only: absolute end of the exam clock (server time). */
  deadline: nullable(z.string()),
  timeLimitSeconds: nullable(z.number().int()),
  /** Server clock at response time; used to correct the local clock offset. */
  serverNow: z.string(),
  questions: z.array(attemptQuestionSchema).min(1),
  passages: z.array(attemptPassageSchema).catch([]),
  reveal: revealSchema.nullish().transform((value) => value ?? emptyReveal),
});

export const savedAnswerSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: answerSchema,
  revision: z.number().int(),
  lastActivityAt: z.string(),
});

export const flagResultSchema = z.object({
  questionId: z.string().uuid(),
  flagged: z.boolean(),
});

export const activeSetAttemptSchema = z.object({
  generation: z.number().int(),
  attemptId: nullable(z.string().uuid()),
});

export const activeTestAttemptSchema = z.object({
  attemptId: nullable(z.string().uuid()),
  mode: nullable(attemptModeSchema),
  parts: z.array(partSchema).catch([]),
  answeredCount: z.number().int().catch(0),
  totalQuestions: z.number().int().catch(0),
  deadline: nullable(z.string()),
  serverNow: z.string(),
});

export const cefrSchema = z.object({ level: z.string(), title: z.string().catch("") });

export const attemptScoreSchema = z.object({
  questionCount: z.number().int(),
  answered: z.number().int(),
  correct: z.number().int(),
  listeningCorrect: z.number().int().catch(0),
  listeningTotal: z.number().int().catch(0),
  readingCorrect: z.number().int().catch(0),
  readingTotal: z.number().int().catch(0),
  listeningScaled: nullable(z.number().int()),
  readingScaled: nullable(z.number().int()),
  totalScaled: nullable(z.number().int()),
  cefr: nullable(cefrSchema),
});

export const partScoreSchema = z.object({
  part: partSchema,
  total: z.number().int(),
  answered: z.number().int(),
  correct: z.number().int(),
});

export const resultAnswerSchema = z.object({
  questionId: z.string().uuid(),
  sourceQuestionId: z.string().uuid(),
  questionNumber: nullable(z.number().int()),
  part: partSchema,
  orderIndex: z.number().int(),
  userAnswer: answerSchema,
  correctAnswer: answerOptionSchema,
  isCorrect: nullable(z.boolean()),
  flagged: z.boolean().catch(false),
});

export const attemptResultSchema = z.object({
  attemptId: z.string().uuid(),
  mode: attemptModeSchema,
  status: attemptStatusSchema,
  title: z.string().catch(""),
  source: attemptSourceSchema,
  parts: z.array(partSchema).catch([]),
  startTime: z.string(),
  endTime: nullable(z.string()),
  durationSeconds: z.number().int().catch(0),
  score: attemptScoreSchema,
  byPart: z.array(partScoreSchema).catch([]),
  answers: z.array(resultAnswerSchema).catch([]),
});

export const attemptSummarySchema = z.object({
  id: z.string().uuid(),
  mode: attemptModeSchema,
  status: attemptStatusSchema,
  title: z.string().catch(""),
  source: attemptSourceSchema,
  parts: z.array(partSchema).catch([]),
  startTime: z.string(),
  endTime: nullable(z.string()),
  durationSeconds: z.number().int().catch(0),
  questionCount: z.number().int(),
  answered: z.number().int(),
  correct: z.number().int(),
  listeningScaled: nullable(z.number().int()),
  readingScaled: nullable(z.number().int()),
  totalScaled: nullable(z.number().int()),
});

/** `PaginatedResult<T>` of the BuildingBlocks (camelCase). */
export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    pageIndex: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

export const attemptHistoryPageSchema = paginatedSchema(attemptSummarySchema);
