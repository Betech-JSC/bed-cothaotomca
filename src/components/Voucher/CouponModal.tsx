"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatPrice } from "@/lib/format";
import { PublicVoucherItem, getAvailableVouchers } from "@/services/orderService";
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
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFeedbackError(null);
      setFeedbackSuccess(null);
      getAvailableVouchers()
        .then((data) => setVouchers(data))
        .catch(() => setVouchers([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

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
      className="coupon-modal-root fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal Container / Bottom Drawer */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl z-10 max-h-[88vh] flex flex-col overflow-hidden text-gray-900 border border-gray-100 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <div>
              <h3 className="title-2 font-display text-primary font-bold leading-tight">
                {isBrowseOnly ? "Danh Sách Mã Giảm Giá" : "Chọn Mã Giảm Giá"}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {vouchers.length > 0 ? `${vouchers.length} ưu đãi đang diễn ra` : "Khám phá các ưu đãi đặc quyền"}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-primary hover:bg-gray-100 border border-gray-200 text-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {/* Manual Input Form */}
        <div className="p-4 bg-white border-b border-gray-100">
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
                className="w-full h-11 px-4 text-sm font-semibold uppercase rounded-full border border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-gray-400 placeholder:normal-case transition-all"
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
              className="px-5 h-11 bg-secondary hover:bg-secondary/95 text-white text-sm font-bold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-sm"
            >
              {applyingCode === manualCode.trim().toUpperCase() ? "..." : "Áp dụng"}
            </button>
          </form>

          {/* Feedback alerts */}
          {feedbackError && (
            <p className="text-xs text-red-600 font-semibold mt-2 px-2 flex items-center gap-1 animate-fade-in">
              <span>⚠️</span> <span>{feedbackError}</span>
            </p>
          )}
          {feedbackSuccess && (
            <p className="text-xs text-emerald-600 font-semibold mt-2 px-2 flex items-center gap-1 animate-fade-in">
              <span>✓</span> <span>{feedbackSuccess}</span>
            </p>
          )}
          {copiedCode && (
            <p className="text-xs text-secondary font-semibold mt-2 px-2 flex items-center gap-1 animate-fade-in">
              <span>📋</span> <span>Đã sao chép mã <strong>{copiedCode}</strong> vào bộ nhớ tạm!</span>
            </p>
          )}
        </div>

        {/* Voucher List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Đang tải danh sách mã giảm giá...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl">🏷️</div>
              <p className="text-sm font-semibold text-gray-600">Hiện chưa có mã giảm giá công khai nào</p>
              <p className="text-xs text-gray-400">Bạn có thể nhập mã giảm giá riêng ở khung phía trên.</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Mã đủ điều kiện */}
              {eligibleVouchers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span>✨</span>
                      <span>Mã đủ điều kiện áp dụng ({eligibleVouchers.length})</span>
                    </span>
                  </div>

                  <div className="space-y-3">
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
                                : "bg-gradient-to-br from-[#142A68] to-[#1E3E9B] text-white"
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
                          <div className="flex-1 p-3.5 flex flex-col justify-between space-y-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-primary bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {v.code}
                                </span>
                                {isApplied && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
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
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(v.code)}
                                className="text-xs text-gray-500 hover:text-primary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>📋</span>
                                <span>{copiedCode === v.code ? "Đã chép mã" : "Sao chép mã"}</span>
                              </button>

                              {!isBrowseOnly && onApplyVoucher && (
                                isApplied ? (
                                  <button
                                    type="button"
                                    onClick={onRemoveVoucher}
                                    className="text-xs text-red-600 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-200 transition-all cursor-pointer"
                                  >
                                    Bỏ áp dụng
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={applyingCode === v.code}
                                    onClick={() => handleApply(v.code)}
                                    className="text-xs font-bold text-white bg-primary hover:bg-primary/95 px-4 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
                                  >
                                    {applyingCode === v.code ? "Đang áp dụng..." : "Áp dụng"}
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
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>Mã chưa đủ điều kiện ({ineligibleVouchers.length})</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {ineligibleVouchers.map((v) => {
                      const minSpend = Number(v.prereq_price || 0);
                      const missingAmount = Math.max(0, minSpend - subtotal);
                      const isFreeship = v.is_freeship || v.discount_type === "freeship";

                      return (
                        <div
                          key={v.code}
                          className="relative rounded-2xl border border-gray-200/80 bg-gray-50/70 p-3.5 space-y-2 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
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
                              className="text-[11px] text-gray-500 hover:text-primary font-medium px-2 py-1 rounded bg-white border border-gray-200 shrink-0 cursor-pointer"
                            >
                              {copiedCode === v.code ? "✓ Đã chép" : "Chép mã"}
                            </button>
                          </div>

                          {/* Suggestion prompt */}
                          <div className="bg-amber-100/70 rounded-xl px-3 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span>💡</span>
                              <span>
                                Mua thêm <strong>{formatPrice(missingAmount)}</strong> để dùng mã này
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleGoShopping}
                              className="text-[11px] font-bold text-primary underline hover:text-secondary shrink-0 cursor-pointer"
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>* Mỗi đơn hàng chỉ áp dụng 01 mã voucher</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
