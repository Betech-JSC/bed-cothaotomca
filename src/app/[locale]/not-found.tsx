"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/i18n-navigation";

export default function NotFound() {
  const contextLocale = useLocale();
  const rawPathname = usePathname() || "";
  const isEnPath = /^\/en(\/|$)/.test(rawPathname) || (typeof window !== "undefined" && /^\/en(\/|$)/.test(window.location.pathname));
  const isEn = contextLocale === "en" || isEnPath;

  let title = "404";
  let description = isEn
    ? "Page not found. The page you are looking for does not exist."
    : "Không tìm thấy trang bạn yêu cầu.";
  let goHome = isEn ? "Back to home" : "Về trang chủ";

  try {
    const t = useTranslations("errors.404");
    if (!isEnPath || contextLocale === "en") {
      title = t("title") || title;
      description = t("description") || description;
      goHome = t("go_home") || goHome;
    }
  } catch {
    // use fallback strings above
  }

  return (
    <main className="min-h-[720px] flex items-center justify-center bg-yellow p-6">
      <div className="container">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-6xl font-extrabold text-primary mb-4">{title}</h1>
          <p className="text-xl text-gray-700 mb-6">{description}</p>
          <Link
            href="/"
            locale={isEn ? "en" : "vi"}
            className="inline-block px-6 py-3 bg-secondary text-white font-bold rounded-full hover:bg-secondary/90 transition-all"
          >
            {goHome}
          </Link>
        </div>
      </div>
    </main>
  );
}

