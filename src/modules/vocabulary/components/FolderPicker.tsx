import { useState, type KeyboardEvent } from "react";
import { Check, FolderPlus, X } from "lucide-react";

import { Select, type SelectOption } from "@/shared/components/Select";
import { IconButton, TextInput } from "@/shared/components/ui";

import { useCreateFolder } from "../hooks/useCreateFolder";
import type { FolderDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import styles from "./FolderPicker.module.css";

const UNFILED = "unfiled";
const MAX_NAME = 60;

interface FolderPickerProps {
  id?: string;
  folders: FolderDto[];
  /** null = "Chưa phân loại". */
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabled?: boolean;
}

/** Single-folder select with an inline "Thư mục mới". */
export function FolderPicker({
  id,
  folders,
  value,
  onChange,
  disabled = false,
}: FolderPickerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateFolder();

  const options: SelectOption[] = [
    { value: UNFILED, label: "Chưa phân loại" },
    ...[...folders]
      .sort((a, b) => a.order - b.order)
      .map((folder) => ({ value: folder.id, label: folder.name })),
  ];
  const known = value === null || folders.some((folder) => folder.id === value);

  const close = () => {
    setCreating(false);
    setName("");
    create.reset();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || create.isPending) return;
    create.mutate(trimmed, {
      onSuccess: (folder) => {
        onChange(folder.id);
        close();
      },
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  if (creating) {
    return (
      <div className={styles.picker}>
        <div className={styles.row}>
          <TextInput
            className={styles.grow}
            value={name}
            maxLength={MAX_NAME}
            autoFocus
            placeholder="Tên thư mục"
            aria-label="Tên thư mục mới"
            invalid={create.isError}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <IconButton
            label="Tạo thư mục"
            variant="primary"
            disabled={!name.trim() || create.isPending}
            onClick={submit}
          >
            <Check size={16} />
          </IconButton>
          <IconButton label="Huỷ" variant="outline" onClick={close} disabled={create.isPending}>
            <X size={16} />
          </IconButton>
        </div>
        {create.isError && (
          <span className={styles.error} role="alert">
            {getVocabularyErrorMessage(create.error)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <Select
        id={id}
        className={styles.grow}
        value={known && value ? value : UNFILED}
        options={options}
        disabled={disabled}
        onChange={(next) => onChange(next === UNFILED ? null : next)}
      />
      <IconButton
        label="Thư mục mới"
        variant="outline"
        disabled={disabled}
        onClick={() => setCreating(true)}
      >
        <FolderPlus size={16} />
      </IconButton>
    </div>
  );
}
