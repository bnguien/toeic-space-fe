import { Sparkles } from "lucide-react";

import { IconButton, toast } from "@/shared/components/ui";

import { useAiFill } from "../hooks/useAiFill";
import type { SavedWordDto } from "../types/vocabulary.types";
import { FIELD_LABELS } from "../utils/enrichment-format";
import { getErrorStatus, getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import styles from "./AiFillButton.module.css";

interface AiFillButtonProps {
  saved: SavedWordDto;
}

/** Sparkles button that fills the blank fields of a custom word with AI. */
export function AiFillButton({ saved }: AiFillButtonProps) {
  const aiFill = useAiFill();
  const { headword } = saved.word;

  const fill = () =>
    aiFill.mutate(saved.id, {
      onSuccess: (result) =>
        toast(
          result.filled.length > 0
            ? `${headword}: ${result.filled.map((field) => FIELD_LABELS[field] ?? field).join(", ")}`
            : `${headword}: không có trường mới`,
          result.filled.length > 0 ? "pink" : "neutral",
        ),
      onError: (error) =>
        toast(
          getErrorStatus(error) === 429
            ? "AI đang bận, thử lại sau"
            : getVocabularyErrorMessage(error),
          "rose",
        ),
    });

  return (
    <IconButton
      label="Điền bằng AI"
      size="sm"
      className={styles.button}
      data-busy={aiFill.isPending || undefined}
      disabled={aiFill.isPending}
      onClick={fill}
    >
      <Sparkles size={16} />
    </IconButton>
  );
}
