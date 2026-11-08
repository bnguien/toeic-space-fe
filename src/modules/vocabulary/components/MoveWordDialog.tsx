import { useState } from "react";
import { Folder, Inbox } from "lucide-react";

import { Button, Modal } from "@/shared/components/ui";

import { useMoveSavedWords } from "../hooks/useMoveSavedWords";
import type { FolderDto, SavedWordDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import styles from "./MoveWordDialog.module.css";

interface MoveWordDialogProps {
  /** One or more saved words. */
  savedWords: SavedWordDto[];
  folders: FolderDto[];
  onClose: () => void;
  onMoved?: () => void;
}

/** Picks the folder of one or more saved words. Mount when open. */
export function MoveWordDialog({ savedWords, folders, onClose, onMoved }: MoveWordDialogProps) {
  const sameFolder = savedWords.every((saved) => saved.folderId === savedWords[0]?.folderId);
  const current = sameFolder ? (savedWords[0]?.folderId ?? null) : undefined;
  const [target, setTarget] = useState<string | null | undefined>(current);
  const move = useMoveSavedWords();

  const options = [
    { id: null, name: "Chưa phân loại", icon: <Inbox size={16} /> },
    ...[...folders]
      .sort((a, b) => a.order - b.order)
      .map((folder) => ({ id: folder.id, name: folder.name, icon: <Folder size={16} /> })),
  ];

  const submit = () => {
    if (target === undefined) return;
    move.mutate(
      { savedWordIds: savedWords.map((saved) => saved.id), folderId: target },
      {
        onSuccess: () => {
          onMoved?.();
          onClose();
        },
      },
    );
  };

  const title =
    savedWords.length === 1
      ? (savedWords[0]?.word.headword ?? "")
      : `Chuyển ${savedWords.length} từ`;

  return (
    <Modal
      open
      title={title}
      busy={move.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={move.isPending}>
            Huỷ
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={move.isPending || target === undefined || target === current}
          >
            Chuyển
          </Button>
        </>
      }
    >
      <div className={styles.list} role="radiogroup" aria-label="Thư mục">
        {options.map((option) => (
          <button
            key={option.id ?? "unfiled"}
            type="button"
            role="radio"
            aria-checked={target === option.id}
            className={styles.option}
            onClick={() => setTarget(option.id)}
          >
            {option.icon}
            <span>{option.name}</span>
          </button>
        ))}
      </div>
      {move.isError && (
        <p className={styles.error} role="alert">
          {getVocabularyErrorMessage(move.error)}
        </p>
      )}
    </Modal>
  );
}
