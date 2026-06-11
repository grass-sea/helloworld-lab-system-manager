import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, UserPlus } from "lucide-react";
import SearchBar from "../../components/common/SearchBar";
import StudentTable from "../../components/tables/StudentTable";
import axiosInstance from "../../api/axios";

export default function StudentManagementPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [faculty, setFaculty] = useState("");
  const [major, setMajor] = useState("");
  const [className, setClassName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [studyStatus, setStudyStatus] = useState(""); // Lưu giá trị chuỗi trạng thái học tập
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "BLOCKED">("ACTIVE");
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [viewingStudent, setViewingStudent] = useState<any | null>(null);
  const [isConfirmAddModalOpen, setIsConfirmAddModalOpen] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await axiosInstance.get("/borrowers", {
        params: {
          search: search.trim() || undefined,
        },
      });
      setStudents(res.data.map((item: any) => ({
        id: String(item.id),
        studentCode: item.borrower_code,
        fullName: item.full_name,
        email: item.email || "N/A",
        phoneNumber: item.phone_number || item.phone || "",
        dateOfBirth: item.date_of_birth || "",
        faculty: item.faculty || "",
        major: item.major || "",
        className: item.class_name || "",
        academicYear: item.academic_year || "",
        studyStatus: item.study_status || "",
        borrowingCount: 0,
        status: item.status,
      })));
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const isValidVietnamesePhone = (value: string) => /^(03|05|07|08|09)\d{8}$/.test(value);

  const handleExecuteAdd = async () => {
    if (!isValidVietnamesePhone(phoneNumber)) {
      alert("Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.");
      return;
    }
    try {
      await axiosInstance.post("/auth/register", {
        username: studentCode,
        password,
        email,
        role: "BORROWER",
        student_id: studentCode,
        borrower_code: studentCode,
        full_name: fullName,
        borrower_type: "STUDENT",
        phone: phoneNumber,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth || null,
        faculty,
        major,
        class_name: className,
        academic_year: academicYear,
        study_status: studyStatus,
      });
      setStudentCode("");
      setFullName("");
      setEmail("");
      setPhoneNumber("");
      setDateOfBirth("");
      setFaculty("");
      setMajor("");
      setClassName("");
      setAcademicYear("");
      setStudyStatus("");
      setPassword("");
      setStatus("ACTIVE");
      setIsConfirmAddModalOpen(false);
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (error) {
      console.error("Failed to create student:", error);
      alert("Unable to create this student account.");
    }
  };

  const openEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentCode(student.studentCode);
    setFullName(student.fullName);
    setEmail(student.email === "N/A" ? "" : student.email);
    setPhoneNumber(student.phoneNumber || "");
    setDateOfBirth(student.dateOfBirth || "");
    setFaculty(student.faculty || "");
    setMajor(student.major || "");
    setClassName(student.className || "");
    setAcademicYear(student.academicYear || "");
    setStudyStatus(student.studyStatus || "");
    setStatus(student.status || "ACTIVE");
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    if (!isValidVietnamesePhone(phoneNumber)) {
      alert("Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.");
      return;
    }
    try {
      await axiosInstance.patch(`/borrowers/id/${editingStudent.id}`, {
        student_id: studentCode,
        borrower_code: studentCode,
        full_name: fullName,
        borrower_type: "STUDENT",
        email,
        phone: phoneNumber,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth || null,
        faculty,
        major,
        class_name: className,
        academic_year: academicYear,
        study_status: studyStatus,
        status,
      });
      setEditingStudent(null);
      setStudentCode("");
      setFullName("");
      setEmail("");
      setPhoneNumber("");
      setDateOfBirth("");
      setFaculty("");
      setMajor("");
      setClassName("");
      setAcademicYear("");
      setStudyStatus("");
      setStatus("ACTIVE");
      fetchStudents();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Unable to update student.");
    }
  };

  const executeToggleStatus = async (studentId: string, newStatus: string) => {
    try {
      await axiosInstance.patch(`/borrowers/${studentId}/status`, { status: newStatus });
      if (newStatus === "BLOCKED") {
        setStudents((current) => current.filter((student) => student.id !== studentId));
      } else {
        fetchStudents();
      }
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

  const inputStyle = "w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-[#A5001A] focus:ring-1 focus:ring-[#A5001A] transition-colors";
  const labelStyle = "block text-xs font-bold text-gray-400 uppercase mb-1";

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Student Management</h1>
        <p className="text-gray-500">Monitor student borrowing activity</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search student name..." /></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate("/staff/students/blocked")} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl">
            <ShieldAlert size={16} /><span>Blocked Students</span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#A5001A] hover:bg-[#850012] text-white font-bold text-sm rounded-xl">
            <UserPlus size={16} /><span>Add Student</span>
          </button>
        </div>
      </div>

      <StudentTable
        students={students}
        onToggleStatus={handleActionClick}
        onEdit={openEditStudent}
        onView={(student) => navigate(`/staff/students/${student.studentCode}`)}
      />

      {/* MODAL THÊM MỚI SINH VIÊN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full relative z-10 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">Create Student Account</h3>
            <form onSubmit={(event) => {
              event.preventDefault();
              setIsConfirmAddModalOpen(true);
            }} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Student code *</label>
                  <input type="text" required placeholder="e.g. 202417047" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Full name *</label>
                  <input type="text" required placeholder="e.g. Phạm Trọng Toàn" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Email *</label>
                  <input type="email" required placeholder="e.g. name@sis.hust.edu.vn" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Phone number *</label>
                  <input type="tel" required placeholder="03/05/07/08/09xxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Date of birth *</label>
                  <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Faculty</label>
                  <input type="text" placeholder="e.g. School of Electrical Engineering" value={faculty} onChange={(e) => setFaculty(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Major</label>
                  <input type="text" placeholder="e.g. Control Engineering & Automation" value={major} onChange={(e) => setMajor(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Class name</label>
                  <input type="text" placeholder="e.g. Automation 01-K65" value={className} onChange={(e) => setClassName(e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Academic year</label>
                  <input type="text" placeholder="e.g. 2020-2025" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputStyle} />
                </div>
                
                {/* THAY ĐỔI TẠI ĐÂY: Chuyển trường nhập text thành Select dropdown cho trạng thái học tập */}
                <div>
                  <label className={labelStyle}>Study status</label>
                  <select value={studyStatus} onChange={(e) => setStudyStatus(e.target.value)} className={`${inputStyle} bg-white`}>
                    <option value="">-- Select Status --</option>
                    <option value="Đang học">Đang học</option>
                    <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                    <option value="Thôi học">Thôi học</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelStyle}>Password *</label>
                  <input type="password" required placeholder="Enter account password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-[#A5001A] text-white font-bold rounded-xl text-sm hover:bg-[#850012] transition-colors shadow-sm">
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsConfirmAddModalOpen(false)}></div>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative z-10 shadow-xl">
            <h3 className="text-lg font-black text-gray-900 mb-4">Verify Account</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to create this student account with the provided details?</p>
            <div className="flex gap-2">
              <button onClick={() => setIsConfirmAddModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Back</button>
              <button onClick={handleExecuteAdd} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700">Save & Create</button>
            </div>
          </div>
        </div>
      )}

      {isBlockModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsBlockModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl relative z-10 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-black text-gray-900 mb-2">Confirm Block</h3>
            <p className="text-sm text-gray-500 mb-5">Do you really want to block student <span className="font-bold text-gray-800">{selectedStudent.fullName}</span>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsBlockModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Cancel</button>
              <button onClick={() => {
                executeToggleStatus(selectedStudent.id, "BLOCKED");
                setIsBlockModalOpen(false);
                setSelectedStudent(null);
              }} className="px-4 py-2 bg-[#A5001A] text-white font-bold rounded-xl text-sm hover:bg-[#850012]">Yes, Block Student</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA THÔNG TIN */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingStudent(null)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full relative z-10 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">Edit Student Profile</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Student code</label>
                <input type="text" required placeholder="Student code" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Full name</label>
                <input type="text" required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Email</label>
                <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Phone number</label>
                <input type="tel" required placeholder="Phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Date of birth</label>
                <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Faculty</label>
                <input type="text" placeholder="Faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Major</label>
                <input type="text" placeholder="Major" value={major} onChange={(e) => setMajor(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Class name</label>
                <input type="text" placeholder="Class name" value={className} onChange={(e) => setClassName(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Academic year</label>
                <input type="text" placeholder="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputStyle} />
              </div>
              
              {/* THAY ĐỔI TẠI ĐÂY: Chuyển trường nhập text thành Select dropdown cho trạng thái học tập */}
              <div>
                <label className={labelStyle}>Study status</label>
                <select value={studyStatus} onChange={(e) => setStudyStatus(e.target.value)} className={`${inputStyle} bg-white`}>
                  <option value="">-- Select Status --</option>
                  <option value="Đang học">Đang học</option>
                  <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                  <option value="Thôi học">Thôi học</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelStyle}>Account Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "BLOCKED")} className={`${inputStyle} bg-white`}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setEditingStudent(null)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdateStudent} className="px-5 py-2 bg-[#A5001A] text-white font-bold rounded-xl text-sm hover:bg-[#850012] transition-colors shadow-sm">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingStudent(null)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full mx-4 relative z-10 p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4 pb-2 border-b">Student Profile</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Full name</span> <span className="text-gray-800 font-semibold">{viewingStudent.fullName}</span></p>
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Student ID</span> <span className="font-mono text-gray-800">{viewingStudent.studentCode}</span></p>
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Email</span> <span className="text-gray-800">{viewingStudent.email}</span></p>
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Phone number</span> <span className="text-gray-800">{viewingStudent.phoneNumber || "N/A"}</span></p>
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Date of birth</span> <span className="text-gray-800">{viewingStudent.dateOfBirth || "N/A"}</span></p>
              <p><span className="font-bold text-gray-400 uppercase text-xs block mb-0.5">Status</span> <span className="text-gray-800">{viewingStudent.status}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
