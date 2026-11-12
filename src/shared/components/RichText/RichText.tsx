import { createElement, Fragment, useMemo, type ReactNode } from "react";

import {
  BLANK_CLASSES,
  decodeEntities,
  DOCUMENT_CLASSES,
  DROPPED_TAGS,
  HIDDEN_CLASSES,
  INLINE_TAGS,
  isMarkup,
  parseMarkup,
  parseVocabularyJson,
  readBlankNumber,
  SPEAKER_LABEL,
  TAG_MAP,
  tokenizeText,
  VOID_TAGS,
  withoutTranslation,
  type VocabularyItem,
} from "./parser";
import styles from "./RichText.module.css";

export interface BlankLabel {
  label: string;
  active?: boolean;
}

interface RichTextProps {
  value: string | null | undefined;
  /** Typography preset: reading document, listening script, explanation card or short text. */
  variant?: "document" | "transcript" | "explanation" | "text";
  /** Renders spans only, for use inside headings, buttons or list rows. */
  inline?: boolean;
  /** Treats "-------" as a blank (Part 5 and Part 6 question text). */
  dashBlanks?: boolean;
  /** Label for the n-th numbered blank, e.g. to map source numbers to question numbers. */
  blankLabel?: (sourceNumber: number, index: number) => BlankLabel;
  className?: string;
  lang?: string;
}

interface RenderContext {
  inline: boolean;
  dashBlanks: boolean;
  blankLabel?: RichTextProps["blankLabel"];
  blankIndex: number;
}

const MAX_SPAN = 20;

/**
 * Renders imported TOEIC content safely. Markup is parsed into an inert document and rebuilt
 * as React elements from an allow-list of tags and classes; inline styles, links, media and
 * event handlers never reach the page.
 */
export function RichText({
  value,
  variant = "text",
  inline = false,
  dashBlanks = false,
  blankLabel,
  className,
  lang,
}: RichTextProps) {
  const content = useMemo(() => {
    if (!value?.trim()) {
      return null;
    }

    const context: RenderContext = { inline, dashBlanks, blankLabel, blankIndex: 0 };
    return isMarkup(value) ? renderMarkup(value, context) : renderPlainText(value, context);
  }, [value, inline, dashBlanks, blankLabel]);

  if (!content) {
    return null;
  }

  return createElement(
    inline ? "span" : "div",
    {
      className: [styles.root, styles[variant], inline ? styles.inline : "", className]
        .filter(Boolean)
        .join(" "),
      lang,
    },
    content,
  );
}

function renderMarkup(value: string, context: RenderContext): ReactNode {
  return renderChildren(parseMarkup(value), context);
}

function renderPlainText(value: string, context: RenderContext): ReactNode {
  const paragraphs = decodeEntities(withoutTranslation(value))
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0);

  const renderLines = (lines: string[]) =>
    lines.map((line, index) => {
      const speaker = SPEAKER_LABEL.exec(line);
      const text = speaker ? line.slice(speaker[0].length) : line;
      return (
        <Fragment key={index}>
          {index > 0 && <br />}
          {speaker && <strong className={styles.speaker}>{speaker[1]} </strong>}
          {renderText(text, context)}
        </Fragment>
      );
    });

  if (context.inline) {
    return paragraphs.map((lines, index) => (
      <Fragment key={index}>
        {index > 0 && " "}
        {renderLines(lines)}
      </Fragment>
    ));
  }

  return paragraphs.map((lines, index) => <p key={index}>{renderLines(lines)}</p>);
}

function renderChildren(parent: Node, context: RenderContext): ReactNode[] {
  return Array.from(parent.childNodes).map((child, index) => (
    <Fragment key={index}>{renderNode(child, context)}</Fragment>
  ));
}

