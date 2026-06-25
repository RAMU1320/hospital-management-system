import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Stethoscope } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      nav(`/${res.user.role}`);
    } else {
      setErr(res.error);
    }
  };

  const fillDemo = (e, em, pw) => {
    e.preventDefault();
    setEmail(em);
    setPassword(pw);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-stone-50">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-12">
            <div className="h-10 w-10 rounded-md bg-blue-700 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-lg">MediCore</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Hospital OS</div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" data-testid="login-title">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to access your dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="you@hospital.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            {err && <div data-testid="login-error" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{err}</div>}
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full rounded-md bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white text-sm font-medium py-2.5 transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="text-center text-sm text-slate-500">
              Need an account?{" "}
              <Link to="/register" data-testid="register-link" className="text-blue-700 font-medium hover:underline">Register as patient</Link>
            </div>
          </form>

          <div className="mt-10 border-t border-slate-200 pt-6">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">Demo accounts</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={(e) => fillDemo(e, "admin@hospital.com", "admin123")} data-testid="demo-admin" className="text-left rounded-md border border-slate-200 hover:border-blue-500 px-3 py-2">
                <div className="font-medium">Admin</div>
                <div className="text-slate-500 truncate">admin@hospital.com</div>
              </button>
              <button onClick={(e) => fillDemo(e, "aarav@hospital.com", "doctor123")} data-testid="demo-doctor" className="text-left rounded-md border border-slate-200 hover:border-blue-500 px-3 py-2">
                <div className="font-medium">Doctor</div>
                <div className="text-slate-500 truncate">aarav@hospital.com</div>
              </button>
              <button onClick={(e) => fillDemo(e, "reception@hospital.com", "recep123")} data-testid="demo-receptionist" className="text-left rounded-md border border-slate-200 hover:border-blue-500 px-3 py-2">
                <div className="font-medium">Receptionist</div>
                <div className="text-slate-500 truncate">reception@hospital.com</div>
              </button>
              <button onClick={(e) => fillDemo(e, "sara@example.com", "patient123")} data-testid="demo-patient" className="text-left rounded-md border border-slate-200 hover:border-blue-500 px-3 py-2">
                <div className="font-medium">Patient</div>
                <div className="text-slate-500 truncate">sara@example.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative">
        <img
          alt="Hospital architecture"
          src="https://images.pexels.com/photos/36488760/pexels-photo-36488760.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-900/40 to-blue-900/40" />
        <div className="relative h-full p-12 flex flex-col justify-end text-white">
          <blockquote className="text-2xl font-semibold tracking-tight max-w-md leading-snug">
            &ldquo;Built for clinicians who care about outcomes — not for endless clicks.&rdquo;
          </blockquote>
          <div className="mt-4 text-sm text-white/70">— MediCore design principles</div>
        </div>
      </div>
    </div>
  );
}
