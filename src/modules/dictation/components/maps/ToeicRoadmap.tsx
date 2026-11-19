/**
 * Full-screen TOEIC Dictation roadmap.
 * The game world is drawn by Phaser (roadmap/roadmap-game, loaded on demand — only when the map is
 * opened); the crisp text above it (top bar, level chips, stage dialog) is React.
 * Data: 5 levels split into stages with the learner's real progress, passed in by the parent.
 * One level is drawn at a time; the bottom dock switches levels (redraws that level's map).
 */
import { useEffect, useRef, useState } from "react";

import mascotHello from "@/assets/mascot/oy2-hello.png";

import type { DictationGameMode, RoadmapLevel, RoadmapStage } from "./maps.types";
import { formatCount } from "./maps.utils";
import type { RoadmapGameControls } from "./roadmap/roadmap-game";
import styles from "./ToeicRoadmap.module.css";

type RoadmapGame = Awaited<ReturnType<typeof import("./roadmap/roadmap-game").createRoadmapGame>>;

const REGION_NAME: Record<number, string> = {
  1: "Đồng cỏ Khởi hành",
  2: "Bờ biển Nắng",
  3: "Rừng Thông Xanh",
  4: "Hẻm núi Hoàng hôn",
  5: "Đỉnh Tuyết Chinh phục",
};

const LEVEL_CLASS: Record<number, string> = {
  1: styles.levelTone1,
  2: styles.levelTone2,
  3: styles.levelTone3,
  4: styles.levelTone4,
  5: styles.levelTone5,
};

export interface ToeicRoadmapProps {
  /** All levels; an empty list with `loading` shows the "Đang vẽ bản đồ…" overlay. */
  levels: RoadmapLevel[];
  loading?: boolean;
  /** Error message; shows the retry overlay. */
  error?: string;
  onRetry?: () => void;
  /** Guests see "Đăng nhập để lưu tiến độ…". */
  authenticated?: boolean;
  /** Level drawn first (default 1). */
  focusLevel?: number | null;
  /** "‹ Về danh mục". */
  onExit: () => void;
  /**
   * Start a stage. `mode` is "basic" | "pro" for bundled courses (stage.courseId set); undefined
   * for the single "Chơi màn này" button.
   */
  onPlay: (level: number, stage: RoadmapStage, mode?: DictationGameMode) => void;
  /** The learner switched level with the dock (optional). */
  onSelectLevel?: (level: number) => void;
}

interface Picked {
  level: number;
  stage: RoadmapStage;
}

