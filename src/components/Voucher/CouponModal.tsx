"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { formatPrice, formatImageUrl } from "@/lib/format";
import { PublicVoucherItem, getAvailableVouchers } from "@/services/orderService";
import { PublicCampaignItem, getActiveCampaigns } from "@/services/campaignService";
import { useRouter } from "@/i18n/routing";

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal?: number;
  shippingFee?: number;
  appliedVoucherCode?: string;
  onApplyVoucher?: (code: string) => Promise<boolean | void> | void;
  onRemoveVoucher?: () => void;
  isBrowseOnly?: boolean;
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
  shippingFee = 0,
  appliedVoucherCode = "",
  onApplyVoucher,
  onRemoveVoucher,
  isBrowseOnly = false,
}: CouponModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"campaigns" | "vouchers">("campaigns");
  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>(cachedCampaigns || []);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>(cachedVouchers || []);
  const [selectedCampaign, setSelectedCampaign] = useState<PublicCampaignItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedbackError(null);
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

  // Split vouchers into eligible and ineligible
  const { eligibleVouchers, ineligibleVouchers } = useMemo(() => {
    const eligible: PublicVoucherItem[] = [];
    const ineligible: PublicVoucherItem[] = [];

    vouchers.forEach((v) => {
      const minSpend = Number(v.prereq_price || 0);
      if (minSpend === 0 || subtotal >= minSpend || isBrowseOnly) {
        eligible.push(v);
      } else {
        ineligible.push(v);
      }
    });

    return { eligibleVouchers: eligible, ineligibleVouchers: ineligible };
  }, [vouchers, subtotal, isBrowseOnly]);

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
    setFeedbackSuccess(null);
    try {
      await onApplyVoucher(code);
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
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-amber-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-secondary transition-colors cursor-pointer"
              >
                <span className="text-base leading-none">←</span>
                <span>Quay lại</span>
              </button>

              <h3 className="title-3 font-display text-primary font-bold text-center flex-1 px-2 line-clamp-1">
                Chi Tiết Chương Trình
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
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-orange-50">
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
              <div className="text-center space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Cố Thao Tôm Cà
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight font-display">
                  {selectedCampaign.name}
                </h2>
              </div>

              {/* Timing & Special Note Info Card */}
              <div className="bg-orange-50/60 rounded-2xl p-3.5 border border-orange-200/70 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-gray-900 font-bold text-xs sm:text-sm">
                  <span className="text-base shrink-0 leading-none">📅</span>
                  <div>
                    <span>Thời gian diễn ra: </span>
                    <span className="text-secondary font-bold">
                      {formatCampaignDuration(selectedCampaign.start_at, selectedCampaign.end_at)}
                    </span>
                  </div>
                </div>

                {selectedCampaign.special_note && (
                  <div className="flex items-start gap-2 text-gray-600 italic text-[11px] sm:text-xs">
                    <span className="text-sm shrink-0 leading-none not-italic">ℹ️</span>
                    <span>{selectedCampaign.special_note}</span>
                  </div>
                )}
              </div>

              {/* Detailed Program Description / Terms */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Thông tin chi tiết chương trình
                </h4>
                <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/70 p-4 rounded-xl border border-gray-200/60">
                  {selectedCampaign.description || "Chương trình ưu đãi áp dụng theo điều khoản của hệ thống."}
                </div>
              </div>
            </div>

            {/* Detail Footer CTA */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleGoShopping}
                className="w-full py-3 px-6 bg-secondary hover:bg-secondary/95 text-white font-bold text-sm sm:text-base rounded-full shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 font-display"
              >
                <span>🛒</span>
                <span>Bắt đầu đặt hàng</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* LIST VIEW: CAMPAIGNS & VOUCHERS */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-amber-50/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <svg className="w-4.5 h-4.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2.5 2.5 0 0 0 0-5V6z" />
                    <path d="M9 12h6" strokeDasharray="2 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="title-2 font-display text-primary font-bold leading-tight">
                    Phiếu ưu đãi của bạn
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {campaigns.length + vouchers.length > 0
                      ? `${campaigns.length + vouchers.length} ưu đãi đang diễn ra`
                      : "Khám phá các chương trình ưu đãi đặc quyền"}
                  </p>
                </div>
              </div>

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

            {/* Segmented Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50/60 p-1.5 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("campaigns")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "campaigns"
                    ? "bg-white text-secondary shadow-xs border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>🔥</span>
                <span>Chương trình ưu đãi</span>
                {campaigns.length > 0 && (
                  <span className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {campaigns.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vouchers")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "vouchers"
                    ? "bg-white text-secondary shadow-xs border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>🎟️</span>
                <span>Mã giảm giá</span>
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
                      }}
                      placeholder="Nhập mã giảm giá khác..."
                      className="w-full h-10 px-3.5 text-xs font-semibold uppercase rounded-full border border-gray-300 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-gray-400 placeholder:normal-case transition-all"
                    />
                    {manualCode && (
                      <button
                        type="button"
                        onClick={() => setManualCode("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || applyingCode === manualCode.trim().toUpperCase()}
                    className="px-4 h-10 bg-secondary hover:bg-secondary/95 text-white text-xs font-bold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs font-display"
                  >
                    {applyingCode === manualCode.trim().toUpperCase() ? "..." : "Áp dụng"}
                  </button>
                </form>

                {/* Feedback alerts */}
                {feedbackError && (
                  <p className="text-xs text-red-600 font-semibold mt-2 px-2 flex items-center gap-1">
                    <span>⚠️</span> <span>{feedbackError}</span>
                  </p>
                )}
                {feedbackSuccess && (
                  <p className="text-xs text-emerald-600 font-semibold mt-2 px-2 flex items-center gap-1">
                    <span>✓</span> <span>{feedbackSuccess}</span>
                  </p>
                )}
                {copiedCode && (
                  <p className="text-xs text-secondary font-semibold mt-2 px-2 flex items-center gap-1">
                    <span>📋</span> <span>Đã sao chép mã <strong>{copiedCode}</strong> vào bộ nhớ tạm!</span>
                  </p>
                )}
              </div>
            )}

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && campaigns.length === 0 && vouchers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500 font-medium">Đang tải danh sách ưu đãi...</p>
                </div>
              ) : activeTab === "campaigns" ? (
                /* ================================================================= */
                /* TAB 1: CAMPAIGNS LIST (Square Banner + 3 Rows Layout) */
                /* ================================================================= */
                campaigns.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="text-4xl">🎁</div>
                    <p className="text-sm font-semibold text-gray-600">Hiện chưa có chương trình ưu đãi nào</p>
                    <p className="text-xs text-gray-400">Bạn có thể kiểm tra tab Mã giảm giá để xem các voucher áp dụng.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Chương trình đang diễn ra</span>
                    </div>

                    <div className="space-y-3">
                      {campaigns.map((camp) => (
                        <div
                          key={camp.id}
                          onClick={() => setSelectedCampaign(camp)}
                          className="group relative rounded-2xl border border-amber-200/90 bg-white p-3 hover:border-secondary/60 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 active:scale-[0.99]"
                        >
                          {/* Left: Square Banner (1:1) */}
                          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-orange-50 shrink-0 relative border border-orange-100 flex items-center justify-center">
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
                                <span className="text-2xl leading-none">🎁</span>
                                <span className="text-[9px] font-bold uppercase mt-1">Ưu đãi</span>
                              </div>
                            )}
                          </div>

                          {/* Right: 3 distinct rows */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                            {/* Row 1: Tên chương trình */}
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-secondary transition-colors font-display">
                              {camp.name}
                            </h4>

                            {/* Row 2: Thời gian diễn ra (Chữ to đậm hơn) */}
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-800">
                              <span className="text-xs shrink-0 leading-none">📅</span>
                              <span className="line-clamp-1">
                                Thời gian diễn ra:{" "}
                                <span className="text-secondary font-bold">
                                  {formatCampaignDuration(camp.start_at, camp.end_at)}
                                </span>
                              </span>
                            </div>

                            {/* Row 3: Ghi chú đặc biệt (In nghiêng, chữ nhạt hơn) */}
                            {camp.special_note ? (
                              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 italic">
                                <span className="text-[11px] shrink-0 leading-none not-italic">ℹ️</span>
                                <span className="line-clamp-1">{camp.special_note}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-400 italic">
                                * Bấm để xem chi tiết điều kiện áp dụng
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
                /* TAB 2: VOUCHERS LIST */
                /* ================================================================= */
                vouchers.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="text-4xl">🏷️</div>
                    <p className="text-sm font-semibold text-gray-600">Hiện chưa có mã voucher nào</p>
                    <p className="text-xs text-gray-400">Bạn có thể nhập mã voucher ở khung phía trên.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* SECTION 1: Mã đủ điều kiện */}
                    {eligibleVouchers.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Mã đủ điều kiện áp dụng ({eligibleVouchers.length})</span>
                        </div>

                        <div className="space-y-2.5">
                          {eligibleVouchers.map((v) => {
                            const isApplied = appliedVoucherCode.toUpperCase() === v.code.toUpperCase();
                            const isFreeship = v.is_freeship || v.discount_type === "freeship";

                            return (
                              <div
                                key={v.code}
                                className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row bg-white shadow-xs ${
                                  isApplied
                                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                                    : "border-amber-200/80 hover:border-amber-300 hover:shadow-md"
                                }`}
                              >
                                {/* Left Badge */}
                                <div
                                  className={`sm:w-28 py-3 px-3 flex sm:flex-col items-center justify-center gap-1 text-center shrink-0 ${
                                    isFreeship
                                      ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
                                      : "bg-gradient-to-br from-[#CD4829] to-[#E65100] text-white"
                                  }`}
                                >
                                  <span className="text-lg leading-none">{isFreeship ? "🚚" : "🏷️"}</span>
                                  <span className="text-xs font-bold uppercase tracking-wider leading-tight">
                                    {isFreeship
                                      ? "FREESHIP"
                                      : v.discount_type === "percent"
                                        ? `GIẢM ${v.value}%`
                                        : `GIẢM ${formatPrice(v.value)}`}
                                  </span>
                                </div>

                                {/* Center Content */}
                                <div className="flex-1 p-3 flex flex-col justify-between space-y-1.5">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-xs text-primary bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        {v.code}
                                      </span>
                                      {isApplied && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                          Đang dùng
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-semibold text-gray-800 mt-1 leading-snug">
                                      {v.description || v.campaign_name}
                                    </p>
                                    {v.prereq_price && v.prereq_price > 0 ? (
                                      <p className="text-[11px] text-gray-500 mt-0.5">
                                        Đơn tối thiểu: <strong>{formatPrice(v.prereq_price)}</strong>
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                        Áp dụng cho mọi giá trị đơn hàng
                                      </p>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(v.code)}
                                      className="text-xs text-gray-500 hover:text-secondary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <span>📋</span>
                                      <span>{copiedCode === v.code ? "Đã chép mã" : "Sao chép mã"}</span>
                                    </button>

                                    {!isBrowseOnly && onApplyVoucher && (
                                      isApplied ? (
                                        <button
                                          type="button"
                                          onClick={onRemoveVoucher}
                                          className="text-xs text-red-600 font-bold bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full border border-red-200 transition-all cursor-pointer"
                                        >
                                          Bỏ áp dụng
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={applyingCode === v.code}
                                          onClick={() => handleApply(v.code)}
                                          className="text-xs font-bold text-white bg-secondary hover:bg-secondary/95 px-3.5 py-1 rounded-full transition-all cursor-pointer shadow-xs font-display"
                                        >
                                          {applyingCode === v.code ? "..." : "Áp dụng"}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: Mã chưa đủ điều kiện */}
                    {ineligibleVouchers.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🔒</span>
                          <span>Mã chưa đủ điều kiện ({ineligibleVouchers.length})</span>
                        </div>

                        <div className="space-y-2.5">
                          {ineligibleVouchers.map((v) => {
                            const minSpend = Number(v.prereq_price || 0);
                            const missingAmount = Math.max(0, minSpend - subtotal);
                            const isFreeship = v.is_freeship || v.discount_type === "freeship";

                            return (
                              <div
                                key={v.code}
                                className="relative rounded-2xl border border-gray-200/80 bg-gray-50/70 p-3 space-y-2 opacity-85 hover:opacity-100 transition-opacity"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-xs text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded">
                                        {v.code}
                                      </span>
                                      <span className="text-xs font-bold text-gray-700">
                                        {isFreeship
                                          ? "Miễn phí vận chuyển"
                                          : v.discount_type === "percent"
                                            ? `Giảm ${v.value}%`
                                            : `Giảm ${formatPrice(v.value)}`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {v.description || v.campaign_name}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(v.code)}
                                    className="text-[11px] text-gray-500 hover:text-secondary font-medium px-2 py-1 rounded bg-white border border-gray-200 shrink-0 cursor-pointer"
                                  >
                                    {copiedCode === v.code ? "✓ Đã chép" : "Chép mã"}
                                  </button>
                                </div>

                                <div className="bg-amber-100/70 rounded-xl px-3 py-1.5 text-xs text-amber-900 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <span>💡</span>
                                    <span>
                                      Mua thêm <strong>{formatPrice(missingAmount)}</strong> để dùng mã này
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleGoShopping}
                                    className="text-[11px] font-bold text-secondary underline shrink-0 cursor-pointer"
                                  >
                                    Mua thêm
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
              <span>* Ưu đãi áp dụng trên toàn bộ hệ thống</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="font-bold text-secondary hover:underline cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
