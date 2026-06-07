import { useState } from "react";
import SearchBar from "../../components/common/SearchBar";
import BorrowRequestTable from "../../components/tables/BorrowRequestTable";
import { requestMock } from "../../mock/request";
import type { BorrowRequest } from "../../types/request";

export default function BorrowRequestsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>(requestMock);
  const [search, setSearch] = useState("");

  // Bộ lọc tìm kiếm theo tên sinh viên (không phân biệt hoa thường)
  const filteredRequests = requests.filter((item) =>
    item.studentName.toLowerCase().includes(search.toLowerCase())
  );

  // Xử lý nút Approve (Phê duyệt)
  const handleApprove = (request: BorrowRequest) => {
    setRequests((prevRequests) =>
      prevRequests.map((item) =>
        item.id === request.id ? { ...item, status: "APPROVED" as const } : item
      )
    );
  };

  // Xử lý nút Reject (Từ chối)
  const handleReject = (request: BorrowRequest) => {
    setRequests((prevRequests) =>
      prevRequests.map((item) =>
        item.id === request.id ? { ...item, status: "REJECTED" as const } : item
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">
          Borrow Requests
        </h1>
        <p className="text-gray-500">
          Review and process laboratory equipment borrowing requests
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search student name..."
      />

      <BorrowRequestTable
        requests={filteredRequests}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}