function renderNode(node: Node, context: RenderContext): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return renderText(node.textContent ?? "", context);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const classes = (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

  if (DROPPED_TAGS.has(tag) || classes.some((name) => HIDDEN_CLASSES.has(name))) {
    return null;
  }

  if (classes.some((name) => BLANK_CLASSES.has(name))) {
    return renderBlank(readBlankNumber(element), context);
  }

  if (classes.includes("tp-exp-vocab-body") || classes.includes("tp-exp-notes-content")) {
    const vocabulary = parseVocabularyJson(element.textContent ?? "");
    if (vocabulary) {
      return renderVocabularyItems(vocabulary, context);
    }
    if (classes.includes("tp-exp-vocab-body")) {
      return renderVocabulary(element.textContent ?? "", context);
    }
  }

  const mapped = TAG_MAP[tag];
  if (!mapped) {
    return renderChildren(element, context);
  }

  if (context.inline && tag === "hr") {
    return " ";
  }

  const rendered = context.inline && !INLINE_TAGS.has(mapped) ? "span" : mapped;
  const props: Record<string, unknown> = {};
  const className = mapClasses(classes, element.getAttribute("style"), tag);
  if (className) {
    props.className = className;
  }

  if (tag === "td" || tag === "th") {
    const colSpan = readSpan(element.getAttribute("colspan"));
    const rowSpan = readSpan(element.getAttribute("rowspan"));
    if (colSpan) props.colSpan = colSpan;
    if (rowSpan) props.rowSpan = rowSpan;
  }

  if (VOID_TAGS.has(mapped)) {
    return createElement(rendered, props);
  }

  const children = renderChildren(element, context);

  if (mapped === "table" && !context.inline) {
    return <div className={styles.tableWrap}>{createElement(rendered, props, ...children)}</div>;
  }

  // A list rendered inline would lose its bullets; keep items apart with spaces.
  if (context.inline && (tag === "li" || tag === "p" || tag === "div")) {
    return createElement(rendered, props, ...children, " ");
  }

  return createElement(rendered, props, ...children);
}

function renderText(text: string, context: RenderContext): ReactNode {
  if (!text) {
    return null;
  }

  return tokenizeText(text, context.dashBlanks).map((token, index) => {
    switch (token.kind) {
      case "strong":
        return <strong key={index}>{token.value}</strong>;
      case "em":
        return <em key={index}>{token.value}</em>;
      case "blank":
        return <Fragment key={index}>{renderBlank(token.number, context)}</Fragment>;
      default:
        return token.value;
    }
  });
}

function renderBlank(sourceNumber: number | null, context: RenderContext): ReactNode {
  if (sourceNumber === null) {
    return (
      <span className={styles.blank} aria-label="chỗ trống">
        _____
      </span>
    );
  }

  const index = context.blankIndex++;
  const { label, active } = context.blankLabel?.(sourceNumber, index) ?? {
    label: String(sourceNumber),
  };

  return (
    <span
      className={`${styles.blank} ${styles.numberedBlank} ${active ? styles.blankActive : ""}`}
      aria-label={`chỗ trống câu ${label}`}
    >
      {label}
    </span>
  );
}

function renderVocabulary(text: string, context: RenderContext): ReactNode {
  const entries = text
    .split(/[|\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (context.inline) {
    return entries.join(" · ");
  }

  return (
    <ul className={styles.vocabulary}>
      {entries.map((entry, index) => (
        <li key={index}>{entry}</li>
      ))}
    </ul>
  );
}

function renderVocabularyItems(items: VocabularyItem[], context: RenderContext): ReactNode {
  if (context.inline) {
    return items.map((item) => item.word).join(" · ");
  }

  return (
    <ul className={styles.vocabularyCards}>
      {items.map((item, index) => (
        <li key={index}>
          <strong lang="en">{item.word}</strong>
          {item.pos && <span className={styles.vocabPos}>{item.pos}</span>}
          {item.ipa && <span className={styles.vocabIpa}>/{item.ipa}/</span>}
          {item.meaning && <span className={styles.vocabMeaning}>{item.meaning}</span>}
        </li>
      ))}
    </ul>
  );
}

function mapClasses(classes: string[], style: string | null, tag: string): string {
  const names = classes.map((name) => styles[name]).filter(Boolean);

  if (classes.some((name) => DOCUMENT_CLASSES.has(name)) && tag === "div") {
    names.push(styles.documentFrame);
  }

  if (tag === "a") {
    names.push(styles.link);
  }

  // Only the layout meaning of inline styles is kept; colours and sizes come from our theme.
  if (style) {
    if (/white-space\s*:\s*pre/i.test(style)) names.push(styles.preLine);
    if (/text-align\s*:\s*center/i.test(style)) names.push(styles.alignCenter);
    if (/text-align\s*:\s*right/i.test(style)) names.push(styles.alignRight);
    if (tag === "p" && /border\s*:/i.test(style)) names.push(styles.urlBar);
  }

  return names.join(" ");
}

function readSpan(value: string | null): number | undefined {
  const span = Number(value);
  return Number.isInteger(span) && span > 1 && span <= MAX_SPAN ? span : undefined;
}
