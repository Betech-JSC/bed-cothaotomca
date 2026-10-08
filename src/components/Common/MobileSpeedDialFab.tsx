"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";
import { useCart } from "@/contexts/CartContext";
import CouponModal from "@/components/Voucher/CouponModal";
import {
  getAvailableVouchers,
  PublicVoucherItem,
  getShippingSettings,
  ShippingSettings,
} from "@/services/orderService";
import {
  getActiveCampaigns,
  PublicCampaignItem,
} from "@/services/campaignService";

export default function MobileSpeedDialFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>([]);
  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>([]);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);

  const settings = useGeneralSettings();
  const { subtotal } = useCart();
  const pathname = usePathname();
  const t = useTranslations();

  // Scroll visibility for scroll-to-top button (> 300px)
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch promotions for coupon modal
  useEffect(() => {
    getAvailableVouchers()
      .then((data) => setVouchers(data))
      .catch(() => setVouchers([]));

    getActiveCampaigns()
      .then((data) => setCampaigns(data))
      .catch(() => setCampaigns([]));

    getShippingSettings()
      .then((data) => setShippingSettings(data))
      .catch(() => setShippingSettings(null));
  }, []);

  // Hide widget on cart/checkout pages to prevent UI interference
  const isExcluded = Boolean(
    pathname &&
      (/(^|\/)(cart|checkout)(\/|$)/.test(pathname) ||
        pathname.endsWith("/cart") ||
        pathname.endsWith("/checkout") ||
        pathname.includes("/cart") ||
        pathname.includes("/checkout"))
  );

  if (isExcluded) return null;

  const hasShippingCard = Boolean(
    shippingSettings?.is_min_amount_enabled && shippingSettings?.card_title
  );
  const totalPromotions = vouchers.length + campaigns.length + (hasShippingCard ? 1 : 0);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setIsOpen(false);
  };

  const hotlineClean = (settings?.hotline || "024.9999.7122").replace(/\s/g, "");
  const zaloUrl = settings?.link_zalo || "https://zalo.me";
  const facebookUrl = settings?.link_facebook || "https://m.me";

  return (
    <>
      {/* Backdrop overlay when speed dial is expanded on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Speed-Dial Container (Mobile only: lg:hidden) */}
      <div className="fixed right-4 bottom-20 z-40 lg:hidden select-none pointer-events-auto flex flex-col items-end">
        {/* Expanded Speed-Dial Action Items */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-3 animate-in slide-in-from-bottom-5 duration-200">
            {/* 1. Nút cuộn lên đầu trang (hiển thị khi cuộn quá 300px) */}
            {showScrollTop && (
              <button
                type="button"
                onClick={scrollToTop}
                className="flex items-center gap-2.5 group cursor-pointer"
                aria-label="Cuộn lên đầu trang"
              >
                <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md border border-gray-100">
                  Lên đầu trang
                </span>
                <div className="size-11 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg border border-white/30 active:scale-95 transition-transform">
                  <span className="mt-1 size-2.5 rotate-45 border-t-2 border-l-2 border-white" />
                </div>
              </button>
            )}

            {/* 2. Hotline CSKH */}
            <a
              href={`tel:${hotlineClean}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="Gọi hotline"
              onClick={() => setIsOpen(false)}
            >
              <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md border border-gray-100">
                Hotline: {settings?.hotline || "024.9999.7122"}
              </span>
              <div className="size-11 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-lg border border-white/30 active:scale-95 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.93947 14.0619C7.64872 11.7712 7.13147 9.48043 7.01478 8.56264C6.98218 8.30887 7.06951 8.05437 7.25106 7.87409L9.10485 6.02112C9.37755 5.74859 9.42594 5.32387 9.22154 4.99698L6.26996 0.41381C6.04383 0.0518439 5.57952 -0.0787932 5.19782 0.112155L0.459474 2.34374C0.150809 2.49573 -0.0307442 2.82368 0.00430138 3.16595C0.252577 5.52457 1.28085 11.3226 6.97878 17.021C12.6767 22.7193 18.474 23.7472 20.8338 23.9955C21.1761 24.0305 21.504 23.849 21.656 23.5403L23.8876 18.8019C24.0778 18.4211 23.9481 17.958 23.5876 17.7315L19.0044 14.7807C18.6777 14.5761 18.253 14.6241 17.9803 14.8966L16.1273 16.7504C15.9471 16.9319 15.6926 17.0192 15.4388 16.9866C14.521 16.8699 12.2302 16.3527 9.93947 14.0619Z" fill="currentColor" />
                </svg>
              </div>
            </a>

            {/* 3. Zalo Chat */}
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="Chat Zalo"
              onClick={() => setIsOpen(false)}
            >
              <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md border border-gray-100">
                Chat Zalo
              </span>
              <div className="size-11 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-lg border border-white/30 active:scale-95 transition-transform">
                <span className="font-bold text-xs tracking-tighter">Zalo</span>
              </div>
            </a>

            {/* 4. Facebook Messenger */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="Nhắn tin Facebook"
              onClick={() => setIsOpen(false)}
            >
              <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md border border-gray-100">
                Messenger
              </span>
              <div className="size-11 rounded-full bg-[#0084FF] text-white flex items-center justify-center shadow-lg border border-white/30 active:scale-95 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.24004 0 0 4.95168 0 11.64C0 15.1384 1.43376 18.1615 3.76867 20.2495C3.96468 20.425 4.083 20.6707 4.09104 20.9338L4.15639 23.0683C4.17727 23.7492 4.88057 24.1922 5.50361 23.9172L7.88544 22.8658C8.08735 22.7767 8.3136 22.7602 8.52636 22.8187C9.62088 23.1197 10.7858 23.28 12 23.28C18.76 23.28 24 18.3283 24 11.64C24 4.95168 18.76 0 12 0Z" fill="white" />
                  <path d="M4.79381 15.0441L8.31881 9.4516C8.87953 8.56192 10.0802 8.3404 10.9216 8.97136L13.7252 11.0741C13.9824 11.267 14.3363 11.266 14.5925 11.0716L18.3789 8.19796C18.8843 7.81444 19.544 8.41924 19.2058 8.95595L15.6808 14.5485C15.12 15.4381 13.9193 15.6597 13.078 15.0287L10.2743 12.9259C10.0171 12.733 9.66317 12.734 9.40705 12.9284L5.62061 15.8021C5.11525 16.1856 4.45553 15.5808 4.79381 15.0441Z" fill="#0084FF" />
                </svg>
              </div>
            </a>

            {/* 5. Nút mở bảng ưu đãi / khuyến mãi */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCouponModalOpen(true);
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
              aria-label="Xem ưu đãi và khuyến mãi"
            >
              <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md border border-gray-100 flex items-center gap-1.5">
                <span>Ưu đãi & Khuyến mãi</span>
                {totalPromotions > 0 && (
                  <span className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {totalPromotions}
                  </span>
                )}
              </span>
              <div className="size-11 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg border border-white/30 active:scale-95 transition-transform">
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2.5 2.5 0 0 0 0-5V6z" />
                  <path d="M9 12h6" strokeDasharray="2 2" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* Master FAB Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative size-13 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] border-2 border-white/30 active:scale-90 cursor-pointer ${
            isOpen ? "bg-primary text-yellow rotate-90" : "bg-secondary text-white"
          }`}
          aria-label={isOpen ? "Đóng menu liên hệ" : "Mở menu liên hệ và ưu đãi"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            /* Close X Icon */
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* CSKH / Headset Icon */
            <svg className="size-6.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          )}

          {/* Promotion Notification Dot */}
          {!isOpen && totalPromotions > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow border-2 border-primary" />
            </span>
          )}
        </button>
      </div>

      {/* Modal Ưu đãi khi bấm từ FAB */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        subtotal={subtotal}
        shippingSettings={shippingSettings}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
        isBrowseOnly={true}
        campaigns={campaigns}
        vouchers={vouchers}
      />
    </>
  );
}
