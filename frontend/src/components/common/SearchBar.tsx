interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder,
}: Props) {
  return (
    <input
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
      className="
      border
      border-gray-300
      rounded-xl
      px-4
      py-2
      w-80
      focus:outline-none
      focus:ring-2
      focus:ring-red-700
      "
    />
  );
}