"use client";

import React from "react";
import { useTranslations } from "next-intl";

export interface VoucherTicketBarProps {
  appliedVoucher?: {
    id?: number;
    code: string;
    value?: number;
    discountType?: string;
    maxDiscount?: number | null;
    discountAmount?: number;
    isFreeship?: boolean;
  } | null;
  appliedShippingVoucher?: {
    id?: number;
    code: string;
    value?: number;
    discountType?: string;
    maxDiscount?: number | null;
    discountAmount?: number;
    isFreeship?: boolean;
  } | null;
  onClick: () => void;
  className?: string;
}

export function formatVoucherBadgeText(voucher: {
  discountAmount?: number;
  value?: number;
  discountType?: string;
  code?: string;
}): string {
  if (voucher.discountAmount && voucher.discountAmount > 0) {
    const amt = voucher.discountAmount;
    if (amt % 1000 !== 0) {
      const k = (amt / 1000).toFixed(1).replace(".", ",");
      return `-${k}kđ`;
    }
    return `-${new Intl.NumberFormat("vi-VN").format(amt)}đ`;
  }
  if (voucher.discountType === "percent" && voucher.value) {
    return `-${voucher.value}%`;
  }
  if (voucher.value && voucher.value > 0) {
    const amt = voucher.value;
    if (amt % 1000 !== 0) {
      const k = (amt / 1000).toFixed(1).replace(".", ",");
      return `-${k}kđ`;
    }
    return `-${new Intl.NumberFormat("vi-VN").format(amt)}đ`;
  }
  return voucher.code ? `-${voucher.code}` : "";
}

export function isShippingVoucher(v: { code: string; discountType?: string; isFreeship?: boolean }): boolean {
  return Boolean(
    v.isFreeship ||
    v.discountType === "freeship" ||
    v.code.toUpperCase().includes("FREESHIP") ||
    v.code.toUpperCase().includes("PHISHIP") ||
    /^SHIP(\d+|K)?$/i.test(v.code)
  );
}

export function FoodTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="food-ticket-badge"
      className="relative inline-flex items-center px-2.5 py-1 text-xs font-bold font-sans text-[#CD4829] bg-[#FFF5F2] border border-[#CD4829]/30 rounded-md select-none shrink-0"
    >
      {/* Left notch */}
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-r border-[#CD4829]/30" />
      {/* Right notch */}
      <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-l border-[#CD4829]/30" />
      <span className="truncate max-w-[120px] sm:max-w-[180px]">{text}</span>
    </span>
  );
}

export function FreeshipTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="freeship-ticket-badge"
      className="relative inline-flex items-center px-2.5 py-1 text-xs font-bold font-sans text-[#00BFA5] bg-[#F0FDF9] border border-[#00BFA5]/30 rounded-md select-none shrink-0"
    >
      {/* Left notch */}
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-r border-[#00BFA5]/30" />
      {/* Right notch */}
      <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-l border-[#00BFA5]/30" />
      <span className="truncate max-w-[140px] sm:max-w-[200px]">{text}</span>
    </span>
  );
}

export default function VoucherTicketBar({
  appliedVoucher,
  appliedShippingVoucher,
  onClick,
  className = "",
}: VoucherTicketBarProps) {
  const t = useTranslations("voucher");

  const title = t("voucher_ticket_title") || "Mã giảm giá (Voucher)";
  const placeholder = t("select_or_enter_voucher") || "Chọn hoặc nhập mã";
  const freeshipBadgeText = t("freeship_badge_text") || "Miễn Phí Vận Chuyển";

  // Determine food and shipping badges
  let foodVoucher = appliedVoucher && !isShippingVoucher(appliedVoucher) ? appliedVoucher : null;
  let shipVoucher = appliedShippingVoucher;

  // Fallback: If appliedVoucher happens to be a freeship voucher and appliedShippingVoucher is null
  if (!shipVoucher && appliedVoucher && isShippingVoucher(appliedVoucher)) {
    shipVoucher = appliedVoucher;
  }

  const hasAnyVoucher = Boolean(foodVoucher || shipVoucher);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${title}: ${hasAnyVoucher ? "Đã áp dụng mã" : placeholder}`}
      className={`w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-white hover:bg-gray-50/80 active:bg-gray-100/90 rounded-2xl border border-gray-200 hover:border-secondary/40 transition-all cursor-pointer shadow-xs group ${className}`}
    >
      {/* Left side: Brand Ticket Icon + Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 flex items-center justify-center text-[#CD4829] shrink-0 group-hover:scale-105 transition-transform">
          <svg
            className="w-5 h-5 fill-none stroke-current"
            viewBox="0 0 24 24"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2.5 2.5 0 0 0 0-5V6z" />
            <path d="M9 12h6" strokeDasharray="2 2" />
          </svg>
        </div>
        <span className="font-display font-bold text-sm sm:text-base text-primary tracking-tight truncate">
          {title}
        </span>
      </div>

      {/* Right side: Ticket Badges or Placeholder */}
      <div className="flex items-center gap-2 min-w-0 shrink-0 justify-end">
        {hasAnyVoucher ? (
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
            {foodVoucher && (
              <FoodTicketBadge text={formatVoucherBadgeText(foodVoucher)} />
            )}
            {shipVoucher && (
              <FreeshipTicketBadge text={freeshipBadgeText} />
            )}
            <span className="text-gray-400 group-hover:text-secondary text-base leading-none pl-0.5 transition-colors select-none">
              ›
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-400 group-hover:text-secondary transition-colors text-xs sm:text-sm font-medium select-none">
            <span>{placeholder}</span>
            <span className="text-base leading-none">›</span>
          </div>
        )}
      </div>
    </div>
  );
}
