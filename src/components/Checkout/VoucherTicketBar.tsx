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
  memberTierName?: string;
  memberDiscountAmount?: number;
  memberDiscountPercent?: number;
  isMemberApplied?: boolean;
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

export function formatMemberBadgeText(
  tierName?: string,
  amount?: number,
  percent?: number,
  memberPrefix: string = "Hội viên"
): string {
  if (tierName && (tierName.includes("-") || tierName.includes("%"))) {
    return tierName;
  }
  const tier = (tierName || "").trim();
  if (amount && amount > 0) {
    if (amount % 1000 !== 0) {
      const k = (amount / 1000).toFixed(1).replace(".", ",");
      return tier ? `${tier} -${k}kđ` : `-${k}kđ`;
    }
    const k = `${amount / 1000}k`;
    return tier ? `${tier} -${k}` : `-${k}`;
  }
  if (percent && percent > 0) {
    return tier ? `${tier} -${percent}%` : `-${percent}%`;
  }
  return tier
    ? tier.toLowerCase().includes("hội viên") ||
      tier.toLowerCase().includes("hạng") ||
      tier.toLowerCase().includes("member")
      ? tier
      : `${memberPrefix} ${tier}`
    : memberPrefix;
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
      className="inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs uppercase font-bold bg-[#FDF0ED] border border-[#CD4829] text-[#CD4829] select-none shrink-0"
    >
      <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[180px]">{text}</span>
    </span>
  );
}

export function FreeshipTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="freeship-ticket-badge"
      className="inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs uppercase font-bold bg-[#EBF0FA] border border-[#142A68] text-[#142A68] select-none shrink-0"
    >
      <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[200px]">{text}</span>
    </span>
  );
}

export function CampaignTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="campaign-ticket-badge"
      className="inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold bg-[#FEF9E7] border border-[#F5D585] text-[#8A5800] select-none shrink-0"
    >
      <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[200px]">{text}</span>
    </span>
  );
}

export function MemberTicketBadge({ text }: { text: string }) {
  return (
    <span
      data-testid="member-ticket-badge"
      className="inline-flex items-center rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold bg-[#F3E8FF] border border-[#A855F7] text-[#6B21A8] select-none shrink-0"
    >
      <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[160px]">{text}</span>
    </span>
  );
}

export function TicketIcon({ className = "size-4 sm:size-5 text-[#CD4829]" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
      />
    </svg>
  );
}

export function ChevronRightIcon({ className = "size-4 text-gray-400" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function CloseIcon({ className = "size-3.5 text-gray-400" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function VoucherTicketBar({
  appliedVoucher,
  appliedShippingVoucher,
  activeCampaignName,
  memberTierName,
  memberDiscountAmount,
  memberDiscountPercent,
  isMemberApplied,
  onClick,
  onRemove,
  className = "",
}: VoucherTicketBarProps) {
  const t = useTranslations("voucher");

  const title = t("voucher_ticket_title") || "Mã giảm giá";
  const placeholder = t("no_voucher_applied") || "Chọn hoặc nhập mã";
  const freeshipBadgeText = t("freeship_badge_text") || "FREESHIP";
  const shippingDiscountBadgeText = t("shipping_discount_badge_text") || "GIẢM SHIP";

  // Determine food and shipping badges
  let foodVoucher = appliedVoucher && !isShippingVoucher(appliedVoucher) ? appliedVoucher : null;
  let shipVoucher = appliedShippingVoucher;

  // Fallback: If appliedVoucher happens to be a freeship voucher and appliedShippingVoucher is null
  if (!shipVoucher && appliedVoucher && isShippingVoucher(appliedVoucher)) {
    shipVoucher = appliedVoucher;
  }

  const isMemberActive = Boolean(
    isMemberApplied && (memberDiscountAmount !== undefined ? memberDiscountAmount > 0 : true)
  );
  const hasAnyVoucher = Boolean(foodVoucher || shipVoucher || activeCampaignName || isMemberActive);
  const appliedCount =
    (foodVoucher ? 1 : 0) +
    (shipVoucher ? 1 : 0) +
    (activeCampaignName ? 1 : 0) +
    (isMemberActive ? 1 : 0);

  const memberBadgePrefix = t("member_badge_prefix") || "Hội viên";

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
      {/* Khung chứa dạng Shopee 1 hàng ngang duy nhất */}
      <div
        data-testid="voucher-ticket-bar"
        onClick={onClick}
        className={`rounded-full border border-gray-300 hover:border-secondary/40 ${
          !hasAnyVoucher
            ? "min-h-[48px] px-3.5 py-2.5 sm:px-4 sm:py-3"
            : "min-h-[48px] py-2.5 px-3.5 sm:px-4"
        } bg-white flex items-center justify-between gap-2 flex-nowrap shadow-xs cursor-pointer transition-colors`}
      >
        {/* Bên trái: Icon Vé Ưu đãi (Ticket SVG màu cam/đỏ) + Label "Mã giảm giá" */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-max">
          <TicketIcon className="size-4 sm:size-5 text-[#CD4829] shrink-0" />
          <span
            className={`text-primary font-bold font-display text-xs sm:text-sm whitespace-nowrap select-none ${
              hasAnyVoucher ? "hidden sm:inline" : ""
            }`}
          >
            {title}
          </span>
        </div>

        {/* Ở giữa: Badge tóm tắt ưu đãi thu gọn hoặc khoảng trống co giãn */}
        {hasAnyVoucher ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1 justify-start">
            {foodVoucher && (
              <FoodTicketBadge text={foodVoucher.short_name || formatVoucherBadgeText(foodVoucher)} />
            )}
            {shipVoucher && (
              <FreeshipTicketBadge text={shipBadgeText} />
            )}
            {activeCampaignName && (
              <CampaignTicketBadge text={activeCampaignName} />
            )}
            {isMemberActive && (
              <MemberTicketBadge
                text={formatMemberBadgeText(memberTierName, memberDiscountAmount, memberDiscountPercent, memberBadgePrefix)}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 min-w-0" />
        )}

        {/* Bên phải:
            - Nếu chưa có mã: [Chọn hoặc nhập mã] nằm sát cạnh icon mũi tên > (gap-1.5)
            - Nếu đã có mã: Nút gỡ mã nhanh ✕ (khi có onRemove) + Icon mũi tên >
        */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0 justify-end">
          {!hasAnyVoucher && (
            <span className="text-gray-400 font-normal text-xs sm:text-sm truncate select-none">
              {placeholder}
            </span>
          )}
          {hasAnyVoucher && onRemove && (
            <button
              type="button"
              data-testid="remove-voucher-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="size-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all cursor-pointer shrink-0"
              aria-label={t("btn_remove_voucher") || "Xóa"}
              title={t("btn_remove_voucher") || "Xóa"}
            >
              <CloseIcon className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={t("btn_select_voucher") || "Chọn mã"}
            className="size-6 flex items-center justify-center text-gray-400 hover:text-primary transition-colors cursor-pointer shrink-0"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Dòng trạng thái bên dưới khung */}
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
