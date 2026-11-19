import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { sfx } from "@/shared/utils/sfx";

import { useAnswerSession } from "../hooks/useAnswerSession";
import { useCompleteSession } from "../hooks/useCompleteSession";
import { useWordEdits } from "../hooks/useWordEdits";
import type {
  ReviewGrade,
  SchedulePreviewDto,
  SessionAnswerRequest,
  StudyItemDto,
  StudyLayout,
  StudySessionDto,
  StudySettingsDto,
} from "../types/vocabulary.types";
import type { CardTheme } from "../utils/card-themes";
import { getTzOffset } from "../utils/time";
import styles from "./StudySession.module.css";
import { StudyStage, StudyToolButton } from "./StudyStage";

export interface AnswerOptions {
  /** Keep the answered card on screen at least this long (feedback), then advance. */
  holdMs?: number;
  /** Stay on the answered card until `advance()` (memory cue, auto-advance timers). */
  manual?: boolean;
}

/** What a study mode receives to render the current card. */
export interface StudyCardApi {
  /** Current item with the learner's in-session edits applied. */
  item: StudyItemDto;
  /** Unique per attempt; use as `key` to reset per-card state. */
  cardKey: string;
  /** 0-based index of the card in the session queue. */
  position: number;
  preview: SchedulePreviewDto;
  saving: boolean;
  failed: boolean;
  /** Timers stop: paused by the learner or a sheet is open. */
  paused: boolean;
  /** Paused with the pause button / P. */
  userPaused: boolean;
  togglePause: () => void;
  answer: (grade: ReviewGrade, options?: AnswerOptions) => void;
  /** Moves on after an answer sent with `manual`. */
  advance: () => void;
}

/** Props shared by the three study modes. */
export interface StudyModeProps {
  card: StudyCardApi;
  theme: CardTheme;
  settings: StudySettingsDto;
  /** Speak the headword automatically (top-level `autoPlayAudio`). */
  autoPlay: boolean;
}

export interface SessionResult {
  remembered: number;
  /** Words to review, with their latest progress and preview. */
  review: StudyItemDto[];
}

interface StudySessionProps {
  /** Server state that seeds the view (started or resumed). */
  session: StudySessionDto;
  onExit: () => void;
  /** Starts the same source over on the server. */
  onRestart: () => void;
  /** Called once when the server has completed the session. */
  onFinish?: (session: StudySessionDto) => void;
  renderCard: (card: StudyCardApi) => ReactNode;
  renderSummary: (result: SessionResult) => ReactNode;
  /** Full-viewport layer; receives the current position (scene changes). */
  backdrop?: (position: number) => ReactNode;
  /** Decoration over the backdrop (e.g. snowfall). */
  overlay?: ReactNode;
  /** Extra top-bar tools before "restart" (settings, snowfall). */
  actions?: ReactNode;
  /** Stops timers from outside (e.g. the settings sheet is open). */
  hold?: boolean;
  /** The mode has timers: enables the pause key. */
  timed?: boolean;
  /** Stage shape (already narrowed to portrait on small screens). */
  layout?: StudyLayout;
}

type SavePhase = "idle" | "saving" | "error";

/** Last request, kept for an idempotent retry. */
type Pending =
  { kind: "answer"; body: SessionAnswerRequest; holdMs: number } | { kind: "complete" };

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });

/** Holds a manual answer on screen until the card calls `advance()`. */
class AdvanceGate {
  private release: (() => void) | null = null;

