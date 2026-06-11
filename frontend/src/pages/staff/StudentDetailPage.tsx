import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bell, BookOpen, CreditCard, Package, UserRound } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";
import axiosInstance from "../../api/axios";
import { formatVnd } from "../../utils/currency";

const display = (value: unknown) => value === null || value === undefined || value === "" ? "N/A" : String(value);

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-red-50 text-[#A5001A] flex items-center justify-center">
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{display(value)}</p>
    </div>
  );
}

export default function StudentDetailPage() {
  const { studentCode } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!studentCode) return;
      try {
        const res = await axiosInstance.get(`/borrowers/${studentCode}/detail`);
        setDetail(res.data);
      } catch (error) {
        console.error("Failed to fetch student detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [studentCode]);

  if (loading) {
    return <div className="text-sm font-semibold text-gray-500">Loading student detail...</div>;
  }

  if (!detail) {
    return <div className="text-sm font-semibold text-rose-600">Student detail not found.</div>;
  }

  const student = detail.student;
  const stats = detail.borrow_statistics;
  const debts = detail.debt_summary;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate("/staff/students")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to students
          </button>
          <h1 className="text-3xl font-black text-gray-900">{student.full_name}</h1>
          <p className="text-gray-500">{student.borrower_code}</p>
        </div>
        <StatusBadge status={student.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard title="Personal Information" icon={UserRound}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full name" value={student.full_name} />
            <Field label="Student ID" value={student.borrower_code} />
            <Field label="Email" value={student.email} />
            <Field label="Phone number" value={student.phone_number || student.phone} />
            <Field label="Date of birth" value={student.date_of_birth} />
            <Field label="Borrower type" value={student.borrower_type} />
          </div>
        </InfoCard>

        <InfoCard title="Academic Information" icon={BookOpen}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Faculty" value={student.faculty} />
            <Field label="Major" value={student.major} />
            <Field label="Class name" value={student.class_name} />
            <Field label="Academic year" value={student.academic_year} />
            <Field label="Study status" value={student.study_status} />
            <Field label="Department" value={student.department} />
          </div>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Total requests</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{stats.total_requests}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Active loans</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{stats.approved_requests}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Borrowed quantity</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{stats.current_borrowed_quantity}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Equipment value</p>
          <p className="mt-2 text-2xl font-black text-[#A5001A]">{formatVnd(detail.current_equipment_value)}</p>
        </div>
      </div>

      <InfoCard title="Current Borrowed Equipment" icon={Package}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2">Equipment</th>
                <th className="py-2">Request</th>
                <th className="py-2 text-center">Remaining</th>
                <th className="py-2 text-right">Value</th>
                <th className="py-2 text-right">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.current_borrowed_equipment.map((item: any) => (
                <tr key={item.borrow_item_id}>
                  <td className="py-3 font-semibold text-gray-800">{item.item_name}<span className="block text-xs text-gray-400">{item.equipment_id}</span></td>
                  <td className="py-3">#{item.request_id}</td>
                  <td className="py-3 text-center">{item.remaining_quantity}</td>
                  <td className="py-3 text-right font-bold">{formatVnd(item.line_value)}</td>
                  <td className="py-3 text-right">{item.expected_return_date}</td>
                </tr>
              ))}
              {detail.current_borrowed_equipment.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No active borrowed equipment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </InfoCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoCard title="Debt Summary and Payment Request History" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Field label="Unpaid total" value={formatVnd(debts.total_unpaid)} />
            <Field label="Paid total" value={formatVnd(debts.total_paid)} />
            <Field label="Unpaid records" value={debts.unpaid_count} />
            <Field label="Total records" value={debts.total_records} />
          </div>
          <div className="space-y-3">
            {detail.payment_request_history.map((paymentRequest: any) => (
              <div key={paymentRequest.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-gray-900">{paymentRequest.item}</p>
                  <span className="text-sm font-black text-[#A5001A]">{formatVnd(paymentRequest.amount)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{paymentRequest.reason || "Payment request record"} - {paymentRequest.status}</p>
              </div>
            ))}
            {detail.payment_request_history.length === 0 && <p className="text-sm text-gray-400">No payment request history.</p>}
          </div>
        </InfoCard>

        <InfoCard title="Notification History" icon={Bell}>
          <div className="space-y-3">
            {detail.notification_history.map((notification: any) => (
              <div key={notification.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-gray-900">{notification.title}</p>
                  <span className={`text-xs font-bold ${notification.is_read ? "text-gray-400" : "text-[#A5001A]"}`}>
                    {notification.is_read ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{notification.content}</p>
              </div>
            ))}
            {detail.notification_history.length === 0 && <p className="text-sm text-gray-400">No notification history.</p>}
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
