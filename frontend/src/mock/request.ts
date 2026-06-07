import type { Request } from "../types/request";

export const requestMock: Request[] = [
  {
    id: "REQ001",
    studentName: "Nguyen Van A",
    equipment: "Oscilloscope Model X",
    requestDate: "2026-06-01",
    status: "PENDING",
  },
  {
    id: "REQ002",
    studentName: "Tran Thi B",
    equipment: "Arduino Uno R4",
    requestDate: "2026-06-02",
    status: "APPROVED",
  },
  {
    id: "REQ003",
    studentName: "Le Van C",
    equipment: "Raspberry Pi 5",
    requestDate: "2026-06-03",
    status: "REJECTED",
  },
];