import { z } from "zod";

/**
 * The assistant answers in light markup, one block per line:
 * "## Title" opens a part, "- " / "1. " lists ("◦ " sub-items), "| a | b |" tables, **bold**, [text](url),
 * media URLs on their own line, a line starting with U+2060 joins the previous one, and the visual tokens
 * [[chart:{…}]], [[stat:{…}]] and [[action:{…}]] on their own line. Each part becomes its own bubble.
 *
 * This file has no app imports so the unit tests can load it directly under node.
 */

export const JOIN = "\u2060";
export const CHART_TYPES = ["bar", "hbar", "stacked", "line", "area", "pie", "donut"] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export const MAX_CHART_ROWS = 120;
export const MAX_SERIES = 6;
export const MAX_SLICES = 5;
export const OTHER_LABEL = "Khác";
/** line / area / bar need at least this many points to be worth drawing; fewer stay a table. */
export const MIN_POINTS = 3;

export type MediaKind = "image" | "audio" | "video" | "link";

export interface ListItem {
  text: string;
  /** Bullets one level in ("◦ " lines). */
  children: string[];
}

export interface AnswerLink {
  text: string;
  href: string;
  /** A path of this site, opened with the router instead of a new tab. */
  internal: boolean;
  /** Written as a bare URL (no label). */
  bare?: boolean;
}

export interface ChartSeriesDef {
  key: string;
  name: string;
}

export interface ChartPoint {
  label: string;
  values: Record<string, number | null>;
  /** The folded tail of a pie ("Khác"). */
  other?: boolean;
}

export interface AnswerChart {
  type: ChartType;
  title: string;
  unit: string;
  series: ChartSeriesDef[];
  data: ChartPoint[];
  /** False when there are too few points to draw; the figures are still shown as a table. */
  drawable: boolean;
}

export interface AnswerStat {
  label: string;
  value: number | string;
  unit: string;
  delta: string;
  trend: "up" | "down" | "";
  hint: string;
}

export interface AnswerAction {
  title: string;
  summary: string;
}

export type AnswerBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; ordered: boolean; items: ListItem[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "media"; media: MediaKind; url: string; label?: string }
  | { kind: "links"; links: AnswerLink[] }
  | { kind: "chart"; chart: AnswerChart }
  | { kind: "stats"; items: AnswerStat[] }
  | { kind: "action"; action: AnswerAction };

export interface AnswerSection {
  title?: string;
  blocks: AnswerBlock[];
}

/* ---------- line patterns ---------- */

