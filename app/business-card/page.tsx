"use client";

import { useState } from "react";
import { Upload, Camera, CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { createItem } from "@/lib/api";

const mockParsed = {
  first_name: "Arjun", last_name: "Mehta", job_title: "Chief Technology Officer",
  company_name: "HorizonTech Solutions", email: "arjun.mehta@horizontech.com", phone_number: "+91 98765 43210",
};

type Step = "idle" | "processing" | "review" | "saved";

export default function BusinessCardPage() {
  const [step, setStep] = useState<Step>("idle");
  const [form, setForm] = useState(mockParsed);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSaveContact() {
    if (saving) return;
    setSaving(true);
    try {
      await createItem("contacts", {
        account_id:   "",
        first_name:   form.first_name,
        last_name:    form.last_name,
        email:        form.email,
        phone:        form.phone_number,
        job_title:    form.job_title,
        account_name: form.company_name,
      });
      setStep("saved");
    } finally {
      setSaving(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStep("processing");
    setTimeout(() => { setForm(mockParsed); setStep("review"); }, 2200);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="bg-[var(--a-muted)] border border-[var(--a-border)] rounded-xl p-4 flex items-start gap-3">
        <CreditCard size={16} className="text-[var(--a-text)] shrink-0 mt-0.5" />
        <div>
          <p className="text-[var(--a-text)] text-sm font-medium">AI-Powered Business Card Scanner</p>
          <p className="text-[var(--tx5)] text-xs mt-0.5">Upload a photo — our local OCR + LLM pipeline extracts contact details for your review before saving.</p>
        </div>
      </div>

      {step === "idle" && (
        <label className="block cursor-pointer">
          <div className="bg-[var(--surface)] border-2 border-dashed border-[var(--surface3)] rounded-2xl p-12 text-center hover:border-[var(--a-border)] hover:bg-[var(--a-subtle)] transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-[var(--a-muted)] flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--a-muted)] transition-colors">
              <Upload size={24} className="text-[var(--a-text)]" />
            </div>
            <p className="text-[var(--tx3)] font-medium text-sm mb-1">Drop a business card image here</p>
            <p className="text-[var(--tx5)] text-xs">PNG, JPG, WEBP · Max 10MB</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="h-px w-12 bg-[var(--border)]" />
              <span className="text-[var(--tx6)] text-xs">or</span>
              <span className="h-px w-12 bg-[var(--border)]" />
            </div>
            <button className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-[var(--a-muted)] border border-[var(--a-border)] text-[var(--a-text)] text-xs rounded-lg hover:bg-[var(--a-muted)] transition-colors">
              <Camera size={13} /> Browse Files
            </button>
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}

      {step === "processing" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <Loader2 size={32} className="text-[var(--a-text)] mx-auto mb-4 animate-spin" />
          <p className="text-[var(--tx2)] font-medium text-sm">Processing via AI...</p>
          <p className="text-[var(--tx5)] text-xs mt-1">{fileName}</p>
          <div className="mt-4 space-y-1.5 max-w-xs mx-auto">
            {["Preprocessing image (OpenCV)", "Running OCR (Tesseract)", "Extracting fields (LLM)"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs text-[var(--tx5)]">
                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-amber-500 animate-pulse" : "bg-[var(--surface3)]"}`} />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center">
              <span className="text-amber-400 text-xs font-bold">!</span>
            </div>
            <p className="text-[var(--tx3)] text-sm font-medium">Review Extracted Data</p>
            <span className="ml-auto text-xs text-[var(--tx5)]">AI confidence: 97%</span>
          </div>
          <p className="text-[var(--tx5)] text-xs">Verify the fields below before saving. Edit any incorrect values.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(form).map(([key, val]) => (
              <div key={key} className={key === "company_name" || key === "email" ? "col-span-2" : ""}>
                <label className="text-[var(--tx5)] text-xs capitalize mb-1 block">{key.replace(/_/g, " ")}</label>
                <input value={val} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx2)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--a-border)] focus:ring-1 focus:ring-[var(--a-ring)] transition-colors" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setStep("idle"); setFileName(""); }} className="flex-1 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl">Retake</button>
            <button onClick={handleSaveContact} disabled={saving} className="flex-1 py-2.5 bg-[var(--a)] text-white text-sm rounded-xl hover:bg-[var(--a-hover)] font-medium disabled:opacity-60">{saving ? "Saving…" : "Confirm & Save Contact"}</button>
          </div>
        </div>
      )}

      {step === "saved" && (
        <div className="bg-[var(--surface)] border border-emerald-500/30 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <p className="text-[var(--tx1)] font-semibold text-base">{form.first_name} {form.last_name}</p>
          <p className="text-[var(--tx4)] text-sm">{form.job_title} · {form.company_name}</p>
          <p className="text-emerald-400 text-xs mt-3">Contact saved to CRM</p>
          <button onClick={() => { setStep("idle"); setFileName(""); }} className="mt-5 px-5 py-2.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--tx4)] text-sm rounded-xl hover:border-[var(--a-border)] transition-colors">
            Scan Another Card
          </button>
        </div>
      )}
    </div>
  );
}
