import { useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import SearchBar from "../../components/common/SearchBar";
import StudentTable from "../../components/tables/StudentTable";
import axiosInstance from "../../api/axios";

export default function StudentManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isConfirmAddModalOpen, setIsConfirmAddModalOpen] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await axiosInstance.get("/borrowers");
      setStudents(res.data.map((item: any) => ({
        id: String(item.id),
        studentCode: item.borrower_code,
        fullName: item.full_name,
        email: item.email || "N/A",
        borrowingCount: 0,
        status: item.status,
      })));
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(search.toLowerCase()) ||
    student.studentCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleExecuteAdd = async () => {
    try {
      await axiosInstance.post("/auth/register", {
        username: studentCode,
        password,
        email,
        role: "BORROWER",
        borrower_code: studentCode,
        full_name: fullName,
        borrower_type: "STUDENT",
      });
      setStudentCode("");
      setFullName("");
      setEmail("");
      setPassword("");
      setIsConfirmAddModalOpen(false);
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (error) {
      console.error("Failed to create student:", error);
      alert("Unable to create this student account.");
    }
  };

  const executeToggleStatus = async (studentId: string, newStatus: string) => {
    try {
      await axiosInstance.patch(`/borrowers/${studentId}/status`, { status: newStatus });
      fetchStudents();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleActionClick = (student: any) => {
    if (student.status === "ACTIVE") {
      setSelectedStudent(student);
      setIsBlockModalOpen(true);
      return;
    }
    if (student.status === "BLOCKED") {
      executeToggleStatus(student.id, "ACTIVE");
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    setSelectedIds((current) => checked ? [...current, studentId] : current.filter((id) => id !== studentId));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected student(s)? They will be soft-deleted.`);
    if (!confirmed) return;
    await Promise.all(selectedIds.map((id) => axiosInstance.delete(`/borrowers/${id}`)));
    setSelectedIds([]);
    setSelectionMode(false);
    fetchStudents();
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Student Management</h1>
        <p className="text-gray-500">Monitor student borrowing activity</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search student name..." /></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            setSelectionMode((value) => !value);
            setSelectedIds([]);
          }} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-sm rounded-xl">
            <Trash2 size={16} /><span>Delete</span>
          </button>
          {selectionMode && (
            <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-5 py-2.5 bg-rose-600 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-rose-700 text-white font-bold text-sm rounded-xl">
              Confirm Delete ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#A5001A] hover:bg-[#850012] text-white font-bold text-sm rounded-xl">
            <UserPlus size={16} /><span>Add Student</span>
          </button>
        </div>
      </div>

      <StudentTable students={filteredStudents} onToggleStatus={handleActionClick} selectionMode={selectionMode} selectedIds={selectedIds} onSelect={handleSelectStudent} />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full mx-4 relative z-10 p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">Create Student Account</h3>
            <form onSubmit={(event) => {
              event.preventDefault();
              setIsConfirmAddModalOpen(true);
            }} className="space-y-4">
              <input type="text" required placeholder="Student code" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="text" required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <button type="submit" className="w-full py-2.5 bg-[#A5001A] text-white font-bold rounded-xl mt-4">Continue</button>
            </form>
          </div>
        </div>
      )}

      {isConfirmAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsConfirmAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative z-10">
            <h3 className="text-lg font-black text-gray-900 mb-4">Verify Account</h3>
            <button onClick={handleExecuteAdd} className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl">Save & Create</button>
          </div>
        </div>
      )}

      {isBlockModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsBlockModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl relative z-10">
            <h3 className="text-xl font-bold mb-4">Confirm Block</h3>
            <button onClick={() => {
              executeToggleStatus(selectedStudent.id, "BLOCKED");
              setIsBlockModalOpen(false);
              setSelectedStudent(null);
            }} className="bg-[#A5001A] text-white px-4 py-2 rounded-xl">Yes, Block Student</button>
          </div>
        </div>
      )}
    </div>
  );
}
