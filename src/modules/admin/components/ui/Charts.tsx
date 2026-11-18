import { useState, type CSSProperties } from "react";

import styles from "./charts.module.css";
import { formatCompact, formatNumber, withUnit } from "./numberFormat";

const number = formatNumber;
const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Round step for about four grid lines: 1, 2, 5, 10, 20, 50... */
function niceStep(max: number) {
  const raw = Math.max(1, max) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  return Math.max(1, (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power);
}

/** Value axis: four to five round ticks that cover the largest value. */
function valueScale(max: number) {
  const step = niceStep(max);
  const top = Math.max(step * 4, step * Math.ceil(max / step));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  return { top, ticks };
}

/* ---------- Trend: values that change over time ---------- */

export interface TrendSeries {
  key: string;
  label: string;
  values: number[];
  /** CSS colour, normally a --theme-* token. */
  color: string;
  dashed?: boolean;
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
  const { top, ticks } = valueScale(max);
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

/* ---------- Categorical charts: bars, lines, donut (data of any shape) ---------- */

export interface ChartSeries {
  key: string;
  name: string;
  /** CSS colour; by default the series palette slot in order (one series: the page theme). */
  color?: string;
}

export interface ChartDatum {
  label: string;
  values: Record<string, number | null>;
}

export interface LegendItem {
  key: string;
  name: string;
  color: string;
  value?: string;
  share?: string;
}

const MAX_SUMMARY_POINTS = 12;
/** Up to this many points a line chart marks every point. */
const DOTTED_POINTS = 16;

/** Palette slots are assigned in fixed order; a lone series takes the page theme. */
const seriesColor = (item: ChartSeries, index: number, count: number) =>
  item.color ?? (count === 1 ? "var(--chart-single)" : `var(--chart-series-${index + 1})`);

const positive = (value: number | null | undefined) =>
  value === null || value === undefined ? 0 : Math.max(0, value);

/** Spoken summary for assistive technology: the first points with every series. */
function summarize(label: string, series: ChartSeries[], data: ChartDatum[], unit?: string) {
  const shown = data
    .slice(0, MAX_SUMMARY_POINTS)
    .map(
      (point) =>
        `${point.label}: ${series
          .map((item) => `${item.name} ${withUnit(point.values[item.key], unit)}`)
          .join(", ")}`,
    );
  return `${label}. ${shown.join("; ")}${data.length > MAX_SUMMARY_POINTS ? "; …" : ""}`;
}

const tooltipRows = (
  series: ChartSeries[],
  colors: string[],
  point: ChartDatum,
  unit?: string,
): LegendItem[] =>
  series.map((item, index) => ({
    key: item.key,
    name: item.name,
    color: colors[index],
    value: withUnit(point.values[item.key], unit),
  }));

/** Readout of one point: the value leads, the series name follows. */
function ChartTooltip({
  left,
  top = 0,
  title,
  rows,
  mark = "rect",
}: {
  left: number;
  top?: number;
  title: string;
  rows: LegendItem[];
  mark?: "rect" | "line";
}) {
  return (
    <div
      className={styles.chartTip}
      data-side={left > 60 ? "left" : "right"}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <strong>{title}</strong>
      {rows.map((row) => (
        <span key={row.key}>
          <i data-mark={mark} style={{ background: row.color }} />
          {row.name}
          <b>{row.value}</b>
        </span>
      ))}
    </div>
  );
}

/** Names the series of a chart (shown whenever there are two or more). */
export function ChartLegend({
  items,
  mark = "rect",
  layout = "row",
  active,
  onActivate,
}: {
  items: LegendItem[];
  mark?: "rect" | "line";
  layout?: "row" | "column";
  /** Highlighted item, when the legend doubles as the keyboard hit target of a chart. */
  active?: string | null;
  onActivate?: (key: string | null) => void;
}) {
  return (
    <ul className={styles.legend} data-layout={layout} onMouseLeave={() => onActivate?.(null)}>
      {items.map((item) => (
        <li
          key={item.key}
          data-active={active === item.key ? "true" : undefined}
          tabIndex={onActivate ? 0 : undefined}
          onMouseEnter={onActivate ? () => onActivate(item.key) : undefined}
          onFocus={onActivate ? () => onActivate(item.key) : undefined}
          onBlur={onActivate ? () => onActivate(null) : undefined}
        >
          <i aria-hidden="true" data-mark={mark} style={{ background: item.color }} />
          <span>{item.name}</span>
          {item.value !== undefined && <b>{item.value}</b>}
          {item.share !== undefined && <small>{item.share}</small>}
        </li>
      ))}
    </ul>
  );
}

interface BarChartProps {
  series: ChartSeries[];
  data: ChartDatum[];
  unit?: string;
  layout?: "vertical" | "horizontal";
  stacked?: boolean;
  /** Plot height of a vertical chart; horizontal charts grow with their rows. */
  height?: number;
  label: string;
}

/**
 * Bars by category: grouped or stacked, vertical or horizontal. Bars stay thin (≤ 24px) with a
 * surface gap between them; a single series labels only its largest bar, the rest is in the
 * tooltip and the data table of the caller.
 */
export function BarChart({
  series,
  data,
  unit,
  layout = "vertical",
  stacked = false,
  height = 200,
  label,
}: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const colors = series.map((item, index) => seriesColor(item, index, series.length));
  const totals = data.map((point) =>
    stacked
      ? series.reduce((sum, item) => sum + positive(point.values[item.key]), 0)
      : Math.max(0, ...series.map((item) => positive(point.values[item.key]))),
  );
  const { top, ticks } = valueScale(Math.max(0, ...totals));
  const size = (value: number | null | undefined) => (positive(value) / top) * 100;
  const single = series.length === 1;
  const peak =
    single && totals.some((total) => total > 0) ? totals.indexOf(Math.max(...totals)) : -1;
  const summary = summarize(label, series, data, unit);
  const legend = !single && (
    <ChartLegend
      items={series.map((item, index) => ({
        key: item.key,
        name: item.name,
        color: colors[index],
      }))}
    />
  );
  const hits = (direction: "column" | "row") => (
    <div
      className={direction === "column" ? styles.bands : styles.rowHits}
      onMouseLeave={() => setHovered(null)}
    >
      {data.map((point, index) => (
        <span
          key={index}
          tabIndex={0}
          aria-label={`${point.label}: ${series
            .map((item) => `${item.name} ${withUnit(point.values[item.key], unit)}`)
            .join(", ")}`}
          onMouseEnter={() => setHovered(index)}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered(null)}
        />
      ))}
    </div>
  );

  if (layout === "horizontal") {
    const rowHeight = single || stacked ? 28 : 10 + 12 * series.length;
    const longest = Math.max(0, ...data.map((point) => point.label.length));
    return (
      <figure
        className={styles.figure}
        aria-label={label}
        style={cssVars({
          "--rows": data.length,
          "--row": `${rowHeight}px`,
          "--label-width": `${Math.min(140, Math.max(56, longest * 6.5 + 10))}px`,
        })}
      >
        <div className={styles.rowsFrame}>
          <div className={styles.rowLabels} aria-hidden="true">
            {data.map((point, index) => (
              <span key={index} title={point.label}>
                {point.label}
              </span>
            ))}
          </div>
          <div className={styles.rowTracks}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {ticks.map((tick) => (
                <line
                  key={tick}
                  className={tick === 0 ? styles.baseline : styles.grid}
                  x1={(tick / top) * 100}
                  x2={(tick / top) * 100}
                  y1="0"
                  y2="100"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <div
              className={styles.rows}
              role="img"
              aria-label={summary}
              data-hover={hovered !== null ? "true" : undefined}
            >
              {data.map((point, index) => (
                <div
                  key={index}
                  className={styles.barRow}
                  data-active={hovered === index ? "true" : undefined}
                >
                  {stacked ? (
                    <div className={styles.rowStack}>
                      {series.map(
                        (item, s) =>
                          positive(point.values[item.key]) > 0 && (
                            <span
                              key={item.key}
                              className={styles.rowSegment}
                              style={cssVars({
                                width: `${size(point.values[item.key])}%`,
                                "--bar": colors[s],
                              })}
                            />
                          ),
                      )}
                    </div>
                  ) : (
                    series.map((item, s) => (
                      <span
                        key={item.key}
                        className={styles.rowBar}
                        style={cssVars({
                          width: `${size(point.values[item.key])}%`,
                          "--bar": colors[s],
                        })}
                      />
                    ))
                  )}
                  {index === peak && (
                    <em className={styles.rowValue} style={{ left: `${size(totals[index])}%` }}>
                      {withUnit(totals[index], unit)}
                    </em>
                  )}
                </div>
              ))}
            </div>
            {hovered !== null && (
              <ChartTooltip
                left={Math.min(100, size(totals[hovered]))}
                top={(hovered / data.length) * 100}
                title={data[hovered].label}
                rows={tooltipRows(series, colors, data[hovered], unit)}
              />
            )}
            {hits("row")}
          </div>
          <div className={styles.rowAxis} aria-hidden="true">
            {ticks.map((tick, index) => (
              <span
                key={tick}
                style={{ left: `${(tick / top) * 100}%` }}
                data-edge={index === 0 ? "start" : index === ticks.length - 1 ? "end" : undefined}
              >
                {formatCompact(tick)}
              </span>
            ))}
          </div>
        </div>
        {legend}
      </figure>
    );
  }

  const labelEvery = Math.max(1, Math.ceil(data.length / 12));
  return (
    <figure
      className={styles.figure}
      aria-label={label}
      style={cssVars({ "--chart-height": `${height}px`, "--k": series.length })}
    >
      <div className={styles.trend}>
        <div className={styles.yAxis} aria-hidden="true">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{formatCompact(tick)}</span>
          ))}
        </div>
        <div className={styles.plot}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {ticks.map((tick) => (
              <line
                key={tick}
                className={tick === 0 ? styles.baseline : styles.grid}
                x1="0"
                x2="100"
                y1={100 - (tick / top) * 100}
                y2={100 - (tick / top) * 100}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div
            className={styles.columns}
            role="img"
            aria-label={summary}
            data-hover={hovered !== null ? "true" : undefined}
          >
            {data.map((point, index) => (
              <div
                key={index}
                className={styles.column}
                data-active={hovered === index ? "true" : undefined}
              >
                {stacked ? (
                  <div className={styles.stack}>
                    {series.map(
                      (item, s) =>
                        positive(point.values[item.key]) > 0 && (
                          <span
                            key={item.key}
                            className={styles.segment}
                            style={cssVars({
                              height: `${size(point.values[item.key])}%`,
                              "--bar": colors[s],
                            })}
                          />
                        ),
                    )}
                  </div>
                ) : (
                  <div className={styles.group}>
                    {series.map((item, s) => (
                      <span
                        key={item.key}
                        className={styles.bar}
                        style={cssVars({
                          height: `${size(point.values[item.key])}%`,
                          "--bar": colors[s],
                        })}
                      />
                    ))}
                  </div>
                )}
                {index === peak && (
                  <em className={styles.columnValue} style={{ bottom: `${size(totals[index])}%` }}>
                    {formatCompact(totals[index])}
                  </em>
                )}
              </div>
            ))}
          </div>
          {hovered !== null && (
            <ChartTooltip
              left={((hovered + 0.5) / data.length) * 100}
              title={data[hovered].label}
              rows={tooltipRows(series, colors, data[hovered], unit)}
            />
          )}
          {hits("column")}
        </div>
        <div className={styles.columnAxis} aria-hidden="true">
          {data.map((point, index) => (
            <span
              key={index}
              data-hidden={index % labelEvery === 0 ? undefined : "true"}
              title={point.label}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>
      {legend}
    </figure>
  );
}

/** Points of one series split into runs around missing values. */
function runs(values: (number | null)[]) {
  const out: number[][] = [];
  let run: number[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length) out.push(run);
      run = [];
    } else run.push(index);
  });
  if (run.length) out.push(run);
  return out;
}

/**
 * Lines (or washed areas) by category. Shares the frame of TrendChart; missing values break
 * the line, and up to 16 points every point gets a marker.
 */
export function LineChart({
  series,
  data,
  unit,
  area = false,
  height = 200,
  label,
}: {
  series: ChartSeries[];
  data: ChartDatum[];
  unit?: string;
  area?: boolean;
  height?: number;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const count = data.length;
  const colors = series.map((item, index) => seriesColor(item, index, series.length));
  const { top, ticks } = valueScale(
    Math.max(0, ...data.flatMap((point) => series.map((item) => positive(point.values[item.key])))),
  );
  const x = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 50);
  const y = (value: number | null | undefined) => 100 - (positive(value) / top) * 100;
  const labelEvery = Math.max(1, Math.ceil(count / 8));
  const dotted = count <= DOTTED_POINTS;
  const single = series.length === 1;

  return (
    <figure
      className={styles.figure}
      aria-label={label}
      style={cssVars({ "--chart-height": `${height}px`, "--gaps": Math.max(1, count - 1) })}
    >
      <div className={styles.trend}>
        <div className={styles.yAxis} aria-hidden="true">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{formatCompact(tick)}</span>
          ))}
        </div>

        <div className={styles.plot}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={summarize(label, series, data, unit)}
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                className={tick === 0 ? styles.baseline : styles.grid}
                x1="0"
                x2="100"
                y1={y(tick)}
                y2={y(tick)}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((item, s) =>
              runs(data.map((point) => point.values[item.key] ?? null)).map((run) => {
                const points = run.map((index) => `${x(index)},${y(data[index].values[item.key])}`);
                return (
                  <g key={`${item.key}-${run[0]}`}>
                    {area && run.length > 1 && (
                      <polygon
                        className={styles.area}
                        points={[
                          `${x(run[0])},100`,
                          ...points,
                          `${x(run[run.length - 1])},100`,
                        ].join(" ")}
                        fill={colors[s]}
                      />
                    )}
                    <polyline
                      className={styles.line}
                      points={points.join(" ")}
                      stroke={colors[s]}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }),
            )}
          </svg>

          {dotted &&
            series.map((item, s) =>
              data.map(
                (point, index) =>
                  point.values[item.key] !== null &&
                  point.values[item.key] !== undefined && (
                    <span
                      key={`${item.key}-${index}`}
                      className={styles.marker}
                      style={{
                        left: `${x(index)}%`,
                        top: `${y(point.values[item.key])}%`,
                        background: colors[s],
                      }}
                    />
                  ),
              ),
            )}

          {hovered !== null && (
            <>
              <span className={styles.guide} style={{ left: `${x(hovered)}%` }} />
              {series.map(
                (item, s) =>
                  data[hovered].values[item.key] !== null &&
                  data[hovered].values[item.key] !== undefined && (
                    <span
                      key={item.key}
                      className={styles.dot}
                      style={{
                        left: `${x(hovered)}%`,
                        top: `${y(data[hovered].values[item.key])}%`,
                        background: colors[s],
                      }}
                    />
                  ),
              )}
              <ChartTooltip
                left={x(hovered)}
                title={data[hovered].label}
                rows={tooltipRows(series, colors, data[hovered], unit)}
                mark="line"
              />
            </>
          )}

          <div className={styles.hits} onMouseLeave={() => setHovered(null)}>
            {data.map((point, index) => (
              <span
                key={index}
                tabIndex={0}
                aria-label={`${point.label}: ${series
                  .map((item) => `${item.name} ${withUnit(point.values[item.key], unit)}`)
                  .join(", ")}`}
                onMouseEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
              />
            ))}
          </div>
        </div>

        <div className={styles.xAxis} aria-hidden="true">
          {data.map((point, index) => {
            const last = index === count - 1;
            const shown = last || (count - 1 - index) % labelEvery === 0;
            return (
              <span
                key={index}
                style={{ left: `${x(index)}%` }}
                data-hidden={shown ? undefined : "true"}
                data-edge={index === 0 ? "start" : last ? "end" : undefined}
              >
                {point.label}
              </span>
            );
          })}
        </div>
      </div>
      {!single && (
        <ChartLegend
          mark="line"
          items={series.map((item, index) => ({
            key: item.key,
            name: item.name,
            color: colors[index],
          }))}
        />
      )}
    </figure>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** The folded tail ("Khác"), drawn in neutral grey. */
  other?: boolean;
}

const OUTER = 48;
const INNER = 30;

const polar = (angle: number, radius: number) =>
  `${50 + radius * Math.cos(angle)} ${50 + radius * Math.sin(angle)}`;

/** Annular sector (or wedge when `inner` is 0) from `start` to `end`, angles in radians. */
function sector(start: number, end: number, inner: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const outer = `M ${polar(start, OUTER)} A ${OUTER} ${OUTER} 0 ${large} 1 ${polar(end, OUTER)}`;
  if (!inner) return `${outer} L 50 50 Z`;
  return `${outer} L ${polar(end, inner)} A ${inner} ${inner} 0 ${large} 0 ${polar(start, inner)} Z`;
}

/**
 * Shares of a whole as a ring (or a disc): a handful of slices, the total in the centre, and a
 * legend with value and share that is also the keyboard hit target.
 */
export function DonutChart({
  slices,
  unit,
  variant = "donut",
  label,
}: {
  slices: DonutSlice[];
  unit?: string;
  variant?: "donut" | "pie";
  label: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const shown = slices.filter((slice) => slice.value > 0);
  const total = shown.reduce((sum, slice) => sum + slice.value, 0);
  const inner = variant === "donut" ? INNER : 0;
  const items = shown.map((slice, index) => {
    // Palette slots follow the slice order; the folded tail is grey and takes no slot.
    const slot = shown.slice(0, index + 1).filter((item) => !item.other).length;
    const color = slice.other ? "var(--chart-other)" : `var(--chart-series-${slot})`;
    const before = shown.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const from = -Math.PI / 2 + (total ? (before / total) * Math.PI * 2 : 0);
    const sweep = total ? (slice.value / total) * Math.PI * 2 : 0;
    // A whole circle cannot be one arc: draw it as two halves.
    const paths =
      sweep >= Math.PI * 2 - 1e-6
        ? [sector(from, from + Math.PI, inner), sector(from + Math.PI, from + 2 * Math.PI, inner)]
        : [sector(from, from + sweep, inner)];
    const mid = from + sweep / 2;
    return {
      ...slice,
      color,
      paths,
      anchor: { left: 50 + 40 * Math.cos(mid), top: 50 + 40 * Math.sin(mid) },
      share: `${total ? Math.round((slice.value / total) * 100) : 0}%`,
    };
  });
  const current = items.find((item) => item.key === active);
  const summary = `${label}. ${items
    .map((item) => `${item.label} ${withUnit(item.value, unit)} (${item.share})`)
    .join("; ")}`;

  return (
    <figure className={styles.figure} aria-label={label}>
      <div className={styles.donut}>
        <div className={styles.ring} data-hover={active ? "true" : undefined}>
          <svg viewBox="0 0 100 100" role="img" aria-label={summary}>
            {items.map((item) =>
              item.paths.map((d, index) => (
                <path
                  key={`${item.key}-${index}`}
                  className={styles.slice}
                  d={d}
                  fill={item.color}
                  data-active={active === item.key ? "true" : undefined}
                  onMouseEnter={() => setActive(item.key)}
                  onMouseLeave={() => setActive(null)}
                />
              )),
            )}
          </svg>
          {variant === "donut" && (
            <span className={styles.ringCenter} aria-hidden="true">
              <strong>{formatCompact(total)}</strong>
              {unit && <small>{unit}</small>}
            </span>
          )}
          {current && (
            <ChartTooltip
              left={current.anchor.left}
              top={current.anchor.top}
              title={current.label}
              rows={[
                {
                  key: current.key,
                  name: current.share,
                  color: current.color,
                  value: withUnit(current.value, unit),
                },
              ]}
            />
          )}
        </div>
        <ChartLegend
          layout="column"
          items={items.map((item) => ({
            key: item.key,
            name: item.label,
            color: item.color,
            value: withUnit(item.value, unit),
            share: item.share,
          }))}
          active={active}
          onActivate={setActive}
        />
      </div>
    </figure>
  );
}
