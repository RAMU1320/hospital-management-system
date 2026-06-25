import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { api.get("/patients", { params: { q } }).then((r) => setPatients(r.data)); }, [q]);

  const openPatient = async (p) => {
    setActive(p);
    const presc = await api.get("/prescriptions", { params: { patient_id: p.id } });
    setHistory(presc.data);
  };

  return (
    <Layout>
      <PageHeader title="Patients" subtitle="Look up patient records and clinical history." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="doctor-patient-search" placeholder="Search patients…" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mb-3" />
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 max-h-[60vh] overflow-auto">
            {patients.map((p) => (
              <button key={p.id} onClick={() => openPatient(p)} data-testid={`patient-select-${p.id}`} className={`w-full text-left px-4 py-3 hover:bg-stone-50 ${active?.id === p.id ? "bg-blue-50" : ""}`}>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-slate-500">{p.email}</div>
              </button>
            ))}
            {patients.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">No patients.</div>}
          </div>
        </div>
        <div className="lg:col-span-2">
          {!active && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Select a patient to view their history.</div>}
          {active && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-lg">{active.name}</div>
                    <div className="text-sm text-slate-500">{active.email} · {active.phone || "—"}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Age <span className="font-medium tabular-nums">{active.age || "—"}</span></div>
                    <div>Blood <span className="font-medium">{active.blood_group || "—"}</span></div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold tracking-tight mb-3">Prescription history</h3>
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="border-l-2 border-blue-700 pl-4 py-1">
                      <div className="text-xs text-slate-500 tabular-nums">{h.date?.slice(0, 10)} · {h.doctor_name}</div>
                      <div className="text-sm whitespace-pre-wrap font-mono mt-1">{h.medicines}</div>
                      {h.notes && <div className="text-xs text-slate-500 mt-1">Notes: {h.notes}</div>}
                    </div>
                  ))}
                  {history.length === 0 && <div className="text-sm text-slate-500">No prescriptions on record.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
