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
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth, StorefrontUser, getMemberTier } from "@/contexts/AuthContext";

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
  product_id?: number;
  productId?: number;
  product_variant_id?: number | null;
  variantId?: number | null;
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

// Module-level in-memory cache to prevent layout shift / flickering on open
let cachedCampaigns: PublicCampaignItem[] | null = null;
let cachedVouchers: PublicVoucherItem[] | null = null;

export function resetCouponModalCache(): void {
  cachedCampaigns = null;
  cachedVouchers = null;
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

function formatCampaignDuration(startAt?: string | null, endAt?: string | null): string {
  if (!startAt && !endAt) return "Đang diễn ra liên tục";

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
    return `Bắt đầu từ ${formatDate(startAt).full}`;
  }
  return `Đến hết ngày ${formatDate(endAt!).full}`;
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

export function getVoucherBadgeLabel(v: PublicVoucherItem, isFreeship: boolean): string {
  if (v.short_name && v.short_name.trim()) {
    return v.short_name.trim();
  }
  if (isFreeship) {
    const maxDiscount = v.max_discount ?? (v as any).maxDiscount;
    if (maxDiscount && Number(maxDiscount) > 0) {
      return "GIẢM SHIP";
    }
    return "FREESHIP";
  }
  if (v.discount_type === "percent") {
    return `-${v.value}%`;
  }
  return `-${formatPrice(v.value)}`;
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

  // Helper kiểm tra trigger items nếu campaign có cấu hình
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

  const triggerItems: any[] = (settingsObj.trigger_items ?? (c as any).trigger_items) || [];
  const hasTriggerItems = Array.isArray(triggerItems) && triggerItems.length > 0;

  const isCartItemMatchingTrigger = (item: CartItemProductEligibilityCheck) => {
    const pId = Number(item.product_id ?? item.productId ?? item.id);
    const vId = item.product_variant_id ?? item.variantId ? Number(item.product_variant_id ?? item.variantId) : null;
    return triggerItems.some((ti: any) => {
      const tiProductId = typeof ti === "number" ? ti : Number(ti.product_id ?? ti.id ?? ti.productId);
      const tiVariantId = (ti && typeof ti === "object" && (ti.product_variant_id ?? ti.variantId))
        ? Number(ti.product_variant_id ?? ti.variantId)
        : null;
      if (tiVariantId) {
        return tiProductId === pId && tiVariantId === vId;
      }
      return tiProductId === pId;
    });
  };

  const rawBuyQty = settingsObj.buy_quantity ?? settingsObj.min_quantity ?? (c as any).buy_quantity ?? settingsObj.buy_qty;
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
            ? (t("buy_more_trigger_items_gift", { count: missing }) || `Cần mua thêm ${missing} sản phẩm áp dụng để nhận quà`)
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
            ? (t("buy_more_to_activate_buy_x_get_y", { count: missing }) || `Cần mua thêm ${missing} sản phẩm áp dụng để kích hoạt ưu đãi`)
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
          ? (t("buy_more_to_activate_buy_x_get_y", { count: missing }) || `Cần mua thêm ${missing} sản phẩm áp dụng để kích hoạt ưu đãi`)
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
      reason: t ? (t("no_matching_products_in_cart") || "Chưa có sản phẩm áp dụng trong giỏ hàng") : "Chưa có sản phẩm áp dụng trong giỏ hàng",
    };
  }

  const matchingItems = cartItems.filter((item) => {
    const pId = item.product_id ?? item.productId;
    const vId = item.product_variant_id ?? item.variantId;
    const matchesVariant = Boolean(vId && targetVariantIds.length > 0 && targetVariantIds.includes(Number(vId)));
    const matchesProduct = Boolean(pId && targetProductIds.length > 0 && targetProductIds.includes(Number(pId)));
    return matchesVariant || matchesProduct;
  });

  if (matchingItems.length === 0) {
    return {
      eligible: false,
      reason: t ? (t("no_matching_products_in_cart") || "Chưa có sản phẩm áp dụng trong giỏ hàng") : "Chưa có sản phẩm áp dụng trong giỏ hàng",
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
      getLoyaltySettings().then((s) => {
        setLoyaltySettings(s);
      });
    }
  }, [loyaltySettingsProp]);

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
    if (isDiamond) {
      if (isUpgrade) {
        const tr = t("member_tier_upgrade_title_diamond", { percent: discountPercent });
        return (tr && tr !== "member_tier_upgrade_title_diamond") ? tr : `Ưu đãi mừng lên hạng Kim Cương - Giảm ${discountPercent}%`;
      }
      const tr = t("member_tier_card_title_diamond", { percent: discountPercent });
      return loyaltySettings?.diamond_card_title || ((tr && tr !== "member_tier_card_title_diamond") ? tr : `Ưu đãi Hội viên Kim Cương - Giảm ${discountPercent}%`);
    }
    if (isUpgrade) {
      const tr = t("member_tier_upgrade_title_gold", { percent: discountPercent });
      return (tr && tr !== "member_tier_upgrade_title_gold") ? tr : `Ưu đãi mừng lên hạng Vàng - Giảm ${discountPercent}%`;
    }
    const tr = t("member_tier_card_title_gold", { percent: discountPercent });
    return loyaltySettings?.gold_card_title || ((tr && tr !== "member_tier_card_title_gold") ? tr : `Ưu đãi Hội viên Vàng - Giảm ${discountPercent}%`);
  }, [isDiamond, isUpgrade, discountPercent, loyaltySettings, t]);

  const memberCardDescription = useMemo(() => {
    if (isDiamond) {
      const tr = t("member_tier_desc_diamond");
      return loyaltySettings?.diamond_card_description || ((tr && tr !== "member_tier_desc_diamond") ? tr : "Áp dụng tự động cho tài khoản hạng Diamond trên đơn hàng.");
    }
    const tr = t("member_tier_desc_gold");
    return loyaltySettings?.gold_card_description || ((tr && tr !== "member_tier_desc_gold") ? tr : "Áp dụng tự động cho tài khoản hạng Gold trên đơn hàng.");
  }, [isDiamond, loyaltySettings, t]);

  const memberCardBanner = isDiamond
    ? (loyaltySettings?.diamond_card_banner_url || loyaltySettings?.diamond_card?.banner_url || loyaltySettings?.diamond_card_banner)
    : (loyaltySettings?.gold_card_banner_url || loyaltySettings?.gold_card?.banner_url || loyaltySettings?.gold_card_banner);

  const memberTierCampaignItem: PublicCampaignItem = useMemo(() => {
    const tierName = isDiamond ? "Diamond" : "Gold";
    const bullet1 = t("member_terms_bullet_tier", { tier: tierName }) || `• Áp dụng tự động cho tài khoản ${isDiamond ? "hạng Diamond (Kim Cương)" : "hạng Gold (Vàng)"}.`;
    const bullet2 = t("member_terms_bullet_discount", { percent: discountPercent }) || `• Chiết khấu ${discountPercent}% trực tiếp trên giá trị đơn hàng.`;
    const bullet3 = canCombineWithPromotions
      ? (t("member_terms_bullet_combinable") || "• Có thể áp dụng đồng thời với các voucher và chương trình ưu đãi khác.")
      : (t("member_terms_bullet_non_combinable") || "• Không áp dụng đồng thời với các chương trình khuyến mãi hoặc mã giảm giá khác.");
    const bullet4 = t("member_terms_bullet_activation") || "• Quyền lợi tự động kích hoạt khi tài khoản đạt thứ hạng tương ứng.";

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
    campaignsProp && campaignsProp.length > 0 ? campaignsProp : (cachedCampaigns || [])
  );
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(
    vouchersProp && vouchersProp.length > 0 ? vouchersProp : (cachedVouchers || [])
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
            appliedCampaignIds === undefined &&
            typeof window !== "undefined"
          ) {
            try {
              const stored = localStorage.getItem("cothaotomca_selected_campaign_ids");
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) initialCampaigns = parsed;
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

        // If we have cached data, reuse it immediately to prevent flickering
        if (cachedCampaigns && cachedCampaigns.length > 0 && cachedVouchers && cachedVouchers.length > 0) {
          if (campaignsProp && campaignsProp.length > 0) {
            setCampaigns(campaignsProp);
          } else if (campaigns.length === 0) {
            setCampaigns(cachedCampaigns);
          }
          if (vouchersProp && vouchersProp.length > 0) {
            setVouchers(vouchersProp);
          } else if (vouchers.length === 0) {
            setVouchers(cachedVouchers);
          }
          if (shippingSettings && !shippingSettingsState) setShippingSettingsState(shippingSettings);
          setLoading(false);
        } else {
          setLoading(true);
          const fetchShipping = shippingSettings !== undefined
            ? Promise.resolve(shippingSettings)
            : getShippingSettings().catch(() => null);

          const fetchCampaigns = (campaignsProp && campaignsProp.length > 0)
            ? Promise.resolve(campaignsProp)
            : getActiveCampaigns().catch(() => []);

          const fetchVouchers = (vouchersProp && vouchersProp.length > 0)
            ? Promise.resolve(vouchersProp)
            : getAvailableVouchers().catch(() => []);

          Promise.all([
            fetchCampaigns,
            fetchVouchers,
            fetchShipping,
          ]).then(([camps, vows, sSettings]) => {
            if (camps.length > 0) {
              cachedCampaigns = camps;
            }
            if (vows.length > 0) {
              cachedVouchers = vows;
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
  }, [isOpen, isBrowseMode, appliedVoucherCode, appliedVoucherCodes, appliedCampaignIds, shippingSettings, subtotal, checkCampaignEligibility, campaignsProp, vouchersProp]);

  // Virtual campaign item for shipping discount card (FB-04)
  const shippingPromotionItem: PublicCampaignItem | null = useMemo(() => {
    if (shippingSettingsState?.is_min_amount_enabled && shippingSettingsState?.card_title) {
      return {
        id: "shipping-promotion-card",
        name: shippingSettingsState.card_title,
        banner: shippingSettingsState.card_banner || null,
        start_at: null,
        end_at: null,
        special_note: shippingSettingsState.card_badge || null,
        description: shippingSettingsState.card_description || null,
      };
    }
    return null;
  }, [shippingSettingsState]);

  // Combined campaigns list
  const allCampaigns = useMemo(() => {
    if (shippingPromotionItem) {
      return [shippingPromotionItem, ...campaigns];
    }
    return campaigns;
  }, [campaigns, shippingPromotionItem]);

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
      const isFreeship = Boolean(
        v.is_freeship ||
        v.discount_type === "freeship" ||
        v.code.toUpperCase().includes("FREESHIP") ||
        v.code.toUpperCase().includes("SHIP")
      );

      // -1. Voucher expiration check: Mã voucher đã hết hạn sử dụng
      if (v.end_date) {
        const expiryDate = new Date(v.end_date);
        if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
          return {
            eligible: false,
            reason: t("voucher_expired") || "Mã giảm giá đã hết hạn sử dụng.",
          };
        }
      }

      // 0. Auto Freeship check: Đơn hàng đã được hưởng Freeship tự động 100%
      if (orderIsAutoFreeship && isFreeship) {
        return {
          eligible: false,
          reason: t("order_already_freeship") || "Đơn hàng đã được Freeship tự động",
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
          reason: t("system_shipping_discount_active") || "Đang áp dụng chương trình giảm phí vận chuyển của hệ thống",
        };
      }

      // 0.1 Combination rule check: Mã giảm giá hàng hiện tại cấm kết hợp freeship
      if (canCombineWithFreeship === false && isFreeship) {
        return {
          eligible: false,
          reason:
            t("order_voucher_no_freeship") ||
            "Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship",
        };
      }

      // 1. Member scope check
      if (v.customer_scope === "member_only") {
        if (!currentUser) {
          return {
            eligible: false,
            reason: t("member_only_login") || "Chỉ dành cho khách hàng thành viên. Vui lòng đăng nhập.",
          };
        }
      } else if (v.customer_scope === "tier_only") {
        if (!currentUser) {
          return {
            eligible: false,
            reason: t("member_tier_login") || "Chỉ dành riêng cho thành viên đăng nhập",
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
              reason:
                t("tier_only_required", { tier: tierName }) ||
                `Chỉ dành riêng cho thành viên đạt hạng ${tierName} trở lên`,
            };
          }
        }
      }

      // 2. Freeship combined with active campaign check
      if (isFreeship && hasCampaignWithNoFreeship) {
        return {
          eligible: false,
          reason:
            t("campaign_no_freeship") ||
            "Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship",
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
          : `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}`;
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
      return "Không thể sử dụng cùng mã giảm giá đã chọn";
    }
    if (hasSelectedExclusiveCampaign) {
      return t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.";
    }
    return "";
  }, [isMemberCardLocked, hasSelectedExclusiveVoucher, hasSelectedExclusiveCampaign, t]);

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
          reason: (t("mutex_member_tier") && t("mutex_member_tier") !== "mutex_member_tier") ? t("mutex_member_tier") : "Không áp dụng đồng thời với ưu đãi thành viên",
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
            reason: (t("campaign_mutex_locked") && t("campaign_mutex_locked") !== "campaign_mutex_locked") ? t("campaign_mutex_locked") : "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
      }

      // 2. Kiểm tra khóa chéo với Voucher món ăn đang chọn
      const selectedFoodVoucher = selectedVoucherItems.find(isFoodVoucher);
      if (selectedFoodVoucher) {
        if (selectedFoodVoucher.can_combine_with_promotions === false || camp.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_voucher_locked") || "Không thể sử dụng cùng mã giảm giá đã chọn.",
          };
        }
      }

      // 3. Kiểm tra khóa chéo với Voucher Freeship đang chọn
      const selectedShipVoucher = selectedVoucherItems.find(isShipVoucher);
      if (selectedShipVoucher) {
        if (selectedShipVoucher.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
        if (camp.can_combine_with_freeship === false) {
          return {
            locked: true,
            reason: t("campaign_freeship_locked") || "CTKM không áp dụng cùng giảm phí vận chuyển.",
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
          reason: (t("mutex_member_tier") && t("mutex_member_tier") !== "mutex_member_tier") ? t("mutex_member_tier") : "Không áp dụng đồng thời với ưu đãi thành viên",
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
          return { locked: true, reason: "Không thể sử dụng với những ưu đãi đã chọn khác." };
        }
        if (selectedShip && (selectedShip.can_combine_with_promotions === false || v.can_combine_with_freeship === false)) {
          return { locked: true, reason: "Không thể sử dụng với những ưu đãi đã chọn khác." };
        }
        if (hasNonCombinableCampaign || (v.can_combine_with_promotions === false && selectedCampaignItems.length > 0)) {
          return { locked: true, reason: (t("campaign_mutex_locked") && t("campaign_mutex_locked") !== "campaign_mutex_locked") ? t("campaign_mutex_locked") : "Không thể sử dụng cùng ưu đãi đã chọn." };
        }
      }

      if (isShip) {
        if (selectedShip && selectedShip.code.toUpperCase() !== v.code.toUpperCase()) {
          return { locked: true, reason: "Không thể sử dụng với những ưu đãi đã chọn khác." };
        }
        if (selectedFood && (selectedFood.can_combine_with_freeship === false || v.can_combine_with_promotions === false)) {
          return { locked: true, reason: "Không thể sử dụng với những ưu đãi đã chọn khác." };
        }
        if (hasCampaignWithNoFreeship) {
          return { locked: true, reason: (t("campaign_no_freeship") && t("campaign_no_freeship") !== "campaign_no_freeship") ? t("campaign_no_freeship") : "Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship" };
        }
        if (v.can_combine_with_promotions === false && selectedCampaignItems.length > 0) {
          return { locked: true, reason: (t("campaign_mutex_locked") && t("campaign_mutex_locked") !== "campaign_mutex_locked") ? t("campaign_mutex_locked") : "Không thể sử dụng cùng ưu đãi đã chọn." };
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
        setFeedbackNotice(
          t("best_deal_item_better") ||
            "Giá ưu đãi của món đang tốt hơn voucher, hệ thống đã giữ lại mức giảm tối ưu nhất."
        );
        return;
      }
      setFeedbackSuccess(`Đã áp dụng mã "${code}" thành công!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      const msg = err?.message || "Không thể áp dụng mã này.";
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
      if (lockState.locked) return;

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

      // If voucher cannot combine with promotions, auto-clear conflicting campaigns
      if (targetVoucher.can_combine_with_promotions === false) {
        setSelectedCampaignIds([]);
      }
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
      if (lockState.locked) return;

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
      setFeedbackError(err.message || "Áp dụng ưu đãi thất bại");
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
  ]);

  const handleManualApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim().toUpperCase();
    if (!trimmed) {
      setFeedbackError("Vui lòng nhập mã giảm giá.");
      setFeedbackNotice(null);
      setFeedbackSuccess(null);
      return;
    }

    setApplyingCode(trimmed);
    setFeedbackError(null);
    setFeedbackNotice(null);
    setFeedbackSuccess(null);

    try {
      const isCodeFreeship = trimmed.includes("FREESHIP") || trimmed.includes("SHIP");
      if (orderIsAutoFreeship && isCodeFreeship) {
        setFeedbackError("Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.");
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
        setFeedbackNotice(t("system_shipping_discount_active") || "Đang áp dụng chương trình giảm phí vận chuyển của hệ thống");
        return;
      }
      if (canCombineWithFreeship === false && isCodeFreeship) {
        setFeedbackError("Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.");
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
        const isShip = Boolean(
          res.voucher.discount_type === "freeship" ||
          res.voucher.is_freeship ||
          trimmed.includes("FREESHIP") ||
          trimmed.includes("SHIP")
        );
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
          if (
            eligibility.reason ===
            (t("system_shipping_discount_active") || "Đang áp dụng chương trình giảm phí vận chuyển của hệ thống")
          ) {
            setFeedbackNotice(eligibility.reason);
          } else {
            setFeedbackError(formatPrivateVoucherError(eligibility.reason || ""));
          }
          return;
        }

        const lockCheck = checkRealtimeLock(newVoucher);
        if (lockCheck.locked) {
          setFeedbackError(lockCheck.reason || "Mã giảm giá không thể sử dụng cùng các ưu đãi hiện tại.");
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
        setFeedbackSuccess(`Đã thêm mã "${newVoucher.code}" vào ví của bạn!`);
        setTimeout(() => setFeedbackSuccess(null), 3000);
      } else {
        const rawMsg = res.message || "Mã giảm giá không hợp lệ.";
        setFeedbackError(formatPrivateVoucherError(rawMsg));
      }
    } catch (err: any) {
      const rawMsg = err?.message || "Mã giảm giá không hợp lệ.";
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
                {t("view_terms_detail") || "Chi tiết điều kiện áp dụng ›"}
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
            <h4 className="title-3 font-display text-gray-600 font-bold leading-snug line-clamp-2">
              {camp.name}
            </h4>

            <div className="body-2 font-sans font-bold text-gray-800">
              <span className="line-clamp-1">
                {t("duration")}{" "}
                <span className="text-secondary font-bold font-sans">
                  {formatCampaignDuration(camp.start_at, camp.end_at)}
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
                  ? `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}. Mua thêm ${formatPrice(missing)} để áp dụng`
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
                <span>{t("view_terms_detail") || "Chi tiết điều kiện áp dụng ›"}</span>
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
                {formatCampaignDuration(camp.start_at, camp.end_at)}
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
              {lockState.reason || "Không thể sử dụng cùng ưu đãi đã chọn."}
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
              <span>{t("view_terms_detail") || "Chi tiết điều kiện áp dụng ›"}</span>
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
              {getVoucherBadgeLabel(v, isFreeship)}
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
                    Thành viên
                  </span>
                )}
                {v.customer_scope === "tier_only" && (
                  <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                    Hạng {v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "DIAMOND" : "GOLD") : "VIP"}
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
                  Mua thêm <strong className="font-bold">{formatPrice((eligibility as any).missingAmount)}</strong> để áp dụng
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

    // 2. Voucher ĐỦ ĐIỀU KIỆN
    return (
      <div
        key={v.code}
        onClick={() => {
          if (isBrowseMode) {
            handleCopyCode(v.code);
            return;
          }
          if (isSelected || !isLocked) {
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
            {getVoucherBadgeLabel(v, isFreeship)}
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
                  Thành viên
                </span>
              )}
              {v.customer_scope === "tier_only" && (
                <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                  Hạng {v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "DIAMOND" : "GOLD") : "VIP"}
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
                {lockState.reason || "Không thể sử dụng với những ưu đãi đã chọn khác."}
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
                if (isSelected || !isLocked) {
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
                {t("in_use") || "Đang dùng"}
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
              <span>{t("view_terms_detail") || "Chi tiết điều kiện áp dụng ›"}</span>
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
            onClose();
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
                  onClose();
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
              <div className="text-center space-y-1">
                <h2 className="title-1 font-display text-primary font-bold leading-tight">
                  {selectedCampaign.name}
                </h2>
              </div>

              {/* Timing & Special Note Info Card */}
              <div className="bg-yellow/60 rounded-2xl p-4 border border-secondary/20 space-y-2.5 body-2 font-sans text-brown">
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span>{t("duration")}</span>
                  <span className="text-secondary font-bold font-sans">
                    {formatCampaignDuration(selectedCampaign.start_at, selectedCampaign.end_at)}
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
                    ? (t("apply_this_promotion") || "Áp dụng ưu đãi này")
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
                  {allCampaigns.length + allVouchers.length > 0
                    ? t("active_promos", { count: allCampaigns.length + allVouchers.length })
                    : t("explore_promos")}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
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
                      placeholder={t("input_placeholder") || "Nhập mã voucher..."}
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
                  <p className="body-3 font-sans text-gray-500 font-medium">{t("loading") || "Đang tải..."}</p>
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
                          {t("eligible_campaigns", { count: allCampaigns.length + (hasMemberTierCard ? 1 : 0) }) ||
                            `Chương trình ưu đãi (${allCampaigns.length + (hasMemberTierCard ? 1 : 0)})`}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {hasMemberTierCard && renderMemberTierCard()}
                        {eligibleCampaigns.map((camp) => renderCampaignCard(camp, true))}
                        {shippingPromotionItem && renderCampaignCard(shippingPromotionItem, true)}
                        {ineligibleCampaigns.map((camp) => renderCampaignCard(camp, false))}
                      </div>
                    </div>
                  )}

                  {/* TẦNG 2: MÃ GIẢM GIÁ */}
                  {allVouchers.length > 0 && (
                    <div className="space-y-3">
                      <div className="title-4 font-display text-primary uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>
                          {t("eligible_vouchers", { count: allVouchers.length }) ||
                            `Mã giảm giá (${allVouchers.length})`}
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
                  <span>{t("order_now_cta") || "Đặt món ngay"}</span>
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
                    {t("skip_promotion_and_continue") || "Bỏ qua ưu đãi và tiếp tục"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplySelected}
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-secondary hover:bg-secondary/95 shadow-sm transition-all text-center cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 font-display"
                  >
                    <span>{t("campaign_applied_count", { count: totalAppliedCount }) || `Áp dụng • ${totalAppliedCount} ưu đãi`}</span>
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
