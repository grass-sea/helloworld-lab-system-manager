interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const styles = {
    // Trạng thái thiết bị & Phiếu mượn gốc
    AVAILABLE: "bg-green-100 text-green-700 font-semibold",
    IN_USE: "bg-amber-100 text-amber-700 font-semibold",
    OUT_OF_STOCK: "bg-rose-100 text-rose-700 font-semibold",
    PENDING: "bg-amber-100 text-amber-700 font-semibold",
    APPROVED: "bg-green-100 text-green-700 font-semibold",
    REJECTED: "bg-rose-100 text-rose-700 font-semibold",
    COMPLETED: "bg-sky-100 text-sky-700 font-semibold",
    PROCESSED: "bg-amber-50 text-amber-600 font-bold border border-amber-200", 
    ACTIVE: "bg-green-100 text-green-700 font-semibold",   
    BLOCKED: "bg-rose-100 text-rose-700 font-semibold",    
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        px-2.5
        py-1
        rounded-full
        text-xs
        font-medium
        transition-colors
        ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-600"}
      `}
    >
      {status}
    </span>
  );
}
