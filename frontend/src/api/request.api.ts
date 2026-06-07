import { api } from "./axios";

export const getBorrowRequests = () =>
  api.get("/requests");

export const approveRequest = (id: string) =>
  api.put(`/requests/${id}/approve`);

export const declineRequest = (id: string) =>
  api.put(`/requests/${id}/decline`);