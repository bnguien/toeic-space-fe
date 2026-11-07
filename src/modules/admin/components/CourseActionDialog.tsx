import { Button, Modal } from "./ui";

export interface CourseActionConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  variant?: "primary" | "archive";
}

export function CourseActionDialog({
  confirmation,
  onClose,
  pending,
  onConfirm,
}: {
  confirmation: CourseActionConfirmation;
  onClose: () => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open
      title={confirmation.title}
      description={confirmation.message}
      busy={pending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant={confirmation.variant === "archive" ? "danger-outline" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Đang xử lý..." : confirmation.confirmLabel}
          </Button>
        </>
      }
    />
  );
}
