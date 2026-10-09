"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useAlternateLinks, type AlternateLinksMap } from "@/contexts/AlternateLinksContext";

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations("language_modal");

  let alternateLinks: AlternateLinksMap = {};
  try {
    const altCtx = useAlternateLinks();
    if (altCtx?.alternateLinks) {
      alternateLinks = altCtx.alternateLinks;
    }
  } catch {
    // fallback if outside AlternateLinksProvider
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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

    // Nếu trang hiện tại có cấu hình alternate slug cho targetLocale (ví dụ trang chi tiết sản phẩm)
    const targetAlternate = alternateLinks?.[targetLocale];

    // Kiểm tra tính hợp lệ của alternateLinks với route hiện tại:
    // 1. Phải khớp pathname (tránh việc trang khác dùng nhầm alternateLinks của trang sản phẩm đã xem trước đó)
    const isPathnameMatch = !targetAlternate?.pathname || targetAlternate.pathname === pathname;

    // 2. Nếu đang ở trang có slug param, kiểm tra slug có liên quan đến sản phẩm hiện tại hay là sản phẩm cũ
    const currentSlug = cleanParams.slug ? String(cleanParams.slug) : undefined;
    const isSlugMatch = !currentSlug ||
      !alternateLinks?.vi?.slug ||
      currentSlug === alternateLinks.vi?.slug ||
      currentSlug === alternateLinks.en?.slug ||
      (alternateLinks.vi?.slug && alternateLinks.vi.slug.includes(currentSlug)) ||
      (currentSlug && alternateLinks.vi?.slug && currentSlug.includes(alternateLinks.vi.slug));

    if (targetAlternate && isPathnameMatch && isSlugMatch) {
      // Đảm bảo khi sản phẩm chưa có slug EN riêng thì dùng slug VI an toàn, không bị rỗng hoặc mất slug
      const fallbackSlug = targetLocale === "en"
        ? (alternateLinks?.vi?.slug || currentSlug)
        : (alternateLinks?.en?.slug || currentSlug);
      const safeSlug = targetAlternate.slug?.trim() || fallbackSlug || currentSlug;

      const fallbackCategory = targetLocale === "en"
        ? (alternateLinks?.vi?.category || cleanParams.category)
        : (alternateLinks?.en?.category || cleanParams.category);
      const safeCategory = targetAlternate.category?.trim() || fallbackCategory || cleanParams.category;

      const targetParams = {
        ...cleanParams,
        ...(targetAlternate.params || {}),
        ...(safeCategory ? { category: safeCategory } : {}),
        ...(safeSlug ? { slug: safeSlug } : {}),
      };
      const targetPathname = targetAlternate.pathname || pathname;
      router.replace(
        // @ts-expect-error -- dynamic route params and pathname match the target route
        { pathname: targetPathname, params: targetParams, query },
        { locale: targetLocale, scroll: false }
      );
      return;
    }

    router.replace(
      // @ts-expect-error -- dynamic route params and pathname match the current route
      hasParams || query ? { pathname, params: cleanParams, query } : pathname,
      { locale: targetLocale, scroll: false }
    );
  };

  return (
    <>
      {/* Desktop view: 2 flags side by side */}
      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
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

      {/* Mobile view: single circular flag button that triggers selection sheet */}
      <div className="xl:hidden flex items-center shrink-0">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border-[1.5px] border-white shadow-sm"
          aria-label={t("aria_label") || "Chuyển đổi ngôn ngữ / Switch language"}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <Image
            src={locale === "vi" ? "/images/flag-vn.jpg" : "/images/flag-us.jpg"}
            alt={locale === "vi" ? "Tiếng Việt" : "English"}
            fill
            className="h-full w-full object-cover"
          />
        </button>
      </div>

      {/* Mobile Language Selection Sheet / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-sheet-title"
        >
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Panel */}
          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3
                id="language-sheet-title"
                className="text-lg font-bold font-display text-gray-900"
              >
                {t("title") || "Language"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer transition-colors"
                aria-label={t("close") || "Đóng"}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Language list */}
            <div className="space-y-2 py-1">
              <button
                type="button"
                onClick={() => {
                  handleSwitchLocale("vi");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${
                  locale === "vi" ? "bg-amber-50/70 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-gray-200">
                    <Image
                      src="/images/flag-vn.jpg"
                      alt={t("vi") || "Tiếng Việt"}
                      fill
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-base text-gray-900">
                    {t("vi") || "Tiếng Việt"}
                  </span>
                </div>
                {locale === "vi" && (
                  <svg
                    className="w-5 h-5 text-secondary shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSwitchLocale("en");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer ${
                  locale === "en" ? "bg-amber-50/70 font-semibold" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-gray-200">
                    <Image
                      src="/images/flag-us.jpg"
                      alt={t("en") || "English"}
                      fill
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-base text-gray-900">
                    {t("en") || "English"}
                  </span>
                </div>
                {locale === "en" && (
                  <svg
                    className="w-5 h-5 text-secondary shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
