import type { Debt } from "../../types/debt";

interface Props {
  debts: Debt[];
}

export default function DebtTable({
  debts,
}: Props) {
  return (
    <div
      className="
      bg-white
      border
      border-gray-200
      rounded-2xl
      overflow-hidden
      shadow-sm
      "
    >
      <table className="w-full">
        <thead
          className="
          bg-gray-50
          border-b
          border-gray-200
          "
        >
          <tr>
            <th className="p-4 text-left">
              Equipment
            </th>

            <th className="p-4 text-left">
              Due Date
            </th>

            <th className="p-4 text-left">
              Remaining
            </th>
          </tr>
        </thead>

        <tbody>
          {debts.map((item) => (
            <tr
              key={item.id}
              className="
              border-b
              border-gray-100
              "
            >
              <td className="p-4">
                {item.equipment}
              </td>

              <td className="p-4">
                {item.dueDate}
              </td>

              <td className="p-4">
                <span
                  className={
                    item.daysLeft < 0
                      ? "text-red-600 font-semibold"
                      : "text-green-600 font-semibold"
                  }
                >
                  {item.daysLeft < 0
                    ? `${Math.abs(
                        item.daysLeft
                      )} days overdue`
                    : `${item.daysLeft} days left`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}