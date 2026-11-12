/**
 * TOEIC Dictation roadmap — Phaser 3, hand-drawn adventure map style.
 *
 * ONE level is drawn at a time. Layers (depth ascending):
 *   terrain (grass + dirt road + rivers, pre-painted into 1024 px canvas chunks) → lily pads, water
 *   glints → bridges → travelled trail → mountains / trees / buildings (sorted by their foot, for
 *   depth) → cloud shadows → stage nodes + labels + mascot (always on top).
 * Every picture is painted on canvas in map-art; the layout lives in map-layout. No external assets
 * except the site's own mascot image.
 * Performance: only objects inside the viewport are shown / swayed; motion is switched off on weak
 * devices or when the user prefers reduced motion.
 *
 * Phaser itself is imported lazily inside `createRoadmapGame`, so it never enters the main bundle.
 */
import mascotUrl from "@/assets/mascot/oy2-hello.png";

import type { RoadmapLevel, RoadmapStage } from "../maps.types";
import { buildArt, canvasTex, paintBridge, paintRange, rng } from "./map-art";
import {
  CHUNK,
  layoutMap,
  paintTerrainChunk,
  type MapLayout,
  type Poi,
  type StagePlacement,
} from "./map-layout";
import { uiToken, uiTokenInt } from "./ui-tokens";

type PhaserModule = typeof import("phaser");

const NODE_DEPTH = 100000;
const TALL = new Set([
  "oak",
  "oakB",
  "poplar",
  "birch",
  "pine",
  "pineB",
  "snowpine",
  "snowpineB",
  "palm",
  "palmB",
  "acacia",
]);
const SOFT = new Set(["tuft", "tuftDry", "tuftSnow", "flowers", "reeds", "fern"]);

/** Controls handed to React once the scene is ready. */
export interface RoadmapGameControls {
  focusLevel: () => void;
  focusCurrent: () => void;
  zoomBy: (factor: number) => void;
}

export interface RoadmapGameConfig {
  /** Exactly one level: the one being drawn. */
  levels: RoadmapLevel[];
  onStage?: (level: number, stage: RoadmapStage) => void;
  onReady?: (controls: RoadmapGameControls) => void;
}

interface SceneData extends RoadmapGameConfig {
  width: number;
}

interface TrackedSprite {
  o: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  y: number;
  h: number;
  sway: number;
  sp: number;
  ph: number;
}

interface Glint {
  o: Phaser.GameObjects.Image;
  rv: MapLayout["rivers"][number];
  t: number;
  sp: number;
  off: number;
  ph: number;
}

function lowMotion() {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator.hardwareConcurrency || 8) <= 2 ||
      (nav.deviceMemory || 8) <= 2
    );
  } catch {
    return false;
  }
}

/** Phaser text style in the site fonts (display font for the big sign, body font elsewhere). */
function font(
  size: number,
  color = uiToken("--ui-ink", "#252c3f"),
  weight = "900",
  display = false,
) {
  return {
    fontFamily: display
      ? '"Baloo 2", ui-rounded, system-ui, sans-serif'
      : '"Plus Jakarta Sans", "Quicksand", ui-rounded, system-ui, sans-serif',
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
  };
}

