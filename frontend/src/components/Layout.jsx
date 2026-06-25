import { useAuth } from "@/context/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { Stethoscope, LogOut } from "lucide-react";

const navByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/doctors", label: "Doctors" },
    { to: "/admin/receptionists", label: "Receptionists" },
    { to: "/admin/patients", label: "Patients" },
    { to: "/admin/appointments", label: "Appointments" },
    { to: "/admin/departments", label: "Departments" },
    { to: "/admin/billing", label: "Billing" },
  ],
  doctor: [
    { to: "/doctor", label: "Today", end: true },
    { to: "/doctor/appointments", label: "Appointments" },
    { to: "/doctor/patients", label: "Patients" },
    { to: "/doctor/schedule", label: "My Schedule" },
  ],
  receptionist: [
    { to: "/receptionist", label: "Overview", end: true },
    { to: "/receptionist/walk-in", label: "Walk-in" },
    { to: "/receptionist/appointments", label: "Appointments" },
    { to: "/receptionist/billing", label: "Billing" },
  ],
  patient: [
    { to: "/patient", label: "Home", end: true },
    { to: "/patient/book", label: "Book Appointment" },
    { to: "/patient/appointments", label: "My Appointments" },
    { to: "/patient/history", label: "Medical History" },
    { to: "/patient/billing", label: "Invoices" },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navByRole[user.role] || [];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white px-5 py-6 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-8" data-testid="brand-logo">
          <div className="h-9 w-9 rounded-md bg-blue-700 flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">MediCore</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">{user.role}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-stone-100 hover:text-slate-900"
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="text-sm font-medium truncate" data-testid="current-user-name">{user.name}</div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            data-testid="logout-button"
            className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
