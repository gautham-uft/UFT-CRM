"use client";

import { createContext, useContext, useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { type Module, SUPERUSER_ROLE } from "@/lib/permissions";

// Permission grant as stored on a role: per-module read/write. Older data may
// have stored a plain string[] of module names — treated as read-only access.
type StoredGrant = { module: string; read?: boolean; write?: boolean } | string;
type RoleRow = { id: string; name: string; permissions?: StoredGrant[] };

type Grant = { read: boolean; write: boolean };
type GrantMap = Record<string, Grant>;

function buildGrantMap(permissions: StoredGrant[] | undefined): GrantMap {
  const map: GrantMap = {};
  if (!Array.isArray(permissions)) return map;
  for (const p of permissions) {
    if (typeof p === "string") {
      map[p] = { read: true, write: false };
    } else if (p && typeof p.module === "string") {
      map[p.module] = { read: !!p.read, write: !!p.write };
    }
  }
  return map;
}

type PermissionsContextType = {
  ready:     boolean;
  roleName:  string;
  isSuper:   boolean;
  canRead:   (m: Module) => boolean;
  canWrite:  (m: Module) => boolean;
};

const PermissionsContext = createContext<PermissionsContextType>({
  ready: false, roleName: "", isSuper: false,
  canRead: () => true, canWrite: () => true,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCurrentUser();
  const { items: roles, loading } = useCollection<RoleRow>("roles");

  const value = useMemo<PermissionsContextType>(() => {
    const ready = !loading;
    const roleName = currentUser.role;
    const isSuper = roleName === SUPERUSER_ROLE;
    const role = roles.find((r) => r.name === roleName);
    const grants = buildGrantMap(role?.permissions);

    // While roles are still loading, be optimistic (return true) so the UI does
    // not flash "locked out" before grants resolve. Page-level guards that show
    // a "No access" screen do so only once `ready` is true. Superusers always
    // have full access. Once ready, access is strictly what the role grants.
    const canRead = (m: Module) => isSuper || !ready || !!grants[m]?.read;
    const canWrite = (m: Module) => isSuper || !ready || !!grants[m]?.write;

    return { ready, roleName, isSuper, canRead, canWrite };
  }, [roles, loading, currentUser.role]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export const usePermissions = () => useContext(PermissionsContext);