const HEADING = /^#{1,4}\s+(.+?)\s*#*$/;
/** Older answers named their parts "Số liệu:", "Nhận định:", "Đề xuất:" on a line of their own. */
const LABEL = /^([A-ZÀ-Ỹa-zà-ỹđĐ][^:|[\]]{1,38}):$/;
const BULLET = /^[-*•]\s+(.+)$/;
const NUMBERED = /^\d{1,2}[.)]\s+(.+)$/;
const SUB_ITEM = /^◦\s+(.+)$/;
const IMAGE_MD = /^!\[([^\]]*)\]\((\S+?)\)$/;
const TABLE_RULE = /^\|?[\s:|-]+\|?$/;
const BARE_URL = /^<?(https?:\/\/\S+?)>?$/;
const TOKEN_LINE = /^\[\[(chart|stat|action):/i;
const TOKEN_HEAD = /^\[\[(chart|stat|action):\s*/i;
const UNKNOWN_TOKEN = /^\[\[[a-z]+:/i;
const TAGS = /<\/?[a-z][^>]*>/gi;
const MD_LINK = /\[([^\]\n]*)\]\(\s*([^()\s]*)\s*\)/g;
const INLINE = /\[([^\]\n]*)\]\(\s*([^()\s]*)\s*\)|\*\*(.+?)\*\*|(https?:\/\/[^\s<>()[\]{}"']+)/g;
const URL_TAIL = /[.,;:!?…]+$/;
const LINK_SEPARATORS = /[\s·•|,;/–—-]/g;
const NUMBER_TEXT = /^[-+]?\d+(?:\.\d+)?$/;
const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
/** The assistant cuts lines at 200 characters: a piece of exactly 199 was cut mid-word, so it joins without a space. */
const HARD_CUT_LENGTH = 199;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;

/* ---------- small helpers ---------- */

/** Plain text of one line: HTML a source may carry is dropped (React escapes the rest). */
export const clean = (line: string) =>
  line
    .replace(TAGS, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

function clip(value: unknown, max: number): string {
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof text !== "string") return "";
  const cleaned = clean(text);
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && NUMBER_TEXT.test(value.trim())) return Number(value.trim());
  return null;
}

/** Vietnamese figures: 12.345 and 12,5. */
export function formatNumber(value: number | string | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value === null || value === undefined ? "" : String(value);
  }
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

/** "2026-11-04" reads as "4/11"; "2026-11" as "11/2026"; anything else stays. */
export function dateLabel(value: string): string {
  const day = ISO_DATE.exec(value);
  if (day) return `${Number(day[3])}/${Number(day[2])}`;
  const month = ISO_MONTH.exec(value);
  if (month) return `${Number(month[2])}/${month[1]}`;
  return value;
}

export function shortUrl(url: string): string {
  const text = url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

/** http(s) URLs open in a new tab; "/admin/…" paths open with the router. Anything else is not a link. */
export function resolveLink(url: string): { href: string; internal: boolean } | null {
  const value = url.trim();
  if (!value || /[\s<>"'`]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return { href: value, internal: true };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return { href: parsed.href, internal: false };
  } catch {
    return null;
  }
}

export function mediaKind(url: string): MediaKind {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return "link";
  }
  if (IMAGE_EXT.test(path)) return "image";
  if (AUDIO_EXT.test(path)) return "audio";
  if (VIDEO_EXT.test(path)) return "video";
  return "link";
}

/* ---------- inline markup ---------- */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: Inline[] }
  | { kind: "link"; link: AnswerLink };

/** "**bold**", "[text](url)" and bare URLs of one line, as pieces the view renders. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const pushText = (value: string) => {
    if (!value) return;
    const previous = out[out.length - 1];
    if (previous?.kind === "text") previous.text += value;
    else out.push({ kind: "text", text: value });
  };
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    const at = match.index ?? 0;
    pushText(line.slice(last, at));
    last = at + match[0].length;
    if (match[3] !== undefined) {
      out.push({ kind: "bold", children: parseInline(match[3]) });
      continue;
    }
    if (match[4] !== undefined) {
      const tail = URL_TAIL.exec(match[4])?.[0] ?? "";
      const url = tail ? match[4].slice(0, -tail.length) : match[4];
      last -= tail.length;
      const target = resolveLink(url);
      if (target) out.push({ kind: "link", link: { text: shortUrl(url), bare: true, ...target } });
      else pushText(url);
      continue;
    }
    const label = clean(match[1]);
    const target = resolveLink(match[2]);
    if (target && label) out.push({ kind: "link", link: { text: label, ...target } });
    else pushText(label || match[2]);
  }
  pushText(line.slice(last));
  return out;
}

/* ---------- visual tokens ---------- */

type TokenKind = "chart" | "stat" | "action";

function matchBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Every "[[kind:{…}]]" of one line, in order; null when the line is not only tokens. */
export function scanTokens(line: string): { kind: TokenKind; json: string }[] | null {
  const tokens: { kind: TokenKind; json: string }[] = [];
  let rest = line.trim();
  while (rest) {
    const head = TOKEN_HEAD.exec(rest);
    if (!head) return null;
    const start = head[0].length;
    if (rest[start] !== "{") return null;
    const end = matchBrace(rest, start);
    if (end < 0) return null;
    const after = rest.slice(end + 1).trimStart();
    if (!after.startsWith("]]")) return null;
    tokens.push({ kind: head[1].toLowerCase() as TokenKind, json: rest.slice(start, end + 1) });
    rest = after.slice(2).trim();
  }
  return tokens.length ? tokens : null;
}

function joinByCut(pieces: string[]): string {
  return pieces.reduce(
    (text, piece, index) =>
      index
        ? `${text}${[...pieces[index - 1]].length >= HARD_CUT_LENGTH ? "" : " "}${piece}`
        : piece,
    "",
  );
}

/** A token may arrive cut into several lines; the first join that yields valid JSON wins. */
function readTokens(pieces: string[]): { kind: TokenKind; value: unknown }[] {
  const candidates = new Set([pieces.join(" "), pieces.join(""), joinByCut(pieces)]);
  for (const candidate of candidates) {
    const tokens = scanTokens(candidate);
    if (!tokens) continue;
    const parsed: ({ kind: TokenKind; value: unknown } | null)[] = tokens.map(({ kind, json }) => {
      try {
        return { kind, value: JSON.parse(json) as unknown };
      } catch {
        return null;
      }
    });
    if (parsed.every(Boolean)) return parsed as { kind: TokenKind; value: unknown }[];
  }
  return [];
}

const text = (max: number) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value) => clip(value, max));

const chartTokenSchema = z.object({
  type: z.string().nullish(),
  title: text(120),
  unit: text(16),
  x: z.string().nullish(),
  series: z
    .array(z.union([z.string(), z.object({ key: z.string(), name: z.string().nullish() })]))
    .nullish(),
  data: z.array(z.record(z.string(), z.unknown())).min(1),
});

const statTokenSchema = z.object({
  label: text(60),
  value: z.union([z.number(), z.string()]),
  unit: text(16),
  delta: z.union([z.number(), z.string()]).nullish(),
  hint: text(60),
});

const actionTokenSchema = z.object({
  title: text(120),
  summary: text(400),
});

function foldSlices(data: ChartPoint[], key: string): ChartPoint[] {
  const slices = data
    .filter((row) => (row.values[key] ?? 0) > 0)
    .sort((a, b) => (b.values[key] ?? 0) - (a.values[key] ?? 0));
  if (slices.length <= MAX_SLICES) return slices;
  const kept = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1).reduce((sum, row) => sum + (row.values[key] ?? 0), 0);
  return [...kept, { label: OTHER_LABEL, values: { [key]: rest }, other: true }];
}

export function readChart(raw: unknown): AnswerChart | null {
  const parsed = chartTokenSchema.safeParse(raw);
  if (!parsed.success) return null;
  const token = parsed.data;
  const rows = token.data.slice(0, MAX_CHART_ROWS);
  const type = (CHART_TYPES as readonly string[]).includes(token.type ?? "")
    ? (token.type as ChartType)
    : "bar";
  const pie = type === "pie" || type === "donut";
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const x =
    token.x && keys.includes(token.x)
      ? token.x
      : (keys.find((key) => rows.some((row) => row[key] != null && toNumber(row[key]) === null)) ??
        keys[0]);
  const asked = (token.series ?? []).map((item) =>
    typeof item === "string" ? { key: item, name: undefined } : item,
  );
  const picked = (asked.length ? asked : keys.map((key) => ({ key, name: undefined })))
    .filter(
      (item, index, list) =>
        item.key !== x && list.findIndex((other) => other.key === item.key) === index,
    )
    .filter((item) => rows.some((row) => toNumber(row[item.key]) !== null))
    .slice(0, pie ? 1 : MAX_SERIES);
  if (!picked.length) return null;
  const series = picked.map((item, index) => ({
    key: `s${index}`,
    name: clip(item.name, 40) || clip(item.key, 40),
  }));
  let data: ChartPoint[] = rows.map((row) => {
    const values: Record<string, number | null> = {};
    picked.forEach((item, index) => {
      values[`s${index}`] = toNumber(row[item.key]);
    });
    return { label: dateLabel(clip(row[x], 40)), values };
  });
  if (pie) data = foldSlices(data, "s0");
  if (!data.length) return null;
  const drawable = pie || type === "hbar" || data.length >= MIN_POINTS;
  return { type, title: token.title, unit: token.unit, series, data, drawable };
}

export function readStat(raw: unknown): AnswerStat | null {
  const parsed = statTokenSchema.safeParse(raw);
  if (!parsed.success) return null;
  const token = parsed.data;
  const value = toNumber(token.value) ?? clip(token.value, 32);
  if (!token.label || value === "") return null;
  const deltaNumber =
    typeof token.delta === "number" && Number.isFinite(token.delta) ? token.delta : null;
  const delta =
    deltaNumber === null
      ? clip(token.delta, 24)
      : `${deltaNumber > 0 ? "+" : ""}${formatNumber(deltaNumber)}`;
  const trend =
    /^\+/.test(delta) && !/^\+0*(?:[.,]0+)?%?$/.test(delta)
      ? "up"
      : /^[-−–]/.test(delta) && !/^[-−–]0*(?:[.,]0+)?%?$/.test(delta)
        ? "down"
        : "";
  return { label: token.label, value, unit: token.unit, delta, trend, hint: token.hint };
}

export function readAction(raw: unknown): AnswerAction | null {
  const parsed = actionTokenSchema.safeParse(raw);
  if (!parsed.success) return null;
  const title = parsed.data.title || "Đề xuất thay đổi";
  return { title, summary: parsed.data.summary };
}

/* ---------- the answer ---------- */

function logicalLines(value: string): string[][] {
  const lines: string[][] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith(JOIN) && lines.length) {
      lines[lines.length - 1].push(line.replaceAll(JOIN, "").trim());
    } else lines.push([line.replaceAll(JOIN, "").trim()]);
  }
  return lines;
}

