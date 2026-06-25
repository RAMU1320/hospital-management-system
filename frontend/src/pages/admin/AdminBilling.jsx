import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Pagination, { usePagination } from "@/components/Pagination";
import { toast } from "sonner";

export default function AdminBilling() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => setItems((await api.get("/billing", { params: { q } })).data);
  useEffect(() => { load(); }, [q]);
  const { page, setPage, totalPages, total, pageItems } = usePagination(items, { resetKeys: [q] });

  const markPaid = async (id) => { await api.patch(`/billing/${id}/pay`); toast.success("Marked paid"); load(); };
  const download = async (id) => {
    const res = await api.get(`/billing/${id}/invoice.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = `invoice-${id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <PageHeader title="Billing" subtitle="All invoices across the hospital." />
      <div className="mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" data-testid="billing-search" className="w-full md:w-80 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr><th className="text-left px-4 py-3 font-medium">Date</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Description</th><th className="text-right px-4 py-3 font-medium">Amount</th><th className="text-left px-4 py-3 font-medium">Status</th><th></th></tr>
          </thead>
          <tbody>
            {pageItems.map((b) => (
              <tr key={b.id} className="border-b border-slate-100" data-testid={`billing-row-${b.id}`}>
                <td className="px-4 py-3 tabular-nums">{b.date?.slice(0, 10)}</td>
                <td className="px-4 py-3 font-medium">{b.patient_name}</td>
                <td className="px-4 py-3 text-slate-600">{b.description}</td>
                <td className="px-4 py-3 tabular-nums text-right">${b.amount.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.paid_status} /></td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  {b.paid_status === "unpaid" && <button onClick={() => markPaid(b.id)} data-testid={`mark-paid-${b.id}`} className="text-emerald-700 text-xs">Mark paid</button>}
                  <button onClick={() => download(b.id)} data-testid={`download-invoice-${b.id}`} className="text-blue-700 text-xs">Download PDF</button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-sm">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="admin-billing-pagination" />
    </Layout>
  );
}
