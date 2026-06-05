"use client";

import { useState } from "react";
import { mockUsers } from "@/lib/mock-data";
import { Users, Shield, Plus, CheckCircle2, XCircle, X, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from "@/hooks/useCollection";

const inputCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";
const labelCls = "block text-[var(--tx5)] text-xs font-medium mb-1";

const roleColors: Record<string, string> = {
  "System Admin":       "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "RevOps Manager":     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "Account Executive":  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "SDR":                "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const ALL_ROLES = ["System Admin", "RevOps Manager", "Account Executive", "SDR"];

const ALL_PERMISSIONS = [
  "All Modules", "User Management", "API Keys", "RBAC", "System Settings",
  "Analytics", "Pipeline View", "All Reports", "Deal Read/Write", "User Read",
  "Deals", "Contacts", "Accounts", "Activities", "Products",
  "Leads Queue", "Business Card",
];

type User = (typeof mockUsers)[0];
type Role = { id: string; name: string; description: string; permissions: string[] };

const emptyRoleForm = { name: "", description: "", permissions: [] as string[] };

export default function SettingsPage() {
  const [tab, setTab] = useState<"users" | "roles">("users");

  // ── Users state ──────────────────────────────────────────────────────────
  const { items: users, create: createUser, update: updateUser, remove: removeUser } = useCollection<User>("users");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ first_name: "", last_name: "", email: "", role: "SDR" });

  function handleAddUser() {
    if (!userForm.first_name.trim() || !userForm.email.trim()) return;
    createUser({
      first_name: userForm.first_name.trim(),
      last_name: userForm.last_name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      is_active: true,
      last_login: "Never",
    });
    setUserForm({ first_name: "", last_name: "", email: "", role: "SDR" });
    setShowAddUserModal(false);
  }

  function handleDeactivate(id: string) {
    const u = users.find((x) => x.id === id);
    if (u) updateUser(id, { is_active: !u.is_active });
  }

  function handleDeleteUser(id: string) {
    removeUser(id);
    setDeleteTarget(null);
  }

  // ── Roles state ───────────────────────────────────────────────────────────
  const { items: roles, create: createRole, update: updateRole, remove: removeRole } = useCollection<Role>("roles");
  const [roleModal, setRoleModal] = useState<"add" | "edit" | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);

  function openAddRole() {
    setRoleForm(emptyRoleForm);
    setEditingRole(null);
    setRoleModal("add");
  }

  function openEditRole(r: Role) {
    setRoleForm({ name: r.name, description: r.description, permissions: [...r.permissions] });
    setEditingRole(r);
    setRoleModal("edit");
  }

  function togglePermission(perm: string) {
    setRoleForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  }

  function handleDeleteRole() {
    if (!editingRole) return;
    removeRole(editingRole.id);
    setRoleModal(null);
  }

  function handleSaveRole() {
    if (!roleForm.name.trim()) return;
    if (roleModal === "add") {
      createRole({ name: roleForm.name.trim(), description: roleForm.description.trim(), permissions: roleForm.permissions });
    } else if (roleModal === "edit" && editingRole) {
      updateRole(editingRole.id, { name: roleForm.name.trim(), description: roleForm.description.trim(), permissions: roleForm.permissions });
    }
    setRoleModal(null);
  }

  const roleModalOpen = roleModal !== null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 w-fit">
        {(["users", "roles"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors",
              tab === t ? "bg-[var(--a)] text-white" : "text-[var(--tx4)] hover:text-[var(--tx2)]")}>
            {t === "users" ? <><Users size={13} /> Users</> : <><Shield size={13} /> Roles & Permissions</>}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx5)] text-sm">{users.length} users</span>
            <button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
              <Plus size={13} /> Invite User
            </button>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["User", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-[var(--tx5)] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface2)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--a-muted)] flex items-center justify-center text-[var(--a-text)] text-xs font-medium">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <span className="text-[var(--tx2)] font-medium">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--tx4)] text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs border", roleColors[u.role] ?? "bg-[var(--surface3)] text-[var(--tx4)] border-[var(--border)]")}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 size={12} /> Active</span>
                        : <span className="flex items-center gap-1.5 text-rose-400 text-xs"><XCircle size={12} /> Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--tx5)] text-xs">{u.last_login}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeactivate(u.id)} className="text-xs text-[var(--tx4)] hover:text-[var(--tx2)] transition-colors">
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <span className="text-[var(--tx6)]">·</span>
                        <button onClick={() => setDeleteTarget(u)} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 transition-colors">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Roles Tab ── */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--tx5)] text-sm">{roles.length} roles</span>
            <button onClick={openAddRole} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] transition-colors">
              <Plus size={13} /> Create Role
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => (
              <div key={r.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--a-border)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--a-muted)] flex items-center justify-center">
                    <Shield size={14} className="text-[var(--a-text)]" />
                  </div>
                  <button onClick={() => openEditRole(r)} className="flex items-center gap-1.5 text-xs text-[var(--tx5)] hover:text-[var(--tx3)] transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                </div>
                <h3 className="text-[var(--tx1)] font-semibold text-sm mt-3">{r.name}</h3>
                <p className="text-[var(--tx5)] text-xs mt-1 leading-relaxed">{r.description}</p>
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <p className="text-[var(--tx6)] text-xs mb-2">Permissions</p>
                  {r.permissions.length === 0
                    ? <p className="text-[var(--tx6)] text-xs italic">No permissions assigned</p>
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-0.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-full">{perm}</span>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invite User Modal ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">Invite User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input className={inputCls} placeholder="Jane" value={userForm.first_name} onChange={(e) => setUserForm((f) => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input className={inputCls} placeholder="Smith" value={userForm.last_name} onChange={(e) => setUserForm((f) => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} placeholder="jane@uftech.com" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddUserModal(false)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleAddUser} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors">Invite User</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--tx1)] font-semibold">Delete User</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <p className="text-[var(--tx4)] text-sm leading-relaxed">
              Are you sure you want to delete <span className="text-[var(--tx2)] font-medium">{deleteTarget.first_name} {deleteTarget.last_name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={() => handleDeleteUser(deleteTarget.id)} className="flex-1 py-2.5 bg-rose-500 text-white text-sm rounded-xl hover:bg-rose-400 font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Role Modal ── */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[var(--tx1)] font-semibold">{roleModal === "add" ? "Create Role" : "Edit Role"}</h3>
              <button onClick={() => setRoleModal(null)} className="text-[var(--tx5)] hover:text-[var(--tx3)]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Role Name</label>
                <input className={inputCls} placeholder="e.g. Sales Engineer" value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} placeholder="Brief description of this role's responsibilities" value={roleForm.description} onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Permissions</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5 max-h-52 overflow-y-auto pr-1">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = roleForm.permissions.includes(perm);
                    return (
                      <label key={perm} onClick={() => togglePermission(perm)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors select-none",
                          checked
                            ? "bg-[var(--a-muted)] border-[var(--a-border)] text-[var(--a-text)]"
                            : "bg-[var(--surface2)] border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)]"
                        )}>
                        <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          checked ? "bg-[var(--a)] border-[var(--a)]" : "border-[var(--tx5)]")}>
                          {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        {perm}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {roleModal === "edit" && (
                <button onClick={handleDeleteRole} className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl hover:bg-rose-500/20 transition-colors">
                  <Trash2 size={13} /> Delete Role
                </button>
              )}
              <button onClick={() => setRoleModal(null)} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">Cancel</button>
              <button onClick={handleSaveRole} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium transition-colors">
                {roleModal === "add" ? "Create Role" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
