import { CheckCheck } from "lucide-react";

import { Button } from "@/shared/components/ui";

import type { AttemptSession } from "../../hooks/useAttemptSession";
import type { Answer } from "../../types/practice-exam.types";
import { groupLabel, isGroupRevealed, type QuestionGroup } from "../../utils/attemptGroups";
import { AskAiPanel } from "../common";
import { QuestionCard } from "./QuestionCard";
import { checkLabel } from "./workspaceModel";
import styles from "./QuestionPanel.module.css";

export interface QuestionPanelProps {
  group: QuestionGroup;
  session: AttemptSession;
  /** In-progress practice: answers and flags can change, groups can be checked. */
  practice: boolean;
  checking: boolean;
  checkFailed: boolean;
  compact: boolean;
  onSelect: (questionId: string, answer: Answer) => void;
  onToggleFlag: (questionId: string) => void;
  onCheck: () => void;
  onRetrySave: (questionId: string) => void;
  onResolveConflict: (questionId: string, keepLocal: boolean) => void;
  onFocusQuestion: (questionId: string) => void;
}

/**
 * Right panel: group pill, question cards, "Hỏi thêm AI" after the check and the sticky
 * "✓ Kiểm tra …" button (practice, not checked yet).
 */
export function QuestionPanel({
  group,
  session,
  practice,
  checking,
  checkFailed,
  compact,
  onSelect,
  onToggleFlag,
  onCheck,
  onRetrySave,
  onResolveConflict,
  onFocusQuestion,
}: QuestionPanelProps) {
  const revealed = isGroupRevealed(group);
  const canCheck = practice && !revealed;

  return (
    <div className={styles.panel} data-section={group.section}>
      <div className={styles.flow}>
        <p className={styles.pill}>{groupLabel(group)}</p>
        <div className={styles.stack}>
          {group.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selected={session.answerOf(q.id)}
              flagged={session.isFlagged(q.id)}
              saveState={session.stateOf(q.id)}
              editable={practice && q.reveal === null && !checking}
              flaggable={practice}
              checking={checking}
              checkFailed={checkFailed}
              explanationOpen={group.questions.length === 1}
              compact={compact}
              onSelect={onSelect}
              onToggleFlag={onToggleFlag}
              onRetryCheck={onCheck}
              onRetrySave={onRetrySave}
              onResolveConflict={onResolveConflict}
              onFocusQuestion={onFocusQuestion}
            />
          ))}
        </div>
        {revealed && <AskAiPanel group={group} answerOf={session.answerOf} />}
      </div>
      {canCheck && (
        <div className={styles.checkBar} data-compact={compact || undefined}>
          <Button
            variant="primary"
            block
            icon={<CheckCheck size={17} aria-hidden="true" />}
            onClick={onCheck}
            disabled={checking}
          >
            {checking ? "Đang chấm…" : checkLabel(group)}
          </Button>
        </div>
      )}
    </div>
  );
}
