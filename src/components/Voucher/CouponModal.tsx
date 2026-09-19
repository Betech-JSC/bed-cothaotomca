"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { formatPrice, formatImageUrl } from "@/lib/format";
import {
  PublicVoucherItem,
  getAvailableVouchers,
  ActivePromotion,
  getShippingSettings,
  ShippingSettings,
} from "@/services/orderService";
import { PublicCampaignItem, getActiveCampaigns } from "@/services/campaignService";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth, StorefrontUser } from "@/contexts/AuthContext";

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
  onApplyVoucher?: (code: string) => Promise<boolean | void> | void;
  onRemoveVoucher?: () => void;
  isBrowseOnly?: boolean;
  activePromotions?: ActivePromotion[];
  user?: StorefrontUser | null;
  memberTier?: string;
  shippingSettings?: ShippingSettings | null;
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
  onApplyVoucher,
  onRemoveVoucher,
  isBrowseOnly = false,
  activePromotions,
  user,
  memberTier,
  shippingSettings,
}: CouponModalProps) {
  const t = useTranslations("voucher");
  const router = useRouter();
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

  const [activeTab, setActiveTab] = useState<"campaigns" | "vouchers">(
    !isBrowseOnly || onApplyVoucher ? "vouchers" : "campaigns"
  );
  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>(cachedCampaigns || []);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(cachedVouchers || []);
  const [shippingSettingsState, setShippingSettingsState] = useState<ShippingSettings | null>(shippingSettings || null);
  const [selectedCampaign, setSelectedCampaign] = useState<PublicCampaignItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const appliedVoucherItem = useMemo(() => {
    if (!appliedVoucherCode) return null;
    return vouchers.find((v) => v.code.toUpperCase() === appliedVoucherCode.toUpperCase()) || null;
  }, [appliedVoucherCode, vouchers]);

  useEffect(() => {
    if (isOpen) {
      setFeedbackError(null);
      setFeedbackNotice(null);
      setFeedbackSuccess(null);
      setSelectedCampaign(null);

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

        const hasShippingCard = Boolean(sSettings?.is_min_amount_enabled && sSettings?.card_title);

        if (!isBrowseOnly || onApplyVoucher) {
          setActiveTab("vouchers");
        } else if (camps.length > 0 || hasShippingCard) {
          setActiveTab("campaigns");
        } else {
          setActiveTab("vouchers");
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, isBrowseOnly, onApplyVoucher, shippingSettings]);

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
            const tierName = reqTier === "diamond" ? "Kim Cương" : reqTier === "gold" ? "Vàng" : "Thành viên";
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

  // Split vouchers into 2 distinct tiers (FB-06)
  const eligibleVouchers = useMemo(() => {
    return vouchers.filter((v) => checkVoucherEligibility(v).eligible);
  }, [vouchers, checkVoucherEligibility]);

  const ineligibleVouchers = useMemo(() => {
    return vouchers.filter((v) => !checkVoucherEligibility(v).eligible);
  }, [vouchers, checkVoucherEligibility]);

  if (!isOpen) return null;

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

  const handleManualApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim().toUpperCase();
    if (!trimmed) {
      setFeedbackError("Vui lòng nhập mã giảm giá.");
      setFeedbackNotice(null);
      return;
    }
    const isCodeFreeship = trimmed.includes("FREESHIP") || trimmed.includes("SHIP");
    if (orderIsAutoFreeship && isCodeFreeship) {
      setFeedbackNotice(
        "Đơn hàng đã đạt điều kiện Freeship tự động! Bạn hãy giữ lại mã Freeship này để dùng cho đơn sau nhé."
      );
      setFeedbackError(null);
      return;
    }
    if (canCombineWithFreeship === false && isCodeFreeship) {
      setFeedbackError(
        "Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship"
      );
      setFeedbackNotice(null);
      return;
    }
    await handleApply(trimmed);
  };

  const handleGoShopping = () => {
    onClose();
    router.push("/product" as any);
  };

  const renderVoucherCard = (v: PublicVoucherItem, isEligible: boolean) => {
    const eligibility = checkVoucherEligibility(v);
    const isApplied = appliedVoucherCode.toUpperCase() === v.code.toUpperCase();
    const isFreeship = Boolean(
      v.is_freeship ||
      v.discount_type === "freeship" ||
      v.code.toUpperCase().includes("FREESHIP") ||
      v.code.toUpperCase().includes("SHIP")
    );
    const isDimmedByNonCombinableVoucher = Boolean(
      appliedVoucherItem &&
      appliedVoucherItem.can_combine_with_promotions === false &&
      !isApplied &&
      !isFreeship
    );

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
                    Hạng {v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "Kim Cương" : "Vàng") : "VIP"}
                  </span>
                )}
                {v.can_combine_with_promotions === false && (
                  <span className="body-3 font-sans font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                    {t("no_combo_with_promos")}
                  </span>
                )}
                {v.can_combine_with_freeship === false && (
                  <span className="body-3 font-sans font-medium text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
                    {t("no_combo_with_freeship")}
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

            <div className="flex items-center justify-end pt-1.5 border-t border-gray-200/60 gap-2">
              {!isBrowseOnly && onApplyVoucher && (
                <button
                  type="button"
                  disabled
                  className="font-display title-4 font-bold text-gray-400 bg-gray-200 px-4 py-1.5 rounded-full cursor-not-allowed"
                >
                  {t("apply")}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. Voucher ĐỦ ĐIỀU KIỆN
    return (
      <div
        key={v.code}
        onClick={() => {
          if (!isBrowseOnly && onApplyVoucher && !isApplied && !isDimmedByNonCombinableVoucher) {
            handleApply(v.code);
          }
        }}
        className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row bg-white shadow-xs ${
          isDimmedByNonCombinableVoucher
            ? "opacity-50 border-gray-200 cursor-not-allowed bg-gray-50/70"
            : isApplied
              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40 cursor-pointer"
              : "border-gray-200 hover:border-secondary/40 hover:shadow-md cursor-pointer"
        }`}
      >
        {/* Left Badge */}
        <div className={`sm:w-28 py-3 px-3 flex sm:flex-col items-center justify-center gap-1 text-center shrink-0 text-white ${
          isDimmedByNonCombinableVoucher ? "bg-gray-400" : "bg-secondary"
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
                  Hạng {v.min_member_tier ? (v.min_member_tier.toLowerCase() === "diamond" ? "Kim Cương" : "Vàng") : "VIP"}
                </span>
              )}
              {v.can_combine_with_promotions === false && (
                <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                  {t("no_combo_with_promos")}
                </span>
              )}
              {v.can_combine_with_freeship === false && (
                <span className="body-3 font-sans font-medium text-secondary bg-yellow/60 px-1.5 py-0.5 rounded border border-secondary/20">
                  {t("no_combo_with_freeship")}
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

            {isDimmedByNonCombinableVoucher && (
              <p className="text-secondary text-xs font-semibold mt-1 animate-fade-in">
                Không áp dụng đồng thời với ưu đãi bạn đang chọn
              </p>
            )}
          </div>

          {/* Action Buttons */}
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

            {!isBrowseOnly && onApplyVoucher && (
              isApplied ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveVoucher?.();
                  }}
                  className="body-3 font-display font-bold text-secondary bg-yellow/60 hover:bg-yellow px-3 py-1 rounded-full border border-secondary/30 transition-all cursor-pointer"
                >
                  {t("unapply")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={applyingCode === v.code || isDimmedByNonCombinableVoucher}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDimmedByNonCombinableVoucher) {
                      handleApply(v.code);
                    }
                  }}
                  className={`font-display title-4 font-bold rounded-full transition-all shadow-xs ${
                    isDimmedByNonCombinableVoucher
                      ? "text-gray-400 bg-gray-200 px-4 py-1.5 cursor-not-allowed"
                      : "text-white bg-secondary hover:bg-secondary/95 px-4 py-1.5 cursor-pointer"
                  }`}
                >
                  {applyingCode === v.code ? "..." : t("apply")}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

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
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                  {allCampaigns.length + vouchers.length > 0
                    ? t("active_promos", { count: allCampaigns.length + vouchers.length })
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

            {/* Segmented Tabs: Chương trình ưu đãi & Mã giảm giá */}
            <div className="flex border-b border-gray-100 bg-gray-50/60 p-1.5 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("campaigns")}
                className={`flex-1 py-2 px-3 font-display title-4 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "campaigns"
                    ? "bg-white text-secondary shadow-xs border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>{t("tab_campaigns")}</span>
                {allCampaigns.length > 0 && (
                  <span className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {allCampaigns.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vouchers")}
                className={`flex-1 py-2 px-3 font-display title-4 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "vouchers"
                    ? "bg-white text-secondary shadow-xs border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>{t("tab_vouchers")}</span>
                {vouchers.length > 0 && (
                  <span className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {vouchers.length}
                  </span>
                )}
              </button>
            </div>

            {/* Manual Voucher Input (when on Vouchers tab) */}
            {activeTab === "vouchers" && (
              <div className="p-3 bg-white border-b border-gray-100 shrink-0">
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
                {feedbackNotice && (
                  <p className="body-3 font-sans text-secondary font-semibold mt-2 px-2">
                    {feedbackNotice}
                  </p>
                )}
                {feedbackError && (
                  <p className="body-3 font-sans text-secondary font-semibold mt-2 px-2">
                    {feedbackError}
                  </p>
                )}
                {feedbackSuccess && (
                  <p className="body-3 font-sans text-secondary font-semibold mt-2 px-2">
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

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && allCampaigns.length === 0 && vouchers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="body-3 font-sans text-gray-500 font-medium">Đang tải...</p>
                </div>
              ) : activeTab === "campaigns" ? (
                /* ================================================================= */
                /* TAB 1: CAMPAIGNS LIST (Bao gồm Card Ưu Đãi Ship nếu có - FB-04) */
                /* ================================================================= */
                allCampaigns.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="body-2 font-sans font-semibold text-gray-600">{t("no_vouchers")}</p>
                    <p className="body-3 font-sans text-gray-400">{t("no_vouchers_hint")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="title-4 font-display text-gray-500 uppercase tracking-wider font-bold">
                      {t("tab_campaigns")}
                    </div>

                    <div className="space-y-3">
                      {allCampaigns.map((camp) => (
                        <div
                          key={camp.id}
                          onClick={() => setSelectedCampaign(camp)}
                          className="group relative rounded-2xl border border-gray-200 bg-white p-3 hover:border-secondary/60 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 active:scale-[0.99]"
                        >
                          {/* Left: Square Banner (1:1) */}
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

                          {/* Right: 3 distinct rows */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                            {/* Row 1: Tên chương trình */}
                            <h4 className="title-3 font-display text-primary font-bold leading-snug line-clamp-2 group-hover:text-secondary transition-colors">
                              {camp.name}
                            </h4>

                            {/* Row 2: Thời gian diễn ra */}
                            <div className="body-2 font-sans font-bold text-gray-800">
                              <span className="line-clamp-1">
                                {t("duration")}{" "}
                                <span className="text-secondary font-bold font-sans">
                                  {formatCampaignDuration(camp.start_at, camp.end_at)}
                                </span>
                              </span>
                            </div>

                            {/* Row 3: Ghi chú đặc biệt */}
                            {camp.special_note ? (
                              <div className="body-3 font-sans text-gray-500 italic">
                                <span className="line-clamp-1">{camp.special_note}</span>
                              </div>
                            ) : (
                              <div className="body-3 font-sans text-gray-400 italic">
                                {t("click_to_view_terms")}
                              </div>
                            )}
                          </div>

                          {/* Right Arrow indicator */}
                          <div className="text-gray-300 group-hover:text-secondary text-sm shrink-0 pr-1">
                            ›
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                /* ================================================================= */
                /* TAB 2: VOUCHERS LIST - PHÂN TÁCH 2 TẦNG RÕ RỆT (FB-06) */
                /* ================================================================= */
                vouchers.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="body-2 font-sans font-semibold text-gray-600">{t("no_vouchers")}</p>
                    <p className="body-3 font-sans text-gray-400">{t("no_vouchers_hint")}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Tầng 1: Mã giảm giá khả dụng */}
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

                    {/* Tầng 2: Mã chưa đủ điều kiện */}
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
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center body-3 font-sans text-gray-500 shrink-0">
              <span>{t("system_wide")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
