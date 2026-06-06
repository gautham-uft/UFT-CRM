"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Phone, CheckSquare, Users, AlertCircle, Plus } from "lucide-react";
import { type CalendarEvent, type CalendarEventType } from "@/lib/mock-data";
import { useAppData } from "@/contexts/AppDataContext";
import { useNow } from "@/contexts/NowContext";
import { cn } from "@/lib/utils";

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const typeConfig: Record<CalendarEventType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  meeting:  { icon: Users,        color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20",    label: "Meeting"  },
  task:     { icon: CheckSquare,  color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20",  label: "Task"     },
  call:     { icon: Phone,        color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20",label: "Call"     },
  deadline: { icon: AlertCircle,  color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20",      label: "Deadline" },
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

const EMPTY_FORM = { title: "", type: "task" as CalendarEventType, time: "", assignee: "", related_to: "" };

export default function CalendarPanel({ onClose }: { onClose: () => void }) {
  const { calendarEvents, followUps, addCalendarEvent } = useAppData();
  const { today: todayStr } = useNow();

  // Follow-ups (from leads & deals) show up on the calendar alongside real
  // calendar events. Calendar-sourced follow-ups are skipped — their originating
  // event is already in calendarEvents, so including them would double up.
  const followUpEvents: CalendarEvent[] = followUps
    .filter(f => f.source !== "calendar" && f.follow_up_date)
    .map(f => ({
      id:         `fu-${f.id}`,
      title:      f.note || f.entity_name,
      date:       f.follow_up_date!,
      type:       f.category === "callback" || f.category === "call" ? "call"
                : f.category === "deadline" ? "deadline"
                : f.category === "task" ? "task" : "meeting",
      related_to: f.entity_name,
      done:       f.done,
    }));

  const allEvents = [...calendarEvents, ...followUpEvents];

  const todayDate = new Date(todayStr + "T00:00:00");

  const [year,        setYear]        = useState(todayDate.getFullYear());
  const [month,       setMonth]       = useState(todayDate.getMonth());
  const [selected,    setSelected]    = useState(todayStr);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const panelRef = useRef<HTMLDivElement>(null);

  // When the app's "today" changes (testing date picker), jump the calendar to
  // it. Adjusting state during render (React's recommended pattern) rather than
  // in an effect avoids an extra render pass.
  const [prevToday, setPrevToday] = useState(todayStr);
  if (prevToday !== todayStr) {
    setPrevToday(todayStr);
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
    setSelected(todayStr);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix = `${year}-${pad(month + 1)}-`;
  const eventDays = new Set(
    allEvents
      .filter(e => e.date.startsWith(monthPrefix))
      .map(e => parseInt(e.date.slice(8)))
  );

  const selectedEvents = allEvents
    .filter(e => e.date === selected)
    .sort((a, b) => (a.time ?? "ZZ").localeCompare(b.time ?? "ZZ"));

  const selectedLabel = selected === todayStr
    ? "Today"
    : new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  function handleAddEvent() {
    if (!form.title.trim()) return;
    addCalendarEvent({
      title:      form.title.trim(),
      date:       selected,
      type:       form.type,
      ...(form.time      ? { time: form.time }           : {}),
      ...(form.assignee  ? { assignee: form.assignee }   : {}),
      ...(form.related_to? { related_to: form.related_to}: {}),
      ...(form.type === "task" ? { done: false } : {}),
    });
    setForm(EMPTY_FORM);
    setShowAddForm(false);
  }

  const inputCls = "w-full px-2.5 py-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx2)] text-xs placeholder:text-[var(--tx6)] focus:outline-none focus:border-[var(--a-border)] transition-colors";

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-[var(--tx1)]">
          {MONTHS[month]} {year}
        </span>
        <div className="flex gap-0.5">
          <button onClick={prevMonth} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--surface2)] text-[var(--tx4)] transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={nextMonth} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--surface2)] text-[var(--tx4)] transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--tx5)] py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr    = toDateStr(year, month, day);
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selected;
          const hasEvents  = eventDays.has(day);
          return (
            <button
              key={i}
              onClick={() => setSelected(dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-lg text-xs font-medium transition-all",
                isSelected
                  ? "bg-[var(--a)] text-white shadow-sm"
                  : isToday
                  ? "border border-[var(--a-border)] text-[var(--a-text)]"
                  : "text-[var(--tx3)] hover:bg-[var(--surface2)]"
              )}
            >
              <span className="leading-none -mt-1">{day}</span>
              {hasEvents && (
                <span className={cn(
                  "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                  isSelected ? "bg-white" : "bg-[var(--a)]"
                )} />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* Events for selected date */}
      <div className="max-h-52 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-xs font-semibold text-[var(--tx2)]">{selectedLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--tx5)]">
              {selectedEvents.length} item{selectedEvents.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                showAddForm
                  ? "bg-[var(--a-muted)] text-[var(--a-text)] border border-[var(--a-border)]"
                  : "bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] hover:border-[var(--a-border)] hover:text-[var(--tx2)]"
              )}
            >
              <Plus size={10} /> New
            </button>
          </div>
        </div>

        {selectedEvents.length === 0 && !showAddForm ? (
          <p className="text-xs text-[var(--tx6)] text-center py-4 pb-3">No events scheduled</p>
        ) : (
          <div className="px-3 pb-3 space-y-1.5">
            {selectedEvents.map(event => {
              const cfg  = typeConfig[event.type];
              const Icon = cfg.icon;
              return (
                <div key={event.id} className={cn("flex gap-2.5 p-2.5 rounded-lg border text-xs", cfg.bg)}>
                  <Icon size={13} className={cn("mt-0.5 shrink-0", cfg.color)} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("font-medium text-[var(--tx1)] truncate", event.done && "line-through opacity-50")}>
                      {event.title}
                    </div>
                    <div className="flex flex-wrap gap-x-1.5 mt-0.5 text-[var(--tx5)]">
                      {event.time     && <span>{event.time}</span>}
                      {event.assignee && <span>· {event.assignee}</span>}
                      {event.related_to && <span className="truncate opacity-70">· {event.related_to}</span>}
                    </div>
                  </div>
                  {event.done !== undefined && (
                    <input
                      type="checkbox"
                      defaultChecked={event.done}
                      className="mt-0.5 accent-[var(--a)] shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Event form ── */}
      {showAddForm && (
        <div className="border-t border-[var(--border)] px-3 py-3 space-y-2">
          <input
            autoFocus
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAddEvent()}
            placeholder="Event title…"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEventType }))}
              className={inputCls}
            >
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
            </select>
            <input
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              placeholder="Time (e.g. 10:00)"
              className={inputCls}
            />
          </div>
          <input
            value={form.assignee}
            onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
            placeholder="Assignee (optional)"
            className={inputCls}
          />
          <input
            value={form.related_to}
            onChange={e => setForm(f => ({ ...f, related_to: e.target.value }))}
            placeholder="Related to — deal or contact (optional)"
            className={inputCls}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }}
              className="flex-1 py-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-xs rounded-lg hover:border-[var(--a-border)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEvent}
              disabled={!form.title.trim()}
              className="flex-1 py-1.5 bg-[var(--a)] text-white text-xs rounded-lg hover:bg-[var(--a-hover)] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
