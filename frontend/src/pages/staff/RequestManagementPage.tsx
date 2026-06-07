// src/pages/staff/RequestManagementPage.tsx
import { useState, useEffect } from "react";
import BorrowRequestTable from "../../components/tables/BorrowRequestTable";
import axiosInstance from "../../api/axios";

export default function RequestManagementPage() {
  const [requests, setRequests] = useState<any[]>([]);

  // KẾT NỐI API: Fetch danh sách đơn mượn
  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get('/borrow-requests');
      const mapped = res.data.map((item: any) => ({
        id: item.id,
        studentName: item.borrower,
        equipment: "Cáp nối / Module", // Hiện backend trả thiếu field này, hiển thị tạm thời
        requestDate: item.request_date.split('T')[0],
        status: item.status
      }));
      setRequests(mapped);
    } catch (error) {
      console.error("Lỗi fetch requests:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // KẾT NỐI API: Duyệt đơn
  const handleApprove = async (requestItem: any) => {
    try {
      await axiosInstance.post(`/borrow-requests/${requestItem.id}/approve`);
      fetchRequests(); // Tải lại bảng sau khi duyệt xong
    } catch (error) {
      console.error("Lỗi approve:", error);
      alert("Không thể duyệt đơn này (Thiếu số lượng trong kho)!");
    }
  };

  // KẾT NỐI API: Từ chối
  const handleReject = async (requestItem: any) => {
    try {
      // Backend của bạn hiện chưa có API reject rõ ràng, giả sử gọi API PUT để đổi status
      // await axiosInstance.put(`/borrow-requests/${requestItem.id}`, { status: "REJECTED" });
      
      // Update state cục bộ nếu API chưa sẵn sàng
      setRequests((prev) =>
        prev.map((item) => item.id === requestItem.id ? { ...item, status: "REJECTED" } : item)
      );
    } catch (error) {
      console.error("Lỗi reject:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Borrow Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Approve or reject laboratory equipment borrowing requests</p>
      </div>

      <BorrowRequestTable
        requests={requests}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}