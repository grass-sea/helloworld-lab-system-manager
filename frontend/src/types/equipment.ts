export interface Equipment {
  id: string;
  db_id?: number;
  equipmentId?: string;
  name: string;
  category: string;
  status: "AVAILABLE" | "IN_USE" | "OUT_OF_STOCK";
  quantity: number;
  totalQuantity?: number;
  availableQuantity?: number;
  supplier?: string | null;
  unit?: string;
  documentationUrl?: string | null;
  purchasePrice?: number;
  rentalPrice?: number;
  requiresReturn?: boolean;
  image?: string;
}
