"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";
import {
  calcOrderTotal,
  createOrder,
  OrderApiError,
  validateVoucher,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
} from "@/services/orderService";
import PaymentQRScreen from "./PaymentQRScreen";
import { useAuth } from "@/contexts/AuthContext";

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
  order: CheckoutOrderItem;
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
  
  // COD/Transfer/Card selection
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "TRANSFER" | "CARD">("COD");

  // Shipping inputs
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [shippingFee] = useState(defaultShippingFee);
  
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

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: number; code: string; value: number; campaignId: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Sau khi tạo đơn thành công → chuyển sang màn hình QR
  const [pendingOrder, setPendingOrder] = useState<OrderInitiated | null>(null);

  const lineItems = useMemo(
    () => [{ price: order.unitPrice, quantity, discount: 0 }],
    [order.unitPrice, quantity],
  );

  const { subtotal, shipping } = calcOrderTotal(
    lineItems,
    deliveryType,
    shippingFee,
    0,
  );

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
      const res = await validateVoucher(voucherCode.trim());
      if (res.valid && res.voucher) {
        setAppliedVoucher({
          id: res.voucher.id,
          code: res.voucher.code,
          value: res.voucher.value,
          campaignId: res.voucher.campaign_id,
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
    return `${streetAddress.trim()}${selectedDistrict ? `, ${selectedDistrict}` : ""}`;
  }, [deliveryType, selectedBranchId, streetAddress, selectedDistrict, config.branches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

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
        : `${Date.now()}-${order.productId}`;

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
                expected_delivery:
                  deliverySchedule === "schedule" && expectedDelivery
                    ? new Date(expectedDelivery).toISOString()
                    : undefined,
              }
            : null,
        items: [
          {
            product_id: order.productId,
            product_code: order.productCode,
            product_name: order.title,
            quantity,
            price: order.unitPrice,
            discount: 0,
            note: itemNote.trim() || undefined,
          },
        ],
        discount: voucherDiscount,
        description:
          [
            description.trim(),
            order.variant !== order.title ? `Size: ${order.variant}` : "",
          ]
            .filter(Boolean)
            .join(" | ") || undefined,
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
        branch_id: deliveryType === "pickup" ? selectedBranchId : undefined,
      });

      if (paymentMethod === "COD" || paymentMethod === "CARD") {
        // COD or CARD order is immediately synced. Go directly to success screen!
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
      
      {/* CỘT TRÁI: THÔNG TIN LIÊN HỆ & GIAO HÀNG */}
      <div className="lg:col-span-7">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[24px] p-6 md:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100"
        >
          <h2 className="title-1 font-display text-primary border-b border-gray-100 pb-3">
            Thông tin liên hệ
          </h2>

          {/* Họ và tên */}
          <div className="space-y-1">
            <label className="body-2 font-display text-primary font-bold">Họ và tên</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm"
              placeholder="Họ và tên"
            />
            {fieldError("customer.name") ? (
              <p className="text-xs text-red-600 mt-1">{fieldError("customer.name")}</p>
            ) : null}
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1">
            <label className="body-2 font-display text-primary font-bold">Số điện thoại</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm"
              placeholder="Số điện thoại"
            />
            {fieldError("customer.phone") ? (
              <p className="text-xs text-red-600 mt-1">{fieldError("customer.phone")}</p>
            ) : null}
          </div>

          {/* Email (Optional) */}
          <div className="space-y-1">
            <label className="body-2 font-display text-primary font-bold">Email (Không bắt buộc)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm"
              placeholder="Email"
            />
          </div>

          {/* LOẠI GIAO NHẬN (Giao hàng / Tự đến lấy) */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <label className="body-2 font-display text-primary font-bold block">
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors font-bold">
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors font-bold">
                  Tự đến lấy tại chi nhánh
                </span>
              </label>
            </div>
          </div>

          {/* HIỂN THỊ ĐỊA CHỈ NHẬN HÀNG TỐI ƯU HÓA CHO DELIVERY */}
          {deliveryType === "delivery" && (
            <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 animate-fade-in">
              <p className="body-2 text-gray-700 font-bold">Địa chỉ giao hàng tận nơi</p>
              
              {/* Chọn Quận Huyện dropdown */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold block">Quận/Huyện khu vực</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
                >
                  <option value="">-- Chọn Quận/Huyện giao hàng --</option>
                  <optgroup label="Hà Nội">
                    {POPULAR_DISTRICTS.filter((d) => d.group === "Hà Nội").map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.value}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="TP. Hồ Chí Minh">
                    {POPULAR_DISTRICTS.filter((d) => d.group === "TP. Hồ Chí Minh").map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.value}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {fieldError("delivery.district") ? (
                  <p className="text-xs text-red-600 mt-1">{fieldError("delivery.district")}</p>
                ) : null}
              </div>

              {/* Địa chỉ chi tiết */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold block">Số nhà, tên đường, ngõ ngách...</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm"
                  placeholder="Ví dụ: Số 20 ngõ 5 Láng Hạ"
                />
                {fieldError("delivery.address") ? (
                  <p className="text-xs text-red-600 mt-1">{fieldError("delivery.address")}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* HIỂN THỊ CHỌN CHI NHÁNH DỰA TRÊN API KIOTVIET CHO PICKUP */}
          {deliveryType === "pickup" && (
            <div className="space-y-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 animate-fade-in">
              <p className="body-2 text-gray-700 font-bold">Chi nhánh KiotViet nhận hàng</p>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold block">Chọn chi nhánh gần bạn nhất</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                  className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer font-semibold"
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
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 shadow-sm text-xs">
                  <p className="body-2 font-display text-primary font-bold">
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
                  <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 pt-1.5 border-t border-gray-100">
                    <span className="inline-block size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span>Tự đến lấy giúp tiết kiệm phí vận chuyển (Miễn phí ship)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lời nhắn */}
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <label className="body-2 font-display text-primary font-bold">Lời nhắn cho Bếp</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
              placeholder="Lời nhắn cho Bếp Cô Thảo"
            />
          </div>

          {/* Thời gian giao hàng mong muốn */}
          <div className="space-y-3 pt-2">
            <label className="body-2 font-display text-primary font-bold block">
              Thời gian giao hàng mong muốn
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors">
                  Giao ngay (Hỏa tốc 45 - 90 phút)
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors">
                  Hẹn giờ giao
                </span>
              </label>
            </div>

            {/* Ô chọn giờ nếu Hẹn giờ giao được tích */}
            {deliverySchedule === "schedule" && (
              <div className="pt-2 animate-fade-in">
                <input
                  type="datetime-local"
                  required
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full rounded-[8px] border border-gray-200 px-4 py-3 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            )}
          </div>

          {/* Hình thức thanh toán */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <label className="body-2 font-display text-primary font-bold block">
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors">
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
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors">
                  Chuyển khoản ngân hàng (Qua mã QR)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="payment_method"
                  checked={paymentMethod === "CARD"}
                  onChange={() => setPaymentMethod("CARD")}
                  className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="body-2 text-gray-900 group-hover:text-primary transition-colors">
                  Thanh toán bằng thẻ (Visa/Mastercard)
                </span>
              </label>
            </div>
          </div>

          {error ? <p className="body-2 text-red-600 font-semibold pt-2">{error}</p> : null}
        </form>
      </div>

      {/* CỘT PHẢI: THÔNG TIN ĐƠN HÀNG */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-[24px] p-6 md:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
          <h2 className="title-1 font-display text-primary border-b border-gray-100 pb-3">
            Thông tin đơn hàng
          </h2>

          {/* Hộp danh sách sản phẩm */}
          <div className="space-y-4">
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
                  <p className="title-3 font-display text-primary font-bold truncate">
                    {order.title}
                  </p>
                  <p className="title-3 text-secondary font-bold shrink-0">
                    {formatPrice(order.unitPrice)}
                  </p>
                </div>
                
                <p className="body-3 text-gray-500 font-medium">
                  Size: {order.variant}
                </p>

                {/* Dòng điều khiển: Số lượng & Xóa */}
                <div className="flex items-center justify-between pt-1">
                  {/* Tăng giảm số lượng kiểu Pill */}
                  <div className="flex items-center border border-gray-200 rounded-full px-2 py-1 bg-white">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm disabled:opacity-30"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span className="body-2 text-primary font-bold min-w-[1.5rem] text-center px-1">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="size-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-sm"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      +
                    </button>
                  </div>

                  {/* Nút Xóa */}
                  <button
                    type="button"
                    onClick={() => setQuantity(1)} // Reset về 1 hoặc tương ứng
                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-xs font-semibold"
                  >
                    <span>🗑</span>
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hộp nhập mã giảm giá */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <label className="body-2 font-display text-primary font-bold block">
              Mã giảm giá
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                disabled={!!appliedVoucher || validatingVoucher}
                className="flex-1 rounded-[8px] border border-gray-200 px-4 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-sm uppercase placeholder-gray-400"
                placeholder="Nhập mã ưu đãi..."
              />
              {appliedVoucher ? (
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-4 py-2.5 rounded-[8px] text-sm transition-all"
                >
                  Xóa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={validatingVoucher || !voucherCode.trim()}
                  className="bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2.5 rounded-[8px] text-sm transition-all disabled:opacity-40"
                >
                  {validatingVoucher ? "Đang check..." : "Áp dụng"}
                </button>
              )}
            </div>
            {voucherError && (
              <p className="text-xs text-red-600 font-semibold">{voucherError}</p>
            )}
            {voucherSuccess && (
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                <span>✓</span> <span>{voucherSuccess}</span>
              </p>
            )}
          </div>

          {/* Hộp tính giá (Blue-Gray rounded container) */}
          <div className="bg-gray-100 rounded-[12px] p-4 space-y-2.5">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Vận chuyển</span>
              <span className="title-3 font-display text-primary font-bold">
                {formatPrice(shipping)}
              </span>
            </div>

            {appliedVoucher && (
              <div className="flex justify-between items-center text-sm font-medium text-green-600 border-t border-gray-200/50 pt-2">
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
              <div className="text-[12px] text-green-600 font-semibold text-right flex items-center justify-end gap-1 pt-1.5 border-t border-dashed border-gray-200/80">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>Đơn hàng này sẽ tích lũy thêm ~{Math.floor(total / 100000)} điểm thố!</span>
              </div>
            )}
          </div>

          {/* Nút submit dạng Pill đỏ cam (Terracotta red) */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-secondary hover:bg-secondary/95 active:scale-[0.98] text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-60 disabled:scale-100 disabled:pointer-events-none"
          >
            {loading ? "Đang xử lý..." : "Thanh toán"}
          </button>
        </div>
      </div>
    </div>
  );
}
