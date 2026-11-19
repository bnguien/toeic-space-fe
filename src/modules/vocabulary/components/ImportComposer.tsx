import { useId, useState, type ChangeEvent } from "react";
import { ArrowLeft, ClipboardCopy, Eye, RotateCcw, Upload } from "lucide-react";

import {
  Badge,
  Button,
  Field,
  ProgressBar,
  Segmented,
  TextArea,
  toast,
} from "@/shared/components/ui";

import { useImportWords, type ImportTarget } from "../hooks/useImportWords";
import { useParseImport } from "../hooks/useParseImport";
import type {
  FolderDto,
  ImportItem,
  ImportPreviewItem,
  ImportRejectedLine,
} from "../types/vocabulary.types";
import { AI_IMPORT_PROMPT } from "../utils/ai-import-prompt";
import { describeCode } from "../utils/enrichment-format";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { formatCount } from "../utils/vocabulary-format";
import { FolderPicker } from "./FolderPicker";
import styles from "./ImportComposer.module.css";
import { ImportPreviewList, type PreviewRow } from "./ImportPreviewList";

const MAX_INPUT = 20_000;

type TargetMode = "folder" | "groups";

interface Preview {
  rows: PreviewRow[];
  rejected: ImportRejectedLine[];
}

interface ImportComposerProps {
  format: "text" | "json";
  folders: FolderDto[];
  folderId: string | null;
  onFolderChange: (folderId: string | null) => void;
  /** Reports whether an import is running (the sheet stays open meanwhile). */
  onBusyChange?: (busy: boolean) => void;
}

const toImportItem = (item: ImportPreviewItem): ImportItem => ({
  headword: item.headword,
  meaningVi: item.meaningVi,
  phonetic: item.phonetic,
  partOfSpeech: item.partOfSpeech,
  example: item.example,
  exampleVi: item.exampleVi,
  category: item.category,
});

