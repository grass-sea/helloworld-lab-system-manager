interface Props {
  title: string;
  value: number;
  type:
    | "total"
    | "available"
    | "in_use"
    | "out_of_stock";
}

export default function EquipmentStatCard({
  title,
  value,
  type,
}: Props) {
  const styles = {
    total: {
      text: "text-blue-600",
      bg: "bg-blue-50",
    },

    available: {
      text: "text-green-600",
      bg: "bg-green-50",
    },

    in_use: {
      text: "text-amber-600",
      bg: "bg-amber-50",
    },

    out_of_stock: {
      text: "text-red-600",
      bg: "bg-red-50",
    },
  };

  return (
    <div
      className={`
      rounded-2xl
      border
      border-gray-200
      p-5
      shadow-sm
      ${styles[type].bg}
      `}
    >
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h2
        className={`
        text-3xl
        font-black
        mt-2
        ${styles[type].text}
        `}
      >
        {value}
      </h2>
    </div>
  );
}