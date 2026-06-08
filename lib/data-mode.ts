// Data access mode (runtime-toggleable from Dev Tools → Online Mode).
//
//  • Online mode (direct)  → every read/write hits the cloud bin directly via
//    /api/* — always reflects live, shared data, no local copy.
//  • Offline-first         → reads from the browser's localStorage cache,
//    writes mirror to the cloud (faster; survives flaky connections).
//
// The default comes from the build (NEXT_PUBLIC_DIRECT_DB → "1" on Vercel), but
// the user can override it at runtime; the choice is persisted to localStorage.

const BUILD_DEFAULT = process.env.NEXT_PUBLIC_DIRECT_DB === "1";
const KEY = "uft-online-mode";

let override: boolean | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "1") override = true;
    else if (v === "0") override = false;
  } catch {
    /* no localStorage (SSR) — fall back to the build default */
  }
}

// Effective mode: true = online/direct, false = offline-first.
export function isDirect(): boolean {
  ensureLoaded();
  return override !== null ? override : BUILD_DEFAULT;
}

export function setOnlineMode(on: boolean) {
  ensureLoaded();
  override = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

// ── Observable (useSyncExternalStore) ──────────────────────────────
export function subscribeMode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getModeSnapshot(): boolean {
  return isDirect();
}
export function getModeServerSnapshot(): boolean {
  return BUILD_DEFAULT;
}
