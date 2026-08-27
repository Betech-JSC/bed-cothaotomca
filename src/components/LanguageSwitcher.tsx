"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Image from "next/image";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleSwitchLocale = (targetLocale: "vi" | "en") => {
    if (targetLocale === locale) return;

    // Lấy query search params từ window nếu có (tránh dùng hook useSearchParams để không trigger Suspense boundary)
    let query: Record<string, string> | undefined = undefined;
    if (typeof window !== "undefined" && window.location.search) {
      const search = new URLSearchParams(window.location.search);
      const searchObj: Record<string, string> = {};
      search.forEach((val, key) => {
        searchObj[key] = val;
      });
      if (Object.keys(searchObj).length > 0) {
        query = searchObj;
      }
    }

    // Loại bỏ locale ra khỏi params nếu có
    const { locale: _localeParam, ...cleanParams } = (params || {}) as Record<string, any>;
    const hasParams = Object.keys(cleanParams).length > 0;

    router.replace(
      // @ts-expect-error -- dynamic route params and pathname match the current route
      hasParams || query ? { pathname, params: cleanParams, query } : pathname,
      { locale: targetLocale, scroll: false }
    );
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => handleSwitchLocale("vi")}
        className={`relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border-[1.5px] ${locale === "vi" ? "border-white" : "border-transparent"}`}
        aria-label="Chuyển sang tiếng Việt"
      >
        <Image
          src="/images/flag-vn.jpg"
          alt="Chuyển sang tiếng Việt"
          fill
          className="h-full w-full object-cover"
        />
      </button>
      <button
        type="button"
        onClick={() => handleSwitchLocale("en")}
        className={`relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border-[1.5px] ${locale === "en" ? "border-white" : "border-transparent"}`}
        aria-label="Switch to English"
      >
        <Image
          src="/images/flag-us.jpg"
          alt="Switch to English"
          fill
          className="h-full w-full object-cover"
        />
      </button>
    </div>
  );
}