function defineWorldScene(P: PhaserModule) {
  const cream = uiToken("--ui-cream", "#fdfbf6");
  const ink = uiToken("--ui-ink", "#252c3f");
  const onMark = uiToken("--ui-on-mark", "#252c3f");
  const subtle = uiToken("--ui-subtle", "#8a92a5");
  const greenDark = uiTokenInt("--ui-green", "#2e7a57");
  const markInt = uiTokenInt("--ui-mark-bright", "#f2c14e");
  const ringInt = 0xfff1a8;

  return class WorldScene extends P.Scene {
    private config!: SceneData;
    private map!: MapLayout;
    private reducedMotion = false;
    private sprites: TrackedSprite[] = [];
    private glints: Glint[] = [];
    private waterfalls: Phaser.GameObjects.TileSprite[] = [];
    private clouds: { o: Phaser.GameObjects.Image; sp: number }[] = [];
    private mascot?: Phaser.GameObjects.Image;
    private tooltip: Phaser.GameObjects.Text | null = null;
    private baseZoom = 1;
    private dragged = 0;
    private vx = 0;
    private vy = 0;
    private pinch: number | null = null;

    constructor() {
      super("world");
    }

    init(data: SceneData) {
      this.config = data;
    }

    preload() {
      this.load.image("mascot", mascotUrl);
    }

    create() {
      const { levels, onStage, onReady, width } = this.config;
      const level = levels[0];
      const map = layoutMap(level, width);
      this.map = map;
      this.reducedMotion = lowMotion();
      this.sprites = [];
      this.glints = [];
      this.waterfalls = [];
      this.clouds = [];
      const { W, H, biome } = map;
      const art = buildArt(this, biome);

      // ── terrain ───────────────────────────────────────────────────────────
      for (let y0 = 0; y0 < H; y0 += CHUNK) {
        const h = Math.min(CHUNK, H - y0);
        canvasTex(this, `terrain-${y0}`, W, h, (c) => paintTerrainChunk(c, y0, h, map));
        this.add.image(0, y0, `terrain-${y0}`).setOrigin(0).setDepth(-100);
      }

      // ── water: lily pads, drifting glints, bridges ────────────────────────
      map.lilies.forEach((l) =>
        this.add
          .image(l.x, l.y, art.lily[l.v % art.lily.length])
          .setRotation(l.rot)
          .setDepth(-60),
      );
      map.rivers.forEach((rv, i) => {
        const { bridge } = rv;
        canvasTex(this, `bridge-${i}`, 96, bridge.len, paintBridge);
        this.add
          .image(bridge.x, bridge.y, `bridge-${i}`)
          .setRotation(bridge.rot)
          .setDepth(-40)
          .setScale(map.narrow ? 0.82 : 1, 1);
        const count = Math.round(rv.pts.length / 12);
        for (let k = 0; k < count; k += 1) {
          const o = this.add.image(0, 0, "glint").setDepth(-55).setAlpha(0);
          this.glints.push({
            o,
            rv,
            t: Math.random(),
            sp: 0.5 + Math.random() * 0.5,
            off: (Math.random() - 0.5) * 1.2,
            ph: Math.random(),
          });
        }
      });

      // ── mountains (with waterfall + foam) ─────────────────────────────────
      map.mountains.forEach((m, i) => {
        const key = canvasTex(this, `range-${i}`, m.w, m.h, (c, w, h) =>
          paintRange(c, w, h, biome, rng(m.seed), { fall: m.fall, cave: m.cave, wide: m.wide }),
        );
        const img = this.add
          .image(m.x, m.y, key)
          .setOrigin(0.5, 1)
          .setDepth(m.wide ? 1 : m.y);
        if (!m.wide) this.track(img, m.y, m.h, 0);
        if (!m.fall) return;
        const foot = m.y - 26;
        const fall = this.add
          .tileSprite(m.x, foot - 130, 20, 138, "fall")
          .setOrigin(0.5, 0)
          .setDepth(m.y + 0.5);
        this.track(fall, foot + 8, 140, 0);
        this.waterfalls.push(fall);
        if (this.reducedMotion) return;
        for (let k = 0; k < 5; k += 1) {
          const f = this.add.image(m.x + (k - 2) * 7, foot + 8, "foam").setDepth(m.y + 0.6);
          this.track(f, foot + 8, 20, 0);
          this.tweens.add({
            targets: f,
            y: f.y - 8 - Math.random() * 6,
            alpha: { from: 0.95, to: 0 },
            scale: { from: 1, to: 2.2 },
            duration: 900 + Math.random() * 600,
            repeat: -1,
            delay: k * 180,
          });
        }
      });

      // ── trees, rocks, grass ───────────────────────────────────────────────
      map.decor.forEach((d) => {
        const list = art[d.kind];
        if (!list) return;
        const img = this.add
          .image(d.x, d.y, list[d.v % list.length])
          .setOrigin(0.5, 1)
          .setScale(d.s)
          .setFlipX(d.flip)
          .setDepth(d.y);
        this.track(
          img,
          d.y,
          img.displayHeight,
          TALL.has(d.kind) ? 0.8 + Math.random() * 0.8 : SOFT.has(d.kind) ? 2.5 : 0,
        );
      });

      // ── buildings: branch gates, camp, village, landmark, signposts ───────
      map.pois.forEach((p) => this.addPoi(p));
      map.signposts.forEach((s) => {
        const img = this.add
          .image(s.x, s.y, "signpost")
          .setOrigin(0.5, 1)
          .setFlipX(s.flip)
          .setDepth(s.y);
        this.track(img, s.y, 70, 0);
      });

      // ── travelled trail: gold dots along the road up to the current stage ──
      const cur = map.stages.find((s) => s.stage.state === "current");
      if (level.stagesDone > 0 || (cur && cur.stage.passed > 0)) {
        const endIdx = cur ? cur.pi : map.path.length - 1;
        const trail = this.add.graphics().setDepth(-30);
        for (let i = 12; i <= endIdx; i += 3) {
          const p = map.path[i];
          trail.fillStyle(0x6b4a12, 0.28).fillCircle(p.x + 1, p.y + 1.5, 4.4);
          trail.fillStyle(markInt, 1).fillCircle(p.x, p.y, 4);
        }
      }

      // ── slow cloud shadows over the ground ────────────────────────────────
      if (!this.reducedMotion) {
        for (let i = 0; i < 3; i += 1) {
          const o = this.add
            .image(Math.random() * W, H * (0.18 + i * 0.3), "cloudShadow")
            .setScale(2 + Math.random())
            .setAlpha(0.12)
            .setDepth(NODE_DEPTH - 10);
          this.clouds.push({ o, sp: 0.006 + Math.random() * 0.006 });
        }
      }

      this.addSignAndGoal(level);
      map.stages.forEach((s) => this.addNode(s, onStage));

      // ── mascot beside the current stage: bobbing + slight tilt ─────────────
      const at = cur || map.stages[0];
      const side = at.x > W / 2 ? -1 : 1;
      this.mascot = this.add
        .image(at.x + side * 66, at.y + 10, "mascot")
        .setOrigin(0.5, 1)
        .setDisplaySize(62, 62)
        .setDepth(NODE_DEPTH + 300);
      if (!this.reducedMotion) {
        const sy = this.mascot.scaleY;
        const sx = this.mascot.scaleX;
        this.tweens.add({
          targets: this.mascot,
          y: at.y + 2,
          scaleY: sy * 1.05,
          scaleX: sx * 0.96,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
        this.tweens.add({
          targets: this.mascot,
          angle: { from: -3, to: 3 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }

      this.setupCamera(at);
      onReady?.({
        focusLevel: () => this.focus(at),
        focusCurrent: () => this.focus(at),
        zoomBy: (k) => this.zoomTo(this.cameras.main.zoom * k),
      });
    }

    private addPoi(p: Poi) {
      const { biome } = this.map;
      if (p.type === "gate") {
        const g = this.add.image(p.x, p.y, "gate").setOrigin(0.5, 1).setScale(p.s).setDepth(p.y);
        this.track(g, p.y, 110, 0);
        this.add
          .text(p.x, p.y - 106 * p.s, p.label ?? "", {
            ...font(13),
            backgroundColor: cream,
            padding: { x: 8, y: 3 },
          })
          .setOrigin(0.5, 1)
          .setDepth(NODE_DEPTH - 1);
        return;
      }
      const img = this.add.image(p.x, p.y, p.type).setOrigin(0.5, 1).setScale(p.s).setDepth(p.y);
      this.track(img, p.y, img.displayHeight, 0);
      if (p.type === "landmark" && biome.landmark === "windmill") {
        const blades = this.add
          .image(p.x, p.y - 106 * p.s, "blades")
          .setScale(p.s * 0.95)
          .setDepth(p.y + 0.2);
        this.track(blades, p.y, 170, 0);
        if (!this.reducedMotion)
          this.tweens.add({ targets: blades, angle: 360, duration: 9000, repeat: -1 });
      }
      if (p.type === "camp") {
        const fl = this.add
          .image(p.x + 40.8 * p.s, p.y - 14 * p.s, "flame")
          .setOrigin(0.5, 1)
          .setScale(p.s)
          .setDepth(p.y + 0.2);
        this.track(fl, p.y, 60, 0);
        if (!this.reducedMotion) {
          this.tweens.add({
            targets: fl,
            scaleY: { from: p.s * 0.85, to: p.s * 1.15 },
            scaleX: { from: p.s, to: p.s * 0.88 },
            alpha: { from: 1, to: 0.82 },
            duration: 260,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }
      }
    }

    private addSignAndGoal(level: RoadmapLevel) {
      const { cx, signY, endY, narrow, castle, biome } = this.map;
      this.add
        .image(cx, signY + 30, "sign")
        .setOrigin(0.5, 1)
        .setScale(narrow ? 0.86 : 1)
        .setDepth(NODE_DEPTH);
      this.add
        .text(
          cx,
          signY - 30,
          `CHẶNG ${level.level} · ${level.band}`,
          font(narrow ? 16 : 19, "#fff6e3"),
        )
        .setOrigin(0.5)
        .setDepth(NODE_DEPTH + 1);
      this.add
        .text(cx, signY - 76, biome.name, {
          ...font(narrow ? 19 : 24, ink, "900", true),
          stroke: cream,
          strokeThickness: 7,
        })
        .setOrigin(0.5)
        .setDepth(NODE_DEPTH + 1);
      const done = level.stagesDone === level.stages.length && level.stages.length > 0;
      const goal = this.add
        .image(cx, endY + 30, castle ? "castle" : "trophy")
        .setOrigin(0.5, 1)
        .setScale(castle && narrow ? 0.82 : 1)
        .setDepth(endY + 30);
      if (!done) goal.setTint(0xd9d2c3);
      else if (!this.reducedMotion) {
        this.add
          .particles(cx, endY - 40, "foam", {
            speed: { min: 20, max: 60 },
            lifespan: 1300,
            scale: { start: 0.8, end: 0 },
            tint: 0xfff2a8,
            frequency: 240,
          })
          .setDepth(NODE_DEPTH);
      }
      const label = castle
        ? `Đích lộ trình TOEIC · ${level.stagesDone}/${level.stages.length} màn`
        : `Cúp chặng ${level.level} · ${level.stagesDone}/${level.stages.length} màn`;
      this.add
        .text(cx, endY + 54, label, {
          ...font(14),
          backgroundColor: cream,
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(NODE_DEPTH + 1);
    }

    private setupCamera(at: StagePlacement) {
      const cam = this.cameras.main;
      const { W, H, biome } = this.map;
      this.baseZoom = Math.max(1, this.scale.width / W);
      cam.setZoom(this.baseZoom);
      cam.setBounds(0, 0, W, H);
      cam.setBackgroundColor(biome.ground[2]);
      this.input.addPointer(1);
      this.dragged = 0;
      this.vx = 0;
      this.vy = 0;
      this.input.on("pointerdown", () => {
        this.dragged = 0;
        this.vx = 0;
        this.vy = 0;
      });
      this.input.on("pointerup", () => {
        this.pinch = null;
      });
      this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
        const p1 = this.input.pointer1;
        const p2 = this.input.pointer2;
        if (p1.isDown && p2.isDown) {
          const d = P.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
          if (this.pinch) this.zoomTo(cam.zoom * (d / this.pinch));
          this.pinch = d;
          this.dragged = 99;
          return;
        }
        if (!ptr.isDown) return;
        const dx = ptr.x - ptr.prevPosition.x;
        const dy = ptr.y - ptr.prevPosition.y;
        this.dragged += Math.abs(dx) + Math.abs(dy);
        cam.scrollX -= dx / cam.zoom;
        cam.scrollY -= dy / cam.zoom;
        this.vx = dx / cam.zoom;
        this.vy = dy / cam.zoom;
      });
      this.input.on(
        "wheel",
        (ptr: Phaser.Input.Pointer, _objects: unknown, dx: number, dy: number) => {
          const ev = ptr.event as WheelEvent | undefined;
          if (ev && (ev.ctrlKey || ev.metaKey)) this.zoomTo(cam.zoom * (dy < 0 ? 1.1 : 1 / 1.1));
          else {
            cam.scrollY += dy / cam.zoom;
            cam.scrollX += dx / cam.zoom;
          }
        },
      );
      cam.centerOn(at.x, at.y);
    }

    /** Register a scenery object so it is only shown / swayed while inside the viewport. */
    private track(
      o: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite,
      y: number,
      h: number,
      sway: number,
    ) {
      this.sprites.push({
        o,
        y,
        h,
        sway,
        sp: 0.0011 + Math.random() * 0.0009,
        ph: Math.random() * 6.28,
      });
    }

    private zoomTo(z: number) {
      this.cameras.main.setZoom(P.Math.Clamp(z, this.baseZoom, this.baseZoom * 2));
    }

    private focus(p: { x: number; y: number }) {
      this.cameras.main.pan(p.x, p.y, 700, "Sine.easeInOut");
    }

    private addNode(s: StagePlacement, onStage: SceneData["onStage"]) {
      const st = s.stage;
      const key =
        st.state === "done" ? "node-done" : st.state === "current" ? "node-current" : "node-locked";
      const scale = st.state === "current" ? 1 : 0.84;
      const node = this.add.container(s.x, s.y).setDepth(NODE_DEPTH + s.y / 100);
      if (st.state === "current") {
        const ring = this.add.graphics();
        ring.lineStyle(5, ringInt, 0.9).strokeEllipse(0, 2, 98, 84);
        node.add(ring);
        if (!this.reducedMotion) {
          this.tweens.add({
            targets: ring,
            scale: { from: 0.92, to: 1.22 },
            alpha: { from: 0.9, to: 0 },
            duration: 1300,
            repeat: -1,
            ease: "Sine.out",
          });
        }
      }
      const img = this.add.image(0, 0, key).setScale(scale);
      const num = this.add
        .text(
          0,
          -6 * scale,
          String(st.no),
          font(
            st.state === "current" ? 30 : 25,
            st.state === "locked" ? subtle : st.state === "current" ? onMark : "#ffffff",
          ),
        )
        .setOrigin(0.5);
      if (st.state === "done") num.setStroke(`#${greenDark.toString(16).padStart(6, "0")}`, 4);
      node.add([img, num]);
      if (st.state === "done") {
        [-1, 0, 1].forEach((d, i) =>
          node.add(
            this.add.image(d * 22, -50 - (i === 1 ? 6 : 0), i < st.stars ? "star" : "star-off"),
          ),
        );
      }
      if (st.state !== "done" && st.passed > 0) {
        const arc = this.add.graphics();
        arc
          .lineStyle(5, markInt, 1)
          .beginPath()
          .arc(
            0,
            -4,
            42 * scale,
            -Math.PI / 2,
            -Math.PI / 2 + (Math.PI * 2 * st.passed) / st.count,
            false,
          )
          .strokePath();
        node.add(arc);
      }
      if (st.state === "current" && !this.reducedMotion) {
        this.tweens.add({
          targets: img,
          scale: scale * 1.06,
          duration: 650,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }
      img.setInteractive({ useHandCursor: true });
      img.on("pointerover", () => {
        node.setScale(1.08);
        this.showTooltip(s);
      });
      img.on("pointerout", () => {
        node.setScale(1);
        this.hideTooltip();
      });
      img.on("pointerup", () => {
        if (this.dragged < 8) onStage?.(this.config.levels[0].level, st);
      });
    }

    private showTooltip(s: StagePlacement) {
      this.hideTooltip();
      const st = s.stage;
      this.tooltip = this.add
        .text(s.x, s.y - 78, `Màn ${st.no} · ${st.count} câu · đạt ${st.passed}/${st.count}`, {
          ...font(13, ink, "800"),
          backgroundColor: cream,
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(NODE_DEPTH + 500);
    }

    private hideTooltip() {
      this.tooltip?.destroy();
      this.tooltip = null;
    }

    update(time: number, delta: number) {
      const cam = this.cameras.main;
      if (
        !this.input.activePointer.isDown &&
        (Math.abs(this.vy) > 0.05 || Math.abs(this.vx) > 0.05)
      ) {
        cam.scrollY -= this.vy;
        cam.scrollX -= this.vx;
        this.vy *= 0.92;
        this.vx *= 0.92;
      }
      const v = cam.worldView;
      const top = v.y - 120;
      const bottom = v.bottom + 120;
      for (const s of this.sprites) {
        const vis = s.y > top && s.y - s.h < bottom;
        if (s.o.visible !== vis) s.o.setVisible(vis);
        if (vis && s.sway && !this.reducedMotion) s.o.angle = Math.sin(time * s.sp + s.ph) * s.sway;
      }
      if (this.reducedMotion) return;
      this.waterfalls.forEach((f) => {
        if (f.visible) f.tilePositionY -= delta * 0.14;
      });
      for (const g of this.glints) {
        const pts = g.rv.pts;
        g.t = (g.t + (delta * g.sp * 0.03) / pts.length) % 1;
        const q = pts[Math.floor(g.t * (pts.length - 1))];
        if (q.y < top || q.y > bottom) {
          if (g.o.visible) g.o.setVisible(false);
          continue;
        }
        if (!g.o.visible) g.o.setVisible(true);
        g.o.setPosition(q.x + q.nx * q.hw * g.off * 0.6, q.y + q.ny * q.hw * g.off * 0.6);
        g.o.setRotation(Math.atan2(q.ny, q.nx) + Math.PI / 2);
        g.o.setAlpha(0.75 * Math.max(0, Math.sin(((time * 0.0004 + g.ph) % 1) * Math.PI)));
      }
      for (const c of this.clouds) {
        c.o.x += delta * c.sp;
        if (c.o.x > this.map.W + 500) c.o.x = -500;
      }
    }
  };
}

/**
 * Start the map inside `parent`; resolves to the game so React can destroy it on unmount.
 * Phaser is downloaded on first call only.
 */
export async function createRoadmapGame(
  parent: HTMLElement,
  { levels, onStage, onReady }: RoadmapGameConfig,
): Promise<Phaser.Game> {
  const P = await import("phaser");
  const WorldScene = defineWorldScene(P);
  let width = parent.clientWidth || window.innerWidth;
  const game = new P.Game({
    type: P.AUTO,
    parent,
    backgroundColor: "#9dd06a",
    scale: { mode: P.Scale.RESIZE, width: "100%", height: "100%" },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    banner: false,
    scene: [],
  });
  game.scene.add("world", WorldScene, true, { levels, onStage, onReady, width });
  // The world is laid out for the viewport width: a significant resize (rotation, window drag) rebuilds it.
  game.scale.on("resize", (size: { width: number }) => {
    if (Math.abs(size.width - width) / width < 0.15) return;
    width = size.width;
    game.scene.getScene("world")?.scene.restart({ levels, onStage, onReady, width });
  });
  return game;
}
