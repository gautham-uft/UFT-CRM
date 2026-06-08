"use client";

import { useState } from "react";
import { StickyNote, Plus, Pencil, Check, X } from "lucide-react";
import { useCollection } from "@/hooks/useCollection";
import { useAppData } from "@/contexts/AppDataContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { cn } from "@/lib/utils";

export type NoteEntity = "lead" | "account" | "contact" | "deal";

export type Note = {
  id:          string;
  entity_type: NoteEntity;
  entity_id:   string;
  entity_name: string;
  text:        string;
  author:      string;
  created_at:  string;
  updated_at?: string;
};

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";

// A Notes panel for an entity detail view. Lists notes for the entity, lets you
// add a new one (which also lands in Activities) and edit existing ones.
export default function NotesSection({
  entityType, entityId, entityName, canWrite = true,
}: {
  entityType: NoteEntity;
  entityId: string;
  entityName: string;
  canWrite?: boolean;
}) {
  const { items: notes, create, update } = useCollection<Note>("notes");
  const { addActivity } = useAppData();
  const { currentUser } = useCurrentUser();
  const author = `${currentUser.first_name} ${currentUser.last_name}`.trim();

  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const mine = notes
    .filter(n => n.entity_type === entityType && n.entity_id === entityId)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await create({ entity_type: entityType, entity_id: entityId, entity_name: entityName, text, author, created_at: new Date().toISOString() });
    // Mirror into the activity feed.
    addActivity({ user: author, entity_type: entityType, entity_name: entityName, activity_type: "note", description: text, created_at: new Date().toISOString() });
  }

  function saveEdit() {
    if (!editId || !editText.trim()) return;
    update(editId, { text: editText.trim(), updated_at: new Date().toISOString() });
    setEditId(null);
    setEditText("");
  }

  return (
    <div>
      <p className="text-[var(--tx5)] text-xs font-medium mb-2.5 flex items-center gap-1.5">
        <StickyNote size={12} /> Notes {mine.length > 0 && <span className="text-[var(--tx6)]">({mine.length})</span>}
      </p>

      {canWrite && (
        <div className="flex items-start gap-2 mb-3">
          <textarea
            rows={2}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a note…"
            className={cn(inputCls, "resize-none")}
          />
          <button
            onClick={addNote}
            disabled={!draft.trim()}
            className="shrink-0 h-[34px] px-3 flex items-center gap-1 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      )}

      {mine.length === 0 ? (
        <p className="text-[var(--tx6)] text-xs">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {mine.map(n => (
            <div key={n.id} className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-2.5">
              {editId === n.id ? (
                <div className="space-y-2">
                  <textarea rows={2} value={editText} onChange={e => setEditText(e.target.value)} className={cn(inputCls, "resize-none")} />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => { setEditId(null); setEditText(""); }} className="flex items-center gap-1 px-2 py-1 text-[11px] text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={11} /> Cancel</button>
                    <button onClick={saveEdit} disabled={!editText.trim()} className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[var(--a)] text-white rounded-md hover:bg-[var(--a-hover)] disabled:opacity-40"><Check size={11} /> Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[var(--tx3)] text-xs leading-relaxed whitespace-pre-wrap flex-1">{n.text}</p>
                    {canWrite && (
                      <button onClick={() => { setEditId(n.id); setEditText(n.text); }} title="Edit" className="shrink-0 text-[var(--tx5)] hover:text-[var(--a-text)] transition-colors"><Pencil size={11} /></button>
                    )}
                  </div>
                  <p className="text-[var(--tx6)] text-[10px] mt-1.5">{n.author} · {new Date(n.created_at).toLocaleDateString()}{n.updated_at ? " · edited" : ""}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
