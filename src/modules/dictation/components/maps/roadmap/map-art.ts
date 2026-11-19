/**
 * Hand-drawn asset kit for the roadmap: every picture is painted with Canvas 2D in the browser (no
 * image downloads) in one consistent style — layered fills (shade → mid → light), soft brown
 * outline, gentle drop shadow. Each level (biome) has its own palette and tree set.
 */
import { uiToken } from "./ui-tokens";

export const PI2 = Math.PI * 2;
export const LINE = "rgba(58, 46, 30, 0.55)";

export type Rng = () => number;
export type Ctx = CanvasRenderingContext2D;
export type Painter = (c: Ctx, w: number, h: number) => void;

/** Seeded pseudo-random numbers: reopening the map draws exactly the same picture. */
export function rng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Noise {
  (x: number, y: number): number;
  fbm: (x: number, y: number, octaves?: number) => number;
}

/** Smooth 2D value noise + fbm — grass carpet, forest density, river banks. */
export function makeNoise(seed: number): Noise {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) {
    perm[i] = i;
    vals[i] = r() * 2 - 1;
  }
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i += 1) perm[i + 256] = perm[i];
  const at = (x: number, y: number) => vals[perm[(x & 255) + perm[y & 255]]];
  const fade = (t: number) => t * t * (3 - 2 * t);
  const noise = ((x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }) as Noise;
  noise.fbm = (x, y, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o += 1) {
      sum += amp * noise(x * f, y * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
  return noise;
}

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export function mix(a: string, b: string, t: number): string {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}
export function mixRgb(a: string, b: string, t: number): number[] {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return A.map((v, i) => v + (B[i] - v) * t);
}

/** Soft closed curve around (cx, cy) — the basic brick of canopies, rocks and bushes. */
export function blob(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  r: Rng,
  n = 9,
  jitter = 0.16,
) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * PI2 + r() * 0.3;
    const k = 1 - jitter + r() * jitter * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  c.beginPath();
  const mid = (p: [number, number], q: [number, number]): [number, number] => [
    (p[0] + q[0]) / 2,
    (p[1] + q[1]) / 2,
  ];
  let m = mid(pts[n - 1], pts[0]);
  c.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    m = mid(p, q);
    c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  c.closePath();
}

function shadow(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.22) {
  const g = c.createRadialGradient(x, y, 1, x, y, rx);
  g.addColorStop(0, `rgba(28, 38, 18, ${a})`);
  g.addColorStop(1, "rgba(28, 38, 18, 0)");
  c.fillStyle = g;
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  c.translate(-x, -y);
  c.beginPath();
  c.arc(x, y, rx, 0, PI2);
  c.fill();
  c.restore();
}

function offscreen(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}

// ─────────────────────────────── Level palettes ───────────────────────────────
type Leaf = [string, string, string, string];
const LEAF: Record<string, Leaf> = {
  green: ["#2f6b34", "#4d8f3f", "#79b956", "#b3dc7c"],
  lime: ["#4f7d2a", "#77a738", "#a9cd54", "#dbe98c"],
  deep: ["#1f5233", "#2f6e3f", "#4f9450", "#86bf6e"],
  teal: ["#24584a", "#357a5c", "#56a072", "#8fcb8f"],
  autumn: ["#8a4b1f", "#c0702b", "#e7a542", "#f6d47a"],
  sage: ["#5d6f3a", "#7f9450", "#a6b86c", "#d0dc98"],
  frost: ["#2d5a54", "#3f7a6c", "#6aa38f", "#bfe0d2"],
};

export type BiomeKey = "meadow" | "beach" | "forest" | "canyon" | "snow";
export type LandmarkKind = "windmill" | "lighthouse" | "tower" | "igloo";
/** [decor kind, weight] for the weighted picker. */
export type WeightedKind = [string, number];

export interface Biome {
  key: BiomeKey;
  name: string;
  ground: [string, string, string, string];
  blade: [string, string];
  dirt: [string, string, string];
  water: [string, string, string];
  bank: string;
  rock: [string, string, string];
  peaks: [string, string, string];
  haze: string;
  snowcap: boolean;
  flowers: string[];
  forest: WeightedKind[];
  open: WeightedKind[];
  landmark: LandmarkKind;
  density?: number;
}

export const BIOMES: Record<number, Biome> = {
  1: {
    key: "meadow",
    name: "Đồng cỏ Khởi hành",
    ground: ["#b9e07f", "#9dd06a", "#83bd57", "#6aa548"],
    blade: ["#5f9c3f", "#c9ea8c"],
    dirt: ["#e7cd98", "#cfac72", "#9b7647"],
    water: ["#a9e4f0", "#6fc6e3", "#3d93c3"],
    bank: "#d9cf98",
    rock: ["#e3ddd0", "#bdb29d", "#8a7e69"],
    peaks: ["#cbbda4", "#9f8f76", "#6e604e"],
    haze: "#cfe3ee",
    snowcap: true,
    flowers: ["#ffffff", "#ffd54a", "#ff9ec0", "#b9a2ff"],
    forest: [
      ["oak", 3],
      ["oakB", 2],
      ["poplar", 1],
      ["birch", 1],
      ["bush", 1],
    ],
    open: [
      ["bush", 2],
      ["tuft", 4],
      ["flowers", 3],
      ["rock", 1],
    ],
    landmark: "windmill",
  },
  2: {
    key: "beach",
    name: "Bờ biển Nắng",
    ground: ["#f3e3ae", "#e6d597", "#cfd087", "#a9c66f"],
    blade: ["#8fae55", "#f4e6b3"],
    dirt: ["#f5e2b5", "#dfc28c", "#b08b56"],
    water: ["#b4f0ef", "#5ccfd6", "#2b9cbc"],
    bank: "#f6e7b8",
    rock: ["#efe6d6", "#cdbfa6", "#9b8b70"],
    peaks: ["#e3cfa6", "#c2a576", "#8e7350"],
    haze: "#d8eef3",
    snowcap: false,
    flowers: ["#ffffff", "#ffb3c7", "#ffd54a"],
    forest: [
      ["palm", 4],
      ["palmB", 2],
      ["bushTrop", 2],
      ["oak", 1],
    ],
    open: [
      ["tuft", 3],
      ["shell", 2],
      ["rock", 1],
      ["bushTrop", 1],
    ],
    landmark: "lighthouse",
    density: 0.75,
  },
  3: {
    key: "forest",
    name: "Rừng Thông Xanh",
    ground: ["#8fc86a", "#77b558", "#5f9e48", "#4c873b"],
    blade: ["#3f7a34", "#a6d27c"],
    dirt: ["#dcc08c", "#bf9a63", "#8d6a40"],
    water: ["#9edbe9", "#5fb6d8", "#337fb3"],
    bank: "#cdbf8b",
    rock: ["#d7d4c9", "#a9a493", "#767160"],
    peaks: ["#a7b29c", "#7c8873", "#53604f"],
    haze: "#c9dde6",
    snowcap: true,
    flowers: ["#ffffff", "#ffd54a", "#e9a1ff"],
    forest: [
      ["pine", 4],
      ["pineB", 3],
      ["oak", 1],
      ["bush", 1],
    ],
    open: [
      ["tuft", 3],
      ["fern", 2],
      ["mushroom", 1],
      ["rock", 1],
    ],
    landmark: "tower",
  },
  4: {
    key: "canyon",
    name: "Hẻm núi Hoàng hôn",
    ground: ["#f1cf96", "#e6bb80", "#d6a56a", "#c08b53"],
    blade: ["#b58b4c", "#f6dca8"],
    dirt: ["#f2d9aa", "#d8b47c", "#a3794a"],
    water: ["#a9e2ea", "#62bcd3", "#3486ad"],
    bank: "#ead3a2",
    rock: ["#efd5b5", "#cf9f75", "#93603e"],
    peaks: ["#e7a271", "#c46d45", "#8a452b"],
    haze: "#f2dcc4",
    snowcap: false,
    flowers: ["#ffd54a", "#ff8f6b", "#ffffff"],
    forest: [
      ["acacia", 2],
      ["cactus", 3],
      ["bushDry", 2],
    ],
    open: [
      ["tuftDry", 3],
      ["rock", 2],
      ["cactusS", 1],
    ],
    landmark: "tower",
    density: 0.55,
  },
  5: {
    key: "snow",
    name: "Đỉnh Tuyết Chinh phục",
    ground: ["#fbfdff", "#eef4f9", "#e0eaf2", "#cfdde9"],
    blade: ["#b9cad8", "#ffffff"],
    dirt: ["#e6ecf1", "#c9d3dc", "#98a6b3"],
    water: ["#d2f3fa", "#93d6ea", "#5aa9cf"],
    bank: "#f4f8fb",
    rock: ["#eef2f6", "#b8c3cf", "#7d8b9a"],
    peaks: ["#e8edf2", "#a9b5c2", "#6c7b8e"],
    haze: "#e6eef6",
    snowcap: true,
    flowers: ["#ffffff", "#cfe8ff"],
    forest: [
      ["snowpine", 4],
      ["snowpineB", 3],
      ["birch", 1],
    ],
    open: [
      ["rockSnow", 2],
      ["tuftSnow", 3],
      ["crystal", 1],
    ],
    landmark: "igloo",
  },
};

