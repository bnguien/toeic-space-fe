import { isAxiosError } from "axios";

import { httpClient } from "@/services/http";

import {
  assistantAgentsSchema,
  assistantReplySchema,
  assistantTaskSchema,
  parseResponse,
} from "../../api/schemas";
import { apiErrorMessage } from "../../utils/apiError";
import type { AssistantTurn } from "../types/assistant.types";

/**
 * "Ask AI" of the admin area. The Identity API forwards to the AI assistant (SeasonedAgents) for the signed-in
 * administrator; the browser never holds the assistant's key.
 */
const base = "/identity/api/v1/admin/assistant";

export const TERMINAL = new Set(["done", "failed", "cancelled"]);
export const MAX_QUESTION_LENGTH = 2000;

export const assistantApi = {
  ask: async (text: string, context: AssistantTurn[]) =>
    parseResponse(
      assistantReplySchema,
      (await httpClient.post(`${base}/messages`, { text, context })).data,
      "POST admin/assistant/messages",
    ),
  task: async (taskId: string) =>
    parseResponse(
      assistantTaskSchema,
      (await httpClient.get(`${base}/tasks/${encodeURIComponent(taskId)}`)).data,
      "admin/assistant/tasks/{id}",
    ),
  agents: async (signal?: AbortSignal) =>
    parseResponse(
      assistantAgentsSchema,
      (await httpClient.get(`${base}/agents`, { signal })).data,
      "admin/assistant/agents",
    ),
};

/** A plain sentence for the person; never a status code or an internal error name. */
export function assistantError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    if (status === 429) return "Bạn hỏi hơi nhanh, chờ vài giây rồi thử lại nhé.";
    if (status >= 500 || !error.response) {
      return "Trợ lý đang bận hoặc mất kết nối. Bạn thử lại sau ít phút nhé.";
    }
    const data = error.response.data as { message?: unknown; title?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message) return data.message;
    if (typeof data?.title === "string" && data.title) return data.title;
  }
  return apiErrorMessage(error);
}
