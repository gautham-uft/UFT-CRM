"use client";

import { useState } from "react";
import { useAppData, type FollowUpItem } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import NoAccess from "@/components/NoAccess";
import { cn } from "@/lib/utils";
import {
  Phone, Clock, XCircle, CheckCircle, Calendar, Check,
  Zap, TrendingUp, CalendarClock, Pencil, Trash2, X,
} from "lucide-react";

// ── Category config ───────────────────────────────────────────────

type CatCfg = { label: string; color: string; bg: string; Icon: typeof Phone };

const CAT: Record<string, CatCfg> = {
  callback:       { label: "Callback",       color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",     Icon: Phone       },
  postponed:      { label: "Postponed",      color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30", Icon: Clock       },
  not_interested: { label: "Not Interested", color: "text-rose-400",    bg: "bg-rose-500/15 border-rose-500/30",   Icon: XCircle     },
  progressing:    { label: "Moving Forward", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", Icon: CheckCircle },
  call:           { label: "Call",           color: "text-sky-400",     bg: "bg-sky-500/15 border-sky-500/30",     Icon: Phone       },
  task:           { label: "Task",           color: "text-violet-400",  bg: "bg-violet-500/15 border-violet-500/30", Icon: CheckCircle },
  deadline:       { label: "Deadline",       color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",     Icon: Clock       },
};

type SrcCfg = { label: string; color: string; Icon: typeof Phone };
const SRC: Record<string, SrcCfg> = {
  lead:     { label: "Lead",     color: "text-violet-400",  Icon: Zap         },
  deal:     { label: "Deal",     color: "text-emerald-400", Icon: TrendingUp  },
  calendar: { label: "Calendar", color: "text-sky-400",     Icon: CalendarClock },
};

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

function addDays(base: string, n: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── FollowUpCard ──────────────────────────────────────────────────

function FollowUpCard({ item, onToggle, onEdit, onDelete, canWrite }: { item: FollowUpItem; onToggle: () => void; onEdit: () => void; onDelete: () => void; canWrite: boolean }) {
  const cat = CAT[item.category] ?? { label: item.category, color: "text-[var(--tx4)]", bg: "bg-[var(--surface2)] border-[var(--border)]", Icon: Calendar };
  const src = SRC[item.source] ?? SRC.calendar;

  return (
    <div className={cn(
      "group bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--a-border)] transition-all",
      item.done && "opacity-40"
    )}>
      <div className="flex items-start gap-3">
        {/* Done toggle (read-only indicator when the role can't write) */}
        <button
          onClick={canWrite ? onToggle : undefined}
          disabled={!canWrite}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
            item.done ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx5)]",
            canWrite ? "hover:border-[var(--a)] cursor-pointer" : "cursor-default"
          )}
        >
          {item.done && <Check size={11} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <p className={cn("text-[var(--tx2)] text-sm font-medium", item.done && "line-through text-[var(--tx5)]")}>
              {item.entity_name}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("flex items-center gap-1 text-[10px] font-medium", src.color)}>
                <src.Icon size={10} /> {src.label}
              </span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] border", cat.bg, cat.color)}>
                {cat.label}
              </span>
            </div>
          </div>

          {item.note && (
            <p className="text-[var(--tx4)] text-xs leading-relaxed mb-2">{item.note}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            {item.follow_up_date ? (
              <span className="flex items-center gap-1 text-[10px] text-[var(--tx5)]">
                <Calendar size={9} /> {item.follow_up_date}
              </span>
            ) : <span className="text-[10px] text-[var(--tx6)]">No date set</span>}

            {/* Edit / delete */}
            {canWrite && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} title="Edit" className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--tx5)] hover:text-[var(--a-text)] hover:bg-[var(--surface2)] transition-colors"><Pencil size={12} /></button>
                <button onClick={onDelete} title="Delete" className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--tx5)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = ["callback", "postponed", "not_interested", "progressing", "call", "task", "deadline"];

export default function FollowUpsPage() {
  const { followUps, toggleFollowUp, updateFollowUp, deleteFollowUp } = useAppData();
  const { today } = useNow();
  const { ready, canRead, canWrite: cw } = usePermissions();
  const canWrite = cw("Follow-ups");

  const [editItem, setEditItem] = useState<FollowUpItem | null>(null);
  const [editForm, setEditForm] = useState({ entity_name: "", category: "callback", note: "", follow_up_date: "" });
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function startEdit(item: FollowUpItem) {
    setEditForm({
      entity_name:    item.entity_name,
      category:       item.category,
      note:           item.note ?? "",
      follow_up_date: item.follow_up_date ?? "",
    });
    setEditItem(item);
  }

  function handleSaveEdit() {
    if (!editItem || !editForm.entity_name.trim()) return;
    updateFollowUp(editItem.id, {
      entity_name:    editForm.entity_name.trim(),
      category:       editForm.category,
      note:           editForm.note.trim(),
      follow_up_date: editForm.follow_up_date || undefined,
    });
    setEditItem(null);
    showToast("Follow-up updated");
  }

  function handleDelete(item: FollowUpItem) {
    deleteFollowUp(item.id);
    if (editItem?.id === item.id) setEditItem(null);
    showToast("Follow-up deleted");
  }

  const weekEnd = addDays(today, 7);

  const pending  = followUps.filter(f => !f.done);
  const overdue  = pending.filter(f => f.follow_up_date && f.follow_up_date < today);
  const dueToday = pending.filter(f => f.follow_up_date === today);
  const thisWeek = pending.filter(f => f.follow_up_date && f.follow_up_date > today && f.follow_up_date <= weekEnd);
  const upcoming = pending.filter(f => !f.follow_up_date || f.follow_up_date > weekEnd);
  const done     = followUps.filter(f => f.done);

  const sections = [
    { key: "overdue",  label: "Overdue",   items: overdue,  dotCls: "bg-rose-400",          headCls: "text-rose-400"          },
    { key: "today",    label: "Today",     items: dueToday, dotCls: "bg-[var(--a)]",         headCls: "text-[var(--a-text)]"   },
    { key: "week",     label: "This Week", items: thisWeek, dotCls: "bg-amber-400",          headCls: "text-amber-400"         },
    { key: "upcoming", label: "Upcoming",  items: upcoming, dotCls: "bg-[var(--tx5)]",       headCls: "text-[var(--tx4)]"      },
    { key: "done",     label: "Completed", items: done,     dotCls: "bg-[var(--tx6)]",       headCls: "text-[var(--tx6)]"      },
  ].filter(s => s.items.length > 0);

  if (ready && !canRead("Follow-ups")) return <NoAccess module="Follow-ups" />;

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending",   value: pending.length,  color: "text-[var(--tx1)]"     },
          { label: "Due Today", value: dueToday.length, color: "text-[var(--a-text)]"  },
          { label: "Overdue",   value: overdue.length,  color: "text-rose-400"          },
          { label: "Completed", value: done.length,     color: "text-[var(--tx5)]"      },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-[var(--tx5)] text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <CheckCircle className="text-[var(--a-text)] mx-auto mb-3" size={32} />
          <p className="text-[var(--tx2)] font-medium">All clear!</p>
          <p className="text-[var(--tx6)] text-xs mt-1">No pending follow-ups.</p>
        </div>
      ) : (
        sections.map(section => (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full", section.dotCls)} />
              <h2 className={cn("text-sm font-semibold", section.headCls)}>{section.label}</h2>
              <span className="text-[var(--tx6)] text-xs">{section.items.length}</span>
            </div>
            <div className="space-y-2.5">
              {section.items.map(item => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  canWrite={canWrite}
                  onToggle={() => toggleFollowUp(item.id)}
                  onEdit={() => startEdit(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Edit modal ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditItem(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Edit Follow-up</h3>
              <button onClick={() => setEditItem(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Title *</label><input className={inputCls} value={editForm.entity_name} onChange={e => setEditForm(f => ({ ...f, entity_name: e.target.value }))} /></div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CAT[c]?.label ?? c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Follow-up Date</label><input type="date" className={cn(inputCls, "[color-scheme:dark]")} value={editForm.follow_up_date} onChange={e => setEditForm(f => ({ ...f, follow_up_date: e.target.value }))} /></div>
              <div><label className={labelCls}>Note</label><textarea rows={3} className={inputCls} style={{ resize: "none" }} value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => handleDelete(editItem)} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl hover:bg-rose-500/20 transition-colors"><Trash2 size={14} /></button>
              <button onClick={() => setEditItem(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={!editForm.entity_name.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl bg-[var(--surface)] border border-[var(--a-border)] text-[var(--a-text)] flex items-center gap-2">
          <CheckCircle size={14} /> {toast}
        </div>
      )}
    </div>
  );
}
