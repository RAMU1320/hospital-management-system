import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function AdminDepartments() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => setItems((await api.get("/departments")).data);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/departments", form); toast.success("Department added"); setShow(false); setForm({ name: "", description: "" }); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };
  const del = async (id) => { if (!window.confirm("Remove?")) return; await api.delete(`/departments/${id}`); load(); };

  return (
    <Layout>
      <PageHeader title="Departments" subtitle="Organize doctors by clinical departments."
        actions={<button onClick={() => setShow(true)} data-testid="add-department-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2">+ Add department</button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-5" data-testid={`dept-card-${d.id}`}>
            <div className="flex items-start justify-between">
              <h3 className="font-semibold tracking-tight">{d.name}</h3>
              <button onClick={() => del(d.id)} className="text-xs text-rose-600">Remove</button>
            </div>
            <p className="text-sm text-slate-500 mt-2">{d.description || "—"}</p>
          </div>
        ))}
        {items.length === 0 && <div className="text-slate-500 text-sm">No departments yet.</div>}
      </div>
      {show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md space-y-3">
            <h3 className="text-lg font-semibold">Add department</h3>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="dept-name-input" placeholder="Name" className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="dept-desc-input" placeholder="Description" rows={3} className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" data-testid="dept-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
