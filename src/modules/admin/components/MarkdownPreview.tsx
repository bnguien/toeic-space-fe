import type { ReactNode } from "react";
import styles from "./lessonManagement.module.css";

function inlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function MarkdownPreview({ value }: { value: string }) {
  const blocks = value
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .filter((block) => block.trim());
  if (!blocks.length) return <p className={styles.muted}>Bản xem trước sẽ hiển thị tại đây.</p>;
  return (
    <div className={styles.markdownPreview}>
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.every((line) => /^\s*[-*]\s+/.test(line)))
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0]);
        if (lines.length === 1 && heading) {
          const content = inlineMarkdown(heading[2]);
          if (heading[1].length === 1) return <h3 key={index}>{content}</h3>;
          if (heading[1].length === 2) return <h4 key={index}>{content}</h4>;
          return <h5 key={index}>{content}</h5>;
        }
        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {inlineMarkdown(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
