"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

// The "current user" — whose identity the app acts as. Normally this would come
// from auth; for the demo it's a switchable value (see the Dev Tools panel) so
// you can see how the app looks as different people. It's persisted to
// localStorage so the choice survives reloads.
//
// Backed by a tiny external store read via useSyncExternalStore: the server (and
// the first client render) sees DEFAULT_USER, then the stored value fills in
// after hydration — the same hydration-safe pattern used by NowContext.

export type CurrentUser = {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  role:       string;
};

// The built-in default identity, always available even before any users are
// created in Settings. Its id matches the seeded "director" user so the Dev
// Tools switcher shows it once, not twice.
export const DEFAULT_USER: CurrentUser = {
  id:         "director",
  first_name: "Director",
  last_name:  "",
  email:      "director@uftech.com",
  role:       "Director",
};

const STORAGE_KEY = "uft-current-user";

// ── External store ────────────────────────────────────────────────
let current: CurrentUser = DEFAULT_USER;
let loaded = false;
const listeners = new Set<() => void>();

function loadFromStorage() {
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) current = JSON.parse(raw) as CurrentUser;
  } catch {
    /* ignore malformed / unavailable storage */
  }
}

function subscribe(cb: () => void) {
  if (!loaded) loadFromStorage();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) { loadFromStorage(); cb(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

// Returns a stable reference (only changes when setStore replaces `current`),
// which useSyncExternalStore requires to avoid infinite re-renders.
function getSnapshot(): CurrentUser {
  if (!loaded) loadFromStorage();
  return current;
}

function getServerSnapshot(): CurrentUser {
  return DEFAULT_USER;
}

function setStore(u: CurrentUser) {
  current = u;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch {
    /* ignore quota / unavailable storage */
  }
  listeners.forEach((l) => l());
}

// ── Context ───────────────────────────────────────────────────────
type CurrentUserContextType = {
  currentUser:    CurrentUser;
  setCurrentUser: (u: CurrentUser) => void;
};

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser:    DEFAULT_USER,
  setCurrentUser: () => {},
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser: setStore }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(CurrentUserContext);
