import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, GraduationCap, LogIn } from "lucide-react";

import errorMascot from "@/assets/mascot/oy2-error.png";
import notFoundMascot from "@/assets/mascot/oy2-404.png";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  IconButton,
  Legend,
  NumberTile,
  PageContainer,
  PageHeader,
  SelectionBar,
  Skeleton,
} from "@/shared/components/ui";
import { useSelection } from "@/shared/hooks/useSelection";

import { SaveWordButton } from "../components/SaveWordButton";
import { StudyModeChooser } from "../components/StudyModeChooser";
import { WordEditButton } from "../components/WordEditButton";
import { WordEditProvider } from "../components/WordEditProvider";
import { WordSelectList } from "../components/WordSelectList";
import { useIsLearner } from "../hooks/useIsLearner";
import { useStartStudy } from "../hooks/useStartStudy";
import { useStudyQueue } from "../hooks/useStudyQueue";
import { useVocabularySet } from "../hooks/useVocabularySet";
import type { StudyItemDto } from "../types/vocabulary.types";
import { getErrorStatus, getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import {
  describeProgress,
  formatCount,
  formatLessonOrder,
  formatPercent,
  progressRatio,
  startedCount,
} from "../utils/vocabulary-format";
import styles from "./VocabularySetPage.module.css";

/**
 * Lesson word list. Every word starts selected; "Luyện tập" opens the mode chooser for the
 * selection (the whole lesson when everything is selected).
 */
export function VocabularySetPage() {
  const { setId = "" } = useParams();
  const navigate = useNavigate();
  const { signedIn } = useIsLearner();
  const setQuery = useVocabularySet(setId);
  const statusQuery = useStudyQueue({ setId }, signedIn && !!setId);
  const startStudy = useStartStudy();
  const [choosing, setChoosing] = useState(false);

  const words = setQuery.data?.words;
  const wordIds = useMemo(() => (words ?? []).map((word) => word.id), [words]);
  const selection = useSelection(wordIds, "all");

  const itemsByWord = useMemo(
    () =>
      new Map<string, StudyItemDto>((statusQuery.data ?? []).map((item) => [item.word.id, item])),
    [statusQuery.data],
  );

  if (setQuery.isPending) {
    return (
      <PageContainer width="narrow">
        <div className={styles.loading} aria-busy="true">
          <Skeleton shape="block" height={200} />
          <Skeleton shape="block" height={420} />
        </div>
      </PageContainer>
    );
  }

  if (setQuery.isError) {
    const notFound = getErrorStatus(setQuery.error) === 404;
    return (
      <PageContainer width="narrow">
        <ErrorState
          image={notFound ? notFoundMascot : errorMascot}
          title={getVocabularyErrorMessage(setQuery.error)}
          onRetry={notFound ? undefined : () => void setQuery.refetch()}
          action={
            <ButtonLink to="/vocabulary" variant="mark">
              Từ vựng
            </ButtonLink>
          }
        />
      </PageContainer>
    );
  }

  const set = setQuery.data;
  const counts = { wordCount: set.words.length, learning: 0, mastered: 0, due: 0 };
  for (const { progress } of itemsByWord.values()) {
    if (progress.status === "Learning") counts.learning += 1;
    if (progress.status === "Mastered") counts.mastered += 1;
    if (progress.isDue) counts.due += 1;
  }
  const ratio = progressRatio(counts);
  const hasProgress = signedIn && !!statusQuery.data;
  const loginTarget = `/login?next=${encodeURIComponent(`/vocabulary/sets/${set.id}`)}`;

  return (
    <WordEditProvider>
      <PageContainer width="narrow">
        <Card as="section" variant="paper" padding="lg" className={styles.header}>
          <PageHeader
            breadcrumb={[
              { label: "Từ vựng", to: "/vocabulary" },
              { label: set.stageTitle, to: `/vocabulary?stage=${set.stageId}` },
              { label: formatLessonOrder(set.order) },
            ]}
            title={formatLessonOrder(set.order)}
            meta={
              <>
                <Badge size="md">{formatCount(set.words.length)} từ</Badge>
                {hasProgress && counts.due > 0 && (
                  <Badge tone="rose" size="md">
                    {counts.due} đến hạn
                  </Badge>
                )}
              </>
            }
            aside={
              hasProgress ? (
                <div className={styles.progress}>
                  <NumberTile
                    size="lg"
                    align="end"
                    value={formatPercent(ratio)}
                    caption={`${startedCount(counts)}/${counts.wordCount} từ đã học`}
                    progress={ratio}
                  />
                  <Legend
                    items={[
                      { label: "Đã thuộc", value: counts.mastered, tone: "green" },
                      { label: "Đang học", value: counts.learning, tone: "blue" },
                      {
                        label: "Chưa học",
                        value: Math.max(0, counts.wordCount - startedCount(counts)),
                        tone: "neutral",
                      },
                    ]}
                  />
                </div>
              ) : undefined
            }
            actions={
              <>
                <IconButton
                  label="Bài trước"
                  variant="outline"
                  disabled={!set.previousSetId}
                  onClick={() =>
                    set.previousSetId && navigate(`/vocabulary/sets/${set.previousSetId}`)
                  }
                >
                  <ChevronLeft size={18} />
                </IconButton>
                <IconButton
                  label="Bài tiếp theo"
                  variant="outline"
                  disabled={!set.nextSetId}
                  onClick={() => set.nextSetId && navigate(`/vocabulary/sets/${set.nextSetId}`)}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </>
            }
          />
        </Card>

        <Card as="section" variant="outline" padding="none">
          <WordSelectList
            label="Danh sách từ"
            numbered
            words={set.words}
            isSelected={selection.isSelected}
            onToggle={selection.toggle}
            aside={(word) => {
              const item = itemsByWord.get(word.id);
              const status = item ? describeProgress(item.progress) : undefined;
              return (
                item &&
                status && (
                  <>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <WordEditButton word={word} />
                    <SaveWordButton wordId={word.id} savedWordId={item.savedWordId} />
                  </>
                )
              );
            }}
          />
        </Card>

        <SelectionBar
          sticky
          count={selection.count}
          total={selection.total}
          onSelectAll={selection.selectAll}
          onClear={selection.clear}
          actions={
            signedIn ? (
              <Button
                variant="primary"
                icon={<GraduationCap size={18} />}
                disabled={selection.count === 0}
                onClick={() => setChoosing(true)}
              >
                Luyện tập
              </Button>
            ) : (
              <ButtonLink to={loginTarget} variant="primary" icon={<LogIn size={18} />}>
                Đăng nhập để luyện tập
              </ButtonLink>
            )
          }
        />

        {choosing && (
          <StudyModeChooser
            count={selection.count}
            onClose={() => setChoosing(false)}
            onChoose={(mode) =>
              startStudy(
                mode,
                selection.allSelected ? { setId: set.id } : { wordIds: selection.selectedIds },
              )
            }
          />
        )}
      </PageContainer>
    </WordEditProvider>
  );
}
