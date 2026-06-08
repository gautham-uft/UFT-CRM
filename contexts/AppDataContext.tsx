"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type CalendarEvent } from "@/lib/mock-data";
import { listCollection, createItem, updateItem, deleteItem } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────

export type FollowUpSource = "lead" | "deal" | "calendar" | "task";

export type FollowUpItem = {
  id:              string;
  source:          FollowUpSource;
  source_id:       string;
  entity_name:     string;
  category:        string;
  note?:           string;
  follow_up_date?: string;
  logged_at:       string;
  done:            boolean;
  assignee?:       string;  // who the task is assigned to (task source)
  assigned_by?:    string;  // who assigned it
};

export type ActivityItem = {
  id:            string;
  user:          string;
  entity_type:   string;
  entity_name:   string;
  activity_type: "call_log" | "email" | "note" | "meeting";
  description:   string;
  created_at:    string;
};

// ── Context interface ─────────────────────────────────────────────

interface AppDataContextType {
  calendarEvents:   CalendarEvent[];
  addCalendarEvent: (e: Omit<CalendarEvent, "id">) => void;
  followUps:        FollowUpItem[];
  addFollowUp:      (item: Omit<FollowUpItem, "id">) => void;
  toggleFollowUp:   (id: string) => void;
  updateFollowUp:   (id: string, patch: Partial<FollowUpItem>) => void;
  deleteFollowUp:   (id: string) => void;
  activities:       ActivityItem[];
  addActivity:      (item: Omit<ActivityItem, "id">) => void;
  deleteActivity:   (id: string) => void;
  loading:          boolean;
}

const AppDataContext = createContext<AppDataContextType>({
  calendarEvents:   [],
  addCalendarEvent: () => {},
  followUps:        [],
  addFollowUp:      () => {},
  toggleFollowUp:   () => {},
  updateFollowUp:   () => {},
  deleteFollowUp:   () => {},
  activities:       [],
  addActivity:      () => {},
  deleteActivity:   () => {},
  loading:          true,
});

// ── Provider ──────────────────────────────────────────────────────
//
// Activities, follow-ups, and calendar events are shared across many pages, so
// they live here. All three are loaded from and persisted to the local JSON
// database (/api/*). Mutations update local state immediately and write to disk
// in the background, so the change survives reloads and shows up everywhere.

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [followUps,      setFollowUps]      = useState<FollowUpItem[]>([]);
  const [activities,     setActivities]     = useState<ActivityItem[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      listCollection<CalendarEvent>("calendarEvents"),
      listCollection<FollowUpItem>("followUps"),
      listCollection<ActivityItem>("activities"),
    ])
      .then(([ce, fu, act]) => {
        if (!active) return;
        setCalendarEvents(ce);
        setFollowUps(fu);
        // Newest activities first.
        setActivities([...act].reverse());
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function addCalendarEvent(e: Omit<CalendarEvent, "id">) {
    createItem<CalendarEvent>("calendarEvents", e).then((created) => {
      setCalendarEvents((prev) => [...prev, created]);
      if (e.type === "task" || e.type === "call") {
        addFollowUp({
          source:         "calendar",
          source_id:      created.id,
          entity_name:    e.related_to ?? e.assignee ?? e.title,
          category:       e.type,
          note:           e.title,
          follow_up_date: e.date,
          logged_at:      new Date().toISOString(),
          done:           false,
        });
      }
    });
  }

  function addFollowUp(item: Omit<FollowUpItem, "id">) {
    // De-duplicate: drop any existing follow-up for the same source entity,
    // both locally and on the server, before adding the new one.
    setFollowUps((prev) => {
      const stale = prev.filter((f) => f.source === item.source && f.source_id === item.source_id);
      stale.forEach((f) => deleteItem("followUps", f.id).catch(() => {}));
      const deduped = prev.filter((f) => !(f.source === item.source && f.source_id === item.source_id));
      return deduped;
    });
    createItem<FollowUpItem>("followUps", item).then((created) => {
      setFollowUps((prev) => [...prev, created]);
    });
  }

  function toggleFollowUp(id: string) {
    setFollowUps((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) updateItem<FollowUpItem>("followUps", id, { done: !target.done }).catch(() => {});
      return prev.map((f) => (f.id === id ? { ...f, done: !f.done } : f));
    });
  }

  function updateFollowUp(id: string, patch: Partial<FollowUpItem>) {
    setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    updateItem<FollowUpItem>("followUps", id, patch).catch(() => {});
  }

  function deleteFollowUp(id: string) {
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
    deleteItem("followUps", id).catch(() => {});
  }

  function addActivity(item: Omit<ActivityItem, "id">) {
    createItem<ActivityItem>("activities", item).then((created) => {
      setActivities((prev) => [created, ...prev]);
    });
  }

  function deleteActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    deleteItem("activities", id).catch(() => {});
  }

  return (
    <AppDataContext.Provider value={{
      calendarEvents, addCalendarEvent,
      followUps, addFollowUp, toggleFollowUp, updateFollowUp, deleteFollowUp,
      activities, addActivity, deleteActivity,
      loading,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
