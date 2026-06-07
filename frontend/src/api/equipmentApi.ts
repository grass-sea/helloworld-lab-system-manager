import api from "./axios";

export const getEquipment = () =>
  api.get("/equipment");

export const borrowEquipment = (id: string) =>
  api.post(`/equipment/${id}/borrow`);

export const queueEquipment = (id: string) =>
  api.post(`/equipment/${id}/queue`);

export const notifyEquipment = (id: string) =>
  api.post(`/equipment/${id}/notify`);


// STAFF APIS 
export const createEquipment = (data: any) => 
  api.post("/equipment/", data);

// Hàm update truyền thêm payload dữ liệu `data` chuẩn chỉnh
export const updateEquipment = (id: string, data: any) => 
  api.put(`/equipment/${id}/`, data);

export const deleteEquipment = (id: string) => 
  api.delete(`/equipment/${id}/`);