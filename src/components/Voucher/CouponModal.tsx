"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { formatPrice, formatImageUrl } from "@/lib/format";
import {
  PublicVoucherItem,
  getAvailableVouchers,
  ActivePromotion,
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
  appliedVoucherCode?: string;
  onApplyVoucher?: (code: string) => Promise<boolean | void> | void;
  onRemoveVoucher?: () => void;
  isBrowseOnly?: boolean;
  activePromotions?: ActivePromotion[];
  user?: StorefrontUser | null;
  memberTier?: string;
}

// Module-level in-memory cache to prevent layout shift / flickering on open
let cachedCampaigns: PublicCampaignItem[] | null = null;
let cachedVouchers: PublicVoucherItem[] | null = null;

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
  appliedVoucherCode = "",
  onApplyVoucher,
  onRemoveVoucher,
  isBrowseOnly = false,
  activePromotions,
  user,
  memberTier,
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

  const [activeTab, setActiveTab] = useState<"campaigns" | "vouchers">(
    !isBrowseOnly || onApplyVoucher ? "vouchers" : "campaigns"
  );
  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>(cachedCampaigns || []);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(cachedVouchers || []);
  const [selectedCampaign, setSelectedCampaign] = useState<PublicCampaignItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

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

      Promise.all([
        getActiveCampaigns().catch(() => []),
        getAvailableVouchers().catch(() => []),
      ]).then(([camps, vows]) => {
        cachedCampaigns = camps;
        cachedVouchers = vows;
        setCampaigns(camps);
        setVouchers(vows);

        if (!isBrowseOnly || onApplyVoucher) {
          setActiveTab("vouchers");
        } else if (camps.length > 0) {
          setActiveTab("campaigns");
        } else {
          setActiveTab("vouchers");
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, isBrowseOnly, onApplyVoucher]);

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

  const hasCampaignWithNoPromotions = useMemo(() => {
    return activeCartPromos.some((p) => p.can_combine_with_promotions === false);
  }, [activeCartPromos]);

  // Check eligibility for each voucher
  const checkVoucherEligibility = useCallback(
    (v: PublicVoucherItem): { eligible: boolean; reason?: string; missingAmount?: number } => {
      const isFreeship = Boolean(v.is_freeship || v.discount_type === "freeship");

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

      // 3. Campaign forbids other promotions check
      if (hasCampaignWithNoPromotions && v.can_combine_with_promotions === false) {
        return {
          eligible: false,
          reason:
            t("campaign_no_promotions") ||
            "Mã này không áp dụng đồng thời với chương trình khuyến mãi trong giỏ hàng",
        };
      }

      // 4. Minimum spend check
      const minSpend = Number(v.prereq_price || 0);
      const effectiveSpend =
        v.can_combine_with_promotions === false && originalSubtotal !== undefined
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
      hasCampaignWithNoFreeship,
      hasCampaignWithNoPromotions,
      subtotal,
      originalSubtotal,
      t,
    ]
  );

  // Single sorted vouchers list: eligible vouchers first, followed by ineligible ones
  const sortedVouchers = useMemo(() => {
    return [...vouchers].sort((a, b) => {
      const aEligible = checkVoucherEligibility(a).eligible ? 1 : 0;
      const bEligible = checkVoucherEligibility(b).eligible ? 1 : 0;
      return bEligible - aEligible;
    });
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
      setFeedbackError(err?.message || "Không thể áp dụng mã này.");
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
    await handleApply(trimmed);
  };

  const handleGoShopping = () => {
    onClose();
    router.push("/product" as any);
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
                  {campaigns.length + vouchers.length > 0
                    ? t("active_promos", { count: campaigns.length + vouchers.length })
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
                {campaigns.length > 0 && (
                  <span className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {campaigns.length}
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
              {loading && campaigns.length === 0 && vouchers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="body-3 font-sans text-gray-500 font-medium">Đang tải...</p>
                </div>
              ) : activeTab === "campaigns" ? (
                /* ================================================================= */
                /* TAB 1: CAMPAIGNS LIST */
                /* ================================================================= */
                campaigns.length === 0 ? (
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
                      {campaigns.map((camp) => (
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
                /* TAB 2: VOUCHERS LIST - 1 DANH SÁCH DUY NHẤT */
                /* ================================================================= */
                sortedVouchers.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="body-2 font-sans font-semibold text-gray-600">{t("no_vouchers")}</p>
                    <p className="body-3 font-sans text-gray-400">{t("no_vouchers_hint")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedVouchers.map((v) => {
                      const eligibility = checkVoucherEligibility(v);
                      const isEligible = eligibility.eligible;
                      const isApplied = appliedVoucherCode.toUpperCase() === v.code.toUpperCase();
                      const isFreeship = Boolean(v.is_freeship || v.discount_type === "freeship");

                      // 1. Voucher KHÔNG ĐỦ ĐIỀU KIỆN
                      if (!isEligible) {
                        return (
                          <div
                            key={v.code}
                            className="opacity-60 bg-gray-100/70 pointer-events-none cursor-not-allowed select-none relative rounded-2xl border border-gray-200/80 transition-all overflow-hidden flex flex-col sm:flex-row shadow-xs"
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

                                {/* Reason why ineligible (100% Plain Text, No SVG, Brand Color text-secondary) */}
                                {eligibility.reason && (
                                  <p className="text-secondary text-xs font-semibold mt-1.5 leading-normal">
                                    {eligibility.reason}
                                  </p>
                                )}

                                {(eligibility as any).missingAmount !== undefined && (eligibility as any).missingAmount > 0 && (
                                  <p className="text-gray-500 text-xs mt-0.5">
                                    Mua thêm <strong className="text-secondary font-bold">{formatPrice((eligibility as any).missingAmount)}</strong> để dùng mã này
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
                            if (!isBrowseOnly && onApplyVoucher && !isApplied) {
                              handleApply(v.code);
                            }
                          }}
                          className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row bg-white shadow-xs cursor-pointer ${
                            isApplied
                              ? "border-secondary ring-2 ring-secondary/20 bg-yellow/40"
                              : "border-gray-200 hover:border-secondary/40 hover:shadow-md"
                          }`}
                        >
                          {/* Left Badge */}
                          <div className="sm:w-28 py-3 px-3 flex sm:flex-col items-center justify-center gap-1 text-center shrink-0 bg-secondary text-white">
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
                                    disabled={applyingCode === v.code}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApply(v.code);
                                    }}
                                    className="font-display title-4 font-bold text-white bg-secondary hover:bg-secondary/95 px-4 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
                                  >
                                    {applyingCode === v.code ? "..." : t("apply")}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
