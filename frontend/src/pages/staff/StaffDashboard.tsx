// src/pages/staff/StaffDashboard.tsx
import { useEffect, useState } from "react";
import StatsCard from "../../components/cards/StatsCard";
import StatusBadge from "../../components/common/StatusBadge";
import { Boxes, ClipboardList, Users, AlertTriangle } from "lucide-react";
import axiosInstance from "../../api/axios";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    totalEquipment: 0,
    pendingRequestsCount: 0,
    totalStudents: 0,
    overdueDebtsCount: 0,
  });
  
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Lấy API thống kê tổng quan
        const statRes = await axiosInstance.get('/dashboard-v2');
        const data = statRes.data;
        
        setStats({
          totalEquipment: data.items || 0,
          pendingRequestsCount: data.active_borrowings || 0, // Dùng tạm chỉ số đang mượn nếu backend chưa đếm pending
          totalStudents: data.borrowers || 0,
          overdueDebtsCount: data.overdue || 0,
        });

        // 2. Lấy API yêu cầu mượn gần đây (lấy 5 bản ghi đầu tiên)
        const reqRes = await axiosInstance.get('/borrow-requests');
        const mappedRequests = reqRes.data.slice(0, 5).map((item: any) => ({
          id: item.id,
          studentName: item.borrower,
          equipment: "Xem chi tiết trong đơn", // Có thể tùy chỉnh backend trả về thêm đồ
          status: item.status
        }));
        
        setRecentRequests(mappedRequests);
      } catch (error) {
        console.error("Lỗi fetch dashboard staff:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Laboratory real-time overview</p>
      </div>

      {/* Grid Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Equipment" 
          value={stats.totalEquipment} 
          icon={Boxes} 
          iconColor="text-blue-600" 
          iconBg="bg-blue-50" 
          valueColor="text-[#A5001A]" 
        />
        <StatsCard 
          title="Active/Pending" 
          value={stats.pendingRequestsCount} 
          icon={ClipboardList} 
          iconColor="text-amber-600" 
          iconBg="bg-amber-50" 
          valueColor="text-[#A5001A]" 
        />
        <StatsCard 
          title="Active Students" 
          value={stats.totalStudents} 
          icon={Users} 
          iconColor="text-emerald-600" 
          iconBg="bg-emerald-50" 
          valueColor="text-[#A5001A]" 
        />
        <StatsCard 
          title="Overdue Items" 
          value={stats.overdueDebtsCount} 
          icon={AlertTriangle} 
          iconColor="text-rose-600" 
          iconBg="bg-red-50" 
          valueColor="text-[#A5001A]" 
        />
      </div>

      {/* Bảng danh sách rút gọn tiện ích */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Borrow Requests</h2>
        <div className="divide-y divide-gray-100">
          {recentRequests.map((request) => (
            <div 
              key={request.id} 
              className="flex justify-between items-center py-3.5 hover:bg-gray-50/40 rounded-xl px-2 -mx-2 transition-colors"
            >
              <div>
                <p className="font-semibold text-sm text-gray-900">{request.studentName}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Equipment: <span className="text-gray-700 font-semibold">{request.equipment}</span>
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
          ))}
          {recentRequests.length === 0 && (
            <div className="text-sm text-gray-500 py-4 text-center">Chưa có yêu cầu mượn nào gần đây.</div>
          )}
        </div>
      </div>
    </div>
  );
}