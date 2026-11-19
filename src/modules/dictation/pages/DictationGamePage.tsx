/**
 * Dictation page (/games/dictation), two steps on one page (Studychill DictationGamePage):
 *   - Catalog: the packs that have content (TOEIC roadmap 0-990; topic and warm-up packs once imported)
 *   - Map (`?pack=`): a TOEIC roadmap pack → the Phaser roadmap; a topic pack → the course map + mode dialog
 * Playing a course opens the play page (/games/dictation/play or /games/dictation/toeic).
 * Maps are fixed full-screen layers above the site navbar, like Studychill's map pages.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DictationHub } from "../components/hub/DictationHub";
import {
  DictationMapView,
  DictationModeModal,
  DictationWorld,
  ToeicRoadmap,
  activeCourseIndex,
  type DictationMapCourse,
  type DictationStartOptions,
  type RoadmapLevel,
  type RoadmapStage,
} from "../components/maps";
import { PlayNotice } from "../components/play/PlayNotice";
import { useDictationConfig } from "../hooks/useDictationConfig";
import { useDictationLearnerSync } from "../hooks/useDictationLearnerSync";
import { useDictationRoadmap } from "../hooks/useDictationRoadmap";
import { usePackCourses } from "../hooks/usePackCourses";
import type { DictationRoadmapDto } from "../types/dictation.types";
import {
  DICTATION_PACKS,
  ROADMAP_PACK_LEVEL,
  toeicLabel,
  type DictationPack,
} from "../utils/dictation-packs";
import styles from "./DictationGamePage.module.css";

const toRoadmapLevels = (data: DictationRoadmapDto): RoadmapLevel[] =>
  data.levels.map((level) => ({
    level: level.level,
    band: level.band,
    stagesDone: level.stagesCompleted,
    passed: level.passedCount,
    items: level.itemCount,
    stages: level.stages.map((stage): RoadmapStage => ({
      no: stage.number,
      subLevel: stage.subLevel || null,
      title: stage.title,
      count: stage.itemCount,
      passed: stage.passedCount,
      words: stage.wordsPerSentence,
      stars: stage.stars,
      state: stage.state === "Done" ? "done" : stage.state === "Current" ? "current" : "locked",
      topics: stage.topics,
      itemIds: stage.itemIds,
      courseId: stage.courseId,
      vocab: stage.vocabCount > 0,
    })),
  }));

export function DictationGamePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const learner = useDictationLearnerSync();
  const config = useDictationConfig();

  // The pack comes from the query (bookmark / shared link).
  const packSlug = searchParams.get("pack");
  const currentPack = (packSlug && DICTATION_PACKS[packSlug]) || null;
  const roadmapLevel = currentPack ? ROADMAP_PACK_LEVEL[currentPack.slug] : undefined;
  const topicPack = currentPack && !roadmapLevel ? currentPack : null;

  useEffect(() => {
    document.title = "Dictation – Nghe chép chính tả tiếng Anh | TOEIC Space";
  }, []);

  const selectPack = useCallback(
    (pack: DictationPack | null) => {
      setSearchParams(pack ? { pack: pack.slug } : {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams],
  );
  const backToHub = useCallback(() => selectPack(null), [selectPack]);

  return (
    <div className={styles.page}>
      {!currentPack && (
        <DictationHub availablePacks={config.data?.packs ?? null} onSelectPack={selectPack} />
      )}
      {roadmapLevel && (
        <RoadmapScreen focusLevel={roadmapLevel} onExit={backToHub} navigate={navigate} />
      )}
      {topicPack && (
        <TopicMapScreen
          pack={topicPack}
          stars={learner.stars}
          onExit={backToHub}
          navigate={navigate}
        />
      )}
    </div>
  );
}

interface ScreenProps {
  onExit: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

/** TOEIC roadmap: Phaser map of one level; the stage dialog offers Cơ bản / Nâng cao. */
function RoadmapScreen({ focusLevel, onExit, navigate }: ScreenProps & { focusLevel: number }) {
  const roadmap = useDictationRoadmap();
  const levels = useMemo(() => (roadmap.data ? toRoadmapLevels(roadmap.data) : []), [roadmap.data]);

  // basic = words learned in between (a few before every 2–3 sentences); pro = straight to writing, less help.
  const play = (level: number, stage: RoadmapStage, mode?: "basic" | "pro") => {
    const query = new URLSearchParams({
      level: String(level),
      stage: String(stage.no),
      ids: stage.itemIds.join(","),
    });
    if (stage.courseId) query.set("course", String(stage.courseId));
    if (mode === "pro") query.set("mode", "pro");
    navigate(`/games/dictation/toeic?${query.toString()}`);
  };

  return (
    <ToeicRoadmap
      levels={levels}
      loading={roadmap.isPending}
      error={roadmap.isError ? "Chưa tải được lộ trình. Kiểm tra mạng rồi thử lại." : undefined}
      onRetry={() => void roadmap.refetch()}
      authenticated={roadmap.data?.authenticated ?? true}
      focusLevel={focusLevel}
      onExit={onExit}
      onPlay={play}
    />
  );
}

/** Topic pack: scrolling course map; stars are the learner's own (server copy when signed in). */
function TopicMapScreen({
  pack,
  stars,
  onExit,
  navigate,
}: ScreenProps & { pack: DictationPack; stars: Record<string, number> }) {
  const query = usePackCourses(pack.slug);
  const [selected, setSelected] = useState<DictationMapCourse | null>(null);

  const courses = useMemo<DictationMapCourse[]>(
    () =>
      (query.data?.courses ?? []).map((course) => ({
        id: course.code,
        courseId: course.id,
        title: course.title,
        statementCount: course.itemCount,
        order: course.order,
      })),
    [query.data],
  );
  // A course whose every sentence is passed on the server counts as done even before stars synced.
  const progress = useMemo(() => {
    const merged: Record<string, number> = { ...stars };
    for (const course of query.data?.courses ?? []) {
      if (!merged[course.code] && course.itemCount > 0 && course.passedCount >= course.itemCount)
        merged[course.code] = 1;
    }
    return merged;
  }, [stars, query.data]);

  if (query.isPending) return <PlayNotice loading message="Đang mở bản đồ chủ đề…" />;
  if (query.isError) {
    return (
      <PlayNotice
        message={(query.error as Error)?.message || "Không tải được danh sách bài."}
        onRetry={() => void query.refetch()}
        onBack={onExit}
      />
    );
  }
  if (!courses.length)
    return <PlayNotice message="Chủ đề này đang được cập nhật bài học." onBack={onExit} />;

  const start = (course: DictationMapCourse, options: DictationStartOptions) => {
    setSelected(null);
    const params = new URLSearchParams({
      pack: pack.slug,
      course: String(course.courseId),
      mode: options.mode,
    });
    navigate(`/games/dictation/play?${params.toString()}`, {
      state: {
        sound: {
          backgroundMusic: options.bgmEnabled,
          typingSound: options.typingSoundEnabled,
          feedbackSound: options.feedbackSoundEnabled,
        },
      },
    });
  };

  return (
    <DictationMapView>
      <DictationWorld
        pack={pack}
        courses={courses}
        progress={progress}
        activeIndex={activeCourseIndex(courses, progress)}
        onOpen={setSelected}
        onExit={onExit}
      />
      {selected && (
        <DictationModeModal
          course={selected}
          levelLabel={toeicLabel(pack) || "TOEIC 450+"}
          onClose={() => setSelected(null)}
          onStart={start}
        />
      )}
    </DictationMapView>
  );
}
