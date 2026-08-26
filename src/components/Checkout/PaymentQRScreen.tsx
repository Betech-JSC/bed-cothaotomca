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
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

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

  const handleDownloadQR = async () => {
    if (countdown.isExpired || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(orderData.qr_url);
      if (!response.ok) throw new Error("Fetch QR image failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QR_Thanh_Toan_${orderData.order_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.warn("Blob download failed, fallback to direct open/download link", err);
      try {
        const link = document.createElement("a");
        link.href = orderData.qr_url;
        link.target = "_blank";
        link.download = `QR_Thanh_Toan_${orderData.order_code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 3000);
      } catch (e) {
        console.error("Failed to download QR image", e);
      }
    } finally {
      setDownloading(false);
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
            {t("qr.title")}
          </h2>

          {/* QR Image */}
          <div className="relative w-56 h-56 rounded-xl overflow-hidden border-2 border-primary/20 shadow-md">
            {countdown.isExpired ? (
              <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-2">
                <p className="body-2 text-gray-500 text-center px-2">
                  {t("qr.expired")}
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
                : "bg-yellow/70 text-primary border border-secondary/20"
              }`}
          >
            <span>⏱</span>
            <span>
              {countdown.isExpired
                ? t("qr.expired_tag")
                : `${t("qr.expires_in")} ${countdown.label}`}
            </span>
          </div>

          {/* Option: Lưu / Tải mã QR về máy */}
          {!countdown.isExpired && (
            <div className="w-full space-y-3 pt-1">
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/95 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 text-sm cursor-pointer"
              >
                {downloading ? (
                  <>
                    <span className="animate-spin inline-block">⟳</span>
                    <span>{t("qr.downloading")}</span>
                  </>
                ) : downloaded ? (
                  <>
                    <span className="text-secondary font-bold text-base">✓</span>
                    <span>{t("qr.downloaded")}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{t("qr.download_btn")}</span>
                  </>
                )}
              </button>

              {/* Mobile guidance instructions */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 w-full text-xs text-primary space-y-1.5 font-serif text-left">
                <p className="font-bold text-primary">
                  <span>{t("qr.mobile_guide_title")}</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-primary/90 font-medium pl-0.5 leading-relaxed">
                  <li>
                    {t.rich("qr.mobile_step_1", {
                      btn: t("qr.download_btn"),
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </li>
                  <li>
                    {t.rich("qr.mobile_step_2", {
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </li>
                  <li>
                    {t.rich("qr.mobile_step_3", {
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Trạng thái polling */}
          {!countdown.isExpired && (
            <div className="flex items-center gap-2 text-gray-500 body-2">
              {statusData?.payment_status === "paid" ? (
                <>
                  <span className="text-secondary font-bold">✓</span>
                  <span className="text-secondary font-bold">{t("qr.payment_received")}</span>
                </>
              ) : statusError ? (
                <span className="text-red-500 text-xs">{statusError}</span>
              ) : (
                <>
                  <span className="animate-spin inline-block">⟳</span>
                  <span>{t("qr.waiting_payment")}</span>
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
            {countdown.isExpired ? t("qr.reorder") : t("qr.cancel_back")}
          </button>
        )}

        {/* DEV ONLY: Simulate Payment Button (Requires explicit NEXT_PUBLIC_ENABLE_DEV_PAYMENT=true) */}
        {process.env.NEXT_PUBLIC_ENABLE_DEV_PAYMENT === "true" && !countdown.isExpired && (
          <button
            type="button"
            onClick={handleSimulatePayment}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-secondary/40 bg-yellow/60 hover:bg-yellow text-brown text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            Giả lập thanh toán thành công (Dev)
          </button>
        )}
      </div>

      {/* Payment Info Panel */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="headline-2 text-primary">{t("qr.bank_info_title")}</h2>

          <div className="space-y-3">
            {[
              { label: t("qr.bank_name"), value: bankCode },
              { label: t("qr.account_number"), value: bankAccount, copyable: true },
              {
                label: t("qr.amount"),
                value: formatPrice(amount),
                highlight: true,
                copyable: true,
                copyValue: String(amount),
              },
              { label: t("qr.content"), value: content, copyable: true, mono: true },
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
                      title={t("qr.copy")}
                    >
                      {copied ? "✓" : t("qr.copy")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow/60 border border-secondary/20 rounded-xl p-4 space-y-1">
            <p className="label-1 text-primary font-bold">{t("qr.note_title")}:</p>
            <ul className="body-2 text-brown list-disc list-inside space-y-1">
              <li>
                {t.rich("qr.note_content", {
                  content: content,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  code: () => <code className="font-mono bg-white px-1 rounded text-xs text-primary">{content}</code>,
                })}
              </li>
              <li>{t("qr.note_amount")}</li>
              <li>{t("qr.note_processing")}</li>
            </ul>
          </div>

          {/* Order summary */}
          <div className="border-t border-gray-100 pt-4 space-y-2 body-1 text-gray-700">
            <p className="label-1 text-gray-500">{t("order_summary") || "Mã đơn hàng"}</p>
            <p className="title-2 font-mono text-primary">{orderData.order_code}</p>
            <div className="flex justify-between pt-2 headline-2 text-primary">
              <span>{t("total") || "Tổng thanh toán"}</span>
              <span className="text-secondary">{formatPrice(amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
