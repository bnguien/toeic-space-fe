/**
 * Ngữ pháp 0 → 990 (/games/grammar): the left column is the roadmap of 5 stages / 44 topics; a topic expands into
 * Kiến thức · Từ vựng · Bài tập, Kiến thức expands into its units. The right column (GrammarLesson) shows the
 * selected part.
 *
 * The URL keeps the place to share / reload: ?topic=04&part=theory#CĐ04.1 · ?topic=04&part=exercises#<questionId> ·
 * ?stage=01 · ?review=1 (Sổ lỗi + traps). No query → opens where the learner was (progress.current / guest localStorage).
 * Scrolling Kiến thức → scroll-spy highlights + expands the unit on the left and updates the hash (replaceState).
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useSessionStatus } from "@/modules/auth";

import { GrammarLesson } from "../components/lesson/GrammarLesson";
import { RoadmapColumn } from "../components/roadmap/RoadmapColumn";
import { SideSplit } from "../components/roadmap/SideSplit";
import theme from "../components/shared/GrammarTheme.module.css";
import { grammarApi } from "../api/grammar.api";
import { useGrammarTheme } from "../hooks/useGrammarTheme";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSidePanel } from "../hooks/useSidePanel";
import {
  flushPosition,
  loadProgress,
  rememberPosition,
  useGrammarProgress,
} from "../store/grammar-progress.store";
import type { LessonPart } from "../types/grammar.types";
import { cx } from "../utils/cx";
import { stageById, topicInfo } from "../utils/grammar-data";
import { pad2, topicOfCode } from "../utils/grammar-text";
import {
  GRAMMAR_PATH,
  PART_IDS,
  readHash,
  readTalk,
  readView,
  selectedIdFromCode,
  viewKeyOf,
  type ReturnTo,
} from "../utils/grammar-view";
import styles from "./GrammarPage.module.css";

const PAGE_TITLE = "Ngữ pháp TOEIC 0 → 990 | TOEIC Space";
/** Wait for the roadmap drop-downs to finish before scrolling the column to the highlighted item. */
const SIDE_SCROLL_DELAY_MS = 420;
const MOBILE_QUERY = "(max-width: 760px)";
const PREFERENCES_DEBOUNCE_MS = 800;

