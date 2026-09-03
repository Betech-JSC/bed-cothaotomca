"use client";

import React from "react";
import { PreOrderNotice } from "@/lib/operatingHours";
import { useTranslations } from "next-intl";

interface PreOrderNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: PreOrderNotice | null;
}

export default function PreOrderNoticeModal({
  isOpen,
  onClose,
  notice,
}: PreOrderNoticeModalProps) {
  const t = useTranslations("preorder_notice");

  if (!isOpen || !notice) return null;

  const messageText = notice.todayDateDisplay
    ? t("message", {
        cutoff: notice.cutoff || "22:30",
        openTime: notice.openTime || "10:00",
        date: notice.todayDateDisplay,
      })
    : notice.message;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 transform transition-all scale-100 border border-gray-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-gray-100 pb-3">
          <div>
            <h3 className="title-2 font-display text-primary font-bold leading-tight">
              {notice.title}
            </h3>
            <p className="body-3 text-gray-500 font-sans mt-0.5">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <p className="body-2 text-gray-700 leading-relaxed font-sans">
          {messageText}
        </p>

        <div className="bg-yellow/60 border border-secondary/20 rounded-xl p-4 space-y-2 font-sans">
          <div className="flex items-center gap-2 text-sm font-semibold text-brown">
            <span>{t("expected_date")}</span>
            <span className="text-primary font-bold">{notice.targetDateDisplay}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-brown">
            <span>{t("slot_info")}</span>
            <span className="font-semibold text-gray-900">{notice.slotInfo}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-display title-3 font-bold rounded-full transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
          >
            {t("confirm_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}
