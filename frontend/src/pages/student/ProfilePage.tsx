import { useEffect, useState } from "react";
import { Bell, BookOpen, CalendarClock, CreditCard, FileText, Package, UserRound } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";
import axiosInstance from "../../api/axios";
import { formatVnd } from "../../utils/currency";

const display = (value: unknown) => value === null || value === undefined || value === "" ? "N/A" : String(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#A5001A]">
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

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-[#A5001A]">
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError(null);
        const res = await axiosInstance.get("/student/me");
        setProfile(res.data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        const message = (error as any)?.response?.data?.detail
          || (error as any)?.response?.data?.message
          || "Profile data is not linked to this account yet.";
        setError(message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="text-sm font-semibold text-gray-500">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        {error || "No profile data is available for this account yet."}
      </div>
    );
  }

  const student = profile.student ?? profile;
  const stats = profile.borrow_statistics ?? {
    total_borrow_requests: 0,
    active_borrowings: 0,
    overdue_borrowings: 0,
    total_debts: 0,
    unpaid_debt_amount: 0,
  };
  const currentBorrowedEquipment = profile.current_borrowed_equipment ?? [];
  const outstandingDebts = profile.outstanding_debts ?? [];
  const recentNotifications = profile.recent_notifications ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Student Profile</h1>
          <p className="text-gray-500">Your personal, academic, borrowing, debt, and notification records</p>
        </div>
        <StatusBadge status={student.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Personal Information" icon={UserRound}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Student ID" value={student.student_id || student.borrower_code} />
            <Field label="Full name" value={student.full_name} />
            <Field label="Email" value={student.email} />
            <Field label="Phone number" value={student.phone_number || student.phone} />
            <Field label="Date of birth" value={formatDate(student.date_of_birth)} />
          </div>
        </Card>

        <Card title="Academic Information" icon={BookOpen}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Faculty" value={student.faculty} />
            <Field label="Major" value={student.major} />
            <Field label="Class name" value={student.class_name} />
            <Field label="Academic year" value={student.academic_year} />
            <Field label="Study status" value={student.study_status} />
            <Field label="Created date" value={formatDate(student.created_at)} />
          </div>
        </Card>
      </div>

      <Card title="Account Information" icon={CalendarClock}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Account status" value={student.status} />
          <Field label="Created date" value={formatDate(student.created_at)} />
          <Field label="Borrower type" value={student.borrower_type} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total borrow requests" value={stats.total_borrow_requests} icon={FileText} />
        <StatCard label="Active borrowings" value={stats.active_borrowings} icon={Package} />
        <StatCard label="Overdue borrowings" value={stats.overdue_borrowings} icon={CalendarClock} />
        <StatCard label="Total debts" value={stats.total_debts} icon={CreditCard} />
        <StatCard label="Unpaid debt amount" value={formatVnd(stats.unpaid_debt_amount)} icon={CreditCard} />
      </div>

      <Card title="Current Borrowed Equipment" icon={Package}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="py-3">Equipment ID</th>
                <th className="py-3">Equipment Name</th>
                <th className="py-3 text-center">Quantity</th>
                <th className="py-3">Borrow Date</th>
                <th className="py-3">Due Date</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentBorrowedEquipment.map((item: any) => (
                <tr key={item.borrow_item_id}>
                  <td className="py-3 font-mono text-xs font-bold text-gray-600">{item.equipment_id}</td>
                  <td className="py-3 font-semibold text-gray-900">{item.equipment_name}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3">{formatDate(item.borrow_date)}</td>
                  <td className="py-3">{formatDate(item.due_date)}</td>
                  <td className="py-3 text-right"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
              {currentBorrowedEquipment.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No current borrowed equipment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Outstanding Debts" icon={CreditCard}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="py-3">Debt ID</th>
                <th className="py-3">Reason</th>
                <th className="py-3 text-right">Amount</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 text-right">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {outstandingDebts.map((debt: any) => (
                <tr key={debt.id}>
                  <td className="py-3 font-mono text-xs font-bold text-gray-600">#{debt.id}</td>
                  <td className="py-3 font-semibold text-gray-900">{debt.reason}</td>
                  <td className="py-3 text-right font-black text-[#A5001A]">{formatVnd(debt.amount)}</td>
                  <td className="py-3 text-center"><StatusBadge status={debt.status} /></td>
                  <td className="py-3 text-right">{formatDate(debt.created_at)}</td>
                </tr>
              ))}
              {outstandingDebts.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No outstanding debts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Recent Notifications" icon={Bell}>
        <div className="grid gap-3">
          {recentNotifications.map((notification: any) => (
            <div key={notification.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">{notification.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${notification.is_read ? "bg-gray-100 text-gray-500" : "bg-red-50 text-[#A5001A]"}`}>
                    {notification.is_read ? "Read" : "Unread"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
              </div>
              <p className="shrink-0 text-xs font-bold text-gray-400">{formatDate(notification.created_at)}</p>
            </div>
          ))}
          {recentNotifications.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No notifications yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
