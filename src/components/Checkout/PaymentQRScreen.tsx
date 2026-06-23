"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import { formatPrice } from "@/lib/format";
import type { OrderInitiated } from "@/services/orderService";

interface PaymentQRScreenProps {
  orderData: OrderInitiated;
  phone: string;
  onCancel?: () => void;
}

function useCountdown(expireAt: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = Math.floor((new Date(expireAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return {
    secondsLeft,
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    isExpired: secondsLeft <= 0,
  };
}

export default function PaymentQRScreen({
  orderData,
  phone,
  onCancel,
}: PaymentQRScreenProps) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const countdown = useCountdown(orderData.expire_at);
  const { data: statusData, error: statusError } = useOrderStatus(
    orderData.order_code,
  );
  const [copied, setCopied] = useState(false);

  // Redirect khi đã thanh toán thành công hoặc đã đồng bộ
  useEffect(() => {
    if (statusData?.payment_status === "paid" || statusData?.status === "synced") {
      router.push({
        pathname: "/order-success",
        query: { code: orderData.order_code, phone },
      });
    }
  }, [statusData, router, orderData.order_code, phone]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const amount = orderData.qr_info.amount;
  const content = orderData.qr_info.content;
  const bankAccount = orderData.qr_info.bank_account;
  const bankCode = orderData.qr_info.bank_code;

  const handleSimulatePayment = async () => {
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/sepay/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Apikey BepCoThaoSecured2026",
        },
        body: JSON.stringify({
          id: Math.floor(Math.random() * 100000) + 1,
          gateway: "Vietcombank",
          transactionDate: new Date().toISOString().slice(0, 19).replace("T", " "),
          accountNumber: bankAccount,
          code: "MOCK_SEPAY_" + orderData.order_code,
          content: content,
          transferType: "in",
          transferAmount: amount,
          referenceCode: "FT" + Math.floor(Math.random() * 10000000),
        }),
      });
      const data = await res.json();
      console.log("Simulated payment response:", data);
    } catch (err) {
      console.error("Failed to simulate payment:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10">
      {/* QR Code Panel */}
      <div className="lg:col-span-5 flex flex-col items-center gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full flex flex-col items-center gap-4">
          <h2 className="headline-2 text-primary text-center">
            Quét mã QR để thanh toán
          </h2>

          {/* QR Image */}
          <div className="relative w-56 h-56 rounded-xl overflow-hidden border-2 border-primary/20 shadow-md">
            {countdown.isExpired ? (
              <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-2">
                <span className="text-4xl">⏰</span>
                <p className="body-2 text-gray-500 text-center px-2">
                  Mã QR đã hết hạn
                </p>
              </div>
            ) : (
              <Image
                src={orderData.qr_url}
                alt="QR thanh toán SePay"
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>

          {/* Countdown */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${countdown.secondsLeft <= 60
                ? "bg-red-50 text-red-600"
                : "bg-yellow/20 text-primary"
              }`}
          >
            <span>⏱</span>
            <span>
              {countdown.isExpired
                ? "Đã hết hạn"
                : `Hết hạn sau: ${countdown.label}`}
            </span>
          </div>

          {/* Trạng thái polling */}
          {!countdown.isExpired && (
            <div className="flex items-center gap-2 text-gray-500 body-2">
              {statusData?.payment_status === "paid" ? (
                <>
                  <span className="text-green-500">✓</span>
                  <span className="text-green-600">Đã nhận thanh toán — đang xử lý...</span>
                </>
              ) : statusError ? (
                <span className="text-red-500 text-xs">{statusError}</span>
              ) : (
                <>
                  <span className="animate-spin inline-block">⟳</span>
                  <span>Đang chờ xác nhận thanh toán...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary w-full"
          >
            {countdown.isExpired ? "Đặt lại đơn hàng" : "Huỷ và quay lại"}
          </button>
        )}

        {/* DEV ONLY: Simulate Payment Button */}
        {(process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_MODE === "true") && !countdown.isExpired && (
          <button
            type="button"
            onClick={handleSimulatePayment}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-amber-500 bg-amber-50/50 hover:bg-amber-100/50 text-amber-800 text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            ⚡ Giả lập thanh toán thành công (Dev)
          </button>
        )}
      </div>

      {/* Payment Info Panel */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="headline-2 text-primary">Thông tin chuyển khoản</h2>

          <div className="space-y-3">
            {[
              { label: "Ngân hàng", value: bankCode },
              { label: "Số tài khoản", value: bankAccount, copyable: true },
              {
                label: "Số tiền",
                value: formatPrice(amount),
                highlight: true,
                copyable: true,
                copyValue: String(amount),
              },
              { label: "Nội dung CK", value: content, copyable: true, mono: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0"
              >
                <span className="label-1 text-gray-500 shrink-0">{row.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`body-1 break-all text-right ${row.highlight ? "title-2 text-secondary" : "text-gray-900"
                      } ${row.mono ? "font-mono text-sm" : ""}`}
                  >
                    {row.value}
                  </span>
                  {row.copyable && (
                    <button
                      type="button"
                      onClick={() => handleCopy(row.copyValue ?? row.value)}
                      className="shrink-0 text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary hover:text-white transition-colors"
                      title="Sao chép"
                    >
                      {copied ? "✓" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow/10 border border-yellow rounded-xl p-4 space-y-1">
            <p className="label-1 text-primary">⚠️ Lưu ý quan trọng:</p>
            <ul className="body-2 text-gray-700 list-disc list-inside space-y-1">
              <li>
                Nhập <strong>đúng nội dung</strong> chuyển khoản:{" "}
                <code className="font-mono bg-white px-1 rounded text-xs">{content}</code>
              </li>
              <li>Chuyển khoản đúng số tiền để đơn hàng được xác nhận tự động</li>
              <li>Đơn hàng sẽ được xử lý trong vài giây sau khi nhận tiền</li>
            </ul>
          </div>

          {/* Order summary */}
          <div className="border-t border-gray-100 pt-4 space-y-2 body-1 text-gray-700">
            <p className="label-1 text-gray-500">Mã đơn hàng</p>
            <p className="title-2 font-mono text-primary">{orderData.order_code}</p>
            <div className="flex justify-between pt-2 headline-2 text-primary">
              <span>Tổng thanh toán</span>
              <span className="text-secondary">{formatPrice(amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
