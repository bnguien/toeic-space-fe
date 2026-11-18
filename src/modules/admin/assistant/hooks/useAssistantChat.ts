import { createContext, useContext } from "react";

import type { AssistantChat } from "./useAssistantChatState";

export const AssistantChatContext = createContext<AssistantChat | null>(null);

/** The shared conversation (header drawer and /admin/assistant show the same thread). */
export function useAssistantChat(): AssistantChat {
  const chat = useContext(AssistantChatContext);
  if (!chat) throw new Error("useAssistantChat must be used inside AssistantChatProvider");
  return chat;
}
