"use client";

import React from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";

export interface GiftItem {
  id: number;
  product_id: number;
  product_code?: string;
  product_name: string;
  original_price: number;
  campaign_price: number;
  image?: string;
}

interface GiftSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: GiftItem[];
  selectedId: number | null;
  onSelect: (item: GiftItem) => void;
}

export default function GiftSelectorModal({
  isOpen,
  onClose,
  title = "Chọn món quà tặng miễn phí",
  subtitle,
  items,
  selectedId,
  onSelect,
}: GiftSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden text-gray-900 border border-gray-100 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <div>
              <h3 className="title-2 font-display text-primary font-bold leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-500 font-medium line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-primary hover:bg-gray-100 border border-gray-200 text-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {/* Gift List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Danh sách món quà khả dụng ({items.length})
          </div>

          <div className="space-y-2.5">
            {items.map((item) => {
              const isSelected = selectedId === item.id;
              const isFree = item.campaign_price === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-secondary bg-orange-50/50 shadow-xs ring-2 ring-secondary/20"
                      : "border-gray-200/80 bg-white hover:border-secondary/40 hover:bg-gray-50/50"
                  }`}
                >
                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-secondary bg-secondary text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white block" />
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xl">🎁</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-xs sm:text-sm font-bold line-clamp-1 ${
                        isSelected ? "text-secondary" : "text-gray-900"
                      }`}
                    >
                      {item.product_name}
                    </h4>

                    <div className="flex items-center gap-2 mt-0.5">
                      {item.original_price > 0 && (
                        <span className="text-[11px] text-gray-400 line-through">
                          {formatPrice(item.original_price)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-600">
                        {isFree ? "Miễn phí (0đ)" : formatPrice(item.campaign_price)}
                      </span>
                    </div>
                  </div>

                  {/* Active Badge */}
                  {isSelected && (
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full shrink-0">
                      Đang chọn
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            * Nhấp vào món để chọn nhận quà
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-secondary hover:bg-secondary/95 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
