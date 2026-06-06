"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";

// A single, app-wide "now" (date + time). Normally the real clock, but the
// TopBar exposes a picker (for testing) that lets you move "now" around so you
// can see how the dashboard banners, calendar, follow-ups, and notifications
// react to different dates/times.
//
// The real clock is a client-only value, so it's read via useSyncExternalStore
// with a server snapshot of "" — that keeps the server render and the first
// client render identical (no hydration mismatch), then fills in on the client.

function pad(n: number) { return String(n).padStart(2, "0"); }

function realNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type NowContextType = {
  now: string;            // "YYYY-MM-DDTHH:mm" ("" before hydration)
  today: string;          // "YYYY-MM-DD"  ("" before hydration)
  setNow: (v: string) => void;
  reset: () => void;
  isOverridden: boolean;
};

const NowContext = createContext<NowContextType>({
  now: "", today: "", setNow: () => {}, reset: () => {}, isOverridden: false,
});

// No external subscription needed — the real clock only needs to be read once
// after hydration; the snapshot is recomputed on render.
const noopSubscribe = () => () => {};

export function NowProvider({ children }: { children: React.ReactNode }) {
  const realClientNow = useSyncExternalStore(noopSubscribe, realNow, () => "");
  const [override, setOverride] = useState<string | null>(null);

  const now = override ?? realClientNow;
  const today = now.slice(0, 10);

  function setNow(v: string) {
    if (!v) return;
    setOverride(v);
  }

  function reset() {
    setOverride(null);
  }

  return (
    <NowContext.Provider value={{ now, today, setNow, reset, isOverridden: override !== null }}>
      {children}
    </NowContext.Provider>
  );
}

export const useNow = () => useContext(NowContext);
