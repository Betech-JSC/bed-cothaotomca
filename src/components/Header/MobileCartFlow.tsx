"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, isDefaultVariant, cleanVariantName } from "@/lib/format";
import { useBranches } from "@/contexts/BranchContext";
import {
  calcOrderTotal,
  calculateShippingFee,
  createOrder,
  getAdministrativeUnits,
  getCheckoutConfig,
  getShippingSettings,
  validateVoucher,
  type AdministrativeProvince,
  type AdministrativeWard,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
  type ShippingSettings,
  OrderApiError,
} from "@/services/orderService";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import { getGeneralSettings } from "@/services/generalSettingService";
import { useAuth } from "@/contexts/AuthContext";
import Chevron from "../Icons/Chevron";
import { checkOperatingHours, formatVietnameseDate, generate15MinTimeSlots, toISODateString } from "@/lib/operatingHours";
import PreOrderNoticeModal from "@/components/Checkout/PreOrderNoticeModal";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";

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
  const [adminProvinces, setAdminProvinces] = useState<AdministrativeProvince[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1);
  const [assignedBranchName, setAssignedBranchName] = useState<string | null>(null);

  // Load administrative units catalog
  useEffect(() => {
    getAdministrativeUnits().then((units) => {
      if (units && units.length > 0) {
        setAdminProvinces(units);
      }
    });
  }, []);

  const currentProvinceData = useMemo(() => {
    return adminProvinces.find((p) => p.name === selectedProvince);
  }, [adminProvinces, selectedProvince]);

  const availableWards = useMemo(() => {
    return currentProvinceData?.wards || [];
  }, [currentProvinceData]);
  const [deliverySchedule, setDeliverySchedule] = useState<"now" | "schedule">("now");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<string>("10:00");
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(false);
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

  // Operating hours check (09:00 - 23:00)
  const operatingStatus = useMemo(() => {
    return checkOperatingHours(config?.operating_hours);
  }, [config?.operating_hours]);

  useEffect(() => {
    if (operatingStatus) {
      if (!operatingStatus.canOrderNow) {
        setDeliverySchedule("schedule");
        setShowNoticeModal(!!operatingStatus.notice);
      }
      if (operatingStatus.defaultDate) {
        setDeliveryDate(operatingStatus.defaultDate);
      }
    }
  }, [operatingStatus]);

  const availableDeliveryDates = useMemo(() => {
    const dates: { iso: string; label: string }[] = [];
    const refDate = new Date();
    const startOffset = (!operatingStatus.canOrderNow && (operatingStatus.isAfterCutoff || operatingStatus.isAfterClose)) ? 1 : 0;

    for (let i = startOffset; i < startOffset + 5; i++) {
      const d = new Date(refDate);
      d.setDate(d.getDate() + i);
      const iso = toISODateString(d);
      let label = formatVietnameseDate(d);
      if (i === 0) label = `Hôm nay (${label})`;
      else if (i === 1) label = `Ngày mai (${label})`;
      dates.push({ iso, label });
    }
    return dates;
  }, [operatingStatus]);

  const availableTimeSlots = useMemo(() => {
    const refDate = new Date();
    const todayISO = toISODateString(refDate);

    let filterTime: string | undefined = undefined;
    if (deliveryDate === todayISO) {
      const curH = refDate.getHours();
      const curM = refDate.getMinutes();
      const bufferM = curH * 60 + curM + 120; // 120 min (2 hours) preparation buffer
      const bH = Math.floor(bufferM / 60);
      const bM = bufferM % 60;
      filterTime = `${bH.toString().padStart(2, "0")}:${bM.toString().padStart(2, "0")}`;
    }

    return generate15MinTimeSlots(operatingStatus.deliveryOpen || "10:00", operatingStatus.deliveryClose || "23:00", filterTime);
  }, [deliveryDate, operatingStatus.deliveryOpen, operatingStatus.deliveryClose]);

  useEffect(() => {
    if (availableTimeSlots.length > 0) {
      const exists = availableTimeSlots.some((s) => s.value === expectedDeliveryTime);
      if (!exists) {
        setExpectedDeliveryTime(availableTimeSlots[0].value);
      }
    }
  }, [availableTimeSlots, expectedDeliveryTime]);

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

  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [hotline, setHotline] = useState<string>("028 6686 1508");
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [originalFee, setOriginalFee] = useState<number>(0);
  const [isFreeship, setIsFreeship] = useState<boolean>(false);
  const [freeshipReason, setFreeshipReason] = useState<string | null>(null);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);

  useEffect(() => {
    getShippingSettings().then(setShippingSettings);
    getGeneralSettings()
      .then((settings) => {
        if (settings?.hotline) {
          setHotline(settings.hotline);
        }
      })
      .catch(() => { });
  }, []);

  // Calculate totals
  const lineItems = useMemo(() => {
    return cartItems.map(item => ({ price: item.unitPrice, quantity: item.quantity, discount: 0 }));
  }, [cartItems]);

  const rawSubtotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  }, [lineItems]);

  useEffect(() => {
    if (deliveryType !== "delivery") {
      setCalculatedFee(0);
      setIsFreeship(false);
      setIsDeliverable(true);
      setShippingMessage(null);
      return;
    }

    calculateShippingFee({
      province: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard,
      ward_id: selectedWardId,
      subtotal: rawSubtotal,
      voucher_code: appliedVoucher?.code,
    })
      .then((res) => {
        setCalculatedFee(res.shipping_fee);
        setOriginalFee(res.original_fee);
        setIsFreeship(res.is_freeship);
        setFreeshipReason(res.freeship_reason || null);

        const hasWard = !!selectedWard || !!selectedWardId;
        setIsDeliverable(hasWard ? res.is_deliverable : true);
        setShippingMessage(hasWard ? (res.message || null) : null);

        if (hasWard && res.branch_id) {
          const matchedBranch = config?.branches?.find(
            (b) => b.id === res.branch_id || (res.branch_name && b.branchName === res.branch_name)
          );
          if (matchedBranch) {
            setSelectedBranchId(matchedBranch.id);
          } else {
            setSelectedBranchId(res.branch_id);
          }
        }
        if (hasWard && res.branch_name) {
          setAssignedBranchName(res.branch_name);
        } else {
          setAssignedBranchName(null);
        }
      })
      .catch((err) => {
        console.error("Failed to calculate shipping in mobile cart flow:", err);
      });
  }, [deliveryType, selectedProvince, selectedDistrict, selectedWard, selectedWardId, rawSubtotal, appliedVoucher, config?.branches]);

  const defaultShippingFee = parseFloat(config?.default_shipping_fee || "30000") || 30000;
  const shippingFee = deliveryType === "delivery" ? (isFreeship ? 0 : (calculatedFee || defaultShippingFee)) : 0;

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

    const opCheck = checkOperatingHours(config?.operating_hours);

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
      if (!selectedWard && !selectedWardId) {
        setFieldErrors((prev) => ({ ...prev, ward: "Vui lòng chọn Phường / Xã." }));
        setLoading(false);
        return;
      }
      if (!streetAddress.trim()) {
        setFieldErrors((prev) => ({ ...prev, address: "Vui lòng nhập địa chỉ chi tiết." }));
        setLoading(false);
        return;
      }
      if (!isDeliverable) {
        setError("Khu vực bạn chọn hiện chưa hỗ trợ giao hàng. Vui lòng chọn địa chỉ khác.");
        setLoading(false);
        return;
      }
    }

    if (!confirmInfo) {
      setError("Vui lòng xác nhận thông tin giao hàng chính xác.");
      setLoading(false);
      return;
    }

    let finalAddress = "";
    if (deliveryType === "delivery") {
      const parts = [streetAddress.trim(), selectedWard, selectedDistrict, selectedProvince].filter(Boolean);
      finalAddress = parts.join(", ");
    } else {
      finalAddress = config?.branches?.find((b) => b.id === selectedBranchId)?.address || "";
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-mobile-cart`;

    let expectedDeliveryISO: string | undefined = undefined;
    if (deliverySchedule === "schedule" || !opCheck.canOrderNow) {
      if (!expectedDeliveryTime) {
        const msg = "Vui lòng chọn giờ nhận hàng mong muốn (khung giờ 10:00 - 23:00).";
        setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
        setLoading(false);
        return;
      }
      if (expectedDeliveryTime < "10:00" || expectedDeliveryTime > "23:00") {
        const msg = "Khung giờ nhận món phải từ 10:00 đến 23:00.";
        setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
        setLoading(false);
        return;
      }
      const refDate = new Date();
      const todayISO = toISODateString(refDate);
      if (deliveryDate === todayISO) {
        const curH = refDate.getHours();
        const curM = refDate.getMinutes();
        const minBufferM = curH * 60 + curM + 120;
        const [eH, eM] = expectedDeliveryTime.split(":").map(Number);
        const selectedM = eH * 60 + eM;
        if (selectedM < minBufferM) {
          const msg = "Giờ nhận hàng phải sau thời gian hiện tại ít nhất 120 phút (2 tiếng).";
          setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
          setLoading(false);
          return;
        }
      }
      try {
        const [hoursStr, minutesStr] = expectedDeliveryTime.split(":");
        const hours = parseInt(hoursStr || "10", 10);
        const minutes = parseInt(minutesStr || "00", 10);

        const targetDateStr = deliveryDate || opCheck.defaultDate;
        const [y, m, d] = targetDateStr.split("-").map((s) => parseInt(s, 10));
        const pad = (n: number) => n.toString().padStart(2, "0");
        expectedDeliveryISO = `${y}-${pad(m)}-${pad(d)}T${pad(hours)}:${pad(minutes)}:00+07:00`;
      } catch (err) {
        expectedDeliveryISO = undefined;
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
              price: shipping,
              expected_delivery: expectedDeliveryISO,
              branch_id: selectedBranchId || undefined,
              province: selectedProvince || undefined,
              district: selectedDistrict || undefined,
              ward: selectedWard || undefined,
              ward_id: selectedWardId || undefined,
            }
            : (expectedDeliveryISO
              ? {
                expected_delivery: expectedDeliveryISO
              }
              : null),
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
                            {cleanVariantName(item.variant)}
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
                      readOnly={!!appliedVoucher}
                      disabled={validatingVoucher}
                      style={{ backgroundColor: "transparent" }}
                      className="flex-1 !bg-transparent text-gray-900 focus:outline-none text-base uppercase placeholder-gray-400 font-semibold"
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
                    <span className="text-primary font-bold font-display">
                      {!selectedDistrict ? "--" : isFreeship ? "0đ" : shipping > 0 ? formatPrice(shipping) : "--"}
                    </span>
                  </div>

                  {/* Thông báo / Thanh tiến trình Freeship nằm ngay dưới Phí ship */}
                  {shippingSettings?.is_min_amount_enabled && shippingSettings.min_order_amount > 0 && (
                    subtotal >= shippingSettings.min_order_amount || isFreeship ? (
                      <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3.5 py-2 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                        <span>🎉</span>
                        <span>{freeshipReason || `Miễn phí vận chuyển (Đơn hàng từ ${formatPrice(shippingSettings.min_order_amount)})`}</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/80 text-amber-900 space-y-1.5 text-xs font-medium">
                        <div className="flex justify-between items-center font-semibold gap-2">
                          <span className="flex items-center gap-1">
                            <span>🎁</span>
                            <span>Miễn phí vận chuyển cho đơn từ {formatPrice(shippingSettings.min_order_amount)}</span>
                          </span>
                          <span className="font-bold text-primary shrink-0">Cần mua thêm {formatPrice(shippingSettings.min_order_amount - subtotal)}</span>
                        </div>
                        <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((subtotal / shippingSettings.min_order_amount) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
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
            {/* Banner Trạng thái hoạt động */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${operatingStatus.canOrderNow
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-300 text-amber-900"
                }`}
            >
              <span className="text-xl leading-none mt-0.5">
                {operatingStatus.canOrderNow ? "🟢" : "🟡"}
              </span>
              <div className="text-xs sm:text-sm font-semibold flex-1 leading-relaxed font-sans">
                {operatingStatus.message}
              </div>
            </div>

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
                className={`grid transition-all duration-300 ease-in-out border-t border-gray-100/0 ${isSummaryExpanded
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
                              {isDefaultVariant(item.variant) ? `Số lượng: ${item.quantity}` : `${item.variant} x${item.quantity}`}
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

              {error && !fieldErrors["delivery.expected_delivery"] && (
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
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Tỉnh / Thành phố *</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        setSelectedProvince(newProv);
                        setSelectedDistrict("");
                        setSelectedWard("");
                        setSelectedWardId("");
                      }}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    >
                      {adminProvinces.length > 0 ? (
                        adminProvinces.map((prov) => (
                          <option key={prov.id} value={prov.name}>
                            {prov.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                          <option value="Hà Nội">Hà Nội</option>
                          <option value="Bình Dương">Bình Dương</option>
                        </>
                      )}
                    </select>
                  </div>

                  <WardSelectCombobox
                    wards={availableWards}
                    selectedWardId={selectedWardId}
                    selectedWardName={selectedWard}
                    onSelectWard={(wObj) => {
                      if (wObj) {
                        setSelectedWardId(wObj.id);
                        setSelectedWard(wObj.name);
                        if (wObj.district) setSelectedDistrict(wObj.district);
                      } else {
                        setSelectedWardId("");
                        setSelectedWard("");
                      }
                      if (fieldErrors.ward) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.ward;
                          return next;
                        });
                      }
                    }}
                    hasError={!!fieldErrors.ward}
                    errorMessage={fieldErrors.ward || "* Vui lòng chọn Phường / Xã (Khu vực giao)."}
                  />

                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Số nhà, tên đường, ngõ ngách *</label>
                    <input
                      type="text"
                      placeholder="VD: Số 73 Rạch Bùng Binh..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base font-serif font-normal leading-[150%] tracking-[0%]"
                    />
                    {fieldErrors.address && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.address}</p>}
                  </div>

                  {assignedBranchName && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium flex items-center gap-2">
                      <span>📍</span>
                      <span>Hệ thống tự động xác định giao từ chi nhánh: <strong>{assignedBranchName}</strong></span>
                    </div>
                  )}

                  {shippingMessage && (
                    <p className={`text-xs font-semibold mt-1.5 ${!isDeliverable ? "text-red-600" : "text-amber-700"}`}>
                      ℹ️ {shippingMessage}
                    </p>
                  )}
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
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Lời nhắn cho Cô Thảo Tôm Cá</label>
                <textarea
                  placeholder="Ghi chú về món ăn, gia vị, dụng cụ ăn uống..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base resize-none h-16 font-serif font-normal leading-[150%] tracking-[0%]"
                ></textarea>
              </div>

              {/* Expected time & date */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                  {deliveryType === "pickup" ? "Thời gian đến lấy hàng mong muốn" : "Thời gian giao hàng mong muốn"}
                </p>
                <div className="space-y-3">
                  {/* Option 1: Giao ngay (Chỉ hiển thị khi trước 22:30 / canOrderNow) */}
                  {operatingStatus.canOrderNow && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="expected_time"
                          value="now"
                          checked={deliverySchedule === "now"}
                          onChange={() => setDeliverySchedule("now")}
                          className="accent-primary"
                        />
                        <span className="font-medium text-sm">
                          {deliveryType === "pickup" ? "Lấy ngay (Chuẩn bị 15 - 30 phút)" : "Giao ngay (Hỏa tốc 45 - 90 phút)"}
                        </span>
                      </label>

                      {/* Footnote dưới Option 1: Chỉ hiển thị khi chọn Giao ngay VÀ thời gian hiện tại trước 10:00 AM */}
                      {deliverySchedule === "now" && operatingStatus.currentTime < (operatingStatus.deliveryOpen || "10:00") && (
                        <p className="text-xs text-amber-700 font-medium pl-6 mt-1">
                          * Khách nhận món sớm nhất từ {operatingStatus.deliveryOpen || "10:00"} (Bếp mở nhận đơn từ 9:00).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Nếu sau 22:30 (ngưng giao ngay), chỉ hiển thị thông báo chuyển qua Hẹn giờ */}
                  {!operatingStatus.canOrderNow && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed font-medium space-y-1">
                      <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                        <span>⏰</span>
                        <span>Bếp đã ngưng nhận đơn giao ngay sau {operatingStatus.lastOrderCutoff || "22:30"}.</span>
                      </p>
                      <p>Quý khách vui lòng đặt hẹn giờ nhận món từ {operatingStatus.deliveryOpen || "10:00"} ({operatingStatus.notice?.targetDateDisplay || "ngày mai"}).</p>
                    </div>
                  )}

                  {/* Option 2: Hẹn giờ giao hàng (Đặt trước) */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="expected_time"
                        value="schedule"
                        checked={deliverySchedule === "schedule" || !operatingStatus.canOrderNow}
                        onChange={() => setDeliverySchedule("schedule")}
                        className="accent-primary"
                      />
                      <span className="font-medium text-sm">
                        {deliveryType === "pickup" ? "Hẹn giờ đến lấy (Đặt trước)" : "Hẹn giờ giao hàng (Đặt trước)"}
                      </span>
                    </label>
                  </div>

                  {/* Ô chọn Ngày và Giờ (UI đẹp, Step 15 phút) */}
                  {(deliverySchedule === "schedule" || !operatingStatus.canOrderNow) && (
                    <div className="pt-2 space-y-3 pl-6">
                      {/* Chọn Ngày */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                          <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Chọn ngày nhận hàng</span>
                        </label>
                        <div className="relative">
                          <select
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full h-11 rounded-lg border border-[#B9C0D4] shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer appearance-none"
                          >
                            {availableDeliveryDates.map((item) => (
                              <option key={item.iso} value={item.iso}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Chọn Giờ (Step 15 phút) */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                          <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Chọn giờ nhận hàng (10:00 - 23:00)</span>
                        </label>
                        <div className="relative">
                          <select
                            value={expectedDeliveryTime}
                            onChange={(e) => {
                              setExpectedDeliveryTime(e.target.value);
                              if (fieldErrors["delivery.expected_delivery"]) {
                                setFieldErrors((prev) => {
                                  const next = { ...prev };
                                  delete next["delivery.expected_delivery"];
                                  return next;
                                });
                              }
                            }}
                            className={`w-full h-11 rounded-lg border shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer appearance-none ${fieldErrors["delivery.expected_delivery"] ? "border-red-500 ring-1 ring-red-500" : "border-[#B9C0D4]"
                              }`}
                          >
                            {availableTimeSlots.map((slot) => (
                              <option key={slot.value} value={slot.value}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        {fieldErrors["delivery.expected_delivery"] && (
                          <p className="mt-1 text-xs text-red-500 font-semibold italic animate-fade-in">
                            *{fieldErrors["delivery.expected_delivery"]}
                          </p>
                        )}
                      </div>
                    </div>
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
              disabled={loading || !confirmInfo || (deliveryType === "delivery" && !isDeliverable)}
              className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading
                ? "Đang xử lý..."
                : deliveryType === "delivery" && !isDeliverable
                  ? "Khu vực chưa hỗ trợ giao"
                  : !operatingStatus.canOrderNow
                    ? "Đặt hẹn giờ nhận hàng"
                    : "Đặt hàng"}
            </button>
          </div>
        )}
      </div>

      <PreOrderNoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        notice={operatingStatus.notice}
      />
    </div>
  );
}
