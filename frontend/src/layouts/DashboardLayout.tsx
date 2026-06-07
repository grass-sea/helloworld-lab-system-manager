import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { 
  LayoutDashboard, PackageSearch, History, WalletCards, 
  LogOut, Users, FileText, Database, ShieldAlert
} from "lucide-react";

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isStaff = user?.role === "STAFF" || user?.role === "ADMIN";

  // Menu Động dựa trên Role
  const studentMenu = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Equipment", path: "/equipment", icon: PackageSearch },
    { name: "History", path: "/history", icon: History },
    { name: "Debts & Fines", path: "/debt", icon: WalletCards },
  ];

  const staffMenu = [
    { name: "Overview", path: "/staff", icon: LayoutDashboard },
    { name: "Equipment", path: "/staff/equipment", icon: Database },
    { name: "Requests", path: "/staff/requests", icon: FileText },
    { name: "Students", path: "/staff/students", icon: Users },
    { name: "Fines", path: "/staff/debts", icon: ShieldAlert },
  ];

  const menuItems = isStaff ? staffMenu : studentMenu;

  const handleLogout = () => {
    logout();
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
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider">{isStaff ? "Staff Portal" : "Student Portal"}</p>
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
                  {item.name}
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
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}