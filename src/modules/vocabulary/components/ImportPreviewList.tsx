import { RotateCcw, X } from "lucide-react";

import { Badge, IconButton } from "@/shared/components/ui";

import type { ImportPreviewItem, ImportRejectedLine } from "../types/vocabulary.types";
import { describeCode } from "../utils/enrichment-format";
import { formatPartOfSpeech } from "../utils/vocabulary-format";
import styles from "./ImportPreviewList.module.css";

export interface PreviewRow {
  key: string;
  item: ImportPreviewItem;
  selected: boolean;
  removed: boolean;
}

interface ImportPreviewListProps {
  rows: PreviewRow[];
  rejected: ImportRejectedLine[];
  disabled?: boolean;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onRestore: (key: string) => void;
}

/** Preview cards of parsed items with select / remove / restore, plus rejected lines. */
export function ImportPreviewList({
  rows,
  rejected,
  disabled = false,
  onToggle,
  onRemove,
  onRestore,
}: ImportPreviewListProps) {
  const active = rows.filter((row) => !row.removed);
  const removed = rows.filter((row) => row.removed);

  return (
    <div className={styles.preview}>
      <ul className={styles.list}>
        {active.map(({ key, item, selected }) => (
          <li key={key} className={styles.card} data-selected={selected || undefined}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => onToggle(key)}
              />
              <span className={styles.main}>
                <span className={styles.head}>
                  <span className={styles.headword} lang="en">
                    {item.headword}
                  </span>
                  {item.phonetic && <span className={styles.muted}>{item.phonetic}</span>}
                  {item.partOfSpeech && (
                    <Badge tone="blue">{formatPartOfSpeech(item.partOfSpeech)}</Badge>
                  )}
                  {item.duplicate && <Badge tone="rose">Trùng</Badge>}
                  {item.existing && <Badge tone="pearl">Đã có</Badge>}
                  {item.category && (
                    <Badge tone="pink" truncate title={item.category}>
                      {item.category}
                    </Badge>
                  )}
                </span>
                {item.meaningVi && <span className={styles.meaning}>{item.meaningVi}</span>}
              </span>
            </label>
            <IconButton
              label={`Bỏ ${item.headword}`}
              size="sm"
              disabled={disabled}
              onClick={() => onRemove(key)}
            >
              <X size={16} />
            </IconButton>
          </li>
        ))}
      </ul>

      {removed.length > 0 && (
        <section className={styles.group} aria-label="Đã bỏ">
          <h3 className={styles.groupTitle}>Đã bỏ · {removed.length}</h3>
          <ul className={styles.chips}>
            {removed.map(({ key, item }) => (
              <li key={key}>
                <button
                  type="button"
                  className={styles.restore}
                  disabled={disabled}
                  onClick={() => onRestore(key)}
                >
                  <RotateCcw size={12} />
                  {item.headword}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rejected.length > 0 && (
        <section className={styles.group} aria-label="Dòng bị loại">
          <h3 className={styles.groupTitle}>Dòng bị loại · {rejected.length}</h3>
          <ul className={styles.rejected}>
            {rejected.map((line) => (
              <li key={`${line.line}-${line.text}`}>
                <span className={styles.lineNo}>{line.line}</span>
                <span className={styles.lineText}>{line.text}</span>
                <Badge>{describeCode(line.code)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
