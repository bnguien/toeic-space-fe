import { TriangleAlert } from "lucide-react";

import { Button, Modal } from "@/shared/components/ui";

import type { GroupQuestion } from "../../utils/attemptGroups";
import styles from "./SubmitDialogs.module.css";

const MAX_LISTED = 40;

export interface UnansweredDialogProps {
  open: boolean;
  questions: readonly GroupQuestion[];
  submitting: boolean;
  onJump: (questionId: string) => void;
  onContinue: () => void;
  onSubmit: () => void;
}

/** "Bạn còn n câu chưa trả lời!" with a jump grid (≤ 40 numbers + "+k câu khác"). */
export function UnansweredDialog({
  open,
  questions,
  submitting,
  onJump,
  onContinue,
  onSubmit,
}: UnansweredDialogProps) {
  const listed = questions.slice(0, MAX_LISTED);
  return (
    <Modal
      open={open}
      onClose={onContinue}
      busy={submitting}
      title={`Bạn còn ${questions.length} câu chưa trả lời!`}
      description="Bạn có chắc chắn muốn nộp bài ngay bây giờ không? Nộp rồi thì không sửa được đáp án."
      footer={
        <>
          <Button variant="outline" onClick={onContinue} disabled={submitting} autoFocus>
            Tiếp tục làm bài
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Đang nộp…" : "Vẫn nộp bài"}
          </Button>
        </>
      }
    >
      <div className={styles.missing}>
        <p className={styles.label}>
          <TriangleAlert size={15} aria-hidden="true" />
          Danh sách câu còn thiếu:
        </p>
        <div className={styles.grid}>
          {listed.map((q) => (
            <button
              key={q.id}
              type="button"
              className={styles.pill}
              onClick={() => onJump(q.id)}
              title={`Nhảy tới câu ${q.number}`}
            >
              {q.number}
            </button>
          ))}
          {questions.length > MAX_LISTED && (
            <span className={styles.more}>+{questions.length - MAX_LISTED} câu khác</span>
          )}
        </div>
      </div>
    </Modal>
  );
}

export interface UnsavedDialogProps {
  /** Number of answers the server has not confirmed; 0 = closed. */
  count: number;
  submitting: boolean;
  onRetry: () => void;
  onForce: () => void;
  onClose: () => void;
}

/** Submit stopped by `UnsavedAnswersError`: retry the saves or submit what the server has. */
export function UnsavedDialog({
  count,
  submitting,
  onRetry,
  onForce,
  onClose,
}: UnsavedDialogProps) {
  return (
    <Modal
      open={count > 0}
      onClose={onClose}
      busy={submitting}
      title={`Còn ${count} câu chưa lưu được`}
      description="Mạng vừa chập chờn nên máy chủ chưa nhận các đáp án này. Thử lưu lại rồi nộp; nếu vẫn nộp ngay, các câu đó tính theo bản đã lưu trước đó."
      footer={
        <>
          <Button variant="outline" onClick={onForce} disabled={submitting}>
            Vẫn nộp bài
          </Button>
          <Button variant="primary" onClick={onRetry} disabled={submitting} autoFocus>
            {submitting ? "Đang lưu…" : "Lưu lại rồi nộp"}
          </Button>
        </>
      }
    />
  );
}
