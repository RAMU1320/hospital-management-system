import { useEffect, useMemo, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", specialization: "", experience: 0, department_id: "", availability: "Mon-Fri 09:00-17:00" });

  const load = async () => {
    const [d, dep] = await Promise.all([api.get("/doctors"), api.get("/departments")]);
    setDoctors(d.data);
    setDepartments(dep.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => doctors.filter((d) => !q || (d.name + d.specialization + (d.email || "")).toLowerCase().includes(q.toLowerCase())),
    [doctors, q]
  );

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/doctors", { ...form, experience: Number(form.experience) });
      toast.success("Doctor created");
      setShow(false);
      setForm({ name: "", email: "", password: "", specialization: "", experience: 0, department_id: "", availability: "Mon-Fri 09:00-17:00" });
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Remove this doctor?")) return;
    await api.delete(`/doctors/${id}`);
    toast.success("Doctor removed");
    load();
  };

  return (
    <Layout>
      <PageHeader
        title="Doctors"
        subtitle="Manage hospital practitioners and their departments."
        actions={
          <button onClick={() => setShow(true)} data-testid="add-doctor-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 active:scale-[0.98]">+ Add doctor</button>
        }
      />
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="doctors-search"
          placeholder="Search by name or specialization…"
          className="w-full md:w-80 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Specialization</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Experience</th>
              <th className="text-left px-4 py-3 font-medium">Availability</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-stone-50" data-testid={`doctor-row-${d.id}`}>
                <td className="px-4 py-3 font-medium">{d.name}<div className="text-xs text-slate-500">{d.email}</div></td>
                <td className="px-4 py-3">{d.specialization}</td>
                <td className="px-4 py-3 text-slate-600">{d.department_name || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{d.experience} yrs</td>
                <td className="px-4 py-3 text-slate-600">{d.availability}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(d.id)} data-testid={`delete-doctor-${d.id}`} className="text-rose-600 hover:text-rose-700 text-xs">Remove</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-10 text-sm">No doctors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Add doctor</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["name", "email", "password", "specialization"].map((k) => (
                <input key={k} required={k !== "availability"} type={k === "password" ? "password" : k === "email" ? "email" : "text"} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`doctor-${k}-input`} className="col-span-2 md:col-span-1 rounded-md border border-slate-200 bg-stone-50 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              ))}
              <input type="number" placeholder="experience yrs" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} data-testid="doctor-experience-input" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2" />
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} data-testid="doctor-department-select" className="rounded-md border border-slate-200 bg-stone-50 px-3 py-2">
                <option value="">— Department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input placeholder="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} data-testid="doctor-availability-input" className="col-span-2 rounded-md border border-slate-200 bg-stone-50 px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" data-testid="doctor-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
