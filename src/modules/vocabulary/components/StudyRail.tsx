import { Pause, PencilLine, Play, Volume2 } from "lucide-react";

import { useWordEdits } from "../hooks/useWordEdits";
import type { WordDto } from "../types/vocabulary.types";
import { SaveWordButton } from "./SaveWordButton";
import { StudyToolButton } from "./StudyStage";
import styles from "./StudyRail.module.css";

interface StudyRailProps {
  word: WordDto;
  savedWordId: string | null;
  /** Speaks what fits the card's phase (meaning before the answer, headword after). */
  onAudio: () => void;
  /** Timed modes only. */
  pause?: { paused: boolean; onToggle: () => void; disabled?: boolean };
}

/** TikTok-style action rail: audio, personal edit, save, pause. */
export function StudyRail({ word, savedWordId, onAudio, pause }: StudyRailProps) {
  const { openEdit, canEdit } = useWordEdits();

  return (
    <div className={styles.rail} role="toolbar" aria-label="Thao tác thẻ">
      <StudyToolButton label="Nghe" onClick={onAudio}>
        <Volume2 size={20} />
      </StudyToolButton>
      {canEdit && (
        <StudyToolButton label="Sửa nghĩa riêng" onClick={() => openEdit(word)}>
          <PencilLine size={20} />
        </StudyToolButton>
      )}
      <SaveWordButton wordId={word.id} savedWordId={savedWordId} size="md" />
      {pause && (
        <StudyToolButton
          label={pause.paused ? "Tiếp tục" : "Tạm dừng"}
          aria-pressed={pause.paused}
          disabled={pause.disabled}
          onClick={pause.onToggle}
        >
          {pause.paused ? <Play size={20} /> : <Pause size={20} />}
        </StudyToolButton>
      )}
    </div>
  );
}