// ─────────────────────────────── Trees ───────────────────────────────
function trunk(
  c: Ctx,
  cx: number,
  base: number,
  top: number,
  w: number,
  cols: [string, string] = ["#7a5232", "#a3714a"],
) {
  const g = c.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, cols[1]);
  g.addColorStop(1, cols[0]);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - w * 1.5, base);
  c.quadraticCurveTo(cx - w * 0.8, base - 6, cx - w * 0.7, base - 14);
  c.lineTo(cx - w * 0.5, top);
  c.lineTo(cx + w * 0.5, top);
  c.lineTo(cx + w * 0.7, base - 14);
  c.quadraticCurveTo(cx + w * 0.8, base - 6, cx + w * 1.5, base);
  c.closePath();
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.stroke();
}

type Center = [number, number, number];

/** Layered canopy: outline → dark mass → mid mass → light patch → leaf dots, on an offscreen canvas. */
function canopy(c: Ctx, w: number, h: number, centers: Center[], leaf: Leaf, r: Rng) {
  const off = offscreen(w, h);
  const o = off.getContext("2d")!;
  centers.forEach(([x, y, rad]) => {
    o.fillStyle = LINE;
    blob(o, x, y, rad + 2, rad + 2, r);
    o.fill();
  });
  centers.forEach(([x, y, rad]) => {
    o.fillStyle = leaf[0];
    blob(o, x + 2, y + 3, rad, rad, r);
    o.fill();
  });
  centers.forEach(([x, y, rad]) => {
    o.fillStyle = leaf[1];
    blob(o, x - 1, y - 1, rad * 0.9, rad * 0.88, r);
    o.fill();
  });
  const minY = Math.min(...centers.map((p) => p[1]));
  const maxY = Math.max(...centers.map((p) => p[1]));
  centers.forEach(([x, y, rad]) => {
    if (y > (minY + maxY) / 2 + rad * 0.2) return;
    o.fillStyle = leaf[2];
    blob(o, x - rad * 0.28, y - rad * 0.3, rad * 0.55, rad * 0.5, r);
    o.fill();
  });
  o.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 70; i += 1) {
    const [x, y, rad] = centers[Math.floor(r() * centers.length)];
    const a = r() * PI2;
    const d = r() * rad;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    o.fillStyle = py < (minY + maxY) / 2 ? leaf[3] : leaf[0];
    o.globalAlpha = 0.35 + r() * 0.3;
    o.beginPath();
    o.ellipse(px, py, 2.6 + r() * 2, 1.6 + r(), r() * 3, 0, PI2);
    o.fill();
  }
  o.globalAlpha = 1;
  c.drawImage(off, 0, 0);
}

function paintOak(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng) {
  const cx = w / 2;
  const base = h - 10;
  shadow(c, cx + 6, base, w * 0.38, 10);
  trunk(c, cx, base, h * 0.48, w * 0.07);
  const R = w * 0.36;
  const cy = h * 0.4;
  const pts: Center[] = [
    [0, -0.62, 0.42],
    [-0.48, -0.3, 0.42],
    [0.48, -0.3, 0.42],
    [-0.66, 0.12, 0.36],
    [0.66, 0.12, 0.36],
    [-0.28, 0.3, 0.42],
    [0.28, 0.3, 0.42],
    [0, -0.08, 0.52],
  ];
  canopy(
    c,
    w,
    h,
    pts.map(([x, y, s]) => [
      cx + (x + (r() - 0.5) * 0.1) * R,
      cy + (y + (r() - 0.5) * 0.1) * R,
      s * R,
    ]),
    leaf,
    r,
  );
}

function paintPoplar(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng) {
  const cx = w / 2;
  const base = h - 8;
  shadow(c, cx + 4, base, w * 0.4, 8);
  trunk(c, cx, base, h * 0.6, w * 0.07);
  const pts: Center[] = [];
  for (let i = 0; i < 6; i += 1) {
    pts.push([
      cx + (r() - 0.5) * w * 0.12,
      h * 0.14 + i * h * 0.1,
      w * (0.2 + Math.sin((i / 5) * Math.PI) * 0.12),
    ]);
  }
  canopy(c, w, h, pts, leaf, r);
}

function paintBirch(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng) {
  const cx = w / 2;
  const base = h - 8;
  shadow(c, cx + 4, base, w * 0.34, 8);
  trunk(c, cx, base, h * 0.42, w * 0.055, ["#cfc8bb", "#fbf8f1"]);
  c.fillStyle = "#3d3a35";
  for (let y = base - 16; y > h * 0.5; y -= 9 + r() * 6) {
    c.fillRect(cx - w * 0.04 + r() * 3, y, 4 + r() * 4, 2);
  }
  const R = w * 0.3;
  const cy = h * 0.34;
  const pts: Center[] = [
    [0, -0.6, 0.4],
    [-0.5, -0.2, 0.4],
    [0.5, -0.25, 0.38],
    [-0.3, 0.25, 0.4],
    [0.3, 0.22, 0.42],
    [0, 0, 0.45],
  ];
  canopy(
    c,
    w,
    h,
    pts.map(([x, y, s]) => [cx + x * R, cy + y * R, s * R]),
    leaf,
    r,
  );
}

function paintAcacia(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng) {
  const cx = w / 2;
  const base = h - 8;
  shadow(c, cx + 6, base, w * 0.36, 9);
  c.strokeStyle = "#6b4728";
  c.lineCap = "round";
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(cx, base);
  c.quadraticCurveTo(cx - 2, h * 0.6, cx - w * 0.18, h * 0.38);
  c.moveTo(cx - 1, h * 0.62);
  c.quadraticCurveTo(cx + 6, h * 0.5, cx + w * 0.2, h * 0.36);
  c.stroke();
  const pts: Center[] = [];
  for (let i = 0; i < 7; i += 1) {
    pts.push([cx + (i - 3) * w * 0.11, h * 0.3 + Math.abs(i - 3) * 2 + (r() - 0.5) * 6, w * 0.13]);
  }
  pts.push([cx, h * 0.25, w * 0.15]);
  canopy(c, w, h, pts, leaf, r);
}

function paintBush(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng, berries: string[] | null) {
  const cx = w / 2;
  const base = h - 6;
  shadow(c, cx + 3, base, w * 0.46, 7);
  const pts: Center[] = [
    [-0.26, 0.02, 0.22],
    [0.26, 0.02, 0.22],
    [0, -0.12, 0.25],
    [-0.04, 0.08, 0.26],
  ];
  canopy(
    c,
    w,
    h,
    pts.map(([x, y, s]) => [cx + x * w, base - h * 0.36 + y * h, s * w]),
    leaf,
    r,
  );
  if (berries) {
    for (let i = 0; i < 6; i += 1) {
      c.fillStyle = berries[i % berries.length];
      c.beginPath();
      c.arc(cx + (r() - 0.5) * w * 0.6, base - h * 0.25 - r() * h * 0.35, 2.4, 0, PI2);
      c.fill();
    }
  }
}

function paintPine(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng, snow: boolean) {
  const cx = w / 2;
  const base = h - 8;
  shadow(c, cx + 5, base, w * 0.42, 9);
  trunk(c, cx, base, base - 22, w * 0.07);
  const tiers = 5;
  for (let t = 0; t < tiers; t += 1) {
    const bottom = base - 14 - t * h * 0.14;
    const half = w * 0.46 * (1 - t * 0.15);
    const top = bottom - h * 0.27;
    const pts: [number, number][] = [[cx + (r() - 0.5) * 3, top]];
    const zig = 7;
    for (let k = 0; k <= zig; k += 1) {
      const x = cx + half - (k / zig) * half * 2;
      pts.push([x, bottom + (k % 2 ? -5 : 2) + (r() - 0.5) * 3]);
    }
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    const g = c.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, leaf[2]);
    g.addColorStop(0.45, leaf[1]);
    g.addColorStop(1, leaf[0]);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.6;
    c.stroke();
    c.save();
    c.clip();
    c.fillStyle = leaf[3];
    c.globalAlpha = 0.35;
    for (let i = 0; i < 8; i += 1) {
      c.beginPath();
      c.ellipse(
        cx - half * 0.5 + r() * half * 0.6,
        top + 10 + r() * (bottom - top - 14),
        3,
        1.4,
        -0.6,
        0,
        PI2,
      );
      c.fill();
    }
    c.globalAlpha = 1;
    if (snow) {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.moveTo(cx, top - 2);
      c.lineTo(cx + half * 0.55, top + (bottom - top) * 0.55);
      c.lineTo(cx + half * 0.2, top + (bottom - top) * 0.45);
      c.lineTo(cx - half * 0.1, top + (bottom - top) * 0.62);
      c.lineTo(cx - half * 0.45, top + (bottom - top) * 0.48);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
}

function paintPalm(c: Ctx, w: number, h: number, leaf: Leaf, r: Rng) {
  const base = h - 8;
  const lean = (r() - 0.5) * 18;
  shadow(c, w / 2 + 14, base, w * 0.32, 8);
  const tx = w / 2 + lean;
  const ty = h * 0.3;
  for (let i = 0; i < 9; i += 1) {
    const t = i / 9;
    const x = w / 2 + lean * t * t;
    const y = base - (base - ty) * t;
    c.fillStyle = i % 2 ? "#a7743f" : "#bf8a50";
    c.beginPath();
    c.ellipse(x, y, 6.5 - t * 1.6, 7, 0, 0, PI2);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.2;
    c.stroke();
  }
  const fronds: [number, number][] = [
    [-1, -0.25],
    [1, -0.25],
    [-0.95, 0.35],
    [0.95, 0.35],
    [-0.35, -1],
    [0.4, -0.95],
    [0, 0.6],
  ];
  fronds.forEach(([dx, dy]) => {
    const ex = tx + dx * w * 0.44;
    const ey = ty + dy * h * 0.16 + 12;
    const mx = tx + dx * w * 0.24;
    const my = ty + dy * h * 0.14 - 10;
    c.strokeStyle = leaf[0];
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(tx, ty);
    c.quadraticCurveTo(mx, my, ex, ey);
    c.stroke();
    for (let k = 1; k < 12; k += 1) {
      const t = k / 12;
      const it = 1 - t;
      const px = it * it * tx + 2 * it * t * mx + t * t * ex;
      const py = it * it * ty + 2 * it * t * my + t * t * ey;
      const len = 13 * Math.sin(t * Math.PI) + 3;
      c.strokeStyle = k % 3 ? leaf[1] : leaf[2];
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + dy * len * 0.6 - dx * 2, py + len * 0.8);
      c.stroke();
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px - dy * len * 0.6 - dx * 2, py - len * 0.25 + 3);
      c.stroke();
    }
  });
  ["#7a4f22", "#8d5d2a", "#6b4420"].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(tx - 5 + i * 5, ty + 5 + (i % 2) * 3, 4, 0, PI2);
    c.fill();
  });
}

