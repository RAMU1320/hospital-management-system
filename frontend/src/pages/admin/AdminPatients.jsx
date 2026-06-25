import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

export default function AdminPatients() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { api.get("/patients", { params: { q } }).then((r) => { setItems(r.data); setPage(1); }); }, [q]);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const view = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Layout>
      <PageHeader title="Patients" subtitle={`${total} registered patient${total === 1 ? "" : "s"} in the system.`} />
      <div className="mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="patients-search" placeholder="Search by name, email, phone…" className="w-full md:w-80 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr><th className="text-left px-4 py-3 font-medium">Name</th><th className="text-left px-4 py-3 font-medium">Email</th><th className="text-left px-4 py-3 font-medium">Phone</th><th className="text-left px-4 py-3 font-medium">Age</th><th className="text-left px-4 py-3 font-medium">Blood</th></tr>
          </thead>
          <tbody>
            {view.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-stone-50" data-testid={`patient-row-${p.id}`}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.email}</td>
                <td className="px-4 py-3">{p.phone || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{p.age || "—"}</td>
                <td className="px-4 py-3">{p.blood_group || "—"}</td>
              </tr>
            ))}
            {view.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500 text-sm">No patients found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-50">Prev</button>
          <span className="text-sm text-slate-500">Page {page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </Layout>
  );
}
