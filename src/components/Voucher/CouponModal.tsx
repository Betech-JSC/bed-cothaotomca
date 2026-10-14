"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { formatPrice, formatImageUrl } from "@/lib/format";
import {
  PublicVoucherItem,
  getAvailableVouchers,
  validateVoucher,
  ActivePromotion,
  getShippingSettings,
  ShippingSettings,
  getLoyaltySettings,
  LoyaltySettings,
} from "@/services/orderService";
import {
  PublicCampaignItem,
  getActiveCampaigns,
  CampaignEligibilityResult,
  CampaignLockResult,
} from "@/services/campaignService";
import { mergeCampaignObjects } from "@/types/campaign";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useAuth, StorefrontUser, getMemberTier } from "@/contexts/AuthContext";

const VIETNAMESE_DIACRITICS_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function formatPrivateVoucherError(errMsg: string): string {
  const msgLower = (errMsg || "").toLowerCase();
  if (
    msgLower.includes("chưa đạt giá trị đơn tối thiểu") ||
    msgLower.includes("đơn hàng tối thiểu") ||
    msgLower.includes("chỉ áp dụng cho đơn hàng từ")
  ) {
    return errMsg;
  }
  if (msgLower.includes("hết hạn") || msgLower.includes("expired")) {
    return errMsg || "Mã giảm giá đã hết hạn sử dụng.";
  }
  if (
    msgLower.includes("chỉ dành cho khách hàng thành viên") ||
    msgLower.includes("chỉ dành riêng cho thành viên") ||
    msgLower.includes("vui lòng đăng nhập") ||
    msgLower.includes("đạt hạng") ||
    msgLower.includes("hạng") ||
    msgLower.includes("tối thiểu") ||
    msgLower.includes("chưa đủ điều kiện") ||
    msgLower.includes("chương trình khuyến mãi hiện tại không áp dụng") ||
    msgLower.includes("không áp dụng đồng thời") ||
    msgLower.includes("miễn phí vận chuyển tự động") ||
    msgLower.includes("sản phẩm") ||
    msgLower.includes("món") ||
    msgLower.includes("danh mục")
  ) {
    return "Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.";
  }
  return "Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.";
}

export interface CartItemProductEligibilityCheck {
  id?: number | string;
  product_id?: number | string;
  productId?: number | string;
  product_variant_id?: number | string | null;
  variantId?: number | string | null;
  variant_id?: number | string | null;
  parentProductId?: number | string | null;
  parent_product_id?: number | string | null;
  db_id?: number | string | null;
  product_db_id?: number | string | null;
  variant_db_id?: number | string | null;
  productCode?: string | null;
  product_code?: string | null;
  code?: string | null;
  sku?: string | null;
  kiotviet_id?: number | string | null;
  kiotvietId?: number | string | null;
  variant?: string | null;
  variant_name?: string | null;
  variant_vi?: string | null;
  variant_en?: string | null;
  name?: string | null;
  product_name?: string | null;
  title?: string | null;
  title_vi?: string | null;
  title_en?: string | null;
  quantity?: number;
}

export interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal?: number;
  originalSubtotal?: number;
  shippingFee?: number;
  shippingFeeDiscount?: number;
  isFreeship?: boolean;
  isAutoFreeship?: boolean;
  isAutoShippingDiscountActive?: boolean;
  canCombineWithFreeship?: boolean;
  isFreeshipBlocked?: boolean;
  appliedVoucherCode?: string;
  appliedVoucherCodes?: string[];
  appliedCampaignIds?: (number | string)[];
  cartItems?: CartItemProductEligibilityCheck[];
  onApplyVoucher?: (code: string) => Promise<boolean | void> | void;
  onApplyVouchers?: (codes: string[]) => Promise<boolean | void> | void;
  onApplyCampaigns?: (ids: (number | string)[]) => Promise<void> | void;
  onRemoveVoucher?: () => void;
  isBrowseOnly?: boolean;
  activePromotions?: ActivePromotion[];
  user?: StorefrontUser | null;
  memberTier?: string;
  shippingSettings?: ShippingSettings | null;
  privateVouchers?: PublicVoucherItem[];
  onAddPrivateVoucher?: (voucher: PublicVoucherItem) => void;
  campaigns?: PublicCampaignItem[];
  vouchers?: PublicVoucherItem[];
  isMemberCardSelected?: boolean;
  onToggleMemberCard?: (selected: boolean) => void;
  loyaltySettings?: LoyaltySettings | null;
}

// Module-level in-memory cache keyed by locale to prevent layout shift / flickering on open
let cachedCampaigns: Record<string, PublicCampaignItem[]> = {};
let cachedVouchers: Record<string, PublicVoucherItem[]> = {};

export function resetCouponModalCache(): void {
  cachedCampaigns = {};
  cachedVouchers = {};
}

