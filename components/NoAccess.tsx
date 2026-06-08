"use client";

import { Lock } from "lucide-react";

// Shown when the current user's role has no Read access to a module.
export default function NoAccess({ module }: { module: string }) {
  return (
    <div className="h-[calc(100vh-160px)] flex flex-col items-center justify-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center">
        <Lock size={22} className="text-[var(--tx5)]" />
      </div>
      <div>
        <p className="text-[var(--tx1)] font-semibold text-sm">No access to {module}</p>
        <p className="text-[var(--tx5)] text-xs mt-1 max-w-xs">
          Your role doesn&apos;t have read permission for this module. Ask an admin to grant access in Settings → Roles &amp; Permissions.
        </p>
      </div>
    </div>
  );
}
