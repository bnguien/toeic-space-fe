import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  ListChecks,
  LoaderCircle,
  Play,
  Puzzle,
  RotateCcw,
  Shuffle,
} from "lucide-react";

import { Button } from "@/shared/components/ui";

import type { AttemptSummary } from "../../types/practice-exam.types";
import { PART1_GAME_MODES, part1GameMode, type Part1GameMode } from "../../utils/part1Games";
import {
  RANDOM_COUNT_MIN,
  RANDOM_COUNT_PICKS,
  clampRandomCount,
  continueDescription,
  defaultRandomCount,
  type SetupChoice,
} from "../../utils/practiceSelection";
import { formatDateTime } from "../../utils/scoreDisplay";
import styles from "./Setup.module.css";
import {
  abandonsActive,
  planOf,
  plannedCount,
  plannedLabel,
  startButtonLabel,
  type ContinueMode,
  type SetupContext,
  type SetupPlan,
} from "./setupModel";

const GAME_ICONS: Record<Part1GameMode, typeof Headphones> = {
  classic: Headphones,
  truefalse: ListChecks,
  keyword: Puzzle,
};

export interface SetupStart {
  plan: SetupPlan;
  part1Game: Part1GameMode;
}

interface SetupFormProps {
  part: number;
  ctx: SetupContext;
  /** Completed attempts of the set (for "Xem lại bài chữa"), newest first. */
  completed: readonly AttemptSummary[];
  pending: boolean;
  error: string | null;
  onStart: (start: SetupStart) => void;
}

/**
 * Step 1 "Học phần nào?" (continue / mistakes / random N / review), step 2 for Part 1
 * "Luyện theo kiểu nào?", then the start button with its summary.
 */
