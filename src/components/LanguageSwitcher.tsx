"use client";

import { useI18n } from "@/i18n/I18nProvider";
import Image from "next/image";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const isVietnamese = locale === "vi";
  const nextLocale = isVietnamese ? "en" : "vi";

  const handleToggle = () => {
    setLocale(nextLocale);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="size-6 rounded-full relative block overflow-hidden cursor-pointer"
    >
      <Image
        src={nextLocale === "en" ? "/images/flag-us.jpg" : "/images/flag-vn.jpg"}
        alt={nextLocale === "en" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        fill
        className="h-full w-full object-cover"
      />
    </button>
  );
}