const cells = (line: string) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

/** A line made only of "[text](url)" links (and separators) becomes link chips. */
function linksOnly(line: string): AnswerLink[] | null {
  const links: AnswerLink[] = [];
  let broken = false;
  const rest = line.replace(MD_LINK, (_, label: string, url: string) => {
    const target = resolveLink(url);
    if (target && clean(label)) links.push({ text: clean(label), ...target });
    else broken = true;
    return " ";
  });
  if (broken || !links.length || rest.replace(LINK_SEPARATORS, "") !== "") return null;
  return links;
}

export function parseAnswer(value: string): AnswerSection[] {
  const sections: AnswerSection[] = [{ blocks: [] }];
  const current = () => sections[sections.length - 1];
  const lastBlock = () => current().blocks[current().blocks.length - 1];
  let table: string[][] = [];

  const flushTable = () => {
    if (!table.length) return;
    const [head, ...rows] = table;
    current().blocks.push({ kind: "table", head, rows });
    table = [];
  };

  const pushLinks = (links: AnswerLink[]) => {
    const last = lastBlock();
    if (last?.kind === "links") last.links.push(...links);
    else current().blocks.push({ kind: "links", links });
  };

  const pushToken = ({ kind, value: token }: { kind: TokenKind; value: unknown }) => {
    if (kind === "chart") {
      const chart = readChart(token);
      if (chart) current().blocks.push({ kind: "chart", chart });
      return;
    }
    if (kind === "action") {
      const action = readAction(token);
      if (action) current().blocks.push({ kind: "action", action });
      return;
    }
    const stat = readStat(token);
    if (!stat) return;
    const last = lastBlock();
    if (last?.kind === "stats") last.items.push(stat);
    else current().blocks.push({ kind: "stats", items: [stat] });
  };

  for (const pieces of logicalLines(value)) {
    const line = pieces.join(" ").trim();
    if (!line) {
      flushTable();
      continue;
    }
    if (line.startsWith("|")) {
      if (!TABLE_RULE.test(line)) table.push(cells(clean(line)));
      continue;
    }
    flushTable();

    if (TOKEN_LINE.test(line)) {
      readTokens(pieces).forEach(pushToken);
      continue;
    }
    // Tokens this client does not know are dropped rather than shown as JSON.
    if (UNKNOWN_TOKEN.test(line)) continue;

    const heading = HEADING.exec(line) ?? LABEL.exec(line);
    if (heading) {
      sections.push({ title: clean(heading[1].replace(/\*\*/g, "")), blocks: [] });
      continue;
    }

    const image = IMAGE_MD.exec(line);
    if (image) {
      const target = resolveLink(image[2]);
      if (target) {
        current().blocks.push({
          kind: "media",
          media: "image",
          url: target.href,
          label: clean(image[1]) || undefined,
        });
        continue;
      }
    }

    const bare = BARE_URL.exec(line);
    if (bare) {
      const target = resolveLink(bare[1]);
      if (target) {
        const media = target.internal ? "link" : mediaKind(target.href);
        if (media === "link") pushLinks([{ text: shortUrl(bare[1]), bare: true, ...target }]);
        else current().blocks.push({ kind: "media", media, url: target.href });
        continue;
      }
    }

    const sub = SUB_ITEM.exec(line);
    if (sub) {
      const last = lastBlock();
      const parent = last?.kind === "list" ? last.items[last.items.length - 1] : undefined;
      if (parent) parent.children.push(clean(sub[1]));
      else
        current().blocks.push({
          kind: "list",
          ordered: false,
          items: [{ text: clean(sub[1]), children: [] }],
        });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const ordered = Boolean(numbered);
      const last = lastBlock();
      const entry: ListItem = { text: clean(item[1]), children: [] };
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(entry);
      else current().blocks.push({ kind: "list", ordered, items: [entry] });
      continue;
    }

    const cleaned = clean(line);
    const links = linksOnly(cleaned);
    if (links) {
      pushLinks(links);
      continue;
    }

    current().blocks.push({ kind: "text", text: cleaned });
  }
  flushTable();
  return sections.filter((section) => section.blocks.length || section.title);
}