function paintCactus(c: Ctx, w: number, h: number, r: Rng, small: boolean) {
  const cx = w / 2;
  const base = h - 6;
  shadow(c, cx + 4, base, w * 0.36, 6);
  const body = (x: number, y: number, bw: number, bh: number) => {
    const g = c.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, "#8cc06b");
    g.addColorStop(0.5, "#5f9a4a");
    g.addColorStop(1, "#3f7337");
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(x, y, bw, bh, bw / 2);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = "rgba(30,60,25,.35)";
    c.lineWidth = 1;
    for (let k = 1; k < 3; k += 1) {
      c.beginPath();
      c.moveTo(x + (bw * k) / 3, y + 6);
      c.lineTo(x + (bw * k) / 3, y + bh - 4);
      c.stroke();
    }
  };
  const bw = small ? w * 0.3 : w * 0.24;
  body(cx - bw / 2, small ? h * 0.35 : h * 0.12, bw, base - (small ? h * 0.35 : h * 0.12));
  if (!small) {
    body(cx - bw * 1.9, h * 0.36, bw * 0.72, h * 0.3);
    c.fillStyle = "#5f9a4a";
    c.fillRect(cx - bw * 1.4, h * 0.6, bw, bw * 0.55);
    body(cx + bw * 1.1, h * 0.26, bw * 0.72, h * 0.3);
    c.fillRect(cx + bw * 0.4, h * 0.5, bw * 0.9, bw * 0.55);
  }
  if (r() < 0.6) {
    c.fillStyle = "#ff9fb5";
    c.beginPath();
    c.arc(cx, small ? h * 0.35 : h * 0.12, 4, 0, PI2);
    c.fill();
  }
}

function paintRock(
  c: Ctx,
  w: number,
  h: number,
  pal: [string, string, string],
  r: Rng,
  moss: boolean,
  snow: boolean,
) {
  const cx = w / 2;
  const base = h - 5;
  shadow(c, cx + 4, base, w * 0.48, 6, 0.26);
  c.fillStyle = LINE;
  blob(c, cx, base - h * 0.36, w * 0.44 + 2, h * 0.38 + 2, r, 8, 0.12);
  c.fill();
  c.fillStyle = pal[2];
  blob(c, cx + 1, base - h * 0.34, w * 0.43, h * 0.36, r, 8, 0.12);
  c.fill();
  c.fillStyle = pal[1];
  blob(c, cx - 2, base - h * 0.42, w * 0.38, h * 0.3, r, 8, 0.14);
  c.fill();
  c.fillStyle = pal[0];
  blob(c, cx - w * 0.1, base - h * 0.55, w * 0.22, h * 0.15, r, 7, 0.2);
  c.fill();
  if (moss) {
    c.fillStyle = "#6fa548";
    c.globalAlpha = 0.85;
    blob(c, cx + w * 0.08, base - h * 0.66, w * 0.2, h * 0.1, r);
    c.fill();
    c.globalAlpha = 1;
  }
  if (snow) {
    c.fillStyle = "#ffffff";
    blob(c, cx - 2, base - h * 0.66, w * 0.34, h * 0.14, r);
    c.fill();
  }
}

function paintTuft(
  c: Ctx,
  w: number,
  h: number,
  cols: [string, string],
  r: Rng,
  flowers: string[] | null,
) {
  const base = h - 3;
  for (let i = 0; i < 9; i += 1) {
    const x = w * 0.2 + r() * w * 0.6;
    const len = h * (0.45 + r() * 0.5);
    const bend = (r() - 0.5) * 10;
    c.strokeStyle = i % 3 ? cols[0] : cols[1];
    c.lineWidth = 2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + bend * 0.3, base - len * 0.6, x + bend, base - len);
    c.stroke();
  }
  if (flowers) {
    for (let i = 0; i < 4; i += 1) {
      const x = w * 0.2 + r() * w * 0.6;
      const y = base - h * (0.45 + r() * 0.4);
      c.fillStyle = flowers[Math.floor(r() * flowers.length)];
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * PI2;
        c.beginPath();
        c.arc(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 2, 0, PI2);
        c.fill();
      }
      c.fillStyle = "#f2b53a";
      c.beginPath();
      c.arc(x, y, 1.5, 0, PI2);
      c.fill();
    }
  }
}

function paintFern(c: Ctx, w: number, h: number) {
  const cx = w / 2;
  const base = h - 3;
  [-0.9, -0.45, 0, 0.45, 0.9].forEach((a) => {
    const ex = cx + Math.sin(a) * w * 0.45;
    const ey = base - Math.cos(a) * h * 0.85;
    c.strokeStyle = "#3f7a34";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(cx, base);
    c.quadraticCurveTo(cx + Math.sin(a) * w * 0.15, ey + 10, ex, ey);
    c.stroke();
    for (let k = 1; k < 7; k += 1) {
      const t = k / 7;
      const px = cx + (ex - cx) * t;
      const py = base + (ey - base) * t;
      c.strokeStyle = k % 2 ? "#5e9e45" : "#86c062";
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px - 5 * (1 - t) - 2, py - 3);
      c.moveTo(px, py);
      c.lineTo(px + 5 * (1 - t) + 2, py - 3);
      c.stroke();
    }
  });
}

function paintMushroom(c: Ctx, w: number, h: number) {
  const items: [number, number, number][] = [
    [w * 0.35, h - 4, 1],
    [w * 0.68, h - 3, 0.7],
  ];
  items.forEach(([x, y, s]) => {
    shadow(c, x + 2, y, 9 * s, 3);
    c.fillStyle = "#f4ead6";
    c.beginPath();
    c.roundRect(x - 3.5 * s, y - 14 * s, 7 * s, 14 * s, 3);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.2;
    c.stroke();
    const g = c.createRadialGradient(x - 3, y - 18 * s, 1, x, y - 15 * s, 12 * s);
    g.addColorStop(0, "#f27b62");
    g.addColorStop(1, "#c2412f");
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y - 14 * s, 11 * s, 8 * s, 0, Math.PI, 0);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#fff";
    (
      [
        [-4, -17],
        [3, -19],
        [6, -15],
      ] as [number, number][]
    ).forEach(([dx, dy]) => {
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, 1.6 * s, 0, PI2);
      c.fill();
    });
  });
}

function paintShell(c: Ctx, w: number, h: number) {
  const cx = w / 2;
  const base = h - 3;
  c.fillStyle = "#ffc3cf";
  c.beginPath();
  c.moveTo(cx - 10, base);
  c.quadraticCurveTo(cx, base - 22, cx + 10, base);
  c.closePath();
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.4;
  c.stroke();
  c.strokeStyle = "#e48aa0";
  c.lineWidth = 1;
  [-6, -2, 2, 6].forEach((dx) => {
    c.beginPath();
    c.moveTo(cx, base - 1);
    c.lineTo(cx + dx, base - 13);
    c.stroke();
  });
}

function paintCrystal(c: Ctx, w: number, h: number) {
  const cx = w / 2;
  const base = h - 3;
  shadow(c, cx + 3, base, w * 0.4, 5);
  (
    [
      [-8, 0.7, -0.25],
      [8, 0.6, 0.25],
      [0, 1, 0],
    ] as [number, number, number][]
  ).forEach(([dx, s, rot]) => {
    c.save();
    c.translate(cx + dx, base);
    c.rotate(rot);
    const g = c.createLinearGradient(-8, -h * s, 8, 0);
    g.addColorStop(0, "#f2fdff");
    g.addColorStop(0.55, "#9ee6f2");
    g.addColorStop(1, "#6d96d8");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -h * 0.9 * s);
    c.lineTo(7, -h * 0.65 * s);
    c.lineTo(6, 0);
    c.lineTo(-6, 0);
    c.lineTo(-7, -h * 0.65 * s);
    c.closePath();
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.3;
    c.stroke();
    c.restore();
  });
}

