import type { Student } from "../../types/student";
import StatusBadge from "../common/StatusBadge";

interface Props {
  students: Student[];
  onToggleStatus: (student: Student) => void;
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelect?: (studentId: string, checked: boolean) => void;
}

export default function StudentTable({
  students,
  onToggleStatus,
  selectionMode = false,
  selectedIds = [],
  onSelect,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">
            {selectionMode && <th className="p-4 w-10"></th>}
            <th className="p-4 w-32">Student ID</th>
            <th className="p-4">Full Name</th>
            <th className="p-4">Email</th>
            <th className="p-4 text-center w-28">Borrowing</th>
            <th className="p-4 w-32">Status</th>
            <th className="p-4 text-right w-32">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
              {selectionMode && (
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={(event) => onSelect?.(student.id, event.target.checked)}
                    className="h-4 w-4 accent-[#A5001A]"
                  />
                </td>
              )}
              <td className="p-4 text-sm font-mono text-gray-600">{student.studentCode}</td>
              <td className="p-4"><span className="font-semibold text-gray-900">{student.fullName}</span></td>
              <td className="p-4 text-sm text-gray-500">{student.email}</td>
              <td className="p-4 text-sm text-center font-medium text-gray-700">{student.borrowingCount}</td>
              <td className="p-4"><StatusBadge status={student.status} /></td>
              <td className="p-4 text-right">
                <button
                  onClick={() => onToggleStatus(student)}
                  disabled={student.status === "DELETED"}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
                    student.status === "ACTIVE"
                      ? "bg-[#A5001A] hover:bg-[#850012] text-white"
                      : student.status === "DELETED"
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {student.status === "ACTIVE" ? "Block" : student.status === "DELETED" ? "Deleted" : "Unblock"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && (
        <div className="p-10 text-center bg-white">
          <p className="font-semibold text-gray-700">No students found</p>
          <p className="text-sm text-gray-500 mt-1">Try checking for spelling errors.</p>
        </div>
      )}
    </div>
  );
}
