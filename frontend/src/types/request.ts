// Cập nhật lại types/request.ts cho khớp với SQL mới
export interface BorrowRequest {
  request_id: number;
  borrower: {
    full_name: string;
    borrower_code: string;
  };
  request_date: string;
  expected_return_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  items: Array<{
    item_name: string;
    quantity: number;
  }>;
}