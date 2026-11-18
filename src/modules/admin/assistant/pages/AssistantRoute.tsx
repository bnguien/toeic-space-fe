import { lazy, Suspense } from "react";

// The assistant page loads on first visit.
const AssistantPage = lazy(() =>
  import("./AssistantPage").then((module) => ({ default: module.AssistantPage })),
);

export function AssistantRoute() {
  return (
    <Suspense fallback={null}>
      <AssistantPage />
    </Suspense>
  );
}
