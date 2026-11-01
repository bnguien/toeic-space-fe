import { Clapperboard, Layers, ListChecks, type LucideIcon } from "lucide-react";

import { Kbd, Modal } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";

import { useVocabularyPreferences } from "../hooks/useVocabularyPreferences";
import type { StudyMode } from "../types/vocabulary.types";
import { MODE_LABELS, toStudyMode } from "../utils/study-session";
import styles from "./StudyModeChooser.module.css";

const MODES: { mode: StudyMode; icon: LucideIcon; key: string }[] = [
  { mode: "flashcard", icon: Layers, key: "1" },
  { mode: "quiz", icon: ListChecks, key: "2" },
  { mode: "reel", icon: Clapperboard, key: "3" },
];

interface StudyModeChooserProps {
  /** Number of words that will be studied. */
  count: number;
  onChoose: (mode: StudyMode) => void;
  onClose: () => void;
}

/** Three large mode options; the learner's default mode is highlighted. Mount when open. */
export function StudyModeChooser({ count, onChoose, onClose }: StudyModeChooserProps) {
  const { preferences } = useVocabularyPreferences();
  const preferred = toStudyMode(preferences.defaultMode);

  useHotkeys((event) => {
    const match = MODES.find((item) => item.key === event.key);
    if (match) {
      event.preventDefault();
      onChoose(match.mode);
    }
  });

  return (
    <Modal open title={`Luyện tập ${count.toLocaleString("vi-VN")} từ`} onClose={onClose}>
      <div className={styles.modes} role="group" aria-label="Chế độ">
        {MODES.map(({ mode, icon: Icon, key }) => (
          <button
            key={mode}
            type="button"
            className={styles.mode}
            data-preferred={mode === preferred || undefined}
            autoFocus={mode === preferred}
            onClick={() => onChoose(mode)}
          >
            <span className={styles.icon}>
              <Icon size={28} />
            </span>
            <span className={styles.label}>{MODE_LABELS[mode]}</span>
            <Kbd className={styles.kbd}>{key}</Kbd>
          </button>
        ))}
      </div>
    </Modal>
  );
}
