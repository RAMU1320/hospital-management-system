import { Badge } from "@/components/ui/badge";

const map = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  unpaid: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function StatusBadge({ status }) {
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {status}
    </span>
  );
}
