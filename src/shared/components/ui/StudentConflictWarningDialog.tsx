import { Button } from "./Button/Button";
import { Modal } from "./Modal/Modal";
import styles from "./StudentConflictWarningDialog.module.css";

export function StudentConflictWarningDialog({
  open,
  affectedStudentCount,
  conflictCount,
  pending = false,
  confirmLabel = "Vẫn lưu lịch",
  onBack,
  onProceed,
}: {
  open: boolean;
  affectedStudentCount: number;
  conflictCount?: number;
  pending?: boolean;
  confirmLabel?: string;
  onBack: () => void;
  onProceed: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Cảnh báo trùng lịch học viên"
      busy={pending}
      onClose={onBack}
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={onBack}>
            Quay lại chỉnh sửa
          </Button>
          <Button variant="primary" disabled={pending} onClick={onProceed}>
            {pending ? "Đang lưu…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.message}>
        <p>
          Thay đổi này có thể khiến <strong>{affectedStudentCount} học viên</strong> bị trùng lịch
          {conflictCount !== undefined && (
            <>
              , với <strong>{conflictCount} xung đột</strong> được phát hiện
            </>
          )}
          .
        </p>
        <p>Bạn vẫn có thể tiếp tục vì đây chỉ là cảnh báo; thao tác sẽ không bị chặn.</p>
      </div>
    </Modal>
  );
}
