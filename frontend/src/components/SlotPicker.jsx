import { useEffect, useState } from "react";
import api from "@/lib/api";

/**
 * Fetches available slots for the given doctor & date, renders a chip grid.
 * Calls onChange(time) when a slot is picked.
 */
export default function SlotPicker({ doctorId, date, value, onChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) { setData(null); return; }
    setLoading(true);
    api.get(`/doctors/${doctorId}/slots`, { params: { date } })
      .then((r) => setData(r.data))
      .catch(() => setData({ slots: [], all_slots: [], taken: [], day_enabled: false }))
      .finally(() => setLoading(false));
  }, [doctorId, date]);

  if (!doctorId || !date) {
    return <div className="text-sm text-slate-500">Pick a date to see available slots.</div>;
  }
  if (loading) return <div className="text-sm text-slate-500">Loading slots…</div>;
  if (!data) return null;
  if (!data.day_enabled) {
    return <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" data-testid="slot-day-closed">Doctor is not available on this day.</div>;
  }
  if (data.all_slots.length === 0) {
    return <div className="text-sm text-slate-500" data-testid="slot-none-configured">No slots configured for this day.</div>;
  }

  const taken = new Set(data.taken);
  const free = new Set(data.slots);

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        Available slots <span className="ml-2 tabular-nums normal-case text-slate-400">{data.slots.length} of {data.all_slots.length} open · {data.slot_duration}min</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2" data-testid="slot-grid">
        {data.all_slots.map((s) => {
          const isFree = free.has(s);
          const isTaken = taken.has(s);
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              disabled={!isFree}
              onClick={() => onChange(s)}
              data-testid={`slot-${s}`}
              className={`tabular-nums text-sm rounded-md px-2 py-2 border transition-colors ${
                selected
                  ? "bg-blue-700 text-white border-blue-700"
                  : isFree
                  ? "bg-white border-slate-200 hover:border-blue-500 text-slate-900"
                  : "bg-stone-100 text-slate-400 border-slate-200 line-through cursor-not-allowed"
              }`}
              title={isTaken ? "Already booked" : ""}
            >
              {s}
            </button>
          );
        })}
      </div>
      {data.slots.length === 0 && (
        <div className="text-xs text-amber-700 mt-3" data-testid="slot-fully-booked">All slots on this day are booked. Try another date.</div>
      )}
    </div>
  );
}
