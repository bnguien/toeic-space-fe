import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";

import { cx } from "@/shared/components/ui";

import type { AnswerOption } from "../../types/practice-exam.types";
import {
  AI_PROVIDERS,
  ASK_AI_PROMPTS,
  buildAskAiMessage,
  type AskAiPrompt,
} from "../../utils/askAi";
import type { QuestionGroup } from "../../utils/attemptGroups";
import styles from "./AskAiPanel.module.css";

export interface AskAiPanelProps {
  group: QuestionGroup;
  /** The learner's choice of a question id. */
  answerOf: (questionId: string) => AnswerOption | null;
  className?: string;
}

/**
 * Copies synchronously inside the click (before the new tab steals focus), keeping the learner's
 * own text selection. Returns false when the browser refuses.
 */
function copyNow(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(area);
    const selection = document.getSelection();
    const previous = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Hỏi thêm AI" (port of StudyChill AskAi): pick a question type, then a provider link copies the
 * prepared message (question + passage + options + key + choice, ≤ 12k chars) and opens the
 * provider in a new tab. Nothing is embedded; no tokens are spent by TOEIC Space.
 */
export function AskAiPanel({ group, answerOf, className }: AskAiPanelProps) {
  const [prompt, setPrompt] = useState<AskAiPrompt>(ASK_AI_PROMPTS[0]);
  const [copiedFor, setCopiedFor] = useState("");
  const [fallback, setFallback] = useState("");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = (target: string) => {
    const message = buildAskAiMessage(prompt, group, answerOf);
    const done = () => {
      setCopiedFor(target);
      setFallback("");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiedFor(""), 4000);
    };
    if (copyNow(message)) return done();
    const pending = navigator.clipboard?.writeText?.(message);
    if (!pending) return setFallback(message);
    pending.then(done).catch(() => setFallback(message));
  };

  return (
    <details className={cx(styles.panel, className)} data-no-lookup="true">
      <summary className={styles.summary}>
        <MessageCircle size={18} aria-hidden="true" />
        <span>Hỏi thêm AI</span>
      </summary>
      <div className={styles.body}>
        <p className={styles.lead}>Chọn điều muốn hiểu rõ hơn. Đề và đáp án sẽ được đính kèm.</p>
        <fieldset className={styles.step}>
          <legend>01 · Bạn muốn hỏi gì?</legend>
          <div className={styles.chips}>
            {ASK_AI_PROMPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.chip}
                aria-pressed={prompt.id === item.id}
                onClick={() => setPrompt(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.step}>
          <legend>02 · Chọn AI để mở</legend>
          <div className={styles.providers}>
            {AI_PROVIDERS.map((provider) => (
              // A real link (not window.open): the browser treats it as a user navigation.
              <a
                key={provider.id}
                className={styles.provider}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => copy(provider.id)}
                title={`Sao chép nội dung rồi mở ${provider.name} ở tab mới`}
              >
                {provider.name}
                {copiedFor === provider.id ? (
                  <Check size={13} aria-hidden="true" />
                ) : (
                  <ExternalLink size={12} aria-hidden="true" />
                )}
              </a>
            ))}
            <button type="button" className={styles.copy} onClick={() => copy("copy")}>
              {copiedFor === "copy" ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              Sao chép nội dung
            </button>
          </div>
        </fieldset>
        <p className={styles.status} role="status" data-done={copiedFor ? true : undefined}>
          {fallback
            ? "Trình duyệt không cho sao chép tự động — bôi đen ô dưới rồi nhấn Ctrl+C."
            : copiedFor
              ? copiedFor === "copy"
                ? "Đã sao chép. Dán vào AI bạn muốn dùng."
                : "Đã sao chép. Dán vào ô chat bằng Ctrl + V."
              : "Bấm một AI là tự động sao chép nội dung."}
        </p>
        {fallback && (
          <textarea
            className={styles.fallback}
            aria-label="Nội dung để sao chép thủ công"
            readOnly
            rows={5}
            value={fallback}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
        <p className={styles.note}>
          Mở trong tab mới · Dùng tài khoản AI của bạn. TOEIC Space không đọc và không lưu cuộc trò
          chuyện đó.
        </p>
      </div>
    </details>
  );
}
