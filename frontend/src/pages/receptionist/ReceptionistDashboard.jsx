import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { CalendarDays, Users, Receipt } from "lucide-react";

function Kpi({ label, value, icon: Icon, testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid={testid}>
      <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-slate-500">{label}</span><Icon className="h-4 w-4 text-blue-700" /></div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function ReceptionistDashboard() {
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/appointments", { params: { today: true } }),
      api.get("/patients"),
      api.get("/billing"),
    ]).then(([a, p, b]) => { setAppts(a.data); setPatients(p.data); setBills(b.data); });
  }, []);

  const unpaid = bills.filter((b) => b.paid_status === "unpaid").length;

  return (
    <Layout>
      <PageHeader title="Front desk" subtitle="Today's activity at a glance." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Kpi label="Appointments Today" value={appts.length} icon={CalendarDays} testid="rec-kpi-appts" />
        <Kpi label="Total Patients" value={patients.length} icon={Users} testid="rec-kpi-patients" />
        <Kpi label="Unpaid Invoices" value={unpaid} icon={Receipt} testid="rec-kpi-unpaid" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 text-sm font-medium">Today&apos;s appointments</div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500"><tr><th className="text-left px-4 py-3 font-medium">Time</th><th className="text-left px-4 py-3 font-medium">Patient</th><th className="text-left px-4 py-3 font-medium">Doctor</th><th className="text-left px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {appts.map((a) => (
              <tr key={a.id} className="border-b border-slate-100"><td className="px-4 py-3 tabular-nums">{a.time}</td><td className="px-4 py-3 font-medium">{a.patient_name}</td><td className="px-4 py-3">{a.doctor_name}</td><td className="px-4 py-3"><StatusBadge status={a.status} /></td></tr>
            ))}
            {appts.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-500 text-sm">No appointments scheduled today.</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
