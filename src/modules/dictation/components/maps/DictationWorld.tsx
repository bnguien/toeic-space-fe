/**
 * Game-style level map of a dictation topic (think Candy Crush): one cobbled road winds down the
 * screen through several regions; every 10 courses the region changes and a milestone gate with a
 * chest appears; the trophy castle waits at the end. Scenery (trees, bushes, rocks, flowers, ponds)
 * is drawn with CSS and scattered with a seeded random so the map looks the same every time. No
 * crowded labels: a course title shows on hover, the current course gets a floating card with Play.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import mascotHello from "@/assets/mascot/oy2-hello.png";
import mascotBase from "@/assets/mascot/oy2-base.png";

import { DICTATION_MODAL_ATTRIBUTE, TOPIC_MILESTONE } from "./maps.constants";
import type { DictationMapCourse, DictationPack, DictationStarsMap } from "./maps.types";
import { stripCoursePrefix } from "./maps.utils";
import styles from "./DictationWorld.module.css";

type BiomeKey = "meadow" | "forest" | "beach" | "sunset" | "snow" | "blossom" | "crystal" | "night";
type Biome = [BiomeKey, string];

const BIOMES: Biome[] = [
  ["meadow", "Đồng cỏ"],
  ["forest", "Rừng xanh"],
  ["beach", "Bãi cát"],
  ["sunset", "Hoàng hôn"],
  ["snow", "Đồi tuyết"],
  ["blossom", "Vườn hoa"],
  ["crystal", "Thung lũng tím"],
  ["night", "Rừng đêm"],
];
const START_BIOME: Record<string, number> = {
  "toeic-250": 0,
  "toeic-450": 2,
  "toeic-650": 1,
  "toeic-800": 3,
  "toeic-990": 7,
};
// Small scenery beside the road and big scenery at both edges; ponds are rare (one slot in a long list).
const DECOR_BY_BIOME: Record<BiomeKey, string[]> = {
  meadow: ["tree", "tree", "bush", "flower", "rock", "flower", "tree", "bush"],
  forest: ["pine", "pine", "tree", "bush", "pine", "rock", "mushroom", "pine"],
  beach: ["palm", "palm", "rock", "shell", "bush", "shell", "palm", "rock"],
  sunset: ["cactus", "rock", "bush", "cactus", "rock", "cactus", "bush", "tree"],
  snow: ["pine", "pine", "snowman", "rock", "pine", "pine", "rock", "pine"],
  blossom: ["tree", "flower", "flower", "bush", "tree", "flower", "tree", "bush"],
  crystal: ["crystal", "crystal", "rock", "bush", "tree", "crystal", "rock", "bush"],
  night: ["pine", "mushroom", "pine", "rock", "mushroom", "pine", "pine", "bush"],
};
const EDGE_BY_BIOME: Record<BiomeKey, string[]> = {
  meadow: ["tree", "tree", "hill", "bush", "tree"],
  forest: ["pine", "pine", "hill", "pine", "tree"],
  beach: ["palm", "hill", "palm", "rock", "palm"],
  sunset: ["cactus", "hill", "rock", "cactus", "hill"],
  snow: ["pine", "hill", "pine", "pine", "snowman"],
  blossom: ["tree", "tree", "hill", "flower", "tree"],
  crystal: ["crystal", "hill", "crystal", "tree", "rock"],
  night: ["pine", "hill", "pine", "mushroom", "pine"],
};

const BIOME_CLASS: Record<BiomeKey, string> = {
  meadow: styles.biomeMeadow,
  forest: styles.biomeForest,
  beach: styles.biomeBeach,
  sunset: styles.biomeSunset,
  snow: styles.biomeSnow,
  blossom: styles.biomeBlossom,
  crystal: styles.biomeCrystal,
  night: styles.biomeNight,
};
const DECOR_CLASS: Record<string, string> = {
  tree: styles.decorTree,
  pine: styles.decorPine,
  bush: styles.decorBush,
  rock: styles.decorRock,
  flower: styles.decorFlower,
  pond: styles.decorPond,
  palm: styles.decorPalm,
  cactus: styles.decorCactus,
  snowman: styles.decorSnowman,
  crystal: styles.decorCrystal,
  mushroom: styles.decorMushroom,
  shell: styles.decorShell,
  hill: styles.decorHill,
};

const narrowQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(max-width: 699px)")
    : null;
function useNarrowViewport() {
  return useSyncExternalStore(
    (onChange) => {
      narrowQuery?.addEventListener("change", onChange);
      return () => narrowQuery?.removeEventListener("change", onChange);
    },
    () => Boolean(narrowQuery?.matches),
    () => false,
  );
}

/** Seeded pseudo-random: the scenery stays put between visits. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Point {
  x: number;
  y: number;
}

/** Smooth curve through every point (Catmull-Rom → cubic Bézier). */
function smoothPath(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${
      p2.y - (p3.y - p1.y) / 6
    }, ${p2.x} ${p2.y}`;
  }
  return d;
}

type MapItem =
  | { type: "stop"; course: DictationMapCourse; no: number; band: number }
  | { type: "gate"; to: number; band: number }
  | { type: "castle"; band: number };

interface Decor {
  id: string;
  kind: string;
  x: number;
  y: number;
  s: number;
  biome: BiomeKey;
  /** Positioned relative to the road lane (true) or the full width (false). */
  lane: boolean;
}

export interface DictationWorldProps {
  pack: DictationPack;
  courses: DictationMapCourse[];
  /** Stars per course id; a course with stars is passed. */
  progress: DictationStarsMap;
  /** 1-based order of the course being played (see `activeCourseIndex`). */
  activeIndex: number;
  /** A node was clicked (passed, active or locked — every node is playable). */
  onOpen: (course: DictationMapCourse) => void;
  /** "‹ Về danh mục". */
  onExit: () => void;
}

export function DictationWorld({
  pack,
  courses,
  progress,
  activeIndex,
  onOpen,
  onExit,
}: DictationWorldProps) {
  const narrow = useNarrowViewport();
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [overviewOpen, setOverviewOpen] = useState(false);
  const biomeStart = START_BIOME[pack.slug] ?? 0;

  // Sequence of points: the courses, a milestone gate after every 10, the castle at the end.
  const items = useMemo<MapItem[]>(() => {
    const list: MapItem[] = [];
    courses.forEach((course, i) => {
      list.push({ type: "stop", course, no: i + 1, band: Math.floor(i / TOPIC_MILESTONE) });
      if ((i + 1) % TOPIC_MILESTONE === 0 && i + 1 < courses.length) {
        list.push({ type: "gate", to: i + 1, band: Math.floor(i / TOPIC_MILESTONE) });
      }
    });
    list.push({ type: "castle", band: Math.floor((courses.length - 1) / TOPIC_MILESTONE) });
    return list;
  }, [courses]);

  /**
   * Geometry (units: x = % of the LANE width, y = px). The road bends with two superimposed sine
   * waves so it never repeats evenly; gates and the castle are pulled to the centre for balance.
   */
  const step = narrow ? 104 : 118;
  const top = narrow ? 300 : 330;
  const geometry = useMemo(() => {
    const amp = narrow ? 30 : 33;
    const pts = items.map((it, k) => {
      const centered = it.type !== "stop";
      const x = centered ? 50 : 50 + amp * Math.sin(k * 0.62) + 7 * Math.sin(k * 1.9 + 1);
      return { x: Math.max(12, Math.min(88, x)), y: top + k * step };
    });
    const H = pts[pts.length - 1].y + 260;

    // Regions: one band per 10 courses, the border halfway between the gate and the next course.
    const bandCount = items[items.length - 1].band + 1;
    const bands = Array.from({ length: bandCount }, (_, b) => {
      const firstK = items.findIndex((it) => it.band === b);
      const y0 = b === 0 ? top - 120 : pts[firstK].y - step / 2;
      const nextK = items.findIndex((it) => it.band === b + 1);
      const y1 = nextK === -1 ? H : pts[nextK].y - step / 2;
      return { b, y0, y1, biome: BIOMES[(biomeStart + b) % BIOMES.length] };
    });

    // Scenery: scattered on both sides of the road (avoiding the lane), edge trees grow in clumps
    // for depth, the occasional pond.
    const rand = rng(courses.length * 97 + biomeStart * 13 + 5);
    const decor: Decor[] = [];
    const pick = (list: string[]) => list[Math.floor(rand() * list.length)];
    pts.forEach((p, k) => {
      const band = bands[items[k].band];
      const biome = band.biome[0];
      const count = narrow ? 2 : 3;
      for (let n = 0; n < count; n += 1) {
        const side = rand() < 0.75 ? (p.x < 50 ? 1 : -1) : p.x < 50 ? -1 : 1;
        const x = side > 0 ? 58 + rand() * 38 : 4 + rand() * 38;
        if (Math.abs(x - p.x) < (narrow ? 20 : 16)) continue;
        decor.push({
          id: `d${k}-${n}`,
          kind: pick(DECOR_BY_BIOME[biome]),
          x,
          y: p.y - step * 0.5 + rand() * step,
          s: 0.8 + rand() * 0.5,
          biome,
          lane: true,
        });
      }
      if (rand() < 0.08) {
        const x = p.x < 50 ? 70 + rand() * 18 : 12 + rand() * 18;
        decor.push({
          id: `p${k}`,
          kind: "pond",
          x,
          y: p.y + rand() * 30,
          s: 0.8 + rand() * 0.4,
          biome,
          lane: true,
        });
      }
      if (!narrow) {
        (["L", "R"] as const).forEach((edge) => {
          const n = 1 + Math.floor(rand() * 3);
          const kind = pick(EDGE_BY_BIOME[biome]);
          const baseX = edge === "L" ? 3 + rand() * 12 : 85 + rand() * 12;
          const baseY = p.y - step / 2 + rand() * step;
          for (let c = 0; c < (kind === "hill" ? 1 : n); c += 1) {
            decor.push({
              id: `e${k}${edge}${c}`,
              kind,
              x: baseX + (rand() - 0.5) * 5,
              y: baseY + c * 26,
              s: (kind === "hill" ? 1.6 : 1.1) + rand() * 0.6,
              biome,
              lane: false,
            });
          }
        });
      }
    });
    // Paint top to bottom so lower objects overlap upper ones (sense of depth).
    decor.sort((a, b2) => a.y - b2.y);
    return { pts, H, bands, decor };
  }, [items, narrow, step, top, biomeStart, courses.length]);

  const { pts, H, bands, decor } = geometry;
  const activeK = items.findIndex((it) => it.type === "stop" && it.no === activeIndex);
  const lastPassedK = items.reduce(
    (k, it, i) => (it.type === "stop" && progress[it.course.id] ? i : k),
    -1,
  );
  const trailEnd = Math.max(activeK, lastPassedK) + 1;
  const totalStars = courses.reduce((n, c) => n + (progress[c.id] || 0), 0);
  const passedCount = courses.filter((c) => progress[c.id]).length;
  const allDone = passedCount === courses.length;
  const activeCourse = courses[activeIndex - 1];

  const milestones = useMemo(() => {
    const out: {
      from: number;
      to: number;
      biome: Biome;
      stars: number;
      passed: number;
      size: number;
    }[] = [];
    for (let i = 0; i < courses.length; i += TOPIC_MILESTONE) {
      const part = courses.slice(i, i + TOPIC_MILESTONE);
      out.push({
        from: i + 1,
        to: i + part.length,
        biome: BIOMES[(biomeStart + i / TOPIC_MILESTONE) % BIOMES.length],
        stars: part.reduce((n, c) => n + (progress[c.id] || 0), 0),
        passed: part.filter((c) => progress[c.id]).length,
        size: part.length,
      });
    }
    return out;
  }, [courses, progress, biomeStart]);

  const scrollToNo = (no: number) =>
    nodeRefs.current[no]?.scrollIntoView({ behavior: "smooth", block: "center" });

  useEffect(() => {
    const id = setTimeout(
      () => nodeRefs.current[activeIndex]?.scrollIntoView({ block: "center" }),
      150,
    );
    return () => clearTimeout(id);
  }, [activeIndex, narrow]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector(`[${DICTATION_MODAL_ATTRIBUTE}]`)) return;
      if (e.key === "Escape") setOverviewOpen(false);
      else if (e.key.toLowerCase() === "m") setOverviewOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lanePos = (x: number) => `calc(var(--lane-left) + ${x / 100} * var(--lane-w))`;
  const roadPath = smoothPath(pts);

  return (
    <div className={`${styles.root} ${narrow ? styles.narrow : ""}`}>
      <header className={styles.topBar}>
        <button type="button" className={styles.exitButton} onClick={onExit}>
          ‹ Về danh mục
        </button>
        <span className={styles.packTitle}>{pack.title}</span>
        <span className={styles.totalStars}>
          ★ {totalStars}/{courses.length * 3}
        </span>
      </header>

      <div className={styles.scroll}>
        <div className={styles.world} style={{ height: H }}>
          {/* Sky at the top of the map */}
          <div className={styles.sky} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.intro}>
            <span className={styles.flag}>
              {courses.length} MÀN · {passedCount} ĐÃ QUA
            </span>
            <h2>{pack.title}</h2>
            <p>{pack.description}</p>
          </div>

          {/* Regions one after another */}
          {bands.map((band) => (
            <div
              key={band.b}
              className={`${styles.band} ${BIOME_CLASS[band.biome[0]]} ${band.b === 0 ? styles.bandFirst : ""}`}
              style={{ top: band.y0, height: band.y1 - band.y0 + 40 }}
              aria-hidden="true"
            />
          ))}

          {/* Scenery */}
          {decor.map((d) => (
            <i
              key={d.id}
              className={`${styles.decor} ${DECOR_CLASS[d.kind] ?? ""} ${BIOME_CLASS[d.biome]}`}
              style={
                {
                  left: d.lane ? lanePos(d.x) : `${d.x}%`,
                  top: d.y,
                  "--s": d.s,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ))}

          {/* Road lane + stops */}
          <div className={styles.lane}>
            <svg
              className={styles.road}
              viewBox={`0 0 100 ${H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={roadPath} className={styles.roadEdge} vectorEffect="non-scaling-stroke" />
              <path d={roadPath} className={styles.roadFill} vectorEffect="non-scaling-stroke" />
              <path d={roadPath} className={styles.roadDots} vectorEffect="non-scaling-stroke" />
              {trailEnd > 1 && (
                <path
                  d={smoothPath(pts.slice(0, trailEnd))}
                  className={styles.roadTrail}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {items.map((it, k) => {
              const style = { left: `${pts[k].x}%`, top: pts[k].y };
              if (it.type === "gate") {
                const part = courses.slice(it.to - TOPIC_MILESTONE, it.to);
                const passedHere = part.filter((c) => progress[c.id]).length;
                const done = passedHere === part.length;
                return (
                  <div
                    key={`gate-${it.to}`}
                    className={`${styles.gate} ${done ? styles.gateOpen : ""}`}
                    style={style}
                  >
                    <span className={styles.gateSign}>Mốc {it.to / TOPIC_MILESTONE}</span>
                    <span className={styles.gateChest}>
                      {done ? "★" : `${passedHere}/${part.length}`}
                    </span>
                  </div>
                );
              }
              if (it.type === "castle") {
                return (
                  <div
                    key="castle"
                    className={`${styles.castle} ${allDone ? styles.castleOpen : ""}`}
                    style={style}
                  >
                    <span className={styles.castleBody}>
                      <b>CÚP</b>
                    </span>
                    <span className={styles.castleSign}>
                      {allDone ? "Đã chinh phục!" : "Đích chặng"}
                    </span>
                  </div>
                );
              }
              const { course, no } = it;
              const got = progress[course.id] || 0;
              const state = got ? "passed" : no === activeIndex ? "active" : "locked";
              const stateClass =
                state === "passed"
                  ? styles.nodePassed
                  : state === "active"
                    ? styles.nodeActive
                    : styles.nodeLocked;
              const sideClass = pts[k].x > 50 ? styles.sideLeft : styles.sideRight;
              return (
                <div
                  key={course.id}
                  className={`${styles.node} ${stateClass} ${sideClass}`}
                  style={style}
                  ref={(el) => {
                    nodeRefs.current[no] = el;
                  }}
                >
                  {state === "passed" && (
                    <span className={styles.stars} aria-label={`${got} sao`}>
                      {[1, 2, 3].map((s) => (
                        <i key={s} className={s <= got ? styles.starOn : ""}>
                          ★
                        </i>
                      ))}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.nodeButton}
                    onClick={() => onOpen(course)}
                    data-title={course.title}
                    aria-label={`Màn ${no}: ${course.title}`}
                  >
                    <span>{no}</span>
                  </button>
                  {state === "active" && (
                    <>
                      <img
                        className={styles.mascot}
                        src={mascotHello}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = mascotBase;
                        }}
                      />
                      <div className={styles.card}>
                        <small>Màn {no} · đang chơi</small>
                        <strong>{stripCoursePrefix(course.title)}</strong>
                        <button type="button" onClick={() => onOpen(course)}>
                          Chơi
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.dock}>
        {activeCourse && (
          <button
            type="button"
            className={styles.dockButton}
            onClick={() => scrollToNo(activeIndex)}
          >
            Màn đang chơi <b>{activeIndex}</b>
          </button>
        )}
        <button
          type="button"
          className={`${styles.dockButton} ${styles.dockButtonDark}`}
          onClick={() => setOverviewOpen(true)}
        >
          Bản đồ
        </button>
      </div>

      {overviewOpen && (
        <div
          className={styles.overview}
          role="dialog"
          aria-modal="true"
          aria-label="Bản đồ các vùng"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOverviewOpen(false);
          }}
        >
          <div className={styles.overviewPanel}>
            <header className={styles.overviewHead}>
              <div>
                <span className={styles.flag}>BẢN ĐỒ · MỖI VÙNG 10 MÀN</span>
                <h3>{pack.title}</h3>
              </div>
              <button
                type="button"
                className={styles.overviewClose}
                onClick={() => setOverviewOpen(false)}
              >
                Đóng
              </button>
            </header>
            <ol className={styles.overviewList}>
              {milestones.map((m, i) => {
                const here = activeIndex >= m.from && activeIndex <= m.to;
                return (
                  <li key={m.from}>
                    <button
                      type="button"
                      className={`${styles.tile} ${BIOME_CLASS[m.biome[0]]} ${here ? styles.tileCurrent : ""} ${
                        m.passed === m.size ? styles.tileDone : ""
                      }`}
                      onClick={() => {
                        setOverviewOpen(false);
                        setTimeout(() => scrollToNo(here ? activeIndex : m.from), 50);
                      }}
                    >
                      <span className={styles.tileNumber}>{i + 1}</span>
                      <strong>{m.biome[1]}</strong>
                      <small>
                        Màn {m.from}–{m.to}
                      </small>
                      <span className={styles.tileBar}>
                        <i style={{ width: `${(m.passed / m.size) * 100}%` }} />
                      </span>
                      <span className={styles.tileFoot}>
                        ★ {m.stars}/{m.size * 3}
                        {here && <em>Đang chơi</em>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
