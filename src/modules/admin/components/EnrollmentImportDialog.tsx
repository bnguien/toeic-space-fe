import { useRef, useState, type FormEvent } from "react";
import { Button, Modal } from "./ui";
import type { ImportEnrollmentsResult } from "../types/enrollment.types";
import { enrollmentErrorMessage, enrollmentRowErrorMessage } from "../utils/enrollmentError";
import styles from "./classEnrollments.module.css";

const MAX_SIZE = 2 * 1024 * 1024;

export function EnrollmentImportDialog({
  pending,
  error,
  onClose,
  onImport,
  onResetError,
}: {
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportEnrollmentsResult>;
  onResetError: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<ImportEnrollmentsResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!file) {
      setFileError("Vui lòng chọn tệp CSV hoặc .xlsx.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setFileError("Chỉ hỗ trợ tệp CSV hoặc .xlsx.");
      return;
    }
    if (!file.size || file.size > MAX_SIZE) {
      setFileError("Tệp phải có dữ liệu và không vượt quá 2 MB.");
      return;
    }
    setFileError("");
    setResult(null);
    try {
      const response = await onImport(file);
      setResult(response);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      // The mutation error is shown below, without treating the import as successful.
    }
  };

  return (
    <Modal
      open
      wide
      title="Nhập học viên từ tệp"
      busy={pending}
      onClose={onClose}
      description="Chọn tệp CSV UTF-8 hoặc .xlsx, tối đa 2 MB và 1.000 dòng. Dòng đầu chứa đúng một trong hai cột studentId hoặc email."
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Đóng
          </Button>
          <Button
            type="submit"
            form="class-enrollment-import"
            variant="primary"
            disabled={!file || pending}
          >
            {pending ? "Đang nhập..." : "Nhập học viên"}
          </Button>
        </>
      }
    >
      <form id="class-enrollment-import" onSubmit={(event) => void submit(event)}>
        <label className={styles.fileField}>
          Chọn tệp học viên
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={pending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFileError("");
              setResult(null);
              onResetError();
            }}
          />
        </label>
      </form>
      {fileError && (
        <p className={styles.messageError} role="alert">
          {fileError}
        </p>
      )}
      {Boolean(error) && (
        <p className={styles.messageError} role="alert">
          {enrollmentErrorMessage(error)}
        </p>
      )}
      {result && (
        <div className={styles.importResult} role="status">
          <p className={result.importedCount ? styles.success : styles.messageError}>
            Đã thêm {result.importedCount}/{result.totalRows} học viên; {result.failedCount} dòng
            không thành công.
          </p>
          {result.failedCount > 0 && (
            <div className={styles.importFailures}>
              <strong>Các dòng chưa ghi danh:</strong>
              <ul>
                {result.rows
                  .filter((row) => row.code)
                  .map((row) => (
                    <li key={row.rowNumber}>
                      Dòng {row.rowNumber}: {enrollmentRowErrorMessage(row.code)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
