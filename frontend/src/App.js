import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDoctors from "@/pages/admin/AdminDoctors";
import AdminReceptionists from "@/pages/admin/AdminReceptionists";
import AdminPatients from "@/pages/admin/AdminPatients";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminBilling from "@/pages/admin/AdminBilling";

import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import DoctorAppointments from "@/pages/doctor/DoctorAppointments";
import DoctorPatients from "@/pages/doctor/DoctorPatients";
import DoctorSchedule from "@/pages/doctor/DoctorSchedule";

import ReceptionistDashboard from "@/pages/receptionist/ReceptionistDashboard";
import ReceptionistWalkIn from "@/pages/receptionist/ReceptionistWalkIn";
import ReceptionistAppointments from "@/pages/receptionist/ReceptionistAppointments";
import ReceptionistBilling from "@/pages/receptionist/ReceptionistBilling";

import PatientHome from "@/pages/patient/PatientHome";
import PatientBook from "@/pages/patient/PatientBook";
import PatientAppointments from "@/pages/patient/PatientAppointments";
import PatientHistory from "@/pages/patient/PatientHistory";
import PatientBilling from "@/pages/patient/PatientBilling";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-slate-500 text-sm">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/doctors" element={<ProtectedRoute roles={["admin"]}><AdminDoctors /></ProtectedRoute>} />
          <Route path="/admin/receptionists" element={<ProtectedRoute roles={["admin"]}><AdminReceptionists /></ProtectedRoute>} />
          <Route path="/admin/patients" element={<ProtectedRoute roles={["admin"]}><AdminPatients /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute roles={["admin"]}><AdminAppointments /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute roles={["admin"]}><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/billing" element={<ProtectedRoute roles={["admin"]}><AdminBilling /></ProtectedRoute>} />

          <Route path="/doctor" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute roles={["doctor"]}><DoctorAppointments /></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute roles={["doctor"]}><DoctorPatients /></ProtectedRoute>} />
          <Route path="/doctor/schedule" element={<ProtectedRoute roles={["doctor"]}><DoctorSchedule /></ProtectedRoute>} />

          <Route path="/receptionist" element={<ProtectedRoute roles={["receptionist"]}><ReceptionistDashboard /></ProtectedRoute>} />
          <Route path="/receptionist/walk-in" element={<ProtectedRoute roles={["receptionist"]}><ReceptionistWalkIn /></ProtectedRoute>} />
          <Route path="/receptionist/appointments" element={<ProtectedRoute roles={["receptionist"]}><ReceptionistAppointments /></ProtectedRoute>} />
          <Route path="/receptionist/billing" element={<ProtectedRoute roles={["receptionist"]}><ReceptionistBilling /></ProtectedRoute>} />

          <Route path="/patient" element={<ProtectedRoute roles={["patient"]}><PatientHome /></ProtectedRoute>} />
          <Route path="/patient/book" element={<ProtectedRoute roles={["patient"]}><PatientBook /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute roles={["patient"]}><PatientAppointments /></ProtectedRoute>} />
          <Route path="/patient/history" element={<ProtectedRoute roles={["patient"]}><PatientHistory /></ProtectedRoute>} />
          <Route path="/patient/billing" element={<ProtectedRoute roles={["patient"]}><PatientBilling /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
