/**
 * Dictation catalog (Studychill DictationHub): hero, the category tiles (TOEIC roadmap, topic packs, warm-up), an
 * accent-insensitive search across every pack, then the roadmap steps or the pack grid. Picking a pack opens its
 * map (`onSelectPack`). Only packs with imported content are shown: a category without any is hidden.
 */
import { useState } from "react";
import { BookOpen } from "lucide-react";

import type { DictationPackSummary } from "../../types/dictation.types";
import {
  DICTATION_PACKS,
  PACK_CATEGORIES,
  toeicLabel,
  type DictationPack,
} from "../../utils/dictation-packs";
import { HUB_CATEGORIES, normalizeSearch, type HubTab, type TopicFilter } from "./hub-constants";
import {
  CategoryTiles,
  HubHero,
  ListeningNote,
  PackGrid,
  ResultsToolbar,
  RoadmapSteps,
  TopicFilterTabs,
  WarmupNotice,
  type PackCounts,
} from "./HubSections";
import styles from "./DictationHub.module.css";

export interface DictationHubProps {
  /** Packs with content on the server; null while loading (the TOEIC roadmap packs are assumed). */
  availablePacks: DictationPackSummary[] | null;
  onSelectPack: (pack: DictationPack) => void;
}

const RESULTS_ID = "dictation-pack-results";

export function DictationHub({ availablePacks, onSelectPack }: DictationHubProps) {
  const [activeTab, setActiveTab] = useState<HubTab>("roadmap");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const summaries = new Map((availablePacks ?? []).map((summary) => [summary.pack, summary]));
  const isAvailable = (slug: string) =>
    availablePacks ? summaries.has(slug) : PACK_CATEGORIES.roadmap.slugs.includes(slug);
  const available = (slugs: string[]) =>
    slugs
      .filter(isAvailable)
      .map((slug) => DICTATION_PACKS[slug])
      .filter((pack): pack is DictationPack => Boolean(pack));
  const counts = (pack: DictationPack): PackCounts => {
    const summary = summaries.get(pack.slug);
    return {
      courseCount: summary?.courseCount ?? pack.courseCount,
      sentenceCount: summary?.itemCount ?? pack.sentenceCount,
    };
  };

  const dailyLife = available(PACK_CATEGORIES.dailyLife.slugs);
  const work = available(PACK_CATEGORIES.work.slugs);
  const byTab: Record<HubTab, DictationPack[]> = {
    roadmap: available(PACK_CATEGORIES.roadmap.slugs),
    topics:
      topicFilter === "dailyLife"
        ? dailyLife
        : topicFilter === "work"
          ? work
          : [...dailyLife, ...work],
    warmup: available(PACK_CATEGORIES.warmup.slugs),
  };
  const categories = HUB_CATEGORIES.filter((category) =>
    category.key === "topics" ? dailyLife.length + work.length > 0 : byTab[category.key].length > 0,
  );
  const tab = categories.some((category) => category.key === activeTab)
    ? activeTab
    : (categories[0]?.key ?? "roadmap");
  const activeMeta = HUB_CATEGORIES.find((category) => category.key === tab) ?? HUB_CATEGORIES[0];
  const query = normalizeSearch(searchQuery.trim());

  const allPacks = available(Object.keys(DICTATION_PACKS));
  const displayedPacks = query
    ? allPacks.filter((pack) =>
        normalizeSearch(`${pack.title} ${pack.description} ${toeicLabel(pack)}`).includes(query),
      )
    : byTab[tab];
  const isRoadmap = tab === "roadmap" && !query;
  const totalSentences = allPacks.reduce((sum, pack) => sum + counts(pack).sentenceCount, 0);

  const selectTab = (next: HubTab) => {
    setActiveTab(next);
    setSearchQuery("");
  };

  return (
    <div className={styles.page}>
      <main className={styles.inner}>
        <HubHero
          packCount={allPacks.length}
          sentenceCount={totalSentences}
          onStart={() => onSelectPack(DICTATION_PACKS[PACK_CATEGORIES.roadmap.slugs[0]])}
        />

        <section className={styles.library} aria-labelledby="dictation-library-title">
          <div className={styles.libraryIntro}>
            <h2 id="dictation-library-title" className={styles.libraryTitle}>
              <BookOpen size={21} /> Chọn chủ đề luyện nghe
            </h2>
            <span className={styles.libraryCount}>{allPacks.length} chủ đề</span>
          </div>

          <CategoryTiles
            categories={categories}
            activeTab={tab}
            resultsId={RESULTS_ID}
            onSelect={selectTab}
          />

          <ResultsToolbar
            title={query ? "Kết quả tìm kiếm" : activeMeta.title}
            summary={
              query
                ? `${displayedPacks.length} chủ đề phù hợp`
                : `${displayedPacks.length} ${activeMeta.label} · ${activeMeta.note}`
            }
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />

          {tab === "topics" && !query && (
            <TopicFilterTabs
              value={topicFilter}
              counts={{
                all: dailyLife.length + work.length,
                dailyLife: dailyLife.length,
                work: work.length,
              }}
              onChange={setTopicFilter}
            />
          )}

          {tab === "warmup" && !query && <WarmupNotice />}

          {isRoadmap ? (
            <RoadmapSteps
              key={tab}
              id={RESULTS_ID}
              packs={displayedPacks}
              counts={counts}
              onSelectPack={onSelectPack}
            />
          ) : (
            <PackGrid
              key={tab}
              id={RESULTS_ID}
              packs={displayedPacks}
              counts={counts}
              onSelectPack={onSelectPack}
              onClearSearch={() => setSearchQuery("")}
            />
          )}
          <ListeningNote />
        </section>
      </main>
    </div>
  );
}
