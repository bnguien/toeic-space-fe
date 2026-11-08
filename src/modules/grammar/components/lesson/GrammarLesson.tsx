/**
 * Lesson column of /games/grammar: cover banner (always first) + the selected part of a topic (Kiến thức /
 * Từ vựng / Bài tập), a stage test, or the personal revision; nothing selected → the roadmap overview.
 *
 * Synced with the roadmap: `scrollTarget` (code in the URL hash: knowledge unit or question id) scrolls to the right place;
 * while the learner scrolls Kiến thức, scroll-spy reports the unit / sub-unit being read through `onSpy`.
 */
import { ArrowLeft, CornerDownLeft, Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";

import { useGrammarLesson } from "../../hooks/useGrammarLesson";
import { useStageTest } from "../../hooks/useStageTest";
import {
  confirmPart,
  lessonOf,
  setStage,
  type GrammarProgressState,
} from "../../store/grammar-progress.store";
import type {
  FocusControl,
  LessonPart,
  StageProgressDto,
  StageTestDto,
  TalkTarget,
} from "../../types/grammar.types";
import { TOPIC_COUNT } from "../../utils/grammar-curriculum";
import { stageById, stageOfTopic, topicInfo } from "../../utils/grammar-data";
import { pad2 } from "../../utils/grammar-text";
import type { GrammarView, ReturnTo } from "../../utils/grammar-view";
import { LessonComments } from "../comments/LessonComments";
import { ExerciseView, StageTestView } from "../exercise/ExerciseView";
import { KnowledgeView } from "../knowledge/KnowledgeView";
import { ReviewView } from "../review/ReviewView";
import { ThemeToggle } from "../roadmap/ThemeToggle";
import kit from "../shared/GrammarKit.module.css";
import { VocabView } from "../vocab/VocabView";
import { GrammarIntro } from "./GrammarIntro";
import styles from "./GrammarLesson.module.css";
import { LessonBanner } from "./LessonBanner";
import { LessonTabs } from "./LessonTabs";
import { LoginInvite } from "./LoginInvite";
import { TopicPager } from "./TopicPager";

export interface ScrollTarget {
  /** Code of the URL hash (unit code or question id). */
  code: string | null;
  /** Navigation key: the same code navigated to again scrolls again. */
  n: string;
  smooth: boolean;
}

/** Stage test without the viewer's status fields. */
export type StageTestContent = Omit<StageTestDto, "status">;

function Loading() {
  return (
    <div className={kit.loading} role="status">
      <Loader2 size={18} className={kit.spin} /> Đang mở bài…
    </div>
  );
}

/** Scroll container of the lesson column: the column itself on desktop, the whole page on mobile. */
function scrollerOf(main: HTMLElement | null): HTMLElement | Window {
  if (!main) return window;
  const oy = getComputedStyle(main).overflowY;
  return oy === "auto" || oy === "scroll" ? main : window;
}

function splitStageTest(data: StageTestDto): {
  test: StageTestContent;
  status: StageProgressDto;
} {
  const { status, ...test } = data;
  return { test, status };
}

/** Topic content or stage test of the current view (TanStack Query; the stage status feeds the progress store). */
function useLessonData(view: GrammarView | null, signedIn: boolean) {
  const topicNum = view?.kind === "topic" ? view.number : null;
  const stageNum = view?.kind === "stage" ? stageById(view.id)?.number || null : null;
  const lesson = useGrammarLesson(topicNum);
  const stage = useStageTest(stageNum, signedIn);
  const stageData = stage.data;

  useEffect(() => {
    if (stageNum && stageData) setStage(stageNum, splitStageTest(stageData).status);
  }, [stageNum, stageData]);

  if (topicNum) {
    return {
      lesson: lesson.data ?? null,
      stage: null,
      error: lesson.isError && !lesson.data,
    };
  }
  if (stageNum) {
    return {
      lesson: null,
      stage: stageData ? splitStageTest(stageData) : null,
      error: stage.isError && !stageData,
    };
  }
  return { lesson: null, stage: null, error: false };
}

interface GrammarLessonProps {
  view: GrammarView | null;
  scrollTarget: ScrollTarget;
  mainRef: RefObject<HTMLElement | null>;
  progress: GrammarProgressState;
  onSelectPart: (topicNum: number, part: LessonPart) => void;
  onSelectStage: (id: string) => void;
  onSpy: (code: string | null) => void;
  onGoTo: (code: string) => void;
  onBack: () => void;
  onOpenReview: () => void;
  onReview: (code: string, qid?: string) => void;
  onLogin: () => void;
  returnTo: ReturnTo | null;
  onReturn: () => void;
  focus: FocusControl;
  talk: TalkTarget | null;
  dark: boolean;
  onToggleDark: () => void;
}

export function GrammarLesson({
  view,
  scrollTarget,
  mainRef,
  onSelectPart,
  onSelectStage,
  onSpy,
  onGoTo,
  onBack,
  onOpenReview: onRevision,
  onReview,
  onLogin,
  progress,
  returnTo,
  onReturn,
  focus,
  talk,
  dark,
  onToggleDark,
}: GrammarLessonProps) {
  const { lesson: data, stage: stageData, error } = useLessonData(view, progress.auth === "user");
  const [docComments, setDocComments] = useState(false);
  // drawer opened from a link and closed by the learner during this navigation
  const [docClosedKey, setDocClosedKey] = useState<string | null>(null);
  const docFromTalk = talk?.kind === "document" && docClosedKey !== talk.key;
  const docOpen = docComments || docFromTalk;
  const closeDoc = () => {
    setDocComments(false);
    if (talk) setDocClosedKey(talk.key);
  };
  const spyLockUntil = useRef(0);
  const lastSpy = useRef<string | null>(null);
  const part = view?.kind === "topic" ? view.part : null;
  const ready = !!data || !!stageData || view?.kind === "review";
  const isGuest = progress.auth === "guest" ? true : progress.auth === "user" ? false : undefined;
  // Always call the latest onSpy (bound to the current navigation) even though the listener was attached earlier.
  const reportSpy = useEffectEvent((code: string | null) => onSpy(code));
  const viewTopic = view?.kind === "topic" ? view.number : null;
  const viewId = view?.kind === "stage" ? view.id : null;

  // Scroll to the hash code (roadmap, Nhắc lại, Xem lại, reload) or to the top when the part / topic changes.
  useEffect(() => {
    if (!ready) return undefined;
    const main = mainRef.current;
    const sc = scrollerOf(main);
    const code = scrollTarget.code;
    const el = code ? main?.querySelector<HTMLElement>(`[data-code="${CSS.escape(code)}"]`) : null;
    spyLockUntil.current = Date.now() + 900;
    lastSpy.current = code || null;
    const raf = requestAnimationFrame(() => {
      if (el) {
        el.scrollIntoView({
          behavior: scrollTarget.smooth ? "smooth" : "auto",
          block: el.hasAttribute("data-q") ? "center" : "start",
        });
      } else if (sc === window) window.scrollTo({ top: 0 });
      else (sc as HTMLElement).scrollTop = 0;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `smooth` belongs to the same navigation as `n`
  }, [ready, view?.kind, viewTopic, viewId, part, scrollTarget.code, scrollTarget.n, mainRef]);

  // Scroll-spy of Kiến thức: the last anchor above the top edge of the reading area is the unit being read.
  useEffect(() => {
    if (!ready || part !== "theory") return undefined;
    const main = mainRef.current;
    if (!main) return undefined;
    const sc = scrollerOf(main);
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (Date.now() < spyLockUntil.current) return;
      const top = sc === window ? 0 : main.getBoundingClientRect().top;
      const threshold = top + (sc === window ? 150 : 110);
      let code: string | null = null;
      main.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
        if (el.getBoundingClientRect().top <= threshold) code = el.dataset.code || null;
      });
      if (code !== lastSpy.current) {
        lastSpy.current = code;
        reportSpy(code);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sc.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready, part, viewTopic, mainRef]);

  if (!view) return <GrammarIntro onSelectPart={onSelectPart} onSelectStage={onSelectStage} />;

  const backTitle =
    view.kind === "topic"
      ? `Chuyên đề ${pad2(view.number)}`
      : view.kind === "review"
        ? "Ôn tập"
        : stageById(view.id)?.test.title;
  const backBar = (
    <div className={styles.mbar}>
      <button type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Lộ trình
      </button>
      <span className={styles.mbarEnd}>
        <span>{backTitle}</span>
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
      </span>
    </div>
  );

  if (view.kind === "review") {
    return (
      <>
        {backBar}
        <LessonBanner
          kicker="Ôn tập cá nhân"
          title="GRAMMAR"
          pill="ÔN TẬP"
          sub="Sổ lỗi & bẫy bạn hay mắc"
          small="Sửa đúng là câu rời sổ"
        />
        <div className={styles.doc}>
          <ReviewView isGuest={isGuest} onReview={onReview} onLogin={onLogin} />
        </div>
      </>
    );
  }

  if (view.kind === "stage") {
    const stage = stageById(view.id);
    if (!stage) return null;
    const testKind =
      stageData?.test.kind === "checkpoint" || /checkpoint/i.test(stage.test.title)
        ? "CHECKPOINT"
        : "TEST";
    const status = stageData
      ? { ...stageData.status, ...(progress.auth === "user" ? progress.stages[stage.number] : {}) }
      : null;
    return (
      <>
        {backBar}
        <LessonBanner
          kicker={`Chặng ${stage.number} · ${stage.title} · ${stage.score}`}
          title="GRAMMAR"
          pill={testKind}
          sub={stage.test.title}
          small={`Tổng ôn Chặng ${stage.number}`}
        />
        <LoginInvite isGuest={isGuest} />
        {error && <p className={kit.empty}>Chưa mở được bài test, thử tải lại trang nhé.</p>}
        {!stageData && !error && <Loading />}
        {stageData && status && (
          <div className={styles.doc}>
            <StageTestView
              key={stage.id}
              stage={stage}
              test={stageData.test}
              status={status}
              isGuest={isGuest}
              onReview={onReview}
              focus={focus}
            />
          </div>
        )}
      </>
    );
  }

  const stage = stageOfTopic(view.number);
  const topicItem = topicInfo(view.number);
  if (!stage || !topicItem) return null;
  const topicKey = pad2(view.number);
  const lesson = lessonOf(progress, view.number);
  const missingNotice = <p className={kit.empty}>Phần này của chuyên đề đang được biên soạn.</p>;

  let content = null;
  if (error) content = <p className={kit.empty}>Chưa mở được bài, thử tải lại trang nhé.</p>;
  else if (!data) content = <Loading />;
  else if (part === "theory") {
    content = data.knowledge ? (
      <KnowledgeView
        knowledge={data.knowledge}
        onGoTo={onGoTo}
        ending={{
          understood: !!lesson?.theoryDone,
          isGuest,
          onConfirm: () => confirmPart(view.number, "theory"),
          onOpenVocab: () => onSelectPart(view.number, "vocab"),
        }}
      />
    ) : (
      missingNotice
    );
  } else if (part === "vocab") {
    content = data.vocab ? (
      <VocabView
        key={view.number}
        vocab={data.vocab}
        number={view.number}
        isGuest={isGuest}
        ending={{
          learned: !!lesson?.vocabDone,
          isGuest,
          onConfirm: () => confirmPart(view.number, "vocab"),
          onOpenExercises: () => onSelectPart(view.number, "exercises"),
        }}
      />
    ) : (
      missingNotice
    );
  } else {
    content = data.exercises ? (
      <ExerciseView
        key={view.number}
        number={view.number}
        knowledge={data.knowledge}
        tests={data.exercises}
        onReview={onReview}
        focus={focus}
      />
    ) : (
      missingNotice
    );
  }

  return (
    <>
      {backBar}
      <LessonBanner
        kicker={`Chặng ${stage.number} · ${stage.title} · ${stage.score}`}
        title="GRAMMAR"
        pill={`LESSON ${topicKey}`}
        sub={topicItem.title}
        small={`Chuyên đề ${topicKey} / ${TOPIC_COUNT}`}
      />
      <LoginInvite isGuest={isGuest} />
      <LessonTabs
        number={view.number}
        part={view.part}
        onSelectPart={onSelectPart}
        onOpenReview={onRevision}
        comments={
          part === "theory"
            ? { open: docOpen, toggle: () => (docOpen ? closeDoc() : setDocComments(true)) }
            : null
        }
      />
      {returnTo && part === "theory" && (
        <button type="button" className={styles.returnPill} onClick={onReturn}>
          <CornerDownLeft size={15} /> Quay lại {returnTo.label}
        </button>
      )}
      <div className={styles.doc}>{content}</div>
      {part === "theory" && docOpen && (
        <LessonComments
          variant="drawer"
          target={`topic-${topicKey}:document`}
          title={`Bình luận tài liệu · CĐ${topicKey}`}
          isGuest={isGuest}
          onClose={closeDoc}
          focusId={docFromTalk ? talk.id : null}
        />
      )}
      {data && <TopicPager number={view.number} part={view.part} onSelectPart={onSelectPart} />}
    </>
  );
}
