import { useState } from "react";
import { Eraser } from "lucide-react";

import { AdminPage, Button } from "../../components/ui";
import { AssistantComposer } from "../components/AssistantComposer";
import { AssistantThread } from "../components/AssistantThread";
import { useAssistantChat } from "../hooks/useAssistantChat";
import styles from "./AssistantPage.module.css";

/** Full-page assistant: the conversation only. */
export function AssistantPage() {
  const { messages, busy, send, clear } = useAssistantChat();
  const [draft, setDraft] = useState("");

  return (
    <AdminPage
      theme="blue"
      title="Trợ lý AI"
      actions={
        <Button
          size="sm"
          icon={<Eraser size={15} />}
          onClick={clear}
          disabled={busy || messages.length === 0}
        >
          Xoá
        </Button>
      }
    >
      <div className={styles.layout}>
        <div className={styles.main}>
          <AssistantThread messages={messages} busy={busy} onSend={(text) => void send(text)} />
          <div className={styles.composerBar}>
            <AssistantComposer
              value={draft}
              onChange={setDraft}
              onSubmit={(text) => void send(text)}
              busy={busy}
              rows={3}
            />
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
