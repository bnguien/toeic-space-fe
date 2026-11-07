/**
 * Layout + terrain of one level's map. Nothing is purely random: everything follows a "script" —
 * the path winds through the stages; every few stages an event happens (river with a waterfall
 * from a mountain + wooden bridge, camp, small village, the level's landmark, a gate to branch
 * 3A/3B/3C); mountains cluster at the edges; forests follow a density field (noise) so they clump
 * and leave clearings. The ground (grass, dirt road, rivers) is painted straight into big canvas
 * chunks so the road "sits in" the ground instead of floating on top.
 */
import type { RoadmapLevel, RoadmapStage } from "../maps.types";
import {
  BIOMES,
  PI2,
  blob,
  makeNoise,
  mix,
  mixRgb,
  rng,
  type Biome,
  type Ctx,
  type Noise,
} from "./map-art";

export const CHUNK = 1024;
const LOW = 8; // resolution of the ground colour grid (px per cell), upscaled smoothly when painted
// Crown radius (px) — canopies must not cover the road or a stage pedestal
const CROWN: Record<string, number> = {
  oak: 42,
  oakB: 40,
  poplar: 22,
  birch: 32,
  pine: 30,
  pineB: 28,
  snowpine: 30,
  snowpineB: 27,
  palm: 54,
  palmB: 50,
  acacia: 52,
  cactus: 20,
};

interface XY {
  x: number;
  y: number;
}

/** A resampled path point with its unit direction. */
export interface PathPoint extends XY {
  dx: number;
  dy: number;
}

/** A river centreline point with its normal and half width. */
export interface RiverPoint extends XY {
  nx: number;
  ny: number;
  hw: number;
}

export interface StagePlacement extends XY {
  stage: RoadmapStage;
  /** Index of the nearest path point. */
  pi: number;
}

export interface River {
  pts: RiverPoint[];
  headX: number;
  headY: number;
  bridge: { x: number; y: number; rot: number; len: number };
}

export interface Mountain extends XY {
  w: number;
  h: number;
  seed: number;
  wide?: boolean;
  fall?: boolean;
  cave?: boolean;
}

export type PoiType = "gate" | "camp" | "village" | "landmark";

export interface Poi extends XY {
  type: PoiType;
  s: number;
  label?: string;
  w?: number;
  h?: number;
}

export interface Signpost extends XY {
  flip: boolean;
}

export interface Decor extends XY {
  kind: string;
  v: number;
  s: number;
  flip: boolean;
}

export interface Lily extends XY {
  v: number;
  rot: number;
}

export interface PathDot extends XY {
  k: "pebble" | "speck" | "step";
  s?: number;
  rot?: number;
}

export interface MapLayout {
  W: number;
  H: number;
  narrow: boolean;
  biome: Biome;
  cx: number;
  topH: number;
  signY: number;
  endY: number;
  castle: boolean;
  path: PathPoint[];
  pathW: number;
  stages: StagePlacement[];
  rivers: River[];
  mountains: Mountain[];
  pois: Poi[];
  signposts: Signpost[];
  decor: Decor[];
  lilies: Lily[];
  low: HTMLCanvasElement;
  pathDots: PathDot[];
  seed: number;
  noise: Noise;
}

function catmull(pts: XY[], steps: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  const last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

function resample(poly: XY[], spacing: number): PathPoint[] {
  const out: PathPoint[] = [{ ...poly[0], dx: 0, dy: 1 }];
  let carry = 0;
  for (let i = 1; i < poly.length; i += 1) {
    const a = poly[i - 1];
    const b = poly[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = spacing - carry;
    while (d <= seg) {
      const t = d / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: 0, dy: 1 });
      d += spacing;
    }
    carry = seg - (d - spacing);
  }
  out.forEach((p, i) => {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    p.dx = (b.x - a.x) / L;
    p.dy = (b.y - a.y) / L;
  });
  return out;
}

/** Spatial hash grid for fast "is this spot free?" checks. */
class SpatialHash {
  private readonly cell: number;
  private readonly cells = new Map<string, [number, number, number][]>();

  constructor(cell = 48) {
    this.cell = cell;
  }

