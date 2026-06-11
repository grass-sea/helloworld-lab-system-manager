export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  faculty?: string;
  major?: string;
  className?: string;
  academicYear?: string;
  studyStatus?: string;
  borrowingCount: number;
  status: "ACTIVE" | "BLOCKED";
}
