import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

export default function PatientHistory() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/prescriptions").then((r) => setItems(r.data)); }, []);

  return (
    <Layout>
      <PageHeader title="Medical history" subtitle="Your prescriptions and clinical notes." />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {items.length === 0 && <div className="text-slate-500 text-sm">No prescriptions on record yet.</div>}
        <div className="space-y-6">
          {items.map((p) => (
            <div key={p.id} className="border-l-2 border-blue-700 pl-5" data-testid={`prescription-${p.id}`}>
              <div className="text-xs uppercase tracking-wider text-slate-500 tabular-nums">{p.date?.slice(0, 10)}</div>
              <div className="font-semibold mt-1">{p.doctor_name} <span className="text-sm text-slate-500 font-normal">· {p.doctor_specialization}</span></div>
              <div className="mt-3 text-sm whitespace-pre-wrap font-mono bg-stone-50 rounded-md p-3 border border-slate-200">{p.medicines}</div>
              {p.notes && <div className="mt-2 text-sm text-slate-600"><span className="text-slate-500">Notes:</span> {p.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
