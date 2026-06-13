"use client";

import { createContext, useContext, useState } from "react";
import { ClipboardList, StickyNote, X } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNow } from "@/contexts/NowContext";
import { useCollection } from "@/hooks/useCollection";
import SearchableSelect from "@/components/SearchableSelect";
import MeetingWizard, { type MeetingWizardResult } from "@/components/MeetingWizard";
import type { Note, NoteEntity } from "@/components/NotesSection";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type NotePrefill = { entityType: NoteEntity; entityId: string; entityName: string };

type QuickActionsContextType = {
  openScheduleMeeting: () => void;
  openAssignTask:      () => void;
  openAddNote:         (prefill?: NotePrefill) => void;
};

const QuickActionsContext = createContext<QuickActionsContextType>({
  openScheduleMeeting: () => {}, openAssignTask: () => {}, openAddNote: () => {},
});

type AppUser = { id: string; first_name: string; last_name: string; role: string; email?: string };

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const { addCalendarEvent, addFollowUp, addActivity } = useAppData();
  const { currentUser } = useCurrentUser();
  const { today, now } = useNow();
  const author = `${currentUser.first_name} ${currentUser.last_name}`.trim();
  const nowISO = () => (now ? new Date(now).toISOString() : new Date().toISOString());

  const { items: users }    = useCollection<AppUser>("users");
  const { items: leads }    = useCollection<{ id: string; first_name: string; last_name: string; company_name: string }>("leads");
  const { items: accounts } = useCollection<{ id: string; name: string }>("accounts");
  const { items: contacts } = useCollection<{ id: string; first_name: string; last_name: string }>("contacts");
  const { items: deals }    = useCollection<{ id: string; name: string }>("deals");
  const { create: createNote } = useCollection<Note>("notes");

  const userOptions = users.map(u => {
    const name = `${u.first_name} ${u.last_name}`.trim();
    return { value: name, label: `${name} · ${u.role}` };
  });

  // ── Schedule meeting ──
  const [meetingOpen, setMeetingOpen] = useState(false);

  function finishMeeting({ meeting }: MeetingWizardResult) {
    // addCalendarEvent logs the activity + follow-up; the wizard already sent any
    // client email. Just persist the meeting and close.
    if (meeting) addCalendarEvent(meeting);
    setMeetingOpen(false);
  }

  // ── Assign task ──
  const [taskOpen, setTaskOpen] = useState(false);
  const [task, setTask] = useState({ assignee: "", title: "", note: "", date: "" });

  function submitTask() {
    if (!task.assignee || !task.title.trim()) return;
    addFollowUp({
      source: "task", source_id: `task-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      entity_name: task.title.trim(), category: "task", note: task.note.trim() || undefined,
      follow_up_date: task.date || undefined, logged_at: nowISO(), done: false,
      assignee: task.assignee, assigned_by: author,
    });
    setTask({ assignee: "", title: "", note: "", date: "" });
    setTaskOpen(false);
  }

  // ── Add note ──
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteLocked, setNoteLocked] = useState(false);
  const [note, setNote] = useState({ entityType: "lead" as NoteEntity, entityId: "", entityName: "", text: "" });

  const entityOptions: Record<NoteEntity, { value: string; label: string; name: string }[]> = {
    lead:    leads.map(l => ({ value: l.id, label: `${l.first_name} ${l.last_name}${l.company_name ? ` · ${l.company_name}` : ""}`, name: `${l.first_name} ${l.last_name}` })),
    account: accounts.map(a => ({ value: a.id, label: a.name, name: a.name })),
    contact: contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}`, name: `${c.first_name} ${c.last_name}` })),
    deal:    deals.map(d => ({ value: d.id, label: d.name, name: d.name })),
  };

  function submitNote() {
    if (!note.entityId || !note.text.trim()) return;
    createNote({ entity_type: note.entityType, entity_id: note.entityId, entity_name: note.entityName, text: note.text.trim(), author, created_at: nowISO() });
    addActivity({ user: author, entity_type: note.entityType, entity_name: note.entityName, activity_type: "note", description: note.text.trim(), created_at: nowISO() });
    setNote({ entityType: "lead", entityId: "", entityName: "", text: "" });
    setNoteOpen(false);
  }

  const api: QuickActionsContextType = {
    openScheduleMeeting: () => setMeetingOpen(true),
    openAssignTask:      () => setTaskOpen(true),
    openAddNote:         (prefill) => {
      if (prefill) { setNote({ entityType: prefill.entityType, entityId: prefill.entityId, entityName: prefill.entityName, text: "" }); setNoteLocked(true); }
      else { setNote({ entityType: "lead", entityId: "", entityName: "", text: "" }); setNoteLocked(false); }
      setNoteOpen(true);
    },
  };

  return (
    <QuickActionsContext.Provider value={api}>
      {children}

      {/* ── Schedule Meeting (Internal / Client chooser → wizard) ── */}
      {meetingOpen && (
        <MeetingWizard
          users={users}
          today={today}
          currentUser={currentUser}
          onClose={() => setMeetingOpen(false)}
          onFinish={finishMeeting}
        />
      )}

      {/* ── Assign Task ── */}
      {taskOpen && (
        <Modal title="Assign Task" icon={<ClipboardList size={18} className="text-[var(--a-text)]" />} onClose={() => setTaskOpen(false)}>
          <div className="space-y-4">
            <div><label className={labelCls}>Assign to *</label>
              {users.length === 0
                ? <p className="text-[var(--tx5)] text-xs px-3 py-2 bg-[var(--surface2)] border border-dashed border-[var(--border)] rounded-lg">No users yet. Add users in Settings.</p>
                : <SearchableSelect value={task.assignee} onChange={v => setTask(t => ({ ...t, assignee: v }))} placeholder="Select a person" options={userOptions} />}
            </div>
            <div><label className={labelCls}>Task *</label><input className={inputCls} placeholder="Follow up with TechWave" value={task.title} onChange={e => setTask(t => ({ ...t, title: e.target.value }))} /></div>
            <div><label className={labelCls}>Due date</label><input type="date" className={inputCls} value={task.date} onChange={e => setTask(t => ({ ...t, date: e.target.value }))} /></div>
            <div><label className={labelCls}>Note</label><textarea rows={3} className={inputCls} style={{ resize: "none" }} placeholder="Details…" value={task.note} onChange={e => setTask(t => ({ ...t, note: e.target.value }))} /></div>
          </div>
          <Actions onCancel={() => setTaskOpen(false)} onConfirm={submitTask} disabled={!task.assignee || !task.title.trim()} confirmLabel="Assign" />
        </Modal>
      )}

      {/* ── Add Note ── */}
      {noteOpen && (
        <Modal title="Add Note" icon={<StickyNote size={18} className="text-[var(--a-text)]" />} onClose={() => setNoteOpen(false)}>
          <div className="space-y-4">
            {!noteLocked && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Type</label>
                  <select className={inputCls} value={note.entityType} onChange={e => setNote(n => ({ ...n, entityType: e.target.value as NoteEntity, entityId: "", entityName: "" }))}>
                    <option value="lead">Lead</option><option value="account">Account</option><option value="contact">Contact</option><option value="deal">Deal</option>
                  </select>
                </div>
                <div><label className={labelCls}>Record *</label>
                  <SearchableSelect
                    value={note.entityId}
                    onChange={v => { const o = entityOptions[note.entityType].find(x => x.value === v); setNote(n => ({ ...n, entityId: v, entityName: o?.name ?? "" })); }}
                    placeholder={`Select ${note.entityType}`}
                    options={entityOptions[note.entityType]}
                  />
                </div>
              </div>
            )}
            {noteLocked && <p className="text-[var(--tx5)] text-xs">Note for <span className="text-[var(--tx2)] font-medium">{note.entityName}</span></p>}
            <div><label className={labelCls}>Note *</label><textarea rows={4} className={inputCls} style={{ resize: "none" }} placeholder="Write a note…" value={note.text} onChange={e => setNote(n => ({ ...n, text: e.target.value }))} /></div>
          </div>
          <Actions onCancel={() => setNoteOpen(false)} onConfirm={submitNote} disabled={!note.entityId || !note.text.trim()} confirmLabel="Add Note" />
        </Modal>
      )}
    </QuickActionsContext.Provider>
  );
}

function Modal({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--a-muted)] flex items-center justify-center">{icon}</span>
            <h3 className="text-[var(--tx1)] font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ onCancel, onConfirm, disabled, confirmLabel }: { onCancel: () => void; onConfirm: () => void; disabled: boolean; confirmLabel: string }) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onCancel} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
      <button onClick={onConfirm} disabled={disabled} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{confirmLabel}</button>
    </div>
  );
}

export const useQuickActions = () => useContext(QuickActionsContext);
