import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Pagination, { usePagination } from "@/components/Pagination";

export default function DoctorAppointments() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  useEffect(() => { api.get("/appointments", { params: status ? { status } : {} }).then((r) => setItems(r.data)); }, [status]);
  const { page, setPage, totalPages, total, pageItems } = usePagination(items, { resetKeys: [status] });

  return (
    <Layout>
      <PageHeader title="All appointments" subtitle="Past and upcoming visits assigned to you." />
      <div className="mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="doctor-appt-status" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All</option>
          {["pending", "confirmed", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500"><tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Time</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Reason</th><th className="text-left px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} className="border-b border-slate-100"><td className="px-4 py-3 tabular-nums">{a.date}</td><td className="px-4 py-3 tabular-nums">{a.time}</td><td className="px-4 py-3 font-medium">{a.patient_name}</td><td className="px-4 py-3 text-slate-600">{a.reason}</td><td className="px-4 py-3"><StatusBadge status={a.status} /></td></tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500 text-sm">No appointments.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="doctor-appts-pagination" />
    </Layout>
  );
}
