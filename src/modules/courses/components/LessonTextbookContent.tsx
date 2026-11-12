import { type ReactNode, useMemo } from "react";
import { Lightbulb, BookmarkCheck, Code2, Sparkles, AlertTriangle, Eye } from "lucide-react";
import { parseTimestampToSeconds } from "./lessonContentHelpers";
import styles from "./LessonTextbookContent.module.css";

interface LessonTextbookContentProps {
  content: string;
  onSeek?: (seconds: number) => void;
}

/** Parses inline markdown formatting (bold, italic, code, timestamps, links, highlights) */
function renderInline(text: string, onSeek?: (seconds: number) => void): ReactNode[] {
  const tokenRegex =
    /(\[\d{1,2}:[0-5]\d(?::[0-5]\d)?\]|\b\d{1,2}:[0-5]\d(?::[0-5]\d)?\b|\*\*[^*]+\*\*|==[^=]+==|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Timestamps [01:23] or 01:23
    const tsMatch = /^(?:\[?(\d{1,2}:[0-5]\d(?::[0-5]\d)?)\]?)$/.exec(part);
    if (tsMatch && onSeek) {
      const seconds = parseTimestampToSeconds(tsMatch[1]);
      return (
        <button
          key={index}
          type="button"
          className={styles.timestampBtn}
          onClick={() => onSeek(seconds)}
          title={`Phát video tại ${tsMatch[1]}`}
          aria-label={`Phát video tại ${tsMatch[1]}`}
        >
          ▶ {tsMatch[1]}
        </button>
      );
    }

    // Bold (**bold**)
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    // Highlight (==highlight==)
    if (part.startsWith("==") && part.endsWith("==") && part.length >= 4) {
      return (
        <mark key={index} className={styles.highlightMark}>
          {part.slice(2, -2)}
        </mark>
      );
    }

    // Inline Code (`code`)
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={index} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic (*italic* or _italic_)
    if (
      ((part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))) &&
      part.length >= 2
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    // Link [label](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/** Strips leading markdown symbols (-, *, >, #, •) and all inline markdown formatting */
function cleanLabel(str: string): string {
  return str
    .replace(/^[-\s>#*•]+/, "")
    .replace(/[*_`]/g, "")
    .trim();
}

/** Represents a parsed educational or structural block */
type ParsedBlock =
  | { type: "code"; lang: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "formula"; content: string }
  | {
      type: "example";
      label: string;
      sentence: string;
      translation: string;
      explanation: string;
      extraLines: string[];
    }
  | { type: "signals"; lines: string[] }
  | { type: "note"; label: string; lines: string[] }
  | { type: "tip"; lines: string[] }
  | { type: "trap"; lines: string[] }
  | { type: "section"; title: string; subtitle?: string }
  | { type: "unit"; number: string; title: string; description: string }
  | { type: "sub_unit"; number: string; title: string; description: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; isOrdered: boolean; items: string[] }
  | { type: "paragraph"; lines: string[] };

function parseLessonContent(rawContent: string): ParsedBlock[] {
  if (!rawContent) return [];
  const rawParagraphs = rawContent
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];
    const lines = p
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const firstLine = lines[0];
    const cleanedFirst = cleanLabel(firstLine);

    // 1. Code blocks (```lang ... ```)
    if (firstLine.startsWith("```")) {
      const lang = firstLine.slice(3).trim().toLowerCase();
      const codeLines = lines.slice(1, lines[lines.length - 1].startsWith("```") ? -1 : undefined);
      const rawCode = codeLines.join("\n");
      if (lang === "formula" || lang === "grammar" || lang === "structure") {
        blocks.push({ type: "formula", content: rawCode });
      } else {
        blocks.push({ type: "code", lang, code: rawCode });
      }
      continue;
    }

    // 2. Markdown Tables
    if (lines.length >= 2 && lines.every((l) => l.startsWith("|") && l.endsWith("|"))) {
      const headerRow = lines[0]
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      const isSeparator = /^\|(?:\s*[-:]+[-|\s:]*)\|$/.test(lines[1]);
      const bodyRows = (isSeparator ? lines.slice(2) : lines.slice(1)).map((row) =>
        row
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      );
      blocks.push({ type: "table", headers: headerRow, rows: bodyRows });
      continue;
    }

    // 3. Formula / Cấu trúc (e.g. "**Công thức:**", "Cấu trúc: S + V...")
    if (/^(?:công thức|cấu trúc|formula|structure|form)(?:\s*:|$)/i.test(cleanedFirst)) {
      const contentLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine
          .slice(colonIdx + 1)
          .replace(/^[*_`\s]+|[*_`\s]+$/g, "")
          .trim();
        if (afterColon) contentLines.push(afterColon);
      }
      contentLines.push(...lines.slice(1).map((l) => l.replace(/^[-\s*•]+/, "").trim()));

      // If no formula text on this paragraph, look forward to next paragraph
      if (contentLines.length === 0 && i + 1 < rawParagraphs.length) {
        contentLines.push(rawParagraphs[i + 1].trim());
        i++;
      }

      blocks.push({ type: "formula", content: contentLines.join("\n") });
      continue;
    }

    // 4. Examples (e.g. "**Ví dụ 1:**", "**Ví dụ:**", "Example:")
    if (/^(?:ví dụ(?:\s+\d+)?|example(?:\s+\d+)?|ví dụ minh họa)(?:\s*:|$)/i.test(cleanedFirst)) {
      const labelMatch = /^(ví dụ(?:\s+\d+)?|example(?:\s+\d+)?|ví dụ minh họa)/i.exec(
        cleanedFirst,
      );
      const label = labelMatch ? labelMatch[1].toUpperCase() : "VÍ DỤ MINH HỌA";

      const exLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine
          .slice(colonIdx + 1)
          .replace(/^[*_`\s]+|[*_`\s]+$/g, "")
          .trim();
        if (afterColon) exLines.push(afterColon);
      }
      exLines.push(...lines.slice(1));

      // If only label was in this paragraph, fetch the full content from next paragraph
      if (exLines.length === 0 && i + 1 < rawParagraphs.length) {
        exLines.push(
          ...rawParagraphs[i + 1]
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
        i++;
      }

      // Deconstruct into sentence, translation, explanation
      let sentence = "";
      let translation = "";
      let explanation = "";
      const extraLines: string[] = [];

      for (const line of exLines) {
        const clean = cleanLabel(line);
        if (/^(?:dịch|translation)\s*:/i.test(clean)) {
          translation = line;
        } else if (/^(?:giải thích|explanation|note)\s*:/i.test(clean)) {
          explanation = line;
        } else if (!sentence) {
          sentence = line;
        } else {
          extraLines.push(line);
        }
      }

      blocks.push({
        type: "example",
        label,
        sentence,
        translation,
        explanation,
        extraLines,
      });
      continue;
    }

    // 5. Signals / Dấu hiệu nhận biết (e.g. "**Dấu hiệu nhận biết:**")
    if (
      /^(?:dấu hiệu nhận biết|dấu hiệu|nhận diện|signals?|signal words?)(?:\s*:|$)/i.test(
        cleanedFirst,
      )
    ) {
      const sigLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine
          .slice(colonIdx + 1)
          .replace(/^[*_`\s]+|[*_`\s]+$/g, "")
          .trim();
        if (afterColon) sigLines.push(afterColon);
      }
      sigLines.push(...lines.slice(1));

      if (sigLines.length === 0 && i + 1 < rawParagraphs.length) {
        sigLines.push(
          ...rawParagraphs[i + 1]
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
        i++;
      }

      const cleanSigLines = sigLines.map((l) => l.replace(/^[-\s*•]+/, "").trim());
      blocks.push({ type: "signals", lines: cleanSigLines });
      continue;
    }

    // 6. TOEIC Trap (Bẫy TOEIC)
    if (/^(?:bẫy toeic|bẫy|traps?)(?:\s*:|$)/i.test(cleanedFirst)) {
      const trapLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine.slice(colonIdx + 1).trim();
        if (afterColon) trapLines.push(afterColon);
      }
      trapLines.push(...lines.slice(1));
      if (trapLines.length === 0 && i + 1 < rawParagraphs.length) {
        trapLines.push(
          ...rawParagraphs[i + 1]
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
        i++;
      }
      blocks.push({ type: "trap", lines: trapLines });
      continue;
    }

    // 7. Oysteic Tip (Mẹo làm bài)
    if (/^(?:mẹo làm bài|mẹo|tips?)(?:\s*:|$)/i.test(cleanedFirst)) {
      const tipLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine.slice(colonIdx + 1).trim();
        if (afterColon) tipLines.push(afterColon);
      }
      tipLines.push(...lines.slice(1));
      if (tipLines.length === 0 && i + 1 < rawParagraphs.length) {
        tipLines.push(
          ...rawParagraphs[i + 1]
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
        i++;
      }
      blocks.push({ type: "tip", lines: tipLines });
      continue;
    }

    // 8. Important Notes (Lưu ý / Ghi chú)
    if (/^(?:lưu ý|ghi chú|chú ý|notes?|important)(?:\s*:|$)/i.test(cleanedFirst)) {
      const noteLines: string[] = [];
      const colonIdx = firstLine.indexOf(":");
      if (colonIdx !== -1) {
        const afterColon = firstLine.slice(colonIdx + 1).trim();
        if (afterColon) noteLines.push(afterColon);
      }
      noteLines.push(...lines.slice(1));
      if (noteLines.length === 0 && i + 1 < rawParagraphs.length) {
        noteLines.push(
          ...rawParagraphs[i + 1]
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        );
        i++;
      }
      blocks.push({ type: "note", label: "LƯU Ý QUAN TRỌNG", lines: noteLines });
      continue;
    }

    // 9. Section Title (e.g. "SECTION A ...")
    const sectionMatch =
      /^(?:#{1,2}\s+)?(SECTION\s+[A-Z0-9]+)\s*[-:—–]\s*(.+)$/i.exec(firstLine) ||
      /^(?:#{1,2}\s+)?(KIẾN THỨC)\s*[-:—–]?\s*(.+)$/i.exec(firstLine);
    if (sectionMatch) {
      blocks.push({
        type: "section",
        title: sectionMatch[1],
        subtitle: sectionMatch[2],
      });
      continue;
    }

    // 10. Unit Header (e.g. "1. PRESENT SIMPLE — THÌ HIỆN TẠI ĐƠN")
    const unitMatch = /^(?:#{1,3}\s+)?(\d+)\.\s+(.+)$/.exec(firstLine);
    if (unitMatch) {
      blocks.push({
        type: "unit",
        number: unitMatch[1],
        title: unitMatch[2],
        description: lines.slice(1).join("\n"),
      });
      continue;
    }

    // 11. Sub-unit Header (e.g. "1.1 Chủ ngữ và động từ")
    const subUnitMatch = /^(?:#{1,4}\s+)?(\d+\.\d+)\s+(.+)$/.exec(firstLine);
    if (subUnitMatch) {
      blocks.push({
        type: "sub_unit",
        number: subUnitMatch[1],
        title: subUnitMatch[2],
        description: lines.slice(1).join("\n"),
      });
      continue;
    }

    // 12. General Headings (#, ##, ###)
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(firstLine);
    if (headingMatch && lines.length === 1) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // 13. Regular Bullet List
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      blocks.push({
        type: "list",
        isOrdered: false,
        items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, "")),
      });
      continue;
    }

    // 14. Regular Numbered List
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      blocks.push({
        type: "list",
        isOrdered: true,
        items: lines.map((l) => l.replace(/^\s*\d+\.\s+/, "")),
      });
      continue;
    }

    // 15. Regular Paragraph
    blocks.push({ type: "paragraph", lines });
  }

  return blocks;
}

export function LessonTextbookContent({ content, onSeek }: LessonTextbookContentProps) {
  const blocks = useMemo(() => {
    return parseLessonContent(content);
  }, [content]);

  if (!blocks.length) {
    return <p className={styles.paragraph}>Bài học chưa có nội dung văn bản.</p>;
  }

  return (
    <article className={styles.textbook}>
      {blocks.map((block, blockIdx) => {
        // 1. Formula Box
        if (block.type === "formula") {
          return (
            <div key={blockIdx} className={styles.formulaCard}>
              <div className={styles.formulaHeader}>
                <Code2 size={15} />
                <span>CÔNG THỨC / CẤU TRÚC</span>
              </div>
              <div className={styles.formulaBody}>
                <code className={styles.formulaCode}>{block.content}</code>
              </div>
            </div>
          );
        }

        // 2. Example Card
        if (block.type === "example") {
          return (
            <div key={blockIdx} className={styles.exampleCard}>
              <div className={styles.exampleHeader}>
                <Sparkles size={14} />
                <span>{block.label}</span>
              </div>
              {block.sentence && (
                <div className={styles.exampleSentence}>{renderInline(block.sentence, onSeek)}</div>
              )}
              {block.translation && (
                <div className={styles.exampleTranslation}>
                  {renderInline(block.translation, onSeek)}
                </div>
              )}
              {block.explanation && (
                <div className={styles.exampleExplanation}>
                  {renderInline(block.explanation, onSeek)}
                </div>
              )}
              {block.extraLines.map((extra, eIdx) => (
                <div key={eIdx} style={{ marginTop: "4px" }}>
                  {renderInline(extra, onSeek)}
                </div>
              ))}
            </div>
          );
        }

        // 3. Signals (Nhận diện / Dấu hiệu)
        if (block.type === "signals") {
          return (
            <div key={blockIdx} className={styles.signals}>
              <div className={styles.signalsLabel}>
                <Eye size={14} />
                <span>DẤU HIỆU NHẬN BIẾT</span>
              </div>
              <ul className={styles.signalsList}>
                {block.lines.map((s, sIdx) => (
                  <li key={sIdx}>{renderInline(s, onSeek)}</li>
                ))}
              </ul>
            </div>
          );
        }

        // 4. Trap (Bẫy TOEIC)
        if (block.type === "trap") {
          return (
            <div key={blockIdx} className={styles.trap}>
              <div className={styles.trapHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={15} />
                  <span>BẪY TOEIC</span>
                </div>
                <span className={styles.trapBadge}>LƯU Ý</span>
              </div>
              <div>
                {block.lines.map((l, lIdx) => (
                  <p key={lIdx} style={{ margin: "4px 0" }}>
                    {renderInline(l, onSeek)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        // 5. Tip (Mẹo làm bài)
        if (block.type === "tip") {
          return (
            <div key={blockIdx} className={styles.tip}>
              <div className={styles.tipHeader}>
                <Lightbulb size={16} />
                <span>MẸO OYSTEIC</span>
              </div>
              <div>
                {block.lines.map((l, lIdx) => (
                  <p key={lIdx} style={{ margin: "4px 0" }}>
                    {renderInline(l, onSeek)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        // 6. Note (Ghi chú / Lưu ý)
        if (block.type === "note") {
          return (
            <div key={blockIdx} className={styles.calloutNote}>
              <div className={styles.calloutNoteHeader}>
                <BookmarkCheck size={16} />
                <span>{block.label}</span>
              </div>
              <div>
                {block.lines.map((l, lIdx) => (
                  <p key={lIdx} style={{ margin: "4px 0" }}>
                    {renderInline(l, onSeek)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        // 7. Unit Header with Badge
        if (block.type === "unit") {
          return (
            <div key={blockIdx}>
              <h3 className={styles.unitHeader}>
                <i className={styles.unitBadge}>{block.number}</i>
                <span>{renderInline(block.title, onSeek)}</span>
              </h3>
              {block.description && (
                <p className={styles.unitDesc}>{renderInline(block.description, onSeek)}</p>
              )}
            </div>
          );
        }

        // 8. Sub-unit Header
        if (block.type === "sub_unit") {
          return (
            <div key={blockIdx}>
              <h4 className={styles.subHeader}>
                <b className={styles.subNumber}>{block.number}</b>
                <span>{renderInline(block.title, onSeek)}</span>
              </h4>
              {block.description && (
                <p className={styles.unitDesc}>{renderInline(block.description, onSeek)}</p>
              )}
            </div>
          );
        }

        // 9. Section Title
        if (block.type === "section") {
          return (
            <h2 key={blockIdx} className={styles.sectionTitle}>
              <b>{block.title.toUpperCase()}</b>
              {block.subtitle && <span>{renderInline(block.subtitle, onSeek)}</span>}
            </h2>
          );
        }

        // 10. General Heading
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h2 key={blockIdx} className={styles.sectionTitle}>
                <b>KIẾN THỨC</b>
                <span>{renderInline(block.text, onSeek)}</span>
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3 key={blockIdx} className={styles.unitHeader}>
                <i className={styles.unitBadge}>§</i>
                <span>{renderInline(block.text, onSeek)}</span>
              </h3>
            );
          }
          return (
            <h4 key={blockIdx} className={styles.subHeader}>
              {renderInline(block.text, onSeek)}
            </h4>
          );
        }

        // 11. Tables
        if (block.type === "table") {
          return (
            <div key={blockIdx} className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {block.headers.map((th, thIdx) => (
                      <th key={thIdx}>{renderInline(th, onSeek)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((td, tdIdx) => (
                        <td key={tdIdx}>{renderInline(td, onSeek)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // 12. Code blocks
        if (block.type === "code") {
          return (
            <pre key={blockIdx} className={styles.codeBlock}>
              <code>{block.code}</code>
            </pre>
          );
        }

        // 13. Lists
        if (block.type === "list") {
          if (block.isOrdered) {
            return (
              <ol key={blockIdx} style={{ margin: "12px 0", paddingLeft: "24px" }}>
                {block.items.map((it, itIdx) => (
                  <li key={itIdx} style={{ margin: "4px 0" }}>
                    {renderInline(it, onSeek)}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <ul key={blockIdx} style={{ margin: "12px 0", paddingLeft: "24px" }}>
              {block.items.map((it, itIdx) => (
                <li key={itIdx} style={{ margin: "4px 0" }}>
                  {renderInline(it, onSeek)}
                </li>
              ))}
            </ul>
          );
        }

        // 14. Regular Paragraph
        return (
          <p key={blockIdx} className={styles.paragraph}>
            {block.lines.map((line, lIdx) => (
              <span key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInline(line, onSeek)}
              </span>
            ))}
          </p>
        );
      })}
    </article>
  );
}
