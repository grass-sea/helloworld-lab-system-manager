import type { BorrowHistory } from "../../types/history";
import StatusBadge from "../common/StatusBadge";

interface Props {
  history: BorrowHistory[];
}

export default function HistoryTable({ history }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Equipment
            </th>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {history.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4">
                <span className="font-semibold text-gray-900">
                  {item.equipment}
                </span>
              </td>
              <td className="p-4 text-sm text-gray-600">
                {item.date}
              </td>
              <td className="p-4">
                {/* Dùng StatusBadge chung của hệ thống để đồng bộ màu sắc */}
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Giao diện Empty State khi không tìm thấy kết quả */}
      {history.length === 0 && (
        <div className="p-10 text-center bg-white">
          <p className="font-semibold text-gray-700">
            No borrowing history
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your borrowing requests will appear here.
          </p>
        </div>
      )}
    </div>
  );
}