import { useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";

import { Button, cx } from "@/shared/components/ui";

import type { AnswerOption } from "../../types/practice-exam.types";
import {
  buildWordBank,
  keywordMatches,
  keywordsOf,
  pickKeywords,
  tokenize,
  trueFalseError,
  trueFalseScore,
  type Part1Statement,
  type TrueFalseMarks,
  type WordChip,
} from "../../utils/part1Games";
import styles from "./Part1GameSession.module.css";

const KEYS: readonly AnswerOption[] = ["A", "B", "C", "D"];

/* ---- Step 1 of "Điền từ khoá": choose A–D (text appears after the check) ---- */

export function AnswerPad({
  picked,
  onPick,
  onCommit,
  busy,
}: {
  picked: AnswerOption | null;
  onPick: (key: AnswerOption) => void;
  onCommit: () => void;
  busy: boolean;
}) {
  return (
    <div className={styles.step}>
      <p className={styles.stepTitle}>Bước 1 · Câu nào mô tả đúng bức tranh?</p>
      <p className={styles.note}>Chữ của 4 câu sẽ hiện sau khi bạn chốt đáp án.</p>
      <div className={styles.pad} role="radiogroup" aria-label="Chọn đáp án">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={picked === key}
            className={styles.padKey}
            onClick={() => onPick(key)}
            disabled={busy}
          >
            ({key})
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        className={styles.cta}
        disabled={!picked || busy}
        onClick={onCommit}
        trailing={<Check size={17} aria-hidden="true" />}
      >
        {busy ? "Đang chấm…" : "Chốt đáp án"}
      </Button>
    </div>
  );
}

/* ---- "Đúng hay Sai": judge every statement, exactly one "Đúng" ---- */

export function TrueFalsePad({
  marks,
  onMark,
  onCommit,
  busy,
}: {
  marks: TrueFalseMarks;
  onMark: (key: AnswerOption, value: boolean) => void;
  onCommit: () => void;
  busy: boolean;
}) {
  const allJudged = KEYS.every((key) => marks[key] !== undefined);
  const trues = KEYS.filter((key) => marks[key] === true).length;
  const error = trueFalseError(marks);
  const warn = trues > 1 || (allJudged && trues === 0);
  const ready = allJudged && !error;
  return (
    <div className={styles.step}>
      <p className={styles.stepTitle}>Câu nào Đúng, câu nào Sai?</p>
      <p
        className={styles.note}
        data-tone={warn ? "warn" : undefined}
        role={warn ? "alert" : undefined}
      >
        {warn ? error : "Nghe từng câu, bấm Đúng nếu khớp với tranh, Sai nếu không."}
      </p>
      <ul className={styles.judge}>
        {KEYS.map((key) => (
          <li key={key}>
            <span className={styles.lineKey}>({key})</span>
            <div className={styles.judgeButtons} role="group" aria-label={`Câu (${key})`}>
              <button
                type="button"
                data-kind="false"
                aria-pressed={marks[key] === false}
                onClick={() => onMark(key, false)}
                disabled={busy}
              >
                <X size={15} aria-hidden="true" /> Sai
              </button>
              <button
                type="button"
                data-kind="true"
                aria-pressed={marks[key] === true}
                onClick={() => onMark(key, true)}
                disabled={busy}
              >
                <Check size={15} aria-hidden="true" /> Đúng
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        variant="primary"
        className={styles.cta}
        disabled={!ready || busy}
        onClick={onCommit}
        trailing={<Check size={17} aria-hidden="true" />}
      >
        {busy ? "Đang chấm…" : "Chấm"}
      </Button>
    </div>
  );
}

export function TrueFalseResult({
  statements,
  correct,
  marks,
}: {
  statements: readonly Part1Statement[];
  correct: AnswerOption;
  marks: TrueFalseMarks;
}) {
  const judged = KEYS.some((key) => marks[key] !== undefined);
  return (
    <div className={styles.step}>
      {judged && (
        <p className={styles.stepTitle}>
          Bạn nhận định đúng {trueFalseScore(statements, marks, correct)}/{statements.length} câu
        </p>
      )}
      <ul className={styles.lines}>
        {statements.map((s) => {
          const truth = s.key === correct;
          const mine = marks[s.key];
          const ok = mine === undefined ? null : mine === truth;
          return (
            <li key={s.key} data-answer={truth || undefined}>
              <span className={styles.lineKey}>({s.key})</span>
              <div>
                <p className={styles.lineEn} lang="en">
                  {s.text}
                </p>
                {s.vi && <p className={styles.lineVi}>{s.vi}</p>}
                <p className={styles.verdictLine} data-tone={ok === false ? "bad" : "good"}>
                  {truth ? "Đúng với tranh" : "Sai so với tranh"}
                  {mine !== undefined && ` · bạn chọn ${mine ? "Đúng" : "Sai"}`}
                  {ok === true && " ✓"}
                  {ok === false && " ✗"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---- "Điền từ khoá": one missing keyword per statement ---- */

export interface KeywordState {
  fill?: Partial<Record<AnswerOption, WordChip | null>>;
  status?: Partial<Record<AnswerOption, "ok" | "bad">>;
  tries?: number;
  solved?: boolean;
  clean?: boolean;
  gaveUp?: boolean;
}

export function KeywordGame({
  questionId,
  correct,
  statements,
  distractors,
  state,
  onState,
}: {
  questionId: string;
  correct: AnswerOption;
  statements: readonly Part1Statement[];
  distractors: readonly string[];
  state: KeywordState;
  onState: (patch: KeywordState) => void;
}) {
  const slots = useMemo(() => pickKeywords(statements), [statements]);
  const answers = useMemo(() => keywordsOf(statements), [statements]);
  const bank = useMemo(
    () => buildWordBank(questionId, statements, distractors),
    [questionId, statements, distractors],
  );
  const [active, setActive] = useState<AnswerOption | null>(null);
  const fill = state.fill ?? {};
  const status = state.status ?? {};
  const solved = Boolean(state.solved);
  const tries = state.tries ?? 0;
  const used = new Set(Object.values(fill).map((chip) => chip?.id));
  const open = statements
    .map((s) => s.key)
    .filter((key) => status[key] !== "ok" && slots[key] !== undefined);
  const allFilled = open.every((key) => fill[key]);

  const put = (chip: WordChip) => {
    const target =
      active && !fill[active] && status[active] !== "ok" ? active : open.find((key) => !fill[key]);
    if (!target) return;
    onState({ fill: { ...fill, [target]: chip }, status: { ...status, [target]: undefined } });
    setActive(null);
  };
  const clear = (key: AnswerOption) => {
    if (status[key] === "ok" || solved) return;
    if (fill[key]) onState({ fill: { ...fill, [key]: null } });
    setActive(key);
  };
  const check = () => {
    const nextStatus = { ...status };
    const nextFill = { ...fill };
    for (const s of statements) {
      if (nextStatus[s.key] === "ok" || slots[s.key] === undefined) continue;
      const ok = keywordMatches(fill[s.key]?.word ?? "", answers[s.key] ?? "");
      nextStatus[s.key] = ok ? "ok" : "bad";
      if (!ok) nextFill[s.key] = null;
    }
    const done = statements.every((s) => slots[s.key] === undefined || nextStatus[s.key] === "ok");
    onState({
      fill: nextFill,
      status: nextStatus,
      tries: tries + 1,
      solved: done,
      clean: done && tries === 0,
    });
  };

  return (
    <div className={styles.step}>
      <p className={styles.stepTitle}>Bước 2 · Nghe lại, điền từ khoá còn thiếu</p>
      <p className={styles.note}>Bấm một từ bên dưới để thả vào ô trống. Bấm ô đã điền để gỡ ra.</p>
      <ul className={styles.lines}>
        {statements.map((s) => {
          const tokens = tokenize(s.text);
          return (
            <li key={s.key} data-answer={(solved && s.key === correct) || undefined}>
              <span className={styles.lineKey}>({s.key})</span>
              <div>
                <p className={styles.lineEn} lang="en">
                  {tokens.map((token, i) => {
                    if (i !== slots[s.key])
                      return (
                        <span key={i}>
                          {token.lead}
                          {token.word}
                          {token.trail}{" "}
                        </span>
                      );
                    const tone = solved ? "ok" : status[s.key];
                    const shown = solved ? answers[s.key] : fill[s.key]?.word;
                    return (
                      <span key={i}>
                        {token.lead}
                        <button
                          type="button"
                          className={styles.blank}
                          data-tone={tone}
                          data-active={active === s.key || undefined}
                          onClick={() => clear(s.key)}
                          aria-label={
                            shown ? `Ô trống câu ${s.key}: ${shown}` : `Ô trống câu ${s.key}`
                          }
                        >
                          {shown || " ".repeat(Math.max(4, (answers[s.key] ?? "").length))}
                        </button>
                        {token.trail}{" "}
                      </span>
                    );
                  })}
                </p>
                {solved && s.vi && <p className={styles.lineVi}>{s.vi}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {!solved && (
        <>
          <div className={styles.bank} aria-label="Từ để điền">
            {bank.map((chip) => (
              <button
                key={chip.id}
                type="button"
                lang="en"
                disabled={used.has(chip.id)}
                onClick={() => put(chip)}
              >
                {chip.word}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <Button
              variant="primary"
              className={styles.cta}
              disabled={!allFilled}
              onClick={check}
              trailing={<Check size={17} aria-hidden="true" />}
            >
              Kiểm tra
            </Button>
            {tries > 0 && (
              <Button
                variant="ghost"
                icon={<Eye size={15} aria-hidden="true" />}
                onClick={() => onState({ solved: true, gaveUp: true })}
              >
                Xem đáp án
              </Button>
            )}
          </div>
        </>
      )}
      {solved && (
        <p className={cx(styles.note, styles.done)}>
          {state.gaveUp
            ? "Đã mở đáp án. Nghe lại một lượt và nhìn theo chữ nhé."
            : state.clean
              ? "Điền đúng hết ngay lần đầu!"
              : `Xong sau ${tries} lần kiểm tra.`}
        </p>
      )}
    </div>
  );
}
