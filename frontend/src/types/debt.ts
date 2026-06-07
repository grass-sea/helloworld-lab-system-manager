export interface Debt {
  id: string;

  equipment: string;

  borrowedDate: string;

  dueDate: string;

  daysLeft: number;

  fine: number;

  status:
    | "ACTIVE"
    | "OVERDUE"
    | "RETURNED";
}