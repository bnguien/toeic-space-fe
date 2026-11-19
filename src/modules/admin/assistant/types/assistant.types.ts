import type { z } from "zod";

import type {
  assistantAgentSchema,
  assistantReplySchema,
  assistantSpecialistSchema,
  assistantTaskSchema,
} from "../../api/schemas";

export type AssistantReply = z.output<typeof assistantReplySchema>;
export type AssistantTask = z.output<typeof assistantTaskSchema>;
export type AssistantAgent = z.output<typeof assistantAgentSchema>;
export type AssistantSpecialist = z.output<typeof assistantSpecialistSchema>;

/** An earlier turn of the chat, sent along so a follow-up question is understood. */
export interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** pending: the typing dots; clarify: the assistant asks back with options. */
  status: "pending" | "done" | "clarify" | "error";
  options?: string[];
  /** The specialist who took the question, when the assistant handed it on. */
  specialist?: AssistantSpecialist | null;
}

export type DepartmentKey =
  "assessment" | "growth" | "classroom" | "content" | "marketing" | "analytics" | "unknown";
