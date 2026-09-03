"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/i18n-navigation";
import {
  lookupOrders,
  cancelOrderApi,
  requestCancelOrderApi,
  OrderApiError,
} from "@/services/orderService";
import { getGeneralSettings } from "@/services/generalSettingService";
import OrderStatusStepper from "@/components/Order/OrderStatusStepper";

interface OrderDetailData {
  order_code: string;
  status: string;
  sync_status: string;
  payment_status: string;
  can_cancel: boolean;
  cancel_window_expires_at?: string;
  remaining_cancel_seconds?: number;
  cancelled_at?: string;
  cancel_reason?: string;
  cancel_requested_at?: string;
  cancel_type?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_type: string;
  delivery: {
    receiver?: string;
    contact_number?: string;
    address?: string;
    price: string;
    expected_delivery?: string;
  };
  payment: {
    method: string;
    total_payment: string;
    account_id?: number;
  };
  discount: string;
  subtotal: string;
  total: string;
  description?: string;
  kiotviet_code?: string;
  kiotviet_order_id?: number;
  items: {
    product_id: number;
    product_code: string;
    product_name: string;
    quantity: number;
    price: string;
    discount: string;
    note?: string;
    image?: string;
    variant_size?: string;
  }[];
  created_at: string;
}

export default function OrderLookupPage() {
  const t = useTranslations("orderLookup");
  const searchParams = useSearchParams();
  const [orderCode, setOrderCode] = useState(searchParams.get("code") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [hotline, setHotline] = useState("0987 654 321");

  useEffect(() => {
    getGeneralSettings()
      .then((s) => {
        if (s?.hotline) setHotline(s.hotline);
      })
      .catch(() => { });
  }, []);

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [orderList, setOrderList] = useState<OrderDetailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cancellation Modal & Input
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Countdown timer for 15-minute window
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const fetchOrders = async (codeStr: string, phoneStr: string) => {
    const trimmedCode = codeStr.trim();
    const trimmedPhone = phoneStr.trim();

    if (!trimmedCode && !trimmedPhone) {
      setError(t("validation_error"));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await lookupOrders(trimmedPhone, trimmedCode);

      if (Array.isArray(res)) {
        if (res.length === 0) {
          setOrder(null);
          setOrderList([]);
          setError(t("no_orders_found_phone") || t("not_found"));
        } else if (res.length === 1 && trimmedCode) {
          const singleOrder = res[0] as unknown as OrderDetailData;
          setOrder(singleOrder);
          setOrderList([]);
          setSecondsLeft(singleOrder.remaining_cancel_seconds || 0);
        } else {
          const list = (res as unknown as OrderDetailData[]).slice(0, 5);
          setOrderList(list);
          setOrder(null);
        }
      } else if (res && typeof res === "object") {
        const fetchedOrder = res as unknown as OrderDetailData;
        setOrder(fetchedOrder);
        setOrderList([]);
        setSecondsLeft(fetchedOrder.remaining_cancel_seconds || 0);
      } else {
        setOrder(null);
        setOrderList([]);
        setError(t("not_found"));
      }
    } catch (err: unknown) {
      setOrder(null);
      setOrderList([]);
      if (err instanceof OrderApiError) {
        setError(err.message);
      } else {
        setError(t("not_found"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if URL query params exist
  useEffect(() => {
    const codeParam = searchParams.get("code") || "";
    const phoneParam = searchParams.get("phone") || "";
    if (codeParam || phoneParam) {
      setOrderCode(codeParam);
      setPhone(phoneParam);
      fetchOrders(codeParam, phoneParam);
    }
  }, [searchParams]);

  // Live Timer Countdown effect
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Polling for live status updates if active order is pending
  useEffect(() => {
    if (!order?.order_code) return;

    const currentStatus = (order.status || "").toLowerCase();
    const currentSyncStatus = (order.sync_status || "").toLowerCase();
    const shouldPoll =
      currentStatus === "pending" ||
      currentStatus === "pending_payment" ||
      currentStatus === "pending_sync" ||
      currentSyncStatus === "pending";

    if (!shouldPoll) return;

    const interval = setInterval(async () => {
      try {
        const orderPhone = phone.trim() || order.customer?.phone || "";
        const res = await lookupOrders(orderPhone, order.order_code);
        if (Array.isArray(res) && res.length === 1) {
          const updated = res[0] as unknown as OrderDetailData;
          setOrder(updated);
        } else if (res && typeof res === "object" && !Array.isArray(res)) {
          const updated = res as unknown as OrderDetailData;
          setOrder(updated);
        }
      } catch {
        // silent polling error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.order_code, order?.status, order?.sync_status, phone]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(orderCode, phone);
  };

  const handleSelectOrder = (selectedOrder: OrderDetailData) => {
    setOrder(selectedOrder);
    setSecondsLeft(selectedOrder.remaining_cancel_seconds || 0);
  };

  const handleBackToList = () => {
    setOrder(null);
  };

  const isOnlinePaid =
    order?.payment?.method === "TRANSFER" || order?.payment?.method === "CARD";

  const handleConfirmCancel = async () => {
    if (!order) return;

    setActionLoading(true);
    setModalError(null);

    const cancelPhone = phone.trim() || order.customer?.phone || order.delivery?.contact_number || "";

    try {
      if (isOnlinePaid) {
        if (!cancelReason.trim()) {
          setModalError(t("cancel_reason_placeholder"));
          setActionLoading(false);
          return;
        }
        const res = await requestCancelOrderApi(
          order.order_code,
          cancelPhone,
          cancelReason.trim()
        );
        setSuccessMsg(res.message);
        const updated = res.data as unknown as OrderDetailData;
        setOrder(updated);
        setOrderList((prev) =>
          prev.map((item) => (item.order_code === updated.order_code ? updated : item))
        );
      } else {
        const res = await cancelOrderApi(
          order.order_code,
          cancelPhone,
          cancelReason.trim() || undefined
        );
        setSuccessMsg(res.message);
        const updated = res.data as unknown as OrderDetailData;
        setOrder(updated);
        setOrderList((prev) =>
          prev.map((item) => (item.order_code === updated.order_code ? updated : item))
        );
      }
      setShowCancelModal(false);
      setCancelReason("");
    } catch (err: unknown) {
      if (err instanceof OrderApiError) {
        setModalError(err.message);
      } else {
        setModalError(t("not_found"));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatMoney = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("vi-VN").format(num || 0) + "đ";
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const renderStatusBadge = (status: string, paymentMethod?: string, paymentStatus?: string) => {
    switch (status) {
      case "pending_payment":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-yellow/30 text-yellow border border-yellow/40 backdrop-blur-sm shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow animate-pulse"></span>
            {t("status.pending_payment")}
          </span>
        );
      case "pending_sync":
      case "pending":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-primary/40 text-yellow border border-yellow/30 backdrop-blur-sm shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow"></span>
            {t("status.pending_sync")}
          </span>
        );
      case "processing":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-secondary text-white shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {t("status.processing")}
          </span>
        );
      case "shipping":
      case "delivering":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-secondary text-white shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {t("status.shipping")}
          </span>
        );
      case "confirmed":
      case "synced":
      case "paid":
      case "completed":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-primary text-white shadow-xs flex items-center gap-1.5 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-yellow"></span>
            {paymentMethod === "COD" && paymentStatus !== "paid" ? t("status.confirmed") : t("status.paid")}
          </span>
        );
      case "error":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-secondary text-white shadow-xs flex items-center gap-1.5">
            <span>{t("status.error") || "Lỗi đơn hàng"}</span>
          </span>
        );
      case "cancel_requested":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-yellow/20 text-yellow border border-yellow/30 backdrop-blur-sm shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow"></span>
            {t("status.cancel_requested")}
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-red-900/40 text-red-200 border border-red-500/30 backdrop-blur-sm shadow-xs">
            {t("status.cancelled")}
          </span>
        );
      case "expired":
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-gray-500/20 text-gray-300 border border-gray-400/30 backdrop-blur-sm shadow-xs">
            {t("status.expired")}
          </span>
        );
      default:
        return (
          <span className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide border border-primary/20 shadow-xs">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {t("title")}
          </div>
          <h1 className="text-3xl font-bold font-display text-primary tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(20,42,104,0.06)] border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
          <form onSubmit={handleSearchSubmit} className="space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 items-end">
            <div className="md:col-span-5">
              <label htmlFor="orderCode" className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                {t("order_code")} <span className="text-xs text-gray-400 font-normal lowercase tracking-normal">{t("optional_tag")}</span>
              </label>
              <input
                id="orderCode"
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder={t("order_code_placeholder")}
                className="w-full h-[48px] px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 font-mono text-sm shadow-xs"
              />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="phone" className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                {t("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phone_placeholder")}
                className="w-full h-[48px] px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-gray-900 text-sm shadow-xs"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] bg-secondary hover:bg-secondary/95 text-white font-bold px-4 rounded-xl transition-all shadow-md shadow-secondary/20 hover:shadow-lg hover:shadow-secondary/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t("search_button")}</span>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-4 rounded-xl bg-yellow/60 border border-secondary/30 text-brown text-sm flex items-center gap-3">
              <svg className="w-5 h-5 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Recent Orders List Container (Phương án 1) */}
        {!order && orderList.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(20,42,104,0.06)] border border-gray-100 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-primary">
                {t("recent_orders_title")}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t("recent_orders_subtitle", { phone: phone || orderList[0]?.customer?.phone || "" })}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {orderList.map((item) => (
                <div
                  key={item.order_code}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-base sm:text-lg font-bold font-mono text-primary">
                        {item.order_code}
                      </span>
                      <div className="sm:hidden">
                        {renderStatusBadge(item.status, item.payment?.method, item.payment_status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>{t("order_date")}: </span>
                      <span className="font-medium text-gray-700">
                        {item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>{t("total")}: </span>
                      <span className="font-bold text-secondary text-sm">
                        {formatMoney(item.total)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <div className="hidden sm:block">
                      {renderStatusBadge(item.status, item.payment?.method, item.payment_status)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectOrder(item)}
                      className="bg-secondary hover:bg-secondary/90 text-yellow text-sm font-bold py-2 px-4 rounded-xl transition-all shadow-md shadow-secondary/20 whitespace-nowrap cursor-pointer"
                    >
                      {t("view_details")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Details Container */}
        {order && (
          <div className="space-y-4">
            {orderList.length > 0 && (
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-primary text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                {t("back_to_list")}
              </button>
            )}

            {/* Confirmation Notice Box */}
            <div className="bg-yellow/60 border border-secondary/30 rounded-2xl p-4 md:p-5 text-center shadow-xs">
              <p className="text-brown text-sm md:text-base leading-relaxed font-normal">
                {t("notice_message")}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgba(20,42,104,0.06)] border border-gray-100 overflow-hidden transition-all">
            {/* Header Banner - Brand Header */}
            <div className="bg-primary text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-secondary/15 blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="text-xs text-yellow/80 font-mono uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  {t("order_code")}
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-wide text-white drop-shadow-xs">
                  {order.order_code}
                </div>
                <div className="text-xs text-yellow/90 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-yellow/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("created_at")}: {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}</span>
                </div>
              </div>
              <div className="relative z-10 flex flex-col items-start sm:items-end gap-2.5">
                <div>{renderStatusBadge(order.status, order.payment?.method, order.payment_status)}</div>
                <div className="text-xs text-yellow/90 flex items-center gap-1.5">
                  <span>{t("payment_method")}:</span>
                  <span className="font-bold text-yellow px-2.5 py-0.5 rounded bg-white/10 backdrop-blur-xs border border-white/15">
                    {order.payment?.method}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Progress Stepper */}
            <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
              <OrderStatusStepper
                status={order.status}
                syncStatus={order.sync_status}
              />
            </div>

            {/* 15-Minute Countdown Banner & Action */}
            {order.status !== "cancelled" &&
              order.status !== "expired" &&
              order.status !== "cancel_requested" && (
                <div className="p-6 border-b border-gray-100 bg-yellow/40 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-brown font-bold text-sm">
                        <svg className="w-5 h-5 text-secondary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t("cancel_order")} (15m)
                      </div>
                      {secondsLeft > 0 && order.can_cancel ? (
                        <p className="text-xs text-brown/80 mt-1">
                          {t("cancel_modal_desc")}
                        </p>
                      ) : (
                        <p className="text-xs text-rose-700 mt-1 font-semibold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {t("cancel_window_expired")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {secondsLeft > 0 && order.can_cancel && (
                        <div className="bg-white text-secondary font-mono font-bold text-lg px-4 py-2 rounded-xl border border-secondary/20 shadow-xs">
                          {formatTimer(secondsLeft)}
                        </div>
                      )}

                      {order.can_cancel && secondsLeft > 0 ? (
                        <button
                          onClick={() => {
                            setModalError(null);
                            setShowCancelModal(true);
                          }}
                          className="bg-secondary hover:bg-secondary/90 text-yellow text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-md shadow-secondary/20 whitespace-nowrap cursor-pointer"
                        >
                          {isOnlinePaid ? t("cancel_request") : t("cancel_order")}
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

            {/* Cancellation Status Banner if Cancelled */}
            {(order.status === "cancelled" || order.status === "cancel_requested") && (
              <div className="p-6 bg-yellow/20 border-b border-gray-100">
                <div className="text-sm font-bold text-primary mb-1">
                  {order.status === "cancelled" ? t("status.cancelled") : t("status.cancel_requested")}
                </div>
                {order.cancelled_at && (
                  <div className="text-xs text-gray-600">
                    {t("created_at")}: {new Date(order.cancelled_at).toLocaleString("vi-VN")}
                  </div>
                )}
                {order.cancel_requested_at && (
                  <div className="text-xs text-gray-600">
                    {t("created_at")}: {new Date(order.cancel_requested_at).toLocaleString("vi-VN")}
                  </div>
                )}
                {order.cancel_reason && (
                  <div className="text-xs text-gray-700 bg-white p-3.5 rounded-xl border border-gray-200 mt-2 italic shadow-xs">
                    &quot;{order.cancel_reason}&quot;
                  </div>
                )}
              </div>
            )}

            {/* Grid details */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100">
              {/* Customer & Delivery */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {t("receiver_info")}
                </h3>
                <div className="bg-yellow/30 p-5 rounded-2xl border border-yellow space-y-2 text-sm text-gray-800 shadow-xs">
                  <div className="font-bold text-primary text-base">{order.customer?.name}</div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-500">{t("phone")}:</span>
                    <span className="font-medium font-mono">{order.customer?.phone}</span>
                  </div>
                  {order.customer?.email && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{order.customer?.email}</span>
                    </div>
                  )}
                  <div className="pt-2.5 text-xs text-gray-600 border-t border-gray-200/80 mt-2 leading-relaxed">
                    <span className="font-bold text-primary">{t("delivery_address")}:</span>{" "}
                    {order.delivery?.address || t("delivery_type_pickup")}
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {t("payment_info")}
                </h3>
                <div className="bg-yellow/30 p-5 rounded-2xl border border-yellow space-y-2.5 text-sm text-gray-700 shadow-xs">
                  <div className="flex justify-between">
                    <span>{t("subtotal")}:</span>
                    <span className="font-semibold text-gray-900">{formatMoney(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-secondary font-medium">
                    <span>{t("discount")}:</span>
                    <span>-{formatMoney(order.discount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      {t("shipping_fee")}:
                      {parseFloat(order.delivery?.price || "0") === 0 && (
                        <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Freeship
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-900">{formatMoney(order.delivery?.price || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200/80 pt-3 flex justify-between items-center font-bold text-gray-900 text-base">
                    <span className="text-primary">{t("total")}:</span>
                    <span className="text-secondary font-display text-xl font-extrabold">{formatMoney(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-6 sm:p-8">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                {t("ordered_items")}
              </h3>
              <div className="divide-y divide-gray-100 border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs bg-white">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-yellow/20 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 relative rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200/80 shadow-xs">
                        <Image
                          src={item.image || "/cover.jpg"}
                          alt={item.product_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-primary text-sm group-hover:text-secondary transition-colors">{item.product_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          {item.variant_size && (
                            <span className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              {item.variant_size}
                            </span>
                          )}
                          <span className="text-secondary font-bold font-sans">x {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-secondary text-sm sm:text-base">{formatMoney(parseFloat(item.price) * item.quantity)}</div>
                      {parseFloat(item.discount) > 0 && (
                        <div className="text-xs text-secondary font-medium mt-0.5">-{formatMoney(item.discount)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative border border-gray-100">
              <h3 className="text-xl font-bold font-display text-primary">
                {t("cancel_modal_title")}
              </h3>

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
                ></textarea>
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
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all"
                >
                  {t("close")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-yellow text-sm font-bold transition-all shadow-md shadow-secondary/20 flex items-center gap-2 cursor-pointer"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isOnlinePaid ? t("cancel_request") : t("confirm_cancel")}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

