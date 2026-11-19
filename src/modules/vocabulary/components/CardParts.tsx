import type { ReactNode } from "react";
import { Play, StickyNote } from "lucide-react";

import { Kbd } from "@/shared/components/ui";

import type { WordDto } from "../types/vocabulary.types";
import { AudioButton } from "./AudioButton";
import styles from "./CardParts.module.css";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Example sentence with the headword (and its inflections) marked. */
export function Highlighted({ text, term }: { text: string; term: string }) {
  const trimmed = term.trim();
  if (!trimmed) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)}\\w*)`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className={styles.mark}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Card content in two groups. Portrait: one centred column (the groups dissolve into the card).
 * Landscape: side by side; with an empty `end` the `start` group stays centred alone.
 */
export function CardColumns({ start, end }: { start: ReactNode; end?: ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.column}>{start}</div>
      <div className={styles.column} data-end="">
        {end}
      </div>
    </div>
  );
}

/** Round speak button drawn in the card colours. */
export function CardAudio({
  text,
  label,
  lang,
}: {
  text: string;
  label?: string;
  lang?: "en-US" | "vi-VN";
}) {
  return <AudioButton text={text} label={label} lang={lang} className={styles.audio} />;
}

/** Headword line: word, phonetic and audio. */
export function CardWordLine({ word, size = "md" }: { word: WordDto; size?: "md" | "lg" }) {
  return (
    <div className={styles.wordLine} data-size={size}>
      <span className={styles.headword} lang="en">
        {word.headword}
      </span>
      <div className={styles.meta}>
        {word.phonetic && <span className={styles.phonetic}>{word.phonetic}</span>}
        <CardAudio text={word.headword} />
      </div>
    </div>
  );
}

/** Example + translation, with audio for the sentence. */
export function CardExample({ word }: { word: WordDto }) {
  if (!word.example) return null;
  return (
    <blockquote className={styles.example}>
      <div className={styles.exampleLine}>
        <p lang="en">
          <Highlighted text={word.example} term={word.headword} />
        </p>
        <CardAudio text={word.example} label="Phát âm câu ví dụ" />
      </div>
      {word.exampleVi && <p className={styles.exampleVi}>{word.exampleVi}</p>}
    </blockquote>
  );
}

export function CardSynonyms({ synonyms }: { synonyms: string[] }) {
  if (synonyms.length === 0) return null;
  return (
    <div className={styles.synonyms} aria-label="Đồng nghĩa">
      {synonyms.slice(0, 6).map((synonym) => (
        <span key={synonym} className={styles.synonym} lang="en">
          {synonym}
        </span>
      ))}
    </div>
  );
}

export function CardNote({ note }: { note: string | null | undefined }) {
  if (!note?.trim()) return null;
  return (
    <p className={styles.note}>
      <StickyNote size={14} aria-hidden="true" />
      <span>{note}</span>
    </p>
  );
}

/** Verdict line on a card (e.g. "Đúng", "Sai", "Hết giờ"). */
export function CardVerdictLabel({
  tone,
  icon,
  children,
}: {
  tone: "ok" | "bad" | "neutral";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={styles.verdict} data-tone={tone} role="status">
      {icon}
      {children}
    </span>
  );
}

/** Pill button drawn in the card's inverse colours (e.g. "Tiếp tục"). */
export function CardAction({
  icon,
  hotkey,
  autoFocus = false,
  onClick,
  children,
}: {
  icon?: ReactNode;
  hotkey?: string;
  /** Take focus so Space / Enter press it. */
  autoFocus?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.action}
      autoFocus={autoFocus}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {icon}
      <span>{children}</span>
      {hotkey && <Kbd className={styles.actionKey}>{hotkey}</Kbd>}
    </button>
  );
}

/** Cover over a paused card; clicking resumes. */
export function PauseCover({ onResume }: { onResume: () => void }) {
  return (
    <button type="button" className={styles.cover} onClick={onResume} aria-label="Tiếp tục">
      <Play size={44} />
    </button>
  );
}
