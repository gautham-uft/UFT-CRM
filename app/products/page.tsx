"use client";

import { useState } from "react";
import { mockProducts } from "@/lib/mock-data";
import { Plus, Package, RefreshCw, Tag, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

type Product = (typeof mockProducts)[0];
const EMPTY_FORM = { name: "", sku: "", description: "", base_price: "", billing_type: "recurring", is_active: true };

export default function ProductsPage() {
  const { items: products, create: createProduct, update: updateProduct } = useCollection<Product>("products");
  const { items: deals } = useCollection<{ id: string; name: string; stage_id: string }>("deals");
  const [filter,        setFilter]        = useState("all");
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editProduct,   setEditProduct]   = useState<Product | null>(null);
  const [addToDealProd, setAddToDealProd] = useState<Product | null>(null);
  const [addForm,       setAddForm]       = useState(EMPTY_FORM);
  const [editForm,      setEditForm]      = useState(EMPTY_FORM);
  const [selectedDeal,  setSelectedDeal]  = useState("");
  const [toast,         setToast]         = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const filtered =
    filter === "all"       ? products :
    filter === "active"    ? products.filter(p => p.is_active) :
    filter === "recurring" ? products.filter(p => p.billing_type === "recurring") :
                             products.filter(p => p.billing_type === "one_time");

  function handleAddProduct() {
    if (!addForm.name.trim() || !addForm.sku.trim()) return;
    createProduct({
      sku:          addForm.sku.trim(),
      name:         addForm.name.trim(),
      description:  addForm.description.trim(),
      base_price:   parseFloat(addForm.base_price) || 0,
      billing_type: addForm.billing_type as "recurring" | "one_time",
      is_active:    addForm.is_active,
    });
    setAddForm(EMPTY_FORM);
    setShowAddModal(false);
    showToast("Product added");
  }

  function handleSaveEdit() {
    if (!editProduct || !editForm.name.trim()) return;
    updateProduct(editProduct.id, {
      sku:          editForm.sku.trim(),
      name:         editForm.name.trim(),
      description:  editForm.description.trim(),
      base_price:   parseFloat(editForm.base_price) || editProduct.base_price,
      billing_type: editForm.billing_type as "recurring" | "one_time",
      is_active:    editForm.is_active,
    });
    setEditProduct(null);
    showToast("Product updated");
  }

  function handleAddToDeal() {
    if (!addToDealProd) return;
    const deal = deals.find(d => d.id === selectedDeal);
    showToast(`${addToDealProd.name} added to ${deal?.name ?? "deal"}`);
    setAddToDealProd(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
          {["all","active","recurring","one_time"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", filter === f ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
              {f === "all" ? "All" : f === "one_time" ? "One-Time" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
          <Plus size={13} /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--a-border)] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center"><Package size={16} className="text-violet-400" /></div>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-2 py-0.5 rounded-full text-xs border", p.billing_type === "recurring" ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30")}>
                  {p.billing_type === "recurring" ? <span className="flex items-center gap-1"><RefreshCw size={10} /> Recurring</span> : <span className="flex items-center gap-1"><Tag size={10} /> One-Time</span>}
                </span>
                {!p.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface3)] text-[var(--tx5)] border border-[var(--border)]">Inactive</span>}
              </div>
            </div>
            <h3 className="text-[var(--tx1)] font-semibold text-sm">{p.name}</h3>
            <p className="text-xs text-[var(--tx5)] font-mono mt-0.5">{p.sku}</p>
            <p className="text-[var(--tx4)] text-xs mt-2 leading-relaxed">{p.description}</p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
              <span className="text-emerald-400 font-bold text-lg">${p.base_price.toLocaleString()}</span>
              <span className="text-[var(--tx6)] text-xs">{p.billing_type === "recurring" ? "/ year" : "one-time"}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setEditProduct(p); setEditForm({ name: p.name, sku: p.sku, description: p.description, base_price: String(p.base_price), billing_type: p.billing_type, is_active: p.is_active }); }}
                className="flex-1 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"
              >Edit</button>
              <button
                onClick={() => setAddToDealProd(p)}
                className="flex-1 py-1.5 bg-[var(--a-muted)] border border-[var(--a-border)] text-[var(--a-text)] text-xs rounded-lg hover:bg-[var(--a-muted)] transition-colors"
              >Add to Deal</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit Product modal ── */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Edit Product</h3>
              <button onClick={() => setEditProduct(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Product Name *</label><input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={labelCls}>SKU</label><input className={inputCls} value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><label className={labelCls}>Description</label><textarea rows={2} className={inputCls} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Base Price ($)</label><input type="number" className={inputCls} value={editForm.base_price} onChange={e => setEditForm(f => ({ ...f, base_price: e.target.value }))} /></div>
                <div><label className={labelCls}>Billing Type</label><select className={inputCls} value={editForm.billing_type} onChange={e => setEditForm(f => ({ ...f, billing_type: e.target.value }))}><option value="recurring">Recurring</option><option value="one_time">One-Time</option></select></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--surface2)] rounded-lg">
                <input type="checkbox" id="edit_active" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-[var(--a)] w-4 h-4 cursor-pointer" />
                <label htmlFor="edit_active" className="text-[var(--tx3)] text-xs cursor-pointer">Active — visible in deal line items</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditProduct(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleSaveEdit} disabled={!editForm.name.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium disabled:opacity-40 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add to Deal modal ── */}
      {addToDealProd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--tx1)] font-semibold">Add to Deal</h3>
              <button onClick={() => setAddToDealProd(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <p className="text-[var(--tx4)] text-xs mb-4">Adding <span className="text-[var(--tx2)] font-medium">{addToDealProd.name}</span> (${addToDealProd.base_price.toLocaleString()}) to:</p>
            <div>
              <label className={labelCls}>Select Deal</label>
              <select className={inputCls} value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)}>
                {deals.filter(d => !["5","6"].includes(d.stage_id)).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddToDealProd(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleAddToDeal} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Product modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Add Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className={labelCls}>Product Name *</label><input className={inputCls} placeholder="Enterprise Suite" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={labelCls}>SKU *</label><input className={inputCls} placeholder="ENT-001" value={addForm.sku} onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))} /></div>
              <div><label className={labelCls}>Description</label><textarea rows={2} className={inputCls} placeholder="Brief product description…" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Base Price ($)</label><input type="number" className={inputCls} placeholder="9999" value={addForm.base_price} onChange={e => setAddForm(f => ({ ...f, base_price: e.target.value }))} /></div>
                <div><label className={labelCls}>Billing Type</label><select className={inputCls} value={addForm.billing_type} onChange={e => setAddForm(f => ({ ...f, billing_type: e.target.value }))}><option value="recurring">Recurring</option><option value="one_time">One-Time</option></select></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--surface2)] rounded-lg">
                <input type="checkbox" id="is_active" checked={addForm.is_active} onChange={e => setAddForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-[var(--a)] w-4 h-4 cursor-pointer" />
                <label htmlFor="is_active" className="text-[var(--tx3)] text-xs cursor-pointer">Active — visible in deal line items</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Cancel</button>
              <button onClick={handleAddProduct} disabled={!addForm.name.trim() || !addForm.sku.trim()} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium disabled:opacity-40 disabled:cursor-not-allowed">Add Product</button>
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
