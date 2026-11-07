import { toPlainText } from "../RichText";

/** Preserve distinct available sources, but do not repeat identical imported content. */
export function uniqueContent(
  values: (string | null | undefined)[],
  alreadyShown: (string | null | undefined)[] = [],
): string[] {
  const existing = alreadyShown
    .map((value) => toPlainText(value).normalize("NFC").toLowerCase())
    .filter(Boolean);
  const keys = new Set(existing);
  return values.filter((value): value is string => {
    const key = toPlainText(value).normalize("NFC").toLowerCase();
    if (!key || keys.has(key) || existing.some((text) => text.includes(key))) return false;
    keys.add(key);
    return true;
  });
}

export interface PreviewText {
  transcript?: string | null;
  transcriptTranslation?: string | null;
}
export interface PassageText extends PreviewText {
  content?: string | null;
  contentTranslation?: string | null;
}

/** Imports can repeat the same script with accent labels and numbered answer hints. */
export function uniqueListeningScripts(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  return uniqueContent(values).filter((value) => {
    const key = toPlainText(value)
      .replace(/\[\d+\]/g, " ")
      .replace(/\b[MW](?:-[A-Za-z]+)?:\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .normalize("NFC")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function listeningScripts(question: PreviewText, passage?: PassageText) {
  return uniqueListeningScripts([passage?.content, passage?.transcript, question.transcript]);
}

export function availableTranslations(question: PreviewText, passage?: PassageText) {
  return uniqueContent([
    question.transcriptTranslation,
    passage?.contentTranslation,
    passage?.transcriptTranslation,
  ]);
}
