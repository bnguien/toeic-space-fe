import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import lockedMascot from "@/assets/mascot/oy2-locked.png";
import {
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/shared/components/ui";
import { WorkspaceLayout } from "@/shared/layouts/WorkspaceLayout";

import { AddWordsSheet } from "../components/AddWordsSheet";
import { FolderDialog } from "../components/FolderDialog";
import { LessonGrid } from "../components/LessonGrid";
import { LibrarySidebar } from "../components/LibrarySidebar";
import { LibraryView } from "../components/LibraryView";
import { MistakesView } from "../components/MistakesView";
import { SidebarPanel } from "../components/SidebarPanel";
import { SidebarRail } from "../components/SidebarRail";
import { SidebarToolbar, type WorkspaceView } from "../components/SidebarToolbar";
import { StageList, type StageStation } from "../components/StageList";
import { VocabularyIntro } from "../components/VocabularyIntro";
import { WordEditProvider } from "../components/WordEditProvider";
import { useDeleteFolder } from "../hooks/useDeleteFolder";
import { useIsLearner } from "../hooks/useIsLearner";
import { useLearnerSummary } from "../hooks/useLearnerSummary";
import { useLibrary } from "../hooks/useLibrary";
import { useVocabularyPreferences } from "../hooks/useVocabularyPreferences";
import { useVocabularyStages } from "../hooks/useVocabularyStages";
import type { FolderDto, LibraryScope } from "../types/vocabulary.types";
import { FONT_SCALES } from "../utils/guest-preferences";
import { stageToneStyle } from "../utils/stage-tones";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import { toCounts } from "../utils/vocabulary-format";
import styles from "./VocabularyHomePage.module.css";

type FolderDialogState = { kind: "create" } | { kind: "rename"; folder: FolderDto } | null;

const nearestScaleIndex = (scale: number) =>
  FONT_SCALES.reduce(
    (best, value, index) =>
      Math.abs(value - scale) < Math.abs(FONT_SCALES[best] - scale) ? index : best,
    0,
  );

const toScope = (selection: string): LibraryScope =>
  selection === "all"
    ? { kind: "all" }
    : selection === "unfiled"
      ? { kind: "unfiled" }
      : { kind: "folder", folderId: selection };

/** Smart library rows that are not folders. */
const MISTAKES = "mistakes";

/**
 * `/vocabulary` workspace. Only the URL decides what the main area shows:
 * no params = the "Học từ vựng" overview, `?stage=` = a stage, `?view=library[&folder=]` = "Của tôi"
 * (`folder=mistakes` = "Từ sai").
 * The remembered last stage is only marked in the sidebar.
 */
export function VocabularyHomePage() {
  const { signedIn, resolving } = useIsLearner();
  const { preferences, ready, update } = useVocabularyPreferences();
  const stagesQuery = useVocabularyStages();
  const summaryQuery = useLearnerSummary(signedIn);
  const [searchParams, setSearchParams] = useSearchParams();
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderDto | null>(null);
  const [addingWords, setAddingWords] = useState(false);
  const deleteFolder = useDeleteFolder();

  const view: WorkspaceView = searchParams.get("view") === "library" ? "library" : "roadmap";
  const libraryQuery = useLibrary(signedIn && view === "library");

  const stations = useMemo<StageStation[]>(() => {
    const byStage = new Map((summaryQuery.data?.stages ?? []).map((row) => [row.stageId, row]));
    return [...(stagesQuery.data ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((stage) => ({ stage, progress: toCounts(stage.wordCount, byStage.get(stage.id)) }));
  }, [stagesQuery.data, summaryQuery.data]);

  const stageId = view === "roadmap" ? searchParams.get("stage") : null;
  const selected = stations.find(({ stage }) => stage.id === stageId);

  const folderParam = searchParams.get("folder");
  const folderExists =
    !folderParam ||
    folderParam === "unfiled" ||
    folderParam === MISTAKES ||
    !libraryQuery.data ||
    libraryQuery.data.folders.some((folder) => folder.id === folderParam);
  const selection = folderParam && folderExists ? folderParam : "all";

  const scaleIndex = nearestScaleIndex(preferences.fontScale);
  const font = {
    canDecrease: scaleIndex > 0,
    canIncrease: scaleIndex < FONT_SCALES.length - 1,
    decrease: () => update({ fontScale: FONT_SCALES[Math.max(0, scaleIndex - 1)] }),
    increase: () =>
      update({ fontScale: FONT_SCALES[Math.min(FONT_SCALES.length - 1, scaleIndex + 1)] }),
  };
  const collapsed = preferences.sidebarCollapsed;
  const toggleCollapsed = () => update({ sidebarCollapsed: !collapsed });

  const go = (params: Record<string, string>) =>
    setSearchParams(params, { preventScrollReset: true });

  const selectStage = (id: string) => {
    update({ lastView: "Roadmap", lastStageId: id });
    go({ stage: id });
  };
  const showOverview = () => go({});
  const selectFolder = (id: string) => {
    update({ lastView: "Library", lastFolderId: id === "all" || id === MISTAKES ? null : id });
    go(id === "all" ? { view: "library" } : { view: "library", folder: id });
  };
  const changeView = (next: WorkspaceView) => {
    if (next === "library") selectFolder(selection);
    else showOverview();
  };

  const toolbar = (
    <SidebarToolbar
      view={view}
      onViewChange={changeView}
      font={font}
      collapsed={collapsed}
      onToggleCollapsed={toggleCollapsed}
    />
  );

  const sidebar = (
    <SidebarPanel toolbar={toolbar}>
      {view === "library" ? (
        signedIn ? (
          <LibrarySidebar
            library={libraryQuery.data}
            loading={libraryQuery.isPending}
            value={selection}
            onChange={selectFolder}
            onCreateFolder={() => setFolderDialog({ kind: "create" })}
            onRenameFolder={(folder) => setFolderDialog({ kind: "rename", folder })}
            onDeleteFolder={setFolderToDelete}
          />
        ) : (
          <div className={styles.sidebarLoading}>
            <Skeleton shape="block" height={120} />
          </div>
        )
      ) : stagesQuery.isPending ? (
        <div className={styles.sidebarLoading}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} height={46} />
          ))}
        </div>
      ) : (
        <StageList
          stations={stations}
          selectedId={selected?.stage.id ?? null}
          recentId={preferences.lastStageId}
          showProgress={signedIn}
          onSelect={selectStage}
        />
      )}
    </SidebarPanel>
  );

  const rail = (
    <SidebarRail
      view={view}
      stages={stations.map(({ stage }) => stage)}
      selectedStageId={selected?.stage.id ?? null}
      onSelectStage={selectStage}
      onOpenLibrary={() => selectFolder(selection)}
      toolbar={toolbar}
    />
  );

  const main = () => {
    if (!ready || stagesQuery.isPending) {
      return (
        <div className={styles.loading} aria-busy="true">
          <Skeleton width={240} height={16} />
          <Skeleton width="70%" height={72} />
          <Skeleton shape="block" height={260} />
        </div>
      );
    }

    if (view === "library") {
      if (!signedIn) {
        return (
          <EmptyState
            image={lockedMascot}
            title="Đăng nhập để lưu từ"
            action={
              <ButtonLink
                to={`/login?next=${encodeURIComponent("/vocabulary?view=library")}`}
                variant="primary"
                icon={<LogIn size={16} />}
              >
                Đăng nhập
              </ButtonLink>
            }
          />
        );
      }
      if (libraryQuery.isError) {
        return (
          <ErrorState
            image={errorMascot}
            title={getVocabularyErrorMessage(libraryQuery.error)}
            onRetry={() => void libraryQuery.refetch()}
          />
        );
      }
      if (selection === MISTAKES) return <MistakesView count={libraryQuery.data?.mistakes} />;
      return (
        <LibraryView
          key={selection}
          scope={toScope(selection)}
          library={libraryQuery.data}
          onAddWords={() => setAddingWords(true)}
        />
      );
    }

    if (stagesQuery.isError) {
      return (
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(stagesQuery.error)}
          onRetry={() => void stagesQuery.refetch()}
        />
      );
    }

    if (stations.length === 0) {
      return <EmptyState image={emptyMascot} title="Chưa có lộ trình từ vựng" />;
    }

    if (!selected) {
      return (
        <VocabularyIntro
          stages={stations.map(({ stage }) => stage)}
          signedIn={signedIn}
          loading={resolving || (signedIn && summaryQuery.isPending)}
          summary={summaryQuery.data}
          defaultMode={preferences.defaultMode}
          dailyGoal={preferences.dailyGoal}
          onSelectStage={selectStage}
        />
      );
    }

    return (
      <div style={stageToneStyle(selected.stage.order)}>
        <LessonGrid
          key={selected.stage.id}
          stage={selected.stage}
          signedIn={signedIn}
          progress={selected.progress}
          onBack={showOverview}
        />
      </div>
    );
  };

  return (
    <WorkspaceLayout
      sidebar={sidebar}
      rail={rail}
      collapsed={collapsed}
      sidebarWidth={preferences.sidebarWidth ?? undefined}
      onSidebarResize={(width) => update({ sidebarWidth: width })}
      onCollapse={() => update({ sidebarCollapsed: true })}
      fontScale={preferences.fontScale}
    >
      <WordEditProvider>{main()}</WordEditProvider>

      {addingWords && (
        <AddWordsSheet
          open
          folders={libraryQuery.data?.folders ?? []}
          initialFolderId={
            selection !== "all" && selection !== "unfiled" && selection !== MISTAKES
              ? selection
              : undefined
          }
          onClose={() => setAddingWords(false)}
        />
      )}
      {folderDialog && (
        <FolderDialog
          key={folderDialog.kind === "rename" ? folderDialog.folder.id : "new"}
          folder={folderDialog.kind === "rename" ? folderDialog.folder : undefined}
          onClose={() => setFolderDialog(null)}
          onSaved={(folder) => {
            if (folderDialog.kind === "create") selectFolder(folder.id);
          }}
        />
      )}
      <ConfirmDialog
        open={!!folderToDelete}
        title={folderToDelete?.name ?? ""}
        description={
          folderToDelete ? `${folderToDelete.wordCount} từ chuyển về Chưa phân loại` : undefined
        }
        confirmLabel="Xoá thư mục"
        tone="danger"
        pending={deleteFolder.isPending}
        error={deleteFolder.isError ? getVocabularyErrorMessage(deleteFolder.error) : null}
        onClose={() => {
          deleteFolder.reset();
          setFolderToDelete(null);
        }}
        onConfirm={() => {
          if (!folderToDelete) return;
          const removed = folderToDelete.id;
          deleteFolder.mutate(removed, {
            onSuccess: () => {
              setFolderToDelete(null);
              if (selection === removed) selectFolder("all");
            },
          });
        }}
      />
    </WorkspaceLayout>
  );
}
