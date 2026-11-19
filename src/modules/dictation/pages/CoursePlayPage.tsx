/**
 * Plays one dictation course — a stage of the TOEIC roadmap or a course of a topic pack:
 *   /games/dictation/play?pack=<slug>&course=<id>&mode=basic|pro      (topic pack)
 *   /games/dictation/toeic?level=&stage=&ids=&course=&mode=            (TOEIC roadmap stage)
 *
 * The server keeps the answers: sentence frame + meaning + word proofs from /skeleton, grading + progress
 * through /check, hints through /hint, neural-voice audio from /audio. TOEIC roadmap: the next sentence
 * opens once the previous one qualifies (from level 3 it must be passed without help). Topic packs: every
 * sentence is open; the stage stars are kept per course code so the topic map shows finished stages.
 */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { buildServerTarget, buildSkeletonTarget } from "@/shared/utils/dictation-check";

import { dictationApi, exerciseAudioUrl } from "../api/dictation.api";
import { dictationQueryKeys } from "../api/dictation.query-keys";
import { DictationPlaySession } from "../components/play/DictationPlaySession";
import { PlayNotice } from "../components/play/PlayNotice";
import { VocabInterlude } from "../components/play/VocabInterlude";
import { useDictationLearnerSync } from "../hooks/useDictationLearnerSync";
import { useInvalidateDictationProgress } from "../hooks/useInvalidateDictationProgress";
import type { PlaySource } from "../types/play.types";
import { DICTATION_PACKS, LEVEL_PACK, ROADMAP_PACK_LEVEL } from "../utils/dictation-packs";
import { saveVoicePreference, type SoundChoice } from "../utils/dictation-settings";
import { planVocabChunks } from "../utils/vocab-chunks";
import { WordProofMatcher } from "../utils/word-proof";

const errorText = (error: unknown): string => {
  const response = (error as { response?: { data?: { detail?: string } } })?.response;
  return response?.data?.detail || (error as Error)?.message || "Không tải được màn chơi.";
};

