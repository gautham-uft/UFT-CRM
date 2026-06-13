"use client";

import { useMemo, useRef, useState } from "react";
import { UploadCloud, X, Trash2, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CsvField = { key: string; label: string; required?: boolean; synonyms?: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  fields: CsvField[];
  onImport: (rows: Record<string, string>[]) => void;
  title?: string;
};

// ── Minimal RFC-4180-ish CSV parser ──────────────────────────────────────────
// Handles quoted fields, commas/newlines inside quotes, and "" escaped quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Best-effort: map a CSV header to a target field by name/synonyms.
function guessField(header: string, fields: CsvField[]): string {
  const h = norm(header);
  if (!h) return "";
  for (const f of fields) {
    const cands = [f.key, f.label, ...(f.synonyms ?? [])].map(norm);
    if (cands.some(c => c && (c === h || h.includes(c) || c.includes(h)))) return f.key;
  }
  return "";
}

export default function CsvImportModal({ open, onClose, fields, onImport, title = "Bulk Import from CSV" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]); // per column → field key or ""
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const requiredKeys = useMemo(() => fields.filter(f => f.required).map(f => f.key), [fields]);

  // Rows that would actually import (all required fields mapped + non-empty).
  const { importable, requiredMapped } = useMemo(() => {
    const reqMapped = requiredKeys.every(k => mapping.includes(k));
    if (!reqMapped) return { importable: 0, requiredMapped: false };
    const idxOf = (k: string) => mapping.indexOf(k);
    let n = 0;
    for (const r of rows) {
      if (requiredKeys.every(k => (r[idxOf(k)] ?? "").trim() !== "")) n++;
    }
    return { importable: n, requiredMapped: true };
  }, [rows, mapping, requiredKeys]);

  if (!open) return null;

  function reset() { setHeaders([]); setRows([]); setMapping([]); setFileName(""); setError(""); }
  function close() { reset(); onClose(); }

  function loadFile(file: File) {
    setError("");
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("Please choose a .csv file."); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const table = parseCsv(String(reader.result || "")).filter(r => r.some(c => c.trim() !== ""));
      if (table.length < 2) { setError("The file needs a header row and at least one data row."); return; }
      const hdr = table[0].map(h => h.trim());
      const body = table.slice(1).map(r => hdr.map((_, i) => (r[i] ?? "").trim()));
      // Guess mappings, keeping each target field unique (first column wins).
      const used = new Set<string>();
      const guessed = hdr.map(h => {
        const g = guessField(h, fields);
        if (g && !used.has(g)) { used.add(g); return g; }
        return "";
      });
      setHeaders(hdr); setRows(body); setMapping(guessed); setFileName(file.name);
    };
    reader.readAsText(file);
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) loadFile(file); e.target.value = "";
  }

  function setColMapping(col: number, key: string) {
    setMapping(m => m.map((v, i) => (i === col ? key : (v === key && key !== "" ? "" : v))));
  }

  function deleteColumn(col: number) {
    setHeaders(h => h.filter((_, i) => i !== col));
    setRows(rs => rs.map(r => r.filter((_, i) => i !== col)));
    setMapping(m => m.filter((_, i) => i !== col));
  }

  function deleteRow(rowIdx: number) {
    setRows(rs => rs.filter((_, i) => i !== rowIdx));
  }

  function editCell(rowIdx: number, col: number, value: string) {
    setRows(rs => rs.map((r, i) => (i === rowIdx ? r.map((c, j) => (j === col ? value : c)) : r)));
  }

  function doImport() {
    const cols = mapping.map((field, index) => ({ field, index })).filter(c => c.field);
    // Unmapped (but not deleted) columns are kept as "extra" — serialized into
    // __extra so the importer can stash them in the dump rather than discard them.
    const extraCols = mapping.map((field, index) => ({ field, index, header: headers[index] })).filter(c => !c.field);
    const out: Record<string, string>[] = [];
    for (const r of rows) {
      const obj: Record<string, string> = {};
      for (const { field, index } of cols) obj[field] = (r[index] ?? "").trim();
      if (!requiredKeys.every(k => (obj[k] ?? "") !== "")) continue;
      const extra: Record<string, string> = {};
      for (const { index, header } of extraCols) {
        const val = (r[index] ?? "").trim();
        const key = (header ?? "").trim();
        if (val && key) extra[key] = val;
      }
      if (Object.keys(extra).length) obj.__extra = JSON.stringify(extra);
      out.push(obj);
    }
    onImport(out);
    close();
  }

  const inputCls = "w-full px-2 py-1.5 bg-transparent text-[var(--tx2)] text-xs focus:outline-none focus:bg-[var(--surface)] rounded";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={close}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-[var(--tx1)] font-semibold flex items-center gap-2"><FileSpreadsheet size={16} className="text-[var(--a-text)]" /> {title}</h3>
          <button onClick={close} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={16} /></button>
        </div>

        {headers.length === 0 ? (
          /* ── Upload step ── */
          <div className="p-6">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f); }}
              className={cn(
                "flex flex-col items-center justify-center gap-3 py-14 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                dragOver ? "border-[var(--a-border)] bg-[var(--a-muted)]" : "border-[var(--border)] hover:border-[var(--a-border)] bg-[var(--surface2)]",
              )}
            >
              <UploadCloud size={32} className="text-[var(--a-text)]" />
              <p className="text-[var(--tx2)] text-sm font-medium">Drop a CSV here or click to choose</p>
              <p className="text-[var(--tx5)] text-xs">First row is treated as column headers.</p>
            </div>
            {error && <p className="mt-3 text-rose-400 text-xs flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFilePicked} />
          </div>
        ) : (
          /* ── Map / edit step ── */
          <>
            <div className="px-5 py-3 border-b border-[var(--border)] shrink-0 flex items-center justify-between gap-3">
              <p className="text-[var(--tx5)] text-xs">
                <span className="text-[var(--tx3)]">{fileName}</span> · {rows.length} row{rows.length !== 1 ? "s" : ""}. Map each column to a field, or leave it as <span className="text-[var(--tx3)]">Extra</span> to keep it in the dump. Delete columns/rows you don&apos;t want.
              </p>
              <button onClick={() => { reset(); fileRef.current?.click(); }} className="text-[var(--tx5)] hover:text-[var(--a-text)] text-xs shrink-0">Choose another file</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFilePicked} />
            </div>

            <div className="overflow-auto flex-1">
              <table className="text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  {/* Field-mapping dropdowns */}
                  <tr className="bg-[var(--surface)]">
                    <th className="sticky left-0 z-20 bg-[var(--surface)] border-b border-r border-[var(--border)] w-10" />
                    {headers.map((_, col) => {
                      const value = mapping[col] ?? "";
                      return (
                        <th key={col} className="border-b border-r border-[var(--border)] p-1.5 min-w-[150px] align-top bg-[var(--surface)]">
                          <div className="flex items-center gap-1">
                            <select
                              value={value}
                              onChange={e => setColMapping(col, e.target.value)}
                              className={cn(
                                "flex-1 px-1.5 py-1 rounded border text-[11px] focus:outline-none",
                                value ? "bg-[var(--a-muted)] border-[var(--a-border)] text-[var(--a-text)]" : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx5)]",
                              )}
                            >
                              <option value="">— Extra (saved to dump) —</option>
                              {fields.map(f => (
                                <option key={f.key} value={f.key} disabled={value !== f.key && mapping.includes(f.key)}>
                                  {f.label}{f.required ? " *" : ""}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => deleteColumn(col)} title="Delete column" className="text-[var(--tx5)] hover:text-rose-400 transition-colors shrink-0"><Trash2 size={12} /></button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  {/* Original CSV headers */}
                  <tr className="bg-[var(--surface2)]">
                    <th className="sticky left-0 z-20 bg-[var(--surface2)] border-b border-r border-[var(--border)]" />
                    {headers.map((h, col) => (
                      <th key={col} className="border-b border-r border-[var(--border)] px-2 py-1 text-left text-[10px] font-normal text-[var(--tx5)] truncate max-w-[200px]">{h || <span className="italic">(unnamed)</span>}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-[var(--surface2)] group">
                      <td className="sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--surface2)] border-b border-r border-[var(--border)] text-center">
                        <button onClick={() => deleteRow(rowIdx)} title="Delete row" className="text-[var(--tx6)] hover:text-rose-400 transition-colors p-1"><Trash2 size={11} /></button>
                      </td>
                      {r.map((cell, col) => (
                        <td key={col} className="border-b border-r border-[var(--border)] p-0">
                          <input value={cell} onChange={e => editCell(rowIdx, col, e.target.value)} className={inputCls} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border)] shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs">
                {!requiredMapped ? (
                  <span className="text-amber-400 flex items-center gap-1.5"><AlertCircle size={13} /> Map the required field{requiredKeys.length > 1 ? "s" : ""}: {fields.filter(f => f.required).map(f => f.label).join(", ")}</span>
                ) : (
                  <span className="text-[var(--tx5)]"><span className="text-[var(--tx2)] font-medium">{importable}</span> of {rows.length} row{rows.length !== 1 ? "s" : ""} ready{importable < rows.length ? ` · ${rows.length - importable} skipped (missing required)` : ""}</span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={close} className="px-4 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors">Cancel</button>
                <button onClick={doImport} disabled={!requiredMapped || importable === 0} className="px-4 py-2 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"><Check size={13} /> Import {importable || ""} lead{importable !== 1 ? "s" : ""}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