  add(x: number, y: number, r: number) {
    const c = this.cell;
    const R = r + 24;
    for (let i = Math.floor((x - R) / c); i <= Math.floor((x + R) / c); i += 1) {
      for (let j = Math.floor((y - R) / c); j <= Math.floor((y + R) / c); j += 1) {
        const k = `${i},${j}`;
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push([x, y, r]);
      }
    }
  }

  hit(x: number, y: number, rad = 0) {
    const arr = this.cells.get(`${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`);
    if (!arr) return false;
    return arr.some(([px, py, r]) => (px - x) ** 2 + (py - y) ** 2 < (r + rad) ** 2);
  }
}

function pick(list: [string, number][], r: () => number) {
  const total = list.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [k, w] of list) {
    x -= w;
    if (x <= 0) return k;
  }
  return list[0][0];
}

type EventType = "gate" | "river" | "landmark" | "camp" | "village";

/** Build the whole layout of one level's map. */
export function layoutMap(level: RoadmapLevel, viewW: number): MapLayout {
  const W = Math.round(Math.min(Math.max(viewW, 360), 1680));
  const narrow = W < 640;
  const biome = BIOMES[level.level] || BIOMES[1];
  const seed = level.level * 7919 + level.stages.length;
  const r = rng(seed);
  const n = level.stages.length;
  const cx = W / 2;
  const step = narrow ? 112 : 126;
  const amp = Math.min(W * (narrow ? 0.25 : 0.23), 290);
  const topH = narrow ? 200 : 260;
  const signY = topH + 74;
  const castle = level.level === 5;

  // ── Events between stages ────────────────────────────────────────────────
  const events = new Map<number, EventType>();
  level.stages.forEach((st, i) => {
    if (i > 0 && st.subLevel && st.subLevel !== level.stages[i - 1].subLevel) events.set(i, "gate");
  });
  const section = n <= 20 ? 5 : 6;
  const cycle: EventType[] = ["river", "landmark", "river", "camp", "river", "village"];
  let ci = 0;
  for (let j = section; j < n; j += section) {
    if ([...events.keys()].some((k) => Math.abs(k - j) < 2)) continue;
    events.set(j, cycle[ci % cycle.length]);
    ci += 1;
  }

  // ── Stages along the road ────────────────────────────────────────────────
  const stages: StagePlacement[] = [];
  let y = signY + 136;
  level.stages.forEach((st, i) => {
    const ev = events.get(i);
    if (ev === "river") y += narrow ? 84 : 100;
    else if (ev) y += 36;
    const x = cx + amp * Math.sin(i * 0.62 + level.level) + amp * 0.16 * Math.sin(i * 1.9 + 1);
    stages.push({ x, y, stage: st, pi: 0 });
    y += step;
  });
  const endY = y + 30;
  const H = Math.round(endY + (castle ? 250 : 190));
  const ctrl: XY[] = [
    { x: cx, y: signY - 10 },
    { x: cx, y: signY + 60 },
    ...stages,
    { x: cx, y: endY },
  ];
  const path = resample(catmull(ctrl, 22), 6);
  const nearestByY = (yy: number) => {
    let best = 0;
    for (let i = 0; i < path.length; i += 1) {
      if (Math.abs(path[i].y - yy) < Math.abs(path[best].y - yy)) best = i;
    }
    return best;
  };
  stages.forEach((s) => {
    s.pi = nearestByY(s.y);
  });
  const pathW = narrow ? 30 : 38;

  const hash = new SpatialHash();
  const pathHash = new SpatialHash();
  const clear = narrow ? 40 : 54;
  path.forEach((p, i) => {
    if (i % 2 === 0) {
      hash.add(p.x, p.y, clear);
      pathHash.add(p.x, p.y, pathW / 2 + 8);
    }
  });
  stages.forEach((s) => {
    hash.add(s.x, s.y, 58);
    pathHash.add(s.x, s.y, 48);
  });
  const rects: [number, number, number, number][] = [];
  const addRect = (x0: number, y0: number, x1: number, y1: number) => rects.push([x0, y0, x1, y1]);
  const inRect = (x: number, yy: number) =>
    rects.some(([a, b, c, d]) => x > a && x < c && yy > b && yy < d);
  addRect(cx - 160, signY - 120, cx + 160, signY + 54);
  addRect(
    cx - (castle ? 130 : 80),
    endY - (castle ? 200 : 110),
    cx + (castle ? 130 : 80),
    endY + 40,
  );

  const noise = makeNoise(seed);
  const forestN = makeNoise(seed + 11);
  const pathXRange = (y0: number, y1: number): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    path.forEach((p) => {
      if (p.y > y0 && p.y < y1) {
        lo = Math.min(lo, p.x);
        hi = Math.max(hi, p.x);
      }
    });
    return [lo, hi];
  };

  // ── Mountains: range across the top + clusters at the edges ───────────────
  const mountains: Mountain[] = [
    { x: cx, y: topH + 20, w: W, h: topH + 40, wide: true, seed: seed + 1 },
  ];
  const fitMountain = (headX: number, footY: number, h: number, side: number) => {
    const [lo, hi] = pathXRange(footY - h, footY + 30);
    const room = side < 0 ? lo - headX : headX - hi;
    return Math.max(
      narrow ? 200 : 240,
      Math.min(narrow ? 300 : 440, (Number.isFinite(room) ? room : 300) * 2 - 70),
    );
  };

  // ── Rivers + waterfalls + bridges ────────────────────────────────────────
  const rivers: River[] = [];
  const pois: Poi[] = [];
  events.forEach((type, j) => {
    const a = stages[j - 1];
    const b = stages[j];
    const pi = nearestByY((a.y + b.y) / 2);
    const p = path[pi];
    if (type === "river") {
      const left = p.x > cx;
      const side = left ? -1 : 1;
      const headX = left
        ? narrow
          ? 26
          : Math.max(80, W * 0.08)
        : W - (narrow ? 26 : Math.max(80, W * 0.08));
      const headY = p.y - (narrow ? 74 : 96);
      const dir = left ? 1 : -1;
      const A = narrow ? 16 : 26;
      const base = narrow ? 15 : 22;
      const pts: RiverPoint[] = [];
      for (let x = headX; dir > 0 ? x <= W + 60 : x >= -60; x += dir * 7) {
        const g = Math.exp(-(((x - headX) / (narrow ? 58 : 88)) ** 2));
        pts.push({
          x,
          y: p.y + A * Math.sin(0.012 * (x - p.x)) * (1 - g) + (headY - p.y) * g,
          nx: 0,
          ny: 0,
          hw: 0,
        });
      }
      pts.forEach((q, i) => {
        const u = pts[Math.max(0, i - 1)];
        const v = pts[Math.min(pts.length - 1, i + 1)];
        const L = Math.hypot(v.x - u.x, v.y - u.y) || 1;
        q.nx = -(v.y - u.y) / L;
        q.ny = (v.x - u.x) / L;
        q.hw =
          base *
          (0.8 + 0.5 * (noise(q.x * 0.011, p.y * 0.01) + 0.5)) *
          (0.5 + 0.5 * Math.min(1, i / 12));
        hash.add(q.x, q.y, q.hw + 16);
      });
      const cross = pts.reduce(
        (best, q) => (Math.abs(q.x - p.x) < Math.abs(best.x - p.x) ? q : best),
        pts[0],
      );
      const mh = narrow ? 196 : 268;
      const mw = fitMountain(headX, headY, mh, side);
      mountains.push({ x: headX, y: headY + 22, w: mw, h: mh, fall: true, seed: seed + j * 31 });
      rivers.push({
        pts,
        headX,
        headY,
        bridge: {
          x: p.x,
          y: p.y,
          rot: Math.atan2(p.dy, p.dx) - Math.PI / 2,
          len: cross.hw * 2 + 46,
        },
      });
      return;
    }
    if (type === "gate") {
      pois.push({
        type,
        x: p.x,
        y: p.y + 26,
        s: narrow ? 0.8 : 1,
        label: `Nhánh ${b.stage.subLevel}`,
      });
      return;
    }
    const side = p.x > cx ? -1 : 1;
    const s = narrow ? 0.62 : 1;
    const size = { camp: [170, 90], village: [230, 130], landmark: [140, 160] }[type];
    const off = (narrow ? 70 : 150) + (size[0] * s) / 2;
    const px = Math.min(
      W - (size[0] * s) / 2 - 6,
      Math.max((size[0] * s) / 2 + 6, p.x + side * off),
    );
    const py = p.y + 30;
    pois.push({ type, x: px, y: py, s, w: size[0] * s, h: size[1] * s });
    addRect(
      px - (size[0] * s) / 2 - 14,
      py - size[1] * s - 12,
      px + (size[0] * s) / 2 + 14,
      py + 18,
    );
  });

  // Decorative mountain clusters on the wider side, away from events
  let caveDone = false;
  for (let i = 3; i < n - 1; i += 8) {
    if ([...events.keys()].some((k) => Math.abs(k - i) <= 2)) continue;
    const s = stages[i];
    const side = s.x > cx ? -1 : 1;
    const mx = side < 0 ? (narrow ? 10 : W * 0.06) : W - (narrow ? 10 : W * 0.06);
    const mh = narrow ? 170 : 236;
    const mw = fitMountain(mx, s.y + 40, mh, side);
    mountains.push({
      x: mx,
      y: s.y + 40,
      w: mw,
      h: mh,
      cave: !caveDone && !narrow,
      seed: seed + i * 17,
    });
    caveDone = true;
  }
  mountains.forEach((m) => {
    if (!m.wide) addRect(m.x - m.w / 2, m.y - m.h * 0.78, m.x + m.w / 2, m.y + 6);
  });
  addRect(-20, 0, W + 20, topH - 6);

  // Signposts at the bends (every other bend)
  const signposts: Signpost[] = [];
  let bend = 0;
  for (let i = 1; i < n - 1; i += 1) {
    const d0 = stages[i].x - stages[i - 1].x;
    const d1 = stages[i + 1].x - stages[i].x;
    if (d0 * d1 >= 0) continue;
    bend += 1;
    if (bend % 2) continue;
    const side = d0 > 0 ? 1 : -1;
    const x = stages[i].x + side * (narrow ? 62 : 80);
    const yy = stages[i].y + 8;
    if (x < 30 || x > W - 30 || inRect(x, yy)) continue;
    signposts.push({ x, y: yy, flip: side < 0 });
    addRect(x - 26, yy - 64, x + 26, yy + 8);
  }

  // ── Trees by density field ───────────────────────────────────────────────
  const decor: Decor[] = [];
  const sp = narrow ? 30 : 36;
  for (let gy = topH - 30; gy < H + 20; gy += sp * 0.86) {
    const row = Math.round(gy / sp);
    for (let gx = -14; gx < W + 14; gx += sp) {
      const x = gx + (r() - 0.5) * sp * 0.9 + (row % 2) * sp * 0.5;
      const yy = gy + (r() - 0.5) * sp * 0.8;
      const f = forestN.fbm(x / 330, yy / 330, 3);
      const forest = f > 0.08;
      if (forest ? r() > (f > 0.18 ? 0.85 : 0.42) * (biome.density || 1) : r() > 0.075) continue;
      if (inRect(x, yy) || hash.hit(x, yy, forest ? 12 : 4)) continue;
      const kind = pick(forest ? biome.forest : biome.open, r);
      // canopies must not cover the road or a stage pedestal
      const crown = CROWN[kind] || 0;
      if (
        crown &&
        (pathHash.hit(x, yy - 50, crown) ||
          pathHash.hit(x, yy - 95, crown) ||
          hash.hit(x, yy - 40, 6))
      ) {
        continue;
      }
      decor.push({
        kind,
        v: Math.floor(r() * 97),
        x,
        y: yy,
        s: forest ? 0.8 + Math.min(0.32, f * 1.2) + r() * 0.14 : 0.8 + r() * 0.35,
        flip: r() < 0.5,
      });
    }
  }
  // River banks: reeds, rocks; water: lily pads
  const lilies: Lily[] = [];
  rivers.forEach((rv) => {
    rv.pts.forEach((q, i) => {
      if (i % 4) return;
      [-1, 1].forEach((sd) => {
        if (r() > 0.36) return;
        const d = q.hw + 10 + r() * 8;
        // lower bank: push the foot further down so the sprite (drawn upwards) does not reach the water
        const below = q.ny * sd > 0;
        const x = q.x + q.nx * d * sd;
        const yy = q.y + q.ny * d * sd + (below ? 24 : 4);
        if (pathHash.hit(x, yy, 26) || inRect(x, yy)) return;
        const kind =
          biome.key === "snow"
            ? "rockSnow"
            : biome.key === "canyon" || r() < 0.4
              ? "rock"
              : "reeds";
        decor.push({
          kind,
          v: Math.floor(r() * 97),
          x,
          y: yy,
          s: 0.6 + r() * 0.35,
          flip: r() < 0.5,
        });
      });
      if (biome.key !== "snow" && biome.key !== "canyon" && i % 9 === 0 && r() < 0.6) {
        const o = (r() - 0.5) * q.hw * 1.1;
        const x = q.x + q.nx * o;
        const yy = q.y + q.ny * o;
        if (!pathHash.hit(x, yy, 30))
          lilies.push({ x, y: yy, v: Math.floor(r() * 9), rot: r() * PI2 });
      }
    });
  });

  // ── Low-resolution ground colour grid (upscaled smoothly per chunk) ────────
  const lw = Math.ceil(W / LOW) + 2;
  const lh = Math.ceil(H / LOW) + 2;
  const low = document.createElement("canvas");
  low.width = lw;
  low.height = lh;
  const lctx = low.getContext("2d")!;
  const img = lctx.createImageData(lw, lh);
  const ramp = biome.ground;
  const rampRgb = (v: number) => {
    const t = Math.max(0, Math.min(0.999, v)) * 3;
    const i = Math.floor(t);
    return mixRgb(ramp[i], ramp[i + 1], t - i);
  };
  for (let j = 0; j < lh; j += 1) {
    for (let i = 0; i < lw; i += 1) {
      const x = i * LOW;
      const yy = j * LOW;
      const f = forestN.fbm(x / 330, yy / 330, 3);
      let v = 0.34 + noise.fbm(x / 430, yy / 430, 4) * 1.15 + noise(x / 70, yy / 70) * 0.18;
      v += Math.max(0, Math.min(0.42, f * 2.4));
      const [R, G, B] = rampRgb(v);
      const o = (j * lw + i) * 4;
      img.data[o] = R;
      img.data[o + 1] = G;
      img.data[o + 2] = B;
      img.data[o + 3] = 255;
    }
  }
  lctx.putImageData(img, 0, 0);

  // Dirt road details (pebbles, footprints) — generated once, painted per chunk
  const pathDots: PathDot[] = [];
  path.forEach((p, i) => {
    if (r() < 0.5) {
      const o = (r() - 0.5) * pathW * 0.8;
      pathDots.push({
        x: p.x - p.dy * o,
        y: p.y + p.dx * o,
        k: r() < 0.3 ? "pebble" : "speck",
        s: 0.6 + r() * 0.9,
      });
    }
    if (i % 5 === 0) {
      const o = Math.floor(i / 5) % 2 ? 5 : -5;
      pathDots.push({
        x: p.x - p.dy * o,
        y: p.y + p.dx * o,
        k: "step",
        rot: Math.atan2(p.dy, p.dx),
      });
    }
  });

  return {
    W,
    H,
    narrow,
    biome,
    cx,
    topH,
    signY,
    endY,
    castle,
    path,
    pathW,
    stages,
    rivers,
    mountains,
    pois,
    signposts,
    decor,
    lilies,
    low,
    pathDots,
    seed,
    noise,
  };
}

