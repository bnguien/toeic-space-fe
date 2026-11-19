/**
 * "Bôi đen để tra": one site-wide layer that looks up any text the learner selects (port of Studychill
 * `SelectionLookupContext`). One provider instead of a lookup per page, so a word gives the same result everywhere.
 *
 * On by default on every page it wraps. A page that must lock it (exam-style practice) calls `useLookupGate()` and
 * draws its own "Chế độ tra từ" switch. A page that wants to draw results itself registers a receiver.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { useLocation } from "react-router-dom";

import type {
  SelectionAnchor,
  SelectionLookupContextValue,
  SelectionLookupDto,
  SelectionLookupReceiver,
} from "../types/dictionary.types";
import {
  countWords,
  isCompleteEntry,
  lookupSelection,
  normalizeText,
} from "../utils/selection-lookup";
import { SelectionLookupContext } from "../utils/selection-lookup-context";
import { LookupPopover } from "./LookupPopover";

/** Longer selections ask first — a learner selecting a paragraph to copy should not spend a translation. */
const MAX_AUTO_LOOKUP_WORDS = 12;
const MAX_SELECTION_CHARACTERS = 600;
/** The bubble is `position: fixed`; scrolling further than this leaves it off the text, so it closes. */
const SCROLL_CLOSE_THRESHOLD = 60;
/** Never looked up: form fields and regions that opt out. */
const EXCLUDED_SELECTOR = 'input, textarea, select, [contenteditable="true"], [data-no-lookup]';
const SENTENCE_BLOCK_SELECTOR = "p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, figcaption";

interface LookupSession {
  /** Page the selection was made on: a session from another page is never shown. */
  path: string;
  text: string;
  context: string;
  anchor: SelectionAnchor;
  needsConfirm: boolean;
}

const toElement = (node: Node | null): Element | null =>
  !node ? null : node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);

/** Sentence around the selection — only sent so the AI tier translates in context. */
function getSentenceContext(range: Range, fragment: string): string {
  const block = toElement(range.startContainer)?.closest(SENTENCE_BLOCK_SELECTOR);
  if (!block) return "";
  // Drop decorations (meanings floating above words…) or the context would mix in Vietnamese.
  const clone = block.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  const fullText = (clone.textContent || "").replace(/\s+/g, " ").trim();
  if (!fullText || fullText.length <= 300) return fullText;
  const sentences = fullText.split(/(?<=[.?!])\s+/);
  return (sentences.find((sentence) => sentence.includes(fragment)) || "").slice(0, 400);
}

function anchorFromRect(rect: DOMRect): SelectionAnchor {
  const above = rect.top >= 240;
  return {
    x: Math.max(190, Math.min(window.innerWidth - 190, rect.left + rect.width / 2)),
    y: above ? rect.top - 10 : rect.bottom + 10,
    below: !above,
  };
}

function lookupErrorMessage(error: unknown): string {
  return isAxiosError(error) && error.response?.status === 429
    ? "Bạn tra hơi nhanh, nghỉ một nhịp rồi tra tiếp nhé."
    : "Mất kết nối tới máy chủ tra từ.";
}

interface SelectionLookupProviderProps {
  children: ReactNode;
  /** Turns the layer off for whole areas (the CMS), on top of the per-page lock. */
  disabled?: boolean;
}

