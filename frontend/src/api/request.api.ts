import api from "./axios";

export const getBorrowRequests = () => api.get("/borrow-requests");

export const approveRequest = (id: number) =>
  api.post(`/borrow-requests/${id}/approve`);

export const declineRequest = (id: number) =>
  api.post(`/borrow-requests/${id}/reject`);
