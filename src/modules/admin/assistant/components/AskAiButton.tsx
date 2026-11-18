import { useState } from "react";
import { Maximize2, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

import { ButtonLink, Drawer } from "../../components/ui";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantThread } from "./AssistantThread";
import styles from "./assistant.module.css";

const PAGE_PATH = "/admin/assistant";

/** "Hỏi AI" button of the admin header and its chat panel (same conversation as the assistant page). */
export function AskAiButton() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, busy, send, clear } = useAssistantChat();
  const onPage = useLocation().pathname === PAGE_PATH;
  const close = () => setOpen(false);

  // The page already shows the conversation in full.
  if (onPage) return null;

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        data-busy={busy ? "true" : undefined}
        aria-haspopup="dialog"
        title="Hỏi trợ lý AI"
      >
        <Sparkles size={17} aria-hidden="true" />
        <span>Hỏi AI</span>
      </button>

      <Drawer
        open={open}
        onClose={close}
        title="Trợ lý AI"
        leading={
          <span className={styles.badge} aria-hidden="true">
            <Sparkles size={18} />
          </span>
        }
        meta={
          <ButtonLink
            to={PAGE_PATH}
            variant="ghost"
            size="sm"
            icon={<Maximize2 size={14} />}
            onClick={close}
          >
            Mở trang trợ lý
          </ButtonLink>
        }
        footer={
          <AssistantComposer
            value={draft}
            onChange={setDraft}
            onSubmit={(text) => void send(text)}
            onClear={clear}
            canClear={messages.length > 0}
            busy={busy}
          />
        }
      >
        <AssistantThread
          messages={messages}
          busy={busy}
          onSend={(text) => void send(text)}
          onNavigate={close}
        />
      </Drawer>
    </>
  );
}
