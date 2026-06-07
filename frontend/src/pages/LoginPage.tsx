// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Lock, User as UserIcon, AlertCircle, Users, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();

  const [activePortal, setActivePortal] = useState<"BORROWER" | "STAFF">("BORROWER");
  
  // Django mặc định dùng Username để đăng nhập (thay vì email nguyên bản)
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePortalChange = (portal: "BORROWER" | "STAFF") => {
    setActivePortal(portal);
    setError("");
    setUsername(""); 
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Đợi API trả về kết quả
    const isSuccess = await login(username, password, activePortal);

    setIsLoading(false);

    if (isSuccess) {
      if (activePortal === "STAFF") {
        navigate("/staff");
      } else {
        navigate("/dashboard");
      }
    } else {
      setError("Tài khoản hoặc mật khẩu không chính xác, hoặc bạn không có quyền truy cập cổng này!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* THANH CHỌN CỔNG */}
        <div className="flex border-b border-gray-100 bg-gray-50/70">
          <button
            type="button"
            onClick={() => handlePortalChange("BORROWER")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${
              activePortal === "BORROWER"
                ? "border-[#A5001A] text-[#A5001A] bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={16} />
            <span>BORROWER</span>
          </button>
          
          <button
            type="button"
            onClick={() => handlePortalChange("STAFF")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${
              activePortal === "STAFF"
                ? "border-[#A5001A] text-[#A5001A] bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <ShieldAlert size={16} />
            <span>STAFF/ADMIN</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              {activePortal === "BORROWER" ? "Borrower Portal" : "Staff Administration"}
            </h2>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">
              {activePortal === "BORROWER" 
                ? "Dành cho Sinh viên, Giảng viên, Nhà nghiên cứu" 
                : "Hệ thống quản trị tài sản phòng thí nghiệm"}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-in fade-in zoom-in-95">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Tên đăng nhập (Username)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:bg-white focus:border-[#A5001A] focus:ring-1 focus:ring-[#A5001A] outline-none transition-all"
                  placeholder={activePortal === "BORROWER" ? "VD: 20221234" : "admin"}
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:bg-white focus:border-[#A5001A] focus:ring-1 focus:ring-[#A5001A] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 bg-[#A5001A] hover:bg-[#850012] text-white font-bold rounded-xl transition-all shadow-xs tracking-wide text-sm mt-2 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}