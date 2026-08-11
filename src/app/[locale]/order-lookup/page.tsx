"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import {
  getOrderByCode,
  cancelOrderApi,
  requestCancelOrderApi,
  OrderApiError,
} from "@/services/orderService";

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
  const searchParams = useSearchParams();
  const [orderCode, setOrderCode] = useState(searchParams.get("code") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");

  const [order, setOrder] = useState<OrderDetailData | null>(null);
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

  const fetchOrder = async (codeStr: string, phoneStr: string) => {
    if (!codeStr.trim() || !phoneStr.trim()) {
      setError("Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await getOrderByCode(codeStr.trim(), phoneStr.trim());
      const fetchedOrder = data as unknown as OrderDetailData;
      setOrder(fetchedOrder);
      setSecondsLeft(fetchedOrder.remaining_cancel_seconds || 0);
    } catch (err: unknown) {
      setOrder(null);
      if (err instanceof OrderApiError) {
        setError(err.message);
      } else {
        setError("Không tìm thấy đơn hàng hoặc thông tin không khớp.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if URL query params exist
  useEffect(() => {
    const codeParam = searchParams.get("code");
    const phoneParam = searchParams.get("phone");
    if (codeParam && phoneParam) {
      setOrderCode(codeParam);
      setPhone(phoneParam);
      fetchOrder(codeParam, phoneParam);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderCode, phone);
  };

  const isOnlinePaid =
    order?.payment?.method === "TRANSFER" || order?.payment?.method === "CARD";

  const handleConfirmCancel = async () => {
    if (!order) return;

    setActionLoading(true);
    setModalError(null);

    try {
      if (isOnlinePaid) {
        if (!cancelReason.trim()) {
          setModalError("Vui lòng nhập lý do hủy đơn.");
          setActionLoading(false);
          return;
        }
        const res = await requestCancelOrderApi(
          order.order_code,
          phone,
          cancelReason.trim()
        );
        setSuccessMsg(res.message);
        setOrder(res.data as unknown as OrderDetailData);
      } else {
        const res = await cancelOrderApi(
          order.order_code,
          phone,
          cancelReason.trim() || undefined
        );
        setSuccessMsg(res.message);
        setOrder(res.data as unknown as OrderDetailData);
      }
      setShowCancelModal(false);
      setCancelReason("");
    } catch (err: unknown) {
      if (err instanceof OrderApiError) {
        setModalError(err.message);
      } else {
        setModalError("Thao tác thất bại, vui lòng thử lại sau.");
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
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            Chờ thanh toán
          </span>
        );
      case "pending_sync":
      case "pending":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            Chờ xử lý / Đóng gói
          </span>
        );
      case "synced":
      case "paid":
      case "completed":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            {paymentMethod === "COD" && paymentStatus !== "paid" ? "Đã xác nhận" : "Đã thanh toán"}
          </span>
        );
      case "cancel_requested":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-300">
            Đã gửi yêu cầu hủy (CSKH đang xử lý)
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
            Đã hủy
          </span>
        );
      case "expired":
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
            Hết hạn
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <svg
              className="w-4 h-4"
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
            Tra cứu đơn hàng vãng lai
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl">
            Theo dõi & Quản lý đơn hàng
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Nhập Mã đơn hàng và Số điện thoại đặt hàng để xem chi tiết hoặc thực hiện hủy đơn trong vòng 15 phút.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSearchSubmit} className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4">
            <div className="sm:col-span-5">
              <label htmlFor="orderCode" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Mã đơn hàng
              </label>
              <input
                id="orderCode"
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Ví dụ: ORD-20260807-ABCDEF"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 font-mono text-sm"
                required
              />
            </div>
            <div className="sm:col-span-5">
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại khi đặt đơn"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Tra cứu</span>
                  </>
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
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Order Details Container */}
        {order && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
            {/* Header Banner */}
            <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">Mã đơn hàng</div>
                <div className="text-2xl font-bold font-mono tracking-wide text-white">{order.order_code}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Ngày đặt: {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <div>{renderStatusBadge(order.status, order.payment?.method, order.payment_status)}</div>
                <div className="text-xs text-slate-300">
                  Phương thức: <span className="font-semibold text-white">{order.payment?.method}</span>
                </div>
              </div>
            </div>

            {/* 15-Minute Countdown Banner & Action */}
            {order.status !== "cancelled" &&
              order.status !== "expired" &&
              order.status !== "cancel_requested" && (
                <div className="p-6 border-b border-gray-100 bg-amber-50/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                        <svg className="w-5 h-5 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Khung thời gian tự hủy đơn (15 phút)
                      </div>
                      {secondsLeft > 0 && order.can_cancel ? (
                        <p className="text-xs text-amber-700 mt-1">
                          Bạn có thể thực hiện hủy hoặc gửi yêu cầu hủy đơn hàng trong thời gian còn lại.
                        </p>
                      ) : (
                        <p className="text-xs text-rose-600 mt-1 font-medium">
                          Quá 15 phút hoặc đơn hàng đã được kho tiếp nhận xử lý. Không thể tự hủy trực tiếp.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {secondsLeft > 0 && order.can_cancel && (
                        <div className="bg-amber-100 text-amber-900 font-mono font-bold text-lg px-4 py-2 rounded-xl border border-amber-200">
                          {formatTimer(secondsLeft)}
                        </div>
                      )}

                      {order.can_cancel && secondsLeft > 0 ? (
                        <button
                          onClick={() => {
                            setModalError(null);
                            setShowCancelModal(true);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-2.5 px-5 rounded-xl transition-all shadow-md shadow-rose-600/20 whitespace-nowrap"
                        >
                          {isOnlinePaid ? "Yêu cầu hủy đơn" : "Hủy đơn hàng"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-gray-200 text-gray-400 text-sm font-medium py-2.5 px-5 rounded-xl cursor-not-allowed whitespace-nowrap"
                        >
                          Không thể hủy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Cancellation Status Banner if Cancelled */}
            {(order.status === "cancelled" || order.status === "cancel_requested") && (
              <div className="p-6 bg-slate-50 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900 mb-1">
                  {order.status === "cancelled" ? "Thông tin hủy đơn hàng" : "Thông tin yêu cầu hủy đơn"}
                </div>
                {order.cancelled_at && (
                  <div className="text-xs text-gray-600">
                    Thời gian hủy: {new Date(order.cancelled_at).toLocaleString("vi-VN")}
                  </div>
                )}
                {order.cancel_requested_at && (
                  <div className="text-xs text-gray-600">
                    Thời gian gửi yêu cầu: {new Date(order.cancel_requested_at).toLocaleString("vi-VN")}
                  </div>
                )}
                {order.cancel_reason && (
                  <div className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200 mt-2 italic">
                    Lý do: &quot;{order.cancel_reason}&quot;
                  </div>
                )}
              </div>
            )}

            {/* Grid details */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100">
              {/* Customer & Delivery */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông tin nhận hàng</h3>
                <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-sm text-gray-800">
                  <div className="font-semibold text-gray-900">{order.customer?.name}</div>
                  <div>SĐT: {order.customer?.phone}</div>
                  {order.customer?.email && <div>Email: {order.customer?.email}</div>}
                  <div className="pt-2 text-xs text-gray-600 border-t border-gray-200 mt-2">
                    <span className="font-semibold">Địa chỉ giao hàng:</span>{" "}
                    {order.delivery?.address || "Nhận tại cửa hàng"}
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tóm tắt thanh toán</h3>
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Tạm tính sản phẩm:</span>
                    <span className="font-medium">{formatMoney(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Giảm giá (Voucher):</span>
                    <span>-{formatMoney(order.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Phí giao hàng:
                      {parseFloat(order.delivery?.price || "0") === 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                          Freeship
                        </span>
                      )}
                    </span>
                    <span className="font-medium">{formatMoney(order.delivery?.price || 0)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                    <span>Tổng thanh toán:</span>
                    <span className="text-primary">{formatMoney(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="p-6 sm:p-8">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Danh sách sản phẩm</h3>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 relative rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        <Image
                          src={item.image || "/cover.jpg"}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.product_name}</div>
                        <div className="text-xs text-gray-500 font-mono">Mã: {item.product_code} x {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">{formatMoney(parseFloat(item.price) * item.quantity)}</div>
                      {parseFloat(item.discount) > 0 && (
                        <div className="text-xs text-emerald-600">Giảm: -{formatMoney(item.discount)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
              <h3 className="text-xl font-bold text-gray-900">
                {isOnlinePaid ? "Gửi yêu cầu hủy đơn hàng" : "Xác nhận hủy đơn hàng"}
              </h3>

              <p className="text-sm text-gray-600">
                {isOnlinePaid
                  ? "Đơn hàng của bạn đã thanh toán Online. Sau khi gửi yêu cầu, bộ phận CSKH sẽ tiến hành đối soát và liên hệ hoàn tiền cho bạn."
                  : "Bạn có chắc chắn muốn hủy đơn hàng này không? Thao tác này sẽ hủy phiếu tạm và nhả lại tồn kho ngay lập tức."}
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lý do hủy {isOnlinePaid && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={
                    isOnlinePaid
                      ? "Vui lòng ghi rõ lý do hủy và thông tin tài khoản nhận lại tiền..."
                      : "Nhập lý do hủy (không bắt buộc)..."
                  }
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-all"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-all shadow-md shadow-rose-600/20 flex items-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Xác nhận</span>
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
