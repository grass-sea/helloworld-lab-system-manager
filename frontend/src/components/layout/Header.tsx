import { useApp } from "../../context/AppContext";
// Import thêm các icon trực quan cho từng đối tượng mượn đồ
import { User, ShieldCheck, GraduationCap, Microscope } from "lucide-react";

export default function Header() {
  const { user } = useApp();

  // Động hóa việc sinh nhãn, màu sắc và biểu tượng theo từng Role cụ thể
  const getRoleBadgeConfig = () => {
    switch (user?.role) {
      case "STAFF":
        return {
          label: "Staff Mode",
          className: "bg-blue-50 border-blue-200 text-blue-700",
          icon: <ShieldCheck size={12} />
        };
      case "LECTURER":
        return {
          label: "Lecturer",
          className: "bg-amber-50 border-amber-200 text-amber-700",
          icon: <GraduationCap size={12} />
        };
      case "RESEARCHER":
        return {
          label: "Researcher",
          className: "bg-purple-50 border-purple-200 text-purple-700",
          icon: <Microscope size={12} />
        };
      case "STUDENT":
      default:
        return {
          label: "Student",
          className: "bg-red-50 border-red-100 text-[#A5001A]",
          icon: <User size={12} />
        };
    }
  };

  const badge = getRoleBadgeConfig();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
      {/* Bên trái: Trạng thái hệ thống đồng bộ */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Version 1.0 • Client State Synced
        </span>
      </div>

      {/* Bên phải: Khối hiển thị thông tin cá nhân người dùng */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-black text-gray-800 leading-tight">
            {user?.name || "Khách vãng lai"}
          </p>
          <p className="text-2xs font-mono text-gray-400 mt-0.5">
            {user?.email || "chưa đăng nhập"}
          </p>
        </div>

        {/* Khối hiển thị Badge nhận diện phân hệ động độc lập */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full font-bold text-2xs uppercase tracking-wide transition-all ${badge.className}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
}