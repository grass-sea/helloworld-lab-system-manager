import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import EquipmentTable from "../../components/tables/EquipmentTable";
import SearchBar from "../../components/common/SearchBar";
import EquipmentStatCard from "../../components/cards/EquipmentStatCard";
import Modal from "../../components/common/Modal";
import axiosInstance from "../../api/axios";

export default function EquipmentPage() {
  const { user } = useApp();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);

  const fetchEquipment = async () => {
    try {
      const res = await axiosInstance.get('/items');
      const mapped = res.data.map((item: any) => ({
        id: item.code,
        db_id: item.id,
        name: item.name,
        category: item.category,
        quantity: 1, // Fix số lượng khả dụng ở Front
        status: "AVAILABLE"
      }));
      setEquipment(mapped);
    } catch (error) {
      console.error("Lỗi fetch thiết bị:", error);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const categories = ["ALL", ...new Set(equipment.map((item) => item.category))];

  const filteredEquipment = equipment.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "ALL" ? true : item.category === category;
    return matchSearch && matchCategory;
  });

  const totalEquipment = equipment.length;
  const availableCount = equipment.filter((e) => e.status === "AVAILABLE").length;

  const handleConfirmBorrow = async () => {
    if (!selectedEquipment || !user?.borrowerCode) return;
    try {
      // Set cứng ngày trả đồ là 7 ngày sau
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      const returnDate = tomorrow.toISOString().split('T')[0];

      // 1. Lấy ID của Sinh viên
      const borrowerRes = await axiosInstance.get(`/borrowers/${user.borrowerCode}`);
      const borrowerId = borrowerRes.data.id;

      // 2. Gọi API tạo phiếu mượn
      const reqRes = await axiosInstance.post('/borrow-requests', {
        borrower_id: borrowerId,
        expected_return_date: returnDate,
        note: "Mượn trực tuyến từ cổng hệ thống"
      });

      // 3. Đẩy đồ vào phiếu mượn
      await axiosInstance.post('/borrow-request-items', {
        request_id: reqRes.data.request_id,
        item_id: selectedEquipment.db_id,
        quantity: 1
      });

      alert(`Yêu cầu mượn ${selectedEquipment.name} đã được gửi thành công!`);
      setSelectedEquipment(null);
    } catch (error: any) {
      console.error("Lỗi tạo phiếu:", error);
      alert(error.response?.data?.message || "Lỗi tạo phiếu mượn. Tài khoản của bạn có thể đang bị khóa!");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Equipment Inventory</h1>
        <p className="text-gray-500">Browse laboratory equipment</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <EquipmentStatCard title="Total Items" value={totalEquipment} type="total" />
        <EquipmentStatCard title="Available" value={availableCount} type="available" />
        <EquipmentStatCard title="In Use" value={0} type="in_use" />
        <EquipmentStatCard title="Out of Stock" value={0} type="out_of_stock" />
      </div>

      <div className="flex gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search equipment..." />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
          {categories.map((cat) => (<option key={cat} value={cat as string}>{cat as string}</option>))}
        </select>
      </div>

      <EquipmentTable equipment={filteredEquipment} onBorrow={(item) => setSelectedEquipment(item)} />

      <Modal open={selectedEquipment !== null} title="Borrow Equipment" onClose={() => setSelectedEquipment(null)}>
        <div className="space-y-4">
          <div><p className="text-sm text-gray-500">Equipment</p><p className="font-semibold">{selectedEquipment?.name}</p></div>
          <div><p className="text-sm text-gray-500">Category</p><p className="font-semibold">{selectedEquipment?.category}</p></div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={handleConfirmBorrow} className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-4 py-2 rounded-xl text-sm font-medium">Confirm Borrow</button>
            <button onClick={() => setSelectedEquipment(null)} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-sm font-medium text-gray-700">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
