import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import StatsCard from "../../components/cards/StatsCard";
import {Bell, ArrowRight, Clock } from "lucide-react";
import axiosInstance from "../../api/axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, borrowed: 0, totalFine: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.username) return;
      try {
        // Lấy lịch sử mượn
        const histRes = await axiosInstance.get(`/borrowers/${user.username}/history`);
        const historyData = histRes.data;
        
        // Map lại dữ liệu cho bảng Recent Activities
        const mappedHistory = historyData.map((item: any) => ({
          id: `${item.request_id}_${Math.random()}`,
          equipmentName: item.item_name,
          action: item.status, // Tạm mượn status làm action
          date: item.request_date.split('T')[0]
        }));
        setHistory(mappedHistory);

        // Tính toán các thông số
        const pendingCount = historyData.filter((r: any) => r.borrow_request_status === "PENDING").length;
        const borrowedCount = historyData.filter((r: any) => r.borrow_request_status === "BORROWED").length;
        
        // Lấy tổng nợ
        const debtRes = await axiosInstance.get(`/borrowers/${user.username}/debt`);
        
        setStats({
          pending: pendingCount,
          borrowed: borrowedCount,
          totalFine: debtRes.data.total_debt || 0
        });
      } catch (error) {
        console.error("Lỗi fetch dashboard data:", error);
      }
    };
    fetchDashboardData();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* ---------------- THÔNG TIN HEADER ---------------- */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Laboratory Management System • HUST Edition</p>
        </div>
      </div>

      {/* ---------------- HÀNG THỐNG KÊ ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Borrowed Equipment" value={stats.borrowed} />
        <StatsCard title="Pending Requests" value={stats.pending} />
        <StatsCard title="Total Lab Debts" value={`$${stats.totalFine}`} />
      </div>

      {/* ---------------- HÀNH ĐỘNG NHANH ---------------- */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => navigate("/equipment")} className="flex justify-between items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-[#A5001A] hover:shadow-md transition-all text-left group">
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#A5001A] transition-colors">Borrow Equipment</h4>
              <p className="text-xs text-gray-500 mt-1">Đăng ký mượn thiết bị mới</p>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-[#A5001A] transition-all group-hover:translate-x-1">
              <ArrowRight size={18} />
            </div>
          </button>

          <button onClick={() => navigate("/debt")} className="flex justify-between items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-[#A5001A] hover:shadow-md transition-all text-left group">
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#A5001A] transition-colors">View Lab Debts</h4>
              <p className="text-xs text-gray-500 mt-1">Kiểm tra thời hạn bàn trả</p>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-[#A5001A] transition-all group-hover:translate-x-1">
              <ArrowRight size={18} />
            </div>
          </button>

          <button onClick={() => navigate("/history")} className="flex justify-between items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-[#A5001A] hover:shadow-md transition-all text-left group">
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#A5001A] transition-colors">Request History</h4>
              <p className="text-xs text-gray-500 mt-1">Tra cứu nhật ký mượn trả cũ</p>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-[#A5001A] transition-all group-hover:translate-x-1">
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* ---------------- PHẦN THÂN DƯỚI ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-[#A5001A] px-6 py-4 flex items-center gap-3 text-white">
            <Bell size={20} className="animate-pulse" />
            <h3 className="font-black tracking-wide uppercase text-sm">Important Notifications</h3>
          </div>
          <div className="p-6 flex-1 justify-center space-y-4 divide-y divide-gray-100">
             {/* Nội dung tĩnh thông báo (có thể map từ API /notifications sau) */}
            <div className="flex items-start gap-4 pt-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Cập nhật hệ thống</p>
                <p className="text-xs text-gray-500 mt-0.5">Dữ liệu hiện đang được đồng bộ trực tiếp với Backend Django.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-gray-400" />
              <h2 className="font-black text-lg text-gray-900 tracking-tight">Recent Activities</h2>
            </div>
            <div className="space-y-3.5">
              {history.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{activity.equipmentName}</span>
                    <span className="text-2xs text-gray-400 font-mono mt-0.5">Status: {activity.action}</span>
                  </div>
                  <span className="text-gray-400 font-medium text-xs bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{activity.date}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => navigate("/history")} className="w-full mt-4 text-center text-xs font-bold text-[#A5001A] hover:text-[#850012] transition-colors py-2 bg-red-50/50 hover:bg-red-50 rounded-xl">
            See all activities
          </button>
        </div>
      </div>
    </div>
  );
}