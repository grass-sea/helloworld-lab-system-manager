// src/pages/staff/StudentManagementPage.tsx
import { useState, useEffect } from "react";
import SearchBar from "../../components/common/SearchBar";
import StudentTable from "../../components/tables/StudentTable";
import { UserPlus} from "lucide-react";
import axiosInstance from "../../api/axios";

export default function StudentManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isConfirmAddModalOpen, setIsConfirmAddModalOpen] = useState(false);

  // KẾT NỐI API: Fetch danh sách sinh viên
  const fetchStudents = async () => {
    try {
      const res = await axiosInstance.get('/borrowers');
      const mapped = res.data.map((item: any) => ({
        id: item.id,
        studentCode: item.borrower_code,
        fullName: item.full_name,
        email: item.email || "N/A",
        borrowingCount: 0,
        status: item.status
      }));
      setStudents(mapped);
    } catch (error) {
      console.error("Lỗi fetch students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleFormSubmitPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmAddModalOpen(true);
  };

  // KẾT NỐI API: Tạo tài khoản sinh viên
  const handleExecuteUpdate = async () => {
    try {
      await axiosInstance.post('/auth/register', {
        username: studentCode,
        password: password,
        email: email,
        role: "BORROWER",
        borrower_code: studentCode,
        full_name: fullName,
        borrower_type: "STUDENT"
      });

      // Tạo profile borrower
      await axiosInstance.post('/borrowers', {
        borrower_code: studentCode,
        full_name: fullName,
        borrower_type: "STUDENT",
        email: email,
        status: "ACTIVE"
      });

      setStudentCode("");
      setFullName("");
      setEmail("");
      setPassword("");
      setIsConfirmAddModalOpen(false);
      setIsAddModalOpen(false);
      fetchStudents(); // Cập nhật lại UI
    } catch (error) {
      console.error("Lỗi tạo sinh viên:", error);
      alert("Lỗi: Mã sinh viên hoặc email đã tồn tại!");
    }
  };

  const handleActionClick = (student: any) => {
    if (student.status === "ACTIVE") {
      setSelectedStudent(student);
      setIsModalOpen(true);
    } else {
      executeToggleStatus(student.id, "ACTIVE"); // Chuyển từ Blocked sang Active
    }
  };

  // KẾT NỐI API: Đổi trạng thái (Block/Unblock)
  const executeToggleStatus = async (studentId: string, newStatus: string) => {
    try {
      await axiosInstance.put(`/borrowers/${studentId}`, {
        status: newStatus
      });
      fetchStudents();
    } catch (error) {
      console.error("Lỗi đổi trạng thái:", error);
    }
  };

  const handleConfirmBlock = () => {
    if (selectedStudent) {
      executeToggleStatus(selectedStudent.id, "BLOCKED");
    }
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Student Management</h1>
        <p className="text-gray-500">Monitor student borrowing activity</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search student name..." /></div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#A5001A] hover:bg-[#850012] text-white font-bold text-sm rounded-xl">
          <UserPlus size={16} /><span>Add Student</span>
        </button>
      </div>

      <StudentTable students={filteredStudents} onToggleStatus={handleActionClick} />

      {/* Modal 1: Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full mx-4 relative z-10 p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">Create Student Account</h3>
            <form onSubmit={handleFormSubmitPreview} className="space-y-4">
              <input type="text" required placeholder="MSSV (e.g., 20221234)" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="text" required placeholder="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="email" required placeholder="Email SIS" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border p-2.5 rounded-xl" />
              <button type="submit" className="w-full py-2.5 bg-[#A5001A] text-white font-bold rounded-xl mt-4">Continue</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm */}
      {isConfirmAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsConfirmAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative z-10">
             <h3 className="text-lg font-black text-gray-900 mb-4">Verify Account</h3>
             <button onClick={handleExecuteUpdate} className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl">Save & Create</button>
          </div>
        </div>
      )}

      {/* Modal 3: Block */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl relative z-10">
            <h3 className="text-xl font-bold mb-4">Confirm Block</h3>
            <button onClick={handleConfirmBlock} className="bg-[#A5001A] text-white px-4 py-2 rounded-xl">Yes, Block Student</button>
          </div>
        </div>
      )}
    </div>
  );
}