/* ---------- plain text, for the clipboard and the chat context ---------- */

const linkToPlain = (link: AnswerLink) => (link.bare ? link.href : `${link.text} (${link.href})`);

const inlineToPlain = (pieces: Inline[]): string =>
  pieces
    .map((piece) => {
      if (piece.kind === "text") return piece.text;
      if (piece.kind === "bold") return inlineToPlain(piece.children);
      return linkToPlain(piece.link);
    })
    .join("");

const lineToPlain = (line: string) => inlineToPlain(parseInline(line));
export const withUnit = (value: number | string, unit: string) =>
  unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);

function chartToPlain(chart: AnswerChart): string {
  const multiple = chart.series.length > 1;
  const rows = chart.data.map((row) => {
    const values = chart.series.map((serie) => {
      const value = row.values[serie.key];
      const shown = value === null || value === undefined ? "—" : withUnit(value, chart.unit);
      return multiple ? `${serie.name} ${shown}` : shown;
    });
    return `- ${row.label}: ${values.join(", ")}`;
  });
  return [`${chart.title || "Biểu đồ"}:`, ...rows].join("\n");
}

function statToPlain(stat: AnswerStat): string {
  const note = [stat.delta, stat.hint].filter(Boolean).join(" ");
  return `${stat.label}: ${withUnit(stat.value, stat.unit)}${note ? ` (${note})` : ""}`;
}

function blockToPlain(block: AnswerBlock): string {
  switch (block.kind) {
    case "text":
      return lineToPlain(block.text);
    case "list":
      return block.items
        .map((item, index) =>
          [
            `${block.ordered ? `${index + 1}.` : "-"} ${lineToPlain(item.text)}`,
            ...item.children.map((child) => `  ◦ ${lineToPlain(child)}`),
          ].join("\n"),
        )
        .join("\n");
    case "table":
      return [block.head, ...block.rows].map((row) => row.map(lineToPlain).join(" | ")).join("\n");
    case "media":
      return block.label ? `${block.label}: ${block.url}` : block.url;
    case "links":
      return block.links.map(linkToPlain).join("\n");
    case "chart":
      return chartToPlain(block.chart);
    case "stats":
      return block.items.map(statToPlain).join("\n");
    case "action":
      return [`Đề xuất: ${block.action.title}`, block.action.summary].filter(Boolean).join("\n");
  }
}

export function answerToPlainText(value: string): string {
  return parseAnswer(value)
    .map((section) =>
      [section.title, ...section.blocks.map(blockToPlain)].filter(Boolean).join("\n"),
    )
    .join("\n\n")
    .trim();
}
