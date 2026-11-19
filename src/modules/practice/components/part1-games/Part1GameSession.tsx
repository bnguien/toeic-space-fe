import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Snail,
  XCircle,
} from "lucide-react";

import cheerMascot from "@/assets/mascot/oy2-cheer.png";
import focusMascot from "@/assets/mascot/oy2-determined.png";
import { mediaUrls } from "@/shared/components/RichText";
import { Button, ProgressBar } from "@/shared/components/ui";

import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import type { AttemptSession } from "../../hooks/useAttemptSession";
import type { AnswerOption } from "../../types/practice-exam.types";
import type { GroupQuestion, QuestionGroup } from "../../utils/attemptGroups";
import {
  distractorPool,
  part1GameMode,
  statementsOf,
  trueFalseAnswer,
  trueFalseScore,
  type TrueFalseMarks,
} from "../../utils/part1Games";
import {
  AnswerPad,
  KeywordGame,
  TrueFalsePad,
  TrueFalseResult,
  type KeywordState,
} from "./Part1GameSteps";
import styles from "./Part1GameSession.module.css";

export type Part1GameModeId = "truefalse" | "keyword";

/** Check state of the workspace: which group is being checked or failed. */
export type Part1CheckState = { groupId: string; status: "checking" | "failed" } | null;

export interface Part1GameSessionProps {
  mode: Part1GameModeId;
  /** Part 1 groups of the attempt (one question each). */
  groups: readonly QuestionGroup[];
  index: number;
  onIndex: (index: number) => void;
  session: AttemptSession;
  checkState: Part1CheckState;
  /** Grades one question (`session.check`) through the workspace. */
  onCheck: (group: QuestionGroup, questionId: string) => void;
  /** "← Đổi cách học" / "Về màn chọn cách học". */
  onChangeMode: () => void;
  /** "Xem lại kiểu đề thật": the normal workspace. */
  onClassic: () => void;
}

interface PlayState extends KeywordState {
  marks?: TrueFalseMarks;
}

/**
 * Part 1 games (port of StudyChill `Part1GameSession`, without the StudyChill dictation mode):
 * "Đúng hay Sai" and "Điền từ khoá". The four statements are the audio script, so they appear only
 * once the question is checked (`session.check`). Game state is not saved; only the A–D answer is.
 */
