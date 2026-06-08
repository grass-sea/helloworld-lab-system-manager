import { useI18n, type Language } from "../../context/I18nContext";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
      <span>{t("language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-[#A5001A]"
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </label>
  );
}
