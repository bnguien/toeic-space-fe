import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Snowflake } from "lucide-react";

import emptyMascot from "@/assets/mascot/oy2-empty.png";
import errorMascot from "@/assets/mascot/oy2-error.png";
import successMascot from "@/assets/mascot/oy2-success.png";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  IconButton,
  PageContainer,
  Skeleton,
  Snowfall,
} from "@/shared/components/ui";

import { FlashcardCard } from "../components/FlashcardCard";
import { QuizCard } from "../components/QuizCard";
import { ReelCard } from "../components/ReelCard";
import { SaveWordButton } from "../components/SaveWordButton";
import { SessionSummary } from "../components/SessionSummary";
import { StudySession, type SessionResult, type StudyCardApi } from "../components/StudySession";
import { useInvalidateLearnerProgress } from "../hooks/useInvalidateLearnerProgress";
import { useQuizQuestions } from "../hooks/useQuizQuestions";
import { useReelBackgrounds } from "../hooks/useReelBackgrounds";
import { useStudySessionStart, type SessionTarget } from "../hooks/useStudySessionStart";
import { useVocabularyPreferences } from "../hooks/useVocabularyPreferences";
import type {
  QuizQuestionDto,
  SessionSource,
  SessionSourceDto,
  StudyMode,
  StudySessionDto,
  WordsSessionState,
} from "../types/vocabulary.types";
import { REVIEW_MODE, isStudyMode, quizGrade, toStudyMode } from "../utils/study-session";
import { getVocabularyErrorMessage } from "../utils/vocabulary-errors";
import styles from "./StudySessionPage.module.css";

const DUE_LIMIT = 50;
const QUIZ_FEEDBACK_MS = 1200;
const REEL_FEEDBACK_MS = 2500;

function sourceFromParams(params: URLSearchParams, state: unknown): SessionSource | null {
  const setId = params.get("set");
  if (setId) return { setId };
  const folderId = params.get("folder");
  if (folderId) return { folderId };
  if (params.get("library") === "1") return { library: true };
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
  if (kind === "Due") return { due: true, limit: DUE_LIMIT };
  return { wordIds: [...new Set(session.items.map((item) => item.word.id))] };
}

