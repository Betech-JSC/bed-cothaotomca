"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/i18n/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const handleChange = (next: Locale) => {
    setLocale(next);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600 dark:text-gray-300">{t.language}:</span>
      <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 text-xs dark:border-gray-700 dark:bg-gray-900">
        {LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleChange(item)}
            className={`px-2 py-1 rounded-full transition ${
              locale === item
                ? "bg-primary text-white shadow-btn"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

