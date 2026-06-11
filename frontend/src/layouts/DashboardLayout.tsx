import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { 
  LayoutDashboard, PackageSearch, History, WalletCards, 
  LogOut, Users, FileText, Database, ShieldAlert, UserCircle
} from "lucide-react";
import LanguageSelector from "../components/common/LanguageSelector";
import { useI18n } from "../context/I18nContext";
import axiosInstance from "../api/axios";

interface MenuItem {
  name: string;
  path: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingRequests, setPendingRequests] = useState(0);

  const isStaff = user?.role === "STAFF" || user?.role === "ADMIN";

  useEffect(() => {
    const fetchPending = async () => {
      if (!isStaff) return;
      try {
        const res = await axiosInstance.get("/dashboard-v2");
        setPendingRequests(res.data.pending_requests || 0);
      } catch {
        setPendingRequests(0);
      }
    };
    fetchPending();
  }, [isStaff, location.pathname]);

  // Menu Động dựa trên Role
  const studentMenu: MenuItem[] = [
    { name: t("dashboard"), path: "/dashboard", icon: LayoutDashboard },
    { name: t("equipment"), path: "/equipment", icon: PackageSearch },
    { name: t("history"), path: "/history", icon: History },
    { name: t("debts"), path: "/debt", icon: WalletCards },
  ];

  const staffMenu: MenuItem[] = [
    { name: t("overview"), path: "/staff", icon: LayoutDashboard },
    { name: t("equipment"), path: "/staff/equipment", icon: Database },
    { name: t("requests"), path: "/staff/requests", icon: FileText, badge: pendingRequests },
    { name: t("students"), path: "/staff/students", icon: Users },
    { name: t("paymentRequests"), path: "/staff/debts", icon: ShieldAlert },
  ];

  const menuItems = isStaff ? staffMenu : studentMenu;

  const handleLogout = async () => {
    const confirmed = window.confirm(`${t("logoutConfirm")} ${user?.name || user?.username || ""}?`);
    if (!confirmed) return;
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden text-gray-900">
      {/* SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shadow-sm z-10 relative">
        <div>
          <div className="h-20 flex items-center px-6 border-b border-gray-100">
            <div className="w-8 h-8 bg-[#A5001A] rounded-lg flex items-center justify-center mr-3 shrink-0">
              <span className="text-white font-black text-lg">H</span>
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight leading-tight">HUST Lab</h1>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider">{isStaff ? t("staffPortal") : t("studentPortal")}</p>
            </div>
          </div>

          <div className="p-4 space-y-1.5 mt-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                    isActive 
                      ? "bg-[#A5001A] text-white shadow-md shadow-red-900/10" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : "text-gray-400"} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {(item.badge || 0) > 0 && (
                    <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-black ${isActive ? "bg-white text-[#A5001A]" : "bg-[#A5001A] text-white"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM USER INFO & LOGOUT */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-gray-600 text-sm">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          {!isStaff && (
            <button
              onClick={() => navigate("/student/profile")}
              className="mb-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <UserCircle size={16} /> Profile
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <LogOut size={16} /> {t("logout")}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto bg-[#F7F8FA]">
        <div className="sticky top-0 z-20 flex justify-end gap-3 border-b border-gray-200 bg-white/90 px-8 py-3 backdrop-blur">
          <LanguageSelector />
          <div className="flex items-center gap-2 rounded-full border border-[#A5001A]/20 bg-[#A5001A]/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#A5001A]">
            <span>{t("role")}</span>
            <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">{user?.role || "GUEST"}</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
