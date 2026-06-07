export interface Equipment {
  id: string;
  name: string;
  category: string;
  status: "AVAILABLE" | "IN_USE" | "OUT_OF_STOCK";
  quantity: number;
  image?: string;
}