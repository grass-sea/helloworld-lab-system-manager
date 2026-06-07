import { useEffect, useState } from "react";
import type { Equipment } from "../../types/equipment";
import { staffEquipmentMock } from "../../mock/staffEquipment";
import SearchBar from "../../components/common/SearchBar";
import StaffEquipmentTable from "../../components/tables/StaffEquipmentTable";
import EquipmentModal from "../../components/modals/EquipmentModal";

export default function StaffEquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  
  // State lưu trữ thiết bị đang được chọn để Sửa (nếu null nghĩa là đang Thêm Mới)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    setEquipment(staffEquipmentMock);
  }, []);

  // Bộ lọc tìm kiếm thiết bị
  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Hàm xử lý đóng Modal và xóa trạng thái thiết bị đang chọn
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedEquipment(null); 
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            Equipment Management
          </h1>
          <p className="text-gray-500">
            Manage laboratory assets
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedEquipment(null); // Đảm bảo mở modal ở chế độ "Thêm mới"
            setOpenModal(true);
          }}
          className="
          bg-[#A5001A]
          hover:bg-[#8d0016]
          text-white
          px-4
          py-2
          rounded-xl
          font-semibold
          transition-colors
          "
        >
          Add Equipment
        </button>
      </div>

      {/* Thanh tìm kiếm */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search equipment..."
      />

      {/* Bảng quản lý - Đã truyền đầy đủ props onEdit và onDelete */}
      <StaffEquipmentTable
        equipment={filteredEquipment}
        onEdit={(item) => {
          setSelectedEquipment(item); // Lưu thiết bị cần sửa vào state
          setOpenModal(true);         // Mở modal lên để sửa
        }}
        onDelete={(item) => {
          // Tạm thời alert kiểm tra logic theo yêu cầu của dev
          alert(`Delete ${item.name}`);
        }}
      />

      {/* Modal dùng chung cho cả Thêm và Sửa */}
      <EquipmentModal
        open={openModal}
        onClose={handleCloseModal}
        selectedEquipment={selectedEquipment} // <-- Thêm dòng này vào đây
      />
    </div>
  );
}