function paintReeds(c: Ctx, w: number, h: number) {
  const base = h - 2;
  for (let i = 0; i < 7; i += 1) {
    const x = 4 + (i * (w - 8)) / 6 + (i % 2) * 2;
    const len = h * (0.55 + (i % 3) * 0.15);
    c.strokeStyle = i % 2 ? "#5e8f3c" : "#7fae4f";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + 2, base - len * 0.6, x + (i % 2 ? 4 : -3), base - len);
    c.stroke();
    if (i % 3 === 0) {
      c.fillStyle = "#7b5233";
      c.beginPath();
      c.roundRect(x - 2, base - len * 0.85, 4.5, 11, 2);
      c.fill();
    }
  }
}

function paintLily(c: Ctx, w: number, h: number) {
  c.fillStyle = "#5fa848";
  c.beginPath();
  c.ellipse(w / 2, h / 2, w * 0.45, h * 0.38, 0, 0.35, PI2 - 0.1);
  c.lineTo(w / 2, h / 2);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(40,80,40,.5)";
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = "#ffc1d3";
  c.beginPath();
  c.arc(w * 0.4, h * 0.42, 3.2, 0, PI2);
  c.fill();
}

// ─────────────────────────────── Mountains ───────────────────────────────
type Pt = [number, number];

function ridgeLine(p0: Pt, p1: Pt, r: Rng, disp: number, depth: number, out: Pt[]) {
  if (depth === 0) {
    out.push(p1);
    return;
  }
  const mx = (p0[0] + p1[0]) / 2 + (r() - 0.5) * disp * 0.45;
  const my = (p0[1] + p1[1]) / 2 + (r() - 0.5) * disp;
  ridgeLine(p0, [mx, my], r, disp * 0.56, depth - 1, out);
  ridgeLine([mx, my], p1, r, disp * 0.56, depth - 1, out);
}

const tracePts = (c: Ctx, pts: Pt[]) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
};

/**
 * One peak: jagged ridge outline (recursive midpoint split), shaded face along the main spine,
 * gullies down the slopes, snow cap following the real outline, darker foot.
 */
function paintPeak(
  c: Ctx,
  bx: number,
  by: number,
  bw: number,
  ph: number,
  cols: [string, string, string],
  r: Rng,
  snow: boolean,
  outline: boolean,
) {
  const peak: Pt = [bx + (r() - 0.5) * bw * 0.22, by - ph];
  // secondary shoulders for an asymmetric silhouette
  const lShoulder: Pt = [bx - bw * (0.18 + r() * 0.1), by - ph * (0.5 + r() * 0.18)];
  const rShoulder: Pt = [bx + bw * (0.16 + r() * 0.12), by - ph * (0.42 + r() * 0.2)];
  const left: Pt[] = [[bx - bw / 2, by]];
  ridgeLine(left[0], lShoulder, r, ph * 0.22, 4, left);
  ridgeLine(lShoulder, peak, r, ph * 0.2, 4, left);
  const right: Pt[] = [peak];
  ridgeLine(peak, rShoulder, r, ph * 0.2, 4, right);
  ridgeLine(rShoulder, [bx + bw / 2, by], r, ph * 0.22, 4, right);
  const pts = [...left, ...right.slice(1)];
  tracePts(c, pts);
  c.closePath();
  const g = c.createLinearGradient(0, by - ph, 0, by);
  g.addColorStop(0, cols[0]);
  g.addColorStop(0.6, cols[1]);
  g.addColorStop(1, mix(cols[1], cols[2], 0.35));
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  // shaded face
  const spine: Pt[] = [peak];
  ridgeLine(peak, [bx + bw * (0.04 + r() * 0.14), by + 6], r, bw * 0.14, 5, spine);
  tracePts(c, spine);
  c.lineTo(bx + bw, by + 6);
  c.lineTo(bx + bw, by - ph - 10);
  c.closePath();
  const sg = c.createLinearGradient(bx, 0, bx + bw / 2, 0);
  sg.addColorStop(0, cols[2]);
  sg.addColorStop(1, mix(cols[2], cols[1], 0.3));
  c.fillStyle = sg;
  c.globalAlpha = 0.82;
  c.fill();
  c.globalAlpha = 1;
  // gullies: run down from the ridge, dark on the lit side, light on the shaded side
  for (let i = 0; i < 9; i += 1) {
    const src = left[Math.floor(left.length * (0.35 + r() * 0.6))];
    const len = ph * (0.18 + r() * 0.3);
    const x0 = src[0] + 6;
    const y0 = src[1] + 8;
    c.strokeStyle = cols[2];
    c.globalAlpha = 0.3;
    c.lineWidth = 1.4 + r();
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x0 + len * 0.25, y0 + len * 0.5, x0 + len * 0.2 + (r() - 0.5) * 8, y0 + len);
    c.stroke();
  }
  for (let i = 0; i < 6; i += 1) {
    const src = right[Math.floor(right.length * (0.1 + r() * 0.6))];
    const len = ph * (0.15 + r() * 0.25);
    c.strokeStyle = cols[0];
    c.globalAlpha = 0.18;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(src[0] - 6, src[1] + 8);
    c.quadraticCurveTo(src[0] - 4, src[1] + len * 0.5, src[0] - 10, src[1] + len);
    c.stroke();
  }
  c.globalAlpha = 1;
  // soft light from the upper left
  const hl = c.createRadialGradient(
    bx - bw * 0.2,
    by - ph * 0.7,
    2,
    bx - bw * 0.2,
    by - ph * 0.7,
    bw * 0.45,
  );
  hl.addColorStop(0, "rgba(255,255,255,.22)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = hl;
  c.fillRect(bx - bw, by - ph - 10, bw * 2, ph + 20);
  if (snow) {
    const capY = by - ph * (0.66 + r() * 0.1);
    const idx = pts.map((p, i) => (p[1] < capY ? i : -1)).filter((i) => i >= 0);
    if (idx.length > 2) {
      const cap = pts.slice(idx[0], idx[idx.length - 1] + 1);
      const a = cap[cap.length - 1];
      const b = cap[0];
      const n = 8;
      for (let k = 1; k < n; k += 1) {
        const t = k / n;
        cap.push([
          a[0] + (b[0] - a[0]) * t,
          capY + (k % 2 ? 9 : -5) + (r() - 0.5) * 8 + Math.sin(t * Math.PI) * ph * 0.06,
        ]);
      }
      tracePts(c, cap);
      c.closePath();
      c.fillStyle = "#fbfdff";
      c.fill();
      c.save();
      c.clip();
      tracePts(c, spine);
      c.lineTo(bx + bw, by);
      c.lineTo(bx + bw, by - ph - 10);
      c.closePath();
      c.fillStyle = "rgba(150,175,210,.5)";
      c.fill();
      c.restore();
    }
  }
  const ao = c.createLinearGradient(0, by - ph * 0.3, 0, by);
  ao.addColorStop(0, "rgba(30,25,15,0)");
  ao.addColorStop(1, "rgba(30,25,15,.18)");
  c.fillStyle = ao;
  c.fillRect(bx - bw, by - ph * 0.3, bw * 2, ph * 0.3 + 6);
  c.restore();
  if (outline) {
    tracePts(c, pts);
    c.strokeStyle = LINE;
    c.lineWidth = 1.6;
    c.stroke();
  }
}

export interface RangeOptions {
  /** Leave a rock cleft in the middle for a waterfall. */
  fall?: boolean;
  /** Cave mouth at the foot of the near layer. */
  cave?: boolean;
  /** Full-width range across the top of the map. */
  wide?: boolean;
}

/**
 * A three-layer mountain range (hazy far → middle → near with cliffs and a grassy foot).
 */
