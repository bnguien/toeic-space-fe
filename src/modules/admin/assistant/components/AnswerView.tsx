import { Fragment, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";

import {
  formatNumber,
  parseAnswer,
  parseInline,
  type AnswerAction,
  type AnswerBlock,
  type AnswerLink,
  type AnswerStat,
  type Inline,
} from "../utils/answerParser";
import { AnswerChart } from "./AnswerChart";
import styles from "./assistant.module.css";

/** Blocks that need the whole width of the thread. */
const WIDE_BLOCKS = new Set<AnswerBlock["kind"]>(["chart", "stats", "table", "action"]);

function LinkTo({
  link,
  className,
  onNavigate,
  children,
}: {
  link: AnswerLink;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  if (link.internal) {
    return (
      <Link className={className} to={link.href} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={link.href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Pieces({ pieces, onNavigate }: { pieces: Inline[]; onNavigate?: () => void }) {
  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.kind === "bold") {
          return (
            <strong key={index}>
              <Pieces pieces={piece.children} onNavigate={onNavigate} />
            </strong>
          );
        }
        if (piece.kind === "link") {
          return (
            <LinkTo key={index} link={piece.link} onNavigate={onNavigate}>
              {piece.link.text}
            </LinkTo>
          );
        }
        return <Fragment key={index}>{piece.text}</Fragment>;
      })}
    </>
  );
}

const InlineText = ({ line, onNavigate }: { line: string; onNavigate?: () => void }) => (
  <Pieces pieces={parseInline(line)} onNavigate={onNavigate} />
);

/** Up to three figures per row, each with its change against a previous period. */
function StatTiles({ items }: { items: AnswerStat[] }) {
  return (
    <div className={styles.stats}>
      {items.map((item, index) => (
        <div key={index} className={styles.stat}>
          <span className={styles.statLabel}>{item.label}</span>
          <strong className={styles.statValue}>
            {typeof item.value === "number" ? formatNumber(item.value) : item.value}
            {item.unit && <small>{item.unit}</small>}
          </strong>
          {(item.delta || item.hint) && (
            <span className={styles.statFoot}>
              {item.delta && (
                <b data-trend={item.trend || undefined}>
                  {item.trend === "up" && <TrendingUp size={13} aria-hidden="true" />}
                  {item.trend === "down" && <TrendingDown size={13} aria-hidden="true" />}
                  {item.delta}
                </b>
              )}
              {item.hint && <span>{item.hint}</span>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** A change the assistant proposes. Actions are not run from TOEIC Space yet: title and summary only. */
function ActionCard({ action }: { action: AnswerAction }) {
  return (
    <div className={styles.action}>
      <ClipboardList size={16} aria-hidden="true" />
      <div>
        <strong>{action.title}</strong>
        {action.summary && <p>{action.summary}</p>}
      </div>
    </div>
  );
}

function Block({ block, onNavigate }: { block: AnswerBlock; onNavigate?: () => void }) {
  switch (block.kind) {
    case "text":
      return (
        <p>
          <InlineText line={block.text} onNavigate={onNavigate} />
        </p>
      );
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <InlineText line={item.text} onNavigate={onNavigate} />
          {item.children.length > 0 && (
            <ul>
              {item.children.map((child, c) => (
                <li key={c}>
                  <InlineText line={child} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ));
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "table":
      return (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index} scope="col">
                    <InlineText line={cell} onNavigate={onNavigate} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <InlineText line={cell} onNavigate={onNavigate} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "media":
      if (block.media === "image") {
        return (
          <img
            className={styles.mediaImage}
            src={block.url}
            alt={block.label || "Hình ảnh trong câu trả lời"}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        );
      }
      if (block.media === "audio") {
        return (
          <audio className={styles.mediaAudio} controls preload="none" src={block.url}>
            Trình duyệt không phát được âm thanh này.
          </audio>
        );
      }
      if (block.media === "video") {
        return (
          <video className={styles.mediaVideo} controls preload="metadata" src={block.url}>
            Trình duyệt không phát được video này.
          </video>
        );
      }
      return (
        <p>
          <a href={block.url} target="_blank" rel="noopener noreferrer">
            {block.label || block.url}
          </a>
        </p>
      );
    case "links":
      return (
        <div className={styles.linkChips}>
          {block.links.map((link, index) => (
            <LinkTo key={index} link={link} className={styles.linkChip} onNavigate={onNavigate}>
              {link.internal ? (
                <ArrowRight size={14} aria-hidden="true" />
              ) : (
                <ExternalLink size={14} aria-hidden="true" />
              )}
              <span>{link.text}</span>
            </LinkTo>
          ))}
        </div>
      );
    case "chart":
      return <AnswerChart chart={block.chart} />;
    case "stats":
      return <StatTiles items={block.items} />;
    case "action":
      return <ActionCard action={block.action} />;
  }
}

/**
 * One answer of the assistant: each part ("## …") in its own bubble; lists, tables, figures, charts
 * and media drawn as such. No raw HTML is ever rendered: the parser drops tags and React escapes the rest.
 */
export function AnswerView({
  text,
  tone,
  onNavigate,
}: {
  text: string;
  tone?: "error";
  /** Called when an in-app link is followed (the drawer closes itself). */
  onNavigate?: () => void;
}) {
  const sections = useMemo(() => parseAnswer(text), [text]);
  return (
    <div className={styles.bubbles}>
      {sections.map((section, index) => (
        <section
          key={index}
          className={styles.bubble}
          data-tone={tone}
          data-wide={
            section.blocks.some(
              (block) =>
                WIDE_BLOCKS.has(block.kind) ||
                (block.kind === "media" && block.media !== "audio" && block.media !== "link"),
            )
              ? "true"
              : undefined
          }
        >
          {section.title && <h3 className={styles.partTitle}>{section.title}</h3>}
          {section.blocks.map((block, b) => (
            <Block key={b} block={block} onNavigate={onNavigate} />
          ))}
        </section>
      ))}
    </div>
  );
}
