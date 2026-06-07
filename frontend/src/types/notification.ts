export interface Notification {
  id: string;

  title: string;

  description: string;

  time: string;

  type:
    | "approved"
    | "warning"
    | "rejected";
}