function backTarget(source: SessionSourceDto | undefined): { to: string; label: string } {
  switch (source?.kind) {
    case "Set":
      return { to: `/vocabulary/sets/${source.id}`, label: "Về bài học" };
    case "Folder":
      return { to: `/vocabulary?view=library&folder=${source.id}`, label: "Về thư mục" };
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

  return <SessionLoader key={`${mode}-${location.search}`} initialTarget={target} />;
}

interface Run {
  id: number;
  target: SessionTarget;
}

function SessionLoader({ initialTarget }: { initialTarget: SessionTarget }) {
  const navigate = useNavigate();
  const invalidateProgress = useInvalidateLearnerProgress();
  const { preferences, update } = useVocabularyPreferences();
  const [run, setRun] = useState<Run>({ id: 0, target: initialTarget });

  const sessionQuery = useStudySessionStart(run.target, run.id);
  const session = sessionQuery.data;
  const mode: StudyMode = session ? toStudyMode(session.mode) : "flashcard";

  const wordIds = useMemo(
    () => [...new Set((session?.items ?? []).map((item) => item.word.id))],
    [session],
  );
  const quizQuery = useQuizQuestions(wordIds, mode === "quiz");
  const backgroundsQuery = useReelBackgrounds(mode === "reel");
  const questions = useMemo(
    () => new Map<string, QuizQuestionDto>((quizQuery.data ?? []).map((q) => [q.wordId, q])),
    [quizQuery.data],
  );

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

  if (sessionQuery.isPending || (mode === "quiz" && wordIds.length > 0 && quizQuery.isPending)) {
    return (
      <PageContainer width="focus">
        <div className={styles.loading} aria-busy="true">
          <Skeleton height={8} />
          <Skeleton shape="block" height={360} />
          <Skeleton shape="block" height={64} />
        </div>
      </PageContainer>
    );
  }

  const failure = sessionQuery.isError
    ? sessionQuery
    : mode === "quiz" && quizQuery.isError
      ? quizQuery
      : null;
  if (failure || !session) {
    return (
      <PageContainer width="focus">
        <ErrorState
          image={errorMascot}
          title={getVocabularyErrorMessage(failure?.error)}
          onRetry={() => void (failure ?? sessionQuery).refetch()}
          action={
            <ButtonLink to={back.to} variant="outline">
              {back.label}
            </ButtonLink>
          }
        />
      </PageContainer>
    );
  }

  if (session.items.length === 0) {
    return (
      <PageContainer width="focus">
        <EmptyState
          image={emptyMascot}
          title={session.source.kind === "Due" ? "Không có từ đến hạn" : "Chưa có từ để học"}
          action={
            <ButtonLink to={back.to} variant="primary">
              {back.label}
            </ButtonLink>
          }
        />
      </PageContainer>
    );
  }

  const saveFor = (item: StudyCardApi["item"]) => (
    <SaveWordButton wordId={item.word.id} savedWordId={item.savedWordId} />
  );

  const renderCard = (card: StudyCardApi) => {
    if (mode === "flashcard") {
      return (
        <FlashcardCard
          key={card.cardKey}
          word={card.item.word}
          preview={card.preview}
          saving={card.saving}
          autoPlay={preferences.autoPlayAudio}
          backExtra={saveFor(card.item)}
          onGrade={(grade) => card.answer(grade)}
        />
      );
    }

    if (mode === "quiz") {
      const question = questions.get(card.item.word.id);
      if (!question) {
        return (
          <ErrorState
            image={errorMascot}
            title="Không tải được câu hỏi"
            onRetry={() => void quizQuery.refetch()}
          />
        );
      }
      return (
        <QuizCard
          key={card.cardKey}
          question={question}
          disabled={card.saving}
          revealExtra={saveFor(card.item)}
          onAnswer={(correct) => card.answer(quizGrade(correct), { holdMs: QUIZ_FEEDBACK_MS })}
        />
      );
    }

    return (
      <ReelCard
        word={card.item.word}
        cardKey={card.cardKey}
        backgrounds={backgroundsQuery.data ?? []}
        backgroundIndex={card.position}
        revealExtra={saveFor(card.item)}
        onAnswer={(grade) => card.answer(grade, { holdMs: REEL_FEEDBACK_MS })}
      />
    );
  };

  const renderSummary = (result: SessionResult) => (
    <SessionSummary
      image={successMascot}
      title="Hoàn thành"
      stats={[
        { label: "Đã nhớ", value: result.remembered },
        { label: "Cần ôn", value: result.review.length, tone: "mark" },
      ]}
      items={result.review}
      rowExtra={saveFor}
      onReview={(wordIds) => restartWith({ wordIds })}
      action={
        <Button variant="mark" onClick={exit}>
          {back.label}
        </Button>
      }
    />
  );

  return (
    <StudySession
      key={`${session.id}-${run.id}`}
      session={session}
      onExit={exit}
      onRestart={() => restartWith(sourceOf(session))}
      onFinish={() => void invalidateProgress()}
      renderCard={renderCard}
      renderSummary={renderSummary}
      backdrop={<Snowfall active={preferences.snowfall} />}
      toolbar={
        <IconButton
          label={preferences.snowfall ? "Tắt tuyết rơi" : "Bật tuyết rơi"}
          aria-pressed={preferences.snowfall}
          className={styles.snow}
          data-active={preferences.snowfall || undefined}
          onClick={() => update({ snowfall: !preferences.snowfall })}
        >
          <Snowflake size={18} />
        </IconButton>
      }
    />
  );
}
