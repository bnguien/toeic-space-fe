/**
 * Repairs common UTF-8-as-Windows-1252 mojibake returned by older data sources,
 * for example "Báº£o" back to "Bảo". The API/database should ultimately store and
 * return UTF-8 correctly; this is a defensive display fallback only.
 */
const MOJIBAKE_MARKER = /(?:Ã.|Â.|Ð.|áº|á»|Ä.)/;

// Bytes 0x80–0x9f are printable punctuation in Windows-1252, not control
// characters. Vietnamese UTF-8 mojibake commonly contains 0x85 as “…”
// (for example, "Nguyá»…n"), so recover those bytes before decoding.
const WINDOWS_1252_BYTES: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

export function repairVietnameseText(value: string): string {
  if (!MOJIBAKE_MARKER.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value), (character) => {
      const codePoint = character.charCodeAt(0);
      return WINDOWS_1252_BYTES[codePoint] ?? codePoint;
    });
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

/** Repairs every string in an API JSON response without mutating its source object. */
export function repairVietnamesePayload<T>(value: T): T {
  if (typeof value === "string") {
    return repairVietnameseText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairVietnamesePayload(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        repairVietnamesePayload(item),
      ]),
    ) as T;
  }

  return value;
}