function CampaignBannerImage({
  camp,
  className = "object-cover",
  isLocked = false,
  isSelected = false,
  fallbackTag = "ƯU ĐÃI",
}: {
  camp: {
    name: string;
    banner?: string | null;
    image?: string | null;
    items?: Array<{ image?: string | null }>;
  };
  className?: string;
  isLocked?: boolean;
  isSelected?: boolean;
  fallbackTag?: string;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);

  const candidates = useMemo(() => {
    const list: string[] = [];
    if (camp.banner && typeof camp.banner === "string" && camp.banner.trim()) {
      list.push(camp.banner.trim());
    }
    if (camp.image && typeof camp.image === "string" && camp.image.trim()) {
      list.push(camp.image.trim());
    }
    if (camp.items && camp.items.length > 0) {
      for (const item of camp.items) {
        if (item?.image && typeof item.image === "string" && item.image.trim()) {
          list.push(item.image.trim());
          break;
        }
      }
    }
    return Array.from(new Set(list));
  }, [camp.banner, camp.image, camp.items]);

  const currentSrc = candidates[candidateIndex];

  if (currentSrc) {
    return (
      <Image
        src={formatImageUrl(currentSrc)}
        alt={camp.name}
        fill
        className={className}
        onError={() => setCandidateIndex((prev) => prev + 1)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-1 w-full h-full select-none ${
        isLocked && !isSelected ? "text-gray-400" : "text-secondary"
      }`}
    >
      <svg
        className="w-7 h-7 mb-1 opacity-80"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          d="M12 8v13m0-13V4.5a2.5 2.5 0 1 1 5 0v3.5h-5Zm0 0V4.5a2.5 2.5 0 1 0-5 0v3.5h5Zm-8 4h16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z"
        />
      </svg>
      <span className="title-4 font-display font-bold uppercase text-[10px] tracking-wide leading-tight">
        {fallbackTag}
      </span>
    </div>
  );
}

function formatCampaignDuration(
  startAt?: string | null,
  endAt?: string | null,
  t?: (key: string, values?: any) => string
): string {
  if (!startAt && !endAt) return t ? t("duration_ongoing") : "Đang diễn ra liên tục";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return { dayMonth: `${day}/${month}`, full: `${day}/${month}/${year}` };
  };

  if (startAt && endAt) {
    const s = formatDate(startAt);
    const e = formatDate(endAt);
    return `${s.dayMonth} - ${e.full}`;
  }
  if (startAt) {
    const fullDate = formatDate(startAt).full;
    return t ? t("duration_from", { date: fullDate }) : `Bắt đầu từ ${fullDate}`;
  }
  const fullDate = formatDate(endAt!).full;
  return t ? t("duration_until", { date: fullDate }) : `Đến hết ngày ${fullDate}`;
}

export function isShipVoucher(v: { code: string; discount_type?: string; is_freeship?: boolean }): boolean {
  return Boolean(
    v.is_freeship ||
    v.discount_type === "freeship" ||
    v.code.toUpperCase().includes("FREESHIP") ||
    v.code.toUpperCase().includes("PHISHIP") ||
    /^SHIP(\d+|K)?$/i.test(v.code)
  );
}

export function isFoodVoucher(v: { code: string; discount_type?: string; is_freeship?: boolean }): boolean {
  return !isShipVoucher(v);
}

export function getCampaignEstimatedValue(camp: PublicCampaignItem, subtotal: number): number {
  if (camp.discount_type === "percent" && camp.discount_value) {
    const val = (subtotal * camp.discount_value) / 100;
    return camp.max_discount ? Math.min(val, camp.max_discount) : val;
  }
  if (camp.discount_type === "fixed" && camp.discount_value) {
    return Math.min(camp.discount_value, subtotal);
  }
  if (camp.promotion_type === "order_gift_discount" && camp.items && camp.items.length > 0) {
    const gift = camp.items[0];
    return Math.max(0, gift.original_price - (gift.campaign_price || 0));
  }
  if (camp.discount_value) {
    return camp.discount_value;
  }
  return 0;
}

export function getVoucherBadgeLabel(
  v: PublicVoucherItem,
  isFreeship: boolean,
  t?: (key: string) => string
): string {
  if (v.short_name && v.short_name.trim()) {
    return v.short_name.trim();
  }
  if (isFreeship) {
    const maxDiscount = v.max_discount ?? (v as any).maxDiscount;
    if (maxDiscount && Number(maxDiscount) > 0) {
      return t ? t("badge_ship_discount") : "GIẢM SHIP";
    }
    return t ? t("badge_freeship") : "FREESHIP";
  }
  if (v.discount_type === "percent") {
    return `-${v.value}%`;
  }
  return `-${formatPrice(v.value)}`;
}

const toPositiveNumber = (val: any): number | null => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return !isNaN(num) && num > 0 ? num : null;
};

const normStr = (str?: string | null) =>
  (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()_\-–—[\],.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isNameMatch = (a?: string | null, b?: string | null) => {
  const na = normStr(a);
  const nb = normStr(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const isVariantNameCompatible = (itemVariant?: string | null, targetName?: string | null) => {
  if (!itemVariant || !targetName) return false;
  if (isNameMatch(itemVariant, targetName)) return true;

  // Khi biến thể có hậu tố ngôn ngữ trong ngoặc như "Set 2 (Japanese Rice)" vs "Set 2 (Cơm gạo Nhật)",
  // trích xuất phần định danh biến thể trước dấu "(" để đối chiếu chính xác ("set 2" === "set 2").
  const rawBaseItem = String(itemVariant).split("(")[0];
  const rawBaseTarget = String(targetName).split("(")[0];
  const baseItem = normStr(rawBaseItem);
  const baseTarget = normStr(rawBaseTarget);
  if (baseItem && baseTarget && baseItem.length >= 2 && baseItem === baseTarget) {
    return true;
  }

  return false;
};

export interface ExtractedTriggerMeta {
  ti: any;
  tiProductId: number | null;
  tiVariantId: number | null;
  tiVariantName: string | null;
  tiProductName: string | null;
  productIds: number[];
  variantIds: number[];
  allProductVariantIds: number[];
  kiotvietIds: number[];
  variantKiotvietIds: number[];
  productCodes: string[];
  variantNames: string[];
  productNames: string[];
  names: string[];
  hasSpecificVariant: boolean;
}

export function extractTriggerMeta(c: PublicCampaignItem | ActivePromotion): {
  settingsObj: Record<string, any>;
  triggerItems: any[];
  hasTriggerItems: boolean;
  triggerMetaList: ExtractedTriggerMeta[];
} {
  let settingsObj: Record<string, any> = {};
  if (typeof c.settings === "object" && c.settings !== null) {
    settingsObj = c.settings as Record<string, any>;
  } else if (typeof c.settings === "string") {
    try {
      settingsObj = JSON.parse(c.settings);
    } catch {
      settingsObj = {};
    }
  }

  const rawTriggerItems: any[] =
    (Array.isArray(settingsObj.trigger_items) && settingsObj.trigger_items.length > 0)
      ? settingsObj.trigger_items
      : (Array.isArray((c as any).trigger_items) && (c as any).trigger_items.length > 0)
        ? (c as any).trigger_items
        : (Array.isArray(settingsObj.conditions?.trigger_items) && settingsObj.conditions.trigger_items.length > 0)
          ? settingsObj.conditions.trigger_items
          : (Array.isArray((c as any).conditions?.trigger_items) && (c as any).conditions.trigger_items.length > 0)
            ? (c as any).conditions.trigger_items
            : (Array.isArray((c as any).conditions) && (c as any).conditions.length > 0)
              ? (c as any).conditions
              : (Array.isArray(settingsObj.trigger_product_ids) && settingsObj.trigger_product_ids.length > 0)
                ? settingsObj.trigger_product_ids
                : (settingsObj.trigger_items ?? (c as any).trigger_items ?? []);

  // Nếu settings không có trigger_items nhưng c.items có các item không phải quà tặng miễn phí (!is_free),
  // đó chính là các sản phẩm kích hoạt của campaign
  let triggerItems = [...rawTriggerItems];
  if (
    triggerItems.length === 0 &&
    Array.isArray(c.items) &&
    (c.promotion_type as string) !== "order_gift_discount" &&
    (c.promotion_type as string) !== "order_gift"
  ) {
    const nonFreeItems = c.items.filter((ci: any) => ci && !ci.is_free && ci.campaign_price !== 0 && ci.price !== 0);
    if (nonFreeItems.length > 0) {
      triggerItems = nonFreeItems;
    }
  }

  const hasTriggerItems = Array.isArray(triggerItems) && triggerItems.length > 0;
  const campaignItems: any[] = Array.isArray(c.items) ? c.items : [];

  const triggerMetaList: ExtractedTriggerMeta[] = triggerItems.map((ti: any) => {
    const rawTiPId = (typeof ti === "number" || typeof ti === "string")
      ? ti
      : (ti?.product_id ?? ti?.id ?? ti?.productId ?? ti?.product?.id);
    const tiProductId = toPositiveNumber(rawTiPId);

    const rawTiVId = (ti && typeof ti === "object")
      ? (ti.product_variant_id ?? ti.variant_id ?? ti.variantId ?? ti.productVariantId)
      : null;
    const tiVariantId = toPositiveNumber(rawTiVId);

    const tiVariantDbIds: number[] = (ti && typeof ti === "object" && Array.isArray(ti.variant_db_ids))
      ? ti.variant_db_ids.map(toPositiveNumber).filter((id: number | null): id is number => id !== null)
      : [];

    const rawTiKId = (ti && typeof ti === "object")
      ? (ti.kiotviet_id ?? ti.kiotvietId ?? ti.kiot_viet_id)
      : null;
    const tiKiotvietId = toPositiveNumber(rawTiKId);

    const tiProductKiotvietId = (ti && typeof ti === "object")
      ? toPositiveNumber(ti.product_kiotviet_id ?? ti.productKiotvietId)
      : null;

    const tiVariantKiotvietId = (ti && typeof ti === "object")
      ? toPositiveNumber(ti.variant_kiotviet_id ?? ti.variantKiotvietId)
      : null;

    const tiVariantKiotvietIds: number[] = (ti && typeof ti === "object" && Array.isArray(ti.variant_kiotviet_ids))
      ? ti.variant_kiotviet_ids.map(toPositiveNumber).filter((id: number | null): id is number => id !== null)
      : [];

    const tiProductCode = (ti && typeof ti === "object")
      ? (ti.product_code ?? ti.productCode ?? ti.code ?? ti.sku ?? null)
      : null;

    const tiVariantCodes: string[] = (ti && typeof ti === "object" && Array.isArray(ti.variant_codes))
      ? ti.variant_codes.filter(Boolean).map((s: any) => String(s))
      : [];

    const tiVariantName = (ti && typeof ti === "object")
      ? (ti.variant_name ?? ti.variantName ?? ti.variant ?? ti.size ?? null)
      : null;
    const tiVariantNameEn = (ti && typeof ti === "object")
      ? (ti.variant_name_en ?? ti.variantNameEn ?? ti.variant_en ?? ti.size_en ?? null)
      : null;
    const tiVariantNameVi = (ti && typeof ti === "object")
      ? (ti.variant_name_vi ?? ti.variantNameVi ?? ti.variant_vi ?? ti.size_vi ?? null)
      : null;

    const tiProductName = (ti && typeof ti === "object")
      ? (ti.product_name ?? ti.productName ?? ti.name ?? ti.title ?? null)
      : null;
    const tiProductNameEn = (ti && typeof ti === "object")
      ? (ti.product_name_en ?? ti.productNameEn ?? ti.name_en ?? ti.title_en ?? null)
      : null;
    const tiProductNameVi = (ti && typeof ti === "object")
      ? (ti.product_name_vi ?? ti.productNameVi ?? ti.name_vi ?? ti.title_vi ?? null)
      : null;

    // Tìm trong c.items các item có cùng product_id hoặc product_variant_id (hoặc các item trong c.items có !is_free)
    const matchingCampaignItems = campaignItems.filter((ci: any) => {
      if (!ci) return false;
      const ciPId = toPositiveNumber(ci.product_id ?? ci.productId ?? ci.id);
      const ciVId = toPositiveNumber(ci.product_variant_id ?? ci.variantId ?? ci.variant_id);

      // 1. Khớp theo variant_id
      if (tiVariantId && ciVId && tiVariantId === ciVId) {
        return true;
      }

      // 2. Khớp theo product_id
      if (tiProductId && ciPId && tiProductId === ciPId) {
        if (tiVariantId && ciVId) {
          return tiVariantId === ciVId;
        }
        if (
          tiVariantName &&
          ci.product_name &&
          !isVariantNameCompatible(tiVariantName, ci.product_name) &&
          !(tiVariantNameEn && isVariantNameCompatible(tiVariantNameEn, ci.product_name_en || ci.product_name))
        ) {
          return false;
        }
        return true;
      }

      // 3. Khớp theo tên biến thể / tên sản phẩm nếu ci không phải quà tặng miễn phí (!is_free)
      if (ci.is_free === false) {
        const ciNames = [ci.product_name, ci.product_name_en, ci.product_name_vi, ci.name, ci.title].filter(Boolean);
        if (tiVariantName && ciNames.some((n) => isVariantNameCompatible(tiVariantName, n))) {
          return true;
        }
        if (tiVariantNameEn && ciNames.some((n) => isVariantNameCompatible(tiVariantNameEn, n))) {
          return true;
        }
        if (tiProductName && ciNames.some((n) => isNameMatch(tiProductName, n))) {
          return true;
        }
        if (tiProductNameEn && ciNames.some((n) => isNameMatch(tiProductNameEn, n))) {
          return true;
        }
        const nonFreeCount = campaignItems.filter((x: any) => x && !x.is_free).length;
        if (triggerItems.length === 1 && nonFreeCount === 1) {
          return true;
        }
      }

      return false;
    });

    const hasSpecificVariant = Boolean(
      tiVariantId ||
      tiVariantName ||
      tiVariantNameEn ||
      tiVariantNameVi ||
      tiVariantKiotvietId
    );

    const productIds: number[] = Array.from(
      new Set(
        [
          tiProductId,
          ...matchingCampaignItems.map((ci: any) => toPositiveNumber(ci.product_id ?? ci.productId ?? ci.id)),
        ].filter((id): id is number => id !== null)
      )
    );

    const allProductVariantIds: number[] = Array.from(
      new Set(
        [
          tiVariantId,
          ...tiVariantDbIds,
          ...matchingCampaignItems.flatMap((ci: any) => [
            toPositiveNumber(ci.product_variant_id ?? ci.variantId ?? ci.variant_id),
            ...(Array.isArray(ci.variant_db_ids) ? ci.variant_db_ids.map(toPositiveNumber) : []),
          ]),
        ].filter((id): id is number => id !== null)
      )
    );

    const variantIds: number[] = Array.from(
      new Set(
        [
          tiVariantId,
          ...(!hasSpecificVariant ? tiVariantDbIds : []),
          ...matchingCampaignItems.flatMap((ci: any) => [
            toPositiveNumber(ci.product_variant_id ?? ci.variantId ?? ci.variant_id),
            ...(!hasSpecificVariant && Array.isArray(ci.variant_db_ids) ? ci.variant_db_ids.map(toPositiveNumber) : []),
          ]),
        ].filter((id): id is number => id !== null)
      )
    );

    const variantKiotvietIds: number[] = Array.from(
      new Set(
        [
          tiVariantKiotvietId,
          ...(tiVariantId ? [tiKiotvietId] : []),
          ...(!hasSpecificVariant ? tiVariantKiotvietIds : []),
          ...matchingCampaignItems.flatMap((ci: any) => [
            toPositiveNumber(ci.variant_kiotviet_id ?? ci.variantKiotvietId),
            ...(ci.product_variant_id || ci.variant_id || ci.variantId ? [toPositiveNumber(ci.kiotviet_id ?? ci.kiotvietId)] : []),
            ...(!hasSpecificVariant && Array.isArray(ci.variant_kiotviet_ids) ? ci.variant_kiotviet_ids.map(toPositiveNumber) : []),
          ]),
        ].filter((id): id is number => id !== null)
      )
    );

    const kiotvietIds: number[] = Array.from(
      new Set(
        [
          tiKiotvietId,
          tiProductKiotvietId,
          tiVariantKiotvietId,
          ...tiVariantKiotvietIds,
          ...matchingCampaignItems.flatMap((ci: any) => [
            toPositiveNumber(ci.kiotviet_id ?? ci.kiotvietId),
            toPositiveNumber(ci.product_kiotviet_id ?? ci.productKiotvietId),
            toPositiveNumber(ci.variant_kiotviet_id ?? ci.variantKiotvietId),
            ...(Array.isArray(ci.variant_kiotviet_ids) ? ci.variant_kiotviet_ids.map(toPositiveNumber) : []),
          ]),
        ].filter((id): id is number => id !== null)
      )
    );

    const productCodes: string[] = Array.from(
      new Set(
        [
          tiProductCode,
          ...(!hasSpecificVariant ? tiVariantCodes : []),
          ...matchingCampaignItems.flatMap((ci: any) => [
            ci.product_code,
            ci.productCode,
            ci.code,
            ci.sku,
            ...(!hasSpecificVariant && Array.isArray(ci.variant_codes) ? ci.variant_codes : []),
          ]),
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase().trim())
      )
    );

    const variantNames: string[] = Array.from(
      new Set(
        [
          tiVariantName,
          tiVariantNameEn,
          tiVariantNameVi,
          ...matchingCampaignItems.flatMap((ci: any) => [
            ci.variant_name,
            ci.variant_name_en,
            ci.variant_name_vi,
            ci.variant,
            ci.variant_en,
            ci.variant_vi,
          ]),
        ]
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );

    const productNames: string[] = Array.from(
      new Set(
        [
          tiProductName,
          tiProductNameEn,
          tiProductNameVi,
          ...matchingCampaignItems.flatMap((ci: any) => [
            ci.product_name,
            ci.product_name_en,
            ci.product_name_vi,
            ci.name,
            ci.name_en,
            ci.name_vi,
            ci.title,
            ci.title_en,
            ci.title_vi,
          ]),
        ]
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );

    const names: string[] = Array.from(new Set([...variantNames, ...productNames]));

    return {
      ti,
      tiProductId,
      tiVariantId,
      tiVariantName,
      tiProductName,
      productIds,
      variantIds,
      allProductVariantIds,
      kiotvietIds,
      variantKiotvietIds,
      productCodes,
      variantNames,
      productNames,
      names,
      hasSpecificVariant,
    };
  });

  return {
    settingsObj,
    triggerItems,
    hasTriggerItems,
    triggerMetaList,
  };
}

export function evaluateCampaignEligibility(
  c: PublicCampaignItem | ActivePromotion,
  options: {
    subtotal?: number;
    originalSubtotal?: number;
    cartItems?: CartItemProductEligibilityCheck[];
    isBrowseMode?: boolean;
    t?: (key: string, values?: Record<string, any>) => string;
  }
): CampaignEligibilityResult {
  const { subtotal = 0, originalSubtotal, cartItems, isBrowseMode = false, t } = options;

  if (isBrowseMode) {
    return { eligible: true };
  }

  // 1. Kiểm tra min_order_value
  const minSpend = Number(c.min_order_value || 0);
  const effectiveSpend =
    c.can_combine_with_promotions === false && originalSubtotal !== undefined && originalSubtotal > 0
      ? originalSubtotal
      : subtotal;

  if (minSpend > 0 && effectiveSpend < minSpend) {
    const missingAmount = Math.max(0, minSpend - effectiveSpend);
    return {
      eligible: false,
      reason: t
        ? (t("buy_more_campaign_hint", {
            minSpend: formatPrice(minSpend),
            missingAmount: formatPrice(missingAmount),
          }) || `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}. Mua thêm ${formatPrice(missingAmount)} để áp dụng`)
        : `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}. Mua thêm ${formatPrice(missingAmount)} để áp dụng`,
      missingAmount,
    };
  }

  const { settingsObj, hasTriggerItems, triggerMetaList } = extractTriggerMeta(c);

  const isCartItemMatchingTrigger = (item: CartItemProductEligibilityCheck) => {
    const rawPId = item.product_id ?? item.productId ?? item.id;
    const pId = toPositiveNumber(rawPId);
    const rawVId = item.product_variant_id ?? item.variantId ?? item.variant_id;
    const vId = toPositiveNumber(rawVId);
    const rawParentPId = item.parentProductId ?? item.parent_product_id;
    const parentPId = toPositiveNumber(rawParentPId);
    const dbId = toPositiveNumber(item.db_id);
    const productDbId = toPositiveNumber(item.product_db_id);
    const variantDbId = toPositiveNumber(item.variant_db_id);
    const rawKvId = item.kiotviet_id ?? item.kiotvietId;
    const kvId = toPositiveNumber(rawKvId);

    // Xử lý id dạng chuỗi kép ghép "80-1146" hoặc "80-Set 2"
    let compoundFirstId: number | null = null;
    let compoundSecondId: number | null = null;
    if (typeof item.id === "string" && item.id.includes("-")) {
      const parts = item.id.split("-");
      compoundFirstId = toPositiveNumber(parts[0]);
      compoundSecondId = toPositiveNumber(parts[1]);
    }

    const itemProductIdCandidates = [pId, parentPId, dbId, productDbId, compoundFirstId].filter(
      (id): id is number => id !== null
    );
    const itemVariantIdCandidates = [vId, variantDbId, pId, dbId, compoundSecondId].filter(
      (id): id is number => id !== null
    );
    const itemAllIdCandidates = Array.from(
      new Set([...itemProductIdCandidates, ...itemVariantIdCandidates, kvId].filter((id): id is number => id !== null))
    );

    const itemCode = (item.productCode ?? item.product_code ?? item.code ?? item.sku ?? "")
      .toString()
      .toLowerCase()
      .trim();

    const itemVariantNames = Array.from(
      new Set(
        [item.variant, item.variant_en, item.variant_vi, item.variant_name]
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );
    const itemProductNames = Array.from(
      new Set(
        [item.title, item.title_en, item.title_vi, item.name, item.product_name]
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );

    return triggerMetaList.some((meta) => {
      const hasVariantNameMatch =
        itemVariantNames.length > 0 &&
        meta.names.some((name) => itemVariantNames.some((iv) => isVariantNameCompatible(iv, name)));
      const hasProductNameMatch =
        itemProductNames.length > 0 &&
        meta.names.some((name) => itemProductNames.some((ip) => isNameMatch(ip, name)));

      // 1. Khớp KiotViet ID
      if (meta.hasSpecificVariant) {
        if (
          meta.variantKiotvietIds.length > 0 &&
          [kvId, vId, pId, variantDbId, compoundSecondId]
            .filter((id): id is number => id !== null)
            .some((id) => meta.variantKiotvietIds.includes(id))
        ) {
          return true;
        }
        if (
          meta.kiotvietIds.length > 0 &&
          itemAllIdCandidates.some((id) => meta.kiotvietIds.includes(id))
        ) {
          if (itemVariantNames.length === 0 || meta.variantNames.length === 0 || hasVariantNameMatch) {
            return true;
          }
        }
      } else if (meta.kiotvietIds.length > 0) {
        if (itemAllIdCandidates.some((id) => meta.kiotvietIds.includes(id))) {
          return true;
        }
      }

      // 2. Khớp Product Code / SKU
      if (itemCode && meta.productCodes.length > 0 && meta.productCodes.includes(itemCode)) {
        if (!meta.hasSpecificVariant || itemVariantNames.length === 0 || meta.variantNames.length === 0 || hasVariantNameMatch) {
          return true;
        }
      }

      // 3. Khớp Database ID: productIds, variantIds, allProductVariantIds, kiotvietIds
      const isParentIdMatch =
        itemProductIdCandidates.some((id) => meta.productIds.includes(id)) ||
        itemAllIdCandidates.some((id) => meta.allProductVariantIds.includes(id)) ||
        itemAllIdCandidates.some((id) => meta.kiotvietIds.includes(id));

      const isVariantIdMatch = itemVariantIdCandidates.some((id) => meta.variantIds.includes(id));

      if (meta.hasSpecificVariant || meta.variantIds.length > 0) {
        // a. Khớp trực tiếp theo Variant ID cụ thể
        if (isVariantIdMatch) {
          return true;
        }

        // b. Product ID gốc khớp VÀ (tên biến thể tương thích HOẶC trigger không chỉ định tên biến thể HOẶC cart item không có biến thể)
        if (isParentIdMatch) {
          if (hasVariantNameMatch) return true;
          if (meta.variantNames.length === 0 && hasProductNameMatch) return true;
          if (itemVariantNames.length === 0 && vId === null && variantDbId === null) return true;
        }

        // c. Khớp theo tên biến thể khi có variant
        if (hasVariantNameMatch) {
          if (isParentIdMatch) return true;
          if (hasProductNameMatch) return true;
          if (meta.names.some((name) => itemVariantNames.some((iv) => normStr(iv) === normStr(name)))) return true;
        }
      } else {
        // Nếu không có variant cụ thể (áp dụng cho toàn bộ sản phẩm cha):
        if (isParentIdMatch) {
          return true;
        }
      }

      // 4. Khớp Tên / Biến thể Đa Ngôn Ngữ (VI & EN)
      if (hasVariantNameMatch) {
        if (isParentIdMatch) return true;
        if (hasProductNameMatch) return true;
        if (meta.names.some((name) => itemVariantNames.some((iv) => normStr(iv) === normStr(name)))) return true;
      }

      if (hasProductNameMatch) {
        if ((!meta.hasSpecificVariant && meta.variantIds.length === 0) || itemVariantNames.length === 0) {
          return true;
        }
        if (hasVariantNameMatch) {
          return true;
        }
        if (
          meta.variantNames.length === 0 &&
          meta.names.some((name) => itemProductNames.some((ip) => normStr(ip) === normStr(name)))
        ) {
          return true;
        }
      }

      return false;
    });
  };

  const rawBuyQty = settingsObj.buy_quantity ?? settingsObj.min_quantity ?? (c as any).buy_quantity ?? (c as any).min_quantity ?? settingsObj.buy_qty;
  const buyQty = rawBuyQty !== undefined && rawBuyQty !== null && Number(rawBuyQty) > 0 ? Number(rawBuyQty) : 1;

  // 2. Xử lý các loại campaign:
  // a) Nếu c.promotion_type === 'order_gift_discount':
  // Món quà tặng chưa có trong giỏ hàng, cần đủ min_order_value và có danh sách quà khả dụng.
  if (c.promotion_type === "order_gift_discount") {
    if (!c.items || c.items.length === 0) {
      let fallbackReason = "Đang cập nhật danh sách quà tặng";
      try {
        if (t) fallbackReason = t("campaign_gift_updating") || fallbackReason;
      } catch {
        // Fallback an toàn nếu chưa tải xong locale
      }
      return {
        eligible: false,
        reason: fallbackReason,
      };
    }

    // Nếu campaign quà tặng có cấu hình món kích hoạt (trigger_items)
    if (hasTriggerItems) {
      const matchingItems = (cartItems || []).filter(isCartItemMatchingTrigger);
      const totalMatchingQty = matchingItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (totalMatchingQty < buyQty) {
        const missing = buyQty - totalMatchingQty;
        return {
          eligible: false,
          reason: t
            ? t("buy_more_trigger_items_gift", { count: missing })
            : `Cần mua thêm ${missing} sản phẩm áp dụng để nhận quà`,
        };
      }
    }

    return { eligible: true };
  }

  // b) Nếu c.promotion_type === 'buy_x_get_y':
  // Món ưu đãi kèm Y chưa có trong giỏ hàng, kiểm tra trigger_items hoặc tổng số lượng sản phẩm trong giỏ hàng.
  if (c.promotion_type === "buy_x_get_y") {
    if (hasTriggerItems) {
      const matchingItems = (cartItems || []).filter(isCartItemMatchingTrigger);
      const totalMatchingQty = matchingItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (totalMatchingQty < buyQty) {
        const missing = buyQty - totalMatchingQty;
        return {
          eligible: false,
          reason: t
            ? t("buy_more_to_activate_buy_x_get_y", { count: missing })
            : `Cần mua thêm ${missing} sản phẩm áp dụng để kích hoạt ưu đãi`,
        };
      }
      return { eligible: true };
    }

    const totalCartQty = (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalCartQty < buyQty) {
      const missing = buyQty - totalCartQty;
      return {
        eligible: false,
        reason: t
          ? t("buy_more_to_activate_buy_x_get_y", { count: missing })
          : `Cần mua thêm ${missing} sản phẩm áp dụng để kích hoạt ưu đãi`,
      };
    }
    return { eligible: true };
  }

  // c) Các campaign khác (same_price_discount, item discount...):
  const targetProductIds: number[] = Array.isArray(c.applicable_product_ids)
    ? c.applicable_product_ids.map(Number)
    : (c.items
        ? c.items.filter((i) => !i.is_free).map((i) => Number(i.product_id)).filter(Boolean)
        : []);

  const targetVariantIds: number[] = Array.isArray(c.applicable_variant_ids)
    ? c.applicable_variant_ids.map(Number)
    : (c.items
        ? c.items.filter((i) => !i.is_free).map((i) => Number(i.product_variant_id)).filter(Boolean)
        : []);

  // Nếu targetProductIds.length === 0 && targetVariantIds.length === 0: Đây là campaign toàn đơn hàng -> Cho phép áp dụng
  if (targetProductIds.length === 0 && targetVariantIds.length === 0) {
    return { eligible: true };
  }

  // Nếu campaign có danh sách sản phẩm giới hạn:
  if (!cartItems || cartItems.length === 0) {
    return {
      eligible: false,
      reason: t ? t("no_matching_products_in_cart") : "Chưa có sản phẩm áp dụng trong giỏ hàng",
    };
  }

  const matchingItems = cartItems.filter((item) => {
    const pId = toPositiveNumber(item.product_id ?? item.productId);
    const vId = toPositiveNumber(item.product_variant_id ?? item.variantId ?? item.variant_id);
    const parentPId = toPositiveNumber(item.parentProductId ?? item.parent_product_id);
    const dbId = toPositiveNumber(item.db_id);
    const productDbId = toPositiveNumber(item.product_db_id);
    const variantDbId = toPositiveNumber(item.variant_db_id);
    const kvId = toPositiveNumber(item.kiotviet_id ?? item.kiotvietId);

    const variantCandidates = [vId, variantDbId, pId, dbId, kvId].filter((id): id is number => id !== null);
    const productCandidates = [pId, parentPId, dbId, productDbId, kvId].filter((id): id is number => id !== null);

    const matchesVariant = Boolean(
      targetVariantIds.length > 0 && variantCandidates.some((id) => targetVariantIds.includes(id))
    );
    const matchesProduct = Boolean(
      targetProductIds.length > 0 && productCandidates.some((id) => targetProductIds.includes(id))
    );
    return matchesVariant || matchesProduct;
  });

  if (matchingItems.length === 0) {
    return {
      eligible: false,
      reason: t ? t("no_matching_products_in_cart") : "Chưa có sản phẩm áp dụng trong giỏ hàng",
    };
  }

  return { eligible: true };
}

export default function CouponModal({
  isOpen,
  onClose,
  subtotal = 0,
  originalSubtotal,
  shippingFee = 0,
  shippingFeeDiscount = 0,
  isFreeship = false,
  isAutoFreeship,
  isAutoShippingDiscountActive,
  canCombineWithFreeship,
  isFreeshipBlocked = false,
  appliedVoucherCode = "",
  appliedVoucherCodes,
  appliedCampaignIds,
  cartItems,
  onApplyVoucher,
  onApplyVouchers,
  onApplyCampaigns,
  onRemoveVoucher,
  isBrowseOnly,
  activePromotions,
  user,
  memberTier,
  shippingSettings,
  privateVouchers,
  onAddPrivateVoucher,
  campaigns: campaignsProp,
  vouchers: vouchersProp,
  isMemberCardSelected: isMemberCardSelectedProp,
  onToggleMemberCard,
  loyaltySettings: loyaltySettingsProp,
}: CouponModalProps) {
  const t = useTranslations("voucher");
  let locale = "vi";
  try {
    locale = useLocale() || "vi";
  } catch {
    locale = "vi";
  }
  const router = useRouter();
  const rawPathname = usePathname();
  const currentPath = (rawPathname || "") as string;
  const isCheckoutRoute = Boolean(
    currentPath && (
      currentPath === "/checkout" ||
      currentPath.endsWith("/checkout") ||
      currentPath.includes("/checkout") ||
      currentPath === "/thanh-toan" ||
      currentPath.endsWith("/thanh-toan") ||
      currentPath.includes("/thanh-toan")
    )
  );
  const isBrowseMode = isBrowseOnly !== undefined ? isBrowseOnly : !isCheckoutRoute;
  const showSkipButton = !isBrowseMode;
  const { user: authUser } = useAuth();
  const currentUser = user !== undefined ? user : authUser;
  const resolveTierFromPoints = (pts: number = 0): string => {
    if (pts >= 800) return "diamond";
    if (pts >= 400) return "gold";
    return "member";
  };
  const currentUserTier = (
    memberTier ||
    (currentUser?.tier || resolveTierFromPoints(currentUser?.points || 0))
  ).toLowerCase();

  const memberTierInfo = useMemo(() => {
    if (currentUser) {
      return getMemberTier(currentUser);
    }
    if (memberTier) {
      const t = memberTier.toLowerCase();
      if (t === "diamond") return getMemberTier(800);
      if (t === "gold") return getMemberTier(400);
    }
    return getMemberTier(0);
  }, [currentUser, memberTier]);

  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(
    loyaltySettingsProp || null
  );

  useEffect(() => {
    if (loyaltySettingsProp !== undefined) {
      setLoyaltySettings(loyaltySettingsProp);
    } else {
      getLoyaltySettings(locale).then((s) => {
        setLoyaltySettings(s);
      });
    }
  }, [loyaltySettingsProp, locale]);

  const canCombineWithPromotions = Boolean(loyaltySettings?.can_combine_with_promotions);

  const [isMemberCardSelected, setIsMemberCardSelected] = useState<boolean>(
    isMemberCardSelectedProp !== undefined ? isMemberCardSelectedProp : true
  );

  useEffect(() => {
    if (isMemberCardSelectedProp !== undefined) {
      setIsMemberCardSelected(isMemberCardSelectedProp);
    }
  }, [isMemberCardSelectedProp]);

  const isDiamond = currentUserTier === "diamond" || memberTierInfo.tier === "diamond";
  const isGold = currentUserTier === "gold" || memberTierInfo.tier === "gold";
  const hasMemberTierCard = isDiamond || isGold;
  const isUpgrade = Boolean(memberTierInfo.isUpgradeCelebration);

  const defaultGoldDiscount = loyaltySettings?.gold_discount_percent ?? loyaltySettings?.gold_card?.discount_percent ?? memberTierInfo.discountPercent ?? 5;
  const defaultDiamondDiscount = loyaltySettings?.diamond_discount_percent ?? loyaltySettings?.diamond_card?.discount_percent ?? memberTierInfo.discountPercent ?? 8;
  const upgradeDiscount = isDiamond
    ? (loyaltySettings?.diamond_upgrade_discount_percent ?? loyaltySettings?.diamond_card?.upgrade_discount_percent ?? 10)
    : (loyaltySettings?.gold_upgrade_discount_percent ?? loyaltySettings?.gold_card?.upgrade_discount_percent ?? 10);

  const discountPercent = isUpgrade ? upgradeDiscount : isDiamond ? defaultDiamondDiscount : defaultGoldDiscount;

  const memberCardTitle = useMemo(() => {
    const isUntranslatedVi = (str?: string | null) =>
      !str || (locale === "en" && VIETNAMESE_DIACRITICS_REGEX.test(str));

    if (isDiamond) {
      if (isUpgrade) {
        const tr = t("member_tier_upgrade_title_diamond", { percent: discountPercent });
        return (tr && tr !== "member_tier_upgrade_title_diamond") ? tr : `Ưu đãi mừng lên hạng Kim Cương - Giảm ${discountPercent}%`;
      }
      const tr = t("member_tier_card_title_diamond", { percent: discountPercent });
      const fallbackTr = (tr && tr !== "member_tier_card_title_diamond") ? tr : `Ưu đãi Hội viên Kim Cương - Giảm ${discountPercent}%`;
      return !isUntranslatedVi(loyaltySettings?.diamond_card_title)
        ? loyaltySettings!.diamond_card_title!
        : fallbackTr;
    }
    if (isUpgrade) {
      const tr = t("member_tier_upgrade_title_gold", { percent: discountPercent });
      return (tr && tr !== "member_tier_upgrade_title_gold") ? tr : `Ưu đãi mừng lên hạng Vàng - Giảm ${discountPercent}%`;
    }
    const tr = t("member_tier_card_title_gold", { percent: discountPercent });
    const fallbackTr = (tr && tr !== "member_tier_card_title_gold") ? tr : `Ưu đãi Hội viên Vàng - Giảm ${discountPercent}%`;
    return !isUntranslatedVi(loyaltySettings?.gold_card_title)
      ? loyaltySettings!.gold_card_title!
      : fallbackTr;
  }, [isDiamond, isUpgrade, discountPercent, loyaltySettings, t, locale]);

  const memberCardDescription = useMemo(() => {
    const isUntranslatedVi = (str?: string | null) =>
      !str || (locale === "en" && VIETNAMESE_DIACRITICS_REGEX.test(str));

    if (isDiamond) {
      const tr = t("member_tier_desc_diamond");
      const fallbackTr = (tr && tr !== "member_tier_desc_diamond") ? tr : "Áp dụng tự động cho tài khoản hạng Diamond trên đơn hàng.";
      return !isUntranslatedVi(loyaltySettings?.diamond_card_description)
        ? loyaltySettings!.diamond_card_description!
        : fallbackTr;
    }
    const tr = t("member_tier_desc_gold");
    const fallbackTr = (tr && tr !== "member_tier_desc_gold") ? tr : "Áp dụng tự động cho tài khoản hạng Gold trên đơn hàng.";
    return !isUntranslatedVi(loyaltySettings?.gold_card_description)
      ? loyaltySettings!.gold_card_description!
      : fallbackTr;
  }, [isDiamond, loyaltySettings, t, locale]);

  const memberCardBanner = isDiamond
    ? (loyaltySettings?.diamond_card_banner_url || loyaltySettings?.diamond_card?.banner_url || loyaltySettings?.diamond_card_banner)
    : (loyaltySettings?.gold_card_banner_url || loyaltySettings?.gold_card?.banner_url || loyaltySettings?.gold_card_banner);

  const memberTierCampaignItem: PublicCampaignItem = useMemo(() => {
    const tierName = isDiamond ? "Diamond" : "Gold";
    const bullet1 = t("member_terms_bullet_tier", { tier: tierName });
    const bullet2 = t("member_terms_bullet_discount", { percent: discountPercent });
    const bullet3 = canCombineWithPromotions
      ? t("member_terms_bullet_combinable")
      : t("member_terms_bullet_non_combinable");
    const bullet4 = t("member_terms_bullet_activation");

    return {
      id: "member-tier-benefit-card",
      name: memberCardTitle,
      description: memberCardDescription,
      banner: memberCardBanner || null,
      start_at: null,
      end_at: null,
      promotion_type: "order_discount",
      can_combine_with_promotions: canCombineWithPromotions,
      can_combine_with_freeship: true,
      terms: `${bullet1}\n${bullet2}\n${bullet3}\n${bullet4}`,
    };
  }, [memberCardTitle, memberCardDescription, memberCardBanner, canCombineWithPromotions, isDiamond, discountPercent, t]);

  const hasMemberBenefit = useMemo(() => {
    if (isBrowseMode) return false;
    const isGoldOrDiamond =
      currentUserTier === "gold" ||
      currentUserTier === "diamond" ||
      memberTierInfo.tier === "gold" ||
      memberTierInfo.tier === "diamond";
    return isGoldOrDiamond && (subtotal === undefined || subtotal > 0);
  }, [isBrowseMode, currentUserTier, memberTierInfo, subtotal]);

  const orderIsAutoFreeship = isAutoFreeship !== undefined
    ? isAutoFreeship
    : Boolean(isFreeship && shippingFee === 0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>(
    campaignsProp && campaignsProp.length > 0 ? campaignsProp : (cachedCampaigns[locale] || [])
  );
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(
    vouchersProp && vouchersProp.length > 0 ? vouchersProp : (cachedVouchers[locale] || [])
  );

  useEffect(() => {
    if (campaignsProp && campaignsProp.length > 0) {
      setCampaigns(campaignsProp);
    }
  }, [campaignsProp]);

  useEffect(() => {
    if (vouchersProp && vouchersProp.length > 0) {
      setVouchers(vouchersProp);
    }
  }, [vouchersProp]);
  const [localPrivateVouchers, setLocalPrivateVouchers] = useState<PublicVoucherItem[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<(number | string)[]>([]);
  const [shippingSettingsState, setShippingSettingsState] = useState<ShippingSettings | null>(shippingSettings || null);
  const [selectedCampaign, setSelectedCampaign] = useState<PublicCampaignItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const checkCampaignEligibility = useCallback(
    (c: PublicCampaignItem): CampaignEligibilityResult => {
      return evaluateCampaignEligibility(c, {
        subtotal,
        originalSubtotal,
        cartItems,
        isBrowseMode,
        t,
      });
    },
    [subtotal, originalSubtotal, cartItems, isBrowseMode, t]
  );

  const effectivePrivateVouchers = useMemo(() => {
    return privateVouchers !== undefined ? privateVouchers : localPrivateVouchers;
  }, [privateVouchers, localPrivateVouchers]);

  const allVouchers = useMemo(() => {
    const list: PublicVoucherItem[] = [...effectivePrivateVouchers];
    for (const v of vouchers) {
      if (!list.some((pv) => pv.code.toUpperCase() === v.code.toUpperCase())) {
        list.push(v);
      }
    }
    return list;
  }, [vouchers, effectivePrivateVouchers]);

  const appliedVoucherItem = useMemo(() => {
    const primaryCode = selectedCodes[0] || appliedVoucherCode;
    if (!primaryCode) return null;
    return allVouchers.find((v) => v.code.toUpperCase() === primaryCode.toUpperCase()) || null;
  }, [selectedCodes, appliedVoucherCode, allVouchers]);

  const wasOpenRef = useRef(false);

  // Lock background scroll when modal is open to prevent scroll propagation
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const wasOpen = wasOpenRef.current;
      wasOpenRef.current = true;

      // Only initialize selected codes and fetch data when the modal FIRST opens (transition from closed to open)
      // Never wipe selected codes or re-fetch on parent re-renders while the modal remains open!
      if (!wasOpen) {
        setFeedbackError(null);
        setFeedbackNotice(null);
        setFeedbackSuccess(null);
        setSelectedCampaign(null);
        let initialCodes: string[] = [];
        let initialCampaigns: (number | string)[] = [];

        if (!isBrowseMode) {
          initialCodes = (appliedVoucherCodes && appliedVoucherCodes.length > 0)
            ? appliedVoucherCodes
            : appliedVoucherCode
              ? [appliedVoucherCode]
              : [];
          if (
            initialCodes.length === 0 &&
            appliedVoucherCodes === undefined &&
            appliedVoucherCode === undefined &&
            typeof window !== "undefined"
          ) {
            try {
              const stored = localStorage.getItem("cothaotomca_applied_voucher_codes");
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) initialCodes = parsed;
              }
            } catch (e) {
              console.error("Error reading stored voucher codes", e);
            }
          }

          initialCampaigns = (appliedCampaignIds && appliedCampaignIds.length > 0)
            ? [...appliedCampaignIds]
            : [];
          if (
            initialCampaigns.length === 0 &&
            typeof window !== "undefined"
          ) {
            try {
              const stored = localStorage.getItem("cothaotomca_selected_campaign_ids");
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) initialCampaigns = parsed;
              }
            } catch (e) {
              console.error("Error reading stored campaign ids", e);
            }
          }
        }

        setSelectedCodes(initialCodes);
        setSelectedCampaignIds(initialCampaigns);

        if (campaignsProp && campaignsProp.length > 0) {
          setCampaigns(campaignsProp);
        }
        if (vouchersProp && vouchersProp.length > 0) {
          setVouchers(vouchersProp);
        }

        const localeCampaignCache = cachedCampaigns[locale];
        const localeVoucherCache = cachedVouchers[locale];

        // If we have cached data for this locale, reuse it immediately to prevent flickering
        if (localeCampaignCache && localeCampaignCache.length > 0 && localeVoucherCache && localeVoucherCache.length > 0) {
          if (campaignsProp && campaignsProp.length > 0) {
            setCampaigns(campaignsProp);
          } else if (campaigns.length === 0) {
            setCampaigns(localeCampaignCache);
          }
          if (vouchersProp && vouchersProp.length > 0) {
            setVouchers(vouchersProp);
          } else if (vouchers.length === 0) {
            setVouchers(localeVoucherCache);
          }
          if (shippingSettings && !shippingSettingsState) setShippingSettingsState(shippingSettings);
          setLoading(false);
        } else {
          setLoading(true);
          const fetchShipping = shippingSettings !== undefined
            ? Promise.resolve(shippingSettings)
            : getShippingSettings(locale).catch(() => null);

          const fetchCampaigns = (campaignsProp && campaignsProp.length > 0)
            ? Promise.resolve(campaignsProp)
            : getActiveCampaigns(locale).catch(() => []);

          const fetchVouchers = (vouchersProp && vouchersProp.length > 0)
            ? Promise.resolve(vouchersProp)
            : getAvailableVouchers(locale).catch(() => []);

          Promise.all([
            fetchCampaigns,
            fetchVouchers,
            fetchShipping,
          ]).then(([camps, vows, sSettings]) => {
            if (camps.length > 0) {
              cachedCampaigns[locale] = camps;
            }
            if (vows.length > 0) {
              cachedVouchers[locale] = vows;
            }
            setCampaigns(campaignsProp && campaignsProp.length > 0 ? campaignsProp : camps);
            setVouchers(vouchersProp && vouchersProp.length > 0 ? vouchersProp : vows);
            setShippingSettingsState(sSettings);
          }).finally(() => {
            setLoading(false);
          });
        }
      }
    } else {
      wasOpenRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isBrowseMode, appliedVoucherCode, appliedVoucherCodes, appliedCampaignIds, shippingSettings, subtotal, checkCampaignEligibility, campaignsProp, vouchersProp, locale]);

  useEffect(() => {
    if (shippingSettings !== undefined && shippingSettings !== null) {
      setShippingSettingsState(shippingSettings);
    }
  }, [shippingSettings]);

  // Virtual campaign item for shipping discount card (FB-04)
  const shippingPromotionItem: PublicCampaignItem | null = useMemo(() => {
    if (shippingSettingsState?.is_min_amount_enabled && shippingSettingsState?.card_title) {
      const isUntranslatedVi = (str?: string | null) =>
        !str ||
        (locale === "en" &&
          (VIETNAMESE_DIACRITICS_REGEX.test(str) ||
            /Giảm|Đơn từ|Mã chương trình|phí vận chuyển|Áp dụng/i.test(str)));

      const minAmount = Number(shippingSettingsState.min_order_amount || 400000);
      const discountVal = Number(shippingSettingsState.shipping_discount_value || 20000);
      const minK = Math.round(minAmount / 1000);
      const discountK = Math.round(discountVal / 1000);

      const fallbackEnTitle =
        shippingSettingsState.shipping_discount_type === "free"
          ? `Free Shipping For Orders From ${minK}K`
          : `${discountK}K Off Shipping For Orders From ${minK}K`;
      const fallbackEnBadge = "Applicable to all eligible orders";
      const fallbackEnDescription = `- Program code: K026-001\n- Offer: Direct ${discountVal.toLocaleString("en-US")} VND discount on shipping fee.\n- Condition: Applicable for orders from ${minAmount.toLocaleString("en-US")} VND.`;

      const resolvedTitle =
        locale === "en" && isUntranslatedVi(shippingSettingsState.card_title)
          ? fallbackEnTitle
          : shippingSettingsState.card_title;
      const resolvedBadge =
        locale === "en" && isUntranslatedVi(shippingSettingsState.card_badge)
          ? fallbackEnBadge
          : (shippingSettingsState.card_badge || null);
      const resolvedDescription =
        locale === "en" && isUntranslatedVi(shippingSettingsState.card_description)
          ? fallbackEnDescription
          : (shippingSettingsState.card_description || null);

      return {
        id: "shipping-promotion-card",
        name: resolvedTitle,
        banner: shippingSettingsState.card_banner || null,
        start_at: null,
        end_at: null,
        special_note: resolvedBadge,
        description: resolvedDescription,
      };
    }
    return null;
  }, [shippingSettingsState, locale]);

  // Combined campaigns list (deep-merge matching activePromotions & public campaigns)
  const allCampaigns = useMemo(() => {
    const mergedCampaigns = campaigns.map((c) => {
      if (!activePromotions || activePromotions.length === 0) return c;
      const matchingActive = activePromotions.find(
        (ap) => ap && String(ap.id) === String(c.id)
      );
      if (matchingActive) {
        return mergeCampaignObjects(matchingActive as PublicCampaignItem, c);
      }
      return c;
    });
    if (shippingPromotionItem) {
      return [shippingPromotionItem, ...mergedCampaigns];
    }
    return mergedCampaigns;
  }, [campaigns, activePromotions, shippingPromotionItem]);

  // Active cart promotions flags
  const activeCartPromos = useMemo(() => {
    if (!activePromotions || activePromotions.length === 0) return [];
    return activePromotions.filter((p) => {
      if (p.min_order_value && subtotal < p.min_order_value) {
        return false;
      }
      return true;
    });
  }, [activePromotions, subtotal]);

  const hasCampaignWithNoFreeship = useMemo(() => {
    return activeCartPromos.some((p) => p.can_combine_with_freeship === false);
  }, [activeCartPromos]);

  // Check eligibility for each voucher
  const checkVoucherEligibility = useCallback(
    (v: PublicVoucherItem): { eligible: boolean; reason?: string; missingAmount?: number } => {
      const isFreeship = isShipVoucher(v);

      // -1. Voucher expiration check: Mã voucher đã hết hạn sử dụng
      if (v.end_date) {
        const expiryDate = new Date(v.end_date);
        if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
          return {
            eligible: false,
            reason: t("voucher_expired"),
          };
        }
      }

      // 0. Auto Freeship check: Đơn hàng đã được hưởng Freeship tự động 100%
      if (orderIsAutoFreeship && isFreeship) {
        return {
          eligible: false,
          reason: t("order_already_freeship"),
        };
      }

      // 0.05 System partial shipping discount check: Đang áp dụng chương trình giảm phí vận chuyển của hệ thống
      const isAutoShippingDiscount = Boolean(
        !orderIsAutoFreeship &&
        (isAutoShippingDiscountActive ||
         (shippingFeeDiscount !== undefined && shippingFeeDiscount > 0) ||
         (shippingSettingsState?.is_min_amount_enabled &&
          Number(shippingSettingsState.min_order_amount) > 0 &&
          subtotal >= Number(shippingSettingsState.min_order_amount)))
      );

      if (isAutoShippingDiscount && isFreeship) {
        return {
          eligible: false,
          reason: t("system_shipping_discount_active"),
        };
      }

      // 0.1 Combination rule check: Mã giảm giá hàng hiện tại cấm kết hợp freeship
      if (canCombineWithFreeship === false && isFreeship) {
        return {
          eligible: false,
          reason: t("order_voucher_no_freeship"),
        };
      }

      // 1. Member scope check
      if (v.customer_scope === "member_only") {
        if (!currentUser) {
          return {
            eligible: false,
            reason: t("member_only_login"),
          };
        }
      } else if (v.customer_scope === "tier_only") {
        if (!currentUser) {
          return {
            eligible: false,
            reason: t("member_tier_login"),
          };
        }
        const reqTier = (v.min_member_tier || "member").toLowerCase();
        if (reqTier !== "member") {
          const tierRank: Record<string, number> = {
            member: 1,
            gold: 2,
            diamond: 3,
          };
          const userRank = tierRank[currentUserTier] ?? 1;
          const reqRank = tierRank[reqTier] ?? 1;
          if (userRank < reqRank) {
            const tierName = reqTier === "diamond" ? "DIAMOND" : reqTier === "gold" ? "GOLD" : "MEMBER";
            return {
              eligible: false,
              reason: t("tier_only_required", { tier: tierName }),
            };
          }
        }
      }

      // 2. Freeship combined with active campaign check
      if (isFreeship && hasCampaignWithNoFreeship) {
        return {
          eligible: false,
          reason: t("campaign_no_freeship"),
        };
      }

      // 3. Minimum spend check
      // For voucher G2 with can_combine_with_promotions === false:
      // Minimum spend threshold (prereq_price) is compared against originalSubtotal (price before G1 campaign discount).
      // Voucher G2 is NOT marked ineligible simply because the cart has an active Campaign G1!
      const minSpend = Number(v.prereq_price || 0);
      const effectiveSpend =
        v.can_combine_with_promotions === false && originalSubtotal !== undefined && originalSubtotal > 0
          ? originalSubtotal
          : subtotal;

      if (minSpend > 0 && effectiveSpend < minSpend) {
        const missingAmount = Math.max(0, minSpend - effectiveSpend);
        const codeUpper = (v.code || "").toUpperCase();
        const reason = codeUpper === "WSBCT50K"
          ? `Đơn hàng tối thiểu ${formatPrice(minSpend)} để áp dụng mã ${v.code}`
          : t("min_spend_not_met", { amount: formatPrice(minSpend) });
        return {
          eligible: false,
          reason,
          missingAmount,
        };
      }

      return { eligible: true };
    },
    [
      currentUser,
      currentUserTier,
      orderIsAutoFreeship,
      isAutoShippingDiscountActive,
      shippingFeeDiscount,
      shippingSettingsState,
      canCombineWithFreeship,
      hasCampaignWithNoFreeship,
      subtotal,
      originalSubtotal,
      t,
    ]
  );

  const selectedCampaignItems = useMemo(() => {
    return allCampaigns.filter((c) =>
      selectedCampaignIds.some((id) => String(id) === String(c.id))
    );
  }, [allCampaigns, selectedCampaignIds]);

  const eligibleCampaigns = useMemo(() => {
    return allCampaigns.filter(
      (c) => c.id !== "shipping-promotion-card" && checkCampaignEligibility(c).eligible
    );
  }, [allCampaigns, checkCampaignEligibility]);

  const ineligibleCampaigns = useMemo(() => {
    return allCampaigns.filter(
      (c) => c.id !== "shipping-promotion-card" && !checkCampaignEligibility(c).eligible
    );
  }, [allCampaigns, checkCampaignEligibility]);

  // Split vouchers into 2 distinct tiers (FB-06)
  const eligibleVouchers = useMemo(() => {
    return allVouchers.filter((v) => checkVoucherEligibility(v).eligible);
  }, [allVouchers, checkVoucherEligibility]);

  const ineligibleVouchers = useMemo(() => {
    return allVouchers.filter((v) => !checkVoucherEligibility(v).eligible);
  }, [allVouchers, checkVoucherEligibility]);

  const selectedVoucherItems = useMemo(() => {
    return allVouchers.filter((v) => selectedCodes.some((code) => code.toUpperCase() === v.code.toUpperCase()));
  }, [allVouchers, selectedCodes]);

  const hasSelectedExclusiveVoucher = useMemo(() => {
    return selectedVoucherItems.some((v) => v.can_combine_with_promotions === false);
  }, [selectedVoucherItems]);

  const hasSelectedExclusiveCampaign = useMemo(() => {
    return selectedCampaignItems.some((c) => c.can_combine_with_promotions === false);
  }, [selectedCampaignItems]);

  const isMemberCardLocked = useMemo(() => {
    if (isBrowseMode || canCombineWithPromotions) return false;
    return hasSelectedExclusiveVoucher || hasSelectedExclusiveCampaign;
  }, [isBrowseMode, canCombineWithPromotions, hasSelectedExclusiveVoucher, hasSelectedExclusiveCampaign]);

  const memberCardLockReason = useMemo(() => {
    if (!isMemberCardLocked) return "";
    if (hasSelectedExclusiveVoucher) {
      return t("campaign_voucher_locked");
    }
    if (hasSelectedExclusiveCampaign) {
      return t("campaign_mutex_locked");
    }
    return "";
  }, [isMemberCardLocked, hasSelectedExclusiveVoucher, hasSelectedExclusiveCampaign, t]);

  // Xác định điều kiện khóa thẻ Trợ giá ship tự động (shipping-promotion-card)
  const isShippingPromotionLocked = useMemo(() => {
    // 1. Khóa khi CheckoutForm / MobileCartFlow báo freeship bị chặn
    if (isFreeshipBlocked) return true;

    // 2. Khóa khi prop canCombineWithFreeship === false từ voucher ở checkout
    if (canCombineWithFreeship === false) return true;

    // 3. Khóa khi có bất kỳ campaign nào đang được chọn trong modal có can_combine_with_freeship === false
    const hasLockedSelectedCampaign = selectedCampaignItems.some(
      (c) => c.can_combine_with_freeship === false
    );
    if (hasLockedSelectedCampaign) return true;

    // 4. Khóa khi có bất kỳ activeCartPromos nào (Quà tặng, Combo, Buy X Get Y) có can_combine_with_freeship === false
    const hasLockedActiveCartPromo = activeCartPromos.some(
      (p) => p.can_combine_with_freeship === false
    );
    if (hasLockedActiveCartPromo) return true;

    // 5. Khóa khi appliedCampaignIds có campaign cấm freeship
    if (appliedCampaignIds && appliedCampaignIds.length > 0) {
      const hasAppliedLockedCampaign = allCampaigns.some(
        (c) => appliedCampaignIds.some((id) => String(id) === String(c.id)) && c.can_combine_with_freeship === false
      );
      if (hasAppliedLockedCampaign) return true;
    }

    // 6. Khóa khi có bất kỳ voucher nào đang được chọn trong modal có can_combine_with_freeship === false
    const hasLockedSelectedVoucher = selectedVoucherItems.some(
      (v) => v.can_combine_with_freeship === false
    );
    if (hasLockedSelectedVoucher) return true;

    return false;
  }, [
    isFreeshipBlocked,
    canCombineWithFreeship,
    selectedCampaignItems,
    activeCartPromos,
    appliedCampaignIds,
    allCampaigns,
    selectedVoucherItems,
  ]);

  const shippingPromotionLockReason = useMemo(() => {
    if (!isShippingPromotionLocked) return "";

    const hasLockedSelectedVoucher = selectedVoucherItems.some(
      (v) => v.can_combine_with_freeship === false
    );
    if (hasLockedSelectedVoucher) {
      return t("order_voucher_no_freeship");
    }

    return t("campaign_no_freeship");
  }, [isShippingPromotionLocked, selectedVoucherItems, t]);

  const shippingMinOrderAmount = useMemo(() => {
    if (shippingSettingsState?.is_min_amount_enabled) {
      return Number(shippingSettingsState.min_order_amount || 0);
    }
    return 0;
  }, [shippingSettingsState]);

  const effectiveShippingSubtotal = useMemo(() => {
    return Math.max(subtotal, originalSubtotal || 0);
  }, [subtotal, originalSubtotal]);

  const isShippingPromotionEligible = useMemo(() => {
    if (shippingMinOrderAmount > 0) {
      return effectiveShippingSubtotal >= shippingMinOrderAmount;
    }
    return true;
  }, [shippingMinOrderAmount, effectiveShippingSubtotal]);

  const shippingPromotionMissingAmount = useMemo(() => {
    if (!isShippingPromotionEligible && shippingMinOrderAmount > 0) {
      return Math.max(0, shippingMinOrderAmount - effectiveShippingSubtotal);
    }
    return 0;
  }, [isShippingPromotionEligible, shippingMinOrderAmount, effectiveShippingSubtotal]);

  const checkCampaignMutexLock = useCallback(
    (camp: PublicCampaignItem): CampaignLockResult => {
      const isSelected = selectedCampaignIds.some((id) => String(id) === String(camp.id));
      if (isSelected) {
        return { locked: false };
      }

      if (isBrowseMode) {
        return { locked: false };
      }

      // Khóa campaign không áp dụng đồng thời với ưu đãi thành viên Gold/Diamond
      if (
        !canCombineWithPromotions &&
        hasMemberBenefit &&
        isMemberCardSelected &&
        !isMemberCardLocked &&
        camp.can_combine_with_promotions === false
      ) {
        return {
          locked: true,
          reason: t("mutex_member_tier"),
          reasonCode: "MUTEX_MEMBER_TIER",
        };
      }

      // 1. Kiểm tra khóa lẫn nhau giữa các Campaign (Mutex Lock)
      if (selectedCampaignItems.length > 0) {
        const hasNonCombinableCampaign = selectedCampaignItems.some(
          (c) => c.can_combine_with_promotions === false
        );
        if (hasNonCombinableCampaign || camp.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked"),
          };
        }
      }

      // 2. Kiểm tra khóa chéo với Voucher món ăn đang chọn
      const selectedFoodVoucher = selectedVoucherItems.find(isFoodVoucher);
      if (selectedFoodVoucher) {
        if (selectedFoodVoucher.can_combine_with_promotions === false || camp.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_voucher_locked"),
          };
        }
      }

      // 3. Kiểm tra khóa chéo với Voucher Freeship đang chọn
      const selectedShipVoucher = selectedVoucherItems.find(isShipVoucher);
      if (selectedShipVoucher) {
        if (selectedShipVoucher.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked"),
          };
        }
        if (camp.can_combine_with_freeship === false) {
          return {
            locked: true,
            reason: t("campaign_freeship_locked"),
          };
        }
      }

      return { locked: false };
    },
    [isBrowseMode, selectedCampaignIds, selectedCampaignItems, selectedVoucherItems, hasMemberBenefit, isMemberCardSelected, isMemberCardLocked, canCombineWithPromotions, t]
  );

  const checkCampaignRealtimeLock = checkCampaignMutexLock;

  const checkRealtimeLock = useCallback(
    (v: PublicVoucherItem): { locked: boolean; reason?: string; reasonCode?: string } => {
      if (isBrowseMode) return { locked: false };
      const isSelected = selectedCodes.some((c) => c.toUpperCase() === v.code.toUpperCase());
      if (isSelected) return { locked: false };

      // Khóa voucher không áp dụng đồng thời với ưu đãi thành viên Gold/Diamond
      if (
        !canCombineWithPromotions &&
        hasMemberBenefit &&
        isMemberCardSelected &&
        !isMemberCardLocked &&
        v.can_combine_with_promotions === false
      ) {
        return {
          locked: true,
          reason: t("mutex_member_tier"),
          reasonCode: "MUTEX_MEMBER_TIER",
        };
      }

      const isShip = isShipVoucher(v);
      const isFood = isFoodVoucher(v);
      const selectedFood = selectedVoucherItems.find(isFoodVoucher);
      const selectedShip = selectedVoucherItems.find(isShipVoucher);
      const hasNonCombinableCampaign = selectedCampaignItems.some((c) => c.can_combine_with_promotions === false);
      const hasCampaignWithNoFreeship = selectedCampaignItems.some((c) => c.can_combine_with_freeship === false);

      if (isFood) {
        if (selectedFood && selectedFood.code.toUpperCase() !== v.code.toUpperCase()) {
          return { locked: true, reason: t("mutex_selected_promotions") };
        }
        if (selectedShip && (selectedShip.can_combine_with_promotions === false || v.can_combine_with_freeship === false)) {
          return { locked: true, reason: t("mutex_selected_promotions") };
        }
        if (hasNonCombinableCampaign) {
          return { locked: true, reason: t("campaign_mutex_locked") };
        }
      }

      if (isShip) {
        if (selectedShip && selectedShip.code.toUpperCase() !== v.code.toUpperCase()) {
          return { locked: true, reason: t("mutex_selected_promotions") };
        }
        if (selectedFood && (selectedFood.can_combine_with_freeship === false || v.can_combine_with_promotions === false)) {
          return { locked: true, reason: t("mutex_selected_promotions") };
        }
        if (hasCampaignWithNoFreeship) {
          return { locked: true, reason: t("campaign_no_freeship") };
        }
      }

      return { locked: false };
    },
    [isBrowseMode, selectedCodes, selectedVoucherItems, selectedCampaignItems, hasMemberBenefit, isMemberCardSelected, isMemberCardLocked, canCombineWithPromotions, t]
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApply = async (code: string) => {
    if (!onApplyVoucher) {
      handleCopyCode(code);
      return;
    }
    setApplyingCode(code);
    setFeedbackError(null);
    setFeedbackNotice(null);
    setFeedbackSuccess(null);
    try {
      const applyRes = await onApplyVoucher(code);
      if (applyRes === false) {
        setFeedbackNotice(t("best_deal_item_better"));
        return;
      }
      setFeedbackSuccess(t("apply_success", { code }));
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      const msg = err?.message || t("apply_failed");
      if (
        msg.includes("Freeship tự động") ||
        msg.includes("freeship tự động") ||
        msg.includes("miễn phí vận chuyển tự động")
      ) {
        setFeedbackNotice(msg);
        setFeedbackError(null);
      } else {
        setFeedbackError(msg);
        setFeedbackNotice(null);
      }
    } finally {
      setApplyingCode(null);
    }
  };

  const handleToggleMemberCard = useCallback(() => {
    if (isMemberCardLocked) return;
    setIsMemberCardSelected((prev) => {
      const next = !prev;
      onToggleMemberCard?.(next);
      return next;
    });
  }, [isMemberCardLocked, onToggleMemberCard]);

  const handleToggleVoucher = useCallback(
    (code: string) => {
      const targetVoucher = allVouchers.find((v) => v.code.toUpperCase() === code.toUpperCase());
      if (!targetVoucher) return;

      const isSelected = selectedCodes.some((c) => c.toUpperCase() === code.toUpperCase());

      if (isSelected) {
        setSelectedCodes((prev) => {
          const nextCodes = prev.filter((c) => c.toUpperCase() !== code.toUpperCase());
          // Khi khách BỎ CHỌN voucher đó: Thẻ Hội viên Vàng tự động MỞ KHÓA và TỰ ĐỘNG BẬT LẠI (checked)
          if (!canCombineWithPromotions && targetVoucher.can_combine_with_promotions === false) {
            const remainingExclusiveVoucher = allVouchers.some(
              (v) => nextCodes.some((nc) => nc.toUpperCase() === v.code.toUpperCase()) && v.can_combine_with_promotions === false
            );
            const remainingExclusiveCampaign = selectedCampaignItems.some(
              (c) => c.can_combine_with_promotions === false
            );
            if (!remainingExclusiveVoucher && !remainingExclusiveCampaign) {
              setIsMemberCardSelected(true);
              onToggleMemberCard?.(true);
            }
          }
          return nextCodes;
        });
        return;
      }

      const eligibility = checkVoucherEligibility(targetVoucher);
      if (!eligibility.eligible) return;

      const lockState = checkRealtimeLock(targetVoucher);
      const isLockedOnlyByMember =
        lockState.locked &&
        (lockState.reason === t("mutex_member_tier") ||
          lockState.reason === "Không áp dụng đồng thời với ưu đãi thành viên");

      if (lockState.locked && !isLockedOnlyByMember) return;

      // Khi khách BẤM CHỌN một voucher không cộng dồn:
      // Hệ thống sẽ TỰ ĐỘNG BỎ CHỌN (uncheck) thẻ Hội viên Vàng và khóa thẻ này!
      if (!canCombineWithPromotions && targetVoucher.can_combine_with_promotions === false) {
        setIsMemberCardSelected(false);
        onToggleMemberCard?.(false);
      }

      setSelectedCodes((prev) => {
        const isShip = isShipVoucher(targetVoucher);
        const filtered = prev.filter((c) => {
          const existing = allVouchers.find((v) => v.code.toUpperCase() === c.toUpperCase());
          if (!existing) return true;
          return isShip ? !isShipVoucher(existing) : !isFoodVoucher(existing);
        });
        return [...filtered, targetVoucher.code];
      });
    },
    [
      allVouchers,
      checkVoucherEligibility,
      checkRealtimeLock,
      selectedCodes,
      canCombineWithPromotions,
      onToggleMemberCard,
      selectedCampaignItems,
    ]
  );

  const handleToggleCampaign = useCallback(
    (id: number | string) => {
      const targetCamp = allCampaigns.find((c) => String(c.id) === String(id));
      if (!targetCamp) return;

      setFeedbackError(null);

      const isSelected = selectedCampaignIds.some((cId) => String(cId) === String(id));

      if (isSelected) {
        setSelectedCampaignIds((prev) => {
          const nextIds = prev.filter((cId) => String(cId) !== String(id));
          if (!canCombineWithPromotions && targetCamp.can_combine_with_promotions === false) {
            const remainingExclusiveCampaign = allCampaigns.some(
              (c) => nextIds.some((nid) => String(nid) === String(c.id)) && c.can_combine_with_promotions === false
            );
            const remainingExclusiveVoucher = selectedVoucherItems.some(
              (v) => v.can_combine_with_promotions === false
            );
            if (!remainingExclusiveCampaign && !remainingExclusiveVoucher) {
              setIsMemberCardSelected(true);
              onToggleMemberCard?.(true);
            }
          }
          return nextIds;
        });
        return;
      }

      const eligibility = checkCampaignEligibility(targetCamp);
      if (!eligibility.eligible) return;

      const lockState = checkCampaignRealtimeLock(targetCamp);
      const isLockedOnlyByMember =
        lockState.locked &&
        (lockState.reasonCode === "MUTEX_MEMBER_TIER" ||
          lockState.reason === t("mutex_member_tier") ||
          lockState.reason === "Không áp dụng đồng thời với ưu đãi thành viên");

      if (lockState.locked && !isLockedOnlyByMember) return;

      if (!canCombineWithPromotions && targetCamp.can_combine_with_promotions === false) {
        setIsMemberCardSelected(false);
        onToggleMemberCard?.(false);
      }

      setSelectedCampaignIds((prev) => {
        if (targetCamp.can_combine_with_promotions === false) {
          return [targetCamp.id];
        }
        let filtered = prev.filter((cId) => {
          const existing = allCampaigns.find((c) => String(c.id) === String(cId));
          return existing && existing.can_combine_with_promotions !== false;
        });
        // Mutex: Khi chọn campaign mới thuộc order_discount, tự động uncheck campaign order_discount đã chọn trước đó
        if (targetCamp.promotion_type === "order_discount") {
          filtered = filtered.filter((cId) => {
            const existing = allCampaigns.find((c) => String(c.id) === String(cId));
            return existing?.promotion_type !== "order_discount";
          });
        }
        return [...filtered, targetCamp.id];
      });

      // Auto-clear conflicting exclusive vouchers
      setSelectedCodes((prev) => {
        return prev.filter((c) => {
          const v = allVouchers.find((item) => item.code.toUpperCase() === c.toUpperCase());
          if (!v) return true;
          if (v.can_combine_with_promotions === false) return false;
          if (targetCamp.can_combine_with_freeship === false && isShipVoucher(v)) return false;
          if (targetCamp.can_combine_with_promotions === false) return false;
          return true;
        });
      });
    },
    [
      allCampaigns,
      checkCampaignEligibility,
      checkCampaignRealtimeLock,
      selectedCampaignIds,
      canCombineWithPromotions,
      onToggleMemberCard,
      allVouchers,
      selectedVoucherItems,
    ]
  );

  const handleSkipAndContinue = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([]));
        localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify([]));
      } catch (e) {
        console.error("Error clearing selected promotions from localStorage", e);
      }
    }
    onToggleMemberCard?.(false);
    setIsMemberCardSelected(false);
    setSelectedCampaignIds([]);
    setSelectedCodes([]);
    if (appliedVoucherCode || (appliedVoucherCodes && appliedVoucherCodes.length > 0)) {
      onRemoveVoucher?.();
    }
    onApplyVouchers?.([]);
    onApplyCampaigns?.([]);
    onClose();
  }, [appliedVoucherCode, appliedVoucherCodes, onRemoveVoucher, onApplyVouchers, onApplyCampaigns, onToggleMemberCard, onClose]);

  const handleCloseModal = useCallback(() => {
    const initialSelected = isMemberCardSelectedProp !== undefined ? isMemberCardSelectedProp : true;
    setIsMemberCardSelected(initialSelected);
    onToggleMemberCard?.(initialSelected);
    onClose();
  }, [isMemberCardSelectedProp, onToggleMemberCard, onClose]);

  const isMemberCardEffectiveApplied = hasMemberTierCard && isMemberCardSelected && !isMemberCardLocked;
  const totalAppliedCount = selectedCodes.length + selectedCampaignIds.length + (isMemberCardEffectiveApplied ? 1 : 0);

  const handleApplySelected = useCallback(async () => {
    if (totalAppliedCount === 0) {
      handleSkipAndContinue();
      return;
    }
    setLoading(true);
    setFeedbackError(null);
    try {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify(selectedCampaignIds));
          localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(selectedCodes));
        } catch (e) {
          console.error("Error saving selected promotions to localStorage", e);
        }
      }

      // 1. Đồng bộ Campaign độc lập, không triệt tiêu Voucher
      const hadPreviousCampaigns = Boolean(appliedCampaignIds && appliedCampaignIds.length > 0);
      if (selectedCampaignIds.length > 0) {
        if (onApplyCampaigns) {
          await onApplyCampaigns(selectedCampaignIds);
        }
      } else if (hadPreviousCampaigns) {
        if (onApplyCampaigns) {
          await onApplyCampaigns([]);
        }
      }

      // 2. Đồng bộ Voucher độc lập, không triệt tiêu Campaign
      const hadPreviousVouchers = Boolean(
        (appliedVoucherCodes && appliedVoucherCodes.length > 0) || appliedVoucherCode
      );
      if (selectedCodes.length > 0) {
        if (onApplyVouchers) {
          await onApplyVouchers(selectedCodes);
        } else if (onApplyVoucher) {
          for (const code of selectedCodes) {
            await onApplyVoucher(code);
          }
        }
      } else if (hadPreviousVouchers) {
        if (onApplyVouchers) {
          await onApplyVouchers([]);
        } else if (onRemoveVoucher) {
          onRemoveVoucher();
        }
      }

      onToggleMemberCard?.(isMemberCardSelected && !isMemberCardLocked);
      onClose();
    } catch (err: any) {
      setFeedbackError(err.message || t("apply_promotions_failed"));
    } finally {
      setLoading(false);
    }
  }, [
    totalAppliedCount,
    selectedCodes,
    selectedCampaignIds,
    appliedVoucherCode,
    appliedVoucherCodes,
    appliedCampaignIds,
    onApplyCampaigns,
    onApplyVouchers,
    onApplyVoucher,
    onRemoveVoucher,
    onToggleMemberCard,
    isMemberCardSelected,
    isMemberCardLocked,
    onClose,
    handleSkipAndContinue,
    t,
  ]);

  const handleManualApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim().toUpperCase();
    if (!trimmed) {
      setFeedbackError(t("validation_code_required"));
      setFeedbackNotice(null);
      setFeedbackSuccess(null);
      return;
    }

    setApplyingCode(trimmed);
    setFeedbackError(null);
    setFeedbackNotice(null);
    setFeedbackSuccess(null);

    try {
      const isCodeFreeship = isShipVoucher({ code: trimmed });
      if (orderIsAutoFreeship && isCodeFreeship) {
        setFeedbackError(t("order_voucher_no_freeship"));
        return;
      }
      const isAutoShippingDiscount = Boolean(
        !orderIsAutoFreeship &&
        (isAutoShippingDiscountActive ||
         (shippingFeeDiscount !== undefined && shippingFeeDiscount > 0) ||
         (shippingSettingsState?.is_min_amount_enabled &&
          Number(shippingSettingsState.min_order_amount) > 0 &&
          subtotal >= Number(shippingSettingsState.min_order_amount)))
      );
      if (isAutoShippingDiscount && isCodeFreeship) {
        setFeedbackNotice(t("system_shipping_discount_active"));
        return;
      }
      if (canCombineWithFreeship === false && isCodeFreeship) {
        setFeedbackError(t("order_voucher_no_freeship"));
        return;
      }

      const effectiveSubtotal = originalSubtotal !== undefined && originalSubtotal > 0 ? originalSubtotal : subtotal;
      const res = await validateVoucher(
        trimmed,
        effectiveSubtotal,
        shippingFee,
        activeCartPromos.length > 0,
        0,
        currentUser?.phone,
        typeof window !== "undefined" ? localStorage.getItem("auth_token") || undefined : undefined,
        orderIsAutoFreeship
      );

      if (res.valid && res.voucher) {
        const isShip = isShipVoucher(res.voucher);
        const newVoucher: PublicVoucherItem = {
          id: res.voucher.id,
          code: res.voucher.code,
          short_name: res.voucher.short_name,
          discount_type: res.voucher.discount_type || (isShip ? "freeship" : "fixed"),
          value: res.voucher.value,
          max_discount: res.voucher.max_discount,
          prereq_price: res.voucher.prereq_price,
          campaign_id: res.voucher.campaign_id,
          campaign_name: res.voucher.campaign_name,
          is_freeship: isShip,
          customer_scope: res.voucher.customer_scope || "all",
          min_member_tier: res.voucher.min_member_tier,
          can_combine_with_promotions: res.voucher.can_combine_with_promotions !== false,
          can_combine_with_freeship: res.voucher.can_combine_with_freeship !== false,
        };

        const eligibility = checkVoucherEligibility(newVoucher);
        if (!eligibility.eligible) {
          if (eligibility.reason === t("system_shipping_discount_active")) {
            setFeedbackNotice(eligibility.reason);
          } else {
            setFeedbackError(formatPrivateVoucherError(eligibility.reason || ""));
          }
          return;
        }

        const lockCheck = checkRealtimeLock(newVoucher);
        if (lockCheck.locked) {
          setFeedbackError(lockCheck.reason || t("voucher_conflict_current"));
          return;
        }

        if (onAddPrivateVoucher) {
          onAddPrivateVoucher(newVoucher);
        } else {
          setLocalPrivateVouchers((prev) => {
            if (prev.some((v) => v.code.toUpperCase() === newVoucher.code.toUpperCase())) return prev;
            return [...prev, newVoucher];
          });
        }

        // Tự động tích chọn checkbox cho mã mới
        setSelectedCodes((prev) => {
          const filtered = prev.filter((c) => {
            const existing = allVouchers.find((v) => v.code.toUpperCase() === c.toUpperCase());
            if (!existing) return true;
            return isShip ? !isShipVoucher(existing) : !isFoodVoucher(existing);
          });
          return [...filtered, newVoucher.code];
        });

        setManualCode("");
        setFeedbackError(null);
        setFeedbackSuccess(t("added_to_wallet", { code: newVoucher.code }));
        setTimeout(() => setFeedbackSuccess(null), 3000);
      } else {
        const rawMsg = res.message || t("invalid_code");
        setFeedbackError(formatPrivateVoucherError(rawMsg));
      }
    } catch (err: any) {
      const rawMsg = err?.message || t("invalid_code");
      setFeedbackError(formatPrivateVoucherError(rawMsg));
    } finally {
      setApplyingCode(null);
    }
  };

  const handleGoShopping = () => {
    onClose();
    router.push("/product" as any);
  };

  const renderCampaignCard = (camp: PublicCampaignItem, isEligible: boolean) => {
    const isVirtualCard = camp.id === "shipping-promotion-card";
    if (isVirtualCard) {
      // Khi bị khóa do không áp dụng đồng thời với campaign/voucher khác
      if (isShippingPromotionLocked) {
        return (
          <div
            key={camp.id}
            aria-disabled="true"
            className="relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs opacity-50 border-gray-200 bg-gray-50/70 select-none cursor-not-allowed"
          >
            {/* Banner grayscale */}
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center grayscale bg-gray-200 border-gray-300">
              <CampaignBannerImage
                camp={camp}
                isLocked={true}
                fallbackTag={t("promo_tag")}
              />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
              <h4 className="title-3 font-display text-gray-600 font-bold leading-snug line-clamp-2">
                {camp.name}
              </h4>
              {camp.description && (
                <div className="body-3 font-sans text-gray-500 line-clamp-2">
                  {camp.description}
                </div>
              )}
              {/* Lý do khóa màu đỏ/cam */}
              <p className="text-red-500 text-xs font-semibold leading-normal">
                {shippingPromotionLockReason}
              </p>
              {/* Xem chi tiết thể lệ */}
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCampaign(camp);
                  }}
                  className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
                >
                  <span>{t("view_terms_detail")}</span>
                </button>
              </div>
            </div>
            <div className="text-gray-300 text-sm shrink-0 pr-1">
              ›
            </div>
          </div>
        );
      }

      // Khi không đủ điều kiện (chưa đạt giá trị đơn tối thiểu)
      if (!isShippingPromotionEligible) {
        return (
          <div
            key={camp.id}
            aria-disabled="true"
            className="relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs opacity-50 border-gray-200 bg-gray-50/70 select-none cursor-not-allowed"
          >
            {/* Banner grayscale */}
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center grayscale bg-gray-200 border-gray-300">
              <CampaignBannerImage
                camp={camp}
                isLocked={true}
                fallbackTag={t("promo_tag")}
              />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
              <h4 className="title-3 font-display text-gray-600 font-bold leading-snug line-clamp-2">
                {camp.name}
              </h4>
              {camp.description && (
                <div className="body-3 font-sans text-gray-500 line-clamp-2">
                  {camp.description}
                </div>
              )}
              {/* Cảnh báo số tiền còn thiếu */}
              <p className="text-secondary text-xs font-semibold leading-normal">
                {shippingMinOrderAmount > 0 && shippingPromotionMissingAmount > 0
                  ? t("buy_more_campaign_hint", {
                      minSpend: formatPrice(shippingMinOrderAmount),
                      missingAmount: formatPrice(shippingPromotionMissingAmount),
                    })
                  : t("min_spend_not_met", { amount: formatPrice(shippingMinOrderAmount) })}
              </p>
              {/* Xem chi tiết thể lệ */}
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCampaign(camp);
                  }}
                  className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
                >
                  <span>{t("view_terms_detail")}</span>
                </button>
              </div>
            </div>
            <div className="text-gray-300 text-sm shrink-0 pr-1">
              ›
            </div>
          </div>
        );
      }

      // Đủ điều kiện và không bị khóa
      return (
        <div
          key={camp.id}
          onClick={() => setSelectedCampaign(camp)}
          className="group relative rounded-2xl border border-gray-200 bg-white p-3 hover:border-secondary/60 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 active:scale-[0.99]"
        >
          {/* Banner */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-yellow/60 shrink-0 relative border border-secondary/20 flex items-center justify-center">
            <CampaignBannerImage
              camp={camp}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              fallbackTag={t("promo_tag")}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
            <h4 className="title-3 font-display text-primary font-bold leading-snug line-clamp-2 group-hover:text-secondary transition-colors">
              {camp.name}
            </h4>
            {camp.description && (
              <div className="body-3 font-sans text-gray-500 line-clamp-2">
                {camp.description}
              </div>
            )}
            <div>
              <span className="body-3 font-sans text-secondary font-medium">
                {t("view_terms_detail")}
              </span>
            </div>
          </div>
          <div className="text-gray-300 group-hover:text-secondary text-sm shrink-0 pr-1">
            ›
          </div>
        </div>
      );
    }

    const isSelected = selectedCampaignIds.some((id) => String(id) === String(camp.id));
    const lockState = checkCampaignRealtimeLock(camp);
    const isLocked = lockState.locked;
    const eligibility = checkCampaignEligibility(camp);

    // Chưa đủ điều kiện: xám mờ giống campaign bị khóa (isLocked), checkbox disabled
    if (!isEligible) {
      const minSpend = Number(camp.min_order_value || 0);
      const missing = eligibility.missingAmount || 0;
      return (
        <div
          key={camp.id}
          className="relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs opacity-50 border-gray-200 bg-gray-50 bg-gray-50/70 select-none cursor-not-allowed"
        >
          {/* Banner */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center grayscale bg-gray-200 border-gray-300">
            <CampaignBannerImage
              camp={camp}
              isLocked={true}
              fallbackTag={t("promo_tag")}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="title-3 font-display text-gray-600 font-bold leading-snug line-clamp-2">
                {camp.name}
              </h4>
              {Number(camp.settings?.usage_limit_per_user ?? camp.usage_limit_per_user ?? 0) === 1 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300 shrink-0">
                  Chỉ áp dụng 1 lần/khách
                </span>
              )}
            </div>

            <div className="body-2 font-sans font-bold text-gray-800">
              <span className="line-clamp-1">
                {t("duration")}{" "}
                <span className="text-secondary font-bold font-sans">
                  {formatCampaignDuration(camp.start_at, camp.end_at, t)}
                </span>
              </span>
            </div>

            {camp.special_note && (
              <div className="body-3 font-sans text-gray-500 italic">
                <span className="line-clamp-1">{camp.special_note}</span>
              </div>
            )}

            {/* Ineligible reason and missing amount hint */}
            <p className="text-secondary text-xs font-semibold leading-normal">
              {eligibility.reason ||
                (minSpend > 0 && missing > 0
                  ? t("buy_more_campaign_hint", { minSpend: formatPrice(minSpend), missingAmount: formatPrice(missing) })
                  : "")}
            </p>

            {/* Terms link with e.stopPropagation() */}
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCampaign(camp);
                }}
                className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
              >
                <span>{t("view_terms_detail")}</span>
              </button>
            </div>
          </div>

          {/* Disabled Checkbox */}
          {!isBrowseMode && (
            <div className="flex items-center justify-center pl-2 pr-4 py-3 shrink-0">
              <div
                role="checkbox"
                aria-checked={false}
                aria-disabled={true}
                aria-label={camp.name}
                className="w-5 h-5 min-w-[20px] min-h-[20px] rounded-md border border-gray-200 bg-gray-100 cursor-not-allowed text-transparent"
              />
            </div>
          )}
        </div>
      );
    }

    // Tầng 1: Đủ điều kiện
    return (
      <div
        key={camp.id}
        onClick={() => {
          if (isBrowseMode) {
            setSelectedCampaign(camp);
            return;
          }
          if (isSelected || !isLocked) {
            handleToggleCampaign(camp.id);
          }
        }}
        aria-disabled={isLocked ? "true" : undefined}
        className={`relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs ${
          isBrowseMode
            ? "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer bg-white"
            : isSelected
              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
              : isLocked
                ? "pointer-events-none cursor-not-allowed select-none opacity-50 border-gray-200 bg-gray-50 bg-gray-50/70"
                : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer bg-white"
        }`}
      >
        {/* Banner */}
        <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center ${
          isLocked && !isSelected ? "bg-gray-200 border-gray-300 grayscale" : "bg-yellow/60 border-secondary/20"
        }`}>
          <CampaignBannerImage
            camp={camp}
            isLocked={isLocked}
            isSelected={isSelected}
            fallbackTag={t("promo_tag")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`title-3 font-display font-bold leading-snug line-clamp-2 ${
              isLocked && !isSelected ? "text-gray-600" : "text-primary"
            }`}>
              {camp.name}
            </h4>
            {Number(camp.settings?.usage_limit_per_user ?? camp.usage_limit_per_user ?? 0) === 1 && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300 shrink-0">
                Chỉ áp dụng 1 lần/khách
              </span>
            )}
            {isSelected && !isBrowseMode && (
              <span className="body-3 font-sans font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full shrink-0">
                {t("in_use")}
              </span>
            )}
          </div>

          <div className="body-2 font-sans font-bold text-gray-800">
            <span className="line-clamp-1">
              {t("duration")}{" "}
              <span className="text-secondary font-bold font-sans">
                {formatCampaignDuration(camp.start_at, camp.end_at, t)}
              </span>
            </span>
          </div>

          {camp.special_note && (
            <div className="body-3 font-sans text-gray-500 italic">
              <span className="line-clamp-1">{camp.special_note}</span>
            </div>
          )}

          {/* Locked warning */}
          {isLocked && !isSelected && (
            <p className="text-secondary text-xs font-semibold mt-1 animate-fade-in">
              {lockState.reason || t("campaign_mutex_locked")}
            </p>
          )}

          {/* Detail View link with e.stopPropagation() */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCampaign(camp);
              }}
              className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <span>{t("view_terms_detail")}</span>
            </button>
          </div>
        </div>

        {/* Checkbox */}
        {!isBrowseMode && (
          <div className="flex items-center justify-center pl-2 pr-4 py-3 shrink-0">
            <div
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={isSelected ? "false" : (isLocked ? "true" : "false")}
              aria-label={camp.name}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelected || !isLocked) {
                  handleToggleCampaign(camp.id);
                }
              }}
              className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-md border flex items-center justify-center transition-all ${
                isSelected
                  ? "border-secondary bg-secondary text-white shadow-xs cursor-pointer"
                  : isLocked
                    ? "pointer-events-none cursor-not-allowed select-none opacity-50 border-gray-200 bg-gray-100 text-transparent"
                    : "border-gray-300 bg-white hover:border-secondary/60 cursor-pointer text-transparent"
              }`}
            >
              {isSelected && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 7L5.5 10L11.5 3.5" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVoucherCard = (v: PublicVoucherItem, isEligible: boolean) => {
    const eligibility = checkVoucherEligibility(v);
    const isSelected = selectedCodes.some((c) => c.toUpperCase() === v.code.toUpperCase());
    const isApplied = isSelected;
    const isFreeship = isShipVoucher(v);
    const lockState = checkRealtimeLock(v);
    const isLocked = lockState.locked;
    const isDimmedByNonCombinableVoucher = isLocked;

    // 1. Voucher KHÔNG ĐỦ ĐIỀU KIỆN: xám mờ giống voucher bị khóa (isLocked), badge xám, checkbox disabled
    if (!isEligible) {
      return (
        <div
          key={v.code}
          onClick={() => {
            if (isBrowseMode) {
              handleCopyCode(v.code);
            }
          }}
          className={`relative rounded-2xl border transition-all overflow-hidden flex flex-row items-stretch shadow-xs ${
            isBrowseMode
              ? "border-gray-200 bg-white cursor-pointer hover:border-secondary/40 hover:shadow-md"
              : "opacity-50 border-gray-200 bg-gray-50 bg-gray-50/70 select-none cursor-not-allowed"
          }`}
        >
          {/* Left Badge */}
          <div className="w-22 sm:w-28 py-2.5 sm:py-3 px-1.5 sm:px-3 flex flex-col items-center justify-center gap-1 text-center shrink-0 bg-gray-400 text-white border-r border-dashed border-white/30">
            <span className="text-xs sm:title-3 font-display font-bold uppercase tracking-tight sm:tracking-wider leading-tight text-white text-center break-words">
              {getVoucherBadgeLabel(v, isFreeship, t)}
            </span>
          </div>

          {/* Center Content */}
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between space-y-1.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-primary bg-yellow/60 px-2 py-0.5 rounded border border-secondary/20">
                  {v.code}
                </span>
                {v.customer_scope === "member_only" && (
                  <span className="body-3 font-sans font-medium text-primary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                    {t("badge_member_only")}
                  </span>
                )}
                {v.customer_scope === "tier_only" && (
                  <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                    {t("badge_tier", { tier: v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "DIAMOND" : "GOLD") : "VIP" })}
                  </span>
                )}
              </div>

              <p className="body-2 font-sans font-bold text-gray-600 mt-1 leading-snug">
                {v.description || v.campaign_name}
              </p>

              {v.prereq_price && v.prereq_price > 0 ? (
                <p className="body-3 font-sans text-gray-400 mt-0.5">
                  {t("min_spend", { amount: formatPrice(v.prereq_price) })}
                </p>
              ) : (
                <p className="body-3 font-sans text-gray-400 font-medium mt-0.5">
                  {t("all_orders")}
                </p>
              )}

              {/* Reason why ineligible */}
              {eligibility.reason && (
                <p className="text-secondary text-xs font-semibold mt-1 leading-normal">
                  {eligibility.reason}
                </p>
              )}

              {(eligibility as any).missingAmount !== undefined && (eligibility as any).missingAmount > 0 && (
                <p className="text-secondary text-xs font-semibold mt-0.5">
                  {t("buy_more")} <strong className="font-bold">{formatPrice((eligibility as any).missingAmount)}</strong> {t("to_apply_suffix")}
                </p>
              )}
            </div>

            {/* Card Footer: Copy Code */}
            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(v.code);
                }}
                className="body-3 font-sans text-gray-500 hover:text-secondary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{copiedCode === v.code ? t("copied_code") : t("copy_code")}</span>
              </button>
            </div>
          </div>

          {/* Right Checkbox (Grab-style disabled) */}
          {!isBrowseMode && (
            <div className="flex items-center justify-center pr-3 sm:pr-4 pl-1 shrink-0">
              <div
                role="checkbox"
                aria-checked={false}
                aria-disabled={true}
                aria-label={v.code}
                className="w-5 h-5 min-w-[20px] min-h-[20px] rounded-md border border-gray-200 bg-gray-100 cursor-not-allowed text-transparent"
              />
            </div>
          )}
        </div>
      );
    }

    const isLockedOnlyByMember =
      isLocked &&
      (lockState.reasonCode === "MUTEX_MEMBER_TIER" ||
        lockState.reason === t("mutex_member_tier") ||
        lockState.reason === "Không áp dụng đồng thời với ưu đãi thành viên");

    // 2. Voucher ĐỦ ĐIỀU KIỆN
    return (
      <div
        key={v.code}
        onClick={() => {
          if (isBrowseMode) {
            handleCopyCode(v.code);
            return;
          }
          if (isSelected || !isLocked || isLockedOnlyByMember) {
            handleToggleVoucher(v.code);
          }
        }}
        aria-disabled={isLocked ? "true" : undefined}
        className={`relative rounded-2xl border transition-all overflow-hidden flex flex-row items-stretch bg-white shadow-xs ${
          isBrowseMode
            ? "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer"
            : isApplied
              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
              : isLocked
                ? "pointer-events-none cursor-not-allowed select-none opacity-50 border-gray-200 bg-gray-50 bg-gray-50/70"
                : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer"
        }`}
      >
        {/* Left Badge */}
        <div className={`w-22 sm:w-28 py-2.5 sm:py-3 px-1.5 sm:px-3 flex flex-col items-center justify-center gap-1 text-center shrink-0 text-white border-r border-dashed border-white/30 ${
          isLocked && !isSelected ? "bg-gray-400" : "bg-secondary"
        }`}>
          <span className="text-xs sm:title-3 font-display font-bold uppercase tracking-tight sm:tracking-wider leading-tight text-white text-center break-words">
            {getVoucherBadgeLabel(v, isFreeship, t)}
          </span>
        </div>

        {/* Center Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between space-y-1.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs text-primary bg-yellow/60 px-2 py-0.5 rounded border border-secondary/20">
                {v.code}
              </span>
              {v.customer_scope === "member_only" && (
                <span className="body-3 font-sans font-medium text-primary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                  {t("badge_member_only")}
                </span>
              )}
              {v.customer_scope === "tier_only" && (
                <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                  {t("badge_tier", { tier: v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "DIAMOND" : "GOLD") : "VIP" })}
                </span>
              )}
              {isApplied && !isBrowseMode && (
                <span className="body-3 font-sans font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">
                  {t("in_use")}
                </span>
              )}
            </div>

            <p className="body-2 font-sans font-bold text-primary mt-1 leading-snug">
              {v.description || v.campaign_name}
            </p>

            {v.prereq_price && v.prereq_price > 0 ? (
              <p className="body-3 font-sans text-gray-500 mt-0.5">
                {t("min_spend", { amount: formatPrice(v.prereq_price) })}
              </p>
            ) : (
              <p className="body-3 font-sans text-secondary font-medium mt-0.5">
                {t("all_orders")}
              </p>
            )}

            {isLocked && !isSelected && (
              <p className="text-secondary text-xs font-semibold mt-1 animate-fade-in">
                {lockState.reason || t("mutex_selected_promotions")}
              </p>
            )}
          </div>

          {/* Card Footer: Copy Code */}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyCode(v.code);
              }}
              className="body-3 font-sans text-gray-500 hover:text-secondary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{copiedCode === v.code ? t("copied_code") : t("copy_code")}</span>
            </button>
          </div>
        </div>

        {/* Right side Checkbox (Grab-style) */}
        {!isBrowseMode && (
          <div className="flex items-center justify-center pr-3 sm:pr-4 pl-1 shrink-0">
            <div
              role="checkbox"
              aria-label={v.code}
              aria-checked={isSelected}
              aria-disabled={isSelected ? "false" : (isLocked ? "true" : "false")}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelected || !isLocked || isLockedOnlyByMember) {
                  handleToggleVoucher(v.code);
                }
              }}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                isSelected
                  ? "border-secondary bg-secondary text-white shadow-xs cursor-pointer"
                  : isLocked
                    ? "pointer-events-none cursor-not-allowed select-none opacity-50 border-gray-200 bg-gray-100 text-transparent"
                    : "border-gray-300 bg-white hover:border-secondary/60 cursor-pointer text-transparent"
              }`}
            >
              {isSelected && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 7L5.5 10L11.5 3.5" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMemberTierCard = () => {
    const isChecked = isMemberCardSelected && !isMemberCardLocked;
    const isLocked = isMemberCardLocked;

    return (
      <div
        key="member-tier-campaign-card"
        data-testid="member-tier-campaign-card"
        onClick={() => {
          if (isBrowseMode) {
            setSelectedCampaign(memberTierCampaignItem);
            return;
          }
          if (!isLocked) {
            handleToggleMemberCard();
          }
        }}
        aria-disabled={isLocked ? "true" : undefined}
        className={`relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs ${
          isBrowseMode
            ? "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer bg-white"
            : isLocked
              ? "pointer-events-none opacity-50 border-gray-200 cursor-not-allowed bg-gray-50 bg-gray-50/70 select-none"
              : isChecked
                ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
                : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer bg-white"
        }`}
      >
        {/* Banner / Huy hiệu bên trái w-20 h-20 sm:w-22 sm:h-22 rounded-xl */}
        <div
          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center ${
            isLocked
              ? "bg-gray-200 border-gray-300 grayscale"
              : isDiamond
                ? "bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-200 border-purple-300/60"
                : "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border-amber-300/60"
          }`}
        >
          {memberCardBanner ? (
            <Image
              src={formatImageUrl(memberCardBanner)}
              alt={memberCardTitle}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-2xl drop-shadow-xs mb-0.5">
                {isDiamond ? "💎" : "🌟"}
              </span>
              <span
                className={`text-[10px] font-bold font-sans uppercase tracking-wider ${
                  isLocked
                    ? "text-gray-500"
                    : isDiamond
                      ? "text-purple-800"
                      : "text-amber-800"
                }`}
              >
                {isDiamond ? "DIAMOND" : "GOLD"}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`title-3 font-display font-bold leading-snug line-clamp-2 ${
                isLocked ? "text-gray-600" : "text-primary"
              }`}
            >
              {memberCardTitle}
            </h4>
            {isChecked && !isBrowseMode && (
              <span className="body-3 font-sans font-bold text-secondary bg-secondary/15 px-2 py-0.5 rounded-full shrink-0">
                {t("in_use")}
              </span>
            )}
          </div>

          <div className="body-3 font-sans text-gray-500 line-clamp-2">
            {memberCardDescription}
          </div>

          {/* Locked reason */}
          {isLocked && memberCardLockReason && (
            <p className="text-secondary text-xs font-semibold leading-normal animate-fade-in">
              {memberCardLockReason}
            </p>
          )}

          {/* Chi tiết điều kiện áp dụng › button */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCampaign(memberTierCampaignItem);
              }}
              className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <span>{t("view_terms_detail")}</span>
            </button>
          </div>
        </div>

        {/* Checkbox bên phải */}
        {!isBrowseMode && (
          <div className="flex items-center justify-center pl-2 pr-4 py-3 shrink-0">
            <div
              role="checkbox"
              aria-checked={isChecked}
              aria-disabled={isChecked ? "false" : (isLocked ? "true" : "false")}
              aria-label={memberCardTitle}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  handleToggleMemberCard();
                }
              }}
              className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-md flex items-center justify-center transition-all ${
                isLocked
                  ? "pointer-events-none border border-gray-200 bg-gray-100 cursor-not-allowed text-transparent"
                  : isChecked
                    ? "bg-secondary text-white shadow-xs cursor-pointer"
                    : "border-2 border-gray-300 hover:border-secondary bg-white cursor-pointer"
              }`}
            >
              {isChecked && (
                <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="coupon-modal-root fixed inset-0 z-[999] flex flex-col justify-end sm:items-center sm:justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Backdrop with smooth fade-in */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={(e) => {
          e.stopPropagation();
          if (selectedCampaign) {
            setSelectedCampaign(null);
          } else {
            handleCloseModal();
          }
        }}
      />

      {/* Main Drawer / Modal Container với chiều cao chuẩn h-[85dvh] sm:h-auto max-h-[85dvh] */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[28px] shadow-2xl z-10 h-[85dvh] sm:h-auto max-h-[85dvh] flex flex-col overflow-hidden text-gray-900 border border-gray-200/80 animate-in slide-in-from-bottom-full duration-300 ease-out">

        {/* Mobile Pull Handle Indicator */}
        <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

        {/* ========================================================================= */}
        {/* DETAIL VIEW (When a campaign card is clicked) */}
        {/* ========================================================================= */}
        {selectedCampaign ? (
          <div className="flex flex-col h-full max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-250">
            {/* Detail Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-yellow/40 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="flex items-center gap-1 font-display title-4 text-primary hover:text-secondary transition-colors cursor-pointer"
              >
                <span className="text-sm leading-none">←</span>
                <span>{t("back")}</span>
              </button>

              <h3 className="title-3 font-display text-primary font-bold text-center flex-1 px-2 line-clamp-1">
                {t("detail_title")}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-primary hover:bg-gray-100 border border-gray-200 text-lg transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                &times;
              </button>
            </div>

            {/* Detail Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
              {/* Square Banner Image */}
              {selectedCampaign.id === "member-tier-benefit-card" ? (
                <div className="w-full flex justify-center">
                  <div
                    className={`w-36 h-36 sm:w-40 sm:h-40 rounded-2xl flex flex-col items-center justify-center p-4 border shadow-sm ${
                      isDiamond
                        ? "bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-200 border-purple-300"
                        : "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 border-amber-300"
                    }`}
                  >
                    <span className="text-4xl drop-shadow-xs mb-1">{isDiamond ? "💎" : "🌟"}</span>
                    <span
                      className={`text-xs font-bold font-sans uppercase tracking-wider ${
                        isDiamond ? "text-purple-800" : "text-amber-800"
                      }`}
                    >
                      {isDiamond ? "DIAMOND MEMBER" : "GOLD MEMBER"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-sm border border-secondary/20 bg-yellow/50 flex items-center justify-center">
                    <CampaignBannerImage
                      camp={selectedCampaign}
                      fallbackTag={t("promo_tag")}
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="text-center space-y-1.5">
                <h2 className="title-1 font-display text-primary font-bold leading-tight">
                  {selectedCampaign.name}
                </h2>
                {Number(selectedCampaign.settings?.usage_limit_per_user ?? selectedCampaign.usage_limit_per_user ?? 0) === 1 && (
                  <div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                      Chỉ áp dụng 1 lần/khách
                    </span>
                  </div>
                )}
              </div>

              {/* Timing & Special Note Info Card */}
              <div className="bg-yellow/60 rounded-2xl p-4 border border-secondary/20 space-y-2.5 body-2 font-sans text-brown">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span>{t("duration")}</span>
                  <span className="text-secondary font-bold font-sans">
                    {formatCampaignDuration(selectedCampaign.start_at, selectedCampaign.end_at, t)}
                  </span>
                </div>

                {selectedCampaign.special_note && (
                  <div className="text-brown/80 italic body-3 font-sans pt-2 border-t border-secondary/15">
                    <span>{selectedCampaign.special_note}</span>
                  </div>
                )}
              </div>

              {/* Detailed Program Description / Terms */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="title-3 font-display uppercase tracking-wider text-primary font-bold">
                  {t("program_details")}
                </h4>
                <div className="body-2 font-sans text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {selectedCampaign.terms || selectedCampaign.description || t("default_terms")}
                </div>
              </div>
            </div>

            {/* Detail Footer CTA */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!isBrowseMode) {
                    if (selectedCampaign.id === "member-tier-benefit-card") {
                      if (!isMemberCardLocked && !isMemberCardSelected) {
                        handleToggleMemberCard();
                      }
                      setSelectedCampaign(null);
                      return;
                    }
                    const isAlreadySelected = selectedCampaignIds.some(
                      (id) => String(id) === String(selectedCampaign.id)
                    );
                    if (!isAlreadySelected) {
                      handleToggleCampaign(selectedCampaign.id);
                    }
                    setSelectedCampaign(null);
                  } else {
                    handleGoShopping();
                  }
                }}
                className="w-full py-3.5 px-6 bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center font-display title-2"
              >
                <span>
                  {!isBrowseMode
                    ? t("apply_this_promotion")
                    : t("start_order")}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* LIST VIEW: CAMPAIGNS & VOUCHERS */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-yellow/40 shrink-0">
              <div>
                <h3 className="title-2 font-display text-primary font-bold leading-tight">
                  {t("modal_title")}
                </h3>
                <p className="body-3 font-sans text-gray-500 font-medium">
                  {allCampaigns.length + allVouchers.length + (hasMemberTierCard ? 1 : 0) > 0
                    ? t("active_promos", { count: allCampaigns.length + allVouchers.length + (hasMemberTierCard ? 1 : 0) })
                    : t("explore_promos")}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-primary hover:bg-gray-100 border border-gray-200 text-lg transition-colors cursor-pointer"
                aria-label={t("close")}
              >
                &times;
              </button>
            </div>

            {/* Manual Voucher Input (Only shown on checkout, hidden in browse mode outside checkout as per STT 40.0) */}
            {!isBrowseMode && (
              <div className="p-3.5 bg-white border-b border-gray-100 shrink-0">
                <form onSubmit={handleManualApply} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value.toUpperCase());
                        setFeedbackError(null);
                        setFeedbackNotice(null);
                      }}
                      placeholder={t("input_placeholder")}
                      className="w-full h-11 pl-4 pr-10 text-base font-sans font-semibold uppercase rounded-full border border-gray-300 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-gray-400 placeholder:normal-case transition-all"
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCode("");
                          setFeedbackError(null);
                          setFeedbackNotice(null);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || applyingCode === manualCode.trim().toUpperCase()}
                    className="h-11 px-5 bg-secondary hover:bg-secondary/95 text-white font-display title-4 font-bold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs"
                  >
                    {applyingCode === manualCode.trim().toUpperCase() ? "..." : t("apply")}
                  </button>
                </form>

                {/* Feedback alerts */}
                {feedbackError && (
                  <p className="body-3 font-sans text-red-600 font-semibold mt-2 px-2 animate-fade-in">
                    {feedbackError}
                  </p>
                )}
                {feedbackNotice && (
                  <p className="body-3 font-sans text-secondary font-semibold mt-2 px-2 animate-fade-in">
                    {feedbackNotice}
                  </p>
                )}
                {feedbackSuccess && (
                  <p className="body-3 font-sans text-green-600 font-semibold mt-2 px-2 animate-fade-in">
                    ✓ {feedbackSuccess}
                  </p>
                )}
                {copiedCode && (
                  <p className="body-3 font-sans text-secondary font-semibold mt-2 px-2">
                    {t("copied_code")}: <strong>{copiedCode}</strong>
                  </p>
                )}
              </div>
            )}

            {/* List Content - Single Scrollable View với min-h-0 chống tràn flexbox */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[75dvh] sm:max-h-[600px] p-4 space-y-5">
              {loading && allCampaigns.length === 0 && allVouchers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="body-3 font-sans text-gray-500 font-medium">{t("loading")}</p>
                </div>
              ) : allCampaigns.length === 0 && allVouchers.length === 0 && !hasMemberTierCard ? (
                <div className="py-12 text-center space-y-2">
                  <p className="body-2 font-sans font-semibold text-gray-600">{t("no_vouchers")}</p>
                  <p className="body-3 font-sans text-gray-400">{t("no_vouchers_hint")}</p>
                </div>
              ) : (
                <>
                  {/* TẦNG 1: CHƯƠNG TRÌNH ƯU ĐÃI */}
                  {(allCampaigns.length > 0 || hasMemberTierCard) && (
                    <div className="space-y-3">
                      <div className="title-4 font-display text-primary uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>
                          {t("eligible_campaigns", { count: allCampaigns.length + (hasMemberTierCard ? 1 : 0) })}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {hasMemberTierCard && renderMemberTierCard()}
                        {eligibleCampaigns.map((camp) => renderCampaignCard(camp, true))}
                        {shippingPromotionItem && isShippingPromotionEligible && !isShippingPromotionLocked && (
                          renderCampaignCard(shippingPromotionItem, true)
                        )}
                        {ineligibleCampaigns.map((camp) => renderCampaignCard(camp, false))}
                        {shippingPromotionItem && (!isShippingPromotionEligible || isShippingPromotionLocked) && (
                          renderCampaignCard(shippingPromotionItem, false)
                        )}
                      </div>
                    </div>
                  )}

                  {/* TẦNG 2: MÃ GIẢM GIÁ */}
                  {allVouchers.length > 0 && (
                    <div className="space-y-3">
                      <div className="title-4 font-display text-primary uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>
                          {t("eligible_vouchers", { count: allVouchers.length })}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {eligibleVouchers.map((v) => renderVoucherCard(v, true))}
                        {ineligibleVouchers.map((v) => renderVoucherCard(v, false))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Bar: Pinned CTA button (Grab-style) */}
            {isBrowseMode ? (
              <div className="bg-white border-t border-gray-100 p-4 shadow-lg shrink-0 z-20">
                <button
                  type="button"
                  onClick={handleGoShopping}
                  className="w-full py-3.5 px-4 rounded-2xl text-base font-bold text-white bg-secondary hover:bg-secondary/95 shadow-md hover:shadow-lg transition-all text-center cursor-pointer active:scale-[0.99] flex items-center justify-center font-display"
                >
                  <span>{t("order_now_cta")}</span>
                </button>
              </div>
            ) : (
              <div className="bg-white border-t border-gray-100 p-4 shadow-lg shrink-0 z-20">
                {totalAppliedCount === 0 ? (
                  <button
                    type="button"
                    onClick={handleSkipAndContinue}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all text-center cursor-pointer active:scale-[0.99]"
                  >
                    {t("skip_promotion_and_continue")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplySelected}
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-secondary hover:bg-secondary/95 shadow-sm transition-all text-center cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 font-display"
                  >
                    <span>{t("campaign_applied_count", { count: totalAppliedCount })}</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
