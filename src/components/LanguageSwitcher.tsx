"use client";

import { useI18n } from "../i18n/I18nProvider";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const isVietnamese = locale === "vi";
  const nextLocale = isVietnamese ? "en" : "vi";

  const targetPath = pathname.replace(/^\/(en|vi)(\/|$)/, `/${nextLocale}$2`) || `/${nextLocale}`;
  const targetSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const handleToggle = () => {
    setLocale(nextLocale); // nêu giữ context nếu phần client khác dùng
    window.localStorage.setItem("locale", nextLocale);
    router.push(`${targetPath}${targetSearch}`);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="size-6 rounded-full relative block overflow-hidden cursor-pointer"
      aria-label={nextLocale === "en" ? "Switch to English" : "Chuyển sang tiếng Việt"}
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
