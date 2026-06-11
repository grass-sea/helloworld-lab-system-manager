import { useEffect, useState } from "react";
import SearchBar from "../../components/common/SearchBar";
import StaffEquipmentTable from "../../components/tables/StaffEquipmentTable";
import Modal from "../../components/common/Modal";
import axiosInstance from "../../api/axios";
import { formatVndInput, parseVndInput } from "../../utils/currency";

export default function EquipmentManagementPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [equipmentId, setEquipmentId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [quantity, setQuantity] = useState(1);
  const [supplier, setSupplier] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [purchasePriceText, setPurchasePriceText] = useState("");
  const [unit, setUnit] = useState("piece");
  const [requiresReturn, setRequiresReturn] = useState(true);

  const fetchEquipment = async () => {
    try {
      const res = await axiosInstance.get("/items");
      const mappedData = res.data.map((item: any) => ({
        id: item.code,
        db_id: item.id,
        equipmentId: item.equipment_id,
        name: item.name,
        category: item.category,
        quantity: item.available_quantity ?? item.total_quantity ?? 0,
        totalQuantity: item.total_quantity ?? 0,
        availableQuantity: item.available_quantity ?? 0,
        supplier: item.supplier,
        unit: item.unit,
        documentationUrl: item.documentation_url,
        purchasePrice: item.purchase_price,
        requiresReturn: item.requires_return,
        status: (item.available_quantity ?? 0) > 0 ? "AVAILABLE" : "OUT_OF_STOCK",
      }));
      setEquipment(mappedData);
    } catch (error: any) {
      console.error("Failed to fetch equipment:", error);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    if (selectedEquipment) {
      setEquipmentId(selectedEquipment.equipmentId || selectedEquipment.id);
      setName(selectedEquipment.name);
      setCategory(selectedEquipment.category);
      setQuantity(selectedEquipment.quantity);
      setSupplier(selectedEquipment.supplier || "");
      setDocumentationUrl(selectedEquipment.documentationUrl || "");
      setPurchasePriceText(formatVndInput(selectedEquipment.purchasePrice || 0));
      setUnit(selectedEquipment.unit || "piece");
      setRequiresReturn(selectedEquipment.requiresReturn ?? true);
      return;
    }

    setEquipmentId("");
    setName("");
    setCategory("General");
    setQuantity(1);
    setSupplier("");
    setDocumentationUrl("");
    setPurchasePriceText("");
    setUnit("piece");
    setRequiresReturn(true);
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

  const getOrCreateSupplierId = async () => {
    if (!supplier.trim()) return null;
    const suppliersRes = await axiosInstance.get("/suppliers");
    const existing = suppliersRes.data.find(
      (item: any) => item.supplier_name.toLowerCase() === supplier.trim().toLowerCase()
    );
    if (existing) return existing.id;
    const created = await axiosInstance.post("/suppliers", {
      supplier_name: supplier.trim(),
      contact_name: "",
      phone: "",
      email: "",
      address: "",
    });
    return created.data.id;
  };

  const handleSaveEquipment = async () => {
    if (!name.trim() || !equipmentId.trim() || !supplier.trim() || !unit.trim() || quantity < 0) return;

    try {
      const categoryId = await getOrCreateCategoryId();
      const supplierId = await getOrCreateSupplierId();
      const payload = {
        equipment_id: equipmentId.trim(),
        item_code: selectedEquipment?.id || equipmentId.trim(),
        item_name: name.trim(),
        category_id: categoryId,
        supplier_id: supplierId,
        unit: unit.trim(),
        minimum_quantity: 0,
        documentation_url: documentationUrl.trim() || null,
        purchase_price: parseVndInput(purchasePriceText),
        rental_price: 0,
        requires_return: requiresReturn,
        total_quantity: quantity,
      };

      if (selectedEquipment) {
        await axiosInstance.put(`/items/${selectedEquipment.db_id}`, payload);
      } else {
        await axiosInstance.post("/items", payload);
      }

      handleCloseModal();
      fetchEquipment();
    } catch (error: any) {
      console.error("Failed to save equipment:", error);
      alert(error.response?.data?.detail || "Unable to save equipment. Please check the equipment ID and fields.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Equipment ID</label>
            <input value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} placeholder="EQ-LAB-001" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
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
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="piece, set, box, device" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Supplier</label>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Documentation URL</label>
            <input value={documentationUrl} onChange={(e) => setDocumentationUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#A5001A]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Purchase Price (VND)</label>
            <div className="relative">
              <input inputMode="numeric" value={purchasePriceText} onChange={(e) => setPurchasePriceText(formatVndInput(e.target.value))} placeholder="1.000.000" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-[#A5001A]" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₫</span>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 md:col-span-2">
            <input type="checkbox" checked={requiresReturn} onChange={(e) => setRequiresReturn(e.target.checked)} className="h-4 w-4 accent-[#A5001A]" />
            Requires return after borrowing
          </label>
          <div className="flex justify-end gap-3 pt-2 md:col-span-2">
            <button onClick={handleCloseModal} className="px-4 py-2 border rounded-xl hover:bg-gray-50 transition text-gray-700 font-medium">Cancel</button>
            <button onClick={handleSaveEquipment} className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-4 py-2 rounded-xl font-medium transition">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