/** Paste (or upload) → server preview → batched import with progress and retry. */
export function ImportComposer({
  format,
  folders,
  folderId,
  onFolderChange,
  onBusyChange,
}: ImportComposerProps) {
  const inputId = useId();
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>("folder");
  const parse = useParseImport();
  const importer = useImportWords();
  const { state: run } = importer;
  const running = run.status === "running";

  const hasCategories = !!preview?.rows.some((row) => row.item.category);
  const chosen = preview?.rows.filter((row) => row.selected && !row.removed) ?? [];
  const target: ImportTarget = {
    folderId,
    createFoldersFromCategories: hasCategories && targetMode === "groups",
  };

  const setRows = (update: (row: PreviewRow) => PreviewRow, key: string) =>
    setPreview((current) =>
      current
        ? { ...current, rows: current.rows.map((row) => (row.key === key ? update(row) : row)) }
        : current,
    );

  const showPreview = () => {
    const raw = input.trim();
    if (!raw || parse.isPending) return;
    parse.mutate(format === "json" ? { json: raw } : { text: raw }, {
      onSuccess: (result) =>
        setPreview({
          rows: result.items.map((item, index) => ({
            key: `${item.line}-${index}`,
            item,
            selected: !item.duplicate,
            removed: false,
          })),
          rejected: result.rejected,
        }),
    });
  };

  const start = async (items: ImportItem[]) => {
    onBusyChange?.(true);
    await importer.run(items, target);
    onBusyChange?.(false);
  };

  const backToInput = () => {
    setPreview(null);
    importer.reset();
    parse.reset();
  };

  const startOver = () => {
    setInput("");
    backToInput();
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    setInput(text.slice(0, MAX_INPUT));
    setPreview(null);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      toast("Đã sao chép prompt", "green");
    } catch {
      toast("Không sao chép được", "rose");
    }
  };

  // Finished run: results and failed rows.
  if (run.status === "done") {
    return (
      <div className={styles.composer}>
        <div className={styles.result}>
          <Badge tone="green" size="md">
            {formatCount(run.created)} mới
          </Badge>
          <Badge tone="blue" size="md">
            {formatCount(run.updated)} cập nhật
          </Badge>
          {run.failed.length > 0 && (
            <Badge tone="rose" size="md">
              {formatCount(run.failed.length)} lỗi
            </Badge>
          )}
        </div>
        {run.failed.length > 0 && (
          <ul className={styles.failed}>
            {run.failed.map((row, index) => (
              <li key={`${row.item.headword}-${index}`}>
                <span className={styles.failedWord} lang="en">
                  {row.item.headword}
                </span>
                <span className={styles.failedCode}>{describeCode(row.code)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          <Button variant="outline" onClick={startOver}>
            Thêm danh sách khác
          </Button>
          {run.failed.length > 0 && (
            <Button
              variant="primary"
              icon={<RotateCcw size={16} />}
              onClick={() => void start(run.failed.map((row) => row.item))}
            >
              Thử lại {run.failed.length}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className={styles.composer}>
        <div className={styles.counts}>
          <Badge size="md">{formatCount(preview.rows.length)} dòng</Badge>
          <Badge tone="blue" size="md">
            {formatCount(chosen.length)} đã chọn
          </Badge>
        </div>

        <ImportPreviewList
          rows={preview.rows}
          rejected={preview.rejected}
          disabled={running}
          onToggle={(key) => setRows((row) => ({ ...row, selected: !row.selected }), key)}
          onRemove={(key) => setRows((row) => ({ ...row, removed: true }), key)}
          onRestore={(key) => setRows((row) => ({ ...row, removed: false }), key)}
        />

        <div className={styles.target}>
          {hasCategories && (
            <Segmented<TargetMode>
              label="Nơi lưu"
              size="sm"
              value={targetMode}
              onChange={setTargetMode}
              options={[
                { value: "folder", label: "Một thư mục" },
                { value: "groups", label: "Tạo thư mục theo nhóm" },
              ]}
            />
          )}
          {!target.createFoldersFromCategories && (
            <Field label="Thư mục" htmlFor={`${inputId}-folder`}>
              <FolderPicker
                id={`${inputId}-folder`}
                folders={folders}
                value={folderId}
                onChange={onFolderChange}
                disabled={running}
              />
            </Field>
          )}
        </div>

        {running && (
          <div className={styles.progress}>
            <ProgressBar value={run.done} max={run.total} size="md" label="Tiến độ lưu" />
            <span className={styles.progressCount}>
              {formatCount(run.done)}/{formatCount(run.total)}
            </span>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={backToInput}
            disabled={running}
          >
            Sửa
          </Button>
          <Button
            variant="primary"
            disabled={running || chosen.length === 0}
            onClick={() => void start(chosen.map((row) => toImportItem(row.item)))}
          >
            Lưu {formatCount(chosen.length)} từ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.composer}>
      {format === "json" && (
        <div className={styles.tools}>
          <label className={styles.upload}>
            <Upload size={16} />
            <span>Tải tệp .json</span>
            <input type="file" accept=".json,application/json" onChange={(e) => void upload(e)} />
          </label>
          <Button
            variant="mark"
            size="sm"
            icon={<ClipboardCopy size={16} />}
            onClick={() => void copyPrompt()}
          >
            Sao chép prompt AI
          </Button>
        </div>
      )}

      <Field
        label={format === "json" ? "JSON" : "Danh sách từ"}
        htmlFor={inputId}
        meta={`${formatCount(input.length)}/${formatCount(MAX_INPUT)}`}
        error={parse.isError ? getVocabularyErrorMessage(parse.error) : null}
      >
        <TextArea
          id={inputId}
          className={styles.input}
          rows={14}
          value={input}
          maxLength={MAX_INPUT}
          spellCheck={false}
          lang={format === "json" ? undefined : "en"}
          placeholder={
            format === "json"
              ? '[{ "category": "…", "words": [{ "word": "…", "meaning": "…" }] }]'
              : "negotiate - đàm phán\ndeadline: hạn chót\ninvoice, receipt, refund"
          }
          onChange={(event) => setInput(event.target.value)}
        />
      </Field>

      <div className={styles.actions}>
        <Button
          variant="primary"
          icon={<Eye size={16} />}
          disabled={!input.trim() || parse.isPending}
          onClick={showPreview}
        >
          Xem trước
        </Button>
      </div>
    </div>
  );
}
