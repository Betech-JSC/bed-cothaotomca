"use client";

import React, { useMemo } from "react";
import { formatPrice } from "@/lib/format";
import { PublicVoucherItem } from "@/services/orderService";
import { useTranslations } from "next-intl";

interface SmartCartProgressBarProps {
  subtotal: number;
  shippingSettings?: {
    is_min_amount_enabled?: boolean;
    min_order_amount?: number;
    shipping_discount_type?: "fixed" | "free";
    shipping_discount_value?: number;
    can_combine_with_promotions?: boolean;
  } | null;
  isFreeship?: boolean;
  freeshipReason?: string | null;
  vouchers?: PublicVoucherItem[];
  appliedVoucher?: PublicVoucherItem | null;
  onOpenVouchers?: () => void;
  className?: string;
}

export default function SmartCartProgressBar({
  subtotal,
  shippingSettings,
  isFreeship = false,
  freeshipReason,
  vouchers = [],
  appliedVoucher = null,
  onOpenVouchers,
  className = "",
}: SmartCartProgressBarProps) {
  const t = useTranslations("progress_bar");

  
  if (
    shippingSettings?.can_combine_with_promotions === false &&
    appliedVoucher
  ) {
    return (
      <div className={`rounded-2xl p-3.5 border transition-all bg-red-50 border-red-200 text-red-800 text-xs font-semibold ${className}`}>
        Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá (Không áp dụng đồng thời).
      </div>
    );
  }

  const milestone = useMemo(() => {
    const freeshipMin =
      shippingSettings?.is_min_amount_enabled && Number(shippingSettings.min_order_amount) > 0
        ? Number(shippingSettings.min_order_amount)
        : 0;

    // Collect all candidate milestones above current subtotal
    const candidateMilestones: {
      type: "freeship" | "voucher";
      target: number;
      label: string;
      reward: string;
      code?: string;
    }[] = [];

    // Shipping discount / Freeship candidate
    if (freeshipMin > 0 && subtotal < freeshipMin && !isFreeship) {
      const isFixed = shippingSettings?.shipping_discount_type === "fixed";
      const discountVal = Number(shippingSettings?.shipping_discount_value || 0);
      const rewardText = isFixed && discountVal > 0
        ? `Hỗ trợ ${formatPrice(discountVal)} phí ship`
        : "Freeship";

      candidateMilestones.push({
        type: "freeship",
        target: freeshipMin,
        label: isFixed ? "Giảm phí ship" : "Freeship",
        reward: rewardText,
      });
    }

    // Voucher candidates
    vouchers.forEach((v) => {
      const minSpend = Number(v.prereq_price || 0);
      if (minSpend > subtotal) {
        const rewardText =
          v.discount_type === "percent"
            ? `${v.value}%`
            : v.discount_type === "freeship" || v.is_freeship
              ? "Freeship"
              : formatPrice(v.value);

        candidateMilestones.push({
          type: "voucher",
          target: minSpend,
          label: `${v.code}`,
          reward: rewardText,
          code: v.code,
        });
      }
    });

    // Sort by lowest target threshold first
    candidateMilestones.sort((a, b) => a.target - b.target);

    if (candidateMilestones.length === 0) {
      // Reached all milestones
      return {
        completed: true,
        percent: 100,
        text: freeshipReason || "Chúc mừng! Bạn đã đạt tất cả các mức ưu đãi lớn nhất của cửa hàng!",
      };
    }

    const next = candidateMilestones[0];
    const missing = Math.max(0, next.target - subtotal);
    const percent = Math.min(100, Math.max(8, Math.round((subtotal / next.target) * 100)));

    return {
      completed: false,
      percent,
      missing,
      next,
    };
  }, [subtotal, shippingSettings, isFreeship, freeshipReason, vouchers]);

  return (
    <div
      className={`rounded-2xl p-3.5 border transition-all bg-yellow/70 border-secondary/30 text-brown shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-2 font-sans">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">
            {milestone.completed ? (
              <span className="text-secondary font-bold font-sans">{milestone.text}</span>
            ) : (
              <span>
                {t("buy_more")}{" "}
                <strong className="text-primary font-bold">
                  {formatPrice(milestone.missing || 0)}
                </strong>{" "}
                {t("to_get")}{" "}
                <strong className="text-secondary font-bold">
                  {milestone.next?.reward}
                </strong>
              </span>
            )}
          </span>
        </div>

        {onOpenVouchers && (
          <button
            type="button"
            onClick={onOpenVouchers}
            className="text-[11px] font-bold font-display text-primary hover:text-secondary underline shrink-0 cursor-pointer flex items-center gap-0.5"
          >
            <span>{t("voucher_btn")}</span>
            <span className="text-[10px]">›</span>
          </button>
        )}
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden p-0.5 border border-gray-200 shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-secondary"
          style={{ width: `${milestone.percent}%` }}
        />
      </div>
    </div>
  );
}