function strokePoly(c: Ctx, pts: XY[], close?: boolean) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  if (close) c.closePath();
}

function riverEdge(rv: River, k: number, extra: number): XY[] {
  const L = rv.pts.map((q) => ({
    x: q.x + q.nx * (q.hw * k + extra),
    y: q.y + q.ny * (q.hw * k + extra),
  }));
  const R = rv.pts
    .map((q) => ({ x: q.x - q.nx * (q.hw * k + extra), y: q.y - q.ny * (q.hw * k + extra) }))
    .reverse();
  return [...L, ...R];
}

/** Paint one ground chunk (at most CHUNK px tall) starting at y0: grass → details → road → rivers. */
export function paintTerrainChunk(c: Ctx, y0: number, h: number, map: MapLayout) {
  const { W, biome, low, path, pathW, rivers, narrow } = map;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(low, 0, y0 / LOW, W / LOW, h / LOW, 0, 0, W, h);
  c.save();
  c.translate(0, -y0);
  const r = rng(map.seed + y0);
  const inChunk = (yy: number, pad = 40) => yy > y0 - pad && yy < y0 + h + pad;

  // Soft bare patches + wildflower clusters printed into the ground
  const area = W * h;
  for (let i = 0; i < area / 70000; i += 1) {
    const x = r() * W;
    const yy = y0 + r() * h;
    const rr = 30 + r() * 70;
    const g = c.createRadialGradient(x, yy, 2, x, yy, rr);
    g.addColorStop(0, mix(biome.dirt[0], biome.ground[1], 0.35));
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = 0.32;
    c.fillStyle = g;
    c.save();
    c.translate(x, yy);
    c.scale(1, 0.55);
    c.translate(-x, -yy);
    c.beginPath();
    c.arc(x, yy, rr, 0, PI2);
    c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
  // Grass strokes: grouped by colour and drawn in one pass each
  const blades: [number, number, number, number][][] = [[], []];
  for (let i = 0; i < area / (narrow ? 380 : 470); i += 1) {
    const x = r() * W;
    const yy = y0 + r() * h;
    const len = 3 + r() * 5;
    const bend = (r() - 0.5) * 4;
    blades[r() < 0.55 ? 0 : 1].push([x, yy, len, bend]);
  }
  blades.forEach((list, k) => {
    c.strokeStyle = biome.blade[k];
    c.globalAlpha = k ? 0.5 : 0.38;
    c.lineWidth = 1.3;
    c.lineCap = "round";
    c.beginPath();
    list.forEach(([x, yy, len, bend]) => {
      c.moveTo(x, yy);
      c.quadraticCurveTo(x + bend * 0.3, yy - len * 0.6, x + bend, yy - len);
    });
    c.stroke();
  });
  c.globalAlpha = 1;
  for (let i = 0; i < area / 52000; i += 1) {
    const x = r() * W;
    const yy = y0 + r() * h;
    const col = biome.flowers[Math.floor(r() * biome.flowers.length)];
    c.fillStyle = col;
    for (let k = 0; k < 10; k += 1) {
      c.beginPath();
      c.arc(x + (r() - 0.5) * 34, yy + (r() - 0.5) * 18, 1.6 + r() * 1.2, 0, PI2);
      c.fill();
    }
  }

  // Mountain foot shadows, yard under camps / villages
  map.mountains.forEach((m) => {
    if (!inChunk(m.y, 120)) return;
    const g = c.createRadialGradient(m.x, m.y - 6, 4, m.x, m.y - 6, m.w * 0.55);
    g.addColorStop(0, "rgba(30,40,20,.28)");
    g.addColorStop(1, "rgba(30,40,20,0)");
    c.fillStyle = g;
    c.save();
    c.translate(m.x, m.y - 6);
    c.scale(1, 0.18);
    c.translate(-m.x, -(m.y - 6));
    c.beginPath();
    c.arc(m.x, m.y - 6, m.w * 0.55, 0, PI2);
    c.fill();
    c.restore();
  });
  map.pois.forEach((p) => {
    if (p.type === "gate" || !inChunk(p.y, 120)) return;
    const pw = p.w ?? 0;
    const ph = p.h ?? 0;
    c.fillStyle = mix(biome.dirt[0], biome.ground[1], 0.25);
    c.globalAlpha = 0.55;
    blob(c, p.x, p.y - ph * 0.18, pw * 0.6, ph * 0.32, r, 10, 0.12);
    c.fill();
    c.globalAlpha = 1;
  });

  // Dirt road: soft edge → dark rim → surface → light core (wear) → pebbles, footprints
  c.lineJoin = "round";
  c.lineCap = "round";
  const seg = path.filter((p) => inChunk(p.y, 60));
  if (seg.length > 1) {
    (
      [
        [pathW + 22, 0.1],
        [pathW + 12, 0.18],
      ] as [number, number][]
    ).forEach(([w, a]) => {
      c.strokeStyle = biome.dirt[2];
      c.globalAlpha = a;
      c.lineWidth = w;
      strokePoly(c, seg);
      c.stroke();
    });
    c.globalAlpha = 1;
    c.strokeStyle = mix(biome.dirt[2], biome.dirt[1], 0.35);
    c.lineWidth = pathW + 4;
    strokePoly(c, seg);
    c.stroke();
    c.strokeStyle = biome.dirt[1];
    c.lineWidth = pathW;
    strokePoly(c, seg);
    c.stroke();
    c.strokeStyle = biome.dirt[0];
    c.globalAlpha = 0.85;
    c.lineWidth = pathW * 0.55;
    strokePoly(c, seg);
    c.stroke();
    c.globalAlpha = 1;
    map.pathDots.forEach((d) => {
      if (!inChunk(d.y, 10)) return;
      if (d.k === "step") {
        c.fillStyle = "rgba(90,60,30,.16)";
        c.save();
        c.translate(d.x, d.y);
        c.rotate(d.rot ?? 0);
        c.beginPath();
        c.ellipse(0, 0, 3.4, 2, 0, 0, PI2);
        c.fill();
        c.restore();
      } else if (d.k === "pebble") {
        const s = d.s ?? 1;
        c.fillStyle = mix(biome.rock[1], biome.dirt[1], 0.3);
        c.beginPath();
        c.ellipse(d.x, d.y, 2.6 * s, 1.9 * s, 0, 0, PI2);
        c.fill();
        c.fillStyle = "rgba(255,255,255,.4)";
        c.beginPath();
        c.arc(d.x - 0.6, d.y - 0.7, 0.9 * s, 0, PI2);
        c.fill();
      } else {
        c.fillStyle = "rgba(110,80,40,.22)";
        c.beginPath();
        c.arc(d.x, d.y, 1.2 * (d.s ?? 1), 0, PI2);
        c.fill();
      }
    });
  }

  // Rivers: wet bank → sand → shallow water → mid water → deep channel → still ripples
  rivers.forEach((rv) => {
    if (!rv.pts.some((q) => inChunk(q.y, 80))) return;
    c.fillStyle = biome.dirt[2];
    c.globalAlpha = 0.22;
    strokePoly(c, riverEdge(rv, 1, 20), true);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = biome.bank;
    strokePoly(c, riverEdge(rv, 1, 9), true);
    c.fill();
    c.fillStyle = biome.water[0];
    strokePoly(c, riverEdge(rv, 1, 0), true);
    c.fill();
    c.strokeStyle = "rgba(40,90,120,.35)";
    c.lineWidth = 1.6;
    c.stroke();
    c.fillStyle = biome.water[1];
    strokePoly(c, riverEdge(rv, 0.7, 0), true);
    c.fill();
    c.fillStyle = biome.water[2];
    c.globalAlpha = 0.5;
    strokePoly(c, riverEdge(rv, 0.34, 0), true);
    c.fill();
    c.globalAlpha = 0.55;
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.4;
    rv.pts.forEach((q, i) => {
      if (i % 6 || !inChunk(q.y, 20)) return;
      const o = ((i * 37) % 10) / 10 - 0.5;
      const x = q.x + q.nx * q.hw * o;
      const yy = q.y + q.ny * q.hw * o;
      c.beginPath();
      c.moveTo(x - q.ny * 5, yy + q.nx * 5);
      c.quadraticCurveTo(x, yy - 2, x + q.ny * 5, yy - q.nx * 5);
      c.stroke();
    });
    c.globalAlpha = 1;
    // plunge pool under the waterfall
    const g = c.createRadialGradient(rv.headX, rv.headY + 4, 2, rv.headX, rv.headY + 4, 40);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, biome.water[0]);
    g.addColorStop(1, biome.water[1]);
    c.fillStyle = biome.bank;
    blob(c, rv.headX, rv.headY + 6, 46, 22, r);
    c.fill();
    c.fillStyle = g;
    blob(c, rv.headX, rv.headY + 5, 38, 17, r);
    c.fill();
  });
  c.restore();
}
