import type { ReactNode } from "react";

import { AssistantChatContext } from "../hooks/useAssistantChat";
import { useAssistantChatState } from "../hooks/useAssistantChatState";

/** Keeps one conversation for the whole admin shell. */
export function AssistantChatProvider({ children }: { children: ReactNode }) {
  const chat = useAssistantChatState();
  return <AssistantChatContext.Provider value={chat}>{children}</AssistantChatContext.Provider>;
}
