import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const [items, setItems] = useState([]);
  const [prescOpen, setPrescOpen] = useState(null);
  const [presc, setPresc] = useState({ medicines: "", notes: "" });

  const load = async () => setItems((await api.get("/appointments", { params: { today: true } })).data);
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => { await api.patch(`/appointments/${id}/status`, { status }); load(); };
  const submitPresc = async (e) => {
    e.preventDefault();
    try {
      await api.post("/prescriptions", { appointment_id: prescOpen.id, ...presc });
      toast.success("Prescription saved");
      setPrescOpen(null); setPresc({ medicines: "", notes: "" });
      load();
    } catch { toast.error("Failed to save prescription"); }
  };

  return (
    <Layout>
      <PageHeader title="Today's appointments" subtitle="Your schedule for today, with quick clinical actions." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5" data-testid={`today-appt-${a.id}`}>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold tabular-nums">{a.time}</div>
              <StatusBadge status={a.status} />
            </div>
            <div className="mt-3">
              <div className="font-medium">{a.patient_name}</div>
              <div className="text-xs text-slate-500">Age {a.patient_age || "—"} · {a.patient_phone || "—"}</div>
            </div>
            <p className="text-sm text-slate-600 mt-3 line-clamp-2">{a.reason || "—"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {a.status !== "completed" && (
                <button onClick={() => setPrescOpen(a)} data-testid={`write-prescription-${a.id}`} className="text-xs rounded-md bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5">Write prescription</button>
              )}
              {a.status === "pending" && (
                <button onClick={() => setStatus(a.id, "confirmed")} data-testid={`confirm-${a.id}`} className="text-xs rounded-md border border-slate-200 hover:border-blue-500 px-3 py-1.5">Confirm</button>
              )}
              {a.status !== "cancelled" && a.status !== "completed" && (
                <button onClick={() => setStatus(a.id, "cancelled")} className="text-xs rounded-md text-rose-600 px-2 py-1.5">Cancel</button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-slate-500 text-sm">No appointments today — enjoy your coffee ☕.</div>}
      </div>

      {prescOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submitPresc} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-xl space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Prescription for</div>
              <div className="font-semibold text-lg">{prescOpen.patient_name} <span className="text-sm text-slate-500 font-normal">— {prescOpen.date} {prescOpen.time}</span></div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500">Medicines</label>
              <textarea required rows={5} value={presc.medicines} onChange={(e) => setPresc({ ...presc, medicines: e.target.value })} data-testid="prescription-medication-input" className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm font-mono" placeholder="e.g. Amoxicillin 500mg — 1 tab thrice a day for 5 days" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500">Notes</label>
              <textarea rows={3} value={presc.notes} onChange={(e) => setPresc({ ...presc, notes: e.target.value })} data-testid="prescription-notes-input" className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPrescOpen(null)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" data-testid="prescription-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 text-white">Save & complete</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
