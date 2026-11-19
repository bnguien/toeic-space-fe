/**
 * Word proofs for dictation — the client side of the server's `WordProof` rule.
 *
 * The server never sends the answer letters; every answer word (normalised) is hashed one way with
 * PBKDF2-SHA256, salted per sentence and position. The client hashes the word just typed the same way and
 * compares → words light up while typing, but recovering the text means a dictionary attack per position
 * (|dictionary| × iterations for EACH position).
 *
 * Web Crypto only. Hashing a word takes ~10–50 ms, so results arrive asynchronously: `statuses()` returns
 * what is known (null = not yet), hashes the rest in the background and calls `onReady` to re-render.
 */
import type { WordProofDto } from "../types/dictation.types";

// Same as the server normalisation: strip non letter/digit/apostrophe at both ends, lower case, no diacritics.
const STRIP = /^[^0-9a-zA-ZÀ-ɏ']+|[^0-9a-zA-ZÀ-ɏ']+$/g;

export type ProofState = "ok" | "bad";

export function normalizeForProof(token: string | null | undefined): string {
  return String(token || "")
    .replace(STRIP, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(String(base64 || ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * PBKDF2-HMAC-SHA256(password = normalised word, salt = sentence salt ‖ 2-byte big-endian position)
 * → base64 of 16 bytes. Must match the server digest bit for bit.
 */
export async function digestWord(
  normalizedWord: string,
  saltBase64: string,
  index: number,
  iterations: number,
  keyLength = 16,
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Trình duyệt không hỗ trợ Web Crypto (cần HTTPS).");
  const saltBase = base64ToBytes(saltBase64);
  const salt = new Uint8Array(saltBase.length + 2);
  salt.set(saltBase);
  salt[saltBase.length] = (index >> 8) & 0xff;
  salt[saltBase.length + 1] = index & 0xff;
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizedWord),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    keyLength * 8,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export class WordProofMatcher {
  private readonly proof: WordProofDto | null;
  private readonly cache = new Map<string, ProofState>();
  private readonly pending = new Map<string, Promise<ProofState | null>>();

  constructor(proof: WordProofDto | null | undefined) {
    this.proof = proof && Array.isArray(proof.digests) && proof.salt ? proof : null;
  }

  get size(): number {
    return this.proof ? this.proof.digests.length : 0;
  }

  /** 'ok' | 'bad' | null (not hashed yet). No proof → null. */
  status(index: number, token: string): ProofState | null {
    if (!this.proof) return null;
    if (index >= this.size) return "bad";
    const key = `${index}\u0000${normalizeForProof(token)}`;
    return this.cache.get(key) ?? null;
  }

  /** Hashes (cached, concurrent calls shared) and resolves 'ok' | 'bad' | null on error. */
  ensure(index: number, token: string): Promise<ProofState | null> {
    if (!this.proof) return Promise.resolve(null);
    if (index >= this.size) return Promise.resolve("bad");
    const normalized = normalizeForProof(token);
    const key = `${index}\u0000${normalized}`;
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const running = this.pending.get(key);
    if (running) return running;
    // An empty normalised word (punctuation only) is never hashed — some browsers reject an empty
    // PBKDF2 key; it is treated as wrong, it is hardly ever a real word.
    if (!normalized) {
      this.cache.set(key, "bad");
      return Promise.resolve("bad");
    }
    const { digests, salt, iterations } = this.proof;
    const expected = digests[index];
    const job = digestWord(normalized, salt, index, iterations)
      .then((digest): ProofState => (digest === expected ? "ok" : "bad"))
      .catch(() => null)
      .then((state) => {
        this.pending.delete(key);
        if (state) this.cache.set(key, state);
        return state;
      });
    this.pending.set(key, job);
    return job;
  }

  /**
   * Status of every FINISHED word by position. Unknown words → null and are hashed in the background;
   * each finished hash calls `onReady()` once so the component re-renders.
   */
  statuses(tokens: string[], onReady?: () => void): (ProofState | null)[] {
    return tokens.map((token, i) => {
      const state = this.status(i, token);
      if (state === null) {
        void this.ensure(i, token).then((result) => {
          if (result && onReady) onReady();
        });
      }
      return state;
    });
  }
}
