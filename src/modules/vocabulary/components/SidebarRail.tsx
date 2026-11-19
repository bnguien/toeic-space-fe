import type { ReactNode } from "react";
import { Library } from "lucide-react";

import { IconButton } from "@/shared/components/ui";

import type { StageDto } from "../types/vocabulary.types";
import { stageToneStyle } from "../utils/stage-tones";
import { padOrder } from "../utils/vocabulary-format";
import styles from "./SidebarRail.module.css";
import type { WorkspaceView } from "./SidebarToolbar";

interface SidebarRailProps {
  view: WorkspaceView;
  stages: StageDto[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onOpenLibrary: () => void;
  /** Expand control. */
  toolbar: ReactNode;
}

/** Collapsed sidebar: stage numbers in their tones, library shortcut, expand. */
export function SidebarRail({
  view,
  stages,
  selectedStageId,
  onSelectStage,
  onOpenLibrary,
  toolbar,
}: SidebarRailProps) {
  return (
    <nav className={styles.rail} aria-label="Chặng">
      {stages.map((stage, index) => {
        const selected = view === "roadmap" && stage.id === selectedStageId;
        return (
          <button
            key={stage.id}
            type="button"
            className={styles.stage}
            style={stageToneStyle(stage.order)}
            data-selected={selected || undefined}
            aria-pressed={selected}
            title={stage.title}
            aria-label={`Chặng ${index + 1}: ${stage.title}`}
            onClick={() => onSelectStage(stage.id)}
          >
            {padOrder(index + 1)}
          </button>
        );
      })}
      <IconButton
        label="Từ vựng của tôi"
        variant={view === "library" ? "mark" : "outline"}
        onClick={onOpenLibrary}
      >
        <Library size={18} />
      </IconButton>
      <div className={styles.toolbar}>{toolbar}</div>
    </nav>
  );
}
