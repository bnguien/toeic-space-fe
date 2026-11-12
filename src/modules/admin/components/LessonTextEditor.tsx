import { useState } from "react";
import { MarkdownPreview } from "./MarkdownPreview";
import { LessonRichTextEditor } from "./LessonRichTextEditor";
import styles from "./lessonManagement.module.css";

export function LessonTextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <>
      <div className={styles.editorTabs} role="tablist" aria-label="Nội dung bài học">
        <button
          type="button"
          role="tab"
          aria-selected={!preview}
          className={!preview ? styles.selected : ""}
          onClick={() => setPreview(false)}
        >
          Soạn thảo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={preview}
          className={preview ? styles.selected : ""}
          onClick={() => setPreview(true)}
        >
          Xem trước
        </button>
      </div>
      {preview ? (
        <MarkdownPreview value={value} />
      ) : (
        <label>
          Nội dung bài học
          <LessonRichTextEditor value={value} onChange={onChange} disabled={disabled} />
        </label>
      )}
    </>
  );
}
