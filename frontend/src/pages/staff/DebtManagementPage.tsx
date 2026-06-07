// src/pages/staff/DebtManagementPage.tsx
import { useState, useEffect } from "react";
import axiosInstance from "../../api/axios";
import SearchBar from "../../components/common/SearchBar";
import Modal from "../../components/common/Modal";

export default function DebtManagementPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // States cho Form thêm Phạt
  const [borrowerName, setBorrowerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [reason, setReason] = useState("");

  const fetchFines = async () => {
    try {
      const res = await axiosInstance.get('/fines');
      setFines(res.data);
    } catch (error) {
      console.error("Lỗi fetch danh sách phạt:", error);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const handleAddFine = async () => {
    if (!borrowerName || !itemName || fineAmount <= 0) return alert("Vui lòng điền đủ thông tin!");
    
    try {
      await axiosInstance.post('/fines', {
        borrower: borrowerName,
        item: itemName,
        fine: fineAmount,
        reason: reason || "Hỏng/Mất thiết bị"
      });
      setIsModalOpen(false);
      setBorrowerName(""); setItemName(""); setFineAmount(0); setReason("");
      fetchFines();
    } catch (error) {
      console.error("Lỗi thêm phạt:", error);
      alert("Không thể tạo khoản phạt!");
    }
  };

  const handleClearFine = async (fineId: number) => {
    const confirmClear = window.confirm("Xác nhận sinh viên đã thanh toán khoản phạt này?");
    if (!confirmClear) return;

    try {
      // Gọi API xóa hoặc cập nhật trạng thái khoản phạt
      await axiosInstance.delete(`/fines/${fineId}`);
      fetchFines();
    } catch (error) {
      console.error("Lỗi xóa phạt:", error);
    }
  };

  const filteredFines = fines.filter((f) => 
    f.borrower.toLowerCase().includes(search.toLowerCase()) || 
    f.item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Fines Management</h1>
          <p className="text-gray-500">Manage student debts and damaged item compensation</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          Add New Fine
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by student or item name..." />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Fine Amount</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Reason</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFines.map((fine: any) => (
              <tr key={fine.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-900">{fine.borrower}</td>
                <td className="p-4 text-sm text-gray-600 font-medium">{fine.item}</td>
                <td className="p-4 font-bold text-rose-600">${fine.fine}</td>
                <td className="p-4 text-sm text-gray-500">{fine.reason || "Damaged/Lost"}</td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => handleClearFine(fine.id)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                  >
                    Mark as Paid
                  </button>
                </td>
              </tr>
            ))}
            {filteredFines.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No active fines found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={isModalOpen} title="Issue New Fine" onClose={() => setIsModalOpen(false)}>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Student Username/Code</label>
            <input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" placeholder="VD: 20221234" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Item Name</label>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" placeholder="VD: Oscilloscope" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fine Amount ($)</label>
            <input type="number" value={fineAmount} onChange={(e) => setFineAmount(Number(e.target.value))} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" placeholder="Lý do phạt..." />
          </div>
          <button onClick={handleAddFine} className="w-full py-3 bg-[#A5001A] text-white font-bold rounded-xl mt-2">Submit Fine</button>
        </div>
      </Modal>
    </div>
  );
}