import { Folder, FolderPlus, Inbox, Library, Pencil, Trash2 } from "lucide-react";

import { Button, Menu, Skeleton } from "@/shared/components/ui";

import type { FolderDto, LibraryDto } from "../types/vocabulary.types";
import { formatCount } from "../utils/vocabulary-format";
import styles from "./LibrarySidebar.module.css";
import { SidebarRow } from "./SidebarRow";

/** "all" | "unfiled" | folder id */
export type LibrarySelection = string;

interface LibrarySidebarProps {
  library: LibraryDto | undefined;
  loading: boolean;
  value: LibrarySelection;
  onChange: (selection: LibrarySelection) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: FolderDto) => void;
  onDeleteFolder: (folder: FolderDto) => void;
}

/** Library scopes in the same compact rows as the stages. */
export function LibrarySidebar({
  library,
  loading,
  value,
  onChange,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: LibrarySidebarProps) {
  if (loading) {
    return (
      <div className={styles.list} aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} height={40} />
        ))}
      </div>
    );
  }

  const folders = [...(library?.folders ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.panel}>
      <nav className={styles.list} aria-label="Thư mục">
        <SidebarRow
          leading={<Library size={14} />}
          label="Tất cả"
          meta={formatCount(library?.total ?? 0)}
          selected={value === "all"}
          onClick={() => onChange("all")}
        />
        <SidebarRow
          leading={<Inbox size={14} />}
          label="Chưa phân loại"
          meta={formatCount(library?.unfiled.wordCount ?? 0)}
          selected={value === "unfiled"}
          onClick={() => onChange("unfiled")}
        />
        {folders.map((folder) => (
          <SidebarRow
            key={folder.id}
            leading={<Folder size={14} />}
            label={<span>{folder.name}</span>}
            title={folder.name}
            meta={formatCount(folder.wordCount)}
            selected={value === folder.id}
            onClick={() => onChange(folder.id)}
            trailing={
              <Menu
                label={`Thao tác thư mục ${folder.name}`}
                items={[
                  {
                    label: "Đổi tên",
                    icon: <Pencil size={14} />,
                    onSelect: () => onRenameFolder(folder),
                  },
                  {
                    label: "Xoá thư mục",
                    icon: <Trash2 size={14} />,
                    tone: "danger",
                    onSelect: () => onDeleteFolder(folder),
                  },
                ]}
              />
            }
          />
        ))}
      </nav>
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          icon={<FolderPlus size={16} />}
          onClick={onCreateFolder}
        >
          Thư mục mới
        </Button>
      </div>
    </div>
  );
}
