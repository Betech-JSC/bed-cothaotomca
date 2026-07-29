"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, isDefaultVariant } from "@/lib/format";
import { useBranches } from "@/contexts/BranchContext";
import {
  calcOrderTotal,
  createOrder,
  getCheckoutConfig,
  validateVoucher,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
  OrderApiError,
} from "@/services/orderService";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import { useAuth } from "@/contexts/AuthContext";
import Chevron from "../Icons/Chevron";

const POPULAR_DISTRICTS = [
  // Hà Nội
  { group: "Hà Nội", value: "Quận Cầu Giấy, Hà Nội" },
  { group: "Hà Nội", value: "Quận Đống Đa, Hà Nội" },
  { group: "Hà Nội", value: "Quận Ba Đình, Hà Nội" },
  { group: "Hà Nội", value: "Quận Hoàn Kiếm, Hà Nội" },
  { group: "Hà Nội", value: "Quận Hai Bà Trưng, Hà Nội" },
  { group: "Hà Nội", value: "Quận Thanh Xuân, Hà Nội" },
  { group: "Hà Nội", value: "Quận Nam Từ Liêm, Hà Nội" },
  { group: "Hà Nội", value: "Quận Bắc Từ Liêm, Hà Nội" },
  { group: "Hà Nội", value: "Quận Tây Hồ, Hà Nội" },

  // TP. Hồ Chí Minh
  { group: "TP. Hồ Chí Minh", value: "Quận 1, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận 3, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận 5, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận 7, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận 10, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận Bình Thạnh, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "Quận Phú Nhuận, TP. Hồ Chí Minh" },
  { group: "TP. Hồ Chí Minh", value: "TP. Thủ Đức, TP. Hồ Chí Minh" },
];

export default function MobileCartFlow({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const { cartItems, updateQuantity, removeFromCart, clearCart, isCartOpen } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("checkout");

  const [step, setStep] = useState<1 | 2>(inline ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Checkout Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1);
  const [deliverySchedule, setDeliverySchedule] = useState<"now" | "schedule">("now");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "TRANSFER">("COD");
  const [description, setDescription] = useState("");
  const [confirmInfo, setConfirmInfo] = useState(true);

  // Config
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const branches = useBranches();

  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; code: string; value: number; campaignId: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Pending order (bank transfer QR)
  const [pendingOrder, setPendingOrder] = useState<OrderInitiated | null>(null);

  // Accordion summary expanded
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Sync user details when loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Load checkout config
  useEffect(() => {
    getCheckoutConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.branches && cfg.branches.length > 0) {
          setSelectedBranchId(cfg.branches[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load checkout config", err);
        setConfig({
          delivery_types: [
            { value: "delivery", label: "Giao hàng" },
            { value: "pickup", label: "Tự đến lấy" },
          ],
          default_shipping_fee: "30000",
          branches: branches && branches.length > 0
            ? branches.map(b => ({
              id: b.id,
              branchName: b.title,
              address: b.address,
              contactNumber: b.phone || "",
              isActive: true
            }))
            : [
              {
                id: 1,
                branchName: "Bếp Cô Thảo - Cầu Giấy",
                address: "Số 12 Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội",
                contactNumber: "024.9999.7122",
                isActive: true,
              }
            ]
        });
      });
  }, [branches]);

  // Calculate totals
  const lineItems = useMemo(() => {
    return cartItems.map(item => ({ price: item.unitPrice, quantity: item.quantity, discount: 0 }));
  }, [cartItems]);

  const defaultShippingFee = parseFloat(config?.default_shipping_fee || "30000") || 30000;
  const shippingFee = deliveryType === "delivery" ? defaultShippingFee : 0;

  const { subtotal, shipping } = calcOrderTotal(
    lineItems,
    deliveryType,
    shippingFee,
    0
  );

  const voucherDiscount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.code.includes("PCT")) {
      return Math.round(subtotal * (appliedVoucher.value / 100));
    }
    if (appliedVoucher.code.includes("SHIP") || appliedVoucher.code.includes("FREE")) {
      return shipping;
    }
    return appliedVoucher.value;
  }, [appliedVoucher, subtotal, shipping]);

  const total = Math.max(0, subtotal - voucherDiscount + shipping);

  // Apply Voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Vui lòng nhập mã giảm giá.");
      setVoucherSuccess(null);
      return;
    }

    setValidatingVoucher(true);
    setVoucherError(null);
    setVoucherSuccess(null);

    try {
      const result = await validateVoucher(voucherCode.trim());
      if (result.valid && result.voucher) {
        setAppliedVoucher({
          id: result.voucher.id,
          code: result.voucher.code,
          value: result.voucher.value,
          campaignId: result.voucher.campaign_id,
        });
        setVoucherSuccess(result.message || "Áp dụng mã giảm giá thành công.");
      } else {
        setVoucherError(result.message || "Mã giảm giá không hợp lệ.");
      }
    } catch (err) {
      setVoucherError("Lỗi kiểm tra mã giảm giá.");
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherSuccess(null);
    setVoucherError(null);
  };

  // Submit Order
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});

    if (cartItems.length === 0) {
      setError("Giỏ hàng của bạn đang trống.");
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setFieldErrors(prev => ({ ...prev, name: "Vui lòng nhập họ và tên." }));
      setLoading(false);
      return;
    }

    if (!phone.trim()) {
      setFieldErrors(prev => ({ ...prev, phone: "Vui lòng nhập số điện thoại." }));
      setLoading(false);
      return;
    }

    if (deliveryType === "delivery") {
      if (!streetAddress.trim()) {
        setFieldErrors(prev => ({ ...prev, address: "Vui lòng nhập địa chỉ chi tiết." }));
        setLoading(false);
        return;
      }
      if (!selectedDistrict) {
        setFieldErrors(prev => ({ ...prev, district: "Vui lòng chọn Quận/Huyện." }));
        setLoading(false);
        return;
      }
    }

    if (!confirmInfo) {
      setError("Vui lòng xác nhận thông tin giao hàng chính xác.");
      setLoading(false);
      return;
    }

    const finalAddress =
      deliveryType === "delivery"
        ? `${streetAddress.trim()}${selectedDistrict ? `, ${selectedDistrict}` : ""}`
        : config?.branches.find(b => b.id === selectedBranchId)?.address || "";

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-mobile-cart`;

    try {
      const result = await createOrder({
        idempotency_key: idempotencyKey,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        },
        delivery_type: deliveryType,
        delivery:
          deliveryType === "delivery"
            ? {
              receiver: name.trim(),
              contact_number: phone.trim(),
              address: finalAddress,
              price: shipping,
              expected_delivery:
                deliverySchedule === "schedule" && expectedDelivery
                  ? new Date(expectedDelivery).toISOString()
                  : undefined,
            }
            : null,
        items: cartItems.map((item) => ({
          product_id: item.productId,
          product_code: item.productCode,
          product_name: item.title,
          quantity: item.quantity,
          price: item.unitPrice,
          discount: 0,
        })),
        discount: voucherDiscount,
        description: cartItems.map((item) => `${item.title} (${item.variant}) x${item.quantity}`).join(", ") || undefined,
        is_apply_voucher: !!appliedVoucher,
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
        voucher: appliedVoucher
          ? {
            voucher_id: appliedVoucher.id,
            campaign_id: appliedVoucher.campaignId,
            amount: appliedVoucher.value,
          }
          : null,
        payment_method: paymentMethod,
        branch_id: selectedBranchId,
      });

      clearCart();

      if (paymentMethod === "COD") {
        router.push({
          pathname: "/order-success",
          query: { code: result.data.order_code, phone: phone.trim() },
        });
        onClose?.();
      } else {
        setPendingOrder(result.data);
      }
    } catch (err) {
      if (err instanceof OrderApiError) {
        setError(err.message);
      } else {
        setError("Đặt hàng thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!inline && !isCartOpen) return null;

  // Render SePay QR screen if order is pending bank transfer
  if (pendingOrder) {
    return (
      <div className={inline ? "w-full p-4 flex flex-col justify-start" : "fixed inset-0 bg-[#F1EEDF] z-[160] overflow-y-auto p-4 flex flex-col justify-start"}>
        <div className="max-w-md mx-auto w-full py-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <h2 className="title-1 font-display text-primary font-bold">Thanh toán</h2>
            {!inline && (
              <button
                onClick={() => {
                  setPendingOrder(null);
                  onClose?.();
                }}
                className="text-gray-400 hover:text-primary transition-colors text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
          <PaymentQRScreen
            orderData={pendingOrder}
            phone={phone}
            onCancel={() => {
              setPendingOrder(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "w-full text-gray-900 select-none" : "fixed inset-0 bg-[#F1EEDF] z-[160] overflow-y-auto p-4 text-gray-900 select-none"}>
      <div className={inline ? "w-full space-y-6" : "max-w-md mx-auto w-full py-4 space-y-6"}>
        {/* Header bar */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-primary hover:text-secondary text-2xl font-bold flex items-center cursor-pointer"
                aria-label="Quay lại"
              >
                &#8592;
              </button>
            )}
            <h2 className="display-3 font-display text-primary font-bold">Đặt hàng</h2>
          </div>
          {!inline && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-primary transition-colors text-2xl font-bold cursor-pointer"
              aria-label="Đóng"
            >
              &times;
            </button>
          )}
        </div>

        {/* Step 1: Review items and voucher */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left duration-200">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-5">
              <h3 className="title-2 font-display text-primary font-bold border-b border-gray-100 pb-2">
                Thông tin đơn hàng
              </h3>

              {cartItems.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <div className="text-5xl">🛒</div>
                  <p className="body-1 text-gray-500 font-medium">Giỏ hàng đang trống</p>
                  <button
                    onClick={onClose}
                    className="inline-block text-sm font-semibold text-secondary hover:underline"
                  >
                    Tiếp tục mua sắm
                  </button>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0 items-start">
                      <div className="relative size-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="title-3 text-primary font-bold font-display line-clamp-1">
                            {item.title}
                          </h4>
                          <span className="title-3 text-primary font-bold whitespace-nowrap">
                            {formatPrice(item.unitPrice)}
                          </span>
                        </div>
                        {!isDefaultVariant(item.variant) && (
                          <p className="text-sm text-gray-500 font-semibold uppercase">
                            Size: {item.variant}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          {/* Quantity selectors */}
                          <div className="flex items-center border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs"
                              disabled={item.quantity <= 1}
                            >
                              &minus;
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-primary">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 font-semibold transition-colors"
                          >
                            🗑 Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <>
                {/* Voucher Code */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3">
                  <label className="body-1 text-primary font-bold block">Voucher</label>
                  <div className="flex items-center rounded-full border border-gray-200 bg-white p-1 pl-4 focus-within:border-primary transition-all">
                    <input
                      type="text"
                      placeholder="Mã Voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      disabled={!!appliedVoucher || validatingVoucher}
                      className="flex-1 bg-transparent text-gray-900 focus:outline-none text-base uppercase placeholder-gray-400"
                    />
                    {appliedVoucher ? (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-full px-6 py-2.5 text-base transition-all"
                      >
                        Xóa
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={validatingVoucher || !voucherCode.trim()}
                        className="bg-[#142A68] hover:bg-[#142A68]/95 text-white font-bold rounded-full px-6 py-2.5 text-base transition-all disabled:opacity-50"
                      >
                        {validatingVoucher ? "..." : "Áp dụng"}
                      </button>
                    )}
                  </div>
                  {voucherError && <p className="text-sm text-red-600 font-semibold mt-1">{voucherError}</p>}
                  {voucherSuccess && <p className="text-sm text-green-600 font-semibold mt-1">{voucherSuccess}</p>}
                </div>

                {/* Summary Panel */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">Tạm tính</span>
                    <span className="text-primary font-bold font-display">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">Phí ship</span>
                    <span className="text-primary font-bold font-display">{formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">Giảm giá</span>
                    <span className="text-primary font-bold font-display">{formatPrice(voucherDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-2 border-t border-gray-100">
                    <span className="text-gray-900 font-bold">Tổng thanh toán</span>
                    <span className="text-secondary font-bold font-display text-lg">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Submit button step 1 */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2"
                >
                  Tiếp tục
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Checkout Form & Collapsible Summary */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-200">
            {/* Collapsible summary panel */}
            <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100">
              <button
                type="button"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="w-full flex justify-between items-center py-1 text-primary font-bold title-2 font-display cursor-pointer"
              >
                <span>Tóm tắt sản phẩm</span>
                <div className={`size-6 flex items-center justify-center transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180 ' : 'text-gray-900'}`}>
                  <Chevron />
                </div>
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out border-t border-gray-100/0 ${
                  isSummaryExpanded
                    ? "grid-rows-[1fr] opacity-100 pt-4 mt-3 border-gray-100"
                    : "grid-rows-[0fr] opacity-0 pt-0 mt-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-4 pt-0.5">
                    <div className="space-y-3 divide-y divide-gray-100">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0 items-start">
                          <div className="relative size-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="body-2 text-primary font-bold font-display line-clamp-1">{item.title}</p>
                              <span className="body-2 text-primary font-bold whitespace-nowrap">{formatPrice(item.unitPrice)}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">
                              {isDefaultVariant(item.variant) ? `Số lượng: ${item.quantity}` : `Size: ${item.variant} x${item.quantity}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tạm tính</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phí ship</span>
                        <span className="font-semibold">{formatPrice(shipping)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Giảm giá</span>
                        <span className="font-semibold">{formatPrice(voucherDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2 text-primary">
                        <span>Tổng thanh toán</span>
                        <span className="text-secondary">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkout contact details */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-6 font-serif">
              <h3 className="title-2 font-display text-primary font-bold border-b border-gray-100 pb-2">
                Thông tin liên hệ
              </h3>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
                {fieldErrors.name && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.name}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
                {fieldErrors.phone && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.phone}</p>}
              </div>

              {/* Email */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
              </div>

              {/* Delivery method toggle button */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Hình thức nhận hàng</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={`py-2 px-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${deliveryType === "delivery"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 bg-white"
                      }`}
                  >
                    Giao tận nơi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={`py-2 px-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${deliveryType === "pickup"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 bg-white"
                      }`}
                  >
                    Tự đến lấy
                  </button>
                </div>
              </div>

              {/* Delivery address details selection */}
              {deliveryType === "delivery" ? (
                <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-100 mt-2">
                  <p className="text-sm text-gray-700 font-bold font-serif">Địa chỉ giao hàng tận nơi</p>

                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Tỉnh/Thành phố</label>
                    <select
                      onChange={(e) => {
                        setSelectedDistrict("");
                      }}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    >
                      <option value="HCM">Hồ Chí Minh</option>
                      <option value="HN">Hà Nội</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Quận/Huyện</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    >
                      <option value="">-- Chọn Quận/Huyện giao hàng --</option>
                      <optgroup label="TP. Hồ Chí Minh">
                        {POPULAR_DISTRICTS.filter((d) => d.group === "TP. Hồ Chí Minh").map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.value}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Hà Nội">
                        {POPULAR_DISTRICTS.filter((d) => d.group === "Hà Nội").map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.value}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {fieldErrors.district && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.district}</p>}
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Số nhà, tên đường, ngõ ngách...</label>
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường, ngõ ngách..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base font-serif font-normal leading-[150%] tracking-[0%]"
                    />
                    {fieldErrors.address && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.address}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-100 mt-2">
                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Chọn chi nhánh lấy hàng</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    >
                      {config?.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {config?.branches.find(b => b.id === selectedBranchId) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-1.5 shadow-sm text-sm text-gray-600 font-serif">
                      <p>📍 Địa chỉ: {config?.branches.find(b => b.id === selectedBranchId)?.address}</p>
                      <p>📞 Hotline: {config?.branches.find(b => b.id === selectedBranchId)?.contactNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Lời nhắn cho Bếp</label>
                <textarea
                  placeholder="Ví dụ: Không cay, ít hành..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base resize-none h-16 font-serif font-normal leading-[150%] tracking-[0%]"
                />
              </div>

              {/* Expected time */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Thời gian giao/nhận mong muốn</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expected_time"
                      checked={deliverySchedule === "now"}
                      onChange={() => setDeliverySchedule("now")}
                      className="accent-primary"
                    />
                    <span>Giao ngay (Hỏa tốc 45 - 90 phút)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="expected_time"
                      checked={deliverySchedule === "schedule"}
                      onChange={() => setDeliverySchedule("schedule")}
                      className="accent-primary"
                    />
                    <span>Hẹn giờ giao</span>
                  </label>
                  {deliverySchedule === "schedule" && (
                    <input
                      type="datetime-local"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    />
                  )}
                </div>
              </div>

              {/* Payment methods selection */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Hình thức thanh toán</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="accent-primary"
                    />
                    <span>Thanh toán khi nhận hàng (COD)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "TRANSFER"}
                      onChange={() => setPaymentMethod("TRANSFER")}
                      className="accent-primary"
                    />
                    <span>Chuyển khoản ngân hàng</span>
                  </label>
                </div>
              </div>

              {/* Confirm details check checkbox */}
              <div className="pt-2.5 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-gray-700 select-none font-serif">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={confirmInfo}
                      onChange={(e) => setConfirmInfo(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${confirmInfo
                        ? "bg-[#142A68] border-[#142A68] text-white"
                        : "border-gray-300 bg-white"
                        }`}
                    >
                      {confirmInfo && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="3.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span>Tôi xác nhận thông tin giao hàng trên là chính xác</span>
                </label>
              </div>
            </div>

            {/* Submit checkout button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !confirmInfo}
              className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Thanh toán"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