export function paintRange(
  c: Ctx,
  w: number,
  h: number,
  biome: Biome,
  r: Rng,
  { fall = false, cave = false, wide = false }: RangeOptions = {},
) {
  const P = biome.peaks;
  const foot = h - 26;
  const tint = (t: number): [string, string, string] => [
    mix(P[0], biome.haze, t),
    mix(P[1], biome.haze, t),
    mix(P[2], biome.haze, t),
  ];
  // every layer touches the foot of the range (no floating peaks); far layers taller + hazier
  const layers = [
    { n: wide ? 8 : 3, hMin: 0.66, hMax: 0.9, cols: tint(0.58), base: foot - 4 },
    { n: wide ? 7 : 3, hMin: 0.48, hMax: 0.68, cols: tint(0.28), base: foot - 4 },
    { n: wide ? 6 : fall ? 3 : 2, hMin: 0.28, hMax: 0.42, cols: P, base: foot - 4 },
  ];
  layers.forEach((L, li) => {
    const slot = w / L.n;
    for (let i = 0; i < L.n; i += 1) {
      let bx = slot * (i + 0.5) + (r() - 0.5) * slot * 0.5;
      const center = fall && li === 2 && i === 1;
      if (fall && li === 2) bx = [w * 0.2, w * 0.5, w * 0.8][i];
      let bw = center ? w * 0.62 : slot * (1.4 + r() * 0.7);
      // single clusters: the foot must not spill over the texture edge (no straight cut)
      if (!wide) bw = Math.min(bw, 2 * Math.max(20, Math.min(bx, w - bx)) - 6);
      const ph = center ? Math.max(h * 0.66, 176) : h * (L.hMin + r() * (L.hMax - L.hMin));
      paintPeak(
        c,
        bx,
        L.base,
        bw,
        ph,
        L.cols,
        r,
        biome.snowcap && (li < 2 || ph > h * 0.4),
        li === 2,
      );
    }
    if (li < 2) {
      // haze band at the foot of the far layers separates the layers
      const hz = c.createLinearGradient(0, L.base - h * 0.5, 0, L.base + 4);
      hz.addColorStop(0, "rgba(255,255,255,0)");
      hz.addColorStop(1, mix(biome.haze, "#ffffff", 0.4));
      c.globalCompositeOperation = "source-atop";
      c.globalAlpha = 0.6;
      c.fillStyle = hz;
      c.fillRect(0, L.base - h * 0.5, w, h * 0.5 + 4);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
    }
  });
  // Near cliffs + foot; single clusters taper the cliff towards both ends
  const x0 = wide ? 0 : w * 0.05;
  const x1 = wide ? w : w * 0.95;
  const taper = (x: number) =>
    wide ? 1 : Math.sin(Math.PI * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))) ** 0.45;
  c.beginPath();
  c.moveTo(x0, foot + 8);
  for (let x = x0; x <= x1; x += 14) {
    c.lineTo(x, foot + 8 - (30 + Math.sin(x * 0.07) * 5 + (r() - 0.5) * 6) * taper(x));
  }
  c.lineTo(x1, foot + 8);
  c.closePath();
  const cg = c.createLinearGradient(0, foot - 26, 0, foot + 8);
  cg.addColorStop(0, P[1]);
  cg.addColorStop(1, P[2]);
  c.fillStyle = cg;
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.stroke();
  c.strokeStyle = P[0];
  c.globalAlpha = 0.45;
  c.lineWidth = 1.2;
  for (let i = 0; i < w / 26; i += 1) {
    const x = x0 + 20 + r() * (x1 - x0 - 40);
    const y = foot - 12 + r() * 14;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 10 + r() * 14, y + 1);
    c.stroke();
  }
  c.globalAlpha = 1;
  // grass / snow creeping over the cliff foot to blend into the ground
  for (let x = x0 - 10; x < x1 + 10; x += 14 + r() * 10) {
    c.fillStyle = mix(biome.ground[1], biome.ground[2], r());
    blob(c, x, foot + 12, 16 + r() * 12, 9 + r() * 6, r);
    c.fill();
  }
  // a few small pines on the lower slopes
  if (biome.key !== "canyon" && biome.key !== "beach") {
    for (let i = 0; i < (wide ? 22 : 7); i += 1) {
      const x = 12 + r() * (w - 24);
      const y = foot - 24 - r() * 34;
      const s = 0.5 + r() * 0.5;
      c.fillStyle = biome.key === "snow" ? "#3f7a6c" : "#3f7a3c";
      c.beginPath();
      c.moveTo(x, y - 18 * s);
      c.lineTo(x + 7 * s, y);
      c.lineTo(x - 7 * s, y);
      c.closePath();
      c.fill();
      c.strokeStyle = LINE;
      c.lineWidth = 1;
      c.stroke();
    }
  }
  if (fall) {
    // jagged dark cleft on the middle peak where the waterfall pours out
    const g = c.createLinearGradient(w / 2 - 22, 0, w / 2 + 22, 0);
    g.addColorStop(0, P[2]);
    g.addColorStop(0.5, mix(P[2], "#2a241b", 0.6));
    g.addColorStop(1, P[2]);
    const L: Pt[] = [];
    const R: Pt[] = [];
    for (let k = 0; k <= 8; k += 1) {
      const t = k / 8;
      const y = foot - 132 + t * 138;
      const half = 6 + t * 9;
      L.push([w / 2 - half - r() * 4, y]);
      R.push([w / 2 + half + r() * 4, y]);
    }
    c.fillStyle = g;
    c.beginPath();
    [...L, ...R.reverse()].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.2;
    c.stroke();
  }
  if (cave) {
    const x = w * 0.22;
    const y = foot + 2;
    c.fillStyle = P[2];
    c.beginPath();
    c.ellipse(x, y - 18, 30, 30, 0, Math.PI, 0);
    c.lineTo(x + 30, y);
    c.lineTo(x - 30, y);
    c.closePath();
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 2;
    c.stroke();
    const g = c.createRadialGradient(x, y - 4, 2, x, y - 10, 24);
    g.addColorStop(0, "#0f0d0a");
    g.addColorStop(1, "#3a3127");
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y - 14, 20, 22, 0, Math.PI, 0);
    c.lineTo(x + 20, y);
    c.lineTo(x - 20, y);
    c.closePath();
    c.fill();
  }
}

// ─────────────────────────────── Buildings ───────────────────────────────
function house(
  c: Ctx,
  x: number,
  base: number,
  s: number,
  roof: [string, string],
  wall: string,
  r: Rng,
) {
  shadow(c, x + 8 * s, base, 34 * s, 7 * s);
  const w = 46 * s;
  const hh = 30 * s;
  c.fillStyle = wall;
  c.beginPath();
  c.rect(x - w / 2, base - hh, w, hh);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = "rgba(0,0,0,.12)";
  c.fillRect(x + w * 0.18, base - hh, w * 0.32, hh);
  c.fillStyle = "#7b5233";
  c.beginPath();
  c.roundRect(x - 6 * s, base - 17 * s, 12 * s, 17 * s, [5 * s, 5 * s, 0, 0]);
  c.fill();
  c.stroke();
  c.fillStyle = "#ffe7a3";
  c.beginPath();
  c.rect(x - w * 0.38, base - hh * 0.72, 9 * s, 8 * s);
  c.rect(x + w * 0.2, base - hh * 0.72, 9 * s, 8 * s);
  c.fill();
  c.stroke();
  const rg = c.createLinearGradient(x - w, 0, x + w, 0);
  rg.addColorStop(0, roof[0]);
  rg.addColorStop(1, roof[1]);
  c.fillStyle = rg;
  c.beginPath();
  c.moveTo(x - w / 2 - 7 * s, base - hh + 2);
  c.lineTo(x, base - hh - 26 * s);
  c.lineTo(x + w / 2 + 7 * s, base - hh + 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = "rgba(0,0,0,.18)";
  c.lineWidth = 1;
  for (let k = 1; k < 4; k += 1) {
    c.beginPath();
    c.moveTo(x - w / 2 - 7 * s + k * 5 * s, base - hh + 2 - k * 6 * s);
    c.lineTo(x + w / 2 + 7 * s - k * 5 * s, base - hh + 2 - k * 6 * s);
    c.stroke();
  }
  c.fillStyle = "#9b8b78";
  c.beginPath();
  c.rect(x + w * 0.18 + r() * 4, base - hh - 22 * s, 6 * s, 12 * s);
  c.fill();
  c.stroke();
}

function fence(c: Ctx, x0: number, x1: number, y: number) {
  c.strokeStyle = "#8a6240";
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(x0, y - 9);
  c.lineTo(x1, y - 9);
  c.moveTo(x0, y - 4);
  c.lineTo(x1, y - 4);
  c.stroke();
  for (let x = x0; x <= x1; x += 10) {
    c.fillStyle = "#a77a4f";
    c.beginPath();
    c.roundRect(x - 2, y - 14, 4, 14, 1.5);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    c.stroke();
  }
}

export function paintVillage(c: Ctx, w: number, h: number, biome: Biome, r: Rng) {
  const snow = biome.key === "snow";
  const roofs: [string, string][] = [
    ["#d9654b", "#a8412f"],
    ["#5b88c7", "#3b5f99"],
    ["#c98a3e", "#9a6426"],
  ];
  const wall = snow ? "#efe6d6" : "#f3e6c9";
  fence(c, 8, w * 0.42, h - 8);
  house(c, w * 0.28, h - 34, 1, roofs[0], wall, r);
  house(c, w * 0.7, h - 22, 1.15, roofs[1], wall, r);
  house(c, w * 0.42, h - 6, 0.85, roofs[2], wall, r);
  if (snow) {
    c.fillStyle = "#fff";
    (
      [
        [w * 0.28, h - 34, 1],
        [w * 0.7, h - 22, 1.15],
        [w * 0.42, h - 6, 0.85],
      ] as [number, number, number][]
    ).forEach(([x, b, s]) => {
      c.beginPath();
      c.moveTo(x - 20 * s, b - 32 * s);
      c.lineTo(x, b - 56 * s);
      c.lineTo(x + 20 * s, b - 32 * s);
      c.closePath();
      c.fill();
    });
  }
  // well
  const wx = w * 0.88;
  const wy = h - 6;
  shadow(c, wx + 4, wy, 16, 4);
  c.fillStyle = "#b9b0a0";
  c.beginPath();
  c.roundRect(wx - 11, wy - 14, 22, 14, 3);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.4;
  c.stroke();
  c.strokeStyle = "#7b5233";
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(wx - 9, wy - 14);
  c.lineTo(wx - 9, wy - 32);
  c.lineTo(wx + 9, wy - 32);
  c.lineTo(wx + 9, wy - 14);
  c.stroke();
  c.fillStyle = "#c4553d";
  c.beginPath();
  c.moveTo(wx - 14, wy - 30);
  c.lineTo(wx, wy - 40);
  c.lineTo(wx + 14, wy - 30);
  c.closePath();
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.2;
  c.stroke();
}

export function paintCamp(c: Ctx, w: number, h: number, biome: Biome) {
  const base = h - 10;
  const tx = w * 0.36;
  shadow(c, tx + 10, base, 46, 8);
  const tg = c.createLinearGradient(tx - 40, 0, tx + 40, 0);
  tg.addColorStop(0, biome.key === "snow" ? "#e5683f" : "#f0a24a");
  tg.addColorStop(0.5, biome.key === "snow" ? "#c94f2c" : "#d9822f");
  tg.addColorStop(0.51, "#b8642a");
  tg.addColorStop(1, "#9c5223");
  c.fillStyle = tg;
  c.beginPath();
  c.moveTo(tx - 42, base);
  c.lineTo(tx, base - 56);
  c.lineTo(tx + 42, base);
  c.closePath();
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = "#4a2e1a";
  c.beginPath();
  c.moveTo(tx - 11, base);
  c.lineTo(tx, base - 30);
  c.lineTo(tx + 11, base);
  c.closePath();
  c.fill();
  c.strokeStyle = "#7b5233";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(tx, base - 56);
  c.lineTo(tx, base - 64);
  c.stroke();
  c.fillStyle = "#ffd54a";
  c.beginPath();
  c.moveTo(tx, base - 64);
  c.lineTo(tx + 12, base - 60);
  c.lineTo(tx, base - 56);
  c.closePath();
  c.fill();
  // seating logs + fire ring (the flame is a separate animated sprite)
  const fx = w * 0.74;
  c.fillStyle = "#8a5d36";
  c.beginPath();
  c.roundRect(fx - 46, base - 6, 26, 9, 4);
  c.roundRect(fx + 20, base - 2, 26, 9, 4);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.2;
  c.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * PI2;
    c.fillStyle = i % 2 ? "#bdb29d" : "#a39882";
    c.beginPath();
    c.ellipse(fx + Math.cos(a) * 13, base - 4 + Math.sin(a) * 6, 4.5, 3.4, 0, 0, PI2);
    c.fill();
    c.stroke();
  }
  c.strokeStyle = "#6b4728";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(fx - 8, base - 2);
  c.lineTo(fx + 8, base - 8);
  c.moveTo(fx + 8, base - 2);
  c.lineTo(fx - 8, base - 8);
  c.stroke();
}

