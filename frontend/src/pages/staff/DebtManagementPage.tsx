import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../api/axios";
import SearchBar from "../../components/common/SearchBar";
import Modal from "../../components/common/Modal";
import { formatVnd } from "../../utils/currency";
import toast from "react-hot-toast";

interface DebtRow {
  id: number;
  borrower: string;
  borrower_code: string;
  item: string;
  amount: number;
  reason?: string;
  status: "UNPAID" | "PAID";
  created_at?: string;
}

interface PendingReturn {
  request_id: number;
  borrow_item_id: number;
  borrower: string;
  borrower_code: string;
  equipment_id: string;
  item_name: string;
  purchase_price: number;
  quantity: number;
  remaining_quantity: number;
  expected_return_date: string;
}

type ReturnCondition = "NORMAL" | "LIGHT_DAMAGE" | "HEAVY_DAMAGE" | "LOST_OR_DESTROYED";

export default function DebtManagementPage() {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [borrowItemId, setBorrowItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ReturnCondition>("NORMAL");
  const [note, setNote] = useState("");

  const fetchDebts = async () => {
    const res = await axiosInstance.get("/payment-requests");
    setDebts(res.data);
  };

  const fetchPendingReturns = async () => {
    const res = await axiosInstance.get("/returns/pending");
    setPendingReturns(res.data);
  };

  useEffect(() => {
    fetchDebts();
    fetchPendingReturns();
  }, []);

  const requestOptions = useMemo(() => {
    const map = new Map<number, PendingReturn>();
    pendingReturns.forEach((item) => {
      if (!map.has(item.request_id)) map.set(item.request_id, item);
    });
    return Array.from(map.values());
  }, [pendingReturns]);

  const equipmentOptions = pendingReturns.filter((item) => String(item.request_id) === requestId);
  const selectedReturn = pendingReturns.find((item) => String(item.borrow_item_id) === borrowItemId);

  useEffect(() => {
    setBorrowItemId("");
    setQuantity(1);
  }, [requestId]);

  useEffect(() => {
    if (selectedReturn) {
      setQuantity(Math.min(1, selectedReturn.remaining_quantity));
    }
  }, [selectedReturn]);

  const expectedDebt = useMemo(() => {
    if (!selectedReturn) return 0;
    const rates: Record<ReturnCondition, number> = {
      NORMAL: 0,
      LIGHT_DAMAGE: 0.2,
      HEAVY_DAMAGE: 0.6,
      LOST_OR_DESTROYED: 1,
    };
    return Math.floor(selectedReturn.purchase_price * quantity * rates[condition]);
  }, [condition, quantity, selectedReturn]);

  const resetAssessmentForm = () => {
    setRequestId("");
    setBorrowItemId("");
    setQuantity(1);
    setCondition("NORMAL");
    setNote("");
  };

  const handleSubmitReturn = async () => {
    if (!selectedReturn) {
      alert("Vui lòng chọn yêu cầu mượn và thiết bị.");
      return;
    }
    if (quantity < 1 || quantity > selectedReturn.remaining_quantity) {
      alert(`Số lượng phải từ 1 đến ${selectedReturn.remaining_quantity}.`);
      return;
    }

    try {
      await axiosInstance.post("/returns", {
        request_id: selectedReturn.request_id,
        borrow_item_id: selectedReturn.borrow_item_id,
        quantity,
        returned_condition: condition,
        note,
      });
      toast.success("Đã tạo yêu cầu thanh toán thành công.");
      setIsModalOpen(false);
      resetAssessmentForm();
      await Promise.all([fetchDebts(), fetchPendingReturns()]);
    } catch (error: any) {
      alert(error.response?.data?.detail || "Không thể tạo yêu cầu thanh toán.");
    }
  };

  const handleMarkPaid = async (debtId: number) => {
    const confirmClear = window.confirm("Xác nhận công nợ này đã được thanh toán?");
    if (!confirmClear) return;
    await axiosInstance.delete(`/payment-requests/${debtId}`);
    await fetchDebts();
  };

  const filteredDebts = debts.filter((debt) =>
    debt.borrower.toLowerCase().includes(search.toLowerCase()) ||
    debt.borrower_code.toLowerCase().includes(search.toLowerCase()) ||
    debt.item.toLowerCase().includes(search.toLowerCase()) ||
    debt.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Quản lý công nợ</h1>
          <p className="text-gray-500">Theo dõi lịch sử công nợ và tạo yêu cầu thanh toán khi xử lý trả thiết bị</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#A5001A] hover:bg-[#8d0016] text-white px-5 py-3 rounded-xl font-semibold transition-colors"
        >
          Tạo yêu cầu thanh toán
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Tìm theo sinh viên, mã, thiết bị hoặc trạng thái..." />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Sinh viên</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Thiết bị</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Lý do</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDebts.map((debt) => (
              <tr key={debt.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-900">
                  {debt.borrower}
                  <span className="block text-xs font-medium text-gray-400">{debt.borrower_code}</span>
                </td>
                <td className="p-4 text-sm text-gray-600 font-medium">{debt.item}</td>
                <td className="p-4 font-bold text-rose-600">{formatVnd(debt.amount)}</td>
                <td className="p-4 text-sm text-gray-500">{debt.reason || "Công nợ tự động"}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${debt.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {debt.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {debt.status === "UNPAID" ? (
                    <button
                      onClick={() => handleMarkPaid(debt.id)}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      Đánh dấu đã thanh toán
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Chỉ xem</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredDebts.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có công nợ.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={isModalOpen} title="Tạo yêu cầu thanh toán" onClose={() => setIsModalOpen(false)}>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Yêu cầu mượn</label>
            <select value={requestId} onChange={(event) => setRequestId(event.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none">
              <option value="">Chọn yêu cầu mượn</option>
              {requestOptions.map((item) => (
                <option key={item.request_id} value={item.request_id}>
                  #{item.request_id} - {item.borrower} ({item.borrower_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thiết bị</label>
            <select value={borrowItemId} onChange={(event) => setBorrowItemId(event.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" disabled={!requestId}>
              <option value="">Chọn thiết bị</option>
              {equipmentOptions.map((item) => (
                <option key={item.borrow_item_id} value={item.borrow_item_id}>
                  {item.equipment_id} - {item.item_name} | Còn lại {item.remaining_quantity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số lượng</label>
            <input
              type="number"
              min={1}
              max={selectedReturn?.remaining_quantity || 1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none"
              disabled={!selectedReturn}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tình trạng trả</label>
            <select value={condition} onChange={(event) => setCondition(event.target.value as ReturnCondition)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none">
              <option value="NORMAL">NORMAL</option>
              <option value="LIGHT_DAMAGE">LIGHT_DAMAGE</option>
              <option value="HEAVY_DAMAGE">HEAVY_DAMAGE</option>
              <option value="LOST_OR_DESTROYED">LOST_OR_DESTROYED</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ghi chú nhân viên</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" placeholder="Chi tiết ghi nhận..." />
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
            <span className="font-bold text-gray-500">Công nợ dự kiến: </span>
            <span className={expectedDebt > 0 ? "font-black text-rose-600" : "font-black text-emerald-700"}>{formatVnd(expectedDebt)}</span>
          </div>

          <button onClick={handleSubmitReturn} className="w-full py-3 bg-[#A5001A] text-white font-bold rounded-xl mt-2">Tạo yêu cầu thanh toán</button>
        </div>
      </Modal>
    </div>
  );
}
