import { useEffect, useState } from "react";
import api from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Users, Stethoscope, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function Kpi({ label, value, icon: Icon, accent, testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${accent || "text-slate-400"}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
  }, []);

  if (!stats) return <Layout><div className="text-slate-500 text-sm">Loading stats…</div></Layout>;

  return (
    <Layout>
      <PageHeader title="Hospital Overview" subtitle="Real-time view of operations, patients and revenue." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Kpi label="Total Patients" value={stats.total_patients} icon={Users} accent="text-blue-700" testid="kpi-total-patients" />
        <Kpi label="Doctors" value={stats.total_doctors} icon={Stethoscope} accent="text-emerald-600" testid="kpi-total-doctors" />
        <Kpi label="Appointments Today" value={stats.appointments_today} icon={CalendarDays} accent="text-amber-600" testid="kpi-appointments-today" />
        <Kpi label="Revenue (paid)" value={`$${stats.revenue.toFixed(2)}`} icon={DollarSign} accent="text-blue-700" testid="kpi-revenue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold tracking-tight">Appointments — last 7 days</h3>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.appointments_last_7_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold tracking-tight">Billing</h3>
          <div className="mt-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Paid Revenue</div>
              <div className="text-2xl font-semibold tabular-nums mt-1" data-testid="admin-revenue-stat">${stats.revenue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Outstanding</div>
              <div className="text-2xl font-semibold tabular-nums text-amber-600 mt-1" data-testid="admin-pending-stat">${stats.pending_revenue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Total Appointments</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{stats.total_appointments}</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
