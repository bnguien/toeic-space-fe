import { useState, type FormEvent } from "react";

import { Button, Field, Modal, TextInput } from "@/shared/components/ui";

import { useCreateFolder } from "../hooks/useCreateFolder";
import { useRenameFolder } from "../hooks/useRenameFolder";
import type { FolderDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";

const MAX_NAME = 60;

interface FolderDialogProps {
  /** Folder to rename; omit to create one. */
  folder?: FolderDto;
  onClose: () => void;
  onSaved?: (folder: FolderDto) => void;
}

/** New / rename folder. Mount when open (key by folder id) so the form starts fresh. */
export function FolderDialog({ folder, onClose, onSaved }: FolderDialogProps) {
  const [name, setName] = useState(folder?.name ?? "");
  const create = useCreateFolder();
  const rename = useRenameFolder();
  const mutation = folder ? rename : create;
  const trimmed = name.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed || mutation.isPending) return;
    const done = (saved: FolderDto) => {
      onSaved?.(saved);
      onClose();
    };
    if (folder) rename.mutate({ folderId: folder.id, name: trimmed }, { onSuccess: done });
    else create.mutate(trimmed, { onSuccess: done });
  };

  return (
    <Modal
      open
      title={folder ? "Đổi tên thư mục" : "Thư mục mới"}
      busy={mutation.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="folder-form"
            variant="primary"
            disabled={!trimmed || mutation.isPending}
          >
            {folder ? "Lưu" : "Tạo"}
          </Button>
        </>
      }
    >
      <form id="folder-form" onSubmit={submit}>
        <Field
          label="Tên thư mục"
          htmlFor="folder-name"
          meta={`${trimmed.length}/${MAX_NAME}`}
          error={mutation.isError ? getVocabularyErrorMessage(mutation.error) : null}
        >
          <TextInput
            id="folder-name"
            value={name}
            maxLength={MAX_NAME}
            autoFocus
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
