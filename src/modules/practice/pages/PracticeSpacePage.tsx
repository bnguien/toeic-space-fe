import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import errorMascot from "@/assets/mascot/oy2-error.png";
import { restoreSession, useCurrentUser, useSessionStatus } from "@/modules/auth";
import { ErrorState, Skeleton, toast } from "@/shared/components/ui";
import { useColorModeScope } from "@/shared/hooks/useColorMode";

import { ExamConfigDialog } from "../components/space/ExamConfigDialog";
import { HistoryView } from "../components/space/HistoryView";
import { PartTestCard, SetCard, TestCard } from "../components/space/SpaceCards";
import { GridBar, GridSection, GridSubhead, SignInPrompt } from "../components/space/SpaceGrid";
import { ExamCriteria, PartCircles, PartSteps, type PartNode } from "../components/space/SpaceMaps";
import { SpaceOverview } from "../components/space/SpaceOverview";
import pageStyles from "../components/space/SpacePage.module.css";
import { SpaceShell, type SpaceGroup } from "../components/space/SpaceShell";
import { StatsDrawer } from "../components/space/StatsDrawer";
import {
  buildSeries,
  cardStateOf,
  parseHistoryMode,
  parseHistoryTab,
  partNumberOf,
  pickNext,
  setHeadline,
  setProgressOf,
  setsOfPart,
  summarizePool,
  testLabel,
  testProgressOf,
  type HistoryModeFilter,
  type HistoryTab,
  type ItemProgress,
  type PracticeSetItem,
  type TestSeries,
} from "../components/space/spaceModel";
import { MODE_TONE, partTone, toneStyle, type SpaceTone } from "../components/space/spaceTones";
import { useStartTestAttempt } from "../hooks/usePracticeExamMutations";
import {
  useLearner,
  useSetsProgress,
  useTestCategories,
  useTests,
  useTestsProgress,
} from "../hooks/usePracticeExamQueries";
import { usePracticeSets } from "../hooks/usePracticeSets";
import type { PracticeSpaceMode, ToeicTest } from "../types/practice-exam.types";
import { LISTENING_PARTS, READING_PARTS, partMeta } from "../utils/parts";
import { practiceExamError } from "../utils/practiceExamErrors";

export interface PracticeSpacePageProps {
  mode: PracticeSpaceMode;
}

const DOCUMENT_TITLES: Record<PracticeSpaceMode, string> = {
  exam: "Luyện đề TOEIC",
  listening: "Luyện nghe TOEIC · Part 1–4",
  reading: "Luyện đọc TOEIC · Part 5–7",
  history: "Lịch sử làm bài",
};

const SET_QUERY = { status: "Active", pageSize: 100 } as const;
const TEST_QUERY = { pageSize: 100 } as const;

const HISTORY_FILTERS: readonly { value: HistoryModeFilter; label: string; tone: SpaceTone }[] = [
  { value: "all", label: "Tất cả bài làm", tone: "navy" },
  { value: "FullTest", label: "Thi thử", tone: "rose" },
  { value: "Practice", label: "Luyện tập", tone: "blue" },
];

type Dialog = { test: ToeicTest; initialParts?: number[] } | null;

const touched = (progress: ItemProgress) => progress.status !== "todo";

/**
 * Practice space (`/practice/exam|listening|reading|history`, StudyChill PracticeSpacePage):
 * the URL alone decides the view — no `?series=` / `?part=` = the overview of the mode, with one
 * = its card grid. Guests can browse; opening an item asks them to sign in.
 */
