import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
  ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

const DEFAULT_SCHEDULE = {
  mon: { enabled: true, start: "09:00", end: "17:00" },
  tue: { enabled: true, start: "09:00", end: "17:00" },
  wed: { enabled: true, start: "09:00", end: "17:00" },
  thu: { enabled: true, start: "09:00", end: "17:00" },
  fri: { enabled: true, start: "09:00", end: "17:00" },
  sat: { enabled: false, start: "09:00", end: "13:00" },
  sun: { enabled: false, start: "09:00", end: "13:00" },
};

export default function DoctorSchedule() {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [slotDuration, setSlotDuration] = useState(30);
  const [availability, setAvailability] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/doctors/me/profile").then((r) => {
      setProfile(r.data);
      setSchedule({ ...DEFAULT_SCHEDULE, ...(r.data.weekly_schedule || {}) });
      setSlotDuration(r.data.slot_duration || 30);
      setAvailability(r.data.availability || "");
    });
  }, []);

  const updateDay = (k, field, value) => setSchedule((s) => ({ ...s, [k]: { ...s[k], [field]: value } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/doctors/me/schedule", { weekly_schedule: schedule, slot_duration: Number(slotDuration) });
      if (availability !== profile.availability) {
        await api.patch("/doctors/me/availability", { availability });
      }
      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <Layout><div className="text-slate-500 text-sm">Loading…</div></Layout>;

  return (
    <Layout>
      <PageHeader title="My schedule" subtitle="Define your working hours; patients see only the slots you've enabled." />
      <form onSubmit={save} className="space-y-6 max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
            <div><div className="text-xs uppercase tracking-wider text-slate-500">Name</div><div className="mt-1 font-medium">{profile.name}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-slate-500">Specialization</div><div className="mt-1 font-medium">{profile.specialization}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-slate-500">Experience</div><div className="mt-1 tabular-nums">{profile.experience} years</div></div>
          </div>
          <div className="flex items-center gap-4 border-t border-slate-100 pt-4">
            <label className="text-xs uppercase tracking-wider text-slate-500">Slot duration</label>
            <select value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} data-testid="slot-duration-select" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm">
              {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 font-semibold tracking-tight">Weekly hours</div>
          <div className="divide-y divide-slate-100">
            {DAYS.map(([k, label]) => {
              const day = schedule[k] || { enabled: false, start: "09:00", end: "17:00" };
              return (
                <div key={k} className="grid grid-cols-12 items-center gap-3 px-6 py-3" data-testid={`day-row-${k}`}>
                  <label className="col-span-4 flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => updateDay(k, "enabled", e.target.checked)}
                      data-testid={`day-toggle-${k}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${day.enabled ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                  </label>
                  <div className="col-span-4">
                    <input
                      type="time"
                      value={day.start}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(k, "start", e.target.value)}
                      data-testid={`day-start-${k}`}
                      className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm disabled:opacity-50 tabular-nums"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="time"
                      value={day.end}
                      disabled={!day.enabled}
                      onChange={(e) => updateDay(k, "end", e.target.value)}
                      data-testid={`day-end-${k}`}
                      className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm disabled:opacity-50 tabular-nums"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <label className="text-xs uppercase tracking-wider text-slate-500">Public availability note</label>
          <input
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            data-testid="availability-input"
            placeholder="e.g. Mon-Fri 9-5, closed on public holidays"
            className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-slate-500 mt-2">Shown to patients above the slot picker.</p>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} data-testid="schedule-save-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-5 py-2.5 disabled:opacity-50">
            {saving ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </form>
    </Layout>
  );
}
