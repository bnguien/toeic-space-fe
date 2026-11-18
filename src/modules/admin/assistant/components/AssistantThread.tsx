import { useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

import { EmptyState, IconButton } from "../../components/ui";
import type { ChatMessage } from "../types/assistant.types";
import { answerToPlainText } from "../utils/answerParser";
import { GENERAL_SUGGESTIONS } from "../utils/departments";
import { AnswerView } from "./AnswerView";
import { SpecialistChip } from "./SpecialistChip";
import styles from "./assistant.module.css";

function Typing() {
  return (
    <div className={styles.typing} role="status" aria-label="Trợ lý đang trả lời">
      <span />
      <span />
      <span />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <IconButton
      label={copied ? "Đã chép" : "Chép câu trả lời"}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(answerToPlainText(text) || text)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </IconButton>
  );
}

function Options({
  options,
  busy,
  onPick,
}: {
  options: string[];
  busy: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className={styles.options}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          disabled={busy}
          onClick={() => onPick(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function AssistantTurn({
  message,
  busy,
  onPick,
  onNavigate,
}: {
  message: ChatMessage;
  busy: boolean;
  onPick: (text: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className={styles.turn} data-message={message.id}>
      <span className={styles.avatar} aria-hidden="true">
        <Sparkles size={14} />
      </span>
      <div className={styles.turnBody}>
        {message.specialist && <SpecialistChip specialist={message.specialist} />}
        {message.status === "pending" ? (
          <Typing />
        ) : (
          <AnswerView
            text={message.text}
            tone={message.status === "error" ? "error" : undefined}
            onNavigate={onNavigate}
          />
        )}
        {message.status === "clarify" && !!message.options?.length && (
          <Options options={message.options} busy={busy} onPick={onPick} />
        )}
        {message.status === "done" && message.text && (
          <div className={styles.turnTools}>
            <CopyButton text={message.text} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Conversation shown in the header drawer and on /admin/assistant. */
export function AssistantThread({
  messages,
  busy,
  onSend,
  onNavigate,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onNavigate?: () => void;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // A long answer is read from its question down; anything else keeps the end in view.
  useEffect(() => {
    const last = messages[messages.length - 1];
    const turn =
      last && last.role === "assistant" && last.status !== "pending"
        ? threadRef.current?.querySelector<HTMLElement>(`[data-message="${last.id}"]`)
        : null;
    if (turn && turn.offsetHeight > window.innerHeight * 0.6) {
      (turn.previousElementSibling ?? turn).scrollIntoView({ block: "start" });
    } else {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  return (
    <div ref={threadRef} className={styles.thread} aria-live="polite">
      {messages.length === 0 && (
        <EmptyState
          title="Bạn cần xem gì?"
          action={<Options options={GENERAL_SUGGESTIONS} busy={busy} onPick={onSend} />}
        />
      )}
      {messages.map((message) =>
        message.role === "user" ? (
          <p key={message.id} className={styles.question} data-message={message.id}>
            {message.text}
          </p>
        ) : (
          <AssistantTurn
            key={message.id}
            message={message}
            busy={busy}
            onPick={onSend}
            onNavigate={onNavigate}
          />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
