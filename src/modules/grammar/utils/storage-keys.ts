/** Browser storage keys of the grammar feature (Studychill `sc_ngu_phap_*` / `sc_gp_*` renamed to `ts_grammar_*`). */
export const GRAMMAR_STORAGE_KEYS = {
  /** Guest progress { lessons, current } — Studychill `sc_ngu_phap_khach_v1`. */
  guestProgress: "ts_grammar_guest_v1",
  /** "1" once the guest hid the login invite — `sc_ngu_phap_an_moi_dang_nhap`. */
  hideLoginInvite: "ts_grammar_hide_login_invite",
  /** "dark" | "light" — `sc_ngu_phap_theme`. */
  theme: "ts_grammar_theme",
  /** Roadmap column { w, gon } — `sc_gp_side`. */
  sidePanel: "ts_grammar_side",
  /** Known vocabulary words of guests (and the legacy copy merged once after sign-in) — `sc_ngu_phap_da_thuoc`. */
  knownWords: "ts_grammar_known_words",
  /** Lecture preferences { muted, fs } — `sc_gp_giang`. */
  lecturePrefs: "ts_grammar_lecture",
  /** Paper tone of the next Bí kíp scroll (0..6) — `sc_gp_bikip_tone`. */
  biKipTone: "ts_grammar_bikip_tone",
} as const;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: kept for this visit only */
  }
}
