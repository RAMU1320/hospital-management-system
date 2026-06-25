import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Stethoscope } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "", blood_group: "", phone: "", address: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const payload = { ...form, age: form.age ? Number(form.age) : null };
    const res = await register(payload);
    setLoading(false);
    if (res.ok) nav("/patient");
    else setErr(res.error);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-8 md:p-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-md bg-blue-700 flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-lg">MediCore</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Patient registration</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="register-title">Create your patient account</h1>
        <p className="text-sm text-slate-500 mt-1">Book appointments, view prescriptions, and download invoices.</p>

        <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { k: "name", label: "Full name", type: "text", required: true },
            { k: "email", label: "Email", type: "email", required: true },
            { k: "password", label: "Password (min 6)", type: "password", required: true },
            { k: "phone", label: "Phone", type: "text" },
            { k: "age", label: "Age", type: "number" },
            { k: "blood_group", label: "Blood group", type: "text" },
          ].map((f) => (
            <div key={f.k}>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">{f.label}</label>
              <input
                type={f.type}
                required={f.required}
                value={form[f.k]}
                onChange={set(f.k)}
                data-testid={`register-${f.k}-input`}
                className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Address</label>
            <textarea
              value={form.address}
              onChange={set("address")}
              data-testid="register-address-input"
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {err && (
            <div data-testid="register-error" className="md:col-span-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {err}
            </div>
          )}
          <div className="md:col-span-2 flex items-center justify-between mt-2">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-900">← Back to login</Link>
            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit-button"
              className="rounded-md bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white text-sm font-medium px-5 py-2.5 transition-colors"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
