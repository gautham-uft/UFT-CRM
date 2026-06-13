"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A click-to-open digital clock that edits a 24h "HH:MM" string. Shows 12-hour
// digits you can type into or step with arrows, plus an AM/PM toggle. Commits on
// every valid change; opens as a floating popup above the field.
const pad = (n: number) => String(n).padStart(2, "0");

type Parts = { h12: number; min: number; ampm: "AM" | "PM" };

function parse(value: string): Parts {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return { h12: 9, min: 0, ampm: "AM" };
  const [H, M] = value.split(":").map(Number);
  const ampm = H >= 12 ? "PM" : "AM";
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return { h12, min: Math.min(59, Math.max(0, M)), ampm };
}
function to24(h12: number, min: number, ampm: "AM" | "PM"): string {
  const h = (h12 % 12) + (ampm === "PM" ? 12 : 0);
  return `${pad(h)}:${pad(min)}`;
}
function readable(value: string): string {
  const { h12, min, ampm } = parse(value);
  return `${h12}:${pad(min)} ${ampm}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seed = parse(value || "09:00");
  const [h12, setH] = useState(seed.h12);
  const [min, setMin] = useState(seed.min);
  const [ampm, setAmpm] = useState<"AM" | "PM">(seed.ampm);
  // Editing buffers so the inputs can hold partial text while typing.
  const [hbuf, setHbuf] = useState(pad(seed.h12));
  const [mbuf, setMbuf] = useState(pad(seed.min));

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openPicker() {
    const c = parse(value || "09:00");
    setH(c.h12); setMin(c.min); setAmpm(c.ampm);
    setHbuf(pad(c.h12)); setMbuf(pad(c.min));
    setOpen(o => !o);
  }
  function commit(nh: number, nm: number, na: "AM" | "PM") { onChange(to24(nh, nm, na)); }

  // Steppers + blur normalization keep state, buffers, and the committed value in sync.
  function applyHour(raw: number) { const v = ((raw - 1 + 12) % 12) + 1; setH(v); setHbuf(pad(v)); commit(v, min, ampm); }
  function applyMinute(raw: number) { const v = (raw + 60) % 60; setMin(v); setMbuf(pad(v)); commit(h12, v, ampm); }
  function setMer(a: "AM" | "PM") { setAmpm(a); commit(h12, min, a); }

  function onHourType(s: string) {
    const raw = s.replace(/\D/g, "").slice(0, 2);
    setHbuf(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) { setH(n); commit(n, min, ampm); }
  }
  function onHourBlur() { const n = parseInt(hbuf, 10); const v = isNaN(n) ? h12 : Math.min(12, Math.max(1, n)); setH(v); setHbuf(pad(v)); commit(v, min, ampm); }
  function onMinType(s: string) {
    const raw = s.replace(/\D/g, "").slice(0, 2);
    setMbuf(raw);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) { setMin(n); commit(h12, n, ampm); }
  }
  function onMinBlur() { const n = parseInt(mbuf, 10); const v = isNaN(n) ? min : Math.min(59, Math.max(0, n)); setMin(v); setMbuf(pad(v)); commit(h12, v, ampm); }

  const stepBtn = "w-8 h-7 rounded-md flex items-center justify-center text-[var(--tx5)] hover:bg-[var(--surface2)] hover:text-[var(--tx2)] transition-colors";
  const digitCls = "w-12 text-center bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--tx1)] text-2xl font-semibold tabular-nums py-1 focus:outline-none focus:border-[var(--a-border)]";
  const triggerCls = "w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-xs flex items-center gap-2 hover:border-[var(--a-border)] transition-colors";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={openPicker} className={triggerCls}>
        <Clock size={13} className="text-[var(--tx5)] shrink-0" />
        <span className={value ? "text-[var(--tx2)]" : "text-[var(--tx6)]"}>{value ? readable(value) : placeholder}</span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-max rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
          <div className="flex items-center justify-center gap-2">
            {/* Hour */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => applyHour(h12 + 1)} className={stepBtn}><ChevronUp size={15} /></button>
              <input inputMode="numeric" value={hbuf} onChange={e => onHourType(e.target.value)} onBlur={onHourBlur} onFocus={e => e.currentTarget.select()} className={digitCls} />
              <button type="button" onClick={() => applyHour(h12 - 1)} className={stepBtn}><ChevronDown size={15} /></button>
            </div>

            <span className="text-2xl font-semibold text-[var(--tx4)] pb-0.5">:</span>

            {/* Minute */}
            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => applyMinute(min + 5)} className={stepBtn}><ChevronUp size={15} /></button>
              <input inputMode="numeric" value={mbuf} onChange={e => onMinType(e.target.value)} onBlur={onMinBlur} onFocus={e => e.currentTarget.select()} className={digitCls} />
              <button type="button" onClick={() => applyMinute(min - 5)} className={stepBtn}><ChevronDown size={15} /></button>
            </div>

            {/* AM / PM */}
            <div className="flex flex-col gap-1 ml-2">
              {(["AM", "PM"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMer(m)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-colors", ampm === m ? "bg-[var(--a)] text-white" : "bg-[var(--surface2)] text-[var(--tx4)] hover:text-[var(--tx2)]")}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
