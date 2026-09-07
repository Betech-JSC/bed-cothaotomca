"use client";

import React from "react";
import { useTranslations } from "next-intl";

export interface OrderStatusStepperProps {
  status?: string;
  syncStatus?: string;
  deliveryType?: string;
  className?: string;
}

export default function OrderStatusStepper({
  status,
  syncStatus,
  deliveryType,
  className = "",
}: OrderStatusStepperProps) {
  const t = useTranslations("orderStepper");
  const s = (status || "pending").toLowerCase();
  const sync = (syncStatus || "").toLowerCase();
  const isPickup = (deliveryType || "").toLowerCase() === "pickup";

  // Check cancellation or expired status
  if (s === "cancelled" || s === "expired") {
    return (
      <div
        className={`rounded-2xl p-5 sm:p-6 bg-yellow/40 border border-secondary/20 text-center font-sans ${className}`}
      >
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-secondary text-white mb-2">
          {t("cancelled_badge")}
        </span>
        <h4 className="text-base font-bold text-brown">
          {t("cancelled_title")}
        </h4>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
          {t("cancelled_desc")}
        </p>
      </div>
    );
  }

  // Check cancel requested status
  if (s === "cancel_requested") {
    return (
      <div
        className={`rounded-2xl p-5 sm:p-6 bg-yellow/40 border border-secondary/20 text-center font-sans ${className}`}
      >
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-secondary/20 text-brown border border-secondary/30 mb-2">
          {t("cancel_requested_badge")}
        </span>
        <h4 className="text-base font-bold text-brown">
          {t("cancel_requested_title")}
        </h4>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
          {t("cancel_requested_desc")}
        </p>
      </div>
    );
  }

  // Determine if Step 2 is active (Đã đồng bộ KiotViet / xuất hoá đơn / xác nhận / đang chuẩn bị món / vận chuyển)
  const isStep2Active =
    s === "synced" ||
    s === "confirmed" ||
    s === "processing" ||
    s === "paid" ||
    s === "shipping" ||
    s === "delivering" ||
    s === "delivered" ||
    s === "completed" ||
    sync === "synced" ||
    sync === "success";

  const step1Title = t("step1_title");
  const step1Desc = isPickup ? t("step1_desc_pickup") : t("step1_desc");
  const step2Title = t("step2_title");
  const step2Desc = isPickup ? t("step2_desc_pickup") : t("step2_desc");

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 bg-white border border-gray-100 shadow-xs font-sans ${className}`}
    >
      {/* Step Indicators Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Step 1 Circle */}
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm bg-primary text-white border-2 border-primary select-none shrink-0 transition-colors duration-300 shadow-xs">
            1
          </div>
        </div>

        {/* Connector Line */}
        <div
          className={`h-1 flex-1 mx-3 sm:mx-6 rounded-full transition-colors duration-300 ${
            isStep2Active ? "bg-primary" : "bg-[#E0E0E0]"
          }`}
        />

        {/* Step 2 Circle */}
        <div className="flex items-center">
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 select-none shrink-0 transition-colors duration-300 shadow-xs ${
              isStep2Active
                ? "bg-secondary text-white border-secondary"
                : "bg-[#E0E0E0] text-gray-400 border-[#E0E0E0]"
            }`}
          >
            2
          </div>
        </div>
      </div>

      {/* Step Details - 2 Dòng cân đối ngắt tại dấu chấm */}
      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        {/* Step 1 Info */}
        <div className="text-left space-y-1">
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider block transition-colors duration-300 ${
              isStep2Active ? "text-primary/70" : "text-primary"
            }`}
          >
            {t("step_number", { step: 1 })}
          </span>
          <h4
            className={`text-xs sm:text-sm md:text-base font-bold transition-colors duration-300 ${
              isStep2Active ? "text-primary/80" : "text-primary"
            }`}
          >
            <span className="block leading-snug">{step1Title}</span>
          </h4>
          <p
            className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
              isStep2Active ? "text-gray-500" : "text-gray-600"
            }`}
          >
            <span className="block leading-snug">{step1Desc}</span>
          </p>
        </div>

        {/* Step 2 Info */}
        <div className="text-right space-y-1">
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider block transition-colors duration-300 ${
              isStep2Active ? "text-secondary" : "text-gray-400"
            }`}
          >
            {t("step_number", { step: 2 })}
          </span>
          <h4
            className={`text-xs sm:text-sm md:text-base font-bold transition-colors duration-300 ${
              isStep2Active ? "text-primary font-bold" : "text-gray-400"
            }`}
          >
            <span className="block leading-snug">{step2Title}</span>
          </h4>
          <p
            className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
              isStep2Active ? "text-gray-600" : "text-gray-400"
            }`}
          >
            <span className="block leading-snug">{step2Desc}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
