import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import searchMascot from "@/assets/mascot/oy2-search.png";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  SelectionBar,
} from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import { useMistakes } from "../hooks/useMistakes";
import { useStartStudy, type StudySelection } from "../hooks/useStartStudy";
import type { MistakeItemDto } from "../types/vocabulary.types";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { describeProgress } from "../utils/vocabulary-format";
import { LibraryHeader } from "./LibraryHeader";
import styles from "./MistakesView.module.css";
import { Pager } from "./Pager";
import { SaveWordButton } from "./SaveWordButton";
import { StudyModeChooser } from "./StudyModeChooser";
import { WordEditButton } from "./WordEditButton";
import { WordGrid, WordGridSkeleton } from "./WordGrid";
import { WordTile } from "./WordTile";

const PAGE_SIZE = 100;

interface MistakesViewProps {
  /** Pending mistakes from the library counts (before the list loads). */
  count?: number;
}

/** Search over the loaded page: headword or Vietnamese meaning. */
const matches = (item: MistakeItemDto, query: string): boolean => {
  const needle = query.toLocaleLowerCase("vi-VN");
  return [item.word.headword, item.word.meaningVi].some((value) =>
    value.toLocaleLowerCase("vi-VN").includes(needle),
  );
};

/**
 * "Từ sai": words answered wrong and not yet answered right, newest first, as word tiles.
 * Everything starts selected; studying the whole list uses the mistakes source, a part of it
 * the word ids.
 */
export function MistakesView({ count }: MistakesViewProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [choosing, setChoosing] = useState(false);
  const startStudy = useStartStudy();
  const query = useMistakes({ page, pageSize: PAGE_SIZE }, true);

  const loaded = query.data?.items ?? [];
  const items = loaded.filter(
    (item) =>
      (!search || matches(item, search)) &&
      (!status || describeProgress(item.progress).label === status),
  );
  const totalCount = query.data?.totalCount ?? count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selection = useSelection(
    items.map((item) => item.word.id),
    "all",
  );

  const studySelection = (): StudySelection =>
    selection.allSelected && pageCount === 1 && !search && !status
      ? { mistakes: true }
      : { wordIds: selection.selectedIds };

  const changePage = (next: number) => {
    setPage(next);
    selection.selectAll();
  };
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  return (
    <section className={styles.view} aria-labelledby="mistakes-title">
      <LibraryHeader
        titleId="mistakes-title"
        title="Từ sai"
        count={totalCount}
        search={search}
        onSearch={setSearch}
        status={status}
        onStatusChange={setStatus}
      />

      {query.isPending ? (
        <WordGridSkeleton />
      ) : query.isError ? (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : loaded.length === 0 ? (
        <EmptyState
          image={emptyMascot}
          title="Chưa có từ sai"
          action={
            <ButtonLink to="/vocabulary" variant="primary" icon={<BookOpen size={16} />}>
              Bộ từ vựng
            </ButtonLink>
          }
        />
      ) : items.length === 0 ? (
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
        <>
          <WordGrid label="Từ sai" stale={query.isPlaceholderData}>
            {items.map((item) => (
              <li key={item.word.id}>
                <WordTile
                  word={item.word}
                  status={
                    <Badge tone="rose" title="Số lần sai">
                      ×{item.mistakeCount}
                    </Badge>
                  }
                  actions={
                    <>
                      <WordEditButton word={item.word} />
                      <SaveWordButton wordId={item.word.id} savedWordId={item.savedWordId} />
                    </>
                  }
                  selected={selection.isSelected(item.word.id)}
                  selecting={selection.count > 0}
                  onToggleSelect={(range) => selection.toggle(item.word.id, range)}
                />
              </li>
            ))}
          </WordGrid>

          <Pager page={page} pageCount={pageCount} onChange={changePage} />

          <SelectionBar
            sticky
            count={selection.count}
            total={selection.total}
            onSelectAll={selection.selectAll}
            onClear={selection.clear}
            actions={
              <Button
                variant="primary"
                icon={<GraduationCap size={18} />}
                disabled={selection.count === 0}
                onClick={() => setChoosing(true)}
              >
                Luyện tập
              </Button>
            }
          />
        </>
      )}

      {choosing && (
        <StudyModeChooser
          count={selection.count}
          onClose={() => setChoosing(false)}
          onChoose={(mode) => startStudy(mode, studySelection())}
        />
      )}
    </section>
  );
}
