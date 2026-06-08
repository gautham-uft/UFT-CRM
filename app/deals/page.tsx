"use client";

import { useState } from "react";
import { mockDeals, mockPipelineStages } from "@/lib/mock-data";
import { Plus, DollarSign, User, Building2, X, CheckCircle2, CheckCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import NoAccess from "@/components/NoAccess";
import SearchableSelect from "@/components/SearchableSelect";
import NotesSection from "@/components/NotesSection";
import { useCollection } from "@/hooks/useCollection";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type Deal = (typeof mockDeals)[0];

const stageColors: Record<string, string> = {
  "Discovery":   "border-t-sky-500",
  "Demo":        "border-t-violet-500",
  "Proposal":    "border-t-amber-500",
  "Negotiation": "border-t-orange-500",
  "Closed Won":  "border-t-emerald-500",
};

const EMPTY_DEAL = { name: "", account_name: "", contact: "", amount: "", currency: "USD", stage_id: "1", owner: "" };

export default function DealsPage() {
  const { addActivity } = useAppData();
  const { currentUser } = useCurrentUser();
  const userName = `${currentUser.first_name} ${currentUser.last_name}`;
  const { ready, canRead, canWrite: cw } = usePermissions();
  const canWrite = cw("Deals");

  const { items: deals, create: createDeal, update: updateDeal, remove: removeDeal } = useCollection<Deal>("deals");
  const { items: accounts } = useCollection<{ id: string; name: string }>("accounts");
  const { items: contacts } = useCollection<{ id: string; first_name: string; last_name: string }>("contacts");
  const [dragging,       setDragging]       = useState<string | null>(null);
  const [closedWonModal, setClosedWonModal] = useState<Deal | null>(null);
  const [revertModal,    setRevertModal]    = useState<{ deal: Deal; stageId: string; stageName: string } | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Deal | null>(null);
  const [selectedDeal,   setSelectedDeal]   = useState<Deal | null>(null);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showLogModal,   setShowLogModal]   = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [addForm,        setAddForm]        = useState(EMPTY_DEAL);
  const [editForm,       setEditForm]       = useState(EMPTY_DEAL);
  const [logNote,        setLogNote]        = useState("");
  const [logType,        setLogType]        = useState<"call_log" | "email" | "note" | "meeting">("call_log");
  const [toast,          setToast]          = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const activeStages = mockPipelineStages.filter(s => s.name !== "Closed Lost");
  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId);

  const handleDrop = (stageId: string) => {
    if (!dragging) return;
    const deal = deals.find(d => d.id === dragging);
    setDragging(null);
    if (!deal || deal.stage_id === stageId) return;
    const stage = mockPipelineStages.find(s => s.id === stageId);
    if (stage?.name === "Closed Won") { setClosedWonModal(deal); return; }
    // Moving a won deal back to an earlier stage needs confirmation.
    if (deal.stage_id === "5") { setRevertModal({ deal, stageId, stageName: stage?.name ?? "" }); return; }
    updateDeal(dragging, { stage_id: stageId });
  };

  const totalPipeline = deals.filter(d => !["5","6"].includes(d.stage_id)).reduce((s, d) => s + d.total_amount, 0);

  function handleAddDeal() {
    if (!addForm.name.trim()) return;
    createDeal({
      name:         addForm.name.trim(),
      stage_id:     addForm.stage_id,
      owner:        addForm.owner.trim() || userName,
      account_name: addForm.account_name.trim(),
      total_amount: parseInt(addForm.amount) || 0,
      currency:     addForm.currency,
      created_at:   new Date().toISOString().slice(0,10),
      contact:      addForm.contact.trim(),
    });
    setAddForm(EMPTY_DEAL);
    setShowAddModal(false);
    showToast("Deal added");
  }

  function handleLogActivity() {
    if (!selectedDeal || !logNote.trim()) return;
    addActivity({
      user:          userName,
      entity_type:   "deal",
      entity_name:   selectedDeal.name,
      activity_type: logType,
      description:   logNote.trim(),
      created_at:    new Date().toISOString(),
    });
    setLogNote("");
    setShowLogModal(false);
    showToast("Activity logged");
  }

  function handleSaveDeal() {
    if (!selectedDeal || !editForm.name.trim()) return;
    const patch = {
      name:         editForm.name.trim(),
      account_name: editForm.account_name.trim(),
      contact:      editForm.contact.trim(),
      total_amount: parseInt(editForm.amount) || selectedDeal.total_amount,
      currency:     editForm.currency,
      owner:        editForm.owner.trim(),
    };
    updateDeal(selectedDeal.id, patch);
    setSelectedDeal(prev => prev ? { ...prev, ...patch } : null);
    setShowEditModal(false);
    showToast("Deal updated");
  }

  if (ready && !canRead("Deals")) return <NoAccess module="Deals" />;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[var(--tx5)] text-sm">{deals.length} deals</span>
          <span className="text-[var(--a-text)] text-sm font-medium">· ${totalPipeline.toLocaleString()} in pipeline</span>
        </div>
        {canWrite && (
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
            <Plus size={13} /> Add Deal
          </button>
        )}
      </div>

      {/* Kanban — columns flex to fit the viewport so all stages stay visible
          without horizontal scrolling. */}
      <div className="flex gap-2 pb-2 flex-1 min-w-0">
        {activeStages.map(stage => {
          const stageDeals = dealsByStage(stage.id);
          const stageValue = stageDeals.reduce((s, d) => s + d.total_amount, 0);
          return (
            <div key={stage.id} className="flex-1 basis-0 min-w-0 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id)}>
              <div className={cn("bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-2 border-t-2", stageColors[stage.name] ?? "border-t-slate-500")}>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--tx2)] text-xs font-semibold">{stage.name}</span>
                  <span className="text-[var(--tx5)] text-xs bg-[var(--surface2)] px-1.5 py-0.5 rounded-full">{stageDeals.length}</span>
                </div>
                <p className="text-[var(--tx5)] text-xs mt-1">${stageValue.toLocaleString()} · {stage.win_probability}% prob.</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {stageDeals.map(deal => (
                  <div key={deal.id} draggable={canWrite} onDragStart={() => canWrite && setDragging(deal.id)} onClick={() => setSelectedDeal(deal)} className={cn("bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--a-border)] transition-all active:opacity-70", canWrite ? "cursor-grab" : "cursor-pointer", dragging === deal.id && "opacity-40")}>
                    <p className="text-[var(--tx2)] text-xs font-medium mb-2 line-clamp-2">{deal.name}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5"><DollarSign size={11} className="text-emerald-400 shrink-0" /><span className="text-emerald-400 text-xs font-medium truncate">${deal.total_amount.toLocaleString()}</span></div>
                      <div className="flex items-center gap-1.5 min-w-0"><Building2 size={11} className="text-[var(--tx5)] shrink-0" /><span className="text-[var(--tx5)] text-xs truncate">{deal.account_name}</span></div>
                      <div className="flex items-center gap-1.5 min-w-0"><User size={11} className="text-[var(--tx6)] shrink-0" /><span className="text-[var(--tx6)] text-xs truncate">{deal.owner}</span></div>
                    </div>
                  </div>
                ))}
                {canWrite && <button onClick={() => setShowAddModal(true)} className="w-full py-2 border border-dashed border-[var(--surface3)] rounded-xl text-[var(--tx6)] text-xs hover:border-[var(--a-border)] hover:text-[var(--a-text)] transition-colors">+ Add deal</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Deal detail modal ── */}
      {selectedDeal && !showLogModal && !showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedDeal(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-[var(--tx2)] font-semibold text-sm">Deal Detail</h2>
              <button onClick={() => setSelectedDeal(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors"><X size={14} /></button>
            </div>
            <div className="mb-5">
              <p className="text-[var(--tx1)] font-semibold text-base">{selectedDeal.name}</p>
              <p className="text-emerald-400 font-bold text-3xl mt-1">${selectedDeal.total_amount.toLocaleString()}</p>
              <span className="text-[var(--tx5)] text-xs">{selectedDeal.currency}</span>
            </div>
            <div className="space-y-2 mb-5">
              {[
                { label: "Account",  value: selectedDeal.account_name || "—" },
                { label: "Owner",    value: selectedDeal.owner || "—" },
                { label: "Contact",  value: selectedDeal.contact || "—" },
                { label: "Currency", value: selectedDeal.currency },
                { label: "Created",  value: selectedDeal.created_at },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 px-3 bg-[var(--surface2)] rounded-lg">
                  <span className="text-[var(--tx5)] text-xs">{label}</span>
                  <span className="text-[var(--tx3)] text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
            {canWrite && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={() => { setLogNote(""); setShowLogModal(true); }} className="flex-1 py-2.5 bg-[var(--a-muted)] border border-[var(--a-border)] text-[var(--a-text)] text-xs rounded-lg hover:bg-[var(--a-muted)] transition-colors font-medium">Log Activity</button>
                <button onClick={() => { setEditForm({ name: selectedDeal.name, account_name: selectedDeal.account_name, contact: selectedDeal.contact, amount: String(selectedDeal.total_amount), currency: selectedDeal.currency, stage_id: selectedDeal.stage_id, owner: selectedDeal.owner }); setShowEditModal(true); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors">Edit Deal</button>
              </div>
              <button onClick={() => setDeleteTarget(selectedDeal)} className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg hover:bg-rose-500/20 transition-colors font-medium flex items-center justify-center gap-2"><Trash2 size={13} /> Delete Deal</button>
            </div>
            )}
            <div className="mt-5 pt-5 border-t border-[var(--border)]">
              <NotesSection entityType="deal" entityId={selectedDeal.id} entityName={selectedDeal.name} canWrite={canWrite} />
            </div>
          </div>
        </div>
      )}

      {/* ── Log Activity modal ── */}
      {showLogModal && selectedDeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--tx1)] font-semibold">Log Activity</h3>
              <button onClick={() => setShowLogModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <p className="text-[var(--tx5)] text-xs mb-4">{selectedDeal.name}</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Activity Type</label>
                <select className={inputCls} value={logType} onChange={e => setLogType(e.target.value as typeof logType)}>
                  <option value="call_log">Call</option>
                  <option value="email">Email</option>
                  <option value="note">Note</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes *</label>
                <textarea rows={3} className={inputCls} placeholder="What happened?" value={logNote} onChange={e => setLogNote(e.target.value)} style={{ resize: "none" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleLogActivity} disabled={!logNote.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] disabled:opacity-40 disabled:cursor-not-allowed">Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Deal modal ── */}
      {showEditModal && selectedDeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Edit Deal</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Deal Name *</label><input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Account</label><input className={inputCls} value={editForm.account_name} onChange={e => setEditForm(f => ({ ...f, account_name: e.target.value }))} /></div>
                <div><label className={labelCls}>Contact</label><input className={inputCls} value={editForm.contact} onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Amount</label><input type="number" className={inputCls} value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><label className={labelCls}>Currency</label><select className={inputCls} value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></div>
              </div>
              <div><label className={labelCls}>Owner</label><input className={inputCls} value={editForm.owner} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} /></div>
              <div><label className={labelCls}>Stage</label><select className={inputCls} value={editForm.stage_id} onChange={e => setEditForm(f => ({ ...f, stage_id: e.target.value }))}>{mockPipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleSaveDeal} disabled={!editForm.name.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium disabled:opacity-40 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Closed Won confirmation ── */}
      {closedWonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-emerald-500/40 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center"><CheckCircle2 size={20} className="text-emerald-400" /></div>
              <div><h3 className="text-[var(--tx1)] font-semibold">Confirm Closed Won</h3><p className="text-[var(--tx5)] text-xs">Review line items before closing</p></div>
            </div>
            <div className="bg-[var(--surface2)] rounded-xl p-4 mb-4">
              <p className="text-[var(--tx3)] text-sm font-medium">{closedWonModal.name}</p>
              <p className="text-emerald-400 font-bold text-lg mt-1">${closedWonModal.total_amount.toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <p className="text-[var(--tx5)] text-xs font-medium mb-2">Line Items</p>
              <div className="space-y-2">
                {[{ product: "Enterprise Suite", price: closedWonModal.total_amount * 0.7, discount: 0 }, { product: "Security Add-on", price: closedWonModal.total_amount * 0.2, discount: 10 }, { product: "Premium Support", price: closedWonModal.total_amount * 0.1, discount: 0 }].map(item => (
                  <div key={item.product} className="flex items-center justify-between p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                    <div><p className="text-[var(--tx3)] text-xs">{item.product}</p>{item.discount > 0 && <p className="text-[var(--tx6)] text-xs">{item.discount}% off</p>}</div>
                    <span className="text-[var(--tx3)] text-xs">${item.price.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setClosedWonModal(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={() => { updateDeal(closedWonModal.id, { stage_id: "5" }); setClosedWonModal(null); showToast("🎉 Deal closed!"); }} className="flex-1 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 font-medium">Confirm & Close Won</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-open (move out of Closed Won) confirmation ── */}
      {revertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-amber-500/40 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><CheckCircle2 size={20} className="text-amber-400" /></div>
              <div><h3 className="text-[var(--tx1)] font-semibold">Re-open won deal?</h3><p className="text-[var(--tx5)] text-xs">This deal is currently Closed Won.</p></div>
            </div>
            <p className="text-[var(--tx4)] text-sm leading-relaxed">
              Move <span className="text-[var(--tx2)] font-medium">{revertModal.deal.name}</span> from <span className="text-emerald-400 font-medium">Closed Won</span> back to <span className="text-[var(--tx2)] font-medium">{revertModal.stageName}</span>? It will no longer count as won revenue.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRevertModal(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={() => { updateDeal(revertModal.deal.id, { stage_id: revertModal.stageId }); setRevertModal(null); showToast(`Moved back to ${revertModal.stageName}`); }} className="flex-1 py-2.5 bg-amber-600 text-white text-sm rounded-xl hover:bg-amber-700 font-medium">Move it back</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete deal confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--tx1)] font-semibold">Delete Deal</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <p className="text-[var(--tx4)] text-sm leading-relaxed">
              Delete <span className="text-[var(--tx2)] font-medium">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={() => { removeDeal(deleteTarget.id); if (selectedDeal?.id === deleteTarget.id) setSelectedDeal(null); setDeleteTarget(null); showToast("Deal deleted"); }} className="flex-1 py-2.5 bg-rose-500 text-white text-sm rounded-xl hover:bg-rose-400 font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Deal modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Add Deal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Deal Name *</label><input className={inputCls} placeholder="Acme Corp — Enterprise Suite" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Account</label>
                  <SearchableSelect
                    value={addForm.account_name}
                    onChange={v => setAddForm(f => ({ ...f, account_name: v }))}
                    placeholder="Select account"
                    options={accounts.map(a => ({ value: a.name, label: a.name }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Contact</label>
                  <SearchableSelect
                    value={addForm.contact}
                    onChange={v => setAddForm(f => ({ ...f, contact: v }))}
                    placeholder="Select contact"
                    options={contacts.map(c => ({ value: `${c.first_name} ${c.last_name}`, label: `${c.first_name} ${c.last_name}` }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Amount ($)</label><input type="number" className={inputCls} placeholder="50000" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><label className={labelCls}>Currency</label><select className={inputCls} value={addForm.currency} onChange={e => setAddForm(f => ({ ...f, currency: e.target.value }))}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></div>
              </div>
              <div><label className={labelCls}>Stage</label><select className={inputCls} value={addForm.stage_id} onChange={e => setAddForm(f => ({ ...f, stage_id: e.target.value }))}>{mockPipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className={labelCls}>Owner</label><input className={inputCls} placeholder="Assigned rep" value={addForm.owner} onChange={e => setAddForm(f => ({ ...f, owner: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_DEAL); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleAddDeal} disabled={!addForm.name.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium disabled:opacity-40 disabled:cursor-not-allowed">Add Deal</button>
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
