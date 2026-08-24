"use client";

import React, { useState, useEffect } from "react";
import CouponModal from "./CouponModal";
import { getAvailableVouchers, PublicVoucherItem } from "@/services/orderService";
import { getActiveCampaigns, PublicCampaignItem } from "@/services/campaignService";
import { useCart } from "@/contexts/CartContext";

export default function FloatingVoucherButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [vouchers, setVouchers] = useState<PublicVoucherItem[]>([]);
  const [campaigns, setCampaigns] = useState<PublicCampaignItem[]>([]);
  const { subtotal } = useCart();

  useEffect(() => {
    getAvailableVouchers()
      .then((data) => setVouchers(data))
      .catch(() => setVouchers([]));

    getActiveCampaigns()
      .then((data) => setCampaigns(data))
      .catch(() => setCampaigns([]));
  }, []);

  const totalPromotions = vouchers.length + campaigns.length;

  return (
    <>
      <div className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-3.5 py-2.5 bg-white text-secondary rounded-full shadow-[0_6px_20px_rgba(205,72,41,0.22)] hover:shadow-[0_10px_28px_rgba(205,72,41,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-secondary/30 hover:border-secondary cursor-pointer animate-in fade-in"
          aria-label="Xem ưu đãi và khuyến mãi"
        >
          {/* Brand-colored Ticket Icon */}
          <div className="w-6 h-6 flex items-center justify-center text-secondary">
            <svg
              className="w-5 h-5 fill-none stroke-current"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2.5 2.5 0 0 0 0-5V6z" />
              <path d="M9 12h6" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* Clean "Ưu đãi" text matching brand visual */}
          <span className="text-sm font-bold text-secondary tracking-wide pr-0.5">
            Ưu đãi
          </span>

          {/* Badge count */}
          {totalPromotions > 0 && (
            <span className="bg-secondary text-white font-bold text-[11px] px-1.5 py-0.2 rounded-full min-w-[20px] text-center shadow-xs shrink-0">
              {totalPromotions}
            </span>
          )}

          {/* Subtle pulse ring */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary/40 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
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