  /** Starts a new wait that resolves on the next `open()`. */
  wait(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  open() {
    this.release?.();
    this.release = null;
  }
}

function buildResult(session: StudySessionDto): SessionResult {
  const latest = new Map<string, StudyItemDto>();
  for (const item of session.items) latest.set(item.word.id, item);
  const review = (session.summary?.wordIds ?? [])
    .map((id) => latest.get(id))
    .filter((item): item is StudyItemDto => !!item);
  return { remembered: session.summary?.remembered ?? 0, review };
}

/**
 * Immersive layout for one server session. The server owns the queue: each answer is posted and
 * the returned state is rendered (position, re-queued cards, previews). Timers pause while the
 * learner pauses or a sheet is open; keys P (pause) and E (edit) work on every card.
 */
export function StudySession({
  session: initial,
  onExit,
  onRestart,
  onFinish,
  renderCard,
  renderSummary,
  backdrop,
  overlay,
  actions,
  hold = false,
  timed = false,
  layout = "portrait",
}: StudySessionProps) {
  const [session, setSession] = useState(initial);
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [pending, setPending] = useState<Pending | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [gate] = useState(() => new AdvanceGate());
  const answerMutation = useAnswerSession();
  const completeMutation = useCompleteSession();
  const reducedMotion = usePrefersReducedMotion();
  const { applyItem, openEdit, editing } = useWordEdits();

  const finished = session.status !== "Active";
  const total = Math.max(session.total, session.items.length);
  const raw = finished ? undefined : session.items[session.position];
  const entry = raw ? applyItem(raw) : undefined;
  const result = useMemo(() => {
    if (!finished) return null;
    const built = buildResult(session);
    return { ...built, review: built.review.map(applyItem) };
  }, [finished, session, applyItem]);
  const paused = userPaused || hold || editing;

  const complete = async () => {
    setPhase("saving");
    setPending({ kind: "complete" });
    try {
      const completed = await completeMutation.mutateAsync(session.id);
      setSession(completed);
      setPhase("idle");
      setPending(null);
      sfx.play("finish");
      onFinish?.(completed);
    } catch {
      setPhase("error");
    }
  };

  const submit = async (body: SessionAnswerRequest, holdMs: number, manual: boolean) => {
    setPhase("saving");
    setPending({ kind: "answer", body, holdMs });
    const held = manual ? gate.wait() : null;
    try {
      const [next] = await Promise.all([
        answerMutation.mutateAsync({ sessionId: session.id, body }),
        wait(reducedMotion ? Math.min(holdMs, 700) : holdMs),
        held,
      ]);
      setSession(next);
      setPending(null);
      if (next.status === "Active" && next.position >= Math.max(next.total, next.items.length)) {
        await complete();
      } else {
        setPhase("idle");
        if (next.status === "Active") sfx.play("swipe");
        else {
          sfx.play("finish");
          onFinish?.(next);
        }
      }
    } catch {
      setPhase("error");
    }
  };

  const answer = (grade: ReviewGrade, options: AnswerOptions = {}) => {
    if (!entry || phase === "saving") return;
    void submit(
      {
        wordId: entry.word.id,
        grade,
        clientEventId: crypto.randomUUID(),
        tzOffset: getTzOffset(),
      },
      options.holdMs ?? 0,
      options.manual ?? false,
    );
  };

  const advance = () => gate.open();

  /** Re-sends the same request (answers are idempotent by clientEventId). */
  const retry = () => {
    if (phase !== "error") return;
    if (pending?.kind === "answer") void submit(pending.body, 0, false);
    else void complete();
  };

  const togglePause = () => setUserPaused((value) => !value);

  useHotkeys(
    (event) => {
      const key = event.key.toLowerCase();
      if (key === "p" && timed) {
        event.preventDefault();
        togglePause();
      } else if (key === "e" && entry) {
        event.preventDefault();
        openEdit(entry.word);
      }
    },
    !hold && !editing && !finished,
  );

  const done = finished ? total : session.position;

  return (
    <StudyStage
      backdrop={backdrop?.(session.position)}
      overlay={overlay}
      done={done}
      total={total}
      count={`${Math.min(session.position + 1, total)}/${total}`}
      finished={finished}
      layout={layout}
      onClose={onExit}
      actions={
        <>
          {actions}
          <StudyToolButton
            label="Làm lại từ đầu"
            onClick={onRestart}
            disabled={phase === "saving" || (session.position === 0 && !finished)}
          >
            <RotateCcw size={18} />
          </StudyToolButton>
        </>
      }
    >
      {result
        ? renderSummary(result)
        : entry
          ? renderCard({
              item: entry,
              cardKey: `${session.id}-${session.position}`,
              position: session.position,
              preview: entry.preview,
              saving: phase === "saving",
              failed: phase === "error",
              paused,
              userPaused,
              togglePause,
              answer,
              advance,
            })
          : phase !== "error" && (
              <Button variant="primary" size="lg" onClick={() => void complete()}>
                Xem kết quả
              </Button>
            )}

      {phase === "error" && (
        <div className={styles.error} role="alert">
          <AlertCircle size={18} />
          <span>Chưa lưu được kết quả</span>
          <Button size="sm" icon={<RotateCcw size={14} />} onClick={retry}>
            Thử lại
          </Button>
        </div>
      )}
    </StudyStage>
  );
}
