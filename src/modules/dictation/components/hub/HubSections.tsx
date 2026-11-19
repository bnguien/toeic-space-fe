/** Presentational parts of the dictation catalog (Studychill DictationHub.jsx), styled by DictationHub.module.css. */
import { useState } from "react";
import { ArrowRight, Check, Headphones, Search, Sparkles, X } from "lucide-react";

import { MASCOT } from "../../utils/mascot";
import { toeicLabel, type DictationPack } from "../../utils/dictation-packs";
import {
  ROADMAP_TONES,
  TOPIC_ICONS,
  WAVE_BARS,
  cssVars,
  formatNumber,
  splitRoadmapTitle,
  type HubCategory,
  type HubTab,
  type TopicFilter,
} from "./hub-constants";
import styles from "./DictationHub.module.css";

interface HubHeroProps {
  packCount: number;
  sentenceCount: number;
  onStart: () => void;
}

export function HubHero({ packCount, sentenceCount, onStart }: HubHeroProps) {
  return (
    <section className={styles.heroGrid} aria-labelledby="dictation-title">
      <div className={styles.heroMain}>
        <span className={styles.heroWatermark} aria-hidden="true">
          LISTEN
        </span>
        <span className={styles.heroWave} aria-hidden="true">
          {WAVE_BARS.map((height, index) => (
            <i key={index} style={cssVars({ "--bar-h": `${height}px`, "--bar-i": index })} />
          ))}
        </span>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadges}>
            <span className={styles.badgePrimary}>Nghe chép chính tả</span>
            <span className={styles.badgeSecondary}>Luyện nghe TOEIC</span>
          </div>
          <span className={styles.heroEyebrow}>
            <Headphones size={15} /> Luyện nghe cùng Oysteic
          </span>
          <h1 id="dictation-title" className={styles.heroTitle}>
            Nghe chép <span className={styles.titleHighlight}>chính tả</span>
          </h1>
          <p className={styles.heroText}>
            Nghe từng câu, gõ từng từ. Chọn chủ đề bạn thích và luyện tập mỗi ngày.
          </p>
          <div className={styles.heroBottom}>
            <button className={styles.startButton} type="button" onClick={onStart}>
              Bắt đầu luyện nghe <ArrowRight size={17} />
            </button>
            <span className={styles.heroStats}>
              <strong>{packCount}</strong> chủ đề · <strong>{formatNumber(sentenceCount)}</strong>{" "}
              câu
            </span>
          </div>
        </div>
      </div>

      <aside className={styles.heroSide}>
        <span className={styles.heroSideBadge}>Một chút động lực</span>
        <blockquote className={styles.heroSideQuote}>
          “Mỗi câu chép đúng hôm nay là thêm một âm quen tai cho ngày thi.”
        </blockquote>
        <div className={styles.heroSideBottom}>
          <p>Cùng nghe một chút nhé!</p>
          <img src={MASCOT.headphones} alt="" width="92" height="92" fetchPriority="high" />
        </div>
      </aside>
    </section>
  );
}

interface CategoryTilesProps {
  categories: HubCategory[];
  activeTab: HubTab;
  resultsId: string;
  onSelect: (tab: HubTab) => void;
}

