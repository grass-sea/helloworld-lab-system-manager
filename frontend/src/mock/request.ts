import type { Request } from "../types/request";

export const requestMock: Request[] = [
  {
    id: 1,
    studentName: "Nguyen Van A",
    equipment: "Oscilloscope Model X",
    requestDate: "2026-06-01",
    status: "PENDING",
  },
  {
    id: 2,
    studentName: "Tran Thi B",
    equipment: "Arduino Uno R4",
    requestDate: "2026-06-02",
    status: "APPROVED",
  },
  {
    id: 3,
    studentName: "Le Van C",
    equipment: "Raspberry Pi 5",
    requestDate: "2026-06-03",
    status: "REJECTED",
  },
];
