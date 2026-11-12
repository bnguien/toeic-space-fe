import { useState, type CSSProperties } from "react";

import styles from "./charts.module.css";

const number = (value: number) => value.toLocaleString("vi-VN");
const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/* ---------- Trend: values that change over time ---------- */

export interface TrendSeries {
  key: string;
  label: string;
  values: number[];
  /** CSS colour, normally a --theme-* token. */
  color: string;
  dashed?: boolean;
}

/** Round step for about four grid lines: 1, 2, 5, 10, 20, 50... */
function niceStep(max: number) {
  const raw = Math.max(1, max) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return Math.max(1, (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power);
}

/**
 * Thin multi-series line chart with a value axis. Labels are thinned to fit; hovering a column
 * shows every series at that point.
 */
export function TrendChart({
  labels,
  tooltips,
  series,
  unit,
  height = 168,
  label,
}: {
  labels: string[];
  /** Full label per point for the tooltip, e.g. "22/10 13:00". */
  tooltips: string[];
  series: TrendSeries[];
  unit: string;
  height?: number;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const count = labels.length;
  const max = Math.max(0, ...series.flatMap((item) => item.values));
  const step = niceStep(max);
  const top = Math.max(step * 4, step * Math.ceil(max / step));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const x = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 50);
  const y = (value: number) => 100 - (value / top) * 100;
  // At most about eight axis labels, always including the last point.
  const labelEvery = Math.max(1, Math.ceil(count / 8));

  return (
    <figure
      className={styles.trend}
      aria-label={label}
      style={cssVars({ "--chart-height": `${height}px`, "--gaps": Math.max(1, count - 1) })}
    >
      <div className={styles.yAxis} aria-hidden="true">
        {[...ticks].reverse().map((tick) => (
          <span key={tick}>{number(tick)}</span>
        ))}
      </div>

      <div className={styles.plot}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {ticks.map((tick) => (
            <line
              key={tick}
              className={tick === 0 ? styles.baseline : styles.gridLine}
              x1="0"
              x2="100"
              y1={y(tick)}
              y2={y(tick)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((item) => (
            <polyline
              key={item.key}
              className={styles.series}
              points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
              stroke={item.color}
              strokeDasharray={item.dashed ? "4 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {hovered !== null && (
          <>
            <span className={styles.guide} style={{ left: `${x(hovered)}%` }} />
            {series.map((item) => (
              <span
                key={item.key}
                className={styles.dot}
                style={{
                  left: `${x(hovered)}%`,
                  top: `${y(item.values[hovered])}%`,
                  background: item.color,
                }}
              />
            ))}
            <div
              className={styles.tooltip}
              data-side={x(hovered) > 60 ? "left" : "right"}
              style={{ left: `${x(hovered)}%` }}
            >
              <strong>{tooltips[hovered]}</strong>
              {series.map((item) => (
                <span key={item.key}>
                  <i style={{ background: item.color }} />
                  {item.label}: {number(item.values[hovered])} {unit}
                </span>
              ))}
            </div>
          </>
        )}

        <div className={styles.hits} onMouseLeave={() => setHovered(null)}>
          {labels.map((_, index) => (
            <span
              key={index}
              tabIndex={0}
              aria-label={`${tooltips[index]}: ${series
                .map((item) => `${item.label} ${item.values[index]}`)
                .join(", ")}`}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </div>
      </div>

      <div className={styles.xAxis} aria-hidden="true">
        {labels.map((text, index) => {
          const last = index === count - 1;
          const shown = last || (count - 1 - index) % labelEvery === 0;
          return (
            <span
              key={index}
              style={{ left: `${x(index)}%` }}
              data-hidden={shown ? undefined : "true"}
              data-edge={index === 0 ? "start" : last ? "end" : undefined}
              data-last={last ? "true" : undefined}
            >
              {text}
            </span>
          );
        })}
      </div>
    </figure>
  );
}

/** Legend of a trend: each series with its total and the change against the previous period. */
export function TrendLegend({
  items,
  previousLabel,
}: {
  items: {
    key: string;
    label: string;
    color: string;
    total: number;
    previous: number;
    dashed?: boolean;
  }[];
  previousLabel: string;
}) {
  return (
    <ul className={styles.trendLegend}>
      {items.map((item) => {
        const change = item.total - item.previous;
        return (
          <li key={item.key}>
            <i
              aria-hidden="true"
              data-dashed={item.dashed ? "true" : undefined}
              style={cssVars({ "--segment": item.color })}
            />
            <span>{item.label}</span>
            <strong>{number(item.total)}</strong>
            <small data-direction={change > 0 ? "up" : change < 0 ? "down" : undefined}>
              {change > 0 ? "+" : change < 0 ? "−" : "±"}
              {number(Math.abs(change))} so với {previousLabel}
            </small>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Shares of a whole: values that rarely change ---------- */

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** CSS colour, normally a --theme-* token. */
  color: string;
}

/** Thin stacked share bar. */
export function SegmentBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className={styles.segmentBar} role="img" aria-label={label}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <span
            key={segment.key}
            style={cssVars({
              width: `${(segment.value / Math.max(1, total)) * 100}%`,
              "--segment": segment.color,
            })}
            title={`${segment.label}: ${number(segment.value)}`}
          />
        ))}
    </div>
  );
}

export interface BreakdownRow {
  key: string;
  title: string;
  segments: Segment[];
}

/**
 * Several distributions, each as a title with its total, a thin share line and a one-line
 * legend. Used instead of charts for figures that barely move from day to day.
 */
export function Breakdown({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className={styles.breakdown}>
      {rows.map((row) => {
        const total = row.segments.reduce((sum, segment) => sum + segment.value, 0);
        return (
          <section key={row.key} className={styles.breakdownRow}>
            <header>
              <h3>{row.title}</h3>
              <span>{number(total)}</span>
            </header>
            <SegmentBar segments={row.segments} label={row.title} />
            <ul>
              {row.segments.map((segment) => (
                <li key={segment.key} style={cssVars({ "--segment": segment.color })}>
                  <i aria-hidden="true" />
                  {segment.label}
                  <strong>{number(segment.value)}</strong>
                  <small>{total ? Math.round((segment.value / total) * 100) : 0}%</small>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