export function SelectionLookupProvider({
  children,
  disabled = false,
}: SelectionLookupProviderProps) {
  const location = useLocation();

  // lockCount > 0: a page holds its own switch (exam-style pages).
  const [lockCount, setLockCount] = useState(0);
  const [switchOn, setSwitchOn] = useState(false);
  const [session, setSession] = useState<LookupSession | null>(null);
  const [result, setResult] = useState<SelectionLookupDto | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  /** Second pass: the AI is filling in phonetics / part of speech / example. */
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState("");
  // A page may plug a receiver to draw results itself; the provider then stops drawing the bubble but keeps the
  // selection capture and the lookup tiers, so every page behaves the same way.
  const receiverRef = useRef<SelectionLookupReceiver | null>(null);
  const [hasReceiver, setHasReceiver] = useState(false);
  const autoLookupRef = useRef(true);

  const locked = lockCount > 0;
  const enabled = !disabled && (locked ? switchOn : true);
  const path = location.pathname;
  // Leaving the page or turning lookups off hides the card at once (derived, so no effect has to reset state).
  const visibleSession = enabled && session?.path === path ? session : null;
  const scrollYAtOpenRef = useRef(0);
  const lastAnchorRef = useRef<SelectionAnchor>({ x: 0, y: 0, below: false });
  // Every selection is a new request; a late answer to an older one must not overwrite the card on screen.
  const requestSeqRef = useRef(0);

  const close = useCallback(() => {
    setSession(null);
    setResult(null);
    setError("");
    setLookingUp(false);
    setEnriching(false);
    requestSeqRef.current += 1;
  }, []);

  /**
   * Two passes:
   *   1. No AI — cache, catalog and translation answer in about a second, enough to show the meaning at once.
   *   2. Only when the card still lacks phonetics and part of speech, the AI tier fills it in place.
   */
  const lookUp = useCallback(async (text: string, context: string) => {
    const requestId = ++requestSeqRef.current;
    setLookingUp(true);
    setError("");
    try {
      const fastResult = await lookupSelection(text, { context, ai: false });
      if (requestId !== requestSeqRef.current) return;
      if (!fastResult) {
        setLookingUp(false);
        setError("Chưa tra được đoạn này.");
        return;
      }
      // Guests never get the AI tier: a second call would only return the same result.
      const needsSecondPass = !isCompleteEntry(fastResult) && fastResult.aiAllowed;

      if (fastResult.found || !needsSecondPass) {
        setResult(fastResult);
        setLookingUp(false);
        if (!needsSecondPass) return;
      }
      // First pass missed but the AI pass is still ahead: keep "looking up" instead of a premature "not found".
      setEnriching(true);
      const fullResult = await lookupSelection(text, { context, ai: true });
      if (requestId !== requestSeqRef.current) return;
      if (fullResult && (fullResult.found || !fastResult.found)) setResult(fullResult);
      else if (!fastResult.found) setResult(fastResult);
    } catch (e) {
      if (requestId !== requestSeqRef.current) return;
      setError(lookupErrorMessage(e));
    } finally {
      if (requestId === requestSeqRef.current) {
        setLookingUp(false);
        setEnriching(false);
      }
    }
  }, []);

  const confirmLongSelection = useCallback(() => {
    if (!visibleSession) return;
    setSession((current) => (current ? { ...current, needsConfirm: false } : current));
    void lookUp(visibleSession.text, visibleSession.context);
  }, [visibleSession, lookUp]);

  // ── Selection capture ─────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return undefined;

    const readSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        // Clicking an empty spot clears the selection: close the open card.
        close();
        return;
      }

      const selectedText = normalizeText(selection.toString());
      if (!selectedText || countWords(selectedText) === 0) {
        close();
        return;
      }

      const range = selection.getRangeAt(0);
      if (toElement(range.startContainer)?.closest(EXCLUDED_SELECTOR)) return;

      const rect = range.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;

      const text = selectedText.slice(0, MAX_SELECTION_CHARACTERS);
      const context = getSentenceContext(range, text);
      const needsConfirm = countWords(text) > MAX_AUTO_LOOKUP_WORDS;
      const anchor = anchorFromRect(rect);
      lastAnchorRef.current = anchor;

      if (receiverRef.current) {
        // The page draws on its own; the anchor lets it place an action bar next to the text.
        receiverRef.current({ text, context, anchor, autoLookup: autoLookupRef.current });
        if (!autoLookupRef.current) return;
      }
      scrollYAtOpenRef.current = window.scrollY;
      setResult(null);
      setError("");
      setSession({ path, text, context, anchor, needsConfirm });
      if (!needsConfirm) void lookUp(text, context);
    };

    // setTimeout 0: on mouseup the browser has not always settled the selection yet.
    const handlePointerUp = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-no-lookup]")) return;
      setTimeout(readSelection, 0);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      // Shift + arrow keys also select text.
      if (event.shiftKey && event.key.startsWith("Arrow")) setTimeout(readSelection, 0);
    };

    const handleScroll = () => {
      if (Math.abs(window.scrollY - scrollYAtOpenRef.current) > SCROLL_CLOSE_THRESHOLD) close();
    };

    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchend", handlePointerUp);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, path, close, lookUp]);

  // Push the progress of a lookup to the receiver so the page can draw it.
  useEffect(() => {
    if (!receiverRef.current || !visibleSession) return;
    receiverRef.current({
      text: visibleSession.text,
      context: visibleSession.context,
      autoLookup: true,
      result,
      lookingUp,
      enriching,
      error,
    });
  }, [visibleSession, result, lookingUp, enriching, error]);

  /** Called by a page when the learner presses its own "look up" button instead of looking up on selection. */
  const requestLookup = useCallback(
    (text: string, context = "") => {
      const cleanText = normalizeText(text);
      if (!cleanText) return;
      scrollYAtOpenRef.current = window.scrollY;
      setResult(null);
      setError("");
      setSession({
        path,
        text: cleanText,
        context,
        anchor: lastAnchorRef.current,
        needsConfirm: false,
      });
      void lookUp(cleanText, context);
    },
    [path, lookUp],
  );

  /** The switch of a locked page; turning it off closes the open card. */
  const changeSwitch = useCallback(
    (on: boolean) => {
      setSwitchOn(on);
      if (!on) close();
    },
    [close],
  );

  /** Plugs a receiver. `autoLookup: false` only reports the selection, without calling the API. */
  const registerReceiver = useCallback(
    (receiver: SelectionLookupReceiver, { autoLookup = true }: { autoLookup?: boolean } = {}) => {
      receiverRef.current = receiver;
      autoLookupRef.current = autoLookup;
      setHasReceiver(true);
      return () => {
        receiverRef.current = null;
        autoLookupRef.current = true;
        setHasReceiver(false);
      };
    },
    [],
  );

  const registerLock = useCallback(() => {
    setLockCount((count) => count + 1);
    setSwitchOn(false);
    return () => {
      setLockCount((count) => Math.max(0, count - 1));
      setSwitchOn(false);
    };
  }, []);

  const contextValue = useMemo<SelectionLookupContextValue>(
    () => ({
      enabled,
      locked,
      switchOn,
      setSwitchOn: changeSwitch,
      registerLock,
      registerReceiver,
      requestLookup,
      close,
    }),
    [enabled, locked, switchOn, changeSwitch, registerLock, registerReceiver, requestLookup, close],
  );

  return (
    <SelectionLookupContext.Provider value={contextValue}>
      {children}
      {visibleSession && !hasReceiver ? (
        <LookupPopover
          anchor={visibleSession.anchor}
          text={visibleSession.text}
          context={visibleSession.context}
          result={result}
          lookingUp={lookingUp}
          enriching={enriching}
          error={error}
          needsConfirm={visibleSession.needsConfirm}
          onConfirm={confirmLongSelection}
          onClose={close}
        />
      ) : null}
    </SelectionLookupContext.Provider>
  );
}
