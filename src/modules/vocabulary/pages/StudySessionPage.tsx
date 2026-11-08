import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RectangleHorizontal, RectangleVertical, Settings2, Snowflake } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import successMascot from "@/assets/mascot/oy2-success.png";
import { Button, EmptyState, ErrorState, Skeleton, Snowfall } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { sfx } from "@/shared/utils/sfx";

import { FlashcardCard } from "../components/FlashcardCard";
import { QuizCard } from "../components/QuizCard";
import { ReelCard } from "../components/ReelCard";
import { SaveWordButton } from "../components/SaveWordButton";
import { SessionSummary } from "../components/SessionSummary";
import { StudyBackdrop } from "../components/StudyBackdrop";
import { StudyFrame } from "../components/StudyFrame";
import { StudySession, type SessionResult, type StudyCardApi } from "../components/StudySession";
import { StudySettingsSheet } from "../components/StudySettingsSheet";
import { StudyStage, StudyToolButton } from "../components/StudyStage";
import { WordEditButton } from "../components/WordEditButton";
import { WordEditProvider } from "../components/WordEditProvider";
import { useInvalidateLearnerProgress } from "../hooks/useInvalidateLearnerProgress";
import { useQuizQuestions } from "../hooks/useQuizQuestions";
import { useReelBackgrounds } from "../hooks/useReelBackgrounds";
import { useStudySessionStart, type SessionTarget } from "../hooks/useStudySessionStart";
import { useStudySettings } from "../hooks/useStudySettings";
import type {
  QuizQuestionDto,
  SessionSource,
  SessionSourceDto,
  StudyItemDto,
  StudyLayout,
  StudyMode,
  StudySessionDto,
  WordsSessionState,
} from "../types/vocabulary.types";
import { assignCardThemes, cardThemeOf } from "../utils/card-themes";
import { REVIEW_MODE, isStudyMode, toStudyMode } from "../utils/study-session";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import styles from "./StudySessionPage.module.css";

const DUE_LIMIT = 50;
/** A new backdrop scene every this many cards (and on key C). */
const SCENE_EVERY = 8;
/** Room for a 16:9 stage at least ~360px tall next to the rail; below it the stage stays portrait. */
const LANDSCAPE_QUERY = "(min-width: 800px) and (min-height: 450px)";

function sourceFromParams(params: URLSearchParams, state: unknown): SessionSource | null {
  const setId = params.get("set");
  if (setId) return { setId };
  const folderId = params.get("folder");
  if (folderId) return { folderId };
  if (params.get("library") === "1") return { library: true };
  if (params.get("mistakes") === "1") return { mistakes: true };
  if (params.get("due") === "1") return { due: true, limit: DUE_LIMIT };
  const wordIds = (state as Partial<WordsSessionState> | null)?.wordIds;
  if (params.get("words") === "1" && Array.isArray(wordIds) && wordIds.length > 0) {
    return { wordIds };
  }
  return null;
}

/** Same source again, for a restart. */
function sourceOf(session: StudySessionDto): SessionSource {
  const { kind, id } = session.source;
  if (kind === "Set" && id) return { setId: id };
  if (kind === "Folder" && id) return { folderId: id };
  if (kind === "Library") return { library: true };
  if (kind === "Mistakes") return { mistakes: true };
  if (kind === "Due") return { due: true, limit: DUE_LIMIT };
  return { wordIds: [...new Set(session.items.map((item) => item.word.id))] };
}

function backTarget(source: SessionSourceDto | undefined): { to: string; label: string } {
  switch (source?.kind) {
    case "Set":
      return { to: `/vocabulary/sets/${source.id}`, label: "Về bài học" };
    case "Folder":
      return { to: `/vocabulary?view=library&folder=${source.id}`, label: "Về thư mục" };
    case "Mistakes":
      return { to: "/vocabulary?view=library&folder=mistakes", label: "Về từ sai" };
    case "Library":
    case "Words":
      return { to: "/vocabulary?view=library", label: "Về từ của tôi" };
    default:
      return { to: "/vocabulary", label: "Về Từ vựng" };
  }
}

