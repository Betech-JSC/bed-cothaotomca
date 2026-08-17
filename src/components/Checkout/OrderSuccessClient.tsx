"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";
import { getOrderByCode } from "@/services/orderService";
import { formatPrice } from "@/lib/format";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";

interface OrderSuccessClientProps {
  orderCode: string;
  phone?: string;
  locale: string;
}

export default function OrderSuccessClient({
  orderCode,
  phone,
  locale,
}: OrderSuccessClientProps) {
  const t = useTranslations("orderSuccess");
  const settings = useGeneralSettings();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hotline = settings?.hotline || "0987 654 321";

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrderByCode(orderCode, phone);
      setOrder(data);
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      setError(t("error_load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderCode) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode, phone]);

  const formatExpectedTime = (orderData: any) => {
    let date = null;
    if (orderData.delivery?.expected_delivery) {
      date = new Date(orderData.delivery.expected_delivery);
    } else if (orderData.created_at) {
      date = new Date(orderData.created_at);
      // Fallback: estimate 90 minutes from order creation
      date.setMinutes(date.getMinutes() + 90);
    } else {
      date = new Date();
      date.setMinutes(date.getMinutes() + 90);
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} hôm nay`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-[24px] p-6 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 space-y-6 animate-pulse">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
        <div className="border border-gray-100 rounded-2xl p-6 space-y-6 mt-8">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-[24px] p-8 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 text-center space-y-6">
        <div className="text-red-500 text-5xl">⚠️</div>
        <h2 className="text-xl md:text-2xl font-bold font-display text-primary">
          {error || t("error_load")}
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button onClick={fetchOrder} className="btn btn-primary px-6 py-3 rounded-xl font-bold">
            {t("retry")}
          </button>
          <Link href="/product" className="btn btn-secondary px-6 py-3 rounded-xl font-bold">
            {t("continue_shopping")}
          </Link>
        </div>
      </div>
    );
  }

  const isPickup = order.delivery_type === "pickup";
  const customerName = order.customer?.name || "";
  const expectedTime = formatExpectedTime(order);
  const paymentMethodText = order.payment?.method === "CASH"
    ? t("payment_cod")
    : order.payment?.method === "CARD"
    ? t("payment_card")
    : t("payment_transfer");

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[24px] p-6 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">

      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-[#142A68] text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold font-display text-[#142A68] mt-6 mb-4 text-center">
        {t("title")}
      </h1>

      {/* Message Description */}
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          {isPickup
            ? t("description_pickup", { name: customerName, time: expectedTime })
            : t("description", { name: customerName, time: expectedTime })}
        </p>
        <p className="text-gray-500 text-xs md:text-sm leading-relaxed max-w-xl mx-auto">
          {isPickup
            ? t("hotline_message_pickup", { hotline })
            : t("hotline_message", { hotline })}
        </p>
      </div>

      {/* Receipt Info Card */}
      <div className="mt-8 border border-gray-100 rounded-2xl p-5 md:p-6 space-y-6">
        <h2 className="text-lg md:text-xl font-bold font-display text-[#142A68] border-b border-gray-100 pb-3">
          {t("receipt_info")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs md:text-sm">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <span className="text-gray-400 block mb-0.5">{t("receiver")}</span>
              <strong className="text-[#142A68] text-sm md:text-base font-semibold">
                {order.delivery?.receiver || customerName}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">{t("phone")}</span>
              <strong className="text-[#142A68] font-mono text-sm font-semibold">
                {order.delivery?.contact_number || order.customer?.phone || ""}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">
                {isPickup ? t("pickup_location") : t("delivery_address")}
              </span>
              <strong className="text-[#142A68] text-xs md:text-sm font-medium block leading-snug">
                {order.delivery?.address || ""}
              </strong>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <span className="text-gray-400 block mb-0.5">{t("payment_method")}</span>
              <strong className="text-[#142A68] font-semibold">
                {paymentMethodText}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">{t("shipping_fee")}</span>
              <strong className="text-[#142A68] font-semibold">
                {isPickup || !order.delivery?.price || parseFloat(order.delivery.price) === 0
                  ? t("free")
                  : `${new Intl.NumberFormat("vi-VN").format(parseFloat(order.delivery.price))} đ`}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">{t("total_payment")}</span>
              <strong className="text-emerald-600 text-base md:text-lg font-bold">
                {new Intl.NumberFormat("vi-VN").format(parseFloat(order.total))} đ
              </strong>
            </div>
          </div>
        </div>

        {/* Order Code Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs md:text-sm">
          <div>
            <span className="text-amber-800 block font-medium">
              {t("order_code_label")} <strong className="font-mono font-bold text-amber-900">{order.order_code}</strong>
            </span>
            <span className="text-amber-700 text-xs mt-0.5 block">
              {t("lookup_tip")}
            </span>
          </div>
          <a
            href={`/order-lookup?code=${order.order_code}&phone=${order.customer?.phone || ""}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors shrink-0"
          >
            {t("lookup_button")}
          </a>
        </div>
      </div>

      {/* Item List */}
      <div className="mt-8 border border-gray-100 rounded-2xl p-5 md:p-6">
        <h2 className="text-lg md:text-xl font-bold font-display text-[#142A68] border-b border-gray-100 pb-3 mb-4">
          {t("ordered_items")}
        </h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((item: any, index: number) => {
            const displayPrice = new Intl.NumberFormat("vi-VN").format(parseFloat(item.price)) + " đ";
            const displayImage = item.image || "/cover.jpg";

            return (
              <div key={index} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 relative rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    <Image
                      src={displayImage}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                      unoptimized={displayImage.startsWith("http")}
                    />
                  </div>
                  {/* Item Details */}
                  <div>
                    <strong className="text-[#142A68] text-sm md:text-base font-semibold block leading-tight">
                      {item.product_name}
                    </strong>
                    {item.variant_size && (
                      <span className="text-gray-400 text-xs block mt-1 font-medium">
                        {item.variant_size}
                      </span>
                    )}
                  </div>
                </div>
                {/* Quantity and Price */}
                <span className="text-gray-900 text-sm md:text-base font-semibold whitespace-nowrap">
                  {item.quantity} x {displayPrice}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pricing Breakdown Shaded Box */}
        <div className="bg-[#EFF1F5] rounded-2xl p-5 space-y-3 mt-6">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-[#404968] font-medium">{t("subtotal")}</span>
            <strong className="text-[#142A68] font-bold">
              {formatPrice(parseFloat(order.subtotal) || 0)}
            </strong>
          </div>

          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-[#404968] font-medium">{t("shipping_fee")}</span>
            <strong className="text-[#142A68] font-bold">
              {formatPrice(parseFloat(order.delivery?.price || order.delivery_price || 0))}
            </strong>
          </div>

          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-[#404968] font-medium">{t("discount")}</span>
            <strong className="text-[#142A68] font-bold">
              {formatPrice(parseFloat(order.discount) || 0)}
            </strong>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-[#142A68] text-sm md:text-base font-bold">{t("total_payment")}</span>
            <strong className="text-[#CD4829] text-lg md:text-xl font-bold">
              {formatPrice(parseFloat(order.total) || 0)}
            </strong>
          </div>
        </div>
      </div>

      {/* Continue Shopping Button */}
      <Link
        href="/product"
        className="w-full py-4 rounded-2xl font-bold text-white transition-all shadow-[0_4px_14px_rgba(205,72,41,0.2)] bg-[#CD4829] hover:bg-[#CD4829]/90 flex items-center justify-center mt-8 text-sm md:text-base"
      >
        {t("continue_shopping")}
      </Link>
    </div>
  );
}