export function Part1GameSession({
  mode,
  groups,
  index,
  onIndex,
  session,
  checkState,
  onCheck,
  onChangeMode,
  onClassic,
}: Part1GameSessionProps) {
  const meta = part1GameMode(mode);
  const [play, setPlay] = useState<Record<string, PlayState>>({});
  const [finished, setFinished] = useState(false);
  const group = groups[Math.min(index, groups.length - 1)];
  const q = group.questions[0];
  const reveal = q.reveal;
  const statements = useMemo(() => statementsOf(q), [q]);
  const allQuestions = useMemo(() => groups.map((g) => g.questions[0]), [groups]);
  const distractors = useMemo(
    () => (reveal && mode === "keyword" ? distractorPool(q.id, allQuestions) : []),
    [reveal, mode, q.id, allQuestions],
  );
  const state = play[q.id] ?? {};
  const patch = (next: PlayState) =>
    setPlay((value) => ({ ...value, [q.id]: { ...(value[q.id] ?? {}), ...next } }));

  const busy = checkState?.groupId === group.id && checkState.status === "checking";
  const failed = checkState?.groupId === group.id && checkState.status === "failed";
  const selected = session.answerOf(q.id);
  const total = groups.length;
  const checkedCount = allQuestions.filter((item) => item.reveal !== null).length;
  const isLast = index >= total - 1;
  const stepDone = reveal !== null && (mode !== "keyword" || Boolean(state.solved));

  const commit = (answer: AnswerOption | null) => {
    if (!answer) return;
    session.select(q.id, answer);
    onCheck(group, q.id);
  };

  if (finished) {
    return (
      <div className={styles.page}>
        <Summary
          title={meta.title}
          mode={mode}
          questions={allQuestions}
          play={play}
          onChangeMode={onChangeMode}
          onClassic={onClassic}
        />
      </div>
    );
  }

  let panel;
  if (!reveal && (busy || failed)) {
    panel = (
      <div className={styles.pending} role={failed ? "alert" : "status"}>
        <Clock size={18} aria-hidden="true" />
        <span>{busy ? "Đang chấm với máy chủ…" : "Chưa lấy được đáp án."}</span>
        {failed && (
          <Button variant="ghost" size="sm" onClick={() => onCheck(group, q.id)}>
            Thử lại
          </Button>
        )}
      </div>
    );
  } else if (!reveal) {
    panel =
      mode === "truefalse" ? (
        <TrueFalsePad
          marks={state.marks ?? {}}
          busy={busy}
          onMark={(key, value) =>
            patch({
              marks: { ...state.marks, [key]: state.marks?.[key] === value ? undefined : value },
            })
          }
          onCommit={() => commit(trueFalseAnswer(state.marks ?? {}))}
        />
      ) : (
        <AnswerPad
          picked={selected}
          busy={busy}
          onPick={(key) => session.select(q.id, key)}
          onCommit={() => commit(selected)}
        />
      );
  } else {
    const right = reveal.userAnswer !== null && reveal.userAnswer === reveal.correctAnswer;
    panel = (
      <>
        <p className={styles.verdict} data-tone={right ? "good" : "bad"}>
          {right ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <XCircle size={18} aria-hidden="true" />
          )}
          {right
            ? `Chính xác! Đáp án là (${reveal.correctAnswer}).`
            : `Bạn chọn (${reveal.userAnswer ?? "—"}), đáp án đúng là (${reveal.correctAnswer}).`}
        </p>
        {statements.length === 0 ? (
          <p className={styles.note}>Câu này chưa có chữ lời thoại để luyện.</p>
        ) : mode === "truefalse" ? (
          <TrueFalseResult
            statements={statements}
            correct={reveal.correctAnswer}
            marks={state.marks ?? {}}
          />
        ) : (
          <KeywordGame
            key={q.id}
            questionId={q.id}
            correct={reveal.correctAnswer}
            statements={statements}
            distractors={distractors}
            state={state}
            onState={patch}
          />
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={17} aria-hidden="true" />}
          onClick={onChangeMode}
        >
          Đổi cách học
        </Button>
        <div className={styles.topTitle}>
          <strong>Part 1 · {meta.title}</strong>
          <span>
            Câu {index + 1}/{total} · đã chấm {checkedCount}
          </span>
        </div>
        <ProgressBar
          className={styles.topProgress}
          value={checkedCount}
          max={total}
          size="xs"
          label="Số câu đã chấm"
        />
      </header>

      <main className={styles.body}>
        <PictureAudio key={q.id} question={q} group={group} autoplay={reveal === null} />
        <section className={styles.panel} aria-live="polite">
          {panel}
        </section>
      </main>

      <footer className={styles.foot}>
        <Button
          variant="outline"
          icon={<ArrowLeft size={17} aria-hidden="true" />}
          disabled={index <= 0}
          onClick={() => onIndex(index - 1)}
        >
          Câu trước
        </Button>
        {isLast ? (
          <Button
            variant={stepDone ? "primary" : "outline"}
            trailing={<ArrowRight size={17} aria-hidden="true" />}
            onClick={() => setFinished(true)}
          >
            Xem kết quả
          </Button>
        ) : (
          <Button
            variant={stepDone ? "primary" : "outline"}
            trailing={<ArrowRight size={17} aria-hidden="true" />}
            onClick={() => onIndex(index + 1)}
          >
            {stepDone ? "Câu tiếp" : "Bỏ qua"}
          </Button>
        )}
      </footer>
    </div>
  );
}

/** Photo + original audio with "Nghe lại từ đầu" and "Nghe chậm 0.8×". */
function PictureAudio({
  question,
  group,
  autoplay,
}: {
  question: GroupQuestion;
  group: QuestionGroup;
  autoplay: boolean;
}) {
  // Autoplay is decided once per question; the check must not restart the audio.
  const [startPlaying] = useState(autoplay);
  const src = group.audioUrl;
  const player = useAudioPlayer(src, { autoplay: startPlaying });
  const image = group.imageUrls.flatMap((url) => mediaUrls(url))[0];
  const slow = player.rate < 1;
  const replay = () => {
    player.seek(0);
    player.play();
  };

  return (
    <div className={styles.media}>
      <div className={styles.photo}>
        {image ? (
          <img src={image} alt={`Tranh câu ${question.number}`} />
        ) : (
          <p>Câu này không có tranh.</p>
        )}
      </div>
      <div className={styles.audio} data-no-lookup="true">
        <Button
          variant="primary"
          icon={
            player.playing ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )
          }
          onClick={player.toggle}
          disabled={!src || player.failed}
        >
          {player.playing ? "Tạm dừng" : "Nghe"}
        </Button>
        <Button
          variant="outline"
          icon={<RotateCcw size={16} aria-hidden="true" />}
          onClick={replay}
          disabled={!src || player.failed}
        >
          Nghe lại
        </Button>
        <Button
          variant="outline"
          icon={<Snail size={16} aria-hidden="true" />}
          aria-pressed={slow}
          onClick={() => player.setRate(slow ? 1 : 0.8)}
          disabled={!src || player.failed}
        >
          {slow ? "Đang chậm 0.8×" : "Nghe chậm 0.8×"}
        </Button>
      </div>
      {player.blocked && !player.playing && (
        <p className={styles.note}>Trình duyệt chặn tự phát — bấm Nghe để bắt đầu.</p>
      )}
      {player.failed && <p className={styles.note}>Không tải được audio của câu này.</p>}
    </div>
  );
}

