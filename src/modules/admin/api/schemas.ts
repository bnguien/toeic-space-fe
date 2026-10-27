import { z } from "zod";

/**
 * Runtime checks for the admin APIs. A response that does not match the contract fails loudly
 * with InvalidResponseError instead of rendering half-empty screens from wrong fields.
 */
export class InvalidResponseError extends Error {
  readonly endpoint: string;
  readonly issues: z.ZodIssue[];

  constructor(endpoint: string, issues: z.ZodIssue[]) {
    super(`Invalid response from ${endpoint}`);
    this.name = "InvalidResponseError";
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

export function parseResponse<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  endpoint: string,
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (import.meta.env.DEV) {
      console.error(`[admin] ${endpoint} does not match its schema`, result.error.issues);
    }
    throw new InvalidResponseError(endpoint, result.error.issues);
  }
  return result.data;
}

const isoDate = z.string().min(1);

/**
 * Optional value. The Assessment API leaves null fields out of the JSON while Identity sends
 * them as null; both become null here so screens handle a single case.
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((value): z.output<T> | null => value ?? null);
const role = z.enum(["Admin", "Teacher", "User"]);
const status = z.enum(["Active", "Inactive", "Suspended"]);

export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    pageIndex: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

/* Identity: /identity/api/v1/admin/users */

export const managedUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: optional(z.string()),
  avatarUrl: optional(z.string()),
  role,
  status,
  emailVerified: z.boolean(),
  createdAt: isoDate,
  deletedAt: optional(isoDate),
  lastActiveAt: optional(isoDate),
});

export const managedUserDetailSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: optional(z.string()),
  avatarUrl: optional(z.string()),
  role,
  status,
  emailVerifiedAt: optional(isoDate),
  createdAt: isoDate,
  deletedAt: optional(isoDate),
  dateOfBirth: optional(z.string()),
  gender: optional(z.enum(["Male", "Female", "Other"])),
  biography: optional(z.string()),
  targetScore: optional(z.number().int()),
  currentLevel: optional(z.enum(["Beginner", "Intermediate", "Advanced"])),
  activeSessionCount: z.number().int().nonnegative(),
  lastActiveAt: optional(isoDate),
});

export const userStatisticsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  suspended: z.number().int().nonnegative(),
  unverified: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  createdLast30Days: z.number().int().nonnegative(),
  trend: z.object({
    period: z.string(),
    bucket: z.enum(["hour", "day"]),
    bucketHours: z.number().int().positive(),
    buckets: z.array(
      z.object({
        start: z.string(),
        registrations: z.number().int().nonnegative(),
        activeUsers: z.number().int().nonnegative(),
      }),
    ),
    registrations: z.number().int().nonnegative(),
    previousRegistrations: z.number().int().nonnegative(),
    activeUsers: z.number().int().nonnegative(),
    previousActiveUsers: z.number().int().nonnegative(),
  }),
});

export const createUserResponseSchema = z.object({
  user: managedUserDetailSchema,
  temporaryPassword: z.string().min(8),
});

/* Assessment: /assessment/api/v1 */

const contentStatus = z.enum(["Draft", "Active", "Archived"]);

export const examSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: optional(z.string()),
  category: optional(z.string()),
  year: optional(z.number().int()),
  totalQuestions: z.number().int(),
  durationMinutes: z.number().int(),
  totalListeningQuestions: z.number().int(),
  totalReadingQuestions: z.number().int(),
  status: contentStatus,
  createdAt: isoDate,
});

export const examDetailSchema = examSchema.extend({
  passageCount: z.number().int(),
  questionCount: z.number().int(),
  parts: z.array(
    z.object({
      part: z.string(),
      questionCount: z.number().int(),
      expectedQuestionCount: z.number().int(),
    }),
  ),
  updatedAt: optional(isoDate),
});

export const questionSchema = z.object({
  id: z.string().uuid(),
  testId: optional(z.string().uuid()),
  passageId: optional(z.string().uuid()),
  part: z.string(),
  questionNumber: optional(z.number().int()),
  questionText: optional(z.string()),
  audioUrl: optional(z.string()),
  imageUrl: optional(z.string()),
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: optional(z.string()),
  difficultyLevel: z.string(),
  topic: optional(z.string()),
  status: contentStatus,
});

export const questionDetailSchema = questionSchema.extend({
  correctAnswer: z.string(),
  explanation: optional(z.string()),
  transcript: optional(z.string()),
  transcriptTranslation: optional(z.string()),
});

export const passageSchema = z.object({
  title: optional(z.string()),
  content: optional(z.string()),
  contentTranslation: optional(z.string()),
  audioUrl: optional(z.string()),
  imageUrl: optional(z.string()),
  transcript: optional(z.string()),
  questions: z.array(questionSchema),
});

export const bankOverviewSchema = z.object({
  totalQuestions: z.number().int(),
  listeningQuestions: z.number().int(),
  readingQuestions: z.number().int(),
  testQuestions: z.number().int(),
  bankQuestions: z.number().int(),
  totalTests: z.number().int(),
  activeTests: z.number().int(),
  totalPracticeSets: z.number().int(),
  totalPassages: z.number().int(),
  parts: z.array(
    z.object({
      part: z.string(),
      section: z.string(),
      questions: z.number().int(),
      testQuestions: z.number().int(),
      bankQuestions: z.number().int(),
      passages: z.number().int(),
      questionsPerTest: z.number().int(),
    }),
  ),
  statuses: z.array(z.object({ status: z.string(), questions: z.number().int() })),
  difficulties: z.array(z.object({ difficultyLevel: z.string(), questions: z.number().int() })),
  practiceSets: z.array(
    z.object({ kind: z.string(), sets: z.number().int(), questions: z.number().int() }),
  ),
});