export function StudySessionPage() {
  const { mode } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  if (!isStudyMode(mode)) return <Navigate to="/vocabulary" replace />;

  const source = sessionId ? null : sourceFromParams(searchParams, location.state);
  if (!sessionId && !source) return <Navigate to="/vocabulary" replace />;

  const target: SessionTarget = sessionId
    ? { kind: "id", sessionId }
    : { kind: "source", mode: REVIEW_MODE[mode], source: source as SessionSource };

  return (
    <WordEditProvider>
      <SessionLoader key={`${mode}-${location.search}`} initialTarget={target} />
    </WordEditProvider>
  );
}

interface Run {
  id: number;
  target: SessionTarget;
}

function SessionLoader({ initialTarget }: { initialTarget: SessionTarget }) {
  const navigate = useNavigate();
  const invalidateProgress = useInvalidateLearnerProgress();
  const { settings, autoPlayAudio, snowfall, change, update } = useStudySettings();
  const canLandscape = useMediaQuery(LANDSCAPE_QUERY);
  // The stored choice stays as it is; small screens just render portrait.
  const layout: StudyLayout = canLandscape ? settings.layout : "portrait";
  const [run, setRun] = useState<Run>({ id: 0, target: initialTarget });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sceneShift, setSceneShift] = useState(0);

  const sessionQuery = useStudySessionStart(run.target, run.id);
  const session = sessionQuery.data;
  const mode: StudyMode = session
    ? toStudyMode(session.mode)
    : run.target.kind === "source"
      ? toStudyMode(run.target.mode)
      : "flashcard";

  const wordIds = useMemo(
    () => [...new Set((session?.items ?? []).map((item) => item.word.id))],
    [session],
  );
  const themes = useMemo(
    () => assignCardThemes((session?.items ?? []).map((item) => item.word)),
    [session],
  );
  const quizQuery = useQuizQuestions(wordIds, mode === "quiz");
  const backgroundsQuery = useReelBackgrounds(settings.backdrop === "video");
  const questions = useMemo(
    () => new Map<string, QuizQuestionDto>((quizQuery.data ?? []).map((q) => [q.wordId, q])),
    [quizQuery.data],
  );

  useEffect(() => {
    sfx.configure({
      enabled: settings.sfx,
      volume: settings.sfxVolume,
      tick: settings.tickStyle,
      chime: settings.chimeStyle,
    });
  }, [settings.sfx, settings.sfxVolume, settings.tickStyle, settings.chimeStyle]);

  const shuffleScene = () => setSceneShift((value) => value + 1);
  const toggleLayout = () =>
    change({ layout: settings.layout === "landscape" ? "portrait" : "landscape" });

  useHotkeys((event) => {
    const key = event.key.toLowerCase();
    if (key === "c") {
      event.preventDefault();
      shuffleScene();
    } else if (key === "s") {
      event.preventDefault();
      setSettingsOpen(true);
    } else if (key === "l" && canLandscape) {
      event.preventDefault();
      toggleLayout();
    }
  }, !settingsOpen);

  const back = backTarget(session?.source);
  const exit = () => {
    // The session stays active on the server and can be resumed later.
    void invalidateProgress();
    navigate(back.to);
  };

  const restartWith = (source: SessionSource) => {
    if (!session) return;
    setRun((current) => ({
      id: current.id + 1,
      target: { kind: "source", mode: session.mode, source },
    }));
  };

  const backdrop = (position: number) => (
    <StudyBackdrop
      kind={settings.backdrop}
      backgrounds={backgroundsQuery.data ?? []}
      scene={Math.floor(position / SCENE_EVERY) + sceneShift}
    />
  );
  const overlay = <Snowfall active={snowfall} />;
  const tools = (
    <>
      <StudyToolButton
        label="Cài đặt"
        aria-pressed={settingsOpen}
        onClick={() => setSettingsOpen(true)}
      >
        <Settings2 size={18} />
      </StudyToolButton>
      {canLandscape && (
        <StudyToolButton
          label={layout === "landscape" ? "Khung dọc" : "Khung ngang"}
          onClick={toggleLayout}
        >
          {layout === "landscape" ? (
            <RectangleVertical size={18} />
          ) : (
            <RectangleHorizontal size={18} />
          )}
        </StudyToolButton>
      )}
      <StudyToolButton
        label={snowfall ? "Tắt tuyết rơi" : "Bật tuyết rơi"}
        aria-pressed={snowfall}
        onClick={() => update({ snowfall: !snowfall })}
      >
        <Snowflake size={18} />
      </StudyToolButton>
    </>
  );
  const settingsSheet = (
    <StudySettingsSheet
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      canLandscape={canLandscape}
      onShuffleScene={backgroundsQuery.data?.length ? shuffleScene : undefined}
    />
  );

  /** Loading, error and empty states keep the immersive shell. */
  const standalone = (content: ReactNode) => (
    <>
      <StudyStage
        backdrop={backdrop(0)}
        overlay={overlay}
        done={0}
        total={0}
        count="0/0"
        layout={layout}
        onClose={exit}
        actions={tools}
      >
        <StudyFrame>
          <div className={styles.panel}>{content}</div>
        </StudyFrame>
      </StudyStage>
      {settingsSheet}
    </>
  );

  if (sessionQuery.isPending || (mode === "quiz" && wordIds.length > 0 && quizQuery.isPending)) {
    return standalone(
      <div className={styles.loading} aria-busy="true">
        <Skeleton height={28} width="40%" />
        <Skeleton shape="block" height={220} />
        <Skeleton height={20} width="70%" />
      </div>,
    );
  }

  const failure = sessionQuery.isError
    ? sessionQuery
    : mode === "quiz" && quizQuery.isError
      ? quizQuery
      : null;
  if (failure || !session) {
    return standalone(
      <ErrorState
        image={errorMascot}
        title={getVocabularyErrorMessage(failure?.error)}
        onRetry={() => void (failure ?? sessionQuery).refetch()}
        action={
          <Button variant="outline" onClick={exit}>
            {back.label}
          </Button>
        }
      />,
    );
  }

  if (session.items.length === 0) {
    return standalone(
      <EmptyState
        image={emptyMascot}
        title={session.source.kind === "Due" ? "Không có từ đến hạn" : "Chưa có từ để học"}
        action={
          <Button variant="primary" onClick={exit}>
            {back.label}
          </Button>
        }
      />,
    );
  }

  const renderCard = (card: StudyCardApi) => {
    const common = {
      card,
      theme: themes.get(card.item.word.id) ?? cardThemeOf(card.item.word.headword),
      settings,
      autoPlay: autoPlayAudio,
    };

    if (mode === "flashcard") return <FlashcardCard key={card.cardKey} {...common} />;

    if (mode === "quiz") {
      const question = questions.get(card.item.word.id);
      if (!question) {
        return (
          <StudyFrame>
            <div className={styles.panel}>
              <ErrorState
                image={errorMascot}
                title="Không tải được câu hỏi"
                onRetry={() => void quizQuery.refetch()}
              />
            </div>
          </StudyFrame>
        );
      }
      return <QuizCard key={card.cardKey} {...common} question={question} />;
    }

    return <ReelCard key={card.cardKey} {...common} />;
  };

  const rowExtra = (item: StudyItemDto) => (
    <>
      <WordEditButton word={item.word} />
      <SaveWordButton wordId={item.word.id} savedWordId={item.savedWordId} />
    </>
  );

  const renderSummary = (result: SessionResult) => (
    <StudyFrame>
      <SessionSummary
        image={successMascot}
        title="Hoàn thành"
        stats={
          mode === "quiz"
            ? [
                { label: "Đúng", value: result.remembered, tone: "green" },
                { label: "Sai", value: result.review.length, tone: "rose" },
              ]
            : [
                { label: "Đã nhớ", value: result.remembered, tone: "green" },
                { label: "Cần ôn", value: result.review.length, tone: "rose" },
              ]
        }
        items={result.review}
        rowExtra={rowExtra}
        onReview={(ids) => restartWith({ wordIds: ids })}
        reviewLabel={mode === "quiz" ? (count) => `Làm lại ${count} câu sai` : undefined}
        action={
          <Button variant="outline" onClick={exit}>
            {back.label}
          </Button>
        }
      />
    </StudyFrame>
  );

  return (
    <>
      <StudySession
        key={`${session.id}-${run.id}`}
        session={session}
        onExit={exit}
        onRestart={() => restartWith(sourceOf(session))}
        onFinish={() => void invalidateProgress()}
        renderCard={renderCard}
        renderSummary={renderSummary}
        backdrop={backdrop}
        overlay={overlay}
        actions={tools}
        hold={settingsOpen}
        timed={mode === "reel" || (mode === "quiz" && settings.quizSeconds > 0)}
        layout={layout}
      />
      {settingsSheet}
    </>
  );
}
