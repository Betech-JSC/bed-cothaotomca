"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { formatPrice, formatImageUrl } from "@/lib/format";
import {
  PublicVoucherItem,
  getAvailableVouchers,
  validateVoucher,
  ActivePromotion,
  getShippingSettings,
  ShippingSettings,
} from "@/services/orderService";
import {
  PublicCampaignItem,
  getActiveCampaigns,
  CampaignEligibilityResult,
  CampaignLockResult,
} from "@/services/campaignService";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth, StorefrontUser } from "@/contexts/AuthContext";

export function formatPrivateVoucherError(errMsg: string): string {
  const msgLower = (errMsg || "").toLowerCase();
  if (
    msgLower.includes("chỉ dành cho khách hàng thành viên") ||
    msgLower.includes("chỉ dành riêng cho thành viên") ||
    msgLower.includes("vui lòng đăng nhập") ||
    msgLower.includes("đạt hạng") ||
    msgLower.includes("hạng") ||
    msgLower.includes("chỉ áp dụng cho đơn hàng từ") ||
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

export interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal?: number;
  originalSubtotal?: number;
  shippingFee?: number;
  isFreeship?: boolean;
  isAutoFreeship?: boolean;
  canCombineWithFreeship?: boolean;
  appliedVoucherCode?: string;
  appliedVoucherCodes?: string[];
  appliedCampaignIds?: (number | string)[];
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
}

// Module-level in-memory cache to prevent layout shift / flickering on open
let cachedCampaigns: PublicCampaignItem[] | null = null;
let cachedVouchers: PublicVoucherItem[] | null = null;

export function resetCouponModalCache(): void {
  cachedCampaigns = null;
  cachedVouchers = null;
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

export default function CouponModal({
  isOpen,
  onClose,
  subtotal = 0,
  originalSubtotal,
  shippingFee = 0,
  isFreeship = false,
  isAutoFreeship,
  canCombineWithFreeship,
  appliedVoucherCode = "",
  appliedVoucherCodes,
  appliedCampaignIds,
  onApplyVoucher,
  onApplyVouchers,
  onApplyCampaigns,
  onRemoveVoucher,
  isBrowseOnly = false,
  activePromotions,
  user,
  memberTier,
  shippingSettings,
  privateVouchers,
  onAddPrivateVoucher,
}: CouponModalProps) {
  const t = useTranslations("voucher");
  const router = useRouter();
  const pathname = typeof usePathname === "function" ? usePathname() : "";
  const isCheckoutRoute = Boolean(
    pathname && (
      pathname === "/checkout" ||
      pathname.endsWith("/checkout") ||
      pathname.includes("/checkout")
    )
  );
  const isBrowseMode = Boolean(isBrowseOnly || !isCheckoutRoute);
  const showSkipButton = !isBrowseOnly && isCheckoutRoute;
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

  const orderIsAutoFreeship = isAutoFreeship !== undefined
    ? isAutoFreeship
    : Boolean(isFreeship && shippingFee === 0);

  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>(cachedCampaigns || []);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(cachedVouchers || []);
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
      const minSpend = Number(c.min_order_value || 0);
      const effectiveSpend =
        c.can_combine_with_promotions === false && originalSubtotal !== undefined && originalSubtotal > 0
          ? originalSubtotal
          : subtotal;

      if (minSpend > 0 && effectiveSpend < minSpend) {
        const missingAmount = Math.max(0, minSpend - effectiveSpend);
        return {
          eligible: false,
          reason: `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}. Mua thêm ${formatPrice(missingAmount)} để áp dụng`,
          missingAmount,
        };
      }

      return { eligible: true };
    },
    [subtotal, originalSubtotal]
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
        let initialCodes = (appliedVoucherCodes && appliedVoucherCodes.length > 0)
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
        setSelectedCodes(initialCodes);

        let initialCampaigns = (appliedCampaignIds && appliedCampaignIds.length > 0)
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
        setSelectedCampaignIds(initialCampaigns);

        // If we don't have cached data yet, show smooth loading
        if (!cachedCampaigns || !cachedVouchers) {
          setLoading(true);
        }

        const fetchShipping = shippingSettings !== undefined
          ? Promise.resolve(shippingSettings)
          : getShippingSettings().catch(() => null);

        Promise.all([
          getActiveCampaigns().catch(() => []),
          getAvailableVouchers().catch(() => []),
          fetchShipping,
        ]).then(([camps, vows, sSettings]) => {
          cachedCampaigns = camps;
          cachedVouchers = vows;
          setCampaigns(camps);
          setVouchers(vows);
          setShippingSettingsState(sSettings);
        }).finally(() => {
          setLoading(false);
        });
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, appliedVoucherCode, appliedVoucherCodes, appliedCampaignIds, shippingSettings, subtotal, checkCampaignEligibility]);

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

      // 0. Auto Freeship check: Đơn hàng đã được hưởng Freeship tự động 100%
      if (orderIsAutoFreeship && isFreeship) {
        return {
          eligible: false,
          reason: t("order_already_freeship") || "Đơn hàng đã được Freeship tự động",
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
        return {
          eligible: false,
          reason: `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}`,
          missingAmount,
        };
      }

      return { eligible: true };
    },
    [
      currentUser,
      currentUserTier,
      orderIsAutoFreeship,
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

  const checkCampaignRealtimeLock = useCallback(
    (camp: PublicCampaignItem): CampaignLockResult => {
      const isSelected = selectedCampaignIds.some((id) => String(id) === String(camp.id));
      if (isSelected) {
        return { locked: false };
      }

      // 1. Kiểm tra khóa lẫn nhau giữa các Campaign (Mutex Lock)
      if (selectedCampaignItems.length > 0) {
        const hasNonCombinableCampaign = selectedCampaignItems.some(
          (c) => c.can_combine_with_promotions === false
        );
        if (hasNonCombinableCampaign) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
        if (camp.can_combine_with_promotions === false) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
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
            reason: t("campaign_voucher_locked") || "Không thể sử dụng cùng mã giảm giá đã chọn.",
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
    [selectedCampaignIds, selectedCampaignItems, selectedVoucherItems, t]
  );

  const checkRealtimeLock = useCallback(
    (v: PublicVoucherItem): { locked: boolean; reason?: string } => {
      const isSelected = selectedCodes.some((c) => c.toUpperCase() === v.code.toUpperCase());
      if (isSelected) {
        return { locked: false };
      }

      const isShip = isShipVoucher(v);
      const isFood = isFoodVoucher(v);

      const selectedFood = selectedVoucherItems.find(isFoodVoucher);
      const selectedShip = selectedVoucherItems.find(isShipVoucher);

      // Mutex locks between voucher and campaigns
      const hasNonCombinableCampaign = selectedCampaignItems.some(
        (c) => c.can_combine_with_promotions === false
      );
      const hasCampaignWithNoFreeship = selectedCampaignItems.some(
        (c) => c.can_combine_with_freeship === false
      );

      // Nếu v là mã tiền món:
      if (isFood) {
        if (selectedFood && selectedFood.code.toUpperCase() !== v.code.toUpperCase()) {
          return {
            locked: true,
            reason: "Không thể sử dụng với những ưu đãi đã chọn khác.",
          };
        }
        if (selectedShip) {
          if (selectedShip.can_combine_with_promotions === false || v.can_combine_with_freeship === false) {
            return {
              locked: true,
              reason: "Không thể sử dụng với những ưu đãi đã chọn khác.",
            };
          }
        }
        if (hasNonCombinableCampaign) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
        if (v.can_combine_with_promotions === false && selectedCampaignItems.length > 0) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
      }

      // Nếu v là mã Freeship:
      if (isShip) {
        if (selectedShip && selectedShip.code.toUpperCase() !== v.code.toUpperCase()) {
          return {
            locked: true,
            reason: "Không thể sử dụng với những ưu đãi đã chọn khác.",
          };
        }
        if (selectedFood) {
          if (selectedFood.can_combine_with_freeship === false || v.can_combine_with_promotions === false) {
            return {
              locked: true,
              reason: "Không thể sử dụng với những ưu đãi đã chọn khác.",
            };
          }
        }
        if (hasCampaignWithNoFreeship) {
          return {
            locked: true,
            reason: t("campaign_no_freeship") || "Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship",
          };
        }
        if (v.can_combine_with_promotions === false && selectedCampaignItems.length > 0) {
          return {
            locked: true,
            reason: t("campaign_mutex_locked") || "Không thể sử dụng cùng ưu đãi đã chọn.",
          };
        }
      }

      return { locked: false };
    },
    [selectedCodes, selectedVoucherItems, selectedCampaignItems, t]
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

  const handleToggleVoucher = useCallback(
    (code: string) => {
      const targetVoucher = allVouchers.find((v) => v.code.toUpperCase() === code.toUpperCase());
      if (!targetVoucher) return;

      const eligibility = checkVoucherEligibility(targetVoucher);
      if (!eligibility.eligible) return;

      const lockState = checkRealtimeLock(targetVoucher);
      if (lockState.locked) return;

      setSelectedCodes((prev) => {
        const isSelected = prev.some((c) => c.toUpperCase() === code.toUpperCase());
        if (isSelected) {
          return prev.filter((c) => c.toUpperCase() !== code.toUpperCase());
        } else {
          const isShip = isShipVoucher(targetVoucher);
          const filtered = prev.filter((c) => {
            const existing = allVouchers.find((v) => v.code.toUpperCase() === c.toUpperCase());
            if (!existing) return true;
            return isShip ? !isShipVoucher(existing) : !isFoodVoucher(existing);
          });
          return [...filtered, targetVoucher.code];
        }
      });
    },
    [allVouchers, checkVoucherEligibility, checkRealtimeLock]
  );

  const handleToggleCampaign = useCallback(
    (id: number | string) => {
      const targetCamp = allCampaigns.find((c) => String(c.id) === String(id));
      if (!targetCamp) return;

      const eligibility = checkCampaignEligibility(targetCamp);
      if (!eligibility.eligible) return;

      const lockState = checkCampaignRealtimeLock(targetCamp);
      if (lockState.locked) return;

      setSelectedCampaignIds((prev) => {
        const isSelected = prev.some((cId) => String(cId) === String(id));
        if (isSelected) {
          return prev.filter((cId) => String(cId) !== String(id));
        } else {
          if (targetCamp.can_combine_with_promotions === false) {
            return [targetCamp.id];
          }
          const filtered = prev.filter((cId) => {
            const existing = allCampaigns.find((c) => String(c.id) === String(cId));
            return existing && existing.can_combine_with_promotions !== false;
          });
          return [...filtered, targetCamp.id];
        }
      });
    },
    [allCampaigns, checkCampaignEligibility, checkCampaignRealtimeLock]
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
    if (appliedVoucherCode || (appliedVoucherCodes && appliedVoucherCodes.length > 0)) {
      onRemoveVoucher?.();
    }
    onApplyVouchers?.([]);
    onApplyCampaigns?.([]);
    onClose();
  }, [appliedVoucherCode, appliedVoucherCodes, onRemoveVoucher, onApplyVouchers, onApplyCampaigns, onClose]);

  const totalAppliedCount = selectedCodes.length + selectedCampaignIds.length;

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

      if (onApplyCampaigns) {
        await onApplyCampaigns(selectedCampaignIds);
      }
      if (onApplyVouchers) {
        await onApplyVouchers(selectedCodes);
      } else if (onApplyVoucher) {
        for (const code of selectedCodes) {
          await onApplyVoucher(code);
        }
      }
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
    onApplyCampaigns,
    onApplyVouchers,
    onApplyVoucher,
    handleSkipAndContinue,
    onClose,
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
          setFeedbackError("Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.");
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
            {camp.banner ? (
              <Image
                src={formatImageUrl(camp.banner)}
                alt={camp.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-1 text-secondary">
                <span className="title-4 font-display font-bold uppercase">{t("promo_tag")}</span>
              </div>
            )}
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

    // Tầng 2: Chưa đủ điều kiện
    if (!isEligible) {
      const minSpend = Number(camp.min_order_value || 0);
      const missing = eligibility.missingAmount || 0;
      return (
        <div
          key={camp.id}
          className="opacity-60 bg-gray-100/70 border border-dashed border-gray-300 cursor-not-allowed select-none relative rounded-2xl transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs"
        >
          {/* Banner */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative border border-gray-300 flex items-center justify-center grayscale">
            {camp.banner ? (
              <Image
                src={formatImageUrl(camp.banner)}
                alt={camp.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-1 text-gray-400">
                <span className="title-4 font-display font-bold uppercase">{t("promo_tag")}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
            <h4 className="title-3 font-display text-gray-700 font-bold leading-snug line-clamp-2">
              {camp.name}
            </h4>

            <div className="body-3 font-sans text-gray-500">
              <span className="line-clamp-1">
                {t("duration")}{" "}
                <span className="font-semibold">
                  {formatCampaignDuration(camp.start_at, camp.end_at)}
                </span>
              </span>
            </div>

            {/* Ineligible reason and missing amount hint */}
            <p className="text-secondary text-xs font-semibold leading-normal">
              {eligibility.reason || `Chưa đạt giá trị đơn tối thiểu ${formatPrice(minSpend)}. Mua thêm ${formatPrice(missing)} để áp dụng`}
            </p>

            {/* Terms link with e.stopPropagation() */}
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCampaign(camp);
                }}
                className="body-3 font-sans text-secondary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium mt-1"
              >
                <span>{t("view_terms_detail") || "Chi tiết điều kiện áp dụng ›"}</span>
              </button>
            </div>
          </div>

          {/* Disabled Checkbox */}
          {!isBrowseMode && (
            <div className="flex items-center justify-center pl-2 pr-3.5 py-3 shrink-0">
              <div
                role="checkbox"
                aria-checked={false}
                aria-disabled={true}
                aria-label={camp.name}
                className="w-5 h-5 min-w-[20px] min-h-[20px] rounded-md border border-gray-200 bg-gray-100/80 cursor-not-allowed text-transparent"
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
          if (!isLocked) {
            handleToggleCampaign(camp.id);
          }
        }}
        className={`relative rounded-2xl border transition-all overflow-hidden flex items-center gap-3.5 p-3 shadow-xs ${
          isLocked
            ? "opacity-50 border-gray-200 cursor-not-allowed bg-gray-50/70 select-none"
            : isSelected
              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
              : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer bg-white"
        }`}
      >
        {/* Banner */}
        <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 relative border flex items-center justify-center ${
          isLocked ? "bg-gray-200 border-gray-300 grayscale" : "bg-yellow/60 border-secondary/20"
        }`}>
          {camp.banner ? (
            <Image
              src={formatImageUrl(camp.banner)}
              alt={camp.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className={`flex flex-col items-center justify-center text-center p-1 ${isLocked ? "text-gray-400" : "text-secondary"}`}>
              <span className="title-4 font-display font-bold uppercase">{t("promo_tag")}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`title-3 font-display font-bold leading-snug line-clamp-2 ${
              isLocked ? "text-gray-600" : "text-primary"
            }`}>
              {camp.name}
            </h4>
            {isSelected && (
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
          {isLocked && (
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
              aria-disabled={isLocked}
              aria-label={camp.name}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  handleToggleCampaign(camp.id);
                }
              }}
              className={`w-5 h-5 min-w-[20px] min-h-[20px] rounded-md border flex items-center justify-center transition-all ${
                isLocked
                  ? "border-gray-200 bg-gray-100 cursor-not-allowed text-transparent"
                  : isSelected
                    ? "border-secondary bg-secondary text-white shadow-xs cursor-pointer"
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

    // 1. Voucher KHÔNG ĐỦ ĐIỀU KIỆN
    if (!isEligible) {
      return (
        <div
          key={v.code}
          className="opacity-50 opacity-60 bg-gray-100/70 border border-dashed border-gray-300 pointer-events-none cursor-not-allowed select-none relative rounded-2xl transition-all overflow-hidden flex flex-col sm:flex-row shadow-xs"
        >
          {/* Left Badge */}
          <div className="sm:w-28 py-3 px-3 flex sm:flex-col items-center justify-center gap-1 text-center shrink-0 bg-gray-400 text-white">
            <span className="title-3 font-display font-bold uppercase tracking-wider leading-tight text-white">
              {isFreeship
                ? "FREESHIP"
                : v.discount_type === "percent"
                  ? `-${v.value}%`
                  : `-${formatPrice(v.value)}`}
            </span>
          </div>

          {/* Center Content */}
          <div className="flex-1 p-3 flex flex-col justify-between space-y-1.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                  {v.code}
                </span>
                {v.customer_scope === "member_only" && (
                  <span className="body-3 font-sans font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                    Thành viên
                  </span>
                )}
                {v.customer_scope === "tier_only" && (
                  <span className="body-3 font-sans font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                    Hạng {v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "DIAMOND" : "GOLD") : "VIP"}
                  </span>
                )}
              </div>

              <p className="body-2 font-sans font-bold text-gray-700 mt-1 leading-snug">
                {v.description || v.campaign_name}
              </p>

              {v.prereq_price && v.prereq_price > 0 && (
                <p className="body-3 font-sans text-gray-500 mt-0.5">
                  {t("min_spend", { amount: formatPrice(v.prereq_price) })}
                </p>
              )}

              {/* Reason why ineligible */}
              {eligibility.reason && (
                <p className="text-secondary text-xs font-semibold mt-1.5 leading-normal">
                  {eligibility.reason}
                </p>
              )}

              {(eligibility as any).missingAmount !== undefined && (eligibility as any).missingAmount > 0 && (
                <p className="text-gray-500 text-xs mt-0.5">
                  Mua thêm <strong className="text-secondary font-bold">{formatPrice((eligibility as any).missingAmount)}</strong> để áp dụng (để dùng mã này)
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
              <span className="text-[11px] text-gray-400 font-medium">Mã không khả dụng</span>
            </div>
          </div>

          {/* Right Checkbox (Grab-style disabled) */}
          {!isBrowseMode && (
            <div className="flex items-center justify-center pl-2 pr-3.5 py-3 shrink-0">
              <div
                role="checkbox"
                aria-checked={false}
                aria-disabled={true}
                className="w-5 h-5 rounded-md border border-gray-200 bg-gray-100/80 cursor-not-allowed text-transparent"
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
          if (!isLocked) {
            handleToggleVoucher(v.code);
          }
        }}
        className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row bg-white shadow-xs ${
          isLocked
            ? "opacity-50 border-gray-200 cursor-not-allowed bg-gray-50/70 select-none"
            : isApplied
              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
              : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer"
        }`}
      >
        {/* Left Badge */}
        <div className={`sm:w-28 py-3 px-3 flex sm:flex-col items-center justify-center gap-1 text-center shrink-0 text-white ${
          isLocked ? "bg-gray-400" : "bg-secondary"
        }`}>
          <span className="title-3 font-display font-bold uppercase tracking-wider leading-tight text-white">
            {isFreeship
              ? "FREESHIP"
              : v.discount_type === "percent"
                ? `-${v.value}%`
                : `-${formatPrice(v.value)}`}
          </span>
        </div>

        {/* Center Content */}
        <div className="flex-1 p-3 flex flex-col justify-between space-y-1.5">
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
              {isApplied && (
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

            {isLocked && (
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
          <div className="flex items-center justify-center pl-2 pr-4 py-3 shrink-0">
            <div
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                if (!isLocked) {
                  handleToggleVoucher(v.code);
                }
              }}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                isLocked
                  ? "border-gray-200 bg-gray-100 cursor-not-allowed text-transparent"
                  : isSelected
                    ? "border-secondary bg-secondary text-white shadow-xs cursor-pointer"
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

  if (!isOpen) return null;

  return (
    <div
      className="coupon-modal-root fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Backdrop with smooth fade-in */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={(e) => {
          e.stopPropagation();
          if (selectedCampaign) {
            setSelectedCampaign(null);
          } else {
            onClose();
          }
        }}
      />

      {/* Main Drawer / Modal Container with smooth Slide-Up (Xổ ra từ dưới lên) */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl z-10 max-h-[88vh] flex flex-col overflow-hidden text-gray-900 border border-gray-100 animate-in slide-in-from-bottom-full duration-300 ease-out">

        {/* Mobile Pull Handle Indicator */}
        <div className="w-10 h-1.2 bg-gray-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

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
              {selectedCampaign.banner && (
                <div className="w-full flex justify-center">
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-sm border border-secondary/20 bg-yellow/50">
                    <Image
                      src={formatImageUrl(selectedCampaign.banner)}
                      alt={selectedCampaign.name}
                      fill
                      className="object-cover"
                      unoptimized
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
                  {selectedCampaign.description || t("default_terms")}
                </div>
              </div>
            </div>

            {/* Detail Footer CTA */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleGoShopping}
                className="w-full py-3.5 px-6 bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center font-display title-2"
              >
                <span>{t("start_order")}</span>
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

            {/* Manual Voucher Input (Fixed below header for Private Codes) */}
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
                      className="w-full h-10 px-3.5 body-2 font-sans font-semibold uppercase rounded-full border border-gray-300 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-gray-400 placeholder:normal-case transition-all"
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCode("");
                          setFeedbackError(null);
                          setFeedbackNotice(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || applyingCode === manualCode.trim().toUpperCase()}
                    className="px-5 h-10 bg-secondary hover:bg-secondary/95 text-white font-display title-4 font-bold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs"
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

            {/* List Content - Single Scrollable View */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5">
              {loading && allCampaigns.length === 0 && allVouchers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="body-3 font-sans text-gray-500 font-medium">Đang tải...</p>
                </div>
              ) : allCampaigns.length === 0 && allVouchers.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="body-2 font-sans font-semibold text-gray-600">{t("no_vouchers")}</p>
                  <p className="body-3 font-sans text-gray-400">{t("no_vouchers_hint")}</p>
                </div>
              ) : (
                <>
                  {/* Nhóm 1: CHƯƠNG TRÌNH ƯU ĐÃI KHẢ DỤNG (TẦNG 1) */}
                  {(eligibleCampaigns.length > 0 || shippingPromotionItem) && (
                    <div className="space-y-3">
                      <div className="title-4 font-display text-primary uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>{t("eligible_campaigns", { count: eligibleCampaigns.length + (shippingPromotionItem ? 1 : 0) }) || `Chương trình ưu đãi khả dụng (${eligibleCampaigns.length + (shippingPromotionItem ? 1 : 0)})`}</span>
                      </div>

                      <div className="space-y-3">
                        {eligibleCampaigns.map((camp) => renderCampaignCard(camp, true))}
                        {shippingPromotionItem && renderCampaignCard(shippingPromotionItem, true)}
                      </div>
                    </div>
                  )}

                  {/* Nhóm 2: MÃ GIẢM GIÁ KHẢ DỤNG */}
                  {eligibleVouchers.length > 0 && (
                    <div className="space-y-3">
                      <div className="title-4 font-display text-primary uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>Mã giảm giá khả dụng ({eligibleVouchers.length})</span>
                      </div>
                      <div className="space-y-3">
                        {eligibleVouchers.map((v) => renderVoucherCard(v, true))}
                      </div>
                    </div>
                  )}

                  {/* Nhóm 3: CHƯƠNG TRÌNH CHƯA ĐỦ ĐIỀU KIỆN (TẦNG 2) */}
                  {ineligibleCampaigns.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="title-4 font-display text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>{t("ineligible_campaigns", { count: ineligibleCampaigns.length }) || `Chương trình chưa đủ điều kiện (${ineligibleCampaigns.length})`}</span>
                      </div>
                      <div className="space-y-3">
                        {ineligibleCampaigns.map((camp) => renderCampaignCard(camp, false))}
                      </div>
                    </div>
                  )}

                  {/* Nhóm 4: MÃ CHƯA ĐỦ ĐIỀU KIỆN */}
                  {ineligibleVouchers.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="title-4 font-display text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
                        <span>Mã chưa đủ điều kiện ({ineligibleVouchers.length})</span>
                      </div>
                      <div className="space-y-3">
                        {ineligibleVouchers.map((v) => renderVoucherCard(v, false))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Bar: Pinned CTA button (Grab-style) */}
            {isBrowseMode ? (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-lg shrink-0 z-20">
                <button
                  type="button"
                  onClick={handleGoShopping}
                  className="w-full py-3.5 px-4 rounded-2xl text-base font-bold text-white bg-secondary hover:bg-secondary/95 shadow-md hover:shadow-lg transition-all text-center cursor-pointer active:scale-[0.99] flex items-center justify-center font-display"
                >
                  <span>{t("order_now_cta") || "Đặt món ngay"}</span>
                </button>
              </div>
            ) : (totalAppliedCount > 0 || showSkipButton) ? (
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 shadow-lg shrink-0 z-20">
                {totalAppliedCount === 0 ? (
                  <button
                    type="button"
                    onClick={handleSkipAndContinue}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all text-center cursor-pointer active:scale-[0.99]"
                  >
                    Bỏ qua ưu đãi và tiếp tục
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplySelected}
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-secondary hover:bg-secondary/95 shadow-sm transition-all text-center cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>{t("campaign_applied_count", { count: totalAppliedCount }) || `Áp dụng • ${totalAppliedCount} ưu đãi`}</span>
                  </button>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
