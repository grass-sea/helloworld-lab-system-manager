import { useEffect, useState } from "react";
import { AlertTriangle, Bell, ClipboardList, PackageCheck, WalletCards } from "lucide-react";
import StatsCard from "../../components/cards/StatsCard";
import StatusBadge from "../../components/common/StatusBadge";
import axiosInstance from "../../api/axios";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    borrowedItems: 0,
    pendingRequests: 0,
    outstandingDebts: 0,
    notifications: 0,
    overdue: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statRes, reqRes] = await Promise.all([
          axiosInstance.get("/dashboard-v2"),
          axiosInstance.get("/borrow-requests"),
        ]);
        setStats({
          borrowedItems: statRes.data.borrowed_items || 0,
          pendingRequests: statRes.data.pending_requests || 0,
          outstandingDebts: statRes.data.outstanding_debts || 0,
          notifications: statRes.data.unread_notifications || 0,
          overdue: statRes.data.overdue || 0,
        });
        setRecentRequests(reqRes.data.slice(0, 6).map((item: any) => ({
          id: item.id,
          studentName: item.borrower,
          equipment: item.items?.map((requestItem: any) => `${requestItem.item_name} x${requestItem.quantity}`).join(", ") || "No items",
          status: item.is_overdue ? "OVERDUE" : item.status,
          date: item.request_date?.split("T")[0],
        })));
      } catch (error) {
        console.error("Failed to fetch staff dashboard:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Operational view for requests, debts, notifications, and overdue equipment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        <StatsCard title="Borrowed Items" value={stats.borrowedItems} icon={PackageCheck} iconColor="text-blue-600" iconBg="bg-blue-50" valueColor="text-[#A5001A]" />
        <StatsCard title="Pending Requests" value={stats.pendingRequests} icon={ClipboardList} iconColor="text-amber-600" iconBg="bg-amber-50" valueColor="text-[#A5001A]" />
        <StatsCard title="Outstanding Debts" value={stats.outstandingDebts} icon={WalletCards} iconColor="text-rose-600" iconBg="bg-rose-50" valueColor="text-[#A5001A]" />
        <StatsCard title="Notifications" value={stats.notifications} icon={Bell} iconColor="text-emerald-600" iconBg="bg-emerald-50" valueColor="text-[#A5001A]" />
        <StatsCard title="Overdue" value={stats.overdue} icon={AlertTriangle} iconColor="text-orange-600" iconBg="bg-orange-50" valueColor="text-[#A5001A]" />
      </div>

      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-800">
          <AlertTriangle size={18} />
          {stats.overdue} approved request(s) are overdue and need follow-up.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity Timeline</h2>
        <div className="divide-y divide-gray-100">
          {recentRequests.map((request) => (
            <div key={request.id} className="grid grid-cols-[110px_1fr_auto] gap-4 items-center py-3.5">
              <span className="text-xs font-mono text-gray-400">{request.date}</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">{request.studentName}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{request.equipment}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
          ))}
          {recentRequests.length === 0 && <div className="text-sm text-gray-500 py-4 text-center">No recent request activity.</div>}
        </div>
      </div>
    </div>
  );
}
