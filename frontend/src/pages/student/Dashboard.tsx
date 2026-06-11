import { useEffect, useState } from "react";
import { Bell, Clock, Package, FileText, CreditCard, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import axiosInstance from "../../api/axios";
import { useI18n } from "../../context/I18nContext";
import { formatVnd } from "../../utils/currency";

export default function Dashboard() {
  const { user } = useApp();
  const { t } = useI18n();
  const [history, setHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, borrowed: 0, totalDebt: 0, unread: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.borrowerCode) return;
      try {
        const [historyRes, debtRes, notificationRes] = await Promise.all([
          axiosInstance.get(`/borrowers/${user.borrowerCode}/history`),
          axiosInstance.get(`/borrowers/${user.borrowerCode}/debt`),
          axiosInstance.get(`/borrowers/${user.borrowerCode}/notifications`),
        ]);
        
        const historyData = historyRes.data;

        // 🔥 Sắp xếp chuẩn mã gen: Ưu tiên ngày mới nhất, nếu trùng ngày thì ưu tiên ID lớn hơn
        const sortedHistory = [...historyData].sort((a: any, b: any) => {
          const dateA = a.request_date || "";
          const dateB = b.request_date || "";
          
          if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
          }
          return Number(b.request_id || 0) - Number(a.request_id || 0);
        });

        setHistory(sortedHistory.map((item: any) => ({
          id: `${item.request_id}_${item.item_name}_${item.request_date}`,
          equipmentName: item.item_name,
          status: item.borrow_request_status,
          date: item.request_date ? item.request_date.split("T")[0] : "",
        })));

        setNotifications(notificationRes.data);
        setStats({
          pending: historyData.filter((r: any) => r.borrow_request_status === "PENDING").length,
          borrowed: historyData.filter((r: any) => r.borrow_request_status === "APPROVED").length,
          totalDebt: debtRes.data.total_debt || 0,
          unread: notificationRes.data.filter((n: any) => !n.is_read).length,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };
    fetchDashboardData();
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 p-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {t("studentDashboard")} 
          </h1>
          <p className="text-gray-500 font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {t("dashboardSubtitle")}
          </p>
        </div>
      </div>

      {/* Modern Stats Grid (3 cột thông thoáng) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t("borrowedItems")}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{stats.borrowed}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t("pendingRequests")}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{stats.pending}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
            <CreditCard size={24} />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t("outstandingDebts")}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{formatVnd(stats.totalDebt)}</p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Khu vực Thông báo Gộp Duy Nhất (8 cột) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Bell className="text-[#A5001A]" /> {t("notifications")}
              </h2>
              {stats.unread > 0 && (
                <span className="bg-[#A5001A] text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                  {stats.unread} 
                </span>
              )}
            </div>
            <button className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
              {t("markAllAsRead")} <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid gap-4">
            {notifications.length > 0 ? (
              notifications.slice(0, 4).map((n, i) => (
                <div key={i} className={`group relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-gray-300 transition-all flex items-center gap-5 ${!n.is_read ? 'ring-1 ring-[#A5001A]/10 bg-gradient-to-r from-gray-50/50 to-transparent' : ''}`}>
                  {!n.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#A5001A] rounded-r-full" />}
                  
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${!n.is_read ? 'bg-red-50 text-[#A5001A]' : 'bg-gray-50 text-gray-400'}`}>
                    <Bell size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 group-hover:text-[#A5001A] transition-colors">{n.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{n.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gần đây</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-gray-400 font-medium">
                {t("noNotifications")}
              </div>
            )}
          </div>
        </div>

        {/* Hoạt động gần đây (4 cột) */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Clock className="text-gray-400" /> {t("recentActivity")}
          </h2>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            {history.length > 0 ? (
              history.slice(0, 5).map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white ring-4 ring-gray-50 shrink-0" />
                    {index !== Math.min(history.length, 5) - 1 && (
                      <div className="w-px h-full bg-gray-100 mt-2" />
                    )}
                  </div>
                  <div className="pb-6 last:pb-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{activity.date}</p>
                    <h4 className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[180px]" title={activity.equipmentName}>
                      {activity.equipmentName}
                    </h4>
                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusStyle(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-10">{t("noRecentActivity")}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
