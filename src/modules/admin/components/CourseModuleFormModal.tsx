import { useState, type FormEvent } from "react";
import { Button, Modal } from "./ui";
import type { CourseModule, CourseModulePayload } from "../types/course.types";
import { courseErrorMessage } from "../utils/courseErrorMessage";
import styles from "./courseModules.module.css";

export function CourseModuleFormModal({
  initial,
  pending,
  onClose,
  onSubmit,
}: {
  initial?: CourseModule;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: CourseModulePayload) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Tên học phần không được để trống.");
      return;
    }
    if (title.trim().length > 200) {
      setError("Tên học phần tối đa 200 ký tự.");
      return;
    }
    if (description.trim().length > 2000) {
      setError("Mô tả tối đa 2.000 ký tự.");
      return;
    }
    setError("");
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || null });
      onClose();
    } catch (submitError) {
      setError(courseErrorMessage(submitError));
    }
  };

  return (
    <Modal
      open
      title={initial ? "Chỉnh sửa chương học" : "Thêm chương học"}
      busy={pending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" form="course-module-form" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu chương học"}
          </Button>
        </>
      }
    >
      <form
        id="course-module-form"
        className={styles.form}
        onSubmit={(event) => void submit(event)}
      >
        <label>
          Tên học phần*
          <input
            autoFocus
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nhập tên học phần"
          />
        </label>
        <label>
          Mô tả
          <textarea
            value={description}
            maxLength={2000}
            rows={4}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Mô tả nội dung học phần (không bắt buộc)"
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
