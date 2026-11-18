import { useId, type FormEvent, type KeyboardEvent, type Ref } from "react";
import { ArrowUp, Eraser } from "lucide-react";

import { Button, IconButton } from "../../components/ui";
import { MAX_QUESTION_LENGTH } from "../api/assistant.api";
import styles from "./assistant.module.css";

/** Question box: Enter sends, Shift+Enter starts a new line. */
export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onClear,
  busy,
  canClear,
  inputRef,
  rows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  /** Shows the eraser button (the page has "Xoá" in its header instead). */
  onClear?: () => void;
  busy: boolean;
  canClear?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  rows?: number;
}) {
  const id = useId();

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || busy) return;
    onSubmit(value);
    onChange("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor={id} className={styles.srOnly}>
        Nhắn cho trợ lý AI
      </label>
      <textarea
        ref={inputRef}
        id={id}
        value={value}
        maxLength={MAX_QUESTION_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nhắn cho trợ lý…"
        rows={rows}
      />
      <div className={styles.composerActions}>
        {onClear ? (
          <IconButton label="Xoá cuộc trò chuyện" onClick={onClear} disabled={busy || !canClear}>
            <Eraser size={16} />
          </IconButton>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={busy || !value.trim()}
          icon={<ArrowUp size={16} />}
        >
          Gửi
        </Button>
      </div>
    </form>
  );
}
