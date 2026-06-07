import type { Equipment } from "../types/equipment";

export const equipmentMock: Equipment[] = [
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
    quantity: 0,
  },

  {
    id: "EQ003",
    name: "Multimeter",
    category: "Electronics",
    status: "OUT_OF_STOCK",
    quantity: 0,
  },

  {
    id: "EQ004",
    name: "Raspberry Pi 5",
    category: "Embedded",
    status: "AVAILABLE",
    quantity: 8,
  },
];