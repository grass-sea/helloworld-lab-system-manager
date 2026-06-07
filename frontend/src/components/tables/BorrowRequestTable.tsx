import type { BorrowRequest } from "../../types/request";
import StatusBadge from "../common/StatusBadge"; 

interface Props {
  requests: BorrowRequest[];
  onApprove: (item: BorrowRequest) => void;
  onReject: (item: BorrowRequest) => void;
}

export default function BorrowRequestTable({
  requests,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
            <th className="p-4 w-28">ID</th>
            <th className="p-4">Student</th>
            <th className="p-4">Equipment</th>
            <th className="p-4">Date</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {requests.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="p-4 text-sm font-mono text-gray-400">
                {item.id}
              </td>

              <td className="p-4">
                <span className="font-semibold text-gray-900">
                  {item.studentName}
                </span>
              </td>

              <td className="p-4 text-sm text-gray-600">
                {item.equipment}
              </td>

              <td className="p-4 text-sm text-gray-500">
                {item.requestDate}
              </td>

              <td className="p-4">
                {/* 🎨 Cột Status: Giữ nguyên Badge màu Đỏ, Xanh, Vàng phản ánh đúng trạng thái dữ liệu gốc */}
                <StatusBadge status={item.status} />
              </td>

              <td className="p-4 text-right">
                {item.status === "PENDING" ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onApprove(item)}
                      className="px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(item)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end pr-2">
                    <span className="text-xs text-stone-500 bg-stone-50/80 px-2.5 py-0.5 rounded-md font-medium border border-stone-200/50">
                      Processed
                    </span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Trường hợp tìm kiếm không ra kết quả (Empty State) */}
      {requests.length === 0 && (
        <div className="p-10 text-center bg-white">
          <p className="font-semibold text-gray-700">No requests found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search filter.</p>
        </div>
      )}
    </div>
  );
}