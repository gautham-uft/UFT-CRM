// Small client-side CSV helpers (no dependency). Reusable across pages for
// exporting any collection to a downloadable .csv.

export type CsvColumn = { key: string; label: string };

// Escape a value for CSV: wrap in quotes when it contains a comma, quote, or
// newline, and double any internal quotes.
function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Build a CSV string from rows given an ordered list of {key,label} columns.
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map(c => escapeCsv(c.label)).join(",");
  const body = rows
    .map(r => columns.map(c => escapeCsv(r[c.key])).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}

// Minimal type for the File System Access API (not in the default DOM lib).
type SaveFilePicker = (opts?: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;

// Save CSV text to a file. Where supported (Chrome/Edge), opens a native
// "Save As" dialog so the user picks the location + name; otherwise falls back
// to a normal download into the browser's default folder. Prepends a UTF-8 BOM
// so Excel opens non-ASCII characters correctly.
// Returns true if saved, false if the user cancelled the dialog.
export async function downloadCsv(filename: string, csv: string): Promise<boolean> {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });

  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      // User dismissed the picker → cancel silently; any other error → fall back.
      if (err && (err as { name?: string }).name === "AbortError") return false;
    }
  }

  // Fallback: anchor download to the default location.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
