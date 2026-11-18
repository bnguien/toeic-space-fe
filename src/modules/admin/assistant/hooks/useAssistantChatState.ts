import { useCallback, useEffect, useRef, useState } from "react";

import { assistantApi, assistantError, TERMINAL } from "../api/assistant.api";
import type { AssistantTurn, ChatMessage } from "../types/assistant.types";
import { answerToPlainText } from "../utils/answerParser";

const FAST_POLL_MS = 700;
const SLOW_POLL_MS = 1500;
const FAST_FOR_MS = 30_000;
const POLL_LIMIT_MS = 6 * 60_000;
const CONTEXT_TURNS = 6;
const CONTEXT_CHARS = 500;
const NO_ANSWER = "Mình chưa trả lời được câu này. Bạn thử hỏi lại theo cách khác nhé.";
const TOO_LONG = "Câu này đang lâu hơn bình thường, bạn thử hỏi lại sau ít phút nhé.";

let counter = 0;
const nextId = () => `m${Date.now().toString(36)}${(counter += 1)}`;

/** The last turns the person can see, as plain text, so "còn Part 2 thì sao?" is understood. */
function contextOf(messages: ChatMessage[]): AssistantTurn[] {
  return messages
    .filter((m) => m.role === "user" || m.status === "done" || m.status === "clarify")
    .slice(-CONTEXT_TURNS)
    .map((m) => ({
      role: m.role,
      text: (m.role === "user" ? m.text : answerToPlainText(m.text) || m.text).slice(
        0,
        CONTEXT_CHARS,
      ),
    }))
    .filter((turn) => turn.text.trim());
}

/**
 * Conversation with the assistant: send a question, wait for its answer, keep the history.
 * One instance lives in AssistantChatProvider so the header drawer and the page share it.
 */
export function useAssistantChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const timers = useRef(new Set<number>());
  const history = useRef<ChatMessage[]>([]);

  useEffect(() => {
    history.current = messages;
  }, [messages]);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const finish = useCallback((id: string, update: Partial<ChatMessage>) => {
    if (!alive.current) return;
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...update } : m)));
    setBusy(false);
  }, []);

  const follow = useCallback(
    (messageId: string, taskId: string, startedAt: number) => {
      const tick = async () => {
        if (!alive.current) return;
        try {
          const { task } = await assistantApi.task(taskId);
          if (TERMINAL.has(task.status)) {
            const text = task.resultLines.join("\n").trim();
            finish(
              messageId,
              task.status === "done" && text
                ? { status: "done", text }
                : { status: "error", text: NO_ANSWER },
            );
            return;
          }
        } catch (error) {
          finish(messageId, { status: "error", text: assistantError(error) });
          return;
        }
        const waited = Date.now() - startedAt;
        if (waited > POLL_LIMIT_MS) {
          finish(messageId, { status: "error", text: TOO_LONG });
          return;
        }
        const timer = window.setTimeout(
          () => {
            timers.current.delete(timer);
            void tick();
          },
          waited < FAST_FOR_MS ? FAST_POLL_MS : SLOW_POLL_MS,
        );
        timers.current.add(timer);
      };
      void tick();
    },
    [finish],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      const answerId = nextId();
      const context = contextOf(history.current);
      setBusy(true);
      setMessages((list) => [
        ...list,
        { id: nextId(), role: "user", text, status: "done" },
        { id: answerId, role: "assistant", text: "", status: "pending" },
      ]);
      try {
        const reply = await assistantApi.ask(text, context);
        if (reply.specialist && alive.current) {
          const specialist = reply.specialist;
          setMessages((list) => list.map((m) => (m.id === answerId ? { ...m, specialist } : m)));
        }
        if (reply.taskId) {
          follow(answerId, reply.taskId, Date.now());
          return;
        }
        if (reply.route === "clarify") {
          finish(answerId, {
            status: "clarify",
            text: reply.question || reply.reply,
            options: reply.options,
          });
          return;
        }
        finish(
          answerId,
          reply.reply
            ? { status: "done", text: reply.reply }
            : { status: "error", text: NO_ANSWER },
        );
      } catch (error) {
        finish(answerId, { status: "error", text: assistantError(error) });
      }
    },
    [busy, finish, follow],
  );

  const clear = useCallback(() => {
    if (!busy) setMessages([]);
  }, [busy]);

  return { messages, busy, send, clear };
}

export type AssistantChat = ReturnType<typeof useAssistantChatState>;