function Summary({
  title,
  mode,
  questions,
  play,
  onChangeMode,
  onClassic,
}: {
  title: string;
  mode: Part1GameModeId;
  questions: readonly GroupQuestion[];
  play: Record<string, PlayState>;
  onChangeMode: () => void;
  onClassic: () => void;
}) {
  const graded = questions.filter((q) => q.reveal?.userAnswer);
  const right = graded.filter((q) => q.reveal?.userAnswer === q.reveal?.correctAnswer).length;
  let extra = "";
  if (mode === "truefalse") {
    let ok = 0;
    let all = 0;
    for (const q of questions) {
      const marks = play[q.id]?.marks;
      if (!marks || !q.reveal) continue;
      const statements = statementsOf(q);
      all += statements.filter((s) => marks[s.key] !== undefined).length;
      ok += trueFalseScore(
        statements.filter((s) => marks[s.key] !== undefined),
        marks,
        q.reveal.correctAnswer,
      );
    }
    if (all) extra = `Nhận định Đúng/Sai chính xác ${ok}/${all} câu mô tả.`;
  } else {
    const done = questions.filter((q) => play[q.id]?.solved);
    const clean = done.filter((q) => play[q.id]?.clean).length;
    if (done.length)
      extra = `Điền từ khoá xong ${done.length} tranh, ${clean} tranh đúng ngay lần đầu.`;
  }
  const good = graded.length > 0 && right / graded.length >= 0.7;

  return (
    <div className={styles.summary}>
      <img
        src={good ? cheerMascot : focusMascot}
        alt=""
        width={140}
        height={140}
        decoding="async"
      />
      <h2>Xong lượt {title}</h2>
      <p className={styles.summaryScore}>
        <b>{right}</b>/{graded.length || questions.length} câu chọn đúng đáp án
      </p>
      {extra && <p>{extra}</p>}
      <p className={styles.note}>
        Đáp án A–D đã được lưu vào tiến độ của bộ luyện tập (Đã làm, Chấm sai).
      </p>
      <div className={styles.row} data-center="true">
        <Button variant="primary" onClick={onChangeMode}>
          Về màn chọn cách học
        </Button>
        <Button variant="ghost" onClick={onClassic}>
          Xem lại kiểu đề thật
        </Button>
      </div>
    </div>
  );
}