export function CoursePlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const learner = useDictationLearnerSync();
  const invalidateProgress = useInvalidateDictationProgress();

  const pack = searchParams.get("pack") || "";
  const isTopic = Boolean(pack) && !(pack in ROADMAP_PACK_LEVEL);
  const levelParam = Math.min(5, Math.max(1, Number(searchParams.get("level")) || 1));
  const stageNumber = Number(searchParams.get("stage")) || null;
  const idsParam = searchParams.get("ids") || "";
  const course = searchParams.get("course") || "";
  const stageIds = useMemo(() => idsParam.split(",").map(Number).filter(Boolean), [idsParam]);
  const packInfo = isTopic ? DICTATION_PACKS[pack] : null;
  // Sound switches chosen in the topic map's mode dialog travel in the router state.
  const sound = (location.state as { sound?: SoundChoice } | null)?.sound;
  const mode = searchParams.get("mode") === "pro" ? "pro" : "basic";
  // Basic mode: learn the new words before every 2–3 sentences (skipped if they fail to load).
  const withVocab = Boolean(course) && mode !== "pro";

  const backToMap = useCallback(() => {
    void invalidateProgress();
    navigate(`/games/dictation?pack=${isTopic ? pack : LEVEL_PACK[levelParam]}`);
  }, [navigate, invalidateProgress, isTopic, pack, levelParam]);

  useEffect(() => {
    document.title =
      isTopic && packInfo
        ? `${packInfo.title} – Nghe & viết câu | TOEIC Space`
        : "Lộ trình TOEIC – Nghe & viết câu | TOEIC Space";
  }, [isTopic, packInfo]);

  const query = useQuery({
    queryKey: [...dictationQueryKeys.exercises(levelParam, course), "play", withVocab, idsParam],
    queryFn: async ({ signal }) => {
      const [config, exercises, vocab] = await Promise.all([
        dictationApi.getConfig(signal).catch(() => null),
        dictationApi.getExercises(levelParam, course, signal),
        withVocab
          ? dictationApi.getCourseVocab(course, signal).catch(() => null)
          : Promise.resolve(null),
      ]);
      const all = exercises.exercises || [];
      const byId = new Map(all.map((e) => [e.id, e]));
      const list = stageIds.length
        ? stageIds.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e))
        : all;
      // Empty rounds keep their boundary in the plan but are not inserted.
      const chunks = vocab?.words?.length
        ? planVocabChunks(vocab.words, list.length).filter((chunk) => chunk.words.length)
        : [];
      return {
        config,
        list,
        chunks,
        course: exercises.course,
        level: exercises.level || levelParam,
        authenticated: Boolean(exercises.authenticated),
        levelName: exercises.levelName,
        band: exercises.levelBand,
      };
    },
    // One snapshot per visit: progress changes are applied by the session itself.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const data = query.data;
  const config = data?.config;
  const voices = useMemo(() => config?.voices ?? [], [config]);
  const [voiceOverride, setVoiceOverride] = useState<string | null>(null);
  const voice = voiceOverride ?? learner.voice;
  const activeVoice = voices.some((v) => v.key === voice) ? voice : config?.defaultVoice || "";
  const changeVoice = useCallback((key: string) => {
    setVoiceOverride(key);
    saveVoicePreference(key);
  }, []);

  const source = useMemo<PlaySource | null>(() => {
    if (!data?.list.length) return null;
    const { list, authenticated, level } = data;
    const rules = data.config?.rules;
    const cleanLevel = rules?.cleanPassLevel || 3;
    const gatedLevel = rules?.supportGatedLevel || 3;
    const passes = (e: (typeof list)[number]) => (level < cleanLevel ? e.passed : e.passedClean);
    const loginNext = `${location.pathname}?${searchParams.toString()}`;
    return {
      // Topic packs: the key is the course code so the stars land on the right stage of the topic map.
      key:
        isTopic && data.course
          ? data.course.code
          : `toeic-L${level}-S${stageNumber || 0}${course ? `-C${course}` : ""}`,
      title: isTopic
        ? data.course?.title || "Dictation"
        : `Lộ trình TOEIC · Level ${level}${stageNumber ? ` · Màn ${stageNumber}` : ""}`,
      subtitle: isTopic
        ? packInfo?.title || ""
        : data.levelName
          ? `${data.levelName} (${data.band})`
          : "",
      server: true,
      mustPass: !isTopic,
      persist: false,
      guestNote: authenticated ? "" : "Bạn đang chơi thử — đăng nhập để lưu tiến độ.",
      onLogin: authenticated
        ? null
        : () => navigate(`/login?next=${encodeURIComponent(loginNext)}`),
      entries: list.map((e, i) => ({ key: String(e.id), number: i + 1 })),
      unlocked: isTopic
        ? list.map(() => true)
        : list.map((e, i) => Boolean(e.unlocked) || i === 0 || passes(list[i - 1])),
      initialDone: list.map(passes),
      voices,
      voice: activeVoice,
      onVoice: changeVoice,
      peek: () => null,
      async prepare(i) {
        const e = list[i];
        // Tell the server the next 4 sentences + the voice in use → it renders their audio in the background.
        const skeleton = await dictationApi.getSkeleton(e.id, {
          voice: activeVoice,
          next: list.slice(i + 1, i + 5).map((x) => x.id),
        });
        return {
          key: String(e.id),
          number: i + 1,
          id: e.id,
          target: buildSkeletonTarget(
            skeleton.words.map((w) => ({ before: w.before, len: w.length, after: w.after })),
          ),
          known: null,
          display: "",
          translation: skeleton.translation || "",
          keywords: Array.isArray(skeleton.keywords) ? skeleton.keywords : [],
          // Whole-sentence IPA + grammar notes, shown in the answer panel after the sentence.
          ipa: skeleton.ipa || "",
          notes: Array.isArray(skeleton.notes) ? skeleton.notes : [],
          gated: !isTopic && level >= gatedLevel,
          // Hashed answer words (no letters) to light words up while typing, before the first submission.
          matcher: skeleton.proof ? new WordProofMatcher(skeleton.proof) : null,
        };
      },
      audio: (item, kind, settings) =>
        kind === "normal" || kind === "slow"
          ? // The text only exists once the server returned the answer → used for the browser-voice fallback.
            {
              url: exerciseAudioUrl(item.id, activeVoice),
              rate: settings.rate,
              text: item.display || "",
              lang: "en-US",
            }
          : null,
      async grade(item, words, { hints, assisted }) {
        const result = await dictationApi.check({
          itemId: item.id,
          userText: words.filter(Boolean).join(" "),
          voice: activeVoice,
          hintCount: hints,
          assisted,
        });
        // Guests: the server saves nothing, so the same unlock rule is applied here.
        const unlocks = result.saved
          ? Boolean(result.unlocksNext)
          : Boolean(result.isCorrect) && (level < cleanLevel || !assisted);
        return {
          known: result.correctText ? buildServerTarget(result.correctText) : null,
          display: result.correctText || "",
          translation: result.translation || "",
          unlocks,
        };
      },
      hint: async (item, words, hintMode) => {
        const result = await dictationApi.hint({
          itemId: item.id,
          userText: words.filter(Boolean).join(" "),
          mode: hintMode,
        });
        return { index: result.index, word: result.word, letter: result.letter };
      },
      interludeAt(i) {
        const chunk = data.chunks.find((c) => c.start === i);
        if (!chunk) return null;
        return {
          key: `v${chunk.start}`,
          render: (done) => (
            <VocabInterlude
              words={chunk.words}
              sentences={chunk.end - chunk.start + 1}
              onDone={done}
            />
          ),
        };
      },
      checkWord: (item, i, word) => item.matcher?.ensure(i, word) ?? Promise.resolve(null),
    };
  }, [
    data,
    isTopic,
    packInfo,
    stageNumber,
    course,
    voices,
    activeVoice,
    changeVoice,
    navigate,
    location.pathname,
    searchParams,
  ]);

  if (query.isError) {
    return (
      <PlayNotice
        message={errorText(query.error)}
        onRetry={() => void query.refetch()}
        onBack={backToMap}
      />
    );
  }
  if (!data) return <PlayNotice loading message="Đang mở màn chơi…" />;
  if (!source) return <PlayNotice message="Màn này chưa có câu nào." onBack={backToMap} />;
  return (
    <DictationPlaySession
      key={source.key}
      source={source}
      mode={mode}
      sound={sound}
      onExit={backToMap}
    />
  );
}
