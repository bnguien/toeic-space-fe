import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Headphones, Play } from "lucide-react";

import { mediaUrls } from "@/shared/components/RichText";
import { Button } from "@/shared/components/ui";

import { useListeningFlow } from "../../hooks/useListeningFlow";
import type { Answer, AnswerOption } from "../../types/practice-exam.types";
import type { QuestionGroup } from "../../utils/attemptGroups";
import { answerWindowSeconds } from "../../utils/examSteps";
import { ExamQuestionCard } from "./ExamQuestionCard";
import { activatesOnEnter, ownsKeys } from "./examRoomState";
import styles from "./ExamScreens.module.css";

export interface ExamListeningScreenProps {
  group: QuestionGroup;
  answerOf: (questionId: string) => AnswerOption | null;
  isFlagged: (questionId: string) => boolean;
  flagFailed: (questionId: string) => boolean;
  onAnswer: (questionId: string, answer: Answer) => void;
  onFlag: (questionId: string) => void;
  /** Called once when the answer window is over or "Tiếp ›" / Enter is used after the audio. */
  onAdvance: () => void;
  keysEnabled: boolean;
}

const rangeLabel = (group: QuestionGroup) =>
  group.firstNumber === group.lastNumber
    ? `Câu ${group.firstNumber}`
    : `Câu ${group.firstNumber}–${group.lastNumber}`;

/**
 * One Listening group (port of StudyChill ExamListeningScreen): the audio plays ONCE on the shared
 * exam element (no pause / seek / replay), then the answer window counts down and the room moves
 * on. "Tiếp ›" and Enter only work once the audio is over. Mount with `key` = step.
 */
export function ExamListeningScreen({
  group,
  answerOf,
  isFlagged,
  flagFailed,
  onAnswer,
  onFlag,
  onAdvance,
  keysEnabled,
}: ExamListeningScreenProps) {
  const windowSeconds = answerWindowSeconds(group);
  const flow = useListeningFlow({
    src: group.audioUrl,
    afterSeconds: windowSeconds,
    onDone: onAdvance,
  });
  const { finished, skip } = flow;
  const images = useMemo(() => group.imageUrls.flatMap((url) => mediaUrls(url)), [group.imageUrls]);
  const lettersOnly = group.part <= 2;

  useEffect(() => {
    if (!keysEnabled || !finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || event.defaultPrevented) return;
      if (ownsKeys(event.target) || activatesOnEnter(event.target)) return;
      event.preventDefault();
      skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysEnabled, finished, skip]);

  let meter: ReactNode;
  if (flow.status === "blocked") {
    meter = (
      <Button
        variant="primary"
        className={styles.playOnce}
        icon={<Play size={16} aria-hidden="true" />}
        onClick={flow.play}
      >
        Phát
      </Button>
    );
  } else if (finished) {
    meter = (
      <div className={styles.meter} data-answering role="timer" aria-live="off">
        <span>
          {flow.status === "error" ? "Không tải được audio · " : ""}Thời gian trả lời:{" "}
          <strong>{flow.windowLeft ?? windowSeconds}s</strong>
        </span>
        <span className={styles.track} data-countdown aria-hidden="true">
          <i
            style={{ "--count-duration": `${flow.windowTotal ?? windowSeconds}s` } as CSSProperties}
          />
        </span>
      </div>
    );
  } else {
    meter = (
      <div className={styles.meter}>
        <Headphones size={16} aria-hidden="true" />
        <span>{flow.status === "loading" ? "Đang tải audio…" : "Đang phát"}</span>
        <span
          className={styles.track}
          role="progressbar"
          aria-label="Tiến độ audio"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(flow.progress * 100)}
        >
          <i style={{ width: `${Math.round(flow.progress * 100)}%` }} />
        </span>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.scroll}>
        <div className={styles.listen} data-part={group.part}>
          <p className={styles.groupLabel} data-section="listening">
            Part {group.part} · {rangeLabel(group)}
          </p>
          {images.length > 0 && (
            <div className={styles.listenMedia} data-photo={group.part === 1 || undefined}>
              {images.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={
                    group.part === 1 ? `Tranh câu ${group.firstNumber}` : `Hình minh hoạ ${i + 1}`
                  }
                  draggable={false}
                />
              ))}
            </div>
          )}
          <div className={styles.listenQuestions}>
            {group.questions.map((q) => (
              <ExamQuestionCard
                key={q.id}
                question={q}
                answer={answerOf(q.id)}
                flagged={isFlagged(q.id)}
                flagFailed={flagFailed(q.id)}
                onAnswer={onAnswer}
                onFlag={onFlag}
                lettersOnly={lettersOnly}
                prompt={group.part === 2 ? "Mark your answer." : undefined}
              />
            ))}
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerStatus}>{meter}</div>
        <Button
          variant="primary"
          onClick={skip}
          disabled={!finished}
          title={finished ? "Sang nhóm câu tiếp theo" : "Chờ audio phát xong"}
          trailing={<ChevronRight size={16} aria-hidden="true" />}
        >
          Tiếp
        </Button>
      </footer>
    </div>
  );
}
