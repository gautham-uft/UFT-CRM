"use client";

import { useRef, useState } from "react";
import {
  Database, FileText, Plus, Trash2, X, Sparkles, Calendar, Clock, UserCircle, FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNow } from "@/contexts/NowContext";
import { useCollection } from "@/hooks/useCollection";
import { ColumnHeader, rowMatches, type ColFilter } from "@/components/ColumnHeader";

type DocItem = {
  id:         string;
  name:       string;
  type:       string;
  date_added: string;
  modified:   string;
  uploader:   string;
  summary?:   string;
};

// Sample documents relevant to UFT's business — names + AI-style summaries.
// Seeded on demand from the empty state (the database is otherwise never
// auto-populated), so the store stays real-data-only until someone opts in.
const SAMPLE_DOCS: Array<{ name: string; date_added: string; summary: string }> = [
  { name: "UFT_Company_Profile.pdf", date_added: "2026-01-12", summary: "Corporate profile of Unitforce Technologies Consulting Pvt. Ltd. covering its history, leadership, global delivery centers, and the five core practices: AI services, engineering services, talent acquisition, software solutions, and manufacturing solutions." },
  { name: "Service_Offerings_Overview.pdf", date_added: "2026-01-18", summary: "A one-page breakdown of every UFT service line with representative engagements, typical team compositions, and the value proposition for each offering. Useful as a leave-behind during first client meetings." },
  { name: "Master_Service_Agreement_Template.docx", date_added: "2026-02-03", summary: "Standard MSA template defining scope, payment terms (Net-30), IP ownership, confidentiality, indemnification, and termination clauses. Legal-approved baseline to be tailored per client." },
  { name: "NDA_Standard_Template.docx", date_added: "2026-02-03", summary: "Mutual non-disclosure agreement used before sharing sensitive requirements or candidate data. Covers a two-year confidentiality term and standard carve-outs for publicly available information." },
  { name: "Staffing_Rate_Card_2026.xlsx", date_added: "2026-02-15", summary: "Current-year billing rates by role, seniority, and engagement model (contract, contract-to-hire, permanent). Includes volume-discount tiers and notes on overtime and onsite premiums." },
  { name: "Candidate_Screening_Checklist.pdf", date_added: "2026-02-20", summary: "Step-by-step screening workflow for the recruitment team: resume vetting, technical assessment gates, background-verification requirements, and the sign-off needed before a profile is shared with a client." },
  { name: "Client_Onboarding_Guide.pdf", date_added: "2026-03-01", summary: "Playbook for onboarding a newly signed client: kickoff agenda, point-of-contact matrix, SLA expectations, invoicing setup, and the first-90-days success milestones." },
  { name: "Manpower_Supply_Proposal.pptx", date_added: "2026-03-08", summary: "Reusable pitch deck for manpower-supply opportunities, walking through UFT's sourcing speed, screening rigor, replacement guarantees, and case-backed delivery metrics." },
  { name: "AI_Services_Capabilities_Deck.pptx", date_added: "2026-03-14", summary: "Capabilities overview of UFT's AI practice — generative AI, ML model development, data engineering, and MLOps — with sample architectures and outcomes from prior deployments." },
  { name: "Engineering_Services_Brochure.pdf", date_added: "2026-03-22", summary: "Marketing brochure for engineering services covering product design, embedded systems, CAD/CAE, and testing, aimed at manufacturing and hardware clients evaluating outsourced engineering." },
  { name: "Talent_Acquisition_Process_Flow.pdf", date_added: "2026-04-02", summary: "End-to-end diagram of the talent-acquisition pipeline from intake to offer, including typical turnaround times at each stage and the responsibilities of recruiters versus account managers." },
  { name: "GST_Registration_Certificate.pdf", date_added: "2026-04-10", summary: "Official GST registration certificate for Unitforce Technologies. Frequently requested by clients during vendor onboarding and for invoice validation." },
  { name: "ISO_9001_Certificate.pdf", date_added: "2026-04-10", summary: "ISO 9001:2015 quality-management certification evidencing UFT's audited processes. Often attached to RFP responses and procurement compliance forms." },
  { name: "Case_Study_Manufacturing_Client.pdf", date_added: "2026-04-25", summary: "Detailed case study of a manufacturing client where UFT staffed an engineering team of 20 within six weeks, reducing the client's time-to-productivity and attrition versus their prior vendor." },
  { name: "Contract_Renewal_Terms_FY26.docx", date_added: "2026-05-06", summary: "Summary of renewal terms and revised pricing for FY26 engagements, including escalation clauses, headcount-commitment discounts, and the renewal-notice timeline." },
  { name: "Software_Solutions_Portfolio.pdf", date_added: "2026-05-19", summary: "Portfolio of custom software delivered by UFT across web, mobile, and enterprise integration projects, with the tech stacks used and measurable client outcomes for each." },
];

