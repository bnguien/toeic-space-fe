import { PencilLine } from "lucide-react";

import { IconButton, type ControlSize } from "@/shared/components/ui";

import { useWordEdits } from "../hooks/useWordEdits";
import type { WordDto } from "../types/vocabulary.types";

interface WordEditButtonProps {
  word: WordDto;
  size?: ControlSize;
  className?: string;
}

/** Pencil that opens the personal edit sheet; hidden without an edit provider. */
export function WordEditButton({ word, size = "sm", className }: WordEditButtonProps) {
  const { openEdit, canEdit } = useWordEdits();
  if (!canEdit) return null;

  return (
    <IconButton
      label="Sửa nghĩa riêng"
      size={size}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        openEdit(word);
      }}
    >
      <PencilLine size={16} />
    </IconButton>
  );
}
