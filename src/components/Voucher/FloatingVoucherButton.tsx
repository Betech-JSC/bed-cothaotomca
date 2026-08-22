"use client";

import React, { useState, useEffect } from "react";
import CouponModal from "./CouponModal";
import { getAvailableVouchers, PublicVoucherItem } from "@/services/orderService";
import { useCart } from "@/contexts/CartContext";

export default function FloatingVoucherButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>([]);
  const { subtotal } = useCart();

  useEffect(() => {
    getAvailableVouchers()
      .then((data) => setVouchers(data))
      .catch(() => setVouchers([]));
  }, []);

  // If no vouchers exist in DB, still show if user wants to enter custom codes or keep active
  const voucherCount = vouchers.length;

  return (
    <>
      <div className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-[#142A68] to-[#1E3E9B] text-white rounded-full shadow-[0_8px_24px_rgba(20,42,104,0.35)] hover:shadow-[0_12px_28px_rgba(205,72,41,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-amber-300/60 cursor-pointer animate-in fade-in"
          aria-label="Mở danh sách mã giảm giá"
        >
          {/* Animated Ticket Icon */}
          <span className="text-xl animate-bounce leading-none">
            🎁
          </span>

          <div className="text-left hidden xs:block sm:block">
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-300 leading-none">
              Kho ưu đãi
            </div>
            <div className="text-xs font-bold font-display whitespace-nowrap leading-tight mt-0.5">
              Mã Giảm Giá
            </div>
          </div>

          {/* Badge count */}
          {voucherCount > 0 && (
            <span className="bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse border border-white/40 shrink-0">
              {voucherCount}
            </span>
          )}

          {/* Glowing Ping effect */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
          </span>
        </button>
      </div>

      <CouponModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        subtotal={subtotal}
        isBrowseOnly={true}
      />
    </>
  );
}
