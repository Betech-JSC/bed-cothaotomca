"use client";

import React from "react";
import { PreOrderNotice } from "@/lib/operatingHours";

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
  if (!isOpen || !notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 transform transition-all scale-100 border border-gray-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 text-xl">
            ⏰
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-serif leading-tight">
              {notice.title}
            </h3>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Khung giờ phục vụ & hẹn nhận món
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed font-sans">
          {notice.message}
        </p>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <span>📅 Ngày nhận món dự kiến:</span>
            <span className="text-primary font-bold">{notice.targetDateDisplay}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span>⏰ Khung giờ giao / lấy hàng:</span>
            <span className="font-semibold text-gray-900">{notice.slotInfo}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-sm"
          >
            Tôi đã hiểu, tiếp tục đặt hàng
          </button>
        </div>
      </div>
    </div>
  );
}
