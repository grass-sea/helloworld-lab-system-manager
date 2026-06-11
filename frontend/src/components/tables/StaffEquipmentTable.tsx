import type { Equipment } from "../../types/equipment";
import { formatVnd } from "../../utils/currency";

interface Props {
  equipment: Equipment[];
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
}

export default function StaffEquipmentTable({
  equipment,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
            <th className="p-4 w-32">Equipment ID</th>
            <th className="p-4">Equipment</th>
            <th className="p-4">Category</th>
            <th className="p-4">Quantity</th>
            <th className="p-4">Supplier</th>
            <th className="p-4">Price</th>
            <th className="p-4">Return</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {equipment.map((item) => (
            <tr 
              key={item.id} 
              className="hover:bg-gray-50 transition-colors"
            >
              {/* Thêm cột ID thiết bị font-mono để chuẩn quản trị */}
              <td className="p-4 text-sm font-mono text-gray-400">
                {item.equipmentId || item.id}
              </td>

              <td className="p-4">
                <span className="font-semibold text-gray-900">
                  {item.name}
                </span>
              </td>

              <td className="p-4 text-sm text-gray-600">
                {item.category}
              </td>

              <td className="p-4 text-sm text-gray-600 font-semibold">
                {item.quantity}
              </td>

              <td className="p-4 text-sm text-gray-600">
                {item.supplier || "N/A"}
              </td>

              <td className="p-4 text-sm text-gray-600">
                {formatVnd(item.purchasePrice)}
              </td>

              <td className="p-4 text-sm text-gray-600">
                {item.requiresReturn ? "Required" : "Purchase"}
              </td>

              <td className="p-4 text-right">
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => onEdit(item)}
                    className="
                    px-3
                    py-1.5
                    rounded-xl
                    bg-blue-50
                    hover:bg-blue-100
                    text-blue-600
                    text-xs
                    font-semibold
                    transition
                    "
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onDelete(item)}
                    className="
                    px-3
                    py-1.5
                    rounded-xl
                    bg-rose-50
                    hover:bg-rose-100
                    text-rose-600
                    text-xs
                    font-semibold
                    transition
                    "
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Hiển thị Empty State nếu bộ lọc tìm kiếm không ra kết quả */}
      {equipment.length === 0 && (
        <div className="p-10 text-center bg-white">
          <p className="font-semibold text-gray-700">No equipment found</p>
          <p className="text-sm text-gray-500 mt-2">
            Try adjusting your search keyword.
          </p>
        </div>
      )}
    </div>
  );
}
