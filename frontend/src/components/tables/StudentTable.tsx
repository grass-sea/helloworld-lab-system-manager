import type { Student } from "../../types/student";
import StatusBadge from "../common/StatusBadge";

interface Props {
  students: Student[];
  onToggleStatus: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onView?: (student: Student) => void;
}

export default function StudentTable({
  students,
  onToggleStatus,
  onEdit,
  onView,
}: Props) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead className="bg-gray-50/70 border-b border-gray-200 text-left">
            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              <th className="p-4 w-1/4">Student ID</th>
              <th className="p-4 w-2/5">Full Name</th>
              <th className="p-4 text-center w-32">Borrowing</th>
              <th className="p-4 w-36 text-center">Status</th>
              <th className="p-4 text-right w-44">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50/60 transition-all duration-200 group">
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-mono text-xs font-semibold border border-gray-200/50">
                    {student.studentCode}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-red-50 text-[#A5001A] font-bold text-xs flex items-center justify-center border border-red-100 group-hover:scale-105 transition-transform">
                      {getInitials(student.fullName)}
                    </div>
                    <span className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors truncate max-w-[220px]">
                      {student.fullName}
                    </span>
                  </div>
                </td>

                <td className="p-4 text-center font-semibold text-gray-700">
                  <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded-md ${student.borrowingCount > 0 ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-400"}`}>
                    {student.borrowingCount}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <StatusBadge status={student.status} />
                  </div>
                </td>

                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onView?.(student)}
                      className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 hover:text-gray-900 text-gray-600 text-xs font-bold transition-all border border-gray-100 hover:shadow-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit?.(student)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50/50 hover:bg-blue-100/80 text-blue-600 text-xs font-bold transition-all border border-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleStatus(student)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        student.status === "ACTIVE"
                          ? "bg-[#A5001A] hover:bg-[#850012] text-white hover:shadow-md hover:shadow-red-900/10"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md hover:shadow-emerald-900/10"
                      }`}
                    >
                      {student.status === "ACTIVE" ? "Block" : "Unblock"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="p-12 text-center bg-gray-50/50 border-t border-gray-100">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
            ?
          </div>
          <p className="font-bold text-gray-700">No students found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">We could not find any student matching your search criteria.</p>
        </div>
      )}
    </div>
  );
}
