import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  icon?: LucideIcon;        // Option có hoặc không (Staff cần, Student không cần)
  iconColor?: string;      // Tùy biến màu Icon
  iconBg?: string;         // Tùy biến màu nền Icon
  valueColor?: string;    // Tùy biến màu con số (Mặc định xám đen, Staff truyền màu đỏ)
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-gray-600",
  iconBg = "bg-gray-50",
  valueColor = "text-gray-900", // Mặc định là màu xám đen của bạn
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">
          {title}
        </p>
        <h2 className={`text-3xl font-black ${valueColor}`}>
          {value}
        </h2>
      </div>
      
      {/* 🌟 Nếu phía Staff truyền vào Icon thì mới hiển thị khối này */}
      {Icon && (
        <div className={`p-3.5 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}