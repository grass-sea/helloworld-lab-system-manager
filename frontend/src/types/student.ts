export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  borrowingCount: number;
  status: "ACTIVE" | "BLOCKED" | "DELETED";
}