export function PracticeSpacePage({ mode }: PracticeSpacePageProps) {
  useColorModeScope();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const user = useCurrentUser();
  const learner = useLearner();
  const signedIn = Boolean(learner);
  const here = `${location.pathname}${location.search}`;

  const categories = useTestCategories();
  const tests = useTests(TEST_QUERY);
  const sets = usePracticeSets(SET_QUERY);
  const testsProgress = useTestsProgress();
  const setsProgress = useSetsProgress();
  const start = useStartTestAttempt();

  const [dialog, setDialog] = useState<Dialog>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);

  const sessionStatus = useSessionStatus();
  const resolving = sessionStatus === "idle" || sessionStatus === "restoring";

  useEffect(() => {
    // Bare page: no navbar restores the session for us.
    void restoreSession();
  }, []);

  useEffect(() => {
    document.title = `${DOCUMENT_TITLES[mode]} | TOEICSpace`;
  }, [mode]);

  const series = useMemo(
    () => buildSeries(categories.data ?? [], tests.data?.items ?? []),
    [categories.data, tests.data],
  );
  const allTests = useMemo(() => series.flatMap((s) => s.tests), [series]);
  const allSets = useMemo<PracticeSetItem[]>(() => sets.data?.items ?? [], [sets.data]);
  const testProgressById = useMemo(
    () => new Map((testsProgress.data ?? []).map((p) => [p.testId, p])),
    [testsProgress.data],
  );
  const setProgressById = useMemo(
    () => new Map((setsProgress.data ?? []).map((p) => [p.practiceSetId, p])),
    [setsProgress.data],
  );

  const testProgress = (test: ToeicTest) => testProgressOf(testProgressById.get(test.id));
  const setProgress = (set: PracticeSetItem) =>
    setProgressOf(setProgressById.get(set.id), set.questionCount);
  const seriesOf = (test: ToeicTest) =>
    series.find((s) => s.tests.some((t) => t.id === test.id))?.key ?? "";

  /* ---- Opening items ---- */
  const openTest = (test: ToeicTest) => {
    if (!learner) return setPrompt(`Đăng nhập để làm ${test.title} và lưu điểm của bạn.`);
    setDialog({ test });
  };

  const openSet = (set: PracticeSetItem) => {
    if (!user) return setPrompt(`Đăng nhập để luyện ${set.title} và lưu tiến độ của bạn.`);
    navigate(`/practice/parts/${set.id}`, { state: { from: here } });
  };

  const openPartTest = (test: ToeicTest, part: number) => {
    if (!learner)
      return setPrompt(`Đăng nhập để luyện Part ${part} của ${test.title} và lưu kết quả.`);
    // One in-progress attempt per test: let the dialog explain and resolve it.
    if (testProgress(test).status === "doing") return setDialog({ test, initialParts: [part] });
    start.mutate(
      { testId: test.id, mode: "Practice", parts: [part] },
      {
        onSuccess: (attempt) =>
          navigate(`/practice/attempts/${attempt.id}`, { state: { speed: 1, from: here } }),
        onError: (error) =>
          toast.error(practiceExamError(error, "Không mở được đề. Kiểm tra mạng rồi thử lại.")),
      },
    );
  };
  const busyTestId = start.isPending ? start.variables?.testId : undefined;

  /* ---- Selection from the URL ---- */
  const select = (key: string, value: string) => {
    setParams({ [key]: value }, { preventScrollReset: true });
    window.scrollTo({ top: 0 });
  };
  const toOverview = () => setParams({}, { preventScrollReset: true });
  const updateParams = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { preventScrollReset: true },
    );

  const selectedSeries =
    mode === "exam" ? (series.find((s) => s.key === params.get("series")) ?? null) : null;
  const modeParts: readonly number[] =
    mode === "listening" ? LISTENING_PARTS : mode === "reading" ? READING_PARTS : [];
  const partParam = Number(params.get("part"));
  const selectedPart = modeParts.includes(partParam) ? partParam : null;
  const historyMode = parseHistoryMode(params.get("mode"));

  /* ---- Sidebar ---- */
  const groups: SpaceGroup[] = [];
  if (mode === "exam") {
    groups.push({
      id: "series",
      title: "Bộ đề",
      items: series.map((s, index) => ({
        id: s.key,
        num: String(index + 1).padStart(2, "0"),
        label: s.label,
        name: `${s.label} · ${s.tests.length} đề`,
        meta: `${s.tests.length} đề`,
        progress: signedIn
          ? s.tests.filter((t) => touched(testProgress(t))).length / Math.max(1, s.tests.length)
          : undefined,
        selected: s.key === selectedSeries?.key,
        tone: "navy",
        onSelect: () => select("series", s.key),
      })),
    });
  } else if (mode === "history") {
    groups.push({
      id: "history",
      title: "Chế độ",
      items: HISTORY_FILTERS.map((filter, index) => ({
        id: filter.value,
        num: String(index + 1).padStart(2, "0"),
        label: filter.label,
        name: filter.label,
        selected: historyMode === filter.value,
        tone: filter.tone,
        onSelect: () =>
          updateParams({ mode: filter.value === "all" ? null : filter.value, page: null }),
      })),
    });
  } else {
    groups.push({
      id: "parts",
      title: "Theo Part",
      items: modeParts.map((part) => {
        const partSets = setsOfPart(allSets, part);
        const meta = partMeta(part);
        return {
          id: `part-${part}`,
          num: String(part),
          label: `Part ${part} · ${meta.name}`,
          name: `Part ${part} · ${meta.name}`,
          meta: partSets.length ? `${partSets.length} bộ` : `${allTests.length} đề`,
          progress:
            signedIn && partSets.length
              ? partSets.filter((s) => touched(setProgress(s))).length / partSets.length
              : undefined,
          selected: part === selectedPart,
          tone: partTone(part),
          onSelect: () => select("part", String(part)),
        };
      }),
    });
  }

  /* ---- Main area ---- */
  const catalogueError = categories.error ?? tests.error ?? (mode !== "exam" ? sets.error : null);
  const catalogueLoading =
    categories.isPending || tests.isPending || (mode !== "exam" && sets.isPending);
  const progressLoading =
    resolving || (signedIn && (testsProgress.isPending || setsProgress.isPending));

  const examGrid = (s: TestSeries) => {
    const next = signedIn ? pickNext(s.tests, testProgress) : null;
    return (
      <div className={pageStyles.stack} style={toneStyle("navy")}>
        <GridBar
          title={s.label}
          count={`${s.tests.length} đề`}
          onBack={toOverview}
          onStats={() => setStatsOpen(true)}
          signedIn={signedIn}
        />
        <GridSection key={s.key}>
          {s.tests.map((test) => {
            const progress = testProgress(test);
            return (
              <TestCard
                key={test.id}
                test={test}
                progress={progress}
                state={cardStateOf(progress, test.id === next?.id)}
                onOpen={() => openTest(test)}
              />
            );
          })}
        </GridSection>
      </div>
    );
  };

  const partGrid = (part: number) => {
    const meta = partMeta(part);
    const partSets = setsOfPart(allSets, part);
    const next = signedIn ? pickNext(partSets, setProgress) : null;
    const variant = part <= 4 ? "listen" : "read";
    return (
      <div className={pageStyles.stack} style={toneStyle(partTone(part))}>
        <GridBar
          title={`Part ${part} · ${meta.name}`}
          count={partSets.length ? `${partSets.length} bộ` : `${allTests.length} đề`}
          onBack={toOverview}
          onStats={() => setStatsOpen(true)}
          signedIn={signedIn}
        />
        {partSets.length > 0 && (
          <GridSection
            key={`sets-${part}`}
            title="Bộ luyện theo cấp độ"
            note={`${meta.enName} · đi từ 450+ lên 850+, mỗi bộ có Góc luyện tập riêng.`}
            variant={variant === "listen" ? "listen" : "cards"}
          >
            {partSets.map((set, index) => {
              const progress = setProgress(set);
              return (
                <SetCard
                  key={set.id}
                  set={set}
                  index={index}
                  variant={variant}
                  progress={progress}
                  state={cardStateOf(progress, set.id === next?.id)}
                  onOpen={() => openSet(set)}
                />
              );
            })}
          </GridSection>
        )}
        {allTests.length > 0 && (
          <GridSection
            key={`tests-${part}`}
            title="Từ đề thi"
            note={`Luyện riêng Part ${part} trong đề thật: ${meta.count} câu · ~${meta.minutes} phút mỗi đề, chấm và xem giải thích theo từng nhóm câu.`}
            variant="mini"
          >
            {series.flatMap((s) => [
              <GridSubhead key={`h-${s.key}`}>{s.label}</GridSubhead>,
              ...s.tests.map((test) => (
                <PartTestCard
                  key={test.id}
                  test={test}
                  series={s.label}
                  part={part}
                  inProgress={testProgress(test).status === "doing"}
                  busy={busyTestId === test.id}
                  onOpen={() => openPartTest(test, part)}
                />
              )),
            ])}
          </GridSection>
        )}
      </div>
    );
  };

  const main = () => {
    if (mode === "history") {
      return (
        <HistoryView
          tab={parseHistoryTab(params.get("tab"))}
          mode={historyMode}
          page={Math.max(1, Number(params.get("page")) || 1)}
          onChange={(next: { tab?: HistoryTab; mode?: HistoryModeFilter; page?: number }) =>
            updateParams({
              ...(next.tab ? { tab: next.tab === "all" ? null : next.tab } : {}),
              ...(next.mode ? { mode: next.mode === "all" ? null : next.mode } : {}),
              ...(next.page ? { page: next.page <= 1 ? null : String(next.page) } : {}),
            })
          }
        />
      );
    }

    if (catalogueError)
      return (
        <ErrorState
          image={errorMascot}
          title={`Chưa tải được danh sách đề. ${practiceExamError(catalogueError)}`}
          onRetry={() => {
            void categories.refetch();
            void tests.refetch();
            void sets.refetch();
          }}
        />
      );

    if (catalogueLoading)
      return (
        <div className={pageStyles.loading} aria-busy="true">
          <Skeleton width={220} height={14} />
          <Skeleton width="60%" height={72} />
          <Skeleton shape="block" height={84} />
          <Skeleton shape="block" height={180} />
        </div>
      );

    if (mode === "exam") {
      if (selectedSeries) return examGrid(selectedSeries);
      const next = signedIn ? pickNext(allTests, testProgress) : (allTests[0] ?? null);
      return (
        <SpaceOverview
          kind="exam"
          crumb="Luyện đề"
          title={["Luyện", "Đề"]}
          subtitle="Làm trọn đề 200 câu như ngồi phòng thi thật"
          poolLabel="Đề luyện"
          doneLabel="Đã nộp"
          total={allTests.length}
          summary={signedIn ? summarizePool(allTests.map(testProgress)) : null}
          loading={progressLoading}
          signedIn={signedIn}
          loginNext={here}
          cta={
            next
              ? {
                  label: `${testProgress(next).status === "doing" ? "Làm tiếp" : "Bắt đầu"} ${testLabel(next)}`,
                  onClick: () => openTest(next),
                }
              : null
          }
          ghost={
            series[0]
              ? { label: `Xem ${series[0].label}`, onClick: () => select("series", series[0].key) }
              : null
          }
          map={<ExamCriteria />}
        />
      );
    }

    if (selectedPart) return partGrid(selectedPart);

    const poolSets = modeParts.flatMap((part) => setsOfPart(allSets, part));
    const next = signedIn ? pickNext(poolSets, setProgress) : (poolSets[0] ?? null);
    const listening = mode === "listening";
    const nodes: PartNode[] = modeParts.map((part) => {
      const partSets = setsOfPart(allSets, part);
      const done = partSets.filter((s) => touched(setProgress(s))).length;
      const meta = !partSets.length
        ? `${allTests.length} đề thi`
        : !signedIn
          ? `${partSets.length} bộ luyện`
          : listening
            ? `${partSets.length} bộ · ${done} đã làm`
            : `${done}/${partSets.length} bộ`;
      return { part, name: partMeta(part).name, meta };
    });
    const pick = (part: number) => select("part", String(part));
    return (
      <SpaceOverview
        kind={listening ? "listening" : "reading"}
        crumb={listening ? "Luyện nghe" : "Luyện đọc"}
        title={["Luyện", listening ? "Nghe" : "Đọc"]}
        subtitle={
          listening
            ? "Nghe chắc từng Part, đi từ 450+ lên 850+"
            : "Đọc chắc từng Part, đi từ 450+ lên 850+"
        }
        poolLabel="Bộ luyện"
        doneLabel="Đã xong"
        total={poolSets.length}
        summary={signedIn ? summarizePool(poolSets.map(setProgress)) : null}
        loading={progressLoading}
        signedIn={signedIn}
        loginNext={here}
        cta={
          next
            ? {
                label: `${setProgress(next).status === "doing" ? "Học tiếp" : "Bắt đầu"} Part ${partNumberOf(next.part)} · ${setHeadline(next)}`,
                onClick: () => openSet(next),
              }
            : null
        }
        ghost={{ label: `Xem Part ${modeParts[0]}`, onClick: () => pick(modeParts[0]) }}
        map={
          listening ? (
            <PartCircles nodes={nodes} onPick={pick} />
          ) : (
            <PartSteps nodes={nodes} onPick={pick} />
          )
        }
      />
    );
  };

  return (
    <SpaceShell
      mode={mode}
      groups={groups}
      onStats={mode === "history" ? undefined : () => setStatsOpen(true)}
    >
      <div style={toneStyle(MODE_TONE[mode])}>{main()}</div>

      <StatsDrawer
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        series={series}
        loginNext={here}
      />
      {dialog && (
        <ExamConfigDialog
          key={dialog.test.id}
          test={dialog.test}
          initialParts={dialog.initialParts}
          from={
            dialog.initialParts
              ? here
              : `/practice/exam?series=${encodeURIComponent(seriesOf(dialog.test))}`
          }
          onClose={() => setDialog(null)}
        />
      )}
      <SignInPrompt
        open={prompt !== null}
        reason={prompt ?? ""}
        next={here}
        staff={Boolean(user) && !learner}
        onClose={() => setPrompt(null)}
      />
    </SpaceShell>
  );
}
