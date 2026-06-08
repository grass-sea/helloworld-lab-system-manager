import { useEffect, useState } from "react";
import SearchBar from "../../components/common/SearchBar";
import StaffEquipmentTable from "../../components/tables/StaffEquipmentTable";
import Modal from "../../components/common/Modal";
import axiosInstance from "../../api/axios";

export default function EquipmentManagementPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);

  const fetchEquipment = async () => {
    try {
      const res = await axiosInstance.get("/items");
      const mappedData = res.data.map((item: any) => ({
        id: item.code,
        db_id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.available_quantity ?? item.total_quantity ?? 0,
        status: (item.available_quantity ?? 0) > 0 ? "AVAILABLE" : "OUT_OF_STOCK",
      }));
      setEquipment(mappedData);
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    if (selectedEquipment) {
      setName(selectedEquipment.name);
      setCategory(selectedEquipment.category);
      setQuantity(selectedEquipment.quantity);
      return;
    }

    setName("");
    setCategory("");
    setQuantity(1);
  }, [selectedEquipment]);

  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedEquipment(null);
  };

  const getOrCreateCategoryId = async () => {
    const categoriesRes = await axiosInstance.get("/categories");
    const existing = categoriesRes.data.find(
      (item: any) => item.name.toLowerCase() === category.trim().toLowerCase()
    );

    if (existing) return existing.id;

    const created = await axiosInstance.post("/categories", {
      name: category.trim(),
      description: "",
    });
    return created.data.id;
  };

  const handleSaveEquipment = async () => {
    if (!name.trim() || !category.trim() || quantity < 0) return;

    try {
      const categoryId = await getOrCreateCategoryId();
      const payload = {
        item_code: selectedEquipment?.id || `EQ_${Date.now()}`,
        item_name: name.trim(),
        category_id: categoryId,
        unit: "piece",
        minimum_quantity: 0,
        total_quantity: quantity,
      };

      if (selectedEquipment) {
        await axiosInstance.put(`/items/${selectedEquipment.db_id}`, payload);
      } else {
        await axiosInstance.post("/items", payload);
      }

      handleCloseModal();
      fetchEquipment();
    } catch (error) {
      console.error("Failed to save equipment:", error);
      alert("Unable to save equipment. Please check the category and item code.");
    }
  };

  const handleDeleteEquipment = async (item: any) => {
    const confirmDelete = window.confirm(`Delete equipment ${item.name}?`);
    if (!confirmDelete) return;

    try {
      await axiosInstance.delete(`/items/${item.db_id}`);
      fetchEquipment();
    } catch (error) {
      console.error("Failed to delete equipment:", error);
      alert("Unable to delete this equipment because it may be referenced by existing records.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Equipment Management</h1>
          <p className="text-gray-500">Manage laboratory assets</p>
        </div>
        <button
          onClick={() => {
            setSelectedEquipment(null);
            setOpenModal(true);
          }}
          className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-5 py-3 rounded-xl font-semibold transition-colors shadow-sm"
        >
          Add Equipment
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search equipment..." />

      <StaffEquipmentTable
        equipment={filteredEquipment}
        onEdit={(item) => {
          setSelectedEquipment(item);
          setOpenModal(true);
        }}
        onDelete={handleDeleteEquipment}
      />

      <Modal open={openModal} title={selectedEquipment ? "Edit Equipment" : "Add Equipment"} onClose={handleCloseModal}>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Equipment Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Equipment Name" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label>
            <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleCloseModal} className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition text-gray-700 font-medium">Cancel</button>
            <button onClick={handleSaveEquipment} className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-4 py-2 rounded-xl font-medium transition">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
