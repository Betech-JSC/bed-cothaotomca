"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { formatPrice, isDefaultVariant } from "@/lib/format";
import {
  calcOrderTotal,
  calculateShippingFee,
  createOrder,
  OrderApiError,
  validateVoucher,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
} from "@/services/orderService";
import PaymentQRScreen from "./PaymentQRScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import MobileCartFlow from "../Header/MobileCartFlow";
import { checkOperatingHours } from "@/lib/operatingHours";

export interface CheckoutOrderItem {
  productId: number;
  productCode: string;
  slug: string;
  categorySlug: string;
  title: string;
  imageUrl: string;
  variant: string;
  unitPrice: number;
}

interface CheckoutFormProps {
  order: CheckoutOrderItem | null;
  config: CheckoutConfig;
}

// Popular districts in HN & HCMC for optimized address dropdown
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

export default function CheckoutForm({ order, config }: CheckoutFormProps) {
  const { user } = useAuth();
  const t = useTranslations("checkout");
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, clearCart, addToCart } = useCart();
  const isCartCheckout = !order;

  // Sync direct single-product checkout to cart on mobile
  useEffect(() => {
    if (order) {
      const alreadyInCart = cartItems.some(
        (item) => item.productId === order.productId && item.variant === order.variant
      );
      if (!alreadyInCart) {
        addToCart({
          id: `${order.slug}-${order.variant}`,
          productId: order.productId,
          productCode: order.productCode,
          slug: order.slug,
          categorySlug: order.categorySlug,
          title: order.title,
          imageUrl: order.imageUrl,
          variant: order.variant,
          unitPrice: order.unitPrice,
        }, 1);
      }
    }
  }, [order, addToCart, cartItems]);

  // Log branches list in browser F12 developer console for easy verification
  useMemo(() => {
    console.log("👉 [CheckoutForm] Branches list loaded in browser:", config.branches);
  }, [config.branches]);

  const defaultShippingFee = parseFloat(config.default_shipping_fee) || 50000;

  const [quantity, setQuantity] = useState(1);

  // Delivery option state
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");

  // Contact info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // COD/Transfer selection (CARD removed)
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "TRANSFER">("COD");

  // Regional Shipping & Freeship calculation states
  const [selectedProvince, setSelectedProvince] = useState("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  const [shippingFee, setShippingFee] = useState<number>(defaultShippingFee);
  const [originalFee, setOriginalFee] = useState<number>(defaultShippingFee);
  const [isFreeship, setIsFreeship] = useState<boolean>(false);
  const [freeshipReason, setFreeshipReason] = useState<string | null>(null);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);
  const [assignedBranchName, setAssignedBranchName] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; code: string; value: number; campaignId: number; prereqPrice?: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(false);

  // Operating hours check (10:00 - 23:00)
  const operatingStatus = useMemo(() => {
    return checkOperatingHours(config?.operating_hours);
  }, [config?.operating_hours]);

  const lineItems = useMemo(() => {
    if (isCartCheckout) {
      return cartItems.map(item => ({ price: item.unitPrice, quantity: item.quantity, discount: 0 }));
    }
    if (order) {
      return [{ price: order.unitPrice, quantity, discount: 0 }];
    }
    return [];
  }, [isCartCheckout, cartItems, order, quantity]);

  const { subtotal, shipping } = calcOrderTotal(
    lineItems,
    deliveryType,
    shippingFee,
    0,
  );

  // Trigger real-time calculation when address, subtotal or voucher changes
  useEffect(() => {
    if (deliveryType !== "delivery") {
      setShippingFee(0);
      setIsFreeship(false);
      setIsDeliverable(true);
      return;
    }

    let isSubscribed = true;
    setCalculatingShipping(true);

    calculateShippingFee({
      province: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard,
      subtotal,
      voucher_code: appliedVoucher?.code,
    })
      .then((res) => {
        if (!isSubscribed) return;
        setShippingFee(res.shipping_fee);
        setOriginalFee(res.original_fee);
        setIsFreeship(res.is_freeship);
        setFreeshipReason(res.freeship_reason || null);
        setIsDeliverable(res.is_deliverable);
        setShippingMessage(res.message || null);
        if (res.branch_id) {
          setSelectedBranchId(res.branch_id);
        }
        if (res.branch_name) {
          setAssignedBranchName(res.branch_name);
        } else {
          setAssignedBranchName(null);
        }
      })
      .catch((err) => {
        console.error("Error calculating shipping:", err);
      })
      .finally(() => {
        if (isSubscribed) setCalculatingShipping(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [deliveryType, selectedProvince, selectedDistrict, selectedWard, subtotal, appliedVoucher]);

  // Store Pickup input
  const [selectedBranchId, setSelectedBranchId] = useState<number>(() => {
    return config.branches?.[0]?.id || 1;
  });

  // Expected delivery time
  const [deliverySchedule, setDeliverySchedule] = useState<"now" | "schedule">("now");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  const [itemNote] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sau khi tạo đơn thành công → chuyển sang màn hình QR
  const [pendingOrder, setPendingOrder] = useState<OrderInitiated | null>(null);

  // Auto-remove voucher if cart subtotal drops below the minimum required price
  useEffect(() => {
    if (appliedVoucher && appliedVoucher.prereqPrice && subtotal < appliedVoucher.prereqPrice) {
      setAppliedVoucher(null);
      setVoucherSuccess(null);
      setVoucherError(
        `Mã giảm giá đã bị gỡ do đơn hàng hiện tại chưa đủ ${appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ.`
      );
    }
  }, [subtotal, appliedVoucher]);

  const voucherDiscount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.code.includes("PCT")) {
      return Math.round(subtotal * (appliedVoucher.value / 100));
    }
    if (appliedVoucher.code.includes("SHIP") || appliedVoucher.code.includes("FREE")) {
      return shipping;
    }
    if (appliedVoucher.code.startsWith("EVOUCHER") || appliedVoucher.code.startsWith("EVO")) {
      return Math.min(appliedVoucher.value, subtotal + shipping);
    }
    return appliedVoucher.value;
  }, [appliedVoucher, subtotal, shipping]);

  const total = Math.max(0, subtotal - voucherDiscount + shipping);

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
      const res = await validateVoucher(voucherCode.trim(), subtotal);
      if (res.valid && res.voucher) {
        setAppliedVoucher({
          id: res.voucher.id,
          code: res.voucher.code,
          value: res.voucher.value,
          campaignId: res.voucher.campaign_id,
          prereqPrice: res.voucher.prereq_price,
        });
        setVoucherSuccess(res.message);
      } else {
        setVoucherError(res.message);
        setAppliedVoucher(null);
      }
    } catch (err) {
      setVoucherError("Không thể xác thực mã giảm giá.");
      setAppliedVoucher(null);
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

  // Address concatenation
  const finalAddress = useMemo(() => {
    if (deliveryType === "pickup") {
      const branch = config.branches?.find((b) => b.id === selectedBranchId);
      return branch
        ? `Nhận tại chi nhánh: ${branch.branchName} - Địa chỉ: ${branch.address}`
        : "Nhận tại chi nhánh Cô Thảo";
    }
    const parts = [
      streetAddress.trim(),
      selectedWard.trim(),
      selectedDistrict.trim(),
      selectedProvince.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  }, [deliveryType, selectedBranchId, streetAddress, selectedWard, selectedDistrict, selectedProvince, config.branches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const opCheck = checkOperatingHours(config?.operating_hours);
    if (!opCheck.isStoreOpen) {
      setError(opCheck.message || "Vui lòng quay trở lại đặt sau vì chưa đến giờ!");
      setLoading(false);
      return;
    }

    if (isCartCheckout && cartItems.length === 0) {
      setError("Giỏ hàng của bạn đang trống.");
      setLoading(false);
      return;
    }

    // Validate custom delivery inputs
    if (deliveryType === "delivery") {
      const errs: Record<string, string> = {};
      if (!streetAddress.trim()) {
        errs["delivery.address"] = "Vui lòng nhập số nhà và tên đường.";
      }
      if (!selectedDistrict) {
        errs["delivery.district"] = "Vui lòng chọn Quận/Huyện giao hàng.";
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setError("Vui lòng hoàn thành đầy đủ thông tin giao hàng.");
        setLoading(false);
        return;
      }
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${isCartCheckout ? "cart" : order?.productId}`;

    let expectedDeliveryISO: string | undefined = undefined;
    if (deliverySchedule === "schedule" && expectedDelivery) {
      const matches = expectedDelivery.match(/^(\d{1,2}):(\d{2})/);
      if (matches) {
        const hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        expectedDeliveryISO = date.toISOString();
      } else {
        try {
          expectedDeliveryISO = new Date(expectedDelivery).toISOString();
        } catch (e) {
          expectedDeliveryISO = undefined;
        }
      }
    }

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
              price: shippingFee,
              expected_delivery: expectedDeliveryISO,
            }
            : (deliverySchedule === "schedule" && expectedDelivery
              ? {
                expected_delivery: expectedDeliveryISO
              }
              : null),
        items: isCartCheckout
          ? cartItems.map((item) => ({
            product_id: item.productId,
            product_code: item.productCode,
            product_name: item.title,
            quantity: item.quantity,
            price: item.unitPrice,
            discount: 0,
            note: undefined,
          }))
          : order
            ? [
              {
                product_id: order.productId,
                product_code: order.productCode,
                product_name: order.title,
                quantity,
                price: order.unitPrice,
                discount: 0,
                note: itemNote.trim() || undefined,
              },
            ]
            : [],
        discount: voucherDiscount,
        description: isCartCheckout
          ? [
            description.trim(),
            cartItems.map((item) => `${item.title} (${item.variant}) x${item.quantity}`).join(", "),
          ]
            .filter(Boolean)
            .join(" | ") || undefined
          : order
            ? [
              description.trim(),
              order.variant !== order.title ? `Size: ${order.variant}` : "",
            ]
              .filter(Boolean)
              .join(" | ") || undefined
            : undefined,
        is_apply_voucher: !!appliedVoucher,
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
        voucher: appliedVoucher
          ? {
            voucher_id: appliedVoucher.id,
            campaign_id: appliedVoucher.campaignId,
            amount: appliedVoucher.value,
          }
          : null,
        payment_method: paymentMethod, // CASH (COD) or TRANSFER (SePay)
        branch_id: selectedBranchId,
      });

      if (isCartCheckout) {
        clearCart();
      }

      if (paymentMethod === "COD") {
        // COD order is immediately synced. Go directly to success screen!
        router.push({
          pathname: "/order-success",
          query: { code: result.data.order_code, phone: phone.trim() },
        });
      } else {
        // Bank transfer: Show SePay QR Code Screen
        setPendingOrder(result.data);
      }
    } catch (err: unknown) {
      if (err instanceof OrderApiError) {
        setError(err.message);
        if (err.errors) {
          const mapped: Record<string, string> = {};
          Object.entries(err.errors).forEach(([key, msgs]) => {
            if (msgs[0]) mapped[key] = msgs[0];
          });
          setFieldErrors(mapped);
        }
      } else {
        setError(err instanceof Error ? err.message : t("submit_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) => fieldErrors[key];

  // Selected branch details for pickup preview
  const selectedBranch = useMemo(() => {
    return config.branches?.find((b) => b.id === selectedBranchId);
  }, [config.branches, selectedBranchId]);

  // ── Màn hình QR (Chỉ dành cho Chuyển khoản ngân hàng) ─────────────────────
  if (pendingOrder) {
    return (
      <PaymentQRScreen
        orderData={pendingOrder}
        phone={phone.trim()}
        onCancel={() => setPendingOrder(null)}
      />
    );
  }

  // ── Form checkout ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile step-by-step cart & checkout flow */}
      <div className="xl:hidden">
        <MobileCartFlow inline />
      </div>

      {/* Desktop side-by-side checkout layout */}
      <div className="hidden xl:grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">

        {/* CỘT TRÁI: THÔNG TIN LIÊN HỆ & GIAO HÀNG */}
        <div className="lg:col-span-7 font-serif">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[24px] p-6 md:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100"
          >
            {/* Banner Khung giờ mở cửa nhận đơn */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
              operatingStatus.isStoreOpen
                ? "bg-blue-50/80 border-blue-200 text-blue-900"
                : "bg-amber-50 border-amber-300 text-amber-900"
            }`}>
              <span className="text-xl leading-none mt-0.5">🕒</span>
              <div className="text-sm space-y-1 font-serif">
                <div className="font-bold text-base">Khung giờ mở cửa nhận đơn: 10:00 - 23:00 hàng ngày</div>
                {!operatingStatus.isStoreOpen ? (
                  <div className="font-semibold text-amber-800">
                    ⚠️ {operatingStatus.message || "Vui lòng quay trở lại đặt sau vì chưa đến giờ mở cửa (10:00 - 23:00)!"}
                  </div>
                ) : (
                  <div className="text-blue-700 font-medium">Quán đang trong giờ phục vụ nhận đơn hàng.</div>
                )}
              </div>
            </div>

            <h2 className="title-1 text-primary border-b border-gray-100 pb-3">
              Thông tin liên hệ
            </h2>

            {/* Họ và tên */}
            <div className="space-y-2">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Họ và tên</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base font-serif font-normal leading-[150%] tracking-[0%]"
                placeholder="Họ và tên"
              />
              {fieldError("customer.name") ? (
                <p className="text-sm text-red-600 mt-1">{fieldError("customer.name")}</p>
              ) : null}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-2">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Số điện thoại</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base font-serif font-normal leading-[150%] tracking-[0%]"
                placeholder="Số điện thoại"
              />
              {fieldError("customer.phone") ? (
                <p className="text-sm text-red-600 mt-1">{fieldError("customer.phone")}</p>
              ) : null}
            </div>

            {/* Email (Optional) */}
            <div className="space-y-2">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Email (Không bắt buộc)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base font-serif font-normal leading-[150%] tracking-[0%]"
                placeholder="Email"
              />
            </div>

            {/* LOẠI GIAO NHẬN (Giao hàng / Tự đến lấy) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="body-1 text-primary font-bold block">
                Hình thức nhận hàng
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="delivery_type"
                    checked={deliveryType === "delivery"}
                    onChange={() => setDeliveryType("delivery")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors font-bold">
                    Giao hàng tận nơi
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="delivery_type"
                    checked={deliveryType === "pickup"}
                    onChange={() => setDeliveryType("pickup")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors font-bold">
                    Tự đến lấy tại chi nhánh
                  </span>
                </label>
              </div>
            </div>

            {/* HIỂN THỊ ĐỊA CHỈ NHẬN HÀNG TỐI ƯU HÓA CHO DELIVERY */}
            {deliveryType === "delivery" && (
              <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 animate-fade-in">
                <p className="body-1 text-gray-700 font-bold">Địa chỉ giao hàng tận nơi</p>

                {/* Chọn Tỉnh/Thành & Quận/Huyện */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-serif font-semibold text-primary block">Tỉnh / Thành phố *</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        setSelectedProvince(e.target.value);
                        setSelectedDistrict("");
                        setSelectedWard("");
                      }}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] px-[14px] bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-serif cursor-pointer"
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Khác">Tỉnh / Thành khác</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-serif font-semibold text-primary block">Quận / Huyện *</label>
                    <input
                      type="text"
                      required
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] px-[14px] bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-serif"
                      placeholder="VD: Quận 3, Quận 1, Cầu Giấy..."
                    />
                    {fieldError("delivery.district") ? (
                      <p className="text-sm text-red-600 mt-1">{fieldError("delivery.district")}</p>
                    ) : null}
                  </div>
                </div>

                {/* Phường / Xã & Số nhà */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-serif font-semibold text-primary block">Phường / Xã</label>
                    <input
                      type="text"
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] px-[14px] bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-serif"
                      placeholder="VD: Phường 14, Phường Bến Nghé..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-serif font-semibold text-primary block">Số nhà, tên đường *</label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] px-[14px] bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-serif"
                      placeholder="VD: Số 73 Rạch Bùng Binh"
                    />
                    {fieldError("delivery.address") ? (
                      <p className="text-sm text-red-600 mt-1">{fieldError("delivery.address")}</p>
                    ) : null}
                  </div>
                </div>

                {/* Thông báo chi nhánh tự động được chọn & thông tin ship */}
                {assignedBranchName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900 font-medium flex items-center gap-2">
                    <span>📍</span>
                    <span>Hệ thống tự động xác định giao từ chi nhánh: <strong>{assignedBranchName}</strong></span>
                  </div>
                )}

                {/* Warning nếu khu vực chưa được cấu hình và bị chặn */}
                {!isDeliverable && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700 font-semibold space-y-1">
                    <p className="flex items-center gap-1.5 text-red-800">
                      <span>⚠️</span>
                      <span>Khu vực này hiện chưa hỗ trợ giao hàng tận nơi.</span>
                    </p>
                    <p className="text-xs text-red-600 font-normal">
                      Vui lòng chọn hình thức <strong>"Tự đến lấy tại chi nhánh"</strong> hoặc liên hệ Hotline để được hỗ trợ.
                    </p>
                  </div>
                )}

                {/* Thẻ thông báo phí tiêu chuẩn */}
                {isDeliverable && shippingMessage && !isFreeship && (
                  <div className="text-xs text-gray-500 font-medium italic px-1">
                    ℹ️ {shippingMessage}
                  </div>
                )}
              </div>
            )}

            {/* HIỂN THỊ CHỌN CHI NHÁNH DỰA TRÊN API KIOTVIET CHO PICKUP */}
            {deliveryType === "pickup" && (
              <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 animate-fade-in">
                <p className="body-1 text-gray-700 font-bold">Chi nhánh nhận hàng</p>

                <div className="space-y-2">
                  <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Chọn chi nhánh gần bạn nhất</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                    className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base cursor-pointer font-semibold font-serif font-normal leading-[150%] tracking-[0%]"
                  >
                    {config.branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branchName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chi tiết chi nhánh đã chọn */}
                {selectedBranch && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 shadow-sm text-sm">
                    <p className="body-1 text-primary font-bold">
                      📍 Địa chỉ nhận hàng:
                    </p>
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {selectedBranch.address}
                    </p>
                    {selectedBranch.contactNumber && (
                      <p className="text-gray-500 font-semibold">
                        📞 Hotline: <span className="text-primary font-bold">{selectedBranch.contactNumber}</span>
                      </p>
                    )}
                    <div className="text-[14px] text-green-600 font-bold flex items-center gap-1 pt-1.5 border-t border-gray-100">
                      <span className="inline-block size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      <span>Tự đến lấy giúp tiết kiệm phí vận chuyển (Miễn phí ship)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lời nhắn */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Lời nhắn cho Bếp</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base resize-none font-serif font-normal leading-[150%] tracking-[0%]"
                placeholder="Lời nhắn cho Bếp Cô Thảo"
              />
            </div>

            {/* Thời gian giao/nhận mong muốn */}
            <div className="space-y-2 pt-2">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                {deliveryType === "pickup" ? "Thời gian đến lấy hàng mong muốn" : "Thời gian giao hàng mong muốn"}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="delivery_schedule"
                    checked={deliverySchedule === "now"}
                    onChange={() => setDeliverySchedule("now")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors">
                    {deliveryType === "pickup" ? "Lấy ngay (Chuẩn bị 15 - 30 phút)" : "Giao ngay (Hỏa tốc 45 - 90 phút)"}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="delivery_schedule"
                    checked={deliverySchedule === "schedule"}
                    onChange={() => setDeliverySchedule("schedule")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors">
                    {deliveryType === "pickup" ? "Hẹn giờ đến lấy" : "Hẹn giờ giao"}
                  </span>
                </label>
              </div>

              {/* Ô chọn giờ nếu Hẹn giờ được tích */}
              {deliverySchedule === "schedule" && (
                <div className="pt-2 animate-fade-in">
                  <input
                    type="time"
                    required
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        // ignore
                      }
                    }}
                    className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base font-serif font-normal leading-[150%] tracking-[0%]"
                  />
                </div>
              )}
            </div>

            {/* Hình thức thanh toán */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                Hình thức thanh toán:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors">
                    Thanh toán khi nhận hàng (COD)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="payment_method"
                    checked={paymentMethod === "TRANSFER"}
                    onChange={() => setPaymentMethod("TRANSFER")}
                    className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="body-1 text-gray-900 group-hover:text-primary transition-colors">
                    Chuyển khoản ngân hàng (Qua mã QR)
                  </span>
                </label>

              </div>
            </div>

            {error ? <p className="body-1 text-red-600 font-semibold pt-2">{error}</p> : null}
          </form>
        </div>

        {/* CỘT PHẢI: THÔNG TIN ĐƠN HÀNG */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[24px] p-6 md:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
            <h2 className="title-1 font-display text-primary border-b border-gray-100 pb-3">
              Thông tin đơn hàng
            </h2>

            {/* Hộp danh sách sản phẩm */}
            <div className="space-y-4 divide-y divide-gray-100">
              {isCartCheckout ? (
                cartItems.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="body-1 text-gray-500 font-medium">Giỏ hàng của bạn đang trống</p>
                    <Link
                      href="/product"
                      className="inline-block text-sm font-semibold text-secondary hover:underline"
                    >
                      Tiếp tục mua sắm
                    </Link>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-start py-3 first:pt-0 last:pb-0">
                      {/* Ảnh */}
                      <div className="relative size-20 flex-shrink-0 rounded-[12px] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Thông tin ở giữa */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <p className="title-3 font-display text-primary font-bold whitespace-pre-line">
                            {item.title}
                          </p>
                          <p className="title-3 text-secondary font-bold shrink-0">
                            {formatPrice(item.unitPrice)}
                          </p>
                        </div>

                        {!isDefaultVariant(item.variant) && (
                          <p className="body-2 text-gray-500 font-medium">
                            Size: {item.variant}
                          </p>
                        )}

                        {/* Dòng điều khiển: Số lượng & Xóa */}
                        <div className="flex items-center justify-between pt-1">
                          {/* Tăng giảm số lượng kiểu Pill */}
                          <div className="flex items-center border border-gray-200 rounded-full px-2 py-1 bg-white">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm disabled:opacity-30 cursor-pointer flex justify-center"
                              disabled={item.quantity <= 1}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              −
                            </button>
                            <span className="w-10 text-center body-1 text-primary font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm cursor-pointer flex justify-center"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>

                          {/* Nút Xóa */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm font-semibold cursor-pointer"
                          >
                            <span>🗑</span>
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : order ? (
                <div className="flex gap-4 items-start py-1">
                  {/* Ảnh */}
                  <div className="relative size-20 flex-shrink-0 rounded-[12px] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                    <Image
                      src={order.imageUrl}
                      alt={order.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Thông tin ở giữa */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <p className="title-3 font-display text-primary font-bold whitespace-pre-line">
                        {order.title}
                      </p>
                      <p className="title-3 text-secondary font-bold shrink-0">
                        {formatPrice(order.unitPrice)}
                      </p>
                    </div>

                    {!isDefaultVariant(order.variant) && (
                      <p className="body-2 text-gray-500 font-medium">
                        Size: {order.variant}
                      </p>
                    )}

                    {/* Dòng điều khiển: Số lượng & Xóa */}
                    <div className="flex items-center justify-between pt-1">
                      {/* Tăng giảm số lượng kiểu Pill */}
                      <div className="flex items-center border border-gray-200 rounded-full px-2 py-1 bg-white">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm disabled:opacity-30 cursor-pointer flex justify-center"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={quantity === 0 ? "" : quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            if (val === "") {
                              setQuantity(0);
                            } else {
                              const parsed = parseInt(val, 10);
                              setQuantity(parsed);
                            }
                          }}
                          onBlur={() => {
                            if (quantity < 1) {
                              setQuantity(1);
                            }
                          }}
                          className="w-10 text-center body-1 text-primary font-bold focus:outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm cursor-pointer flex justify-center"
                          onClick={() => setQuantity((q) => q + 1)}
                        >
                          +
                        </button>
                      </div>

                      {/* Nút Xóa */}
                      <button
                        type="button"
                        onClick={() => setQuantity(1)}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm font-semibold cursor-pointer"
                      >
                        <span>🗑</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Hộp nhập mã giảm giá */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <label className="body-1 font-display text-primary font-bold block">
                Voucher
              </label>
              <div className="flex items-center border border-gray-200 rounded-full p-1 bg-white focus-within:border-primary transition-all">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={!!appliedVoucher || validatingVoucher}
                  className="flex-1 bg-transparent px-4 py-2 text-gray-900 focus:outline-none text-base uppercase placeholder-gray-400"
                  placeholder="Mã Voucher"
                />
                {appliedVoucher ? (
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-6 py-2.5 rounded-full text-base transition-all shrink-0"
                  >
                    Xóa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={validatingVoucher || !voucherCode.trim()}
                    className="bg-[#142A68] hover:bg-[#142A68]/95 text-white font-bold px-6 py-2.5 rounded-full text-base transition-all disabled:opacity-40 shrink-0"
                  >
                    {validatingVoucher ? "Đang check..." : "Áp dụng"}
                  </button>
                )}
              </div>
              {voucherError && (
                <p className="text-sm text-red-600 font-semibold px-2">{voucherError}</p>
              )}
              {voucherSuccess && (
                <div className="text-sm text-green-600 font-semibold px-2">
                  <p className="flex items-center gap-1">
                    <span>✓</span> <span>{voucherSuccess}</span>
                  </p>
                  {appliedVoucher?.prereqPrice ? (
                    <p className="text-xs text-gray-500 font-normal mt-0.5">
                      * Áp dụng cho đơn hàng từ {appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ trở lên.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Hộp tính giá (Blue-Gray rounded container) */}
            <div className="bg-gray-100 rounded-[12px] p-4 space-y-2.5">
              <div className="flex justify-between items-center text-base font-medium">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <span>Vận chuyển</span>
                  {calculatingShipping && (
                    <span className="text-xs text-gray-400 animate-pulse">(Đang tính...)</span>
                  )}
                </span>
                <div className="text-right">
                  {deliveryType === "pickup" ? (
                    <span className="title-3 font-display text-green-600 font-bold">0đ (Tự đến lấy)</span>
                  ) : isFreeship ? (
                    <div className="flex flex-col items-end">
                      <span className="title-3 font-display text-green-600 font-bold flex items-center gap-1">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          ✓ Miễn phí vận chuyển
                        </span>
                        <span>0đ</span>
                      </span>
                      {originalFee > 0 && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(originalFee)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="title-3 font-display text-primary font-bold">
                      {formatPrice(shipping)}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông báo lý do Freeship */}
              {deliveryType === "delivery" && isFreeship && freeshipReason && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 font-medium flex items-center gap-1">
                  <span>🎉</span>
                  <span>{freeshipReason}</span>
                </div>
              )}

              {appliedVoucher && (
                <div className="flex justify-between items-center text-base font-medium text-green-600 border-t border-gray-200/50 pt-2">
                  <span>Giảm giá (Voucher)</span>
                  <span className="title-3 font-display font-bold">
                    -{formatPrice(voucherDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-gray-200/50 pt-2.5">
                <span className="text-gray-900 font-bold text-base">Tổng cộng</span>
                <span className="text-[20px] font-display text-primary font-bold">
                  {formatPrice(total)}
                </span>
              </div>

              {user && total > 0 && (
                <div className="text-[14px] text-green-600 font-semibold text-right flex items-center justify-end gap-1 pt-1.5 border-t border-dashed border-gray-200/80">
                  <svg className="h-3.5 w-3.5 overflow-visible" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>Đơn hàng này sẽ tích lũy thêm ~{Math.floor(total / 100000)} điểm!</span>
                </div>
              )}
            </div>

            {/* Confirm details check checkbox */}
            <div className="py-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-gray-700 select-none">
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

            {/* Nút submit dạng Pill đỏ cam (Terracotta red) */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (isCartCheckout && cartItems.length === 0) || !confirmInfo || (deliveryType === "delivery" && !isDeliverable) || !operatingStatus.isStoreOpen}
              className="w-full bg-secondary hover:bg-secondary/95 active:scale-[0.98] text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-60 disabled:scale-100 disabled:pointer-events-none"
            >
              {loading
                ? "Đang xử lý..."
                : !operatingStatus.isStoreOpen
                ? "Vui lòng quay lại đặt sau (10h-23h)"
                : deliveryType === "delivery" && !isDeliverable
                ? "Khu vực chưa hỗ trợ giao"
                : "Thanh toán"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
