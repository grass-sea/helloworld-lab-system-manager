import type { Request } from "../../types/request";
import StatusBadge from "../common/StatusBadge";

interface Props {
  requests: Request[];

  onApprove: (
    item: Request
  ) => void;

  onReject: (
    item: Request
  ) => void;
}

export default function BorrowRequestTable({
  requests,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 text-left">
              Student
            </th>

            <th className="p-4 text-left">
              Equipment
            </th>

            <th className="p-4 text-left">
              Date
            </th>

            <th className="p-4 text-left">
              Status
            </th>

            <th className="p-4 text-right">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {requests.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-100"
            >
              <td className="p-4">
                {item.studentName}
              </td>

              <td className="p-4">
                {item.equipment}
              </td>

              <td className="p-4">
                {item.requestDate}
              </td>

              <td className="p-4">
                <StatusBadge
                  status={item.status}
                />
              </td>

              <td className="p-4 text-right">
                {item.status ===
                  "PENDING" && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() =>
                        onApprove(item)
                      }
                      className="bg-green-600 text-white px-3 py-1 rounded-lg"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        onReject(item)
                      }
                      className="bg-red-600 text-white px-3 py-1 rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}