"use client";

import React from "react";
import { useTranslations } from "next-intl";

export interface VoucherTicketBarProps {
  appliedVoucher?: {
    id?: number;
    code: string;
    short_name?: string | null;
    value?: number;
    discountType?: string;
    maxDiscount?: number | null;
    max_discount?: number | null;
    discountAmount?: number;
    isFreeship?: boolean;
    is_freeship?: boolean;
  } | null;
  appliedShippingVoucher?: {
    id?: number;
    code: string;
    short_name?: string | null;
    value?: number;
    discountType?: string;
    maxDiscount?: number | null;
    max_discount?: number | null;
    discountAmount?: number;
    isFreeship?: boolean;
    is_freeship?: boolean;
  } | null;
  activeCampaignName?: string | null;
  onClick: () => void;
  onRemove?: () => void;
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
      className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase font-bold bg-[#FDF0ED] border border-[#CD4829] text-[#CD4829] select-none shrink-0"
    >
      <span className="truncate max-w-[120px] sm:max-w-[180px]">{text}</span>
    </span>
  );
}

export function FreeshipTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="freeship-ticket-badge"
      className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase font-bold bg-[#EBF0FA] border border-[#142A68] text-[#142A68] select-none shrink-0"
    >
      <span className="truncate max-w-[140px] sm:max-w-[200px]">{text}</span>
    </span>
  );
}

export function CampaignTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="campaign-ticket-badge"
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-[#FEF9E7] border border-[#F5D585] text-[#8A5800] select-none shrink-0"
    >
      <span className="truncate max-w-[140px] sm:max-w-[200px]">{text}</span>
    </span>
  );
}

export default function VoucherTicketBar({
  appliedVoucher,
  appliedShippingVoucher,
  activeCampaignName,
  onClick,
  onRemove,
  className = "",
}: VoucherTicketBarProps) {
  const t = useTranslations("voucher");

  const title = t("voucher_ticket_title") || "Mã giảm giá (Voucher)";
  const placeholder = t("no_voucher_applied") || "Chọn hoặc nhập mã ưu đãi";
  const freeshipBadgeText = t("freeship_badge_text") || "FREESHIP";
  const shippingDiscountBadgeText = t("shipping_discount_badge_text") || "GIẢM SHIP";

  // Determine food and shipping badges
  let foodVoucher = appliedVoucher && !isShippingVoucher(appliedVoucher) ? appliedVoucher : null;
  let shipVoucher = appliedShippingVoucher;

  // Fallback: If appliedVoucher happens to be a freeship voucher and appliedShippingVoucher is null
  if (!shipVoucher && appliedVoucher && isShippingVoucher(appliedVoucher)) {
    shipVoucher = appliedVoucher;
  }

  const hasAnyVoucher = Boolean(foodVoucher || shipVoucher || activeCampaignName);
  const appliedCount = (foodVoucher ? 1 : 0) + (shipVoucher ? 1 : 0) + (activeCampaignName ? 1 : 0);

  const maxDiscountVal = shipVoucher ? (shipVoucher.maxDiscount ?? shipVoucher.max_discount) : null;
  const shipBadgeText = shipVoucher
    ? shipVoucher.short_name && shipVoucher.short_name.trim()
      ? shipVoucher.short_name.trim()
      : maxDiscountVal && Number(maxDiscountVal) > 0
        ? shippingDiscountBadgeText
        : freeshipBadgeText
    : "";

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Tiêu đề ngoài khung (phía trên) */}
      <label className="block text-primary font-bold font-display text-base mb-2 select-none">
        {title}
      </label>

      {/* 2. Khung chứa dạng Capsule viên thuốc */}
      <div className="rounded-full border border-gray-300 py-2.5 px-3.5 min-h-[46px] bg-white flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap shadow-xs">
        {/* Bên trái (Chips hoặc Placeholder) */}
        <div
          onClick={onClick}
          className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1 cursor-pointer pl-1"
        >
          {hasAnyVoucher ? (
            <>
              {foodVoucher && (
                <FoodTicketBadge text={foodVoucher.short_name || formatVoucherBadgeText(foodVoucher)} />
              )}
              {shipVoucher && (
                <FreeshipTicketBadge text={shipBadgeText} />
              )}
              {activeCampaignName && (
                <CampaignTicketBadge text={activeCampaignName} />
              )}
            </>
          ) : (
            <span className="text-gray-400 font-medium text-xs sm:text-sm pl-3 select-none">
              {placeholder}
            </span>
          )}
        </div>

        {/* Bên phải (Nút chức năng) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onClick}
            className="rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer select-none transition-all"
            aria-label={t("btn_select_voucher") || "Chọn mã"}
          >
            {t("btn_select_voucher") || "Chọn mã"}
          </button>
          {hasAnyVoucher && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-full px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer select-none transition-all"
              aria-label={t("btn_remove_voucher") || "Xóa"}
            >
              {t("btn_remove_voucher") || "Xóa"}
            </button>
          )}
        </div>
      </div>

      {/* 3. Dòng trạng thái bên dưới khung */}
      {appliedCount > 0 && (
        <p className="text-xs text-emerald-700 font-semibold px-2 flex items-center gap-1.5 mt-1.5 animate-fade-in">
          <span>✓</span>
          <span>
            {t("applied_vouchers_success_count", { count: appliedCount }) ||
              `Đã áp dụng thành công ${appliedCount} ưu đãi!`}
          </span>
        </p>
      )}
    </div>
  );
}

export { VoucherTicketBar as VoucherCapsuleBar };
