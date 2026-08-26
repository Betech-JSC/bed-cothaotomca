"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, isDefaultVariant, cleanVariantName } from "@/lib/format";
import { useTranslations } from "next-intl";

interface CartPopupProps {
  onClose: () => void;
}

export default function CartPopup({ onClose }: CartPopupProps) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    subtotal,
    isCartOpen,
    totalItems,
  } = useCart();

  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        // Prevent closing if we clicked the cart toggle button in the header
        const cartToggleBtn = document.getElementById("cart-toggle-btn");
        if (cartToggleBtn && cartToggleBtn.contains(event.target as Node)) {
          return;
        }
        onClose();
      }
    }

    if (isCartOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCartOpen, onClose]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[140] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={popupRef}
        className="absolute right-0 top-full mt-3 w-[calc(100vw-32px)] xs:w-[360px] sm:w-[420px] bg-white border border-gray-100 rounded-[24px] shadow-2xl z-[150] p-4 text-gray-900 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="title-2 font-display text-primary font-bold">
            {t("title", { count: totalItems })}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors text-lg cursor-pointer"
            aria-label={t("aria_close")}
          >
            &times;
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="body-2 text-gray-500 font-medium">{t("empty")}</p>
            <Link
              href="/product"
              onClick={onClose}
              className="inline-block text-xs font-semibold text-secondary hover:underline"
            >
              {t("continue_shopping")}
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="max-h-[300px] overflow-y-auto pr-1 divide-y divide-gray-100 pt-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 items-start">
                  {/* Product Image */}
                  <div className="relative size-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="title-3 text-primary font-bold font-display line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="text-right shrink-0">
                        {item.originalPrice && item.originalPrice > item.unitPrice ? (
                          <p className="text-[11px] font-semibold text-gray-400 line-through leading-tight">
                            {formatPrice(item.originalPrice)}
                          </p>
                        ) : null}
                        <span className="title-3 text-primary font-bold whitespace-nowrap leading-tight">
                          {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                    </div>
                    {!isDefaultVariant(item.variant) && (
                      <p className="text-[11px] text-gray-500 font-semibold uppercase">
                        {cleanVariantName(item.variant)}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs select-none"
                          disabled={item.quantity <= 1}
                        >
                          &minus;
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-primary">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs select-none"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors cursor-pointer"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-gray-100 pt-3 mt-1 space-y-3">
              <div className="flex justify-between items-center">
                <span className="body-2 text-gray-600 font-semibold">{t("subtotal")}</span>
                <span className="text-xl font-bold text-secondary font-display">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <Link
                href="/checkout"
                onClick={onClose}
                className="block w-full py-3 bg-secondary hover:bg-secondary/95 text-white font-bold text-center rounded-full transition-colors duration-300 shadow-md shadow-secondary/10 tracking-wider font-display"
              >
                {t("checkout")}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
