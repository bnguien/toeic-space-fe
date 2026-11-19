import { useState, type MouseEvent } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { IconButton, type ControlSize } from "@/shared/components/ui";

import { useRemoveSavedWord } from "../hooks/useRemoveSavedWord";
import { useSaveWord } from "../hooks/useSaveWord";
import styles from "./SaveWordButton.module.css";

interface SaveWordButtonProps {
  wordId: string;
  /** Library entry from the server (`StudyItemDto.savedWordId`), null when not saved. */
  savedWordId: string | null;
  size?: ControlSize;
}

/** Bookmark toggle: POST/DELETE `me/words`. */
export function SaveWordButton({ wordId, savedWordId, size = "sm" }: SaveWordButtonProps) {
  // Local result of the last toggle; `undefined` = follow the server value.
  const [override, setOverride] = useState<string | null | undefined>(undefined);
  const save = useSaveWord();
  const remove = useRemoveSavedWord();
  const current = override === undefined ? savedWordId : override;
  const busy = save.isPending || remove.isPending;
  const failed = save.isError || remove.isError;

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (busy) return;
    if (current) {
      remove.mutate(current, { onSuccess: () => setOverride(null) });
    } else {
      save.mutate({ wordId }, { onSuccess: (saved) => setOverride(saved.id) });
    }
  };

  return (
    <IconButton
      label={current ? "Bỏ lưu" : "Lưu từ"}
      size={size}
      className={styles.button}
      data-saved={current ? true : undefined}
      data-failed={failed || undefined}
      aria-pressed={!!current}
      disabled={busy}
      onClick={toggle}
    >
      {current ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
    </IconButton>
  );
}