export function GrammarPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionStatus = useSessionStatus();
  const progress = useGrammarProgress();
  const view = readView(params);
  const viewTopic = view?.kind === "topic" ? view.number : null;
  const hashCode = readHash(location.hash, view);
  const viewKey = viewKeyOf(view);

  const [openTopic, setOpenTopic] = useState<number | null>(viewTopic);
  const shellRef = useRef<HTMLElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const sidePanel = useSidePanel(shellRef, sideRef);
  // Mobile stacks the columns and has no divider: a collapse remembered from desktop must not lock the roadmap.
  const narrow = useMediaQuery(MOBILE_QUERY);
  const [theoryTopic, setTheoryTopic] = useState<number | null>(
    view?.kind === "topic" && view.part === "theory" ? viewTopic : null,
  );
  // Unit being read (scroll-spy), tied to the navigation (location.key): a new navigation reads the hash again.
  const [spy, setSpy] = useState<{ key: string | null; code: string | null }>({
    key: null,
    code: null,
  });
  const readingCode =
    spy.key === location.key
      ? spy.code
      : view?.kind === "topic" && view.part === "theory"
        ? hashCode
        : null;
  const [returnTo, setReturnTo] = useState<ReturnTo | null>(null);
  const [focus, setFocus] = useState<{ blockKey: string | null; view: string }>({
    blockKey: null,
    view: "",
  });
  const autoOpened = useRef(!!location.search || !!location.hash);
  const focusKey = focus.view === viewKey ? focus.blockKey : null;
  const currentPosition = progress.current;
  const { dark, chosen: darkChosen, toggleDark, setDarkChoice } = useGrammarTheme();
  const sessionResolved = sessionStatus === "authenticated" || sessionStatus === "anonymous";
  const signedIn = sessionStatus === "authenticated";

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  // Signed in: dark mode and roadmap column come from the account (Studychill kept them per browser only).
  const preferencesLoaded = useRef(false);
  const { restore: restoreSide } = sidePanel;
  useEffect(() => {
    preferencesLoaded.current = false;
    if (!signedIn) return undefined;
    let alive = true;
    grammarApi
      .getPreferences()
      .then((saved) => {
        if (!alive) return;
        if (saved.darkMode !== null) setDarkChoice(saved.darkMode);
        if (saved.roadmapWidth !== null || saved.roadmapCollapsed)
          restoreSide({ width: saved.roadmapWidth, collapsed: saved.roadmapCollapsed });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) preferencesLoaded.current = true;
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per session state
  }, [signedIn]);
  const sideWidth = sidePanel.side.width;
  const sideCollapsed = sidePanel.side.collapsed;
  useEffect(() => {
    if (!signedIn || !preferencesLoaded.current) return undefined;
    const timer = setTimeout(() => {
      grammarApi
        .savePreferences({
          darkMode: darkChosen ? dark : null,
          roadmapWidth: sideWidth,
          roadmapCollapsed: sideCollapsed,
        })
        .catch(() => {});
    }, PREFERENCES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signedIn, dark, darkChosen, sideWidth, sideCollapsed]);

  // Progress of the session (guest: localStorage); reloaded on every visit and when the session changes.
  useEffect(() => {
    if (sessionResolved) loadProgress({ signedIn, force: true });
  }, [sessionResolved, signedIn]);

  useEffect(() => () => flushPosition(), []);

  // Entering /games/grammar without anything → open where the learner was (once per visit).
  useEffect(() => {
    if (autoOpened.current || !progress.loaded) return;
    autoOpened.current = true;
    const cur = currentPosition;
    const topicNum = Number(cur?.topic);
    if (!cur || !topicInfo(topicNum)) return;
    const part: LessonPart = PART_IDS.includes(cur.part) ? cur.part : "theory";
    navigate(
      {
        pathname: GRAMMAR_PATH,
        search: `?topic=${pad2(topicNum)}&part=${part}`,
        hash: cur.anchor ? `#${cur.anchor}` : "",
      },
      { replace: true },
    );
  }, [progress.loaded, currentPosition, navigate]);

  // Expand the right branch on the left when the topic of the URL changes (entering, navigating from elsewhere).
  const [urlTopic, setUrlTopic] = useState<number | null>(viewTopic);
  if (viewTopic !== urlTopic) {
    setUrlTopic(viewTopic);
    if (viewTopic) {
      setOpenTopic(viewTopic);
      if (view?.kind === "topic" && view.part === "theory") setTheoryTopic(viewTopic);
    }
  }

  // Remember the place when the part / anchor changes (the store debounces 5 s).
  const viewPart = view?.kind === "topic" ? view.part : null;
  useEffect(() => {
    if (!progress.loaded || !viewTopic || !viewPart) return;
    rememberPosition(viewTopic, viewPart, viewPart === "theory" ? readingCode || "" : "");
  }, [progress.loaded, viewTopic, viewPart, readingCode]);

  // Esc leaves focus mode.
  useEffect(() => {
    if (!focusKey) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus({ blockKey: null, view: "" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusKey]);

  let selected: string | null = null;
  if (view?.kind === "stage") selected = view.id;
  else if (view?.kind === "topic" && view.part === "theory") {
    selected = readingCode ? selectedIdFromCode(view.number, readingCode) : `${view.number}:theory`;
  } else if (view?.kind === "topic") selected = `${view.number}:${view.part}`;

  const goTo = (
    topicNum: number,
    part: LessonPart,
    code: string | null,
    { smooth = true } = {},
  ) => {
    const samePage = view?.kind === "topic" && view.number === topicNum && view.part === part;
    navigate(
      {
        pathname: GRAMMAR_PATH,
        search: `?topic=${pad2(topicNum)}&part=${part}`,
        hash: code ? `#${code}` : "",
      },
      { replace: samePage, state: { smooth } },
    );
  };

  const selectPart = (topicNum: number, part: LessonPart) => {
    setOpenTopic(topicNum);
    if (part === "theory") setTheoryTopic(topicNum);
    goTo(topicNum, part, null);
  };

  /** Click on a roadmap item. */
  const selectItem = (id: string) => {
    const [topicStr, part, i, j] = id.split(":");
    const n = Number(topicStr);
    if (i === undefined) {
      goTo(n, part as LessonPart, null);
      return;
    }
    const code = `CĐ${pad2(n)}.${Number(i) + 1}${j !== undefined ? `.${Number(j) + 1}` : ""}`;
    goTo(n, "theory", code);
  };

  const selectStage = (id: string) =>
    navigate({ pathname: GRAMMAR_PATH, search: `?stage=${id.replace("stage-", "")}` });
  const openRevision = () => navigate({ pathname: GRAMMAR_PATH, search: "?review=1" });

  const onSpy = (code: string | null) => {
    setSpy({ key: location.key, code });
    if (viewTopic) {
      setOpenTopic(viewTopic);
      setTheoryTopic(viewTopic);
    }
    try {
      const url = `${window.location.pathname}${window.location.search}${code ? `#${code}` : ""}`;
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* the browser refused to change the URL: ignored */
    }
  };

  const onGoTo = (code: string) => {
    const topicNum = topicOfCode(code);
    if (!topicNum) return;
    setOpenTopic(topicNum);
    setTheoryTopic(topicNum);
    goTo(topicNum, "theory", code);
  };

  /** "↺ Xem lại" under a wrong answer / in Sổ lỗi: jump to the unit in Kiến thức, remember the way back. */
  const review = (code: string, qid?: string) => {
    if (view?.kind === "review") {
      setReturnTo({ target: { pathname: GRAMMAR_PATH, search: "?review=1" }, label: "Sổ lỗi" });
    } else if (qid) {
      const label =
        view?.kind === "stage" ? stageById(view.id)?.test.title || "bài test" : "bài tập";
      setReturnTo({
        target: { pathname: GRAMMAR_PATH, search: location.search, hash: `#${qid}` },
        label,
      });
    }
    setFocus({ blockKey: null, view: "" });
    onGoTo(code);
  };

  const goBack = () => {
    const to = returnTo?.target;
    setReturnTo(null);
    if (to) navigate(to, { state: { smooth: true } });
  };

  const toggleFocus = (blockKey: string | null) => {
    setFocus({ blockKey, view: blockKey ? viewKey : "" });
    if (blockKey) {
      requestAnimationFrame(() =>
        document
          .querySelector(`[data-block="${CSS.escape(blockKey)}"]`)
          ?.scrollIntoView({ block: "start" }),
      );
    }
  };

  // The highlighted item left the visible part of the roadmap (scroll-spy) → scroll the column to it.
  useEffect(() => {
    const side = sideRef.current;
    if (!side || side.scrollHeight <= side.clientHeight) return undefined;
    const t = setTimeout(() => {
      const el = side.querySelector("[data-active]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const rs = side.getBoundingClientRect();
      if (r.top < rs.top + 60 || r.bottom > rs.bottom - 40) {
        side.scrollTo({ top: side.scrollTop + r.top - rs.top - rs.height / 3, behavior: "smooth" });
      }
    }, SIDE_SCROLL_DELAY_MS);
    return () => clearTimeout(t);
  }, [selected]);

  const smooth = !!(location.state as { smooth?: boolean } | null)?.smooth;

  return (
    <div
      data-grammar-root=""
      className={cx(theme.theme, styles.page)}
      data-color-mode={dark ? "dark" : undefined}
      data-focus={focusKey ? "true" : undefined}
    >
      <main
        ref={shellRef}
        className={cx(
          styles.shell,
          view && styles.isDocument,
          sidePanel.collapsed && styles.sideCollapsed,
          sidePanel.hasWidth && styles.hasSideWidth,
          sidePanel.dragging && styles.dragging,
        )}
        style={sidePanel.style}
      >
        <aside
          className={styles.side}
          aria-label="Lộ trình ngữ pháp"
          ref={sideRef}
          inert={(sidePanel.collapsed && !narrow) || undefined}
        >
          <RoadmapColumn
            progress={progress}
            openTopic={openTopic}
            onToggleTopic={(n) => setOpenTopic((v) => (v === n ? null : n))}
            theoryTopic={theoryTopic}
            onToggleTheory={(n) => setTheoryTopic((v) => (v === n ? null : n))}
            selected={selected}
            onSelectItem={selectItem}
            onSelectStage={selectStage}
            onOpenRevision={openRevision}
            dark={dark}
            onToggleDark={toggleDark}
          />
        </aside>
        <SideSplit panel={sidePanel} />

        <section className={styles.main} aria-label="Nội dung bài học" ref={mainRef}>
          <div className={styles.mainInner}>
            <GrammarLesson
              view={view}
              scrollTarget={{ code: hashCode, n: location.key, smooth }}
              mainRef={mainRef}
              progress={progress}
              onSelectPart={selectPart}
              onSelectStage={selectStage}
              onSpy={onSpy}
              onGoTo={onGoTo}
              onOpenReview={openRevision}
              onReview={review}
              onLogin={() =>
                navigate(`/login?next=${encodeURIComponent(`${GRAMMAR_PATH}?review=1`)}`)
              }
              onBack={() => navigate(GRAMMAR_PATH)}
              returnTo={returnTo}
              onReturn={goBack}
              focus={{ blockKey: focusKey, toggle: toggleFocus }}
              talk={readTalk(params, location.key)}
              dark={dark}
              onToggleDark={toggleDark}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
