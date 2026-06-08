import { useEffect, useState } from "react";
import DebtStatCard from "../../components/cards/DebtStatCard";
import DebtTable from "../../components/tables/DebtTable";
import SearchBar from "../../components/common/SearchBar";
import { useApp } from "../../context/AppContext";
import axiosInstance from "../../api/axios";

export default function DebtPage() {
  const { user } = useApp();
  const [debts, setDebts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchFines = async () => {
      try {
        const res = await axiosInstance.get('/fines');
        // Lọc ra các khoản phạt đúng với tài khoản đăng nhập hiện tại
        const myFines = res.data.filter(
          (f: any) =>
            f.borrower_code === user?.borrowerCode ||
            f.borrower === user?.name ||
            f.borrower === user?.username
        );
        
        const mapped = myFines.map((item: any, idx: number) => ({
          id: `F${idx}`,
          equipment: item.item,
          dueDate: "Đã bị phạt tiền",
          daysLeft: -1, // Cố tình set âm để UI tự động đổi sang màu đỏ Overdue
          status: "OVERDUE",
          fineAmount: item.fine
        }));
        
        setDebts(mapped);
      } catch (error) {
        console.error("Lỗi fetch nợ:", error);
      }
    };
    if (user) fetchFines();
  }, [user]);

  const filteredDebts = debts.filter((item) => item.equipment.toLowerCase().includes(search.toLowerCase()));
  const totalBorrowed = debts.length;
  const overdueCount = debts.filter((item) => item.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Debt Tracking</h1>
        <p className="text-gray-500">Monitor fines and damaged items compensation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DebtStatCard title="Damaged/Lost Items" value={totalBorrowed} />
        <DebtStatCard title="Pending Fines (Unpaid)" value={overdueCount} />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search damaged equipment..." />
      <DebtTable debts={filteredDebts} />
    </div>
  );
}
