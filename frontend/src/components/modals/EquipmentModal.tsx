import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import type { Equipment } from "../../types/equipment";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedEquipment: Equipment | null; // Bổ sung prop này
}

export default function EquipmentModal({
  open,
  onClose,
  selectedEquipment,
}: Props) {
  // Tạo các state quản lý dữ liệu trong form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");

  // Mỗi khi selectedEquipment thay đổi (bấm Add hoặc Edit), cập nhật lại giá trị form
  useEffect(() => {
    if (selectedEquipment) {
      setName(selectedEquipment.name);
      setCategory(selectedEquipment.category);
      setQuantity(selectedEquipment.quantity);
    } else {
      // Nếu null (đang bấm Add), reset form về trống
      setName("");
      setCategory("");
      setQuantity("");
    }
  }, [selectedEquipment, open]);

  return (
    <Modal
      open={open}
      title={selectedEquipment ? "Edit Equipment" : "Add Equipment"} // Tự động đổi tiêu đề
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Equipment Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Equipment name"
            className="w-full border rounded-xl p-3 focus:outline-none focus:border-[#A5001A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-full border rounded-xl p-3 focus:outline-none focus:border-[#A5001A]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Quantity"
            className="w-full border rounded-xl p-3 focus:outline-none focus:border-[#A5001A]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition text-gray-700 font-medium"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              // Tạm thời alert test dữ liệu nhập vào form trước khi kết nối Spring Boot
              alert(`Saved: ${name} - ${category} - ${quantity}`);
              onClose();
            }}
            className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-4 py-2 rounded-xl font-medium transition"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}