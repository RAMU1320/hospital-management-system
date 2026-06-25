import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, FileText, Receipt } from "lucide-react";

export default function PatientHome() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [presc, setPresc] = useState([]);

  useEffect(() => {
    api.get("/appointments").then((r) => setAppts(r.data));
    api.get("/prescriptions").then((r) => setPresc(r.data));
  }, []);

  const upcoming = appts.filter((a) => a.status !== "completed" && a.status !== "cancelled").slice(0, 3);

  return (
    <Layout>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} subtitle="Your health, at a glance." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/patient/book" data-testid="quick-book" className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-500 transition-colors">
          <Calendar className="h-5 w-5 text-blue-700" />
          <div className="mt-4 font-semibold tracking-tight">Book appointment</div>
          <div className="text-sm text-slate-500 mt-1">Choose a specialist and time that works for you.</div>
        </Link>
        <Link to="/patient/history" data-testid="quick-history" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-500 transition-colors">
          <FileText className="h-5 w-5 text-blue-700" />
          <div className="mt-4 font-semibold tracking-tight">Medical history</div>
          <div className="text-sm text-slate-500 mt-1">{presc.length} prescription{presc.length === 1 ? "" : "s"} on record.</div>
        </Link>
        <Link to="/patient/billing" data-testid="quick-billing" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-500 transition-colors">
          <Receipt className="h-5 w-5 text-blue-700" />
          <div className="mt-4 font-semibold tracking-tight">Invoices</div>
          <div className="text-sm text-slate-500 mt-1">Download your billing PDFs.</div>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold tracking-tight mb-4">Upcoming appointments</h3>
        {upcoming.length === 0 && <div className="text-slate-500 text-sm">No upcoming appointments. <Link to="/patient/book" className="text-blue-700">Book one now →</Link></div>}
        <div className="space-y-3">
          {upcoming.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="font-medium">{a.doctor_name} <span className="text-xs text-slate-500">· {a.doctor_specialization}</span></div>
                <div className="text-sm text-slate-500 tabular-nums">{a.date} at {a.time}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
