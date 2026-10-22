export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

const escapeCell = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Leading =, +, - or @ would run as a formula when the file is opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Downloads rows as a UTF-8 CSV that Excel opens with Vietnamese text intact. */
export function downloadCsv<T>(fileName: string, columns: CsvColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((column) => escapeCell(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(",")),
  ];
  const blob = new Blob(["﻿", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Collects every page of a list up to a limit, for exports of the current filter.
 * Returns whether the limit cut the result short.
 */
export async function collectPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; totalPages: number }>,
  limit: number,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    rows.push(...result.items);
    if (rows.length >= limit) return { rows: rows.slice(0, limit), truncated: true };
    if (page >= result.totalPages || result.items.length === 0) return { rows, truncated: false };
  }
}
