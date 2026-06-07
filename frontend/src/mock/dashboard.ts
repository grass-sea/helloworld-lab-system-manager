import type {
  DashboardStats,
  Activity,
} from "../types/dashboard";

export const dashboardStats: DashboardStats =
{
  borrowed: 4,
  pending: 2,
  debt: 35,
};

export const recentActivities: Activity[] =
[
  {
    id: "A001",
    title: "Borrowed Oscilloscope",
    date: "2026-06-01",
  },

  {
    id: "A002",
    title: "Returned Arduino Uno",
    date: "2026-05-29",
  },

  {
    id: "A003",
    title: "Paid Laboratory Debt",
    date: "2026-05-25",
  },
];