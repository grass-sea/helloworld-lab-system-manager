// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

// Import Layout
import DashboardLayout from "../layouts/DashboardLayout";

// Import Pages
import LoginPage from "../pages/LoginPage";
import StudentDashboard from "../pages/student/Dashboard";
import EquipmentPage from "../pages/student/EquipmentPage";
import HistoryPage from "../pages/student/HistoryPage";
import DebtPage from "../pages/student/DebtPage";

import StaffDashboard from "../pages/staff/StaffDashboard";
import EquipmentManagementPage from "../pages/staff/EquipmentManagementPage";
import StudentManagementPage from "../pages/staff/StudentManagementPage";
import RequestManagementPage from "../pages/staff/RequestManagementPage";
import DebtManagementPage from "../pages/staff/DebtManagementPage";

// Component Bảo vệ Route chuẩn hóa kiểu dữ liệu ReactNode
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, authLoading } = useApp();
  
  if (authLoading) {
    return <div className="min-h-screen grid place-items-center text-sm font-semibold text-gray-500">Loading session...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Chuẩn hóa chữ hoa/chữ thường khi so sánh role
  const userRole = user.role?.toUpperCase() || "";
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === "STAFF" || userRole === "ADMIN" ? "/staff" : "/dashboard"} replace />;
  }
  
  return <DashboardLayout>{children}</DashboardLayout>;
};

// 🌟 SỬA ĐỂ KHÔNG TRÙNG TÊN: Đổi hẳn tên thành AppRoutes
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ================= ROUTES CỦA STUDENT ================= */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={["BORROWER", "STUDENT", "LECTURER", "RESEARCHER"]}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/equipment" element={
        <ProtectedRoute allowedRoles={["BORROWER", "STUDENT", "LECTURER", "RESEARCHER"]}>
          <EquipmentPage />
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute allowedRoles={["BORROWER", "STUDENT", "LECTURER", "RESEARCHER"]}>
          <HistoryPage />
        </ProtectedRoute>
      } />
      <Route path="/debt" element={
        <ProtectedRoute allowedRoles={["BORROWER", "STUDENT", "LECTURER", "RESEARCHER"]}>
          <DebtPage />
        </ProtectedRoute>
      } />

      {/* ================= ROUTES CỦA STAFF ================= */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
          <StaffDashboard />
        </ProtectedRoute>
      } />
      <Route path="/staff/equipment" element={
        <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
          <EquipmentManagementPage />
        </ProtectedRoute>
      } />
      <Route path="/staff/students" element={
        <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
          <StudentManagementPage />
        </ProtectedRoute>
      } />
      <Route path="/staff/requests" element={
        <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
          <RequestManagementPage />
        </ProtectedRoute>
      } />
      <Route path="/staff/debts" element={
        <ProtectedRoute allowedRoles={["STAFF", "ADMIN"]}>
          <DebtManagementPage />
        </ProtectedRoute>
      } />

      {/* Bắt các đường dẫn sai */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
