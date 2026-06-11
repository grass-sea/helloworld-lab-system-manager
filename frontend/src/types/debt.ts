export interface Debt {
  id: string;

  equipment: string;

  borrowedDate: string;

  dueDate: string;

  daysLeft: number;

  amount: number;
  amountDisplay?: string;

  status:
    | "ACTIVE"
    | "OVERDUE"
    | "RETURNED";
}