/** Category tiles with a highlight that slides to the hovered / focused tile. */
export function CategoryTiles({ categories, activeTab, resultsId, onSelect }: CategoryTilesProps) {
  const [previewTab, setPreviewTab] = useState<HubTab | null>(null);
  const previewIndex = Math.max(
    0,
    categories.findIndex((category) => category.key === (previewTab ?? activeTab)),
  );
  return (
    <div
      className={styles.categoryGrid}
      role="group"
      aria-label="Danh mục luyện nghe"
      style={cssVars({ "--category-index": previewIndex, "--category-count": categories.length })}
      onMouseLeave={() => setPreviewTab(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreviewTab(null);
      }}
    >
      <span className={styles.categorySlider} aria-hidden="true" />
      {categories.map((category, index) => {
        const Icon = category.icon;
        const selected = activeTab === category.key;
        return (
          <button
            key={category.key}
            type="button"
            className={styles.category}
            data-preview={previewIndex === index || undefined}
            aria-pressed={selected}
            aria-controls={resultsId}
            onClick={() => onSelect(category.key)}
            onMouseEnter={() => setPreviewTab(category.key)}
            onFocus={() => setPreviewTab(category.key)}
          >
            <span className={styles.categoryIcon}>
              <Icon size={23} strokeWidth={1.8} />
            </span>
            <span className={styles.categoryCopy}>
              <span className={styles.categoryName}>{category.title}</span>
              <span className={styles.categoryNote}>{category.note}</span>
            </span>
            <span className={styles.categoryCheck} aria-hidden="true">
              {selected ? <Check size={15} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ResultsToolbarProps {
  title: string;
  summary: string;
  searchQuery: string;
  onSearch: (query: string) => void;
}

export function ResultsToolbar({ title, summary, searchQuery, onSearch }: ResultsToolbarProps) {
  return (
    <div className={styles.libraryToolbar}>
      <div>
        <h3 className={styles.resultsTitle}>{title}</h3>
        <p className={styles.resultsSummary} aria-live="polite">
          {summary}
        </p>
      </div>
      <div className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Tìm chủ đề trong tất cả danh mục"
          placeholder="Tìm chủ đề…"
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          type="search"
        />
        {searchQuery && (
          <button type="button" aria-label="Xóa tìm kiếm" onClick={() => onSearch("")}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

const TOPIC_FILTERS: {
  key: TopicFilter;
  label: (counts: Record<TopicFilter, number>) => string;
}[] = [
  { key: "all", label: (c) => `Tất cả chủ đề (${c.all})` },
  { key: "dailyLife", label: (c) => `Đời sống hàng ngày (${c.dailyLife})` },
  { key: "work", label: (c) => `Môi trường công sở (${c.work})` },
];

interface TopicFilterTabsProps {
  value: TopicFilter;
  counts: Record<TopicFilter, number>;
  onChange: (value: TopicFilter) => void;
}

export function TopicFilterTabs({ value, counts, onChange }: TopicFilterTabsProps) {
  return (
    <div className={styles.subfilterTabs} role="tablist" aria-label="Bộ lọc chủ đề">
      {TOPIC_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          role="tab"
          aria-selected={value === filter.key}
          className={styles.subfilterButton}
          onClick={() => onChange(filter.key)}
        >
          {filter.label(counts)}
        </button>
      ))}
    </div>
  );
}

/** Studychill's notice also linked its fill-in-the-blank mode, which TOEIC Space does not have. */
export function WarmupNotice() {
  return (
    <div className={styles.warmupNotice}>
      <div className={styles.warmupNoticeIcon}>
        <Sparkles size={24} />
      </div>
      <div>
        <h4 className={styles.warmupNoticeTitle}>Kho 25 bài ngắn nguyên bản từ hệ thống</h4>
        <p className={styles.warmupNoticeText}>
          25 đoạn thông báo & giao tiếp công sở 5 cấp độ từ hệ thống cũ. Bạn có thể luyện nghe gõ
          câu tại đây hoặc mở chế độ <strong>Nghe điền từ (Fill-in-the-blank)</strong>.
        </p>
      </div>
    </div>
  );
}

export interface PackCounts {
  courseCount: number;
  sentenceCount: number;
}

interface PackListProps {
  id: string;
  packs: DictationPack[];
  counts: (pack: DictationPack) => PackCounts;
  onSelectPack: (pack: DictationPack) => void;
}

export function RoadmapSteps({ id, packs, counts, onSelectPack }: PackListProps) {
  return (
    <ol id={id} className={styles.roadmap}>
      {packs.map((pack, index) => {
        const Icon = TOPIC_ICONS[pack.icon] ?? Headphones;
        const tone = ROADMAP_TONES[index % ROADMAP_TONES.length];
        const { score, subtitle } = splitRoadmapTitle(pack.title);
        const { courseCount, sentenceCount } = counts(pack);
        return (
          <li
            key={pack.slug}
            className={styles.stepItem}
            style={cssVars({
              "--step": index,
              "--lv": tone.main,
              "--lv-soft": tone.soft,
              "--pack-delay": `${index * 60}ms`,
            })}
          >
            <button
              type="button"
              className={styles.step}
              onClick={() => onSelectPack(pack)}
              aria-label={`${pack.title} — luyện ngay`}
            >
              <span className={styles.stepScore}>
                <small>TOEIC</small>
                <strong>{score || toeicLabel(pack).replace("TOEIC ", "")}</strong>
              </span>
              <span className={styles.stepIcon} aria-hidden="true">
                <Icon size={24} strokeWidth={1.7} />
              </span>
              <span className={styles.stepCopy}>
                <span className={styles.stepMeta}>Chặng {index + 1}</span>
                <span className={styles.stepTitle}>{subtitle}</span>
                <span className={styles.stepDescription}>{pack.description}</span>
              </span>
              <span className={styles.stepStats}>
                <span>
                  <strong>{formatNumber(courseCount)}</strong> bài
                </span>
                <span>
                  <strong>{formatNumber(sentenceCount)}</strong> câu
                </span>
              </span>
              <span className={styles.stepGo} aria-hidden="true">
                <ArrowRight size={18} />
              </span>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function PackGrid({
  id,
  packs,
  counts,
  onSelectPack,
  onClearSearch,
}: PackListProps & { onClearSearch: () => void }) {
  return (
    <div id={id} className={styles.packGrid}>
      {packs.map((pack, index) => {
        const Icon = TOPIC_ICONS[pack.icon] ?? Headphones;
        const { courseCount, sentenceCount } = counts(pack);
        return (
          <button
            type="button"
            key={pack.slug}
            className={styles.pack}
            onClick={() => onSelectPack(pack)}
            style={cssVars({ "--pack-delay": `${Math.min(index, 8) * 30}ms` })}
          >
            <span className={styles.packTop}>
              <span className={styles.packIcon} aria-hidden="true">
                <Icon size={29} strokeWidth={1.6} />
              </span>
              <span className={styles.level}>{toeicLabel(pack)}</span>
            </span>
            <span className={styles.packTitle}>{pack.title}</span>
            <span className={styles.packDescription}>{pack.description}</span>
            <span className={styles.packStats}>
              <span>
                <strong>{formatNumber(courseCount)}</strong> bài học
              </span>
              <span>{formatNumber(sentenceCount)} câu</span>
            </span>
            <span className={styles.packBottom}>
              <span>Luyện ngay</span>
              <span className={styles.packArrow}>
                <ArrowRight size={16} />
              </span>
            </span>
          </button>
        );
      })}
      {!packs.length && (
        <div className={styles.empty}>
          <Search size={28} />
          <h3>Chưa tìm thấy chủ đề</h3>
          <p>Thử “Du lịch”, “Mua sắm” hoặc một mốc điểm như “450” nhé.</p>
          <button type="button" onClick={onClearSearch}>
            Xem lại các chủ đề <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function ListeningNote() {
  return (
    <div className={styles.listeningNote}>
      <Headphones size={17} />
      <p>
        <strong>Oysteic nhắc nhỏ:</strong> Nghe trọn câu trước, rồi nghe lại và bắt đầu gõ nhé.
      </p>
    </div>
  );
}
