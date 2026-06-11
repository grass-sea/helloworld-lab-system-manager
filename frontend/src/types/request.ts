export type BorrowRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export interface BorrowRequestItem {
  borrow_item_id?: number;
  equipment_id?: string;
  item_name: string;
  quantity: number;
  status?: BorrowRequestStatus;
  requires_return?: boolean;
  purchase_price?: number;
}

export interface BorrowRequest {
  id: number;
  borrower: string;
  borrower_code?: string;
  request_date: string;
  expected_return_date?: string;
  status: BorrowRequestStatus;
  is_overdue?: boolean;
  items?: BorrowRequestItem[];
}

export interface BorrowRequestRow {
  id: number;
  studentName: string;
  equipment: string;
  requestDate: string;
  status: BorrowRequestStatus;
}

export type Request = BorrowRequestRow;
