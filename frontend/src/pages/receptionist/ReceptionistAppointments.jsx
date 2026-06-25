import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import SlotPicker from "@/components/SlotPicker";
import Pagination, { usePagination } from "@/components/Pagination";
import { toast } from "sonner";

export default function ReceptionistAppointments() {
  const [items, setItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", date: "", time: "", reason: "" });

  const load = async () => setItems((await api.get("/appointments")).data);
  useEffect(() => {
    load();
    api.get("/doctors").then((r) => setDoctors(r.data));
    api.get("/patients").then((r) => setPatients(r.data));
  }, []);

  const { page, setPage, totalPages, total, pageItems } = usePagination(items);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/appointments", form);
      toast.success("Appointment booked");
      setShow(false);
      setForm({ patient_id: "", doctor_id: "", date: "", time: "", reason: "" });
      load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };

  const setStatus = async (id, status) => { await api.patch(`/appointments/${id}/status`, { status }); load(); };

  return (
    <Layout>
      <PageHeader title="Appointments" subtitle="Manage slots and book on behalf of patients."
        actions={<button onClick={() => setShow(true)} data-testid="book-appointment-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2">+ Book appointment</button>} />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500"><tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Time</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Doctor</th><th className="text-left px-4 py-3 font-medium">Status</th><th></th></tr></thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-3 tabular-nums">{a.date}</td>
                <td className="px-4 py-3 tabular-nums">{a.time}</td>
                <td className="px-4 py-3 font-medium">{a.patient_name}</td>
                <td className="px-4 py-3">{a.doctor_name}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  {a.status === "pending" && <button onClick={() => setStatus(a.id, "confirmed")} className="text-xs text-blue-700">Confirm</button>}
                  {a.status !== "cancelled" && a.status !== "completed" && <button onClick={() => setStatus(a.id, "cancelled")} className="text-xs text-rose-600">Cancel</button>}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-sm">No appointments.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="rec-appts-pagination" />

      {show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">Book appointment</h3>
            <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} data-testid="book-patient-select" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm"><option value="">— Patient —</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select required value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} data-testid="book-doctor-select" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm"><option value="">— Doctor —</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>)}</select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required min={new Date().toISOString().slice(0,10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })} data-testid="book-date-input" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
              <div className="text-xs text-slate-500 flex items-end">Pick a date, then a slot.</div>
            </div>
            <SlotPicker doctorId={form.doctor_id} date={form.date} value={form.time} onChange={(t) => setForm({ ...form, time: t })} />
            <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} data-testid="book-reason-input" rows={2} className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" disabled={!form.time} data-testid="book-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white">Book</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
