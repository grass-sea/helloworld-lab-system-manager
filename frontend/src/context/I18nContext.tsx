import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "vi" | "en" | "ja";

const dictionaries: Record<Language, Record<string, string>> = {
  vi: {
    language: "Ngôn ngữ",
    role: "Vai trò",
    staffPortal: "Cổng nhân viên",
    studentPortal: "Cổng người mượn",
    dashboard: "Tổng quan",
    equipment: "Thiết bị",
    history: "Lịch sử",
    debts: "Công nợ",
    requests: "Yêu cầu",
    students: "Người mượn",
    fines: "Khoản phạt",
    overview: "Tổng quan",
    logout: "Đăng xuất",
    login: "Đăng nhập",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    borrowerPortal: "Cổng người mượn",
    staffAdministration: "Quản trị nhân viên",
    invalidUsername: "Tên đăng nhập không tồn tại.",
    invalidPassword: "Mật khẩu không chính xác.",
    accountDisabled: "Tài khoản đã bị khóa hoặc vô hiệu hóa.",
    loginSuccess: "Đăng nhập thành công.",
    wrongPortal: "Tài khoản không có quyền truy cập cổng này.",
    processing: "Đang xử lý...",
  },
  en: {
    language: "Language",
    role: "Role",
    staffPortal: "Staff Portal",
    studentPortal: "Borrower Portal",
    dashboard: "Dashboard",
    equipment: "Equipment",
    history: "History",
    debts: "Debts",
    requests: "Requests",
    students: "Borrowers",
    fines: "Fines",
    overview: "Overview",
    logout: "Logout",
    login: "Login",
    username: "Username",
    password: "Password",
    borrowerPortal: "Borrower Portal",
    staffAdministration: "Staff Administration",
    invalidUsername: "Username does not exist.",
    invalidPassword: "Password is incorrect.",
    accountDisabled: "This account is disabled or blocked.",
    loginSuccess: "Login successful.",
    wrongPortal: "This account cannot access the selected portal.",
    processing: "Processing...",
  },
  ja: {
    language: "言語",
    role: "役割",
    staffPortal: "スタッフポータル",
    studentPortal: "借用者ポータル",
    dashboard: "ダッシュボード",
    equipment: "機器",
    history: "履歴",
    debts: "債務",
    requests: "申請",
    students: "借用者",
    fines: "罰金",
    overview: "概要",
    logout: "ログアウト",
    login: "ログイン",
    username: "ユーザー名",
    password: "パスワード",
    borrowerPortal: "借用者ポータル",
    staffAdministration: "スタッフ管理",
    invalidUsername: "ユーザー名が存在しません。",
    invalidPassword: "パスワードが正しくありません。",
    accountDisabled: "このアカウントは無効またはブロックされています。",
    loginSuccess: "ログインしました。",
    wrongPortal: "このアカウントは選択したポータルにアクセスできません。",
    processing: "処理中...",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language") as Language | null;
    return stored && ["vi", "en", "ja"].includes(stored) ? stored : "vi";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const value = useMemo<I18nContextType>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key: string) => dictionaries[language][key] ?? dictionaries.vi[key] ?? key,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}
