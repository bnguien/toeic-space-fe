import { useState } from "react";
import { FolderInput, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import searchMascot from "@/assets/mascot/oy2-search.png";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Menu,
  SelectionBar,
  type MenuItem,
} from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import { useRemoveSavedWords } from "../hooks/useRemoveSavedWords";
import { useSavedWords } from "../hooks/useSavedWords";
import { useStartStudy, type StudySelection } from "../hooks/useStartStudy";
import type { LibraryDto, LibraryScope, SavedWordDto } from "../types/vocabulary.types";
import { canAiFill } from "../utils/enrichment-format";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { describeProgress } from "../utils/vocabulary-format";
import { AiFillButton } from "./AiFillButton";
import styles from "./LibraryView.module.css";
import { LibraryHeader } from "./LibraryHeader";
import { MoveWordDialog } from "./MoveWordDialog";
import { Pager } from "./Pager";
import { StudyModeChooser } from "./StudyModeChooser";
import { WordDialog } from "./WordDialog";
import { WordEditButton } from "./WordEditButton";
import { WordGrid, WordGridSkeleton } from "./WordGrid";
import { WordTile } from "./WordTile";

const PAGE_SIZE = 60;

type Dialog =
  | { kind: "edit"; saved: SavedWordDto }
  | { kind: "move"; saved: SavedWordDto[] }
  | { kind: "remove"; saved: SavedWordDto[] }
  | { kind: "study" };

interface LibraryViewProps {
  scope: LibraryScope;
  library: LibraryDto | undefined;
  /** Opens the "Thêm từ" sheet. */
  onAddWords: () => void;
}

const scopeTitle = (scope: LibraryScope, library: LibraryDto | undefined): string => {
  if (scope.kind === "all") return "Tất cả";
  if (scope.kind === "unfiled") return "Chưa phân loại";
  return library?.folders.find((folder) => folder.id === scope.folderId)?.name ?? "Thư mục";
};

/**
 * "Của tôi": saved and custom words of one scope as a grid of word tiles. Studying starts from a
 * selection (selection bar → mode chooser). Remount per scope (key).
 */
