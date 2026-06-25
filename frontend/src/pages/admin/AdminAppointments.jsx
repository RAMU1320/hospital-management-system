import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Pagination, { usePagination } from "@/components/Pagination";

export default function AdminAppointments() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    const params = {};
    if (status) params.status = status;
    if (q) params.q = q;
    setItems((await api.get("/appointments", { params })).data);
  };
  useEffect(() => { load(); }, [q, status]);

  const { page, setPage, totalPages, total, pageItems } = usePagination(items, { resetKeys: [q, status] });

  return (
    <Layout>
      <PageHeader title="Appointments" subtitle="All bookings across the hospital." />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" data-testid="appointments-search" className="w-full md:w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="appointments-status-filter" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["pending", "confirmed", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Time</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Doctor</th><th className="text-left px-4 py-3 font-medium">Reason</th><th className="text-left px-4 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} className="border-b border-slate-100" data-testid={`appointment-row-${a.id}`}>
                <td className="px-4 py-3 tabular-nums">{a.date}</td>
                <td className="px-4 py-3 tabular-nums">{a.time}</td>
                <td className="px-4 py-3 font-medium">{a.patient_name}</td>
                <td className="px-4 py-3">{a.doctor_name}<div className="text-xs text-slate-500">{a.doctor_specialization}</div></td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{a.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-sm">No appointments.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="admin-appts-pagination" />
    </Layout>
  );
}
