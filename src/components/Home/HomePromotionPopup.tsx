"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { formatImageUrl } from "@/lib/format";
import Close from "@/components/Icons/Close";
import type { Banner } from "@/types/banner";
import { useTranslations } from "next-intl";
import * as NextIntl from "next-intl";

interface HomePromotionPopupProps {
  banner: Banner | null;
}

export const POPUP_DISMISSED_SESSION_KEY = "home_promo_popup_dismissed_v1";

export function localizePopupBanner(
  banner: Banner | null,
  locale: string,
  fallbackTitle = "Special Offer"
): { title: string; description: string; alt: string } {
  if (!banner) return { title: "", description: "", alt: fallbackTitle };
  const trans = banner.translations?.find((t) => t.locale === locale || t.locale?.startsWith(locale));
  const b = banner as Record<string, any>;
  const rawTitle = (
    locale === "en"
      ? (trans?.title || b.title_en || b.en_title || banner.title || "")
      : (trans?.title || banner.title || "")
  ).trim();
  const rawDesc = (
    locale === "en"
      ? (trans?.description || b.description_en || b.en_description || banner.description || "")
      : (trans?.description || banner.description || "")
  ).trim();

  return { title: rawTitle, description: rawDesc, alt: rawTitle || fallbackTitle };
}

