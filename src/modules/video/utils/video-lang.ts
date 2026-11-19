/**
 * Picks the primary subtitle language of a video — same rule as the server's `pick_original_language`.
 * The server already maps `video.language`, but the client keeps the rule: falling back to "the first code" picks
 * 'aa' (Afar, alphabetically first), a YouTube auto-translation that is blocked with 429 the hardest.
 */
import type { LangDto } from "../types/video.types";

interface VideoLanguages {
  language?: string;
  manual?: readonly LangDto[];
  auto?: readonly LangDto[];
}

export function languageCodes(video: VideoLanguages | null | undefined): string[] {
  const out: string[] = [];
  [...(video?.manual || []), ...(video?.auto || [])].forEach((x) => {
    if (x && x.code && !out.includes(x.code)) out.push(x.code);
  });
  return out;
}

export function pickSourceLanguage(video: VideoLanguages | null | undefined): string {
  const codes = languageCodes(video);
  if (!codes.length) return "";
  const lower = new Map(codes.map((c) => [c.toLowerCase(), c]));
  const lang = String(video?.language || "")
    .trim()
    .toLowerCase();
  const base = lang ? lang.split("-")[0] : "";
  const findFirst = (test: (code: string) => boolean) =>
    codes.find((c) => test(c.toLowerCase())) || "";

  if (lang) {
    for (const candidate of [`${lang}-orig`, lang, `${base}-orig`, base]) {
      const hit = lower.get(candidate);
      if (hit) return hit;
    }
    const hit =
      findFirst((c) => c.startsWith(`${base}-`) && c.endsWith("-orig")) ||
      findFirst((c) => c.startsWith(`${base}-`));
    if (hit) return hit;
  }

  const manual = (video?.manual || []).map((x) => x && x.code).filter(Boolean);
  return (
    manual.find((c) => c.toLowerCase().split("-")[0] === "en") ||
    lower.get("en-orig") ||
    manual[0] ||
    findFirst((c) => c.endsWith("-orig")) ||
    lower.get("en") ||
    codes[0]
  );
}
