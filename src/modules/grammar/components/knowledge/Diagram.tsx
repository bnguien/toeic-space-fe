/**
 * Knowledge diagrams (`diagram`) — 10 kinds per content/grammar/docs/DIAGRAMS.md, drawn like the PDF renderer (same colour
 * roles moss/lime/gold/soft, same layout per kind). The decision flowchart and the timeline compute coordinates exactly
 * like the PDF; on mobile wide diagrams scroll horizontally instead of squeezing the text.
 *
 * Every node carries `data-sd-n` + `data-tone` (Lĩnh hội highlights nodes through these attributes).
 */
import { Fragment, type CSSProperties, type ReactNode } from "react";

import type {
  BranchDiagram,
  CompareDiagram,
  DecisionDiagram,
  DiagramColor,
  DiagramKind,
  FamilyDiagram,
  FormulaDiagram,
  GrammarDiagram,
  LadderDiagram,
  LayersDiagram,
  MatrixDiagram,
  SlotDiagram,
  TimelineDiagram,
} from "../../types/knowledge.types";
import { cx } from "../../utils/cx";
import styles from "./Diagram.module.css";

const KIND_LABELS: Record<DiagramKind, string> = {
  slot: "vị trí",
  branch: "phân nhánh",
  compare: "so sánh",
  decision: "lưu đồ",
  timeline: "trục thời gian",
  ladder: "bậc thang",
  family: "họ từ",
  formula: "công thức",
  layers: "bóc lớp",
  matrix: "ma trận",
};
/* SVG colours (diagrams stay on light paper in both modes): TOEIC Space light palette. */
const STROKE = "#4867a8";
const FILL: Record<DiagramColor, string> = {
  moss: "#4563a3",
  lime: "#f2c14e",
  gold: "#e6c27a",
  soft: "#a9bde6",
};
const SOFT_BG: Record<DiagramColor, string> = {
  moss: "#4563a3",
  lime: "#fdf5e3",
  gold: "#fdf8f0",
  soft: "#f0f2f8",
};
const INK = "#252c3f";
const MUTED = "#5f687c";
const NAVY = "#34508f";
const MARK = "#f2c14e";
const NBSP = " ";
const MM = 3.9; // 1 mm of the PDF ≈ 3.9 px on the web

const isShortToken = (tok: string) =>
  tok.length <= 3 && (/^[\x20-\x7e]*$/.test(tok) || tok === tok.toUpperCase());

/** Keeps formula groups unbroken inside a node: + = → / always stick to the next side (nb() of the PDF). */
function nb(text: string): string {
  return String(text).replace(
    /(\S+) ([+=→/]) (?=\S)/g,
    (_, a: string, op: string) => a + (isShortToken(a) ? NBSP : " ") + op + NBSP,
  );
}