export default function HomePromotionPopup({ banner }: HomePromotionPopupProps) {
  const t = useTranslations("home_popup");
  let locale = "vi";
  try {
    if (typeof (NextIntl as any).useLocale === "function") {
      locale = (NextIntl as any).useLocale() || "vi";
    }
  } catch {
    locale = "vi";
  }
  const [isOpen, setIsOpen] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const bannerId = banner?.id;

  const storageKey = useMemo(() => {
    return bannerId ? `cothao_popup_dismiss_${bannerId}` : "cothao_popup_dismiss_general";
  }, [bannerId]);

  const sessionKey = useMemo(() => {
    return bannerId ? `cothao_popup_session_${bannerId}` : "cothao_popup_session_general";
  }, [bannerId]);

  // Check storage on mount and schedule auto-open with 1.2s delay
  useEffect(() => {
    setIsMounted(true);
    if (!banner) return;

    try {
      const sessionDismissed =
        sessionStorage.getItem(sessionKey) ||
        sessionStorage.getItem(POPUP_DISMISSED_SESSION_KEY) === "true";
      if (sessionDismissed) {
        return;
      }

      const dismissUntil = localStorage.getItem(storageKey);
      if (dismissUntil) {
        const expiryTime = Number(dismissUntil);
        if (!isNaN(expiryTime) && Date.now() < expiryTime) {
          // User chose not to see this popup today
          return;
        }
      }
    } catch (err) {
      console.warn("Could not read popup dismissal from storage:", err);
    }

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(sessionKey, "1");
        sessionStorage.setItem(POPUP_DISMISSED_SESSION_KEY, "true");
      } catch (err) {
        console.warn("Could not save popup session state to sessionStorage:", err);
      }
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [banner, storageKey, sessionKey]);

  // Handle closing modal
  const handleClose = useCallback(() => {
    try {
      sessionStorage.setItem(sessionKey, "1");
      sessionStorage.setItem(POPUP_DISMISSED_SESSION_KEY, "true");
    } catch (err) {
      console.warn("Could not save popup session state to sessionStorage:", err);
    }

    if (doNotShowAgain) {
      try {
        const now = new Date();
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        ).getTime();
        localStorage.setItem(storageKey, String(endOfDay));
      } catch (err) {
        console.warn("Could not save popup dismissal to localStorage:", err);
      }
    }
    setIsOpen(false);
  }, [doNotShowAgain, storageKey, sessionKey]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isMounted || !banner || !isOpen) {
    return null;
  }

  const { title: displayTitle, description: displayDescription } = localizePopupBanner(
    banner,
    locale,
    t("special_offer") || "Special Offer"
  );

  const bannerImage = formatImageUrl(banner.image || banner.image_mobile) || "/cover.jpg";
  const rawLink = banner.link?.trim() || "";
  const hasLink = Boolean(rawLink);

  let resolvedLink = rawLink;
  if (hasLink && locale === "en") {
    if (resolvedLink.startsWith("/san-pham")) {
      resolvedLink = resolvedLink.replace(/^\/san-pham(\/|$)/, "/en/product$1");
    } else if (/^https?:\/\/(www\.)?cothaotomca\.vn\/san-pham(\/|$)/i.test(resolvedLink)) {
      resolvedLink = resolvedLink.replace(/\/san-pham(\/|$)/i, "/en/product$1");
    } else if (resolvedLink.startsWith("/") && !resolvedLink.startsWith("/en")) {
      resolvedLink = `/en${resolvedLink}`;
    }
  }

  const isExternalLink = resolvedLink.startsWith("http://") || resolvedLink.startsWith("https://");

  const trans = banner.translations?.find((tr) => tr.locale === locale || tr.locale?.startsWith(locale));
  const rawButtonText = (
    locale === "en"
      ? (trans?.button_text || (banner as any).button_text_en || banner.button_text || "")
      : (trans?.button_text || banner.button_text || "")
  ).trim();
  const ctaText = rawButtonText || t("view_now") || (locale === "en" ? "Explore Now" : "Xem ngay");

  const imageContent = (
    <div className="relative w-full aspect-video aspect-[16/9] overflow-hidden bg-[#F1EEDF]">
      <Image
        src={bannerImage}
        alt={displayTitle || (locale === "en" ? "Promotion" : "Khuyến mãi")}
        fill
        priority
        sizes="(max-width: 640px) 88vw, 480px"
        className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
      />
    </div>
  );

  const renderBannerLink = (children: React.ReactNode, className?: string) => {
    if (!hasLink || !resolvedLink) return children;
    if (isExternalLink) {
      return (
        <a
          href={resolvedLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClose}
          className={className}
        >
          {children}
        </a>
      );
    }
    return (
      <NextLink
        href={resolvedLink}
        onClick={handleClose}
        className={className}
      >
        {children}
      </NextLink>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-promotion-title"
    >
      {/* Backdrop with dark overlay and blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative z-10 w-[88vw] max-w-[360px] sm:w-full sm:max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#EFF1F5] flex flex-col animate-in zoom-in-95 sm:slide-in-from-bottom-2 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button X (Circular, at least 44x44px touch target) */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 size-9 sm:size-10 rounded-full bg-white/90 sm:bg-white text-gray-500 hover:text-primary hover:bg-[#F1EEDF] transition-all flex items-center justify-center shadow-md cursor-pointer border border-[#EFF1F5]"
          aria-label={t("close") || (locale === "en" ? "Close" : "Đóng")}
        >
          <Close className="size-5 text-gray-600 hover:text-primary transition-colors" />
        </button>

        {/* Banner Graphic (Clickable if link exists) */}
        {renderBannerLink(
          imageContent,
          "block w-full overflow-hidden group focus:outline-none"
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 bg-white text-[#111322]">
          {displayTitle && (
            <h3
              id="home-promotion-title"
              className="font-display font-bold text-lg sm:text-xl text-primary leading-tight text-center"
            >
              {displayTitle}
            </h3>
          )}

          {displayDescription && (
            <p className="font-sans text-xs sm:text-sm text-[#111322]/80 text-center line-clamp-3 leading-relaxed">
              {displayDescription}
            </p>
          )}

          {/* Action Button if link provided */}
          {hasLink && (
            <div className="pt-1 flex justify-center">
              {renderBannerLink(
                <span>{ctaText}</span>,
                "w-full sm:w-auto min-w-[200px] text-center bg-secondary hover:bg-secondary/95 text-white font-display font-bold text-sm sm:text-base py-3 px-6 rounded-full shadow-md shadow-secondary/20 transition-all active:scale-[0.98] inline-block"
              )}
            </div>
          )}

          {/* Bottom Toolbar: Do Not Show Again Today Checkbox */}
          <div className="pt-2 mt-1 border-t border-[#EFF1F5] flex items-center justify-center">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#111322]/70 hover:text-[#111322] transition-colors py-1">
              <input
                type="checkbox"
                checked={doNotShowAgain}
                onChange={(e) => setDoNotShowAgain(e.target.checked)}
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
              />
              <span className="font-sans font-medium">
                {t("do_not_show_today") || (locale === "en" ? "Don't show again today" : "Không hiển thị lại hôm nay")}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
