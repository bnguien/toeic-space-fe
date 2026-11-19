import { env } from "@/config/env";
import { httpClient } from "@/services/http";

import type {
  CourseVocabDto,
  DictationCheckDto,
  DictationCheckRequest,
  DictationConfigDto,
  DictationExercisesDto,
  DictationHintDto,
  DictationHintRequest,
  DictationLearnerStateDto,
  DictationLearnerStatePatch,
  DictationRoadmapDto,
  DictationSkeletonDto,
  DictationSummaryDto,
  PackCoursesDto,
} from "../types/dictation.types";

const BASE = "/content/api/v1/dictation";
const SPEECH = "/content/api/v1/speech";

export interface SkeletonOptions {
  /** Voice the learner listens with: the server pre-renders the next sentences in it. */
  voice?: string;
  /** Ids of the next sentences of the stage (up to 8 are pre-rendered). */
  next?: number[];
}

export const dictationApi = {
  /** GET config — anonymous. Levels, topics, voices, rate range and unlock rules. */
  getConfig: async (signal?: AbortSignal): Promise<DictationConfigDto> =>
    (await httpClient.get<DictationConfigDto>(`${BASE}/config`, { signal })).data,

  /** GET roadmap — anonymous (a token adds the learner's progress). Stages of the 5 levels, no sentence text. */
  getRoadmap: async (signal?: AbortSignal): Promise<DictationRoadmapDto> =>
    (await httpClient.get<DictationRoadmapDto>(`${BASE}/roadmap`, { signal })).data,

  /** GET courses?pack= — anonymous. Courses of a topic pack with the learner's passed counts. */
  getPackCourses: async (pack: string, signal?: AbortSignal): Promise<PackCoursesDto> =>
    (await httpClient.get<PackCoursesDto>(`${BASE}/courses`, { params: { pack }, signal })).data,

  /** GET courses/{id}/vocab — anonymous. Words to pre-learn in basic mode, in sentence order. */
  getCourseVocab: async (
    courseId: string | number,
    signal?: AbortSignal,
  ): Promise<CourseVocabDto> =>
    (await httpClient.get<CourseVocabDto>(`${BASE}/courses/${courseId}/vocab`, { signal })).data,

  /** GET exercises?level=&course= — anonymous. Sentences of a course with progress and unlocks. */
  getExercises: async (
    level: number,
    course: string | number,
    signal?: AbortSignal,
  ): Promise<DictationExercisesDto> =>
    (
      await httpClient.get<DictationExercisesDto>(`${BASE}/exercises`, {
        params: { level, ...(course ? { course } : {}) },
        signal,
      })
    ).data,

  /** GET exercises/{id}/skeleton — anonymous. Sentence frame, meaning, keywords and word proofs. */
  getSkeleton: async (
    itemId: number,
    { voice, next }: SkeletonOptions = {},
    signal?: AbortSignal,
  ): Promise<DictationSkeletonDto> =>
    (
      await httpClient.get<DictationSkeletonDto>(`${BASE}/exercises/${itemId}/skeleton`, {
        params: { ...(voice ? { voice } : {}), ...(next?.length ? { next: next.join(",") } : {}) },
        signal,
      })
    ).data,

  /** POST check — anonymous; a token saves progress. Returns the answer and per-word statuses. */
  check: async (body: DictationCheckRequest): Promise<DictationCheckDto> =>
    (await httpClient.post<DictationCheckDto>(`${BASE}/check`, body)).data,

  /** POST hint — anonymous. Reveals the first letter or the whole first wrong/missing word. */
  hint: async (body: DictationHintRequest): Promise<DictationHintDto> =>
    (await httpClient.post<DictationHintDto>(`${BASE}/hint`, body)).data,

  /** GET summary — anonymous. Passed sentences, total and average accuracy. */
  getSummary: async (signal?: AbortSignal): Promise<DictationSummaryDto> =>
    (await httpClient.get<DictationSummaryDto>(`${BASE}/summary`, { signal })).data,

  /** GET me/state — signed in. Stars, study seconds, play settings, voice and sound preferences. */
  getLearnerState: async (signal?: AbortSignal): Promise<DictationLearnerStateDto> =>
    (await httpClient.get<DictationLearnerStateDto>(`${BASE}/me/state`, { signal })).data,

  /** PUT me/state — signed in. Partial; stars/daily merge by max, the rest by newer timestamp. */
  putLearnerState: async (patch: DictationLearnerStatePatch): Promise<DictationLearnerStateDto> =>
    (await httpClient.put<DictationLearnerStateDto>(`${BASE}/me/state`, patch)).data,
};

/** URL of a sentence read by the server's neural voice — used directly as an <audio> source. */
export const exerciseAudioUrl = (itemId: number, voice?: string, rate = 0): string => {
  const params = new URLSearchParams();
  if (voice) params.set("voice", voice);
  if (rate) params.set("rate", String(rate));
  const query = params.toString();
  return `${env.apiBaseUrl}${BASE}/exercises/${itemId}/audio${query ? `?${query}` : ""}`;
};

/** URL of the shared speech endpoint (any text up to 200 characters). */
export const speechUrl = (text: string, voice?: string): string => {
  const params = new URLSearchParams({ text });
  if (voice) params.set("voice", voice);
  return `${env.apiBaseUrl}${SPEECH}?${params.toString()}`;
};
