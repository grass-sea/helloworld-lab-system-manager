import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { 
  LayoutDashboard, 
  Boxes, 
  History, 
  ShieldAlert, 
  LogOut, 
  ClipboardList, 
  Users,
  HelpCircle 
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // State quản lý việc hiển thị thông báo xác nhận Sign out
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);

  const handleLogoutConfirm = () => {
    setIsConfirmingLogout(false);
    logout();
    navigate("/login");
  };

  const studentMenus = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/equipment", label: "Equipment", icon: Boxes },
    { path: "/debt", label: "Debt Tracking", icon: ShieldAlert },
    { path: "/history", label: "History", icon: History },
  ];

  const staffMenus = [
    { path: "/staff", label: "Staff Dashboard", icon: LayoutDashboard },
    { path: "/staff/requests", label: "Manage Requests", icon: ClipboardList },
    { path: "/staff/equipment", label: "Manage Assets", icon: Boxes },
    { path: "/staff/students", label: "Manage Students", icon: Users },
  ];

  const currentMenus = user?.role === "STAFF" ? staffMenus : studentMenus;

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-6 h-full shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-2 px-2">
            <div className="w-3 h-6 bg-[#A5001A] rounded-sm" />
            <span className="text-xl font-black text-gray-900 tracking-wider uppercase">
              Lab Inventory
            </span>
          </div>

          <nav className="space-y-1.5">
            {currentMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = location.pathname === menu.path;
              return (
                <Link
                  key={menu.path}
                  to={menu.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? "bg-red-50 text-[#A5001A]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-[#A5001A]" : "text-gray-400"} />
                  <span>{menu.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setIsConfirmingLogout(true)} // 👈 Bật popup xác nhận thay vì logout luôn
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-rose-600 hover:bg-rose-50/60 font-bold text-sm rounded-xl transition-all group"
          >
            <LogOut size={18} className="text-stone-400 group-hover:text-rose-600 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ----------------- POPUP XÁC NHẬN ĐĂNG XUẤT (MODAL DIALOG) ----------------- */}
      {isConfirmingLogout && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl space-y-4 mx-4">
            <div className="flex items-center gap-3 text-amber-500 bg-amber-50 p-3 rounded-xl w-fit">
              <HelpCircle size={24} />
            </div>
            
            <div>
              <h3 className="text-lg font-black text-gray-900">Xác nhận đăng xuất</h3>
              <p className="text-sm text-gray-500 mt-1">
                Bạn có chắc chắn muốn thoát khỏi hệ thống quản lý phòng LAB không?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsConfirmingLogout(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-sm font-bold text-white transition-colors shadow-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}