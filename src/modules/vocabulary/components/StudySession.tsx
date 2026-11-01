import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";

import { Button, IconButton, ProgressBar } from "@/shared/components/ui";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";

import { useAnswerSession } from "../hooks/useAnswerSession";
import { useCompleteSession } from "../hooks/useCompleteSession";
import type {
  ReviewGrade,
  SchedulePreviewDto,
  SessionAnswerRequest,
  StudyItemDto,
  StudySessionDto,
} from "../types/vocabulary.types";
import { getTzOffset } from "../utils/time";
import styles from "./StudySession.module.css";

export interface AnswerOptions {
  /** Keep the answered card on screen at least this long (feedback), then advance. */
  holdMs?: number;
}

/** What a study mode receives to render the current card. */
export interface StudyCardApi {
  item: StudyItemDto;
  /** Unique per attempt; use as `key` to reset per-card state. */
  cardKey: string;
  /** 0-based index of the card in the session queue. */
  position: number;
  preview: SchedulePreviewDto;
  saving: boolean;
  failed: boolean;
  answer: (grade: ReviewGrade, options?: AnswerOptions) => void;
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
  /** Extra controls in the top bar (e.g. the snowfall toggle). */
  toolbar?: ReactNode;
  /** Decorative layer behind the stage (e.g. snowfall). */
  backdrop?: ReactNode;
}

type SavePhase = "idle" | "saving" | "error";

/** Last request, kept for an idempotent retry. */
type Pending =
  { kind: "answer"; body: SessionAnswerRequest; holdMs: number } | { kind: "complete" };

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });

function buildResult(session: StudySessionDto): SessionResult {
  const latest = new Map<string, StudyItemDto>();
  for (const item of session.items) latest.set(item.word.id, item);
  const review = (session.summary?.wordIds ?? [])
    .map((id) => latest.get(id))
    .filter((item): item is StudyItemDto => !!item);
  return { remembered: session.summary?.remembered ?? 0, review };
}

/**
 * Full-screen focus layout for one server session. The server owns the queue: each answer is
 * posted and the returned state is rendered (position, re-queued cards, previews).
 */
export function StudySession({
  session: initial,
  onExit,
  onRestart,
  onFinish,
  renderCard,
  renderSummary,
  toolbar,
  backdrop,
}: StudySessionProps) {
  const [session, setSession] = useState(initial);
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [pending, setPending] = useState<Pending | null>(null);
  const answerMutation = useAnswerSession();
  const completeMutation = useCompleteSession();
  const reducedMotion = usePrefersReducedMotion();

  const finished = session.status !== "Active";
  const total = Math.max(session.total, session.items.length);
  const entry = finished ? undefined : session.items[session.position];
  const result = useMemo(() => (finished ? buildResult(session) : null), [finished, session]);

  const complete = async () => {
    setPhase("saving");
    setPending({ kind: "complete" });
    try {
      const completed = await completeMutation.mutateAsync(session.id);
      setSession(completed);
      setPhase("idle");
      setPending(null);
      onFinish?.(completed);
    } catch {
      setPhase("error");
    }
  };

  const submit = async (body: SessionAnswerRequest, holdMs: number) => {
    setPhase("saving");
    setPending({ kind: "answer", body, holdMs });
    try {
      const [next] = await Promise.all([
        answerMutation.mutateAsync({ sessionId: session.id, body }),
        wait(reducedMotion ? Math.min(holdMs, 700) : holdMs),
      ]);
      setSession(next);
      setPending(null);
      if (next.status === "Active" && next.position >= Math.max(next.total, next.items.length)) {
        await complete();
      } else {
        setPhase("idle");
        if (next.status !== "Active") onFinish?.(next);
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
    );
  };

  /** Re-sends the same request (answers are idempotent by clientEventId). */
  const retry = () => {
    if (phase !== "error") return;
    if (pending?.kind === "answer") void submit(pending.body, 0);
    else void complete();
  };

  const done = finished ? total : session.position;

  return (
    <div className={styles.shell}>
      {backdrop}
      <header className={styles.bar}>
        <IconButton label="Thoát" onClick={onExit}>
          <X size={20} />
        </IconButton>
        <ProgressBar
          className={styles.progress}
          value={done}
          max={Math.max(total, 1)}
          tone={finished ? "green" : "blue"}
          label="Tiến độ"
        />
        <span className={styles.count}>
          {Math.min(session.position + 1, total)}/{total}
        </span>
        {toolbar}
        <IconButton
          label="Làm lại từ đầu"
          onClick={onRestart}
          disabled={phase === "saving" || (session.position === 0 && !finished)}
        >
          <RotateCcw size={18} />
        </IconButton>
      </header>

      <div className={styles.stage}>
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
                answer,
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
      </div>
    </div>
  );
}