export function LibraryView({ scope, library, onAddWords }: LibraryViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const removeMany = useRemoveSavedWords();
  const startStudy = useStartStudy();

  const wordsQuery = useSavedWords({ scope, search, page, pageSize: PAGE_SIZE }, true);
  const folders = library?.folders ?? [];
  const loaded = wordsQuery.data?.items ?? [];
  const items = status
    ? loaded.filter((saved) => describeProgress(saved.progress).label === status)
    : loaded;
  const totalCount = wordsQuery.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const scopeCount =
    scope.kind === "all"
      ? (library?.total ?? totalCount)
      : scope.kind === "unfiled"
        ? (library?.unfiled.wordCount ?? totalCount)
        : (folders.find((folder) => folder.id === scope.folderId)?.wordCount ?? totalCount);

  const selection = useSelection(items.map((saved) => saved.id));
  const selected = items.filter((saved) => selection.isSelected(saved.id));

  /** Whole scope selected (no search/filter, one page) → study the source itself. */
  const studySelection = (): StudySelection => {
    const wholeScope =
      selection.allSelected && !search && !status && pageCount === 1 && scope.kind !== "unfiled";
    if (wholeScope && scope.kind === "folder") return { folderId: scope.folderId };
    if (wholeScope && scope.kind === "all") return { library: true };
    return { wordIds: selected.map((saved) => saved.word.id) };
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    selection.clear();
  };
  const changeStatus = (value: string) => {
    setStatus(value);
    selection.clear();
  };
  const clearFilters = () => {
    changeSearch("");
    setStatus("");
  };
  const changePage = (next: number) => {
    setPage(next);
    selection.clear();
  };

  const menuItems = (saved: SavedWordDto): MenuItem[] => [
    ...(saved.isCustom
      ? [
          {
            label: "Sửa từ",
            icon: <Pencil size={14} />,
            onSelect: () => setDialog({ kind: "edit", saved }),
          } satisfies MenuItem,
        ]
      : []),
    {
      label: "Chuyển thư mục",
      icon: <FolderInput size={14} />,
      onSelect: () => setDialog({ kind: "move", saved: [saved] }),
    },
    {
      label: saved.isCustom ? "Xoá từ" : "Bỏ lưu",
      icon: <Trash2 size={14} />,
      tone: "danger",
      onSelect: () => setDialog({ kind: "remove", saved: [saved] }),
    },
  ];

  return (
    <section className={styles.view} aria-labelledby="library-title">
      <LibraryHeader
        titleId="library-title"
        title={scopeTitle(scope, library)}
        count={scopeCount}
        search={search}
        onSearch={changeSearch}
        status={status}
        onStatusChange={changeStatus}
        trailing={
          <Button variant="tone" icon={<Plus size={16} />} onClick={onAddWords}>
            Thêm từ
          </Button>
        }
      />

      {wordsQuery.isPending ? (
        <WordGridSkeleton />
      ) : wordsQuery.isError ? (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(wordsQuery.error)}
          onRetry={() => void wordsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        search.trim() || status ? (
          <EmptyState
            image={searchMascot}
            title="Không tìm thấy từ"
            action={
              <Button variant="outline" onClick={clearFilters}>
                Bỏ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            image={emptyMascot}
            title="Chưa có từ nào"
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={onAddWords}>
                Thêm từ
              </Button>
            }
          />
        )
      ) : (
        <>
          <WordGrid label={scopeTitle(scope, library)} stale={wordsQuery.isPlaceholderData}>
            {items.map((saved) => {
              const progress = describeProgress(saved.progress);
              return (
                <li key={saved.id}>
                  <WordTile
                    word={saved.word}
                    status={
                      <>
                        <Badge tone={progress.tone}>{progress.label}</Badge>
                        {saved.isCustom && <Badge tone="pink">Tự thêm</Badge>}
                      </>
                    }
                    actions={
                      <>
                        {canAiFill(saved) && <AiFillButton saved={saved} />}
                        <WordEditButton word={{ ...saved.word, note: saved.note }} />
                        <Menu label={`Thao tác ${saved.word.headword}`} items={menuItems(saved)} />
                      </>
                    }
                    selected={selection.isSelected(saved.id)}
                    selecting={selection.count > 0}
                    onToggleSelect={(range) => selection.toggle(saved.id, range)}
                  />
                </li>
              );
            })}
          </WordGrid>

          <Pager page={page} pageCount={pageCount} onChange={changePage} />

          {selection.count > 0 && (
            <SelectionBar
              sticky
              count={selection.count}
              total={selection.total}
              onSelectAll={selection.selectAll}
              onClear={selection.clear}
              actions={
                <>
                  <IconButton
                    label="Chuyển thư mục"
                    variant="outline"
                    onClick={() => setDialog({ kind: "move", saved: selected })}
                  >
                    <FolderInput size={18} />
                  </IconButton>
                  <IconButton
                    label="Xoá khỏi kho"
                    variant="outline"
                    onClick={() => setDialog({ kind: "remove", saved: selected })}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                  <Button
                    variant="primary"
                    icon={<GraduationCap size={18} />}
                    onClick={() => setDialog({ kind: "study" })}
                  >
                    Luyện tập
                  </Button>
                </>
              }
            />
          )}
        </>
      )}

      {dialog?.kind === "study" && (
        <StudyModeChooser
          count={selection.count}
          onClose={() => setDialog(null)}
          onChoose={(mode) => startStudy(mode, studySelection())}
        />
      )}
      {dialog?.kind === "edit" && (
        <WordDialog
          key={dialog.saved.id}
          savedWord={dialog.saved}
          folders={folders}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "move" && (
        <MoveWordDialog
          savedWords={dialog.saved}
          folders={folders}
          onClose={() => setDialog(null)}
          onMoved={() => selection.clear()}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "remove"}
        title={
          dialog?.kind === "remove"
            ? dialog.saved.length === 1
              ? (dialog.saved[0]?.word.headword ?? "")
              : `${dialog.saved.length} từ`
            : ""
        }
        description={
          dialog?.kind === "remove" && dialog.saved.some((saved) => saved.isCustom)
            ? "Từ tự thêm bị xoá cùng tiến độ"
            : undefined
        }
        confirmLabel="Xoá khỏi kho"
        tone="danger"
        pending={removeMany.isPending}
        error={removeMany.isError ? getVocabularyErrorMessage(removeMany.error) : null}
        onClose={() => {
          removeMany.reset();
          setDialog(null);
        }}
        onConfirm={() => {
          if (dialog?.kind !== "remove") return;
          const ids = dialog.saved.map((saved) => saved.id);
          removeMany.mutate(ids, {
            onSuccess: () => {
              selection.deselect(ids);
              setDialog(null);
            },
          });
        }}
      />
    </section>
  );
}
