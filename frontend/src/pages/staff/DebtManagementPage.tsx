import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import SearchBar from "../../components/common/SearchBar";
import Modal from "../../components/common/Modal";

interface Fine {
  id: number;
  borrower: string;
  borrower_code: string;
  item: string;
  fine: number;
  reason?: string;
  status: "UNPAID" | "PAID";
}

interface BorrowerOption {
  borrower_code: string;
  full_name: string;
}

interface BorrowedItemOption {
  borrow_item_id: number;
  item_name: string;
  remaining_quantity: number;
}

export default function DebtManagementPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItemOption[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [borrowerCode, setBorrowerCode] = useState("");
  const [borrowItemId, setBorrowItemId] = useState("");
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [reason, setReason] = useState("");

  const fetchFines = async () => {
    const res = await axiosInstance.get("/fines");
    setFines(res.data);
  };

  const fetchBorrowers = async () => {
    const res = await axiosInstance.get("/borrowers");
    setBorrowers(res.data);
  };

  useEffect(() => {
    fetchFines();
    fetchBorrowers();
  }, []);

  useEffect(() => {
    const fetchBorrowedItems = async () => {
      if (!borrowerCode) {
        setBorrowedItems([]);
        setBorrowItemId("");
        return;
      }
      const res = await axiosInstance.get(`/borrowers/${borrowerCode}/borrowed-items`);
      setBorrowedItems(res.data);
      setBorrowItemId("");
    };

    fetchBorrowedItems();
  }, [borrowerCode]);

  const handleAddFine = async () => {
    if (!borrowerCode || !borrowItemId || fineAmount <= 0) {
      alert("Please select a borrower, borrowed item, and valid fine amount.");
      return;
    }

    try {
      await axiosInstance.post("/fines", {
        borrower_code: borrowerCode,
        borrow_item_id: Number(borrowItemId),
        amount: fineAmount,
        reason: reason || "Damaged/Lost item",
      });
      setIsModalOpen(false);
      setBorrowerCode("");
      setBorrowItemId("");
      setFineAmount(0);
      setReason("");
      await fetchFines();
    } catch (error: any) {
      console.error("Failed to add fine:", error);
      alert(error.response?.data?.detail || "Cannot create fine for this item.");
    }
  };

  const handleClearFine = async (fineId: number) => {
    const confirmClear = window.confirm("Confirm this fine has been paid?");
    if (!confirmClear) return;

    await axiosInstance.delete(`/fines/${fineId}`);
    await fetchFines();
  };

  const filteredFines = fines.filter((fine) =>
    fine.borrower.toLowerCase().includes(search.toLowerCase()) ||
    fine.borrower_code.toLowerCase().includes(search.toLowerCase()) ||
    fine.item.toLowerCase().includes(search.toLowerCase())
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

      <SearchBar value={search} onChange={setSearch} placeholder="Search by student, code, or item name..." />

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
            {filteredFines.map((fine) => (
              <tr key={fine.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-900">
                  {fine.borrower}
                  <span className="block text-xs font-medium text-gray-400">{fine.borrower_code}</span>
                </td>
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
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Borrower</label>
            <select value={borrowerCode} onChange={(event) => setBorrowerCode(event.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none">
              <option value="">Select borrower</option>
              {borrowers.map((borrower) => (
                <option key={borrower.borrower_code} value={borrower.borrower_code}>
                  {borrower.full_name} ({borrower.borrower_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Borrowed Item</label>
            <select value={borrowItemId} onChange={(event) => setBorrowItemId(event.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" disabled={!borrowerCode}>
              <option value="">Select an approved borrowed item</option>
              {borrowedItems.map((item) => (
                <option key={item.borrow_item_id} value={item.borrow_item_id}>
                  {item.item_name} - remaining {item.remaining_quantity}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fine Amount ($)</label>
            <input type="number" min={0} value={fineAmount} onChange={(event) => setFineAmount(Number(event.target.value))} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reason</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} className="w-full border rounded-xl px-4 py-2.5 focus:border-[#A5001A] outline-none" placeholder="Reason for fine..." />
          </div>
          <button onClick={handleAddFine} className="w-full py-3 bg-[#A5001A] text-white font-bold rounded-xl mt-2">Submit Fine</button>
        </div>
      </Modal>
    </div>
  );
}
