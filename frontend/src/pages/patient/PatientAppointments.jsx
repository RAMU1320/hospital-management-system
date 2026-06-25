import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Pagination, { usePagination } from "@/components/Pagination";

export default function PatientAppointments() {
  const [items, setItems] = useState([]);
  const load = async () => setItems((await api.get("/appointments")).data);
  useEffect(() => { load(); }, []);
  const cancel = async (id) => { if (!window.confirm("Cancel this appointment?")) return; await api.patch(`/appointments/${id}/status`, { status: "cancelled" }); load(); };
  const { page, setPage, totalPages, total, pageItems } = usePagination(items);

  return (
    <Layout>
      <PageHeader title="My appointments" subtitle="Past and upcoming visits." />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500"><tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Time</th><th className="text-left px-4 py-3 font-medium">Doctor</th><th className="text-left px-4 py-3 font-medium">Reason</th><th className="text-left px-4 py-3 font-medium">Status</th><th></th></tr></thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} className="border-b border-slate-100" data-testid={`my-appt-${a.id}`}>
                <td className="px-4 py-3 tabular-nums">{a.date}</td>
                <td className="px-4 py-3 tabular-nums">{a.time}</td>
                <td className="px-4 py-3">{a.doctor_name}<div className="text-xs text-slate-500">{a.doctor_specialization}</div></td>
                <td className="px-4 py-3 text-slate-600">{a.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3 text-right">
                  {a.status !== "cancelled" && a.status !== "completed" && <button onClick={() => cancel(a.id)} data-testid={`cancel-appt-${a.id}`} className="text-rose-600 text-xs">Cancel</button>}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-sm">No appointments yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="patient-appts-pagination" />
    </Layout>
  );
}
