import type { Debt } from "../types/debt";

export const debtMock: Debt[] = [
  {
    id: "DB001",

    equipment: "Oscilloscope",

    borrowedDate: "2025-05-20",

    dueDate: "2025-06-10",

    daysLeft: 5,

    amount: 0,

    status: "ACTIVE",
  },

  {
    id: "DB002",

    equipment: "Arduino Uno",

    borrowedDate: "2025-05-01",

    dueDate: "2025-05-20",

    daysLeft: -10,

    amount: 100000,

    status: "OVERDUE",
  },
];