export function ToeicRoadmap({
  levels,
  loading = false,
  error = "",
  onRetry,
  authenticated = true,
  focusLevel = null,
  onExit,
  onPlay,
  onSelectLevel,
}: ToeicRoadmapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<RoadmapGameControls | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [level, setLevel] = useState(focusLevel || 1);

  // Boot Phaser for the chosen level; switching level or leaving the page destroys the old game.
  useEffect(() => {
    const only = levels.filter((l) => l.level === level);
    const host = hostRef.current;
    if (!only.length || !host) return undefined;
    let game: RoadmapGame | null = null;
    let cancelled = false;
    import("./roadmap/roadmap-game").then(async ({ createRoadmapGame }) => {
      if (cancelled) return;
      const created = await createRoadmapGame(host, {
        levels: only,
        onStage: (lv, stage) => setPicked({ level: lv, stage }),
        onReady: (controls) => {
          controlsRef.current = controls;
        },
      });
      if (cancelled) created.destroy(true);
      else game = created;
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
      controlsRef.current = null;
    };
  }, [levels, level]);

  // Ctrl + wheel zooms the map — stop the browser from zooming the whole page.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const stop = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    host.addEventListener("wheel", stop, { passive: false });
    return () => host.removeEventListener("wheel", stop);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const selectLevel = (lv: number) => {
    setPicked(null);
    setLevel(lv);
    onSelectLevel?.(lv);
  };

  const shown = levels.find((l) => l.level === level);
  const pickedLevel = picked ? levels.find((l) => l.level === picked.level) : undefined;
  const hasData = levels.length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.canvasHost} ref={hostRef} />

      {loading && !error && !hasData && (
        <div className={styles.loading} role="status">
          <img src={mascotHello} alt="" />
          <span>Đang vẽ bản đồ…</span>
        </div>
      )}
      {error && (
        <div className={styles.loading} role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      )}

      <header className={styles.topBar}>
        <button type="button" className={styles.pill} onClick={onExit}>
          ‹ Về danh mục
        </button>
        {shown && (
          <span className={`${styles.pill} ${styles.score}`}>
            Chặng {shown.level} · {shown.band} · <b>{shown.stagesDone}</b>/{shown.stages.length} màn
            · {formatCount(shown.passed)}/{formatCount(shown.items)} câu
          </span>
        )}
      </header>

      {hasData && !authenticated && (
        <p className={styles.guest}>Đăng nhập để lưu tiến độ và thấy mình đang ở màn nào.</p>
      )}

      {hasData && (
        <nav className={styles.dock} aria-label="Các chặng">
          {levels.map((lv) => (
            <button
              key={lv.level}
              type="button"
              className={`${styles.chip} ${LEVEL_CLASS[lv.level] ?? ""} ${lv.level === level ? styles.chipOn : ""}`}
              aria-pressed={lv.level === level}
              onClick={() => selectLevel(lv.level)}
            >
              <b>{lv.level}</b>
              <span>
                <strong>{lv.band}</strong>
                <small>
                  {lv.stagesDone}/{lv.stages.length} màn
                </small>
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`${styles.chip} ${styles.chipNow}`}
            onClick={() => controlsRef.current?.focusCurrent()}
          >
            Màn đang chơi
          </button>
        </nav>
      )}

      {hasData && (
        <div className={styles.zoom} role="group" aria-label="Thu phóng bản đồ">
          <button
            type="button"
            aria-label="Phóng to"
            onClick={() => controlsRef.current?.zoomBy(1.25)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Thu nhỏ"
            onClick={() => controlsRef.current?.zoomBy(0.8)}
          >
            −
          </button>
        </div>
      )}

      {picked && pickedLevel && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label={`Màn ${picked.stage.no}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicked(null);
          }}
        >
          <div className={`${styles.card} ${LEVEL_CLASS[picked.level] ?? ""}`}>
            <button type="button" className={styles.close} onClick={() => setPicked(null)}>
              Đóng
            </button>
            <span className={styles.flag}>
              CHẶNG {picked.level} · {pickedLevel.band} · {REGION_NAME[picked.level]}
            </span>
            <h3>
              Màn {picked.stage.no}
              {picked.stage.subLevel ? ` · ${picked.stage.subLevel}` : ""}
            </h3>
            {picked.stage.title && (
              <p className={styles.course}>{picked.stage.title.replace(/^Chuyên đề:\s*/, "")}</p>
            )}
            <div className={styles.stats}>
              <div>
                <strong>{picked.stage.count}</strong>
                <span>câu</span>
              </div>
              <div>
                <strong>{picked.stage.passed}</strong>
                <span>đã đạt</span>
              </div>
              <div>
                <strong>{picked.stage.words}</strong>
                <span>từ / câu</span>
              </div>
              <div>
                <strong>{"★".repeat(picked.stage.stars) || "—"}</strong>
                <span>sao</span>
              </div>
            </div>
            <div className={styles.bar}>
              <i style={{ width: `${(picked.stage.passed / picked.stage.count) * 100}%` }} />
            </div>
            {!picked.stage.title && (
              <p className={styles.topics}>Chủ đề: {picked.stage.topics.join(" · ")}</p>
            )}
            {picked.stage.state === "locked" && (
              <p className={styles.note}>
                Màn này chưa tới lượt trên lộ trình — bạn vẫn có thể chơi thử.
              </p>
            )}
            {picked.stage.state === "done" && (
              <p className={`${styles.note} ${styles.noteDone}`}>
                Đã xong màn này. Chơi lại để lấy thêm sao.
              </p>
            )}
            {picked.stage.courseId ? (
              <div className={styles.modes}>
                <button
                  type="button"
                  className={`${styles.mode} ${styles.modeBasic}`}
                  onClick={() => onPlay(picked.level, picked.stage, "basic")}
                >
                  <strong>Cơ bản</strong>
                  <span>
                    {picked.stage.vocab
                      ? "Học nhanh vài từ trước mỗi 2–3 câu rồi viết"
                      : "Viết câu, nhịp nhẹ nhàng"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.mode} ${styles.modePro}`}
                  onClick={() => onPlay(picked.level, picked.stage, "pro")}
                >
                  <strong>Nâng cao</strong>
                  <span>Vào viết câu ngay, ít trợ giúp</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.play}
                onClick={() => onPlay(picked.level, picked.stage)}
              >
                {picked.stage.state === "done"
                  ? "Chơi lại"
                  : picked.stage.passed
                    ? "Chơi tiếp"
                    : "Chơi màn này"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