export function paintFlame(c: Ctx, w: number, h: number) {
  const g = c.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.6, h * 0.6);
  g.addColorStop(0, "#fff6c2");
  g.addColorStop(0.35, "#ffc84a");
  g.addColorStop(0.75, "#f0742e");
  g.addColorStop(1, "rgba(240,116,46,0)");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(w / 2, 2);
  c.quadraticCurveTo(w * 0.95, h * 0.6, w / 2, h - 2);
  c.quadraticCurveTo(w * 0.05, h * 0.6, w / 2, 2);
  c.fill();
}

export function paintGate(c: Ctx, w: number, h: number, biome: Biome) {
  const wood: [string, string] =
    biome.key === "snow" ? ["#8a6a52", "#6b4d38"] : ["#b07a47", "#80552f"];
  const post = (x: number) => {
    shadow(c, x + 4, h - 4, 12, 4);
    const g = c.createLinearGradient(x - 7, 0, x + 7, 0);
    g.addColorStop(0, wood[0]);
    g.addColorStop(1, wood[1]);
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(x - 7, 16, 14, h - 20, 3);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.6;
    c.stroke();
    c.fillStyle = "#9d9583";
    c.beginPath();
    c.roundRect(x - 10, h - 14, 20, 10, 3);
    c.fill();
    c.stroke();
  };
  post(14);
  post(w - 14);
  c.fillStyle = wood[1];
  c.beginPath();
  c.roundRect(2, 8, w - 4, 14, 4);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = wood[0];
  c.beginPath();
  c.roundRect(10, 26, w - 20, 8, 3);
  c.fill();
  c.stroke();
  // bunting
  ["#e0574b", "#ffd54a", "#5b9bd5", "#6fbf5a"].forEach((col, i) => {
    const x = 24 + i * ((w - 48) / 3);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - 7, 34);
    c.lineTo(x + 7, 34);
    c.lineTo(x, 48);
    c.closePath();
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    c.stroke();
  });
}

export function paintSignpost(c: Ctx, w: number, h: number) {
  shadow(c, w / 2 + 4, h - 3, 12, 4);
  c.fillStyle = "#8a5d36";
  c.beginPath();
  c.roundRect(w / 2 - 3, 10, 6, h - 12, 2);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.3;
  c.stroke();
  const board = (y: number, dir: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    if (dir > 0) {
      c.moveTo(w / 2 - 4, y);
      c.lineTo(w - 10, y);
      c.lineTo(w - 2, y + 7);
      c.lineTo(w - 10, y + 14);
      c.lineTo(w / 2 - 4, y + 14);
    } else {
      c.moveTo(w / 2 + 4, y);
      c.lineTo(10, y);
      c.lineTo(2, y + 7);
      c.lineTo(10, y + 14);
      c.lineTo(w / 2 + 4, y + 14);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "rgba(60,40,20,.4)";
    c.beginPath();
    c.moveTo(dir > 0 ? w / 2 + 4 : w / 2 - 4, y + 7);
    c.lineTo(dir > 0 ? w - 14 : 14, y + 7);
    c.stroke();
    c.strokeStyle = LINE;
  };
  board(12, 1, "#c99255");
  board(30, -1, "#b98149");
}

export function paintLandmark(c: Ctx, w: number, h: number, kind: LandmarkKind, biome: Biome) {
  const cx = w / 2;
  const base = h - 10;
  shadow(c, cx + 10, base, w * 0.36, 9);
  const line = () => {
    c.strokeStyle = LINE;
    c.lineWidth = 1.8;
    c.stroke();
  };
  if (kind === "windmill") {
    const g = c.createLinearGradient(cx - 26, 0, cx + 26, 0);
    g.addColorStop(0, "#f6ead2");
    g.addColorStop(1, "#d4c3a3");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - 26, base);
    c.lineTo(cx - 16, base - 92);
    c.lineTo(cx + 16, base - 92);
    c.lineTo(cx + 26, base);
    c.closePath();
    c.fill();
    line();
    c.fillStyle = "#b5523c";
    c.beginPath();
    c.moveTo(cx - 22, base - 90);
    c.quadraticCurveTo(cx, base - 124, cx + 22, base - 90);
    c.closePath();
    c.fill();
    line();
    c.fillStyle = "#7b5233";
    c.beginPath();
    c.roundRect(cx - 7, base - 22, 14, 22, [6, 6, 0, 0]);
    c.fill();
    line();
    c.fillStyle = "#ffe7a3";
    c.beginPath();
    c.arc(cx, base - 60, 6, 0, PI2);
    c.fill();
    line();
  } else if (kind === "lighthouse") {
    c.fillStyle = "#b9b0a0";
    c.beginPath();
    c.ellipse(cx, base - 4, 34, 10, 0, 0, PI2);
    c.fill();
    line();
    for (let i = 0; i < 5; i += 1) {
      const y0 = base - 6 - i * 22;
      const wTop = 17 - (i + 1) * 1.6;
      const wBot = 17 - i * 1.6;
      c.fillStyle = i % 2 ? "#ffffff" : "#d9493c";
      c.beginPath();
      c.moveTo(cx - wBot, y0);
      c.lineTo(cx - wTop, y0 - 22);
      c.lineTo(cx + wTop, y0 - 22);
      c.lineTo(cx + wBot, y0);
      c.closePath();
      c.fill();
      line();
    }
    c.fillStyle = "#ffe680";
    c.beginPath();
    c.rect(cx - 9, base - 132, 18, 16);
    c.fill();
    line();
    c.fillStyle = "#d9493c";
    c.beginPath();
    c.moveTo(cx - 13, base - 132);
    c.lineTo(cx, base - 146);
    c.lineTo(cx + 13, base - 132);
    c.closePath();
    c.fill();
    line();
  } else if (kind === "igloo") {
    const g = c.createRadialGradient(cx - 14, base - 40, 4, cx, base - 20, 50);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#bcd2e4");
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, base, 48, 44, 0, Math.PI, 0);
    c.closePath();
    c.fill();
    line();
    c.strokeStyle = "rgba(120,150,180,.5)";
    c.lineWidth = 1.2;
    [12, 24, 34].forEach((dy) => {
      c.beginPath();
      c.ellipse(cx, base, 48 - dy * 0.15, 44 - dy, 0, Math.PI, 0);
      c.stroke();
    });
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(cx + 30, base, 18, 22, 0, Math.PI, 0);
    c.closePath();
    c.fill();
    line();
    c.fillStyle = "#3d5568";
    c.beginPath();
    c.ellipse(cx + 30, base, 10, 14, 0, Math.PI, 0);
    c.closePath();
    c.fill();
  } else {
    // wooden watchtower
    const wood = biome.key === "canyon" ? "#9a6a3f" : "#8a5d36";
    c.strokeStyle = wood;
    c.lineWidth = 6;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(cx - 24, base);
    c.lineTo(cx - 14, base - 78);
    c.moveTo(cx + 24, base);
    c.lineTo(cx + 14, base - 78);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx - 22, base - 14);
    c.lineTo(cx + 18, base - 60);
    c.moveTo(cx + 22, base - 14);
    c.lineTo(cx - 18, base - 60);
    c.stroke();
    c.fillStyle = "#b98149";
    c.beginPath();
    c.roundRect(cx - 26, base - 96, 52, 22, 3);
    c.fill();
    line();
    c.fillStyle = biome.key === "canyon" ? "#c4553d" : "#3f7a3c";
    c.beginPath();
    c.moveTo(cx - 32, base - 96);
    c.lineTo(cx, base - 124);
    c.lineTo(cx + 32, base - 96);
    c.closePath();
    c.fill();
    line();
  }
}

