import type { Student } from "../types/student";

export const studentMock: Student[] = [
  {
    id: "ST001",
    studentCode: "202417032",
    fullName: "Đỗ Quang Thắng",
    email: "thang.dq2417032@sis.hust.edu.vn",
    borrowingCount: 2,
    status: "ACTIVE",
  },
  {
    id: "ST002",
    studentCode: "202417047",
    fullName: "Phạm Trọng Toàn",
    email: "toan.pt2417047@sis.hust.edu.vn",
    borrowingCount: 0,
    status: "BLOCKED",
  },
  {
    id: "ST003",
    studentCode: "20230003",
    fullName: "Le Van C",
    email: "c@gmail.com",
    borrowingCount: 1,
    status: "ACTIVE",
  },
];