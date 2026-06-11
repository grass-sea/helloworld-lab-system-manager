import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import SearchBar from "../../components/common/SearchBar";
import axiosInstance from "../../api/axios";

const mapStudent = (item: any) => ({
  id: String(item.id),
  studentCode: item.borrower_code,
  fullName: item.full_name,
  email: item.email || "N/A",
  phoneNumber: item.phone_number || item.phone || "",
  status: item.status,
});

export default function BlockedStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBlockedStudents = async () => {
    try {
      const res = await axiosInstance.get("/borrowers", {
        params: {
          status: "BLOCKED",
          search: search.trim() || undefined,
        },
      });
      setStudents(res.data.map(mapStudent));
    } catch (error) {
      console.error("Failed to fetch blocked students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedStudents();
  }, [search]);

  const unblockStudent = async (student: any) => {
    const confirmed = window.confirm(`Unblock ${student.fullName}? Their login will be restored.`);
    if (!confirmed) return;
    try {
      await axiosInstance.patch(`/borrowers/${student.id}/status`, { status: "ACTIVE" });
      setStudents((current) => current.filter((item) => item.id !== student.id));
    } catch (error: any) {
      alert(error.response?.data?.detail || "Unable to unblock this student.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/staff/students")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to Student Management
        </button>
        <h1 className="text-3xl font-black text-gray-900">Blocked Students</h1>
        <p className="text-gray-500">Students blocked from login and borrowing appear here.</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search blocked students..." />

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr className="text-xs font-bold uppercase tracking-wide text-gray-400">
                <th className="p-4">Student ID</th>
                <th className="p-4">Full Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-600">
                      {student.studentCode}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-900">{student.fullName}</td>
                  <td className="p-4 text-gray-600">{student.email}</td>
                  <td className="p-4"><StatusBadge status={student.status} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/staff/students/${student.studentCode}`)} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100">
                        View
                      </button>
                      <button onClick={() => unblockStudent(student)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
                        <RotateCcw size={14} /> Unblock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && students.length === 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Search size={20} />
            </div>
            <p className="font-bold text-gray-700">No blocked students found</p>
            <p className="mt-1 text-xs text-gray-400">Blocked records will appear here after staff blocks an account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
