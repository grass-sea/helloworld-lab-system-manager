import type { Equipment } from "../types/equipment";

export const staffEquipmentMock: Equipment[] = [
  {
    id: "EQ001",
    name: "Oscilloscope",
    category: "Electronics",
    status: "AVAILABLE",
    quantity: 5,
  },

  {
    id: "EQ002",
    name: "Arduino Uno",
    category: "Embedded",
    status: "IN_USE",
    quantity: 2,
  },

  {
    id: "EQ003",
    name: "Raspberry Pi 5",
    category: "Embedded",
    status: "AVAILABLE",
    quantity: 8,
  },
];