export function SetupForm({ part, ctx, completed, pending, error, onStart }: SetupFormProps) {
  const { counts, active } = ctx;
  const [choice, setChoice] = useState<SetupChoice>("continue");
  const [continueMode, setContinueMode] = useState<ContinueMode>("resume");
  const [countText, setCountText] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [game, setGame] = useState<Part1GameMode>("classic");

  const upper = Math.min(200, Math.max(RANDOM_COUNT_MIN, counts.total));
  const typed = Number(countText);
  const countValid =
    countText === "" || (Number.isInteger(typed) && typed >= RANDOM_COUNT_MIN && typed <= upper);
  const count =
    countText === "" ? defaultRandomCount(counts.total) : clampRandomCount(typed, counts.total);
  const options = { continueMode, count, reviewId };
  const plan = planOf(choice, ctx, options);
  const planned = plannedCount(choice, ctx, options);
  const reviewing = choice === "review";
  const hasGames = part === 1;
  const gameOn = hasGames && !reviewing;
  const canStart = Boolean(plan) && !pending && (choice !== "random" || countValid);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!plan || !canStart) return;
    onStart({ plan, part1Game: gameOn ? game : "classic" });
  };

  const continueDetail = active
    ? active.answered > 0
      ? `Bài ${active.questionCount} câu đang làm dở, đã làm ${active.answered} câu.`
      : `Bài ${active.questionCount} câu đang làm dở, chưa làm câu nào.`
    : counts.total > 0 && counts.unanswered === 0
      ? `Bạn đã làm hết ${counts.total} câu. Làm lại cả bộ từ đầu.`
      : continueDescription(counts);

  const alternatives = [
    {
      id: "mistakes" as const,
      icon: RotateCcw,
      title: "Ôn lại câu sai",
      detail: `Làm lại ${counts.wrong} câu đã chấm sai, bắt đầu sạch.`,
      off: counts.wrong ? "" : "Chưa có câu nào chấm sai.",
    },
    {
      id: "random" as const,
      icon: Shuffle,
      title: "Tạo bài ngẫu nhiên",
      detail: `Tự chọn số câu, ưu tiên câu chưa làm trong ${counts.total} câu của bộ.`,
      off: counts.total ? "" : "Bộ luyện chưa có câu hỏi.",
    },
    {
      id: "review" as const,
      icon: BookOpen,
      title: "Xem lại bài chữa",
      detail:
        completed.length > 1
          ? `Mở lại ${completed.length} bài đã nộp kèm đáp án và giải thích.`
          : "Mở lại bài đã nộp kèm đáp án và giải thích.",
      off: completed.length ? "" : "Chưa có bài nào đã nộp để xem chữa.",
    },
  ];

  return (
    <form className={styles.sheet} onSubmit={submit} aria-labelledby="setup-title">
      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          {hasGames && <span className={styles.step}>Bước 1</span>}
          Học phần nào?
        </legend>

        <label className={styles.mainChoice} data-on={choice === "continue" || undefined}>
          <input
            type="radio"
            name="setup-choice"
            value="continue"
            checked={choice === "continue"}
            onChange={() => setChoice("continue")}
          />
          <Play size={22} aria-hidden="true" className={styles.choiceIcon} />
          <span className={styles.mainText}>
            <strong>Tiếp tục học</strong>
            <span>{continueDetail}</span>
          </span>
        </label>

        {choice === "continue" && active && (
          <div className={styles.sub} role="radiogroup" aria-label="Cách tiếp tục">
            <label>
              <input
                type="radio"
                name="continue-mode"
                checked={continueMode === "resume"}
                onChange={() => setContinueMode("resume")}
              />
              <span>
                <strong>Làm tiếp {active.title || "bài đang dở"}</strong>
                <small>
                  Đã làm {active.answered}/{active.questionCount} câu, đáp án được giữ nguyên.
                </small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="continue-mode"
                checked={continueMode === "fresh"}
                onChange={() => setContinueMode("fresh")}
              />
              <span>
                <strong>
                  {counts.unanswered > 0
                    ? `Học tiếp ${counts.unanswered} câu chưa làm`
                    : `Làm lại cả bộ (${counts.total} câu)`}
                </strong>
                <small>Bỏ bài đang dở; kết quả {counts.answered} câu đã làm vẫn được giữ.</small>
              </span>
            </label>
          </div>
        )}

        <ul className={styles.alts}>
          {alternatives.map((alt) => {
            const disabled = Boolean(alt.off);
            const on = choice === alt.id;
            return (
              <li key={alt.id}>
                <label
                  className={styles.alt}
                  data-on={on || undefined}
                  data-off={disabled || undefined}
                >
                  <input
                    type="radio"
                    name="setup-choice"
                    value={alt.id}
                    checked={on}
                    disabled={disabled}
                    onChange={() => setChoice(alt.id)}
                  />
                  <alt.icon size={18} aria-hidden="true" />
                  <span>
                    <strong>{alt.title}</strong>
                    <small>{disabled ? alt.off : alt.detail}</small>
                  </span>
                </label>

                {alt.id === "random" && on && (
                  <div className={styles.count}>
                    <label htmlFor="setup-count">Số câu</label>
                    <div className={styles.countRow}>
                      <input
                        id="setup-count"
                        type="number"
                        inputMode="numeric"
                        min={RANDOM_COUNT_MIN}
                        max={upper}
                        step={1}
                        value={countText === "" ? String(count) : countText}
                        aria-invalid={!countValid || undefined}
                        aria-describedby="setup-count-help"
                        onChange={(event) => setCountText(event.target.value)}
                      />
                      {RANDOM_COUNT_PICKS.filter((n) => n <= counts.total).map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={count === n && countValid}
                          onClick={() => setCountText(String(n))}
                        >
                          {n} câu
                        </button>
                      ))}
                    </div>
                    <p id="setup-count-help" data-invalid={!countValid || undefined}>
                      Từ {RANDOM_COUNT_MIN} đến {upper} câu. Ưu tiên câu chưa làm, thiếu thì bù câu
                      đã làm; bài mới bắt đầu sạch.
                      {ctx.grouped &&
                        " Nhóm câu theo đoạn được giữ trọn nên số câu có thể lệch một chút."}
                    </p>
                  </div>
                )}

                {alt.id === "review" && on && completed.length > 1 && (
                  <div className={styles.sub} role="radiogroup" aria-label="Bài muốn xem chữa">
                    {completed.slice(0, 5).map((attempt, index) => {
                      const selected = (reviewId ?? completed[0].id) === attempt.id;
                      return (
                        <label key={attempt.id}>
                          <input
                            type="radio"
                            name="review-attempt"
                            checked={selected}
                            onChange={() => setReviewId(attempt.id)}
                          />
                          <span>
                            <strong>
                              {attempt.title || `Bài ${completed.length - index}`}
                              {index === 0 && " · mới nhất"}
                            </strong>
                            <small>
                              {formatDateTime(attempt.endTime ?? attempt.startTime)} · Đúng{" "}
                              {attempt.correct}/{attempt.questionCount} câu
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {hasGames && (
        <fieldset className={styles.section} disabled={!gameOn}>
          <legend className={styles.sectionTitle}>
            <span className={styles.step}>Bước 2</span>
            Luyện theo kiểu nào?
          </legend>
          <p className={styles.gameIntro}>
            {gameOn
              ? "Cùng một bộ tranh và audio, chọn cách làm hợp với bạn. Người mới nên thử Đúng hay Sai hoặc Điền từ khoá."
              : "Xem bài chữa luôn mở dạng đề thật A–D, nên không chọn kiểu chơi ở bước này."}
          </p>
          <div className={styles.games}>
            {PART1_GAME_MODES.map((mode) => {
              const Icon = GAME_ICONS[mode.id];
              const on = gameOn ? game === mode.id : mode.id === "classic";
              return (
                <label key={mode.id} className={styles.game} data-on={on || undefined}>
                  <input
                    type="radio"
                    name="game-mode"
                    value={mode.id}
                    checked={on}
                    onChange={() => setGame(mode.id)}
                  />
                  <Icon size={22} aria-hidden="true" className={styles.gameIcon} />
                  <strong>{mode.title}</strong>
                  <span className={styles.gameLine}>{mode.description}</span>
                  <span className={styles.gameLevel}>Hợp với: {mode.level}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className={styles.start}>
        <p className={styles.startSummary}>
          {plannedLabel(
            planned,
            ctx.grouped && plan?.kind === "start" && plan.selection === "Random",
          )}
          {gameOn ? ` · ${part1GameMode(game).title}` : ""}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canStart}
          icon={pending ? <LoaderCircle size={18} className={styles.spin} /> : undefined}
          trailing={pending ? undefined : <ArrowRight size={18} />}
        >
          {pending ? "Đang mở bài…" : startButtonLabel(plan, ctx, count)}
        </Button>
        {abandonsActive(plan, ctx) && (
          <p className={styles.warn}>Bài đang làm dở sẽ được bỏ để bắt đầu bài mới.</p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.startNote}>
          Tiến độ được lưu trên tài khoản của bạn, đổi máy vẫn học tiếp được.
        </p>
      </div>
    </form>
  );
}
