import { Badge } from "@/shared/components/ui";

import { describeSource } from "../utils/enrichment-format";

interface SourceChipProps {
  source: string | undefined;
}

/** Tiny provenance chip of a looked-up field (Bộ từ / Từ điển / Google / AI). */
export function SourceChip({ source }: SourceChipProps) {
  const view = describeSource(source);
  if (!view) return null;
  return <Badge tone={view.tone}>{view.label}</Badge>;
}
