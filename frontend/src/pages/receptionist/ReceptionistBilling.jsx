import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

export default function ReceptionistBilling() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ patient_id: "", appointment_id: "", amount: "", description: "Consultation", paid_status: "unpaid" });

  const load = async () => setItems((await api.get("/billing")).data);
  useEffect(() => {
    load();
    api.get("/patients").then((r) => setPatients(r.data));
    api.get("/appointments").then((r) => setAppts(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/billing", { ...form, amount: Number(form.amount), appointment_id: form.appointment_id || null });
      toast.success("Invoice created");
      setShow(false); setForm({ patient_id: "", appointment_id: "", amount: "", description: "Consultation", paid_status: "unpaid" });
      load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };
  const markPaid = async (id) => { await api.patch(`/billing/${id}/pay`); load(); };
  const download = async (id) => {
    const res = await api.get(`/billing/${id}/invoice.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data); const a = document.createElement("a"); a.href = url; a.download = `invoice-${id.slice(0, 8)}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <PageHeader title="Billing" subtitle="Generate invoices and download PDFs."
        actions={<button onClick={() => setShow(true)} data-testid="new-invoice-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2">+ New invoice</button>} />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500"><tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Description</th><th className="text-right px-4 py-3 font-medium">Amount</th><th className="text-left px-4 py-3 font-medium">Status</th><th></th></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-slate-100">
                <td className="px-4 py-3 tabular-nums">{b.date?.slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium">{b.patient_name}</td>
                <td className="px-4 py-3 text-slate-600">{b.description}</td>
                <td className="px-4 py-3 tabular-nums text-right">${b.amount.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.paid_status} /></td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  {b.paid_status === "unpaid" && <button onClick={() => markPaid(b.id)} className="text-emerald-700 text-xs">Mark paid</button>}
                  <button onClick={() => download(b.id)} className="text-blue-700 text-xs">Download</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-sm">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">New invoice</h3>
            <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} data-testid="invoice-patient-select" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm"><option value="">— Patient —</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={form.appointment_id} onChange={(e) => setForm({ ...form, appointment_id: e.target.value })} data-testid="invoice-appt-select" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm"><option value="">— Linked appointment (optional) —</option>{appts.filter((a) => !form.patient_id || a.patient_id === form.patient_id).map((a) => <option key={a.id} value={a.id}>{a.date} {a.time} · {a.doctor_name}</option>)}</select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="invoice-amount-input" placeholder="Amount" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
              <select value={form.paid_status} onChange={(e) => setForm({ ...form, paid_status: e.target.value })} data-testid="invoice-status-select" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm"><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
            </div>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="invoice-desc-input" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" data-testid="invoice-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 text-white">Create</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