interface NodeProps {
  text?: string;
  tone?: DiagramColor;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function Node({ text = "", tone, className, style, children }: NodeProps) {
  return (
    <div className={cx(styles.n, className)} data-sd-n="" data-tone={tone} style={style}>
      {children ?? nb(text)}
    </div>
  );
}

const Example = ({ v }: { v?: string }) => (v ? <div className={styles.ex}>{v}</div> : null);

// 1. slot --------------------------------------------------------------------------------------------------------------
function Slot({ d }: { d: SlotDiagram }) {
  return (
    <div className={styles.slot}>
      {d.cells.map((o, i) => {
        const label = o.label || "";
        const lab = o.optional && label && !label.startsWith("(") ? `(${label})` : label;
        return (
          <div
            key={i}
            className={cx(styles.cell, o.highlight && styles.highlighted, o.optional && styles.opt)}
          >
            <small>{lab}</small>
            <Node text={o.text} tone={o.tone} />
          </div>
        );
      })}
    </div>
  );
}

// 2. branch ------------------------------------------------------------------------------------------------------------
function Branch({ d }: { d: BranchDiagram }) {
  const k = d.branches.length;
  const xs = d.branches.map((_, i) => ((i + 0.5) * 100) / k);
  const paths = ["M50 0 V5"];
  if (k > 1) paths.push(`M${xs[0].toFixed(2)} 5 H${xs[k - 1].toFixed(2)}`);
  xs.forEach((x) => paths.push(`M${x.toFixed(2)} 5 V10`));
  return (
    <div className={styles.branch}>
      <div className={styles.root}>
        <Node text={d.root.text} tone={d.root.tone} />
      </div>
      <svg
        className={styles.conn}
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {paths.map((p) => (
          <path
            key={p}
            d={p}
            fill="none"
            stroke={STROKE}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className={styles.children} style={{ "--gp-k": k } as CSSProperties}>
        {d.branches.map((b, i) => (
          <div key={i} className={styles.child}>
            <Node text={b.text} tone={b.tone} />
            <Example v={b.example} />
            {b.children && b.children.length > 0 && (
              <div className={styles.subs}>
                {b.children.map((c, j) => (
                  <Fragment key={j}>
                    <span className={styles.vl} />
                    <Node text={c.text} tone={c.tone} />
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. compare -----------------------------------------------------------------------------------------------------------
function Compare({ d }: { d: CompareDiagram }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.compare}>
        <thead>
          <tr>
            <th className={styles.blank} />
            {d.columns.map((c, i) => (
              <th key={i} data-tone={c.tone}>
                {c.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.rows.map((h, i) => (
            <tr
              key={i}
              className={
                h.tone === "lime" ? styles.rowLime : h.tone === "gold" ? styles.rowGold : undefined
              }
            >
              <td className={styles.k}>{h.criterion}</td>
              {h.cells.map((x, j) => (
                <td key={j}>{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 4. decision ----------------------------------------------------------------------------------------------------------
/** Grid layout like the PDF: BFS from batDau, “Có” to the right, “Không” down; a taken cell moves down. */
function layoutDecision(d: DecisionDiagram): Record<string, [number, number]> {
  const nodes = Object.fromEntries(d.nodes.map((x) => [x.id, x]));
  const pos: Record<string, [number, number]> = {};
  const occupied = new Set<string>();
  const place = (id: string, row: number, c: number) => {
    let r = row;
    while (occupied.has(`${r},${c}`)) r += 1;
    pos[id] = [r, c];
    occupied.add(`${r},${c}`);
  };
  place(d.start, 0, 0);
  const order = [d.start];
  for (let i = 0; i < order.length; i += 1) {
    const x = nodes[order[i]];
    const [r, c] = pos[order[i]];
    (
      [
        ["yes", 0, 1],
        ["no", 1, 0],
      ] as const
    ).forEach(([key, dr, dc]) => {
      const t = x?.[key];
      if (t && !(t in pos)) {
        place(t, r + dr, c + dc);
        order.push(t);
      }
    });
  }
  return pos;
}

function Decision({ d }: { d: DecisionDiagram }) {
  const pos = layoutDecision(d);
  const vals = Object.values(pos);
  const rows = Math.max(...vals.map(([r]) => r)) + 1;
  const cols = Math.max(...vals.map(([, c]) => c)) + 1;
  const W = Math.min(170 / cols, 58);
  const H = 19;
  const nw = W - 12;
  const nh = 12.5;
  const totalW = W * cols;
  const totalH = H * rows - (H - nh) + 2;
  const center = (id: string): [number, number] => {
    const [r, c] = pos[id] || [0, 0];
    return [c * W + W / 2, r * H + nh / 2 + 1];
  };
  const edges: { key: string; p: string; lab: string; lx: number; ly: number }[] = [];
  d.nodes.forEach((x) => {
    if (x.kind !== "question") return;
    const [sx, sy] = center(x.id);
    (
      [
        ["yes", "Có"],
        ["no", "Không"],
      ] as const
    ).forEach(([key, lab]) => {
      const t = x[key];
      if (!t || !pos[t]) return;
      const [tx, ty] = center(t);
      let p: string;
      let lx: number;
      let ly: number;
      if (key === "yes") {
        const x0 = sx + nw / 2;
        const y0 = sy;
        if (Math.abs(ty - sy) < 0.1 && tx > sx) p = `M${x0} ${y0} H${tx - nw / 2 - 0.4}`;
        else if (tx > sx) {
          const xm = x0 + (W - nw) / 2;
          p = `M${x0} ${y0} H${xm} V${ty} H${tx - nw / 2 - 0.4}`;
        } else {
          const xr = Math.max(x0, tx + nw / 2) + (W - nw) / 2;
          p = `M${x0} ${y0} H${xr} V${ty} H${tx + nw / 2 + 0.4}`;
        }
        lx = x0 + 1.2;
        ly = y0 - 1.2;
      } else {
        const x0 = sx;
        const y0 = sy + nh / 2;
        if (Math.abs(tx - sx) < 0.1) p = `M${x0} ${y0} V${ty - nh / 2 - 0.4}`;
        else {
          const ym = y0 + (H - nh) / 2;
          p = `M${x0} ${y0} V${ym} H${tx} V${ty - nh / 2 - 0.4}`;
        }
        lx = x0 + 1.2;
        ly = y0 + 3.2;
      }
      edges.push({ key: `${x.id}-${key}`, p, lab, lx, ly });
    });
  });
  const markerId = `gp-ah-${d.start}-${d.nodes.length}`;
  return (
    <div className={styles.scroll}>
      <div className={styles.decision} style={{ width: totalW * MM, height: totalH * MM }}>
        <svg
          width={totalW * MM}
          height={totalH * MM}
          viewBox={`0 0 ${totalW} ${totalH}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={STROKE} />
            </marker>
          </defs>
          {edges.map((e) => (
            <g key={e.key}>
              <path
                d={e.p}
                fill="none"
                stroke={STROKE}
                strokeWidth="0.45"
                markerEnd={`url(#${markerId})`}
              />
              <text x={e.lx} y={e.ly} fontSize="2.6" fontWeight="800" fill={STROKE}>
                {e.lab}
              </text>
            </g>
          ))}
        </svg>
        {d.nodes.map((x) => {
          const [cx0, cy0] = center(x.id);
          return (
            <Node
              key={x.id}
              text={x.text}
              tone={x.tone}
              className={cx(styles.node, x.kind === "question" && styles.nodeQ)}
              style={{
                left: (cx0 - nw / 2) * MM,
                top: (cy0 - nh / 2) * MM,
                width: nw * MM,
                height: nh * MM,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// 5. timeline ----------------------------------------------------------------------------------------------------------
function wrapLines(text: string, width = 22): string[] {
  const lines: string[] = [];
  let cur = "";
  String(text)
    .split(/\s+/)
    .forEach((w) => {
      if (cur && cur.length + 1 + w.length > width) {
        lines.push(cur);
        cur = w;
      } else cur = `${cur} ${w}`.trim();
    });
  if (cur) lines.push(cur);
  return lines;
}

type Box = [number, number, number, number];

/** Horizontal axis like the PDF: labels alternate above/below; on collision switch side or move one level out. */
function Timeline({ d }: { d: TimelineDiagram }) {
  const VW = 640;
  const AX = 78;
  const X = (v: number) => 320 + v * 270;
  const milestones = [...d.marks].sort((a, b) => a.position - b.position);
  const boxes: Box[] = [];
  if (d.now) boxes.push([X(0) - 26, X(0) + 26, AX + 34, AX + 55]);
  boxes.push([20, 80, AX + 6, AX + 20]);
  boxes.push([VW - 90, VW - 20, AX + 6, AX + 20]);
  const labels = milestones.map((m, i) => {
    const mid = m.kind === "point" ? X(m.position) : (X(m.position) + X(m.end ?? m.position)) / 2;
    const lines = wrapLines(m.text, 22);
    const lw = Math.max(...lines.map((t) => t.length)) * 6.4 + 16;
    const lineHeight = 14 * lines.length + 6;
    const lx = Math.min(Math.max(mid, lw / 2 + 4), VW - lw / 2 - 4);
    const pref = i % 2 === 0;
    const spot = (up: boolean, level: number): Box => {
      const y = up
        ? AX - 22 - lineHeight - level * (lineHeight + 8)
        : AX + 22 + level * (lineHeight + 8);
      return [lx - lw / 2 - 3, lx + lw / 2 + 3, y, y + lineHeight];
    };
    const free = (r: Box) =>
      boxes.every((b) => r[1] <= b[0] || r[0] >= b[1] || r[3] <= b[2] || r[2] >= b[3]);
    let choice: [boolean, Box] | null = null;
    for (let level = 0; level < 4 && !choice; level += 1) {
      for (const up of [pref, !pref]) {
        if (free(spot(up, level))) {
          choice = [up, spot(up, level)];
          break;
        }
      }
    }
    const [up, r] = choice || [pref, spot(pref, 0)];
    boxes.push(r);
    return { m, mid, lines, lx, lw, lineHeight, ly: r[2], up };
  });
  const top = Math.min(AX - 40, ...labels.map((l) => l.ly)) - 4;
  const bot = Math.max(AX + 58, ...labels.map((l) => l.ly + l.lineHeight)) + 4;
  const shapes: ReactNode[] = [];
  (["range", "repeat", "point"] as const).forEach((kind) => {
    milestones
      .filter((m) => m.kind === kind)
      .forEach((m) => {
        const col = FILL[m.tone] || STROKE;
        const x1 = X(m.position);
        if (kind === "point") {
          shapes.push(
            <circle key={m.id} cx={x1} cy={AX} r="7" fill={col} stroke="#fff" strokeWidth="2" />,
          );
        } else if (kind === "range") {
          shapes.push(
            <rect
              key={m.id}
              x={x1}
              y={AX - 6}
              width={X(m.end ?? m.position) - x1}
              height="12"
              rx="6"
              fill={col}
              opacity="0.95"
            />,
          );
        } else {
          const x2 = X(m.end ?? m.position);
          [0, 1, 2, 3, 4].forEach((k) => {
            shapes.push(
              <circle
                key={`${m.id}-${k}`}
                cx={x1 + ((x2 - x1) * k) / 4}
                cy={AX}
                r="5"
                fill={col}
                stroke="#fff"
                strokeWidth="1.5"
              />,
            );
          });
        }
      });
  });
  return (
    <div className={styles.scroll}>
      <div className={styles.tl}>
        <svg
          viewBox={`0 ${Math.round(top)} ${VW} ${Math.round(bot - top)}`}
          role="img"
          aria-label={d.title}
        >
          <line x1="20" y1={AX} x2={VW - 22} y2={AX} stroke={STROKE} strokeWidth="2.2" />
          <path
            d={`M${VW - 24} ${AX - 6} L${VW - 12} ${AX} L${VW - 24} ${AX + 6} z`}
            fill={STROKE}
          />
          <text x="26" y={AX + 16} fontSize="10" fill={MUTED} fontWeight="600">
            quá khứ
          </text>
          <text
            x={VW - 26}
            y={AX + 16}
            fontSize="10"
            fill={MUTED}
            fontWeight="600"
            textAnchor="end"
          >
            tương lai
          </text>
          {d.now && (
            <>
              <line x1={X(0)} y1={AX - 34} x2={X(0)} y2={AX + 34} stroke={MARK} strokeWidth="4" />
              <rect x={X(0) - 22} y={AX + 36} width="44" height="17" rx="8.5" fill={NAVY} />
              <text
                x={X(0)}
                y={AX + 48.5}
                fontSize="11"
                fontWeight="800"
                fill={MARK}
                textAnchor="middle"
                className={styles.display}
              >
                NOW
              </text>
            </>
          )}
          {labels.map(({ m, mid, lines, lx, lw, lineHeight, ly, up }) => {
            const bd = FILL[m.tone] || STROKE;
            return (
              <g key={m.id}>
                <line
                  x1={mid}
                  y1={AX + (up ? -8 : 8)}
                  x2={lx}
                  y2={ly + (up ? lineHeight : 0)}
                  stroke={bd}
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <rect
                  x={lx - lw / 2}
                  y={ly}
                  width={lw}
                  height={lineHeight}
                  rx="7"
                  fill={SOFT_BG[m.tone] || SOFT_BG.soft}
                  stroke={bd}
                  strokeWidth="1.6"
                  strokeDasharray={m.tone === "gold" ? "4 2" : undefined}
                />
                {lines.map((t, j) => (
                  <text
                    key={j}
                    x={lx}
                    y={ly + 15 + 14 * j}
                    fontSize="11"
                    fontWeight="700"
                    fill={m.tone === "moss" ? "#fff" : INK}
                    textAnchor="middle"
                  >
                    {t}
                  </text>
                ))}
              </g>
            );
          })}
          {shapes}
        </svg>
      </div>
    </div>
  );
}

// 6. ladder ------------------------------------------------------------------------------------------------------------
function Ladder({ d }: { d: LadderDiagram }) {
  return (
    <div className={styles.ladder}>
      <div className={styles.axis}>
        <span>{d.axis.high}</span>
        <span className={styles.bar} />
        <span>{d.axis.low}</span>
      </div>
      <div className={styles.steps}>
        {d.steps.map((b, i) => (
          <div key={i} className={styles.step} style={{ "--gp-i": i } as CSSProperties}>
            <Node tone={b.tone}>
              <i>{i + 1}</i>
              {b.text}
            </Node>
            <Example v={b.example} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 7. family ------------------------------------------------------------------------------------------------------------
function HauTo({ text, suffix }: { text: string; suffix?: string }) {
  if (suffix) {
    for (const raw of suffix.split("/")) {
      const suf = raw.trim().replace(/^-+/, "");
      if (!suf) continue;
      const words = text.split(" ");
      const wi = words.findIndex(
        (w) => w.toLowerCase().endsWith(suf.toLowerCase()) && w.length > suf.length,
      );
      if (wi >= 0) {
        const w = words[wi];
        return (
          <>
            {words.slice(0, wi).join(" ")}
            {wi > 0 ? " " : ""}
            {w.slice(0, -suf.length)}
            <b>{w.slice(-suf.length)}</b>
            {wi < words.length - 1 ? " " : ""}
            {words.slice(wi + 1).join(" ")}
          </>
        );
      }
    }
  }
  return <>{text}</>;
}

function Family({ d }: { d: FamilyDiagram }) {
  const mem = d.members;
  const k = mem.length;
  const Wd = 176;
  const Hd = k > 2 ? 74 : 60;
  const cx0 = Wd / 2;
  const cy0 = Hd / 2;
  const R = 17;
  const rx = 60;
  const ry = Hd / 2 - 7;
  const pts = mem.map((_, i) => {
    const a = ((i * 360) / k - 90) * (Math.PI / 180);
    return [cx0 + rx * Math.cos(a), cy0 + ry * Math.sin(a)];
  });
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return (
    <div className={styles.family} style={{ aspectRatio: `${Wd} / ${Hd}`, maxWidth: Wd * MM }}>
      <svg viewBox={`0 0 ${Wd} ${Hd}`} aria-hidden="true">
        <ellipse
          cx={cx0}
          cy={cy0}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#eef2fb"
          strokeWidth="0.6"
          strokeDasharray="1.5 1.2"
        />
        {pts.map(([x, y], i) => (
          <line key={i} x1={cx0} y1={cy0} x2={x} y2={y} stroke={STROKE} strokeWidth="0.4" />
        ))}
      </svg>
      <Node
        tone={d.root.tone}
        className={styles.core}
        style={{ left: pct(cx0 - R, Wd), top: pct(cy0 - R, Hd), width: pct(2 * R, Wd) }}
      >
        <div>
          {d.root.text}
          {d.root.partOfSpeech && <small>{d.root.partOfSpeech}</small>}
        </div>
      </Node>
      {mem.map((m, i) => (
        <Node
          key={i}
          tone={m.tone}
          className={styles.mem}
          style={{ left: pct(pts[i][0], Wd), top: pct(pts[i][1], Hd) }}
        >
          <em>{m.partOfSpeech}</em>
          <HauTo text={m.text} suffix={m.suffix} />
        </Node>
      ))}
    </div>
  );
}

// 8. formula -----------------------------------------------------------------------------------------------------------
function Formula({ d }: { d: FormulaDiagram }) {
  let example = "";
  let exampleCount = 0;
  d.blocks.forEach((k, i) => {
    const v = k.example;
    if (!v) return;
    const op = i > 0 ? (k.joinBefore ?? "+") : "";
    if (example) {
      const noSpace = "'’.,;:!?".includes(v[0]) || op === "";
      example += op === "," ? ", " : noSpace ? "" : " ";
    }
    example += v;
    exampleCount += 1;
  });
  return (
    <>
      <div className={styles.scroll}>
        <div className={styles.form}>
          {d.blocks.map((k, i) => {
            const op = i > 0 ? (k.joinBefore ?? "+") : "";
            const text =
              k.optional && !k.text.trimStart().startsWith("(") ? `( ${k.text} )` : k.text;
            return (
              <Fragment key={i}>
                {op && (
                  <div className={styles.op}>
                    <b>{op}</b>
                  </div>
                )}
                <div className={cx(styles.fcol, k.optional && styles.opt)}>
                  <small>{k.label || ""}</small>
                  <Node text={text} tone={k.tone} />
                  <div className={styles.ex}>{k.example || ""}</div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      {exampleCount >= 2 && (
        <div className={styles.note}>
          Ghép ví dụ: <i>{example}</i>
        </div>
      )}
    </>
  );
}

// 9. layers ------------------------------------------------------------------------------------------------------------
function Layers({ d }: { d: LayersDiagram }) {
  const coreLayer = d.core;
  const mark = coreLayer.text.includes("…") ? "…" : coreLayer.text.includes("...") ? "..." : null;
  const hasInsert = d.layers.some((x) => x.side === "inside");
  let core: ReactNode = coreLayer.text;
  if (mark && hasInsert) {
    const [a, ...b] = coreLayer.text.split(mark);
    core = (
      <>
        {a}
        <span className={styles.ins}>chèn</span>
        {b.join(mark)}
      </>
    );
  }
  let inner: ReactNode = (
    <Node tone={coreLayer.tone}>
      {coreLayer.label && <span className={styles.coretag}>{coreLayer.label}</span>}
      {core}
    </Node>
  );
  d.layers.forEach((layer, i) => {
    let row: ReactNode;
    if (layer.side === "before") {
      row = (
        <div className={styles.row}>
          <div className={styles.txt}>{layer.text}</div>
          {inner}
        </div>
      );
    } else if (layer.side === "after") {
      row = (
        <div className={styles.row}>
          {inner}
          <div className={styles.txt}>{layer.text}</div>
        </div>
      );
    } else {
      row = (
        <div className={cx(styles.row, styles.rowCol)}>
          <div className={styles.txt}>
            <small>
              {mark ? (
                <>
                  chèn vào ô <span className={styles.ins}>chèn</span> của lõi:
                </>
              ) : (
                "chèn vào giữa lõi:"
              )}
            </small>{" "}
            {layer.text}
          </div>
          {inner}
        </div>
      );
    }
    inner = (
      <div className={styles.layer} data-tone={layer.tone} key={i}>
        <span className={styles.tag}>{layer.label}</span>
        {row}
      </div>
    );
  });
  return (
    <div className={styles.layers}>
      {inner}
      {d.fullSentence && (
        <div className={styles.full}>
          <b>Câu đầy đủ:</b> <i>{d.fullSentence}</i>
        </div>
      )}
    </div>
  );
}

// 10. matrix -----------------------------------------------------------------------------------------------------------
const CELL_CLASS: Record<string, string> = { "✓": styles.yes, "✗": styles.no, "!": styles.warn };

function Matrix({ d }: { d: MatrixDiagram }) {
  const formulaText = d.caption;
  return (
    <>
      <div className={styles.scroll}>
        <table className={styles.mx}>
          <thead>
            <tr>
              <th className={cx(styles.blank, styles.rootNode)}>{d.root || ""}</th>
              {d.columns.map((c, i) => (
                <th key={i} data-tone={c.tone}>
                  {c.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.rows.map((h, i) => (
              <tr key={i}>
                <th className={styles.rh} data-tone={h.tone}>
                  {h.text}
                </th>
                {(d.cells[i] || []).map((v, j) => (
                  <td key={j} className={CELL_CLASS[v] || undefined}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {formulaText && (
        <div className={styles.note}>
          {formulaText.trimStart().startsWith("!") ? (
            formulaText
          ) : (
            <>
              <b>!</b> = {formulaText}
            </>
          )}
        </div>
      )}
    </>
  );
}

function DiagramBody({ data }: { data: GrammarDiagram }) {
  switch (data.kind) {
    case "slot":
      return <Slot d={data} />;
    case "branch":
      return <Branch d={data} />;
    case "compare":
      return <Compare d={data} />;
    case "decision":
      return <Decision d={data} />;
    case "timeline":
      return <Timeline d={data} />;
    case "ladder":
      return <Ladder d={data} />;
    case "family":
      return <Family d={data} />;
    case "formula":
      return <Formula d={data} />;
    case "layers":
      return <Layers d={data} />;
    case "matrix":
      return <Matrix d={data} />;
    default:
      return null;
  }
}

interface DiagramProps {
  data: GrammarDiagram | null | undefined;
  /** Extra class on the figure (e.g. Lĩnh hội drops the outer margin). */
  className?: string;
}

export function Diagram({ data, className }: DiagramProps) {
  if (!data || !(data.kind in KIND_LABELS)) return null;
  return (
    <figure className={cx(styles.sd, className)} data-sd-kind={data.kind}>
      <figcaption className={styles.title}>
        {data.title}
        <small>Sơ đồ {KIND_LABELS[data.kind]}</small>
      </figcaption>
      <DiagramBody data={data} />
      <div className={styles.memo}>
        <b>Nhìn là nhớ · </b>
        {data.memoryHook}
      </div>
    </figure>
  );
}
