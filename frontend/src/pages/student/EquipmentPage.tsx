import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import EquipmentTable from "../../components/tables/EquipmentTable";
import SearchBar from "../../components/common/SearchBar";
import EquipmentStatCard from "../../components/cards/EquipmentStatCard";
import Modal from "../../components/common/Modal";
import axiosInstance from "../../api/axios";
import { useI18n } from "../../context/I18nContext";

export default function EquipmentPage() {
  const { user } = useApp();
  const { t } = useI18n();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [borrowError, setBorrowError] = useState("");

  const fetchEquipment = async () => {
    try {
      const res = await axiosInstance.get("/items");
      setEquipment(res.data.map((item: any) => ({
        id: item.code,
        db_id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.available_quantity ?? 0,
        totalQuantity: item.total_quantity ?? 0,
        availableQuantity: item.available_quantity ?? 0,
        supplier: item.supplier,
        unit: item.unit,
        documentationUrl: item.documentation_url,
        purchasePrice: item.purchase_price,
        rentalPrice: item.rental_price,
        requiresReturn: item.requires_return,
        status: (item.available_quantity ?? 0) > 0 ? "AVAILABLE" : "OUT_OF_STOCK",
      })));
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const categories = ["ALL", ...new Set(equipment.map((item) => item.category))];
  const filteredEquipment = equipment.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "ALL" || item.category === category;
    return matchSearch && matchCategory;
  });

  const handleConfirmBorrow = async () => {
    if (!selectedEquipment || !user?.borrowerCode) return;
    const available = selectedEquipment.availableQuantity ?? selectedEquipment.quantity ?? 0;
    if (borrowQuantity < 1) {
      setBorrowError(t("quantityMin"));
      return;
    }
    if (borrowQuantity > available) {
      setBorrowError(`${t("quantityExceeds")} ${available}`);
      return;
    }

    try {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 5);
      const borrowerRes = await axiosInstance.get(`/borrowers/${user.borrowerCode}`);
      const reqRes = await axiosInstance.post("/borrow-requests", {
        borrower_id: borrowerRes.data.id,
        expected_return_date: dueDate.toISOString().split("T")[0],
        note: "Online borrower portal request",
      });

      await axiosInstance.post("/borrow-request-items", {
        request_id: reqRes.data.request_id,
        item_id: selectedEquipment.db_id,
        quantity: borrowQuantity,
      });

      alert(t("borrowRequestSent"));
      setSelectedEquipment(null);
      setBorrowQuantity(1);
      setBorrowError("");
      fetchEquipment();
    } catch (error: any) {
      alert(error.response?.data?.detail || error.response?.data?.message || t("borrowRequestFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">{t("equipmentInventory")}</h1>
        <p className="text-gray-500">{t("browseEquipment")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <EquipmentStatCard title={t("totalItems")} value={equipment.length} type="total" />
        <EquipmentStatCard title={t("available")} value={equipment.filter((e) => e.status === "AVAILABLE").length} type="available" />
        <EquipmentStatCard title={t("inUse")} value={0} type="in_use" />
        <EquipmentStatCard title={t("outOfStock")} value={equipment.filter((e) => e.status === "OUT_OF_STOCK").length} type="out_of_stock" />
      </div>

      <div className="flex gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchEquipment")} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
          {categories.map((cat) => <option key={cat} value={cat as string}>{cat as string}</option>)}
        </select>
      </div>

      <EquipmentTable equipment={filteredEquipment} onBorrow={(item) => {
        setSelectedEquipment(item);
        setBorrowQuantity(1);
        setBorrowError("");
      }} />

      <Modal open={selectedEquipment !== null} title={t("borrowEquipment")} onClose={() => setSelectedEquipment(null)}>
        <div className="space-y-4">
          <div><p className="text-sm text-gray-500">{t("equipment")}</p><p className="font-semibold">{selectedEquipment?.name}</p></div>
          <div><p className="text-sm text-gray-500">{t("category")}</p><p className="font-semibold">{selectedEquipment?.category}</p></div>
          <div><p className="text-sm text-gray-500">{t("supplier")}</p><p className="font-semibold">{selectedEquipment?.supplier || "N/A"}</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-sm text-gray-500">{t("availableStock")}</p><p className="font-semibold">{selectedEquipment?.availableQuantity ?? 0}</p></div>
            <div><p className="text-sm text-gray-500">{t("purchasePrice")}</p><p className="font-semibold">${selectedEquipment?.purchasePrice ?? 0}</p></div>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("requiresReturn")}</p>
            <p className="font-semibold">{selectedEquipment?.requiresReturn ? t("yes") : t("no")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t("documentation")}</p>
            {selectedEquipment?.documentationUrl ? <a className="text-sm font-semibold text-[#A5001A]" href={selectedEquipment.documentationUrl} target="_blank" rel="noreferrer">{t("open")}</a> : <p className="font-semibold">N/A</p>}
          </div>
          <label className="block">
            <span className="text-sm text-gray-500">{t("quantity")}</span>
            <input type="number" min={1} max={selectedEquipment?.availableQuantity ?? 1} value={borrowQuantity} onChange={(event) => {
              setBorrowQuantity(Number(event.target.value));
              setBorrowError("");
            }} className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#A5001A] focus:outline-none" />
          </label>
          {borrowError && <p className="text-sm font-semibold text-rose-600">{borrowError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={handleConfirmBorrow} className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-4 py-2 rounded-xl text-sm font-medium">{t("confirmBorrow")}</button>
            <button onClick={() => setSelectedEquipment(null)} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-sm font-medium text-gray-700">{t("cancel")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
