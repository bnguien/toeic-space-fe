import { FolderInput, Pencil, Sparkles, Trash2 } from "lucide-react";

import { Badge, Card, IconButton, Menu, toast, type MenuItem } from "@/shared/components/ui";

import { useAiFill } from "../hooks/useAiFill";
import type { SavedWordDto } from "../types/vocabulary.types";
import { FIELD_LABELS } from "../utils/enrichment-format";
import { getErrorStatus, getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { describeProgress } from "../utils/vocabulary-format";
import styles from "./SavedWordCard.module.css";
import { WordView } from "./WordView";

interface SavedWordCardProps {
  saved: SavedWordDto;
  folderName?: string;
  onEdit: () => void;
  onMove: () => void;
  onRemove: () => void;
  selected: boolean;
  /** Any card selected: checkboxes stay visible. */
  selecting: boolean;
  /** `range` = shift-click. */
  onToggleSelect: (range: boolean) => void;
}

/** Library word card: compact WordView + status + actions. */
export function SavedWordCard({
  saved,
  folderName,
  onEdit,
  onMove,
  onRemove,
  selected,
  selecting,
  onToggleSelect,
}: SavedWordCardProps) {
  const status = describeProgress(saved.progress);
  const aiFill = useAiFill();
  const { word } = saved;
  const hasBlank =
    saved.isCustom &&
    [word.phonetic, word.definitionEn, word.example, word.exampleVi].some(
      (value) => !value?.trim(),
    );

  const fill = () =>
    aiFill.mutate(saved.id, {
      onSuccess: (result) =>
        toast(
          result.filled.length > 0
            ? `${word.headword}: ${result.filled.map((field) => FIELD_LABELS[field] ?? field).join(", ")}`
            : `${word.headword}: không có trường mới`,
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
  const items: MenuItem[] = [
    { label: saved.isCustom ? "Sửa từ" : "Ghi chú", icon: <Pencil size={14} />, onSelect: onEdit },
    { label: "Chuyển thư mục", icon: <FolderInput size={14} />, onSelect: onMove },
    {
      label: saved.isCustom ? "Xoá từ" : "Bỏ lưu",
      icon: <Trash2 size={14} />,
      tone: "danger",
      onSelect: onRemove,
    },
  ];

  return (
    <Card
      as="article"
      variant="outline"
      padding="sm"
      className={styles.card}
      data-selected={selected || undefined}
      data-selecting={selecting || undefined}
    >
      <div className={styles.top}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Chọn ${word.headword}`}
            onChange={() => undefined}
            onClick={(event) => onToggleSelect(event.shiftKey)}
          />
        </label>
        <div className={styles.badges}>
          <Badge tone={status.tone}>{status.label}</Badge>
          {saved.isCustom && <Badge tone="pink">Tự thêm</Badge>}
        </div>
        <div className={styles.tools}>
          {hasBlank && (
            <IconButton
              label="Điền bằng AI"
              size="sm"
              className={styles.ai}
              data-busy={aiFill.isPending || undefined}
              disabled={aiFill.isPending}
              onClick={fill}
            >
              <Sparkles size={16} />
            </IconButton>
          )}
          <Menu label={`Thao tác ${saved.word.headword}`} items={items} />
        </div>
      </div>
      <WordView word={saved.word} density="card" compact />
      {(saved.note || folderName) && (
        <div className={styles.foot}>
          {folderName && <Badge truncate>{folderName}</Badge>}
          {saved.note && <p className={styles.note}>{saved.note}</p>}
        </div>
      )}
    </Card>
  );
}
