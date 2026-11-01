import { useState } from "react";
import { ChevronLeft, ChevronRight, FolderInput, GraduationCap, Plus, Trash2 } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import searchMascot from "@/assets/mascot/oy2-search.png";
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  DataToolbar,
  EmptyState,
  ErrorState,
  IconButton,
  SelectionBar,
  Skeleton,
  type FilterField,
} from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import { useRemoveSavedWords } from "../hooks/useRemoveSavedWords";
import { useSavedWords } from "../hooks/useSavedWords";
import { useStartStudy, type StudySelection } from "../hooks/useStartStudy";
import type { LibraryDto, LibraryScope, SavedWordDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { describeProgress, formatCount } from "../utils/vocabulary-format";
import styles from "./LibraryView.module.css";
import { MoveWordDialog } from "./MoveWordDialog";
import { SavedWordCard } from "./SavedWordCard";
import { StudyModeChooser } from "./StudyModeChooser";
import { WordDialog } from "./WordDialog";

const PAGE_SIZE = 60;

/** Client-side status filter over the loaded page (the API filters by scope and search). */
const STATUS_FILTER: FilterField["options"] = [
  { value: "", label: "Tất cả" },
  { value: "Mới", label: "Mới" },
  { value: "Đang học", label: "Đang học" },
  { value: "Đã thuộc", label: "Đã thuộc" },
  { value: "Đến hạn", label: "Đến hạn" },
];

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
 * "Của tôi": saved and custom words of one scope. Studying starts from a selection
 * (selection bar → mode chooser). Remount per scope (key).
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
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
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

  return (
    <section className={styles.view} aria-labelledby="library-title">
      <div className={styles.head}>
        <h1 id="library-title" className={styles.title}>
          {scopeTitle(scope, library)}
        </h1>
        <Badge size="md">{formatCount(scopeCount)} từ</Badge>
        <DataToolbar
          className={styles.toolbar}
          search={search}
          onSearch={changeSearch}
          placeholder="Tìm từ hoặc nghĩa"
          filters={[{ key: "status", label: "Trạng thái", value: status, options: STATUS_FILTER }]}
          onFilterChange={(_, value) => {
            setStatus(value);
            selection.clear();
          }}
          onClearFilters={() => setStatus("")}
          trailing={
            <Button variant="tone" icon={<Plus size={16} />} onClick={onAddWords}>
              Thêm từ
            </Button>
          }
        />
      </div>

      {wordsQuery.isPending ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="block" height={200} />
          ))}
        </div>
      ) : wordsQuery.isError ? (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(wordsQuery.error)}
          onRetry={() => void wordsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        search.trim() || status ? (
          <EmptyState image={searchMascot} title="Không tìm thấy từ" />
        ) : (
          <EmptyState
            image={emptyMascot}
            title="Chưa có từ nào"
            action={
              <>
                <Button variant="primary" icon={<Plus size={16} />} onClick={onAddWords}>
                  Thêm từ
                </Button>
                <ButtonLink to="/vocabulary" variant="outline">
                  Bộ từ vựng
                </ButtonLink>
              </>
            }
          />
        )
      ) : (
        <>
          <ul className={styles.grid} data-stale={wordsQuery.isPlaceholderData || undefined}>
            {items.map((saved) => (
              <li key={saved.id}>
                <SavedWordCard
                  saved={saved}
                  folderName={
                    scope.kind === "folder" || !saved.folderId
                      ? undefined
                      : folderNames.get(saved.folderId)
                  }
                  selected={selection.isSelected(saved.id)}
                  selecting={selection.count > 0}
                  onToggleSelect={(range) => selection.toggle(saved.id, range)}
                  onEdit={() => setDialog({ kind: "edit", saved })}
                  onMove={() => setDialog({ kind: "move", saved: [saved] })}
                  onRemove={() => setDialog({ kind: "remove", saved: [saved] })}
                />
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <nav className={styles.pager} aria-label="Trang">
              <IconButton
                label="Trang trước"
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  setPage((value) => value - 1);
                  selection.clear();
                }}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <span className={styles.pageLabel}>
                {page}/{pageCount}
              </span>
              <IconButton
                label="Trang sau"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => {
                  setPage((value) => value + 1);
                  selection.clear();
                }}
              >
                <ChevronRight size={18} />
              </IconButton>
            </nav>
          )}

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