// Best-effort document type label from the file name's extension.
function typeOf(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "";
  return ext || "FILE";
}

const typeColors: Record<string, string> = {
  PDF:  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  DOC:  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  DOCX: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  XLS:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  XLSX: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CSV:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PNG:  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  JPG:  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  JPEG: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  PPT:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PPTX: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function DatabasePage() {
  const { currentUser } = useCurrentUser();
  const { today } = useNow();
  const uploader = `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.role;

  const { items: docs, create: createDoc, remove: removeDoc } = useCollection<DocItem>("documents");
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewDoc, setViewDoc] = useState<DocItem | null>(null);
  const [toast, setToast] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, ColFilter>>({});

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  function seedSamples() {
    SAMPLE_DOCS.forEach(s => {
      createDoc({ name: s.name, type: typeOf(s.name), date_added: s.date_added, modified: s.date_added, uploader, summary: s.summary });
    });
    showToast(`${SAMPLE_DOCS.length} sample documents added`);
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      createDoc({ name: f.name, type: typeOf(f.name), date_added: today, modified: today, uploader });
    });
    if (files.length) showToast(`${files.length} document${files.length === 1 ? "" : "s"} added`);
    e.target.value = ""; // allow re-selecting the same file
  }

  const colGetters: Record<string, (d: DocItem) => string> = {
    name:       d => d.name ?? "",
    type:       d => d.type ?? "",
    date_added: d => d.date_added ?? "",
    modified:   d => d.modified ?? "",
    uploader:   d => d.uploader ?? "",
  };
  const setCol = (key: string, v: ColFilter) => setColFilters(f => {
    const next = { ...f };
    if (v.q || v.from || v.to) next[key] = v; else delete next[key];
    return next;
  });
  const typeOptions = [...new Set(docs.map(d => d.type).filter(Boolean))].sort();
  const uploaderOptions = [...new Set(docs.map(d => d.uploader).filter(Boolean))].sort();

  const sorted = [...docs]
    .filter(d => rowMatches(d, colFilters, colGetters))
    .sort((a, b) => (b.date_added || "").localeCompare(a.date_added || ""));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[var(--tx1)] text-lg font-semibold flex items-center gap-2"><Database size={18} className="text-[var(--a-text)]" /> Database</h1>
          <p className="text-[var(--tx5)] text-sm mt-0.5">Shared document store. Add files and open one for an AI-generated summary.</p>
        </div>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[var(--a)] text-white text-sm rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors shrink-0"><Plus size={15} /> Add Files</button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={onFilesPicked} />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--a-muted)] flex items-center justify-center mb-4"><Database size={24} className="text-[var(--a-text)]" /></div>
            <p className="text-[var(--tx3)] text-sm font-medium">No documents yet</p>
            <p className="text-[var(--tx5)] text-xs mt-1">Click <span className="text-[var(--a-text)]">Add Files</span> to add documents to the database.</p>
            <button onClick={seedSamples} className="mt-4 flex items-center gap-2 px-3.5 py-2 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx3)] text-xs rounded-lg hover:border-[var(--a-border)] hover:text-[var(--a-text)] font-medium transition-colors"><Sparkles size={13} className="text-violet-400" /> Load sample documents</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left"><ColumnHeader label="Name" value={colFilters.name ?? {}} onChange={v => setCol("name", v)} /></th>
                <th className="px-4 py-3 text-left"><ColumnHeader label="Type" type="select" options={typeOptions} value={colFilters.type ?? {}} onChange={v => setCol("type", v)} /></th>
                <th className="px-4 py-3 text-left"><ColumnHeader label="Date Added" type="date" value={colFilters.date_added ?? {}} onChange={v => setCol("date_added", v)} /></th>
                <th className="px-4 py-3 text-left"><ColumnHeader label="Modified" type="date" value={colFilters.modified ?? {}} onChange={v => setCol("modified", v)} /></th>
                <th className="px-4 py-3 text-left"><ColumnHeader label="Uploader" type="select" options={uploaderOptions} value={colFilters.uploader ?? {}} onChange={v => setCol("uploader", v)} /></th>
                <th className="px-4 py-3 text-left text-xs text-[var(--tx5)] font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sorted.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--tx5)] text-sm">No documents match the current filters.</td></tr>
              )}
              {sorted.map(d => (
                <tr key={d.id} onClick={() => setViewDoc(d)} className="hover:bg-[var(--surface2)] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-[var(--tx2)] font-medium">
                      <FileText size={14} className="text-[var(--a-text)] shrink-0" />
                      <span className="truncate max-w-[280px]">{d.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", typeColors[d.type] ?? "bg-[var(--surface2)] text-[var(--tx4)] border-[var(--border)]")}>{d.type}</span></td>
                  <td className="px-4 py-3 text-[var(--tx5)] text-xs">{d.date_added}</td>
                  <td className="px-4 py-3 text-[var(--tx5)] text-xs">{d.modified}</td>
                  <td className="px-4 py-3 text-[var(--tx4)] text-xs">{d.uploader}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { removeDoc(d.id); showToast("Document removed"); }} title="Remove" className="text-[var(--tx5)] hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Document detail + AI summary */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setViewDoc(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-[var(--a-muted)] flex items-center justify-center shrink-0"><FileText size={18} className="text-[var(--a-text)]" /></span>
                <div className="min-w-0">
                  <h3 className="text-[var(--tx1)] font-semibold truncate">{viewDoc.name}</h3>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1", typeColors[viewDoc.type] ?? "bg-[var(--surface2)] text-[var(--tx4)] border-[var(--border)]")}>{viewDoc.type}</span>
                </div>
              </div>
              <button onClick={() => setViewDoc(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors shrink-0"><X size={16} /></button>
            </div>

            <div className="px-6 py-4 grid grid-cols-2 gap-2.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5 p-2.5 bg-[var(--surface2)] rounded-lg"><FileType size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)]">Type</p><p className="text-[var(--tx3)] text-xs">{viewDoc.type}</p></div></div>
              <div className="flex items-center gap-2.5 p-2.5 bg-[var(--surface2)] rounded-lg"><UserCircle size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)]">Uploader</p><p className="text-[var(--tx3)] text-xs truncate">{viewDoc.uploader}</p></div></div>
              <div className="flex items-center gap-2.5 p-2.5 bg-[var(--surface2)] rounded-lg"><Calendar size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)]">Date Added</p><p className="text-[var(--tx3)] text-xs">{viewDoc.date_added}</p></div></div>
              <div className="flex items-center gap-2.5 p-2.5 bg-[var(--surface2)] rounded-lg"><Clock size={13} className="text-[var(--tx5)] shrink-0" /><div><p className="text-[10px] text-[var(--tx5)]">Modified</p><p className="text-[var(--tx3)] text-xs">{viewDoc.modified}</p></div></div>
            </div>

            <div className="px-6 py-5">
              <p className="text-[var(--tx5)] text-xs font-medium mb-2.5 flex items-center gap-1.5"><Sparkles size={13} className="text-violet-400" /> AI Summary</p>
              {viewDoc.summary ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-4">
                  <p className="text-[var(--tx3)] text-sm leading-relaxed">{viewDoc.summary}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface2)] p-5 text-center">
                  <Sparkles size={20} className="text-violet-400 mx-auto mb-2 opacity-70" />
                  <p className="text-[var(--tx5)] text-xs italic">This content will be given by AI.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <Database size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
