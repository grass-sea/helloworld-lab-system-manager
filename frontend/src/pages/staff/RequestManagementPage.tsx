import { useEffect, useState } from "react";
import BorrowRequestTable from "../../components/tables/BorrowRequestTable";
import axiosInstance from "../../api/axios";
import type { BorrowRequest, BorrowRequestRow } from "../../types/request";

const toRow = (item: BorrowRequest): BorrowRequestRow => ({
  id: item.id,
  studentName: item.borrower,
  equipment: item.items?.map((requestItem) => `${requestItem.equipment_id || requestItem.item_name}: ${requestItem.item_name} x${requestItem.quantity}`).join(", ") || "No items",
  requestDate: item.request_date.split("T")[0],
  status: item.status,
});

export default function RequestManagementPage() {
  const [requests, setRequests] = useState<BorrowRequestRow[]>([]);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get("/borrow-requests");
      setRequests(res.data.map(toRow));
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestItem: BorrowRequestRow) => {
    try {
      await axiosInstance.post(`/borrow-requests/${requestItem.id}/approve`);
      await fetchRequests();
    } catch (error: any) {
      console.error("Failed to approve request:", error);
      alert(error.response?.data?.detail || "Cannot approve this request.");
    }
  };

  const handleReject = async (requestItem: BorrowRequestRow) => {
    try {
      await axiosInstance.post(`/borrow-requests/${requestItem.id}/reject`);
      await fetchRequests();
    } catch (error: any) {
      console.error("Failed to reject request:", error);
      alert(error.response?.data?.detail || "Cannot reject this request.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Borrow Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Approve or reject laboratory equipment borrowing requests</p>
      </div>

      <BorrowRequestTable requests={requests} onApprove={handleApprove} onReject={handleReject} />
    </div>
  );
}
