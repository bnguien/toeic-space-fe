import { useQuery } from "@tanstack/react-query";

import { grammarApi } from "../api/grammar.api";
import { grammarQueryKeys } from "../api/grammar.query-keys";
import { pad2 } from "../utils/grammar-text";

/** Lesson TTL as Studychill's in-memory cache: reuse for 5 minutes, then revalidate (ETag → 304 in the browser). */
export const LESSON_TTL_MS = 5 * 60 * 1000;

/** Content of a topic without answers; `topicNum = null` disables the query. */
export function useGrammarLesson(topicNum: number | null) {
  const topic = topicNum ? pad2(topicNum) : "";
  return useQuery({
    queryKey: grammarQueryKeys.lesson(topic),
    queryFn: ({ signal }) => grammarApi.getTopic(topic, signal),
    enabled: !!topicNum,
    staleTime: LESSON_TTL_MS,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