export function paintWindmillBlades(c: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 4; i += 1) {
    c.save();
    c.translate(cx, cy);
    c.rotate((i * Math.PI) / 2);
    c.fillStyle = "#f4ead6";
    c.beginPath();
    c.rect(4, -6, w * 0.42, 12);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.4;
    c.stroke();
    c.strokeStyle = "rgba(90,70,50,.5)";
    c.beginPath();
    for (let x = 10; x < w * 0.42; x += 7) {
      c.moveTo(x, -6);
      c.lineTo(x, 6);
    }
    c.stroke();
    c.restore();
  }
  c.fillStyle = "#7b5233";
  c.beginPath();
  c.arc(cx, cy, 5, 0, PI2);
  c.fill();
}

export function paintBridge(c: Ctx, w: number, h: number) {
  // vertical bridge (the path runs along y): planks + beams + railings
  c.fillStyle = "rgba(20,40,60,.25)";
  c.beginPath();
  c.roundRect(12, 10, w - 14, h - 14, 6);
  c.fill();
  c.fillStyle = "#6b4728";
  c.fillRect(14, 4, 8, h - 8);
  c.fillRect(w - 22, 4, 8, h - 8);
  for (let y = 8; y < h - 10; y += 11) {
    c.fillStyle = (y / 11) % 2 < 1 ? "#c08a52" : "#b07b45";
    c.beginPath();
    c.roundRect(18, y, w - 36, 10, 2.5);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 1.2;
    c.stroke();
  }
  [10, w - 10].forEach((x) => {
    c.strokeStyle = "#7b5233";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, 2);
    c.lineTo(x, h - 4);
    c.stroke();
    for (let y = 2; y <= h - 6; y += (h - 8) / 4) {
      c.fillStyle = "#8a5d36";
      c.beginPath();
      c.roundRect(x - 5, y - 2, 10, 12, 3);
      c.fill();
      c.strokeStyle = LINE;
      c.lineWidth = 1.2;
      c.stroke();
    }
  });
}

export function paintFall(c: Ctx, w: number, h: number) {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#9fdcef");
  g.addColorStop(0.5, "#e9fbff");
  g.addColorStop(1, "#8fd0e8");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i += 1) {
    const x = (i / 14) * w + 1;
    const y = (i * 37) % h;
    c.strokeStyle = i % 2 ? "rgba(255,255,255,.85)" : "rgba(70,150,200,.45)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y + 18 + (i % 3) * 8);
    c.stroke();
    c.beginPath();
    c.moveTo(x, y - h);
    c.lineTo(x, y - h + 18 + (i % 3) * 8);
    c.stroke();
  }
}

export function paintCloudShadow(c: Ctx, w: number, h: number) {
  (
    [
      [0.35, 0.5, 0.32],
      [0.6, 0.45, 0.34],
      [0.5, 0.62, 0.3],
    ] as [number, number, number][]
  ).forEach(([x, y, s]) => {
    const g = c.createRadialGradient(w * x, h * y, 2, w * x, h * y, w * s);
    g.addColorStop(0, "rgba(20,40,30,.55)");
    g.addColorStop(1, "rgba(20,40,30,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

/** Stage pedestal in three states — a rounded stone slab with a soft outline. */
export function paintNode(c: Ctx, w: number, h: number, face: string, hi: string, side: string) {
  shadow(c, w / 2 + 4, h - 12, w * 0.44, 12, 0.3);
  c.fillStyle = side;
  c.beginPath();
  c.ellipse(w / 2, h * 0.58, w * 0.42, h * 0.34, 0, 0, PI2);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 2.4;
  c.stroke();
  const g = c.createRadialGradient(w * 0.38, h * 0.3, 3, w / 2, h * 0.46, w * 0.46);
  g.addColorStop(0, hi);
  g.addColorStop(1, face);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(w / 2, h * 0.47, w * 0.42, h * 0.34, 0, 0, PI2);
  c.fill();
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,.55)";
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(w / 2, h * 0.47, w * 0.32, h * 0.25, 0, Math.PI * 1.05, Math.PI * 1.6);
  c.stroke();
}

export function paintStar(c: Ctx, w: number, on: boolean) {
  c.fillStyle = on ? uiToken("--ui-mark-bright", "#f2c14e") : "rgba(255,255,255,.75)";
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rr = i % 2 ? w * 0.2 : w * 0.46;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(w / 2 + rr * Math.cos(a), w / 2 + rr * Math.sin(a));
  }
  c.closePath();
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.stroke();
}

export function paintTrophy(c: Ctx, w: number, h: number) {
  shadow(c, w / 2 + 6, h - 6, w * 0.42, 9);
  c.fillStyle = "#9a6a3f";
  c.beginPath();
  c.roundRect(w * 0.16, h - 30, w * 0.68, 24, 6);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 2;
  c.stroke();
  const g = c.createLinearGradient(0, 10, 0, h - 30);
  g.addColorStop(0, "#ffe592");
  g.addColorStop(1, "#e19b16");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(w * 0.28, 12);
  c.lineTo(w * 0.72, 12);
  c.quadraticCurveTo(w * 0.72, h * 0.52, w / 2, h * 0.56);
  c.quadraticCurveTo(w * 0.28, h * 0.52, w * 0.28, 12);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.rect(w / 2 - 6, h * 0.55, 12, h * 0.16);
  c.fill();
  c.stroke();
  c.lineWidth = 4;
  c.strokeStyle = "#c98a1a";
  c.beginPath();
  c.arc(w * 0.26, 28, 9, Math.PI / 2, Math.PI * 1.5);
  c.stroke();
  c.beginPath();
  c.arc(w * 0.74, 28, 9, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  c.fillStyle = "rgba(255,255,255,.6)";
  c.beginPath();
  c.ellipse(w * 0.4, 26, 5, 10, 0, 0, PI2);
  c.fill();
}

export function paintCastle(c: Ctx, w: number, h: number) {
  shadow(c, w / 2 + 8, h - 6, w * 0.46, 12);
  const stone = (x: number, y: number, ww: number, hh: number) => {
    const g = c.createLinearGradient(x, 0, x + ww, 0);
    g.addColorStop(0, "#f1e9d8");
    g.addColorStop(1, "#c9bda3");
    c.fillStyle = g;
    c.beginPath();
    c.rect(x, y, ww, hh);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 2;
    c.stroke();
    for (let i = x; i < x + ww - 6; i += 14) {
      c.fillStyle = "#e6dcc6";
      c.beginPath();
      c.rect(i + 2, y - 10, 9, 10);
      c.fill();
      c.stroke();
    }
  };
  stone(w * 0.08, h * 0.38, w * 0.22, h * 0.58);
  stone(w * 0.7, h * 0.38, w * 0.22, h * 0.58);
  stone(w * 0.26, h * 0.5, w * 0.48, h * 0.46);
  (
    [
      [w * 0.19, h * 0.38],
      [w * 0.81, h * 0.38],
    ] as [number, number][]
  ).forEach(([x, y]) => {
    c.fillStyle = "#3f6fb5";
    c.beginPath();
    c.moveTo(x - 26, y - 8);
    c.lineTo(x, y - 52);
    c.lineTo(x + 26, y - 8);
    c.closePath();
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#e0574b";
    c.beginPath();
    c.moveTo(x, y - 52);
    c.lineTo(x, y - 74);
    c.lineTo(x + 16, y - 68);
    c.lineTo(x, y - 62);
    c.fill();
  });
  c.fillStyle = "#5a3d24";
  c.beginPath();
  c.moveTo(w * 0.42, h - 4);
  c.lineTo(w * 0.42, h * 0.74);
  c.arc(w / 2, h * 0.74, w * 0.08, Math.PI, 0);
  c.lineTo(w * 0.58, h - 4);
  c.closePath();
  c.fill();
  c.fillStyle = "#ffe7a3";
  (
    [
      [w * 0.17, h * 0.55],
      [w * 0.79, h * 0.55],
      [w * 0.36, h * 0.62],
      [w * 0.6, h * 0.62],
    ] as [number, number][]
  ).forEach(([x, y]) => {
    c.beginPath();
    c.roundRect(x, y, 10, 14, [5, 5, 0, 0]);
    c.fill();
  });
}

export function paintSign(c: Ctx, w: number, h: number) {
  c.fillStyle = "#7b5233";
  c.fillRect(w * 0.16, h * 0.6, 10, h * 0.4);
  c.fillRect(w * 0.8, h * 0.6, 10, h * 0.4);
  const g = c.createLinearGradient(0, 0, 0, h * 0.75);
  g.addColorStop(0, "#d39c5e");
  g.addColorStop(1, "#a86f3b");
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(4, 4, w - 8, h * 0.68, 12);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 2.4;
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,.25)";
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(10, 10, w - 20, h * 0.68 - 12, 9);
  c.stroke();
}

/** Create a canvas texture in the scene (skipped when it already exists). */
export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: Painter) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return key;
  draw(tex.getContext(), w, h);
  tex.refresh();
  return key;
}

