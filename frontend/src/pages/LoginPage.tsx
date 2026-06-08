import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock, ShieldAlert, User as UserIcon, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useI18n } from "../context/I18nContext";
import LanguageSelector from "../components/common/LanguageSelector";

const messageKeyByCode: Record<string, string> = {
  INVALID_USERNAME: "invalidUsername",
  INVALID_PASSWORD: "invalidPassword",
  ACCOUNT_DISABLED: "accountDisabled",
  WRONG_PORTAL: "wrongPortal",
};

export default function LoginPage() {
  const { login } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activePortal, setActivePortal] = useState<"BORROWER" | "STAFF">("BORROWER");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePortalChange = (portal: "BORROWER" | "STAFF") => {
    setActivePortal(portal);
    setMessage(null);
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    const result = await login(username.trim(), password, activePortal);
    setIsLoading(false);

    if (!result.success) {
      const key = result.code ? messageKeyByCode[result.code] : undefined;
      setMessage({ type: "error", text: key ? t(key) : result.message || t("invalidPassword") });
      return;
    }

    setMessage({ type: "success", text: t("loginSuccess") });
    navigate(activePortal === "STAFF" ? "/staff" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4 relative">
      <div className="absolute right-6 top-5">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/70">
          <button
            type="button"
            onClick={() => handlePortalChange("BORROWER")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${
              activePortal === "BORROWER"
                ? "border-[#A5001A] text-[#A5001A] bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={16} />
            <span>{t("studentPortal")}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalChange("STAFF")}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${
              activePortal === "STAFF"
                ? "border-[#A5001A] text-[#A5001A] bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <ShieldAlert size={16} />
            <span>{t("staffPortal")}</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              {activePortal === "BORROWER" ? t("borrowerPortal") : t("staffAdministration")}
            </h2>
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 p-4 rounded-xl text-xs font-semibold ${
                message.type === "success"
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                  : "bg-rose-50 border border-rose-100 text-rose-600"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                {t("username")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:bg-white focus:border-[#A5001A] focus:ring-1 focus:ring-[#A5001A] outline-none transition-all"
                  placeholder={activePortal === "BORROWER" ? "202417047" : "dqt.admin"}
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                {t("password")}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm focus:bg-white focus:border-[#A5001A] focus:ring-1 focus:ring-[#A5001A] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 bg-[#A5001A] hover:bg-[#850012] text-white font-bold rounded-xl transition-all shadow-xs tracking-wide text-sm mt-2 flex justify-center items-center ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? t("processing") : t("login")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
