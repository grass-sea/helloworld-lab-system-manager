import type { Equipment } from "../../types/equipment";
import StatusBadge from "../common/StatusBadge";

interface Props {
  equipment: Equipment[];
  onBorrow: (item: Equipment) => void;
}

export default function EquipmentTable({
  equipment,
  onBorrow,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Asset
            </th>

            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Category
            </th>

            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quantity
            </th>

            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>

            <th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {equipment.map((item) => {
            const isAvailable = item.status === "AVAILABLE";

            return (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-500 font-mono">
                      {item.id}
                    </p>
                  </div>
                </td>

                <td className="p-4 text-sm text-gray-600">
                  {item.category}
                </td>

                <td className="p-4 text-sm text-gray-600">
                  {item.quantity}
                </td>

                <td className="p-4">
                  <StatusBadge status={item.status} />
                </td>

                <td className="p-4 text-right">
                  <button
                    disabled={!isAvailable}
                    onClick={() => onBorrow(item)} // <-- Đã nằm đúng vị trí thuộc tính hợp lệ
                    className={`
                      px-4
                      py-2
                      rounded-xl
                      text-sm
                      font-medium
                      transition

                      ${
                        isAvailable
                          ? "bg-[#A5001A] hover:bg-[#8d0016] active:bg-[#740012] text-white cursor-pointer"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    Borrow
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {equipment.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No equipment found
        </div>
      )}
    </div>
  );
}