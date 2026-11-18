/** Vietnamese figures: 12.345 and 12,5. */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

/** Axis ticks: in full under 10.000, then 12k · 1,2 tr · 1,2 tỷ. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "";
  const size = Math.abs(value);
  const short = (amount: number) => amount.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (size >= 1e9) return `${short(value / 1e9)} tỷ`;
  if (size >= 1e6) return `${short(value / 1e6)} tr`;
  if (size >= 1e4) return `${short(value / 1e3)}k`;
  return formatNumber(value);
}

/** "1.234 người" or "1.234". */
export const withUnit = (value: number | null | undefined, unit?: string) =>
  unit && value !== null && value !== undefined
    ? `${formatNumber(value)} ${unit}`
    : formatNumber(value);
