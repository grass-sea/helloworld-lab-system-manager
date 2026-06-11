import { useEffect, useState } from "react";
import DebtStatCard from "../../components/cards/DebtStatCard";
import DebtTable from "../../components/tables/DebtTable";
import SearchBar from "../../components/common/SearchBar";
import { useApp } from "../../context/AppContext";
import axiosInstance from "../../api/axios";
import { formatVnd } from "../../utils/currency";

export default function DebtPage() {
  const { user } = useApp();
  const [debts, setDebts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPaymentRequests = async () => {
      try {
        const res = await axiosInstance.get('/payment-requests');
        const myPaymentRequests = res.data.filter(
          (f: any) =>
            f.borrower_code === user?.borrowerCode ||
            f.borrower === user?.name ||
            f.borrower === user?.username
        );
        
        const mapped = myPaymentRequests.map((item: any, idx: number) => ({
          id: `PR${idx}`,
          equipment: item.item,
          dueDate: "Chưa thanh toán",
          daysLeft: -1, // Cố tình set âm để UI tự động đổi sang màu đỏ Overdue
          status: "OVERDUE",
          amount: item.amount,
          amountDisplay: formatVnd(item.amount),
        }));
        
        setDebts(mapped);
      } catch (error) {
        console.error("Lỗi tải công nợ:", error);
      }
    };
    if (user) fetchPaymentRequests();
  }, [user]);

  const filteredDebts = debts.filter((item) => item.equipment.toLowerCase().includes(search.toLowerCase()));
  const totalBorrowed = debts.length;
  const overdueCount = debts.filter((item) => item.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Theo dõi công nợ</h1>
        <p className="text-gray-500">Theo dõi các yêu cầu thanh toán và bồi hoàn thiết bị</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DebtStatCard title="Thiết bị cần bồi hoàn" value={totalBorrowed} />
        <DebtStatCard title="Yêu cầu chưa thanh toán" value={overdueCount} />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Tìm thiết bị cần thanh toán..." />
      <DebtTable debts={filteredDebts} />
    </div>
  );
}
