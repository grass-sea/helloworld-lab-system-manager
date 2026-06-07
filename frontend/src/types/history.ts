export interface BorrowHistory {
  id: string;
  equipment: string;
  date: string;
  status: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";
}