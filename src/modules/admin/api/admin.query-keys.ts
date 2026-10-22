export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  systemHealth: () => [...adminKeys.all, "system-health"] as const,
  activities: () => [...adminKeys.all, "activities"] as const,
};
