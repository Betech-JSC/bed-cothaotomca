"use client";

import React, { useMemo } from "react";
import { formatPrice } from "@/lib/format";
import { PublicVoucherItem } from "@/services/orderService";
import { useTranslations } from "next-intl";

export interface SmartCartProgressBarProps {
  subtotal: number;
  shippingSettings?: {
    is_min_amount_enabled?: boolean;
    min_order_amount?: number;
    shipping_discount_type?: "fixed" | "free";
    shipping_discount_value?: number;
    /** @deprecated Legacy property, use can_combine_with_freeship on Campaign/Voucher */
    can_combine_with_promotions?: boolean;
  } | null;
  isFreeship?: boolean;
  freeshipReason?: string | null;
  vouchers?: PublicVoucherItem[];
  appliedVoucher?: (PublicVoucherItem & {
    canCombineWithFreeship?: boolean;
    can_combine_with_freeship?: boolean;
    canCombineWithPromotions?: boolean;
    can_combine_with_promotions?: boolean;
    isFreeship?: boolean;
    discountType?: string;
  }) | null;
  appliedShippingVoucher?: (PublicVoucherItem & {
    isFreeship?: boolean;
    discountType?: string;
    [key: string]: any;
  }) | null;
  appliedCampaign?: {
    name?: string;
    can_combine_with_freeship?: boolean;
  } | null;
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
  appliedShippingVoucher = null,
  appliedCampaign = null,
  onOpenVouchers,
  className = "",
}: SmartCartProgressBarProps) {
  const t = useTranslations("progress_bar");

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
      isFixed?: boolean;
      discountVal?: number;
      code?: string;
    }[] = [];

    // Shipping discount / Freeship candidate
    if (freeshipMin > 0 && subtotal < freeshipMin && !isFreeship) {
      const isFixed = shippingSettings?.shipping_discount_type === "fixed";
      const discountVal = Number(shippingSettings?.shipping_discount_value || 0);
      const rewardText = isFixed && discountVal > 0
        ? `${formatPrice(discountVal)} phí ship.`
        : "Miễn phí ship.";

      candidateMilestones.push({
        type: "freeship",
        target: freeshipMin,
        label: isFixed ? "Giảm phí ship" : "Miễn phí ship",
        reward: rewardText,
        isFixed,
        discountVal,
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
      const isEligibleFreeship =
        isFreeship === true ||
        Boolean(
          shippingSettings?.is_min_amount_enabled &&
          subtotal >= (shippingSettings?.min_order_amount || 0)
        );

      if (!isEligibleFreeship) {
        return null;
      }

      // Reached all milestones
      const isFixed = shippingSettings?.shipping_discount_type === "fixed";
      const discountVal = Number(shippingSettings?.shipping_discount_value || 0);
      let completedText = isFixed && discountVal > 0
        ? t("applied_reduced_shipping", { amount: formatPrice(discountVal) })
        : t("applied_freeship");

      return {
        completed: true,
        percent: 100,
        text: completedText,
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
  }, [subtotal, shippingSettings, isFreeship, vouchers, t]);

  const isVoucherOverridingG1 = Boolean(
    appliedVoucher &&
    (appliedVoucher.canCombineWithPromotions === false || (appliedVoucher as any).can_combine_with_promotions === false) &&
    appliedVoucher.canCombineWithFreeship !== false &&
    appliedVoucher.can_combine_with_freeship !== false
  );

  const isG1BlockingFreeship = Boolean(
    appliedCampaign &&
    appliedCampaign.can_combine_with_freeship === false &&
    !isVoucherOverridingG1
  );

  const isG2BlockingFreeship = Boolean(
    appliedVoucher &&
    (appliedVoucher.canCombineWithFreeship === false || appliedVoucher.can_combine_with_freeship === false)
  );

  const isFreeshipBlocked = Boolean(
    shippingSettings?.is_min_amount_enabled && (isG1BlockingFreeship || isG2BlockingFreeship)
  );

  if (isFreeshipBlocked) {
    const message = isG1BlockingFreeship
      ? `CTKM ${appliedCampaign?.name || ""} không áp dụng cùng chương trình giảm phí vận chuyển.`
      : (t("cannot_combine_voucher") || `Mã ${appliedVoucher?.code || ""} không áp dụng cùng chương trình giảm phí vận chuyển.`);

    return (
      <div className={`rounded-2xl p-3.5 border transition-all bg-red-50 border-red-200 text-red-800 text-xs font-semibold ${className}`}>
        {message}
      </div>
    );
  }

  // Khi có mã voucher vận chuyển đang áp dụng, lập tức ẩn hoàn toàn thanh tiến độ
  const hasAppliedShippingVoucher = Boolean(
    appliedShippingVoucher ||
    (appliedVoucher && (
      appliedVoucher.isFreeship ||
      appliedVoucher.discountType === "freeship" ||
      appliedVoucher.discount_type === "freeship" ||
      appliedVoucher.is_freeship
    ))
  );

  if (hasAppliedShippingVoucher) {
    return null;
  }

  if (!milestone) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl p-3.5 border transition-all bg-yellow/70 border-secondary/30 text-brown shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-2 font-sans">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">
            {milestone.completed ? (
              <span className="text-secondary font-bold font-sans">{milestone.text}</span>
            ) : milestone.next?.type === "freeship" ? (
              milestone.next.isFixed ? (
                <span>
                  {t("buy_more")}{" "}
                  <strong className="text-primary font-bold">
                    {formatPrice(milestone.missing || 0)}
                  </strong>{" "}
                  {t("to_get_reduced_shipping")}{" "}
                  <strong className="text-secondary font-bold">
                    {formatPrice(milestone.next.discountVal || 0)}
                  </strong>{" "}
                  {t("shipping_fee_suffix")}
                </span>
              ) : (
                <span>
                  {t("buy_more")}{" "}
                  <strong className="text-primary font-bold">
                    {formatPrice(milestone.missing || 0)}
                  </strong>{" "}
                  {t("to_freeship")}
                </span>
              )
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
