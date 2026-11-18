export const assistantKeys = {
  all: ["admin", "assistant"] as const,
  agents: () => [...assistantKeys.all, "agents"] as const,
};