/** Variant texture keys per decor kind. */
export type ArtVariants = Record<string, string[]>;

/** Pre-paint every tree / scenery / building texture for a level; returns the variant lists. */
export function buildArt(scene: Phaser.Scene, biome: Biome): ArtVariants {
  const r = rng(biome.key.length * 977 + 13);
  const variants: ArtVariants = {};
  const add = (
    kind: string,
    n: number,
    w: number,
    h: number,
    fn: (c: Ctx, w: number, h: number, rr: Rng) => void,
  ) => {
    variants[kind] = [];
    for (let i = 0; i < n; i += 1) {
      variants[kind].push(
        canvasTex(scene, `${kind}-${i}`, w, h, (c) => fn(c, w, h, rng(Math.floor(r() * 1e9)))),
      );
    }
  };
  const leafMain =
    biome.key === "forest" ? LEAF.deep : biome.key === "snow" ? LEAF.frost : LEAF.green;
  add("oak", 3, 112, 128, (c, w, h, rr) =>
    paintOak(c, w, h, rr() < 0.5 ? leafMain : LEAF.green, rr),
  );
  add("oakB", 2, 104, 120, (c, w, h, rr) =>
    paintOak(c, w, h, biome.key === "meadow" ? LEAF.lime : LEAF.teal, rr),
  );
  add("poplar", 2, 64, 136, (c, w, h, rr) => paintPoplar(c, w, h, LEAF.lime, rr));
  add("birch", 2, 84, 118, (c, w, h, rr) =>
    paintBirch(c, w, h, biome.key === "snow" ? LEAF.autumn : LEAF.lime, rr),
  );
  add("bush", 3, 70, 64, (c, w, h, rr) =>
    paintBush(
      c,
      w,
      h,
      rr() < 0.5 ? LEAF.green : leafMain,
      rr,
      rr() < 0.4 ? ["#e0574b", "#ffd54a"] : null,
    ),
  );
  add("bushTrop", 2, 70, 64, (c, w, h, rr) =>
    paintBush(c, w, h, LEAF.teal, rr, ["#ff7aa8", "#ffd54a"]),
  );
  add("bushDry", 2, 70, 64, (c, w, h, rr) => paintBush(c, w, h, LEAF.sage, rr, null));
  add("pine", 3, 78, 132, (c, w, h, rr) => paintPine(c, w, h, LEAF.deep, rr, false));
  add("pineB", 2, 70, 116, (c, w, h, rr) => paintPine(c, w, h, LEAF.teal, rr, false));
  add("snowpine", 3, 78, 132, (c, w, h, rr) => paintPine(c, w, h, LEAF.frost, rr, true));
  add("snowpineB", 2, 68, 112, (c, w, h, rr) => paintPine(c, w, h, LEAF.deep, rr, true));
  add("palm", 3, 120, 142, (c, w, h, rr) => paintPalm(c, w, h, LEAF.green, rr));
  add("palmB", 2, 110, 124, (c, w, h, rr) => paintPalm(c, w, h, LEAF.teal, rr));
  add("acacia", 2, 132, 108, (c, w, h, rr) => paintAcacia(c, w, h, LEAF.sage, rr));
  add("cactus", 2, 64, 92, (c, w, h, rr) => paintCactus(c, w, h, rr, false));
  add("cactusS", 2, 36, 46, (c, w, h, rr) => paintCactus(c, w, h, rr, true));
  add("rock", 3, 58, 40, (c, w, h, rr) =>
    paintRock(c, w, h, biome.rock, rr, biome.key === "forest" || biome.key === "meadow", false),
  );
  add("rockSnow", 2, 58, 40, (c, w, h, rr) => paintRock(c, w, h, biome.rock, rr, false, true));
  add("tuft", 3, 34, 24, (c, w, h, rr) => paintTuft(c, w, h, biome.blade, rr, null));
  add("tuftDry", 2, 34, 24, (c, w, h, rr) => paintTuft(c, w, h, ["#a9824a", "#e2c48a"], rr, null));
  add("tuftSnow", 2, 34, 22, (c, w, h, rr) => paintTuft(c, w, h, ["#9fb4c4", "#e7f0f6"], rr, null));
  add("flowers", 3, 38, 26, (c, w, h, rr) => paintTuft(c, w, h, biome.blade, rr, biome.flowers));
  add("fern", 2, 44, 34, (c, w, h) => paintFern(c, w, h));
  add("mushroom", 1, 40, 30, (c, w, h) => paintMushroom(c, w, h));
  add("shell", 1, 28, 20, (c, w, h) => paintShell(c, w, h));
  add("crystal", 2, 40, 50, (c, w, h) => paintCrystal(c, w, h));
  add("reeds", 2, 40, 36, (c, w, h) => paintReeds(c, w, h));
  add("lily", 2, 26, 18, (c, w, h) => paintLily(c, w, h));

  // Stage pedestals use the TOEIC Space tokens: green = done, yellow mark = current, subtle = locked.
  const green = uiToken("--ui-green", "#2e7a57");
  const mark = uiToken("--ui-mark-bright", "#f2c14e");
  const markStrong = uiToken("--ui-mark-strong", "#d6a329");
  const subtle = uiToken("--ui-subtle", "#8a92a5");
  const divider = uiToken("--ui-divider", "#d3d8e3");
  const canvasBg = uiToken("--ui-canvas", "#f6f7fb");
  canvasTex(scene, "node-done", 92, 96, (c, w, h) =>
    paintNode(c, w, h, green, mix(green, "#ffffff", 0.55), mix(green, "#000000", 0.3)),
  );
  canvasTex(scene, "node-current", 92, 96, (c, w, h) =>
    paintNode(c, w, h, mark, mix(mark, "#ffffff", 0.6), markStrong),
  );
  canvasTex(scene, "node-locked", 92, 96, (c, w, h) =>
    paintNode(c, w, h, divider, canvasBg, subtle),
  );
  canvasTex(scene, "star", 24, 24, (c, w) => paintStar(c, w, true));
  canvasTex(scene, "star-off", 24, 24, (c, w) => paintStar(c, w, false));
  canvasTex(scene, "trophy", 104, 108, paintTrophy);
  canvasTex(scene, "castle", 220, 200, paintCastle);
  canvasTex(scene, "sign", 260, 92, paintSign);
  canvasTex(scene, "village", 230, 130, (c, w, h) => paintVillage(c, w, h, biome, rng(5)));
  canvasTex(scene, "camp", 170, 90, (c, w, h) => paintCamp(c, w, h, biome));
  canvasTex(scene, "flame", 22, 30, paintFlame);
  canvasTex(scene, "gate", 150, 104, (c, w, h) => paintGate(c, w, h, biome));
  canvasTex(scene, "signpost", 64, 70, paintSignpost);
  canvasTex(scene, "landmark", 140, 160, (c, w, h) =>
    paintLandmark(c, w, h, biome.landmark, biome),
  );
  canvasTex(scene, "blades", 120, 120, paintWindmillBlades);
  canvasTex(scene, "fall", 36, 128, paintFall);
  canvasTex(scene, "cloudShadow", 420, 260, paintCloudShadow);
  canvasTex(scene, "glint", 18, 6, (c, w, h) => {
    c.fillStyle = "rgba(255,255,255,.9)";
    c.beginPath();
    c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, PI2);
    c.fill();
  });
  canvasTex(scene, "foam", 14, 14, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  });
  canvasTex(scene, "dot", 14, 14, (c, w) => {
    c.fillStyle = "rgba(80,50,10,.35)";
    c.beginPath();
    c.arc(w / 2 + 1, w / 2 + 1.5, 5, 0, PI2);
    c.fill();
    c.fillStyle = mark;
    c.beginPath();
    c.arc(w / 2, w / 2, 5, 0, PI2);
    c.fill();
    c.strokeStyle = "rgba(150,90,10,.7)";
    c.lineWidth = 1.2;
    c.stroke();
  });
  return variants;
}
