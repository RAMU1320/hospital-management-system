import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function AdminReceptionists() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });

  const load = async () => setItems((await api.get("/receptionists")).data);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/receptionists", form);
      toast.success("Receptionist added");
      setShow(false);
      setForm({ name: "", email: "", password: "", phone: "" });
      load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Remove?")) return;
    await api.delete(`/receptionists/${id}`);
    load();
  };

  return (
    <Layout>
      <PageHeader title="Receptionists" subtitle="Front-desk staff with access to walk-ins and billing."
        actions={<button onClick={() => setShow(true)} data-testid="add-receptionist-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2">+ Add receptionist</button>} />
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-slate-200 text-slate-500">
            <tr><th className="text-left px-4 py-3 font-medium">Name</th><th className="text-left px-4 py-3 font-medium">Email</th><th className="text-left px-4 py-3 font-medium">Phone</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.email}</td>
                <td className="px-4 py-3">{r.phone || "—"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => del(r.id)} className="text-rose-600 text-xs">Remove</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-500 text-sm">No receptionists yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md space-y-3">
            <h3 className="text-lg font-semibold">Add receptionist</h3>
            {["name", "email", "password", "phone"].map((k) => (
              <input key={k} required={k !== "phone"} type={k === "password" ? "password" : k === "email" ? "email" : "text"} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`receptionist-${k}-input`} className="w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2 text-sm" />
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-md text-sm border border-slate-200">Cancel</button>
              <button type="submit" data-testid="receptionist-save-button" className="px-4 py-2 rounded-md text-sm bg-blue-700 hover:bg-blue-800 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
