import { useState } from "react";

import { Segmented, Sheet } from "@/shared/components/ui";

import { useVocabularyPreferences } from "../hooks/useVocabularyPreferences";
import type { FolderDto } from "../types/vocabulary.types";
import styles from "./AddWordsSheet.module.css";
import { ImportComposer } from "./ImportComposer";
import { SingleWordForm } from "./SingleWordForm";

type Tab = "single" | "list" | "json";

const TABS = [
  { value: "single", label: "Một từ" },
  { value: "list", label: "Dán danh sách" },
  { value: "json", label: "JSON" },
] as const;

interface AddWordsSheetProps {
  open: boolean;
  folders: FolderDto[];
  /** Folder to start with (e.g. the folder being viewed); else the last one used. */
  initialFolderId?: string | null;
  onClose: () => void;
}

/** "Thêm từ": right-side sheet with single lookup, pasted list and JSON import. */
export function AddWordsSheet({ open, folders, initialFolderId, onClose }: AddWordsSheetProps) {
  const [tab, setTab] = useState<Tab>("single");
  const [busy, setBusy] = useState(false);
  const { preferences, update } = useVocabularyPreferences();
  const [chosenFolder, setChosenFolder] = useState<string | null | undefined>(undefined);

  const folderId =
    chosenFolder !== undefined
      ? chosenFolder
      : (initialFolderId ?? preferences.lastFolderPickerId ?? null);
  const changeFolder = (next: string | null) => {
    setChosenFolder(next);
    update({ lastFolderPickerId: next });
  };

  const shared = { folders, folderId, onFolderChange: changeFolder };

  return (
    <Sheet
      open={open}
      title="Thêm từ"
      busy={busy}
      onClose={onClose}
      header={
        <Segmented<Tab>
          label="Cách thêm"
          value={tab}
          onChange={setTab}
          options={TABS}
          className={styles.tabs}
        />
      }
    >
      {tab === "single" && <SingleWordForm {...shared} />}
      {tab === "list" && (
        <ImportComposer key="list" format="text" onBusyChange={setBusy} {...shared} />
      )}
      {tab === "json" && (
        <ImportComposer key="json" format="json" onBusyChange={setBusy} {...shared} />
      )}
    </Sheet>
  );
}
