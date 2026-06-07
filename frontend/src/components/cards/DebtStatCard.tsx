interface Props {
  title: string;
  value: number;
}

export default function DebtStatCard({
  title,
  value,
}: Props) {
  return (
    <div
      className="
      bg-white
      border
      border-gray-200
      rounded-2xl
      p-5
      shadow-sm
      "
    >
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h2
        className="
        text-3xl
        font-black
        text-gray-900
        mt-2
        "
      >
        {value}
      </h2>
    </div>
  );
}