import { useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function ReceptionistWalkIn() {
  const [form, setForm] = useState({ name: "", email: "", password: "patient123", age: "", blood_group: "", phone: "", address: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/patients/walk-in", { ...form, age: form.age ? Number(form.age) : null });
      toast.success("Patient registered");
      setForm({ name: "", email: "", password: "patient123", age: "", blood_group: "", phone: "", address: "" });
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };

  return (
    <Layout>
      <PageHeader title="Walk-in registration" subtitle="Quickly add a new patient and create their account." />
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {[["name", "Full name", "text", true], ["email", "Email", "email", true], ["password", "Temp. password", "text", true], ["phone", "Phone", "text"], ["age", "Age", "number"], ["blood_group", "Blood group", "text"]].map(([k, label, type, req]) => (
          <div key={k}>
            <label className="text-xs uppercase tracking-wider text-slate-500">{label}</label>
            <input required={req} type={type} value={form[k]} onChange={set(k)} data-testid={`walkin-${k}-input`} className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5" />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-wider text-slate-500">Address</label>
          <textarea value={form.address} onChange={set("address")} data-testid="walkin-address-input" rows={2} className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5" />
        </div>
        <div className="md:col-span-2 text-right">
          <button type="submit" data-testid="walkin-save-button" className="rounded-md bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5">Register patient</button>
        </div>
      </form>
    </Layout>
  );
}
