import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import SlotPicker from "@/components/SlotPicker";
import { toast } from "sonner";

export default function PatientBook() {
  const nav = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [step, setStep] = useState(1);
  const [dep, setDep] = useState("");
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data));
    api.get("/doctors").then((r) => setDoctors(r.data));
  }, []);

  const filteredDoctors = dep ? doctors.filter((d) => d.department_id === dep) : doctors;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/appointments", { doctor_id: doctor.id, date, time, reason });
      toast.success("Appointment booked");
      nav("/patient/appointments");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed"); }
  };

  return (
    <Layout>
      <PageHeader title="Book an appointment" subtitle="A few quick steps to see the right specialist." />
      <ol className="flex items-center gap-3 mb-6 text-xs uppercase tracking-wider">
        {["Department", "Doctor", "Time & confirm"].map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${step >= i + 1 ? "text-blue-700" : "text-slate-400"}`}>
            <span className={`h-6 w-6 rounded-full grid place-items-center text-[11px] ${step >= i + 1 ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {departments.map((d) => (
              <button key={d.id} onClick={() => { setDep(d.id); setStep(2); }} data-testid={`dep-${d.id}`} className={`text-left rounded-lg border p-4 hover:border-blue-500 ${dep === d.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-slate-500 mt-1">{d.description || "Click to choose"}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} data-testid="skip-dep" className="mt-4 text-sm text-slate-500 hover:text-slate-900">Skip — show all doctors →</button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDoctors.map((d) => (
              <button key={d.id} onClick={() => { setDoctor(d); setStep(3); }} data-testid={`doctor-${d.id}`} className={`text-left rounded-lg border p-4 hover:border-blue-500 ${doctor?.id === d.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-slate-500">{d.specialization} · {d.experience} yrs</div>
                <div className="text-xs text-slate-500 mt-2">{d.availability}</div>
              </button>
            ))}
            {filteredDoctors.length === 0 && <div className="text-slate-500 text-sm">No doctors in this department.</div>}
          </div>
          <button onClick={() => setStep(1)} className="mt-4 text-sm text-slate-500 hover:text-slate-900">← Back</button>
        </div>
      )}

      {step === 3 && doctor && (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 max-w-2xl">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Doctor</div>
            <div className="font-semibold">{doctor.name} <span className="text-sm text-slate-500 font-normal">· {doctor.specialization}</span></div>
            <div className="text-xs text-slate-500 mt-1">Available: {doctor.availability}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs uppercase tracking-wider text-slate-500">Date</label><input type="date" required min={new Date().toISOString().slice(0,10)} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} data-testid="patient-book-date" className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5 text-sm" /></div>
            <div className="text-xs text-slate-500 flex items-end">Pick a date, then choose an available slot below.</div>
          </div>
          <div>
            <SlotPicker doctorId={doctor.id} date={date} value={time} onChange={setTime} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500">Reason for visit</label>
            <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="patient-book-reason" className="mt-1 w-full rounded-md border border-slate-200 bg-stone-50 px-3 py-2.5 text-sm" />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-500 hover:text-slate-900">← Back</button>
            <button type="submit" disabled={!time} data-testid="patient-book-appointment-button" className="rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm px-5 py-2.5">Confirm booking</button>
          </div>
        </form>
      )}
    </Layout>
  );
}
