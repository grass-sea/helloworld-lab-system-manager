// src/context/AppContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axiosInstance from "../api/axios";

export type Role = "STUDENT" | "LECTURER" | "RESEARCHER" | "STAFF" | "ADMIN" | null;

interface User {
  username: string;
  name: string;
  role: Role;
  email: string;
}

interface AppContextType {
  user: User | null;
  login: (username: string, password: string, targetPortal: "BORROWER" | "STAFF") => Promise<boolean>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Kiểm tra phiên đăng nhập khi load trang
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get('/auth/me');
        if (res.data.authenticated !== false) {
          setUser({
            username: res.data.username,
            name: res.data.username, // Tạm dùng username làm tên hiển thị
            role: res.data.role,
            email: `${res.data.username}@hust.edu.vn`
          });
        }
      } catch (error) {
        console.log("Chưa đăng nhập");
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string, targetPortal: "BORROWER" | "STAFF"): Promise<boolean> => {
    try {
      const response = await axiosInstance.post('/auth/login', { username, password });
      
      if (response.data.success) {
        const loggedRole = response.data.role;
        
        // Chặn chéo cổng
        if (targetPortal === "STAFF" && loggedRole !== "STAFF" && loggedRole !== "ADMIN") return false;
        if (targetPortal === "BORROWER" && (loggedRole === "STAFF" || loggedRole === "ADMIN")) return false;

        setUser({
          username: response.data.username,
          name: response.data.username,
          role: loggedRole,
          email: `${response.data.username}@hust.edu.vn`
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      return false;
    }
  };

  const logout = () => {
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