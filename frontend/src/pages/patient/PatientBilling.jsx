import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Pagination, { usePagination } from "@/components/Pagination";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

export default function PatientBilling() {
  const [items, setItems] = useState([]);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [payingId, setPayingId] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => setItems((await api.get("/billing")).data);
  useEffect(() => { load(); }, []);
  const { page, setPage, totalPages, total, pageItems } = usePagination(items);

  // Handle return-from-Stripe: poll status with retries (2s up to 5x)
  useEffect(() => {
    const cancelled = params.get("cancelled");
    if (cancelled) {
      toast.info("Payment cancelled.");
      navigate("/patient/billing", { replace: true });
      return;
    }
    const paid = params.get("paid");
    const sessionId = params.get("session_id");
    if (!paid || !sessionId) return;

    let active = true;
    setVerifying(true);

    const pollStatus = async (attempt = 0) => {
      if (!active) return;
      try {
        const { data } = await api.get(`/payments/checkout/status/${sessionId}`);
        if (data.payment_status === "paid") {
          if (!active) return;
          toast.success("Payment successful — invoice marked paid.");
          setVerifying(false);
          navigate("/patient/billing", { replace: true });
          await load();
          return;
        }
        if (data.status === "expired") {
          if (!active) return;
          toast.error("Payment session expired.");
          setVerifying(false);
          navigate("/patient/billing", { replace: true });
          return;
        }
        if (attempt >= 5) {
          if (!active) return;
          toast.info("Payment still processing — refresh in a moment.");
          setVerifying(false);
          navigate("/patient/billing", { replace: true });
          return;
        }
        setTimeout(() => pollStatus(attempt + 1), 2000);
      } catch {
        if (!active) return;
        toast.error("Couldn't verify payment status.");
        setVerifying(false);
      }
    };
    pollStatus();
    return () => { active = false; };
  }, [params]);

  const download = async (id) => {
    const res = await api.get(`/billing/${id}/invoice.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = `invoice-${id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const payNow = async (id) => {
    setPayingId(id);
    try {
      const { data } = await api.post(`/billing/${id}/checkout`, { origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't start payment");
      setPayingId(null);
    }
  };

  return (
    <Layout>
      <PageHeader title="Invoices" subtitle="Pay open invoices online or download a PDF receipt." />
      {verifying && (
        <div data-testid="payment-verifying" className="mb-4 rounded-md border border-blue-200 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
          Verifying your payment with Stripe…
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((b) => (
              <tr key={b.id} className="border-b border-slate-100" data-testid={`my-invoice-${b.id}`}>
                <td className="px-4 py-3 tabular-nums">{b.date?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-slate-600">{b.description}</td>
                <td className="px-4 py-3 tabular-nums text-right">${b.amount.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={b.paid_status} /></td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  {b.paid_status === "unpaid" && (
                    <button
                      onClick={() => payNow(b.id)}
                      disabled={payingId === b.id}
                      data-testid={`pay-now-${b.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {payingId === b.id ? "Redirecting…" : "Pay Now"}
                    </button>
                  )}
                  <button
                    onClick={() => download(b.id)}
                    data-testid={`patient-download-${b.id}`}
                    className="text-blue-700 text-xs hover:underline"
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500 text-sm">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} totalPages={totalPages} total={total} testid="patient-billing-pagination" />
    </Layout>
  );
}
