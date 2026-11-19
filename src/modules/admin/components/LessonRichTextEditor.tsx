import { Bold, Heading2, Italic, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import styles from "./lessonManagement.module.css";

const extensions = [StarterKit, Markdown];

export function LessonRichTextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
}) {
  const editor = useEditor({
    extensions,
    content: value,
    contentType: "markdown",
    editable: !disabled,
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
    editorProps: {
      attributes: {
        class: styles.richEditorContent,
        "aria-label": "Nội dung bài học",
        spellcheck: "true",
      },
    },
  });

  if (!editor)
    return (
      <p className={styles.state} role="status">
        Đang khởi tạo trình soạn thảo...
      </p>
    );

  return (
    <div className={styles.richEditor}>
      <div className={styles.richToolbar} role="toolbar" aria-label="Định dạng nội dung">
        <button
          type="button"
          title="Đậm"
          aria-label="Đậm"
          aria-pressed={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          title="Nghiêng"
          aria-label="Nghiêng"
          aria-pressed={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          title="Tiêu đề"
          aria-label="Tiêu đề"
          aria-pressed={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          title="Danh sách gạch đầu dòng"
          aria-label="Danh sách gạch đầu dòng"
          aria-pressed={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          title="Danh sách đánh số"
          aria-label="Danh sách đánh số"
          aria-pressed={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          title="Trích dẫn"
          aria-label="Trích dẫn"
          aria-pressed={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </button>
        <span className={styles.toolbarDivider} />
        <button
          type="button"
          title="Hoàn tác"
          aria-label="Hoàn tác"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          title="Làm lại"
          aria-label="Làm lại"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
