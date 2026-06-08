import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axiosInstance from "../api/axios";

export type Role = "BORROWER" | "STUDENT" | "LECTURER" | "RESEARCHER" | "STAFF" | "ADMIN" | null;

interface User {
  username: string;
  name: string;
  role: Role;
  email: string;
  borrowerCode?: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  code?: string;
}

interface AppContextType {
  user: User | null;
  login: (username: string, password: string, targetPortal: "BORROWER" | "STAFF") => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        if (res.data.authenticated !== false) {
          setUser({
            username: res.data.username,
            name: res.data.full_name || res.data.username,
            role: res.data.role,
            email: res.data.email || `${res.data.username}@hust.edu.vn`,
            borrowerCode: res.data.borrower_code || res.data.username,
          });
        }
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    username: string,
    password: string,
    targetPortal: "BORROWER" | "STAFF"
  ): Promise<LoginResult> => {
    try {
      const response = await axiosInstance.post("/auth/login", { username, password });

      if (!response.data.success) {
        return { success: false, message: response.data.message, code: response.data.code };
      }

      const loggedRole = String(response.data.role).toUpperCase() as Role;
      if (targetPortal === "STAFF" && loggedRole !== "STAFF" && loggedRole !== "ADMIN") {
        return { success: false, code: "WRONG_PORTAL", message: "Wrong portal" };
      }
      if (targetPortal === "BORROWER" && (loggedRole === "STAFF" || loggedRole === "ADMIN")) {
        return { success: false, code: "WRONG_PORTAL", message: "Wrong portal" };
      }

      setUser({
        username: response.data.username,
        name: response.data.full_name || response.data.username,
        role: loggedRole,
        email: response.data.email || `${response.data.username}@hust.edu.vn`,
        borrowerCode: response.data.borrower_code || response.data.username,
      });
      return { success: true, message: response.data.message || "Login successful" };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, code: "NETWORK_ERROR", message: "Unable to reach backend" };
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch {
      // Keep local logout reliable even when the backend is unreachable.
    }
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, login, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
