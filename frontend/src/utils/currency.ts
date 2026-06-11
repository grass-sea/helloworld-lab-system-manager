export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const formatVndInput = (value: string | number) => {
  const raw = digitsOnly(String(value));
  if (!raw) return "";
  return Number(raw).toLocaleString("vi-VN");
};

export const parseVndInput = (value: string) => {
  const raw = digitsOnly(value);
  return raw ? Number(raw) : 0;
};

export const formatVnd = (value: string | number | null | undefined) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
};
