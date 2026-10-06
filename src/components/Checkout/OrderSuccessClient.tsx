"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";
import { getOrderByCode, cancelOrderApi, OrderApiError } from "@/services/orderService";
import { formatPrice, formatVietnamDateTime, isCodPayment } from "@/lib/format";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";
import OrderStatusStepper from "@/components/Order/OrderStatusStepper";
import { cleanDuplicateAddressParts } from "@/data/wardMapping";
import { usePrecisionCountdown } from "@/hooks/usePrecisionCountdown";

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

  // Cancellation Modal & Input
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  // Precision countdown for 15-minute cancellation window
  const { secondsLeft, formattedTime } = usePrecisionCountdown({
    initialSeconds: order?.remaining_cancel_seconds,
    expiresAt: order?.cancel_window_expires_at,
    enabled: Boolean(order && isCodPayment(order) && order.can_cancel && order.status !== "cancelled"),
  });

  const hotline = "024.9999.7122";

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

  // Polling for live status updates (pending / pending_sync / pending_payment -> synced)
  useEffect(() => {
    if (!orderCode) return;

    const currentStatus = (order?.status || "").toLowerCase();
    const currentSyncStatus = (order?.sync_status || "").toLowerCase();
    const isCancelled = currentStatus === "cancelled" || currentStatus === "cancel_requested";
    const shouldPoll =
      !isCancelled &&
      (currentStatus === "pending" ||
        currentStatus === "pending_payment" ||
        currentStatus === "pending_sync" ||
        currentSyncStatus === "pending");

    if (!shouldPoll) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getOrderByCode(orderCode, phone);
        if (updated) {
          setOrder(updated);
        }
      } catch {
        // silent polling error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderCode, phone, order?.status, order?.sync_status]);

  const handleConfirmCancel = async () => {
    if (!order) return;
    setActionLoading(true);
    setModalError(null);

    const cancelPhone = phone?.trim() || order.customer?.phone || order.delivery?.contact_number || "";

    try {
      const res = await cancelOrderApi(
        order.order_code,
        cancelPhone,
        cancelReason.trim() || undefined
      );
      setCancelSuccessMsg(res.message || t("cancel_success"));
      if (res.data) {
        setOrder(res.data);
      } else {
        setOrder((prev: any) => ({
          ...prev,
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          can_cancel: false,
        }));
      }
      setShowCancelModal(false);
      setCancelReason("");
    } catch (err: unknown) {
      if (err instanceof OrderApiError) {
        setModalError(err.message);
      } else {
        setModalError(t("error_load"));
      }
    } finally {
      setActionLoading(false);
    }
  };

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
  const isScheduled = Boolean(order?.delivery?.expected_delivery);
  const customerName = order.customer?.name || "";
  const expectedTime = formatExpectedTime(order);
  const paymentMethodText = order.payment?.method === "CASH"
    ? t("payment_cod")
    : order.payment?.method === "CARD"
    ? t("payment_card")
    : t("payment_transfer");

  const subtotalNum = parseFloat(order.subtotal) || 0;
  const shippingFeeNum = parseFloat(order.delivery?.price || order.delivery_price || 0);
  const discountNum = parseFloat(order.discount) || 0;
  const totalNum = parseFloat(order.total) || (subtotalNum + shippingFeeNum - discountNum);

  const formatVND = (amount: number) => {
    return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, amount))} đ`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[24px] p-6 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 font-sans">

      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
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
      <h1 className="text-2xl md:text-3xl font-bold font-display text-primary mt-6 mb-4 text-center">
        {t("title")}
      </h1>

      {/* Confirmation Notice Box */}
      <div className="bg-yellow/60 border border-secondary/30 rounded-2xl p-4 md:p-5 text-center max-w-2xl mx-auto space-y-2 font-sans">
        <p className="text-brown text-sm md:text-base leading-relaxed font-normal text-balance">
          {isPickup
            ? t("notice_message_pickup")
            : isScheduled
            ? t("notice_message_scheduled")
            : t("notice_message")}
        </p>
        <p className="text-brown text-sm md:text-base font-medium mt-2">
          {t.rich("hotline_support", {
            hotline,
            link: (chunks) => (
              <a
                href={`tel:${hotline.replace(/[^0-9+]/g, "")}`}
                className="text-secondary font-bold hover:underline transition-colors"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      {/* Order Status Stepper */}
      <div className="mt-8">
        <OrderStatusStepper
          status={order?.status}
          syncStatus={order?.sync_status}
          deliveryType={order?.delivery_type}
          isScheduled={isScheduled}
          expectedDelivery={order?.delivery?.expected_delivery}
        />
      </div>

      {/* Cancellation Status Banner if Cancelled */}
      {order?.status === "cancelled" && (
        <div className="mt-8 p-5 md:p-6 rounded-2xl bg-yellow/20 border border-gray-200 space-y-2 font-sans">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            {t("cancelled_status")}
          </div>
          {order.cancelled_at && (
            <p className="text-xs text-gray-600">
              {t("cancelled_at")}{" "}
              <strong className="text-gray-800 font-semibold">{formatVietnamDateTime(order.cancelled_at)}</strong>
            </p>
          )}
        </div>
      )}

      {/* 15-Minute Countdown Banner & Cancel Action for COD */}
      {order &&
        isCodPayment(order) &&
        order.status !== "cancelled" &&
        order.status !== "cancel_requested" &&
        order.status !== "expired" && (
          <div
            className={`mt-8 p-5 md:p-6 rounded-2xl border transition-all ${
              order.can_cancel && secondsLeft > 0
                ? "bg-yellow/40 border-secondary/20 shadow-xs"
                : !order.can_cancel
                ? "bg-gray-50/80 border-gray-200"
                : "bg-yellow/20 border-secondary/15"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {order.can_cancel && secondsLeft > 0 ? (
                  <>
                    <div className="flex items-center gap-2 text-brown font-bold text-sm">
                      <svg className="w-5 h-5 text-secondary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t("cancel_order_15m")}</span>
                    </div>
                    <p className="text-xs text-brown/80 mt-1">
                      {t("cancel_banner_desc")}
                    </p>
                    {order.cancel_window_expires_at && (
                      <p className="text-xs text-brown/70 mt-1 flex items-center gap-1 font-medium">
                        <span>{t("cancel_deadline")}</span>
                        <strong className="text-brown">{formatVietnamDateTime(order.cancel_window_expires_at)}</strong>
                      </p>
                    )}
                  </>
                ) : !order.can_cancel ? (
                  <>
                    <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Đã xác nhận đơn hàng</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Đơn hàng đã được xác nhận. Vui lòng gọi hotline {hotline} để được hỗ trợ.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-brown font-bold text-sm">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t("cancel_order_15m")}</span>
                    </div>
                    <p className="text-xs text-rose-700 mt-1 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{t("cancel_window_expired")}</span>
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                {order.can_cancel && secondsLeft > 0 ? (
                  <>
                    <div className="bg-white text-secondary font-mono font-bold text-lg px-4 py-2 rounded-xl border border-secondary/20 shadow-xs">
                      {formattedTime}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setShowCancelModal(true);
                      }}
                      className="bg-secondary hover:bg-secondary/90 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-secondary/20 whitespace-nowrap cursor-pointer"
                    >
                      {t("cancel_order")}
                    </button>
                  </>
                ) : !order.can_cancel ? (
                  <button
                    disabled
                    className="bg-gray-100 text-gray-400 border border-gray-200 text-sm font-medium py-2.5 px-5 rounded-xl cursor-not-allowed whitespace-nowrap"
                  >
                    Đã xác nhận
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-100 text-gray-400 border border-gray-200 text-sm font-medium py-2.5 px-5 rounded-xl cursor-not-allowed whitespace-nowrap"
                  >
                    {t("cancel_window_expired")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Success Notification Alert if just cancelled */}
      {cancelSuccessMsg && (
        <div className="mt-4 p-4 rounded-xl bg-yellow/60 border border-secondary/30 text-brown text-sm flex items-center gap-3 font-sans">
          <svg className="w-5 h-5 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Receipt Info Card */}
      <div className="mt-8 border border-gray-100 rounded-2xl p-5 md:p-6 space-y-6 font-sans">
        <h2 className="text-lg md:text-xl font-bold font-display text-primary border-b border-gray-100 pb-3">
          {t("receipt_info")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs md:text-sm">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("order_time")}</span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans">
                {order.created_at ? formatVietnamDateTime(order.created_at) : "—"}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("receiver")}</span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans">
                {order.delivery?.receiver || customerName}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("phone")}</span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans">
                {order.delivery?.contact_number || order.customer?.phone || ""}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">
                {isPickup ? t("pickup_location") : t("delivery_address")}
              </span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans block leading-snug">
                {cleanDuplicateAddressParts(order.delivery?.address || "")}
              </strong>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("payment_method")}</span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans">
                {paymentMethodText}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("shipping_fee")}</span>
              <strong className="text-primary text-sm md:text-base font-bold font-sans">
                {isPickup || shippingFeeNum === 0
                  ? t("free")
                  : formatVND(shippingFeeNum)}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 text-xs md:text-sm font-normal block mb-1">{t("total_payment")}</span>
              <strong className="text-secondary text-base md:text-lg font-bold font-sans">
                {formatVND(totalNum)}
              </strong>
            </div>
          </div>
        </div>

        {/* Order Code Banner */}
        <div className="bg-yellow/60 border border-secondary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs md:text-sm font-sans">
          <div>
            <span className="text-brown block font-medium">
              {t("order_code_label")} <strong className="font-mono font-bold text-primary">{order.order_code?.startsWith("#") ? order.order_code : `#${order.order_code}`}</strong>
            </span>
            <span className="text-brown/90 text-xs mt-0.5 block">
              {t("lookup_tip")}
            </span>
          </div>
          <a
            href={`/order-lookup?code=${order.order_code}&phone=${order.customer?.phone || ""}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium text-xs transition-colors shrink-0"
          >
            {t("lookup_button")}
          </a>
        </div>
      </div>

      {/* Item List */}
      <div className="mt-8 border border-gray-100 rounded-2xl p-5 md:p-6 font-sans">
        <h2 className="text-lg md:text-xl font-bold font-display text-primary border-b border-gray-100 pb-3 mb-4">
          {t("ordered_items")}
        </h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((item: any, index: number) => {
            const displayPrice = formatVND(parseFloat(item.price) || 0);
            const displayImage = item.image || "/cover.jpg";

            return (
              <div key={index} className="py-3 flex items-center justify-between gap-4 font-sans">
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
                    <strong className="text-primary text-sm md:text-base font-bold font-sans block leading-tight">
                      {item.product_name}
                    </strong>
                    {item.variant_size && (
                      <span className="text-gray-400 text-xs block mt-1 font-medium font-sans">
                        {item.variant_size}
                      </span>
                    )}
                  </div>
                </div>
                {/* Quantity and Price */}
                <span className="text-gray-900 text-sm md:text-base font-bold font-sans whitespace-nowrap">
                  {item.quantity} x {displayPrice}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pricing Breakdown Shaded Box */}
        <div className="bg-gray-100 rounded-2xl p-5 space-y-3 mt-6 font-sans">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-gray-600 font-medium">{t("subtotal")}</span>
            <strong className="text-primary font-bold">
              {formatVND(subtotalNum)}
            </strong>
          </div>

          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-gray-600 font-medium">{t("shipping_fee")}</span>
            <strong className="text-primary font-bold">
              {isPickup || shippingFeeNum === 0 ? t("free") : formatVND(shippingFeeNum)}
            </strong>
          </div>

          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-gray-600 font-medium">{t("discount")}</span>
            <strong className="text-primary font-bold">
              {discountNum === 0 ? "0 đ" : `-${formatVND(discountNum)}`}
            </strong>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-primary text-sm md:text-base font-bold">{t("total_payment")}</span>
            <strong className="text-secondary text-lg md:text-xl font-bold">
              {formatVND(totalNum)}
            </strong>
          </div>
        </div>
      </div>

      {/* Continue Shopping Button */}
      <Link
        href="/product"
        className="w-full py-4 rounded-2xl font-bold text-white transition-all shadow-[0_4px_14px_rgba(205,72,41,0.2)] bg-secondary hover:bg-secondary/90 flex items-center justify-center mt-8 text-sm md:text-base"
      >
        {t("continue_shopping")}
      </Link>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-gray-100 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold font-display text-primary">
                {t("cancel_modal_title")}
              </h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {t("cancel_modal_desc")}
            </p>

            <div>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("cancel_reason_placeholder")}
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary shadow-xs"
              />
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all cursor-pointer"
              >
                {t("close")}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-sm font-bold transition-all shadow-md shadow-secondary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t("confirm_cancel")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
