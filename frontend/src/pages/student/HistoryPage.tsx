import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import axiosInstance from "../../api/axios";

export default function HistoryPage() {
  const { user } = useApp();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.username) return;
      try {
        const res = await axiosInstance.get(`/borrowers/${user.username}/history`);
        const mapped = res.data.map((item: any) => ({
          id: `${item.request_id}_${item.item_name}_${Math.random()}`,
          equipment: item.item_name,
          date: item.request_date.split('T')[0],
          status: item.borrow_request_status
        }));
        setHistory(mapped);
      } catch (error) {
        console.error("Lỗi lấy lịch sử:", error);
      }
    };
    fetchHistory();
  }, [user]);

  const getStatusStyles = (status: string) => {
    const norm = status.toUpperCase();
    switch (norm) {
      case "APPROVED": case "RETURNED": return "bg-green-50 text-green-700 border border-green-200";
      case "PENDING": case "BORROWED": return "bg-amber-50 text-amber-700 border border-amber-200";
      case "REJECTED": case "OVERDUE": return "bg-rose-50 text-rose-700 border border-rose-200";
      default: return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Borrow History</h1>
        <p className="text-gray-500">View all your borrowing requests</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipment</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4"><span className="font-semibold text-gray-900">{item.equipment}</span></td>
                <td className="p-4 text-sm text-gray-600">{item.date}</td>
                <td className="p-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyles(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No borrowing history found.</div>
        )}
      </div>
    </div>
  );
}