export const VIETNAM_PHONE_REGEX = /^0[35789]\d{8}$/;

export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) {
    return null;
  }

  let cleaned = raw.replace(/[\s().-]/g, "");

  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0084")) {
    cleaned = "0" + cleaned.slice(4);
  }

  return cleaned;
}

export function isValidPhoneNumber(raw: string | null | undefined): boolean {
  const normalized = normalizePhoneNumber(raw);
  if (normalized === null) {
    return true;
  }
  return VIETNAM_PHONE_REGEX.test(normalized);
}
