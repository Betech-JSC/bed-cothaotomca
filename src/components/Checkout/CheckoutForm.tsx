"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { formatPrice, isDefaultVariant, cleanVariantName } from "@/lib/format";
import {
  calcOrderTotal,
  calculateShippingFee,
  createOrder,
  getAdministrativeUnits,
  getAvailableVouchers,
  getShippingSettings,
  OrderApiError,
  validateVoucher,
  type AdministrativeProvince,
  type AdministrativeWard,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
  type PublicVoucherItem,
  type ShippingSettings,
} from "@/services/orderService";
import PaymentQRScreen from "./PaymentQRScreen";
import { getGeneralSettings } from "@/services/generalSettingService";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { checkOperatingHours, formatVietnameseDate, generate15MinTimeSlots, getVietnamDate, isTodayOutOfScheduleSlots, toISODateString } from "@/lib/operatingHours";
import WardSelectCombobox from "./WardSelectCombobox";
import PreOrderNoticeModal from "./PreOrderNoticeModal";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import CouponModal from "@/components/Voucher/CouponModal";
import SmartCartProgressBar from "@/components/Cart/SmartCartProgressBar";
import GiftSelectorModal from "./GiftSelectorModal";

export interface CheckoutOrderItem {
  productId: number;
  productCode: string;
  slug: string;
  categorySlug: string;
  title: string;
  imageUrl: string;
  variant: string;
  unitPrice: number;
  originalPrice?: number;
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
          originalPrice: order.originalPrice,
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
  const [adminProvinces, setAdminProvinces] = useState<AdministrativeProvince[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  const [shippingFee, setShippingFee] = useState<number>(defaultShippingFee);
  const [originalFee, setOriginalFee] = useState<number>(defaultShippingFee);
  const [isFreeship, setIsFreeship] = useState<boolean>(false);
  const [freeshipReason, setFreeshipReason] = useState<string | null>(null);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);
  const [assignedBranchName, setAssignedBranchName] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(false);

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

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<PublicVoucherItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: number;
    code: string;
    value: number;
    discountType?: "fixed" | "percent" | "freeship";
    maxDiscount?: number | null;
    campaignId: number;
    prereqPrice?: number;
    isFreeship?: boolean;
    discountAmount?: number;
  } | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(false);

  useEffect(() => {
    getAvailableVouchers().then(setAvailableVouchers).catch(() => setAvailableVouchers([]));
  }, []);

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

  // Total cart items count (for buy_x_get_y check)
  const totalCartQuantity = useMemo(() => {
    if (isCartCheckout) {
      return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }
    return quantity || 1;
  }, [isCartCheckout, cartItems, quantity]);

  // Opt-out state for promotions (allowing user to remove if desired)
  const [optOutOrderDiscount, setOptOutOrderDiscount] = useState(false);

  // 1. ORDER DISCOUNT PROMOTION (Giảm giá theo giá trị đơn)
  const eligibleOrderDiscountPromo = useMemo(() => {
    return (
      config.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_discount" &&
          subtotal >= (p.min_order_value || 0)
      ) || null
    );
  }, [config.active_promotions, subtotal]);

  const autoOrderDiscountAmount = useMemo(() => {
    if (!eligibleOrderDiscountPromo || optOutOrderDiscount) return 0;
    const type = eligibleOrderDiscountPromo.discount_type;
    const val = eligibleOrderDiscountPromo.discount_value;
    let disc = 0;
    if (type === "percent") {
      disc = Math.ceil((subtotal * (val / 100)) / 1000) * 1000;
      if (eligibleOrderDiscountPromo.max_discount && eligibleOrderDiscountPromo.max_discount > 0) {
        disc = Math.min(disc, eligibleOrderDiscountPromo.max_discount);
      }
    } else if (type === "fixed") {
      disc = Math.ceil(val / 1000) * 1000;
      if (eligibleOrderDiscountPromo.max_discount && eligibleOrderDiscountPromo.max_discount > 0) {
        disc = Math.min(disc, eligibleOrderDiscountPromo.max_discount);
      }
    }
    return Math.min(disc, subtotal);
  }, [eligibleOrderDiscountPromo, optOutOrderDiscount, subtotal]);

  // 2. ORDER GIFT PROMOTION (Quà tặng theo giá trị đơn)
  const eligibleOrderGiftPromo = useMemo(() => {
    return (
      config.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          subtotal >= (p.min_order_value || 0)
      ) || null
    );
  }, [config.active_promotions, subtotal]);

  const upcomingOrderGiftPromo = useMemo(() => {
    if (eligibleOrderGiftPromo || !config.active_promotions) return null;
    return (
      config.active_promotions.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          subtotal < (p.min_order_value || 0)
      ) || null
    );
  }, [config.active_promotions, eligibleOrderGiftPromo, subtotal]);

  const [optOutOrderGift, setOptOutOrderGift] = useState(false);
  const [selectedOrderGiftId, setSelectedOrderGiftId] = useState<number | null>(null);
  const [isOrderGiftModalOpen, setIsOrderGiftModalOpen] = useState(false);
  const [selectedBuyXGetYPromoForModal, setSelectedBuyXGetYPromoForModal] = useState<any | null>(null);

  useEffect(() => {
    if (eligibleOrderGiftPromo && eligibleOrderGiftPromo.items.length > 0) {
      if (
        !selectedOrderGiftId ||
        !eligibleOrderGiftPromo.items.some((i) => i.id === selectedOrderGiftId)
      ) {
        setSelectedOrderGiftId(eligibleOrderGiftPromo.items[0].id);
      }
    } else {
      setSelectedOrderGiftId(null);
      setOptOutOrderGift(false);
    }
  }, [eligibleOrderGiftPromo]);

  const selectedOrderGiftItem = useMemo(() => {
    if (!eligibleOrderGiftPromo || !selectedOrderGiftId || optOutOrderGift) return null;
    return (
      eligibleOrderGiftPromo.items.find((i) => i.id === selectedOrderGiftId) || null
    );
  }, [eligibleOrderGiftPromo, selectedOrderGiftId, optOutOrderGift]);

  // 3. BUY X GET Y PROMOTIONS (Mua X tặng/giảm Y - Hỗ trợ nhiều chiến dịch đồng thời)
  const eligibleBuyXGetYPromos = useMemo(() => {
    if (!config.active_promotions) return [];
    return config.active_promotions.filter((p) => {
      if (p.promotion_type !== "buy_x_get_y" || !p.items || p.items.length === 0) return false;
      const buyQty = Number(p.settings?.buy_quantity || 2);
      return totalCartQuantity >= buyQty;
    });
  }, [config.active_promotions, totalCartQuantity]);

  const upcomingBuyXGetYPromo = useMemo(() => {
    if (!config.active_promotions) return null;
    return (
      config.active_promotions.find((p) => {
        if (p.promotion_type !== "buy_x_get_y" || !p.items || p.items.length === 0) return false;
        const buyQty = Number(p.settings?.buy_quantity || 2);
        return totalCartQuantity < buyQty;
      }) || null
    );
  }, [config.active_promotions, totalCartQuantity]);

  const [optOutBuyXGetYSet, setOptOutBuyXGetYSet] = useState<Record<number, boolean>>({});
  const [selectedBuyXGetYMap, setSelectedBuyXGetYMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (eligibleBuyXGetYPromos.length > 0) {
      setSelectedBuyXGetYMap((prev) => {
        let updated = false;
        const next = { ...prev };
        eligibleBuyXGetYPromos.forEach((promo) => {
          if (!next[promo.id] && promo.items.length > 0) {
            next[promo.id] = promo.items[0].id;
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }
  }, [eligibleBuyXGetYPromos]);

  const activeBuyXGetYItems = useMemo(() => {
    return eligibleBuyXGetYPromos
      .filter((promo) => !optOutBuyXGetYSet[promo.id])
      .map((promo) => {
        const selectedId = selectedBuyXGetYMap[promo.id] || promo.items[0]?.id;
        const item = promo.items.find((i) => i.id === selectedId) || promo.items[0];
        const buyQty = promo.settings?.buy_quantity || 2;
        const giftQty = promo.settings?.gift_quantity || 1;
        const isFree = item?.campaign_price === 0;
        const tag = isFree
          ? `🎁 Mua ${buyQty} tặng ${giftQty}`
          : `💎 Mua ${buyQty} giảm ${giftQty}`;
        return {
          promo,
          item,
          tag,
        };
      })
      .filter((x) => Boolean(x.item));
  }, [eligibleBuyXGetYPromos, selectedBuyXGetYMap, optOutBuyXGetYSet]);

  const promoItemsExtraPrice = useMemo(() => {
    let extra = 0;
    if (selectedOrderGiftItem && selectedOrderGiftItem.campaign_price > 0) {
      extra += selectedOrderGiftItem.campaign_price;
    }
    activeBuyXGetYItems.forEach(({ item }) => {
      if (item && item.campaign_price > 0) {
        extra += item.campaign_price;
      }
    });
    return extra;
  }, [selectedOrderGiftItem, activeBuyXGetYItems]);

  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [hotline, setHotline] = useState<string>("028 6686 1508");

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

  // Trigger real-time calculation when address, subtotal or voucher changes
  useEffect(() => {
    if (deliveryType !== "delivery") {
      setShippingFee(0);
      setIsFreeship(false);
      setIsDeliverable(true);
      setShippingMessage(null);
      return;
    }

    let isSubscribed = true;
    setCalculatingShipping(true);

    calculateShippingFee({
      province: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard,
      ward_id: selectedWardId,
      subtotal,
      voucher_code: appliedVoucher?.code,
    })
      .then((res) => {
        if (!isSubscribed) return;
        setShippingFee(res.shipping_fee);
        setOriginalFee(res.original_fee);
        setIsFreeship(res.is_freeship);
        setFreeshipReason(res.freeship_reason || null);

        const hasWard = !!selectedWard || !!selectedWardId;
        setIsDeliverable(hasWard ? res.is_deliverable : true);
        setShippingMessage(hasWard ? (res.message || null) : null);

        if (hasWard && res.branch_id) {
          const matchedBranch = config.branches?.find(
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
        console.error("Error calculating shipping:", err);
      })
      .finally(() => {
        if (isSubscribed) setCalculatingShipping(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [deliveryType, selectedProvince, selectedDistrict, selectedWard, subtotal, appliedVoucher, config.branches]);

  // Store Pickup input & Auto-assigned delivery branch
  const [selectedBranchId, setSelectedBranchId] = useState<number>(() => {
    return config.branches?.[0]?.id || 1;
  });

  // Expected delivery time & date
  const [deliverySchedule, setDeliverySchedule] = useState<"now" | "schedule">(() => {
    return operatingStatus.defaultDeliverySchedule;
  });
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    return operatingStatus.defaultDate;
  });
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<string>("10:00");
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(() => {
    return !operatingStatus.canOrderNow && !!operatingStatus.notice;
  });

  useEffect(() => {
    if (!operatingStatus.canOrderNow) {
      setDeliverySchedule("schedule");
      if (operatingStatus.defaultDate) {
        setDeliveryDate(operatingStatus.defaultDate);
      }
    }
  }, [operatingStatus.canOrderNow, operatingStatus.defaultDate]);

  const availableDeliveryDates = useMemo(() => {
    const dates: { iso: string; label: string }[] = [];
    const refDate = getVietnamDate();
    const outOfSlotsToday = isTodayOutOfScheduleSlots(operatingStatus.deliveryClose || "23:00", new Date(), 120);
    const startOffset = (!operatingStatus.canOrderNow && (operatingStatus.isAfterCutoff || operatingStatus.isAfterClose)) || outOfSlotsToday ? 1 : 0;

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
    const refDate = getVietnamDate();
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

  // Auto-shift delivery date if current selected date is invalid or out of available list
  useEffect(() => {
    if (availableDeliveryDates.length > 0) {
      const isCurrentDateValid = availableDeliveryDates.some((d) => d.iso === deliveryDate);
      if (!isCurrentDateValid) {
        setDeliveryDate(availableDeliveryDates[0].iso);
      }
    }
  }, [availableDeliveryDates, deliveryDate]);

  useEffect(() => {
    if (availableTimeSlots.length > 0) {
      const exists = availableTimeSlots.some((s) => s.value === expectedDeliveryTime);
      if (!exists) {
        setExpectedDeliveryTime(availableTimeSlots[0].value);
      }
    } else {
      // If no slots for current deliveryDate and we have other dates available, auto switch to next date
      if (availableDeliveryDates.length > 0 && deliveryDate !== availableDeliveryDates[0].iso) {
        setDeliveryDate(availableDeliveryDates[0].iso);
      }
    }
  }, [availableTimeSlots, expectedDeliveryTime, availableDeliveryDates, deliveryDate]);

  const [itemNote] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sau khi tạo đơn thành công → chuyển sang màn hình QR
  const [pendingOrder, setPendingOrder] = useState<OrderInitiated | null>(null);

  // Auto-remove voucher if cart subtotal drops below the minimum required price (Exempt Freeship vouchers)
  useEffect(() => {
    if (appliedVoucher) {
      const codeUpper = appliedVoucher.code.toUpperCase();
      const isFreeshipCode = codeUpper.includes("SHIP") || codeUpper.includes("FREE");
      if (!isFreeshipCode && appliedVoucher.prereqPrice && subtotal < appliedVoucher.prereqPrice) {
        setAppliedVoucher(null);
        setVoucherSuccess(null);
        setVoucherError(
          `Mã giảm giá đã bị gỡ do đơn hàng hiện tại chưa đủ ${appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ.`
        );
      }
    }
  }, [subtotal, appliedVoucher]);

  const voucherDiscount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const codeUpper = appliedVoucher.code.toUpperCase();
    const type = appliedVoucher.discountType;

    if (type === "percent" || codeUpper.includes("PCT")) {
      const pct = appliedVoucher.value;
      const calculated = Math.ceil((subtotal * (pct / 100)) / 1000) * 1000;
      if (appliedVoucher.maxDiscount && appliedVoucher.maxDiscount > 0) {
        return Math.min(appliedVoucher.maxDiscount, calculated);
      }
      return Math.min(calculated, subtotal);
    }
    if (type === "freeship" || appliedVoucher.isFreeship || codeUpper.includes("SHIP") || codeUpper.includes("FREE")) {
      return shipping;
    }
    if (codeUpper.startsWith("EVOUCHER") || codeUpper.startsWith("EVO")) {
      return Math.min(appliedVoucher.value, subtotal + shipping);
    }
    return Math.min(appliedVoucher.value, subtotal);
  }, [appliedVoucher, subtotal, shipping]);

  const total = Math.max(0, subtotal + promoItemsExtraPrice - voucherDiscount - autoOrderDiscountAmount + shipping);

  const handleApplyVoucher = async (codeOverride?: string) => {
    const code = (typeof codeOverride === "string" ? codeOverride : voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá.");
      setVoucherSuccess(null);
      return;
    }

    setVoucherCode(code);
    setValidatingVoucher(true);
    setVoucherError(null);
    setVoucherSuccess(null);

    try {
      const res = await validateVoucher(code, subtotal, shipping);
      if (res.valid && res.voucher) {
        setAppliedVoucher({
          id: res.voucher.id,
          code: res.voucher.code,
          value: res.voucher.value,
          discountType: res.voucher.discount_type,
          maxDiscount: res.voucher.max_discount,
          campaignId: res.voucher.campaign_id,
          prereqPrice: res.voucher.prereq_price,
          isFreeship: res.voucher.is_freeship,
          discountAmount: res.discount_amount,
        });
        setVoucherSuccess(res.message);
        return true;
      } else {
        setVoucherError(res.message);
        setAppliedVoucher(null);
        throw new Error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || "Không thể xác thực mã giảm giá.";
      setVoucherError(msg);
      setAppliedVoucher(null);
      throw new Error(msg);
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

    if (isCartCheckout && cartItems.length === 0) {
      setError("Giỏ hàng của bạn đang trống.");
      setLoading(false);
      return;
    }

    // Validate custom delivery inputs
    if (deliveryType === "delivery") {
      const errs: Record<string, string> = {};
      if (!selectedWard.trim() && !selectedWardId) {
        errs["delivery.ward"] = "* Vui lòng chọn Phường / Xã (Khu vực giao).";
      }
      if (!streetAddress.trim()) {
        errs["delivery.address"] = "Vui lòng nhập số nhà và tên đường.";
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
              price: shippingFee,
              expected_delivery: expectedDeliveryISO,
            }
            : (expectedDeliveryISO
              ? {
                expected_delivery: expectedDeliveryISO
              }
              : null),
        items: isCartCheckout
          ? [
            ...cartItems.map((item) => ({
              product_id: item.productId,
              product_code: item.productCode,
              product_name: item.title,
              quantity: item.quantity,
              price: item.unitPrice,
              discount: 0,
              note: undefined,
            })),
            ...(selectedOrderGiftItem
              ? [
                {
                  product_id: selectedOrderGiftItem.product_id,
                  product_code: selectedOrderGiftItem.product_code,
                  product_name: `[QUÀ TẶNG] ${selectedOrderGiftItem.product_name}`,
                  quantity: 1,
                  price: selectedOrderGiftItem.campaign_price,
                  discount: 0,
                  note: `Quà tặng đơn hàng (${eligibleOrderGiftPromo?.name || "Chiến dịch"})`,
                },
              ]
              : []),
            ...(activeBuyXGetYItems.map(({ promo, item, tag }) => ({
              product_id: item.product_id,
              product_code: item.product_code,
              product_name: `[ƯU ĐÃI COMBO] ${item.product_name}`,
              quantity: 1,
              price: item.campaign_price,
              discount: 0,
              note: `${tag.replace("🎁 ", "").replace("💎 ", "")} (${promo.name})`,
            }))),
          ]
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
              ...(selectedOrderGiftItem
                ? [
                  {
                    product_id: selectedOrderGiftItem.product_id,
                    product_code: selectedOrderGiftItem.product_code,
                    product_name: `[QUÀ TẶNG] ${selectedOrderGiftItem.product_name}`,
                    quantity: 1,
                    price: selectedOrderGiftItem.campaign_price,
                    discount: 0,
                    note: `Quà tặng đơn hàng (${eligibleOrderGiftPromo?.name || "Chiến dịch"})`,
                  },
                ]
                : []),
              ...activeBuyXGetYItems.map(({ promo, item, tag }) => ({
                product_id: item.product_id,
                product_code: item.product_code,
                product_name: `[ƯU ĐÃI COMBO] ${item.product_name}`,
                quantity: 1,
                price: item.campaign_price,
                discount: 0,
                note: `${tag.replace("🎁 ", "").replace("💎 ", "")} (${promo?.name || "Chiến dịch"})`,
              })),
            ]
            : [],
        discount: voucherDiscount + autoOrderDiscountAmount,
        description: isCartCheckout
          ? [
            description.trim(),
            cartItems.map((item) => `${item.title} (${item.variant}) x${item.quantity}`).join(", "),
            autoOrderDiscountAmount > 0 ? `🏷 KM đơn hàng: -${autoOrderDiscountAmount.toLocaleString("vi-VN")}đ (${eligibleOrderDiscountPromo?.name || ""})` : "",
            selectedOrderGiftItem ? `🎁 Tặng kèm: ${selectedOrderGiftItem.product_name} (0đ - ${eligibleOrderGiftPromo?.name || "Ưu đãi"})` : "",
            ...activeBuyXGetYItems.map(({ promo, item, tag }) => `🎁 Ưu đãi combo: ${item.product_name} (${item.campaign_price === 0 ? "0đ" : `${item.campaign_price.toLocaleString("vi-VN")}đ`} - ${tag.replace("🎁 ", "").replace("💎 ", "")})`),
          ]
            .filter(Boolean)
            .join(" | ") || undefined
          : order
            ? [
              description.trim(),
              order.variant !== order.title ? order.variant : "",
              autoOrderDiscountAmount > 0 ? `🏷 KM đơn hàng: -${autoOrderDiscountAmount.toLocaleString("vi-VN")}đ (${eligibleOrderDiscountPromo?.name || ""})` : "",
              selectedOrderGiftItem ? `🎁 Tặng kèm: ${selectedOrderGiftItem.product_name} (0đ - ${eligibleOrderGiftPromo?.name || "Ưu đãi"})` : "",
              ...activeBuyXGetYItems.map(({ promo, item, tag }) => `🎁 Ưu đãi combo: ${item.product_name} (${item.campaign_price === 0 ? "0đ" : `${item.campaign_price.toLocaleString("vi-VN")}đ`} - ${tag.replace("🎁 ", "").replace("💎 ", "")})`),
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
              <div className="text-sm font-semibold flex-1 leading-relaxed font-sans">
                {operatingStatus.message}
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

                {/* Chọn Tỉnh/Thành & Phường/Xã (Danh mục chuẩn) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-serif font-semibold text-primary block">Tỉnh / Thành phố *</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        setSelectedProvince(newProv);
                        setSelectedDistrict("");
                        setSelectedWard("");
                        setSelectedWardId("");
                      }}
                      className="w-full h-11 rounded-[4px] border border-[#B9C0D4] px-[14px] bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-serif cursor-pointer"
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
                      if (fieldErrors["delivery.ward"]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next["delivery.ward"];
                          return next;
                        });
                      }
                    }}
                    hasError={!!fieldError("delivery.ward")}
                    errorMessage={fieldError("delivery.ward") || "* Vui lòng chọn Phường / Xã (Khu vực giao)."}
                  />
                </div>

                {/* Số nhà, tên đường */}
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

                {/* Thông báo chi nhánh tự động được chọn & thông tin ship */}
                {assignedBranchName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900 font-medium flex items-center gap-2">
                    <span>📍</span>
                    <span>Hệ thống tự động xác định giao từ chi nhánh: <strong>{assignedBranchName}</strong></span>
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
                    className="w-full h-11 rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base cursor-pointer font-serif leading-[150%] tracking-[0%]"
                  >
                    {config.branches?.map((branch) => (
                      <option key={branch.id} value={branch.id} className="text-gray-900 bg-white py-1">
                        {branch.branchName || branch.address || (branch as any).title || `Chi nhánh #${branch.id}`}
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
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">Lời nhắn cho Cô Thảo Tôm Cá</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-[4px] border border-[#B9C0D4] shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors text-base resize-none font-serif font-normal leading-[150%] tracking-[0%]"
                placeholder="Ghi chú về món ăn, gia vị, dụng cụ ăn uống..."
              ></textarea>
            </div>

            {/* Thời gian giao/lấy hàng mong muốn */}
            <div className="space-y-3 pt-2">
              <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                {deliveryType === "pickup" ? "Thời gian đến lấy hàng mong muốn" : "Thời gian giao hàng mong muốn"}
              </label>

              <div className="space-y-3">
                {/* Option 1: Giao ngay (Chỉ hiển thị khi trước 22:30 / canOrderNow) */}
                {operatingStatus.canOrderNow && (
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="delivery_schedule"
                        value="now"
                        checked={deliverySchedule === "now"}
                        onChange={() => setDeliverySchedule("now")}
                        className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <span className="body-1 text-gray-900 group-hover:text-primary transition-colors font-medium">
                        {deliveryType === "pickup" ? "Lấy ngay (Chuẩn bị 15 - 30 phút)" : "Giao ngay (Hỏa tốc 45 - 90 phút)"}
                      </span>
                    </label>

                    {/* Footnote dưới Option 1: Chỉ hiển thị khi chọn Giao ngay VÀ thời gian hiện tại trước 10:00 AM */}
                    {deliverySchedule === "now" && operatingStatus.currentTime < (operatingStatus.deliveryOpen || "10:00") && (
                      <p className="text-xs text-amber-700 font-medium pl-7 mt-1">
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
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="delivery_schedule"
                      value="schedule"
                      checked={deliverySchedule === "schedule" || !operatingStatus.canOrderNow}
                      onChange={() => setDeliverySchedule("schedule")}
                      className="size-4 text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span className="body-1 text-gray-900 group-hover:text-primary transition-colors font-medium">
                      {deliveryType === "pickup" ? "Hẹn giờ đến lấy (Đặt trước)" : "Hẹn giờ giao hàng (Đặt trước)"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Ô chọn Ngày và Giờ (UI đẹp, Step 15 phút) */}
              {(deliverySchedule === "schedule" || !operatingStatus.canOrderNow) && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in pl-7">
                  {/* Chọn Ngày */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Chọn ngày nhận hàng</span>
                    </label>
                    <div className="relative">
                      <select
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#B9C0D4] shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-semibold cursor-pointer appearance-none"
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
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Chọn giờ nhận hàng (10:00 - 23:00)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={expectedDeliveryTime}
                        disabled={availableTimeSlots.length === 0}
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
                        className={`w-full h-11 rounded-lg border shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-semibold cursor-pointer appearance-none ${fieldError("delivery.expected_delivery") ? "border-red-500 ring-1 ring-red-500" : "border-[#B9C0D4]"
                          }`}
                      >
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            Hôm nay đã hết khung giờ (Vui lòng chọn ngày mai)
                          </option>
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {fieldError("delivery.expected_delivery") && (
                      <p className="mt-1 text-xs text-red-500 font-semibold italic animate-fade-in">
                        *{fieldError("delivery.expected_delivery")}
                      </p>
                    )}
                  </div>
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

            {error && !fieldErrors["delivery.expected_delivery"] ? (
              <p className="body-1 text-red-600 font-semibold pt-2">{error}</p>
            ) : null}
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
                          <div className="text-right shrink-0">
                            {item.originalPrice && item.originalPrice > item.unitPrice ? (
                              <p className="text-xs font-semibold text-gray-400 line-through leading-tight">
                                {formatPrice(item.originalPrice)}
                              </p>
                            ) : null}
                            <p className="title-3 text-secondary font-bold leading-tight">
                              {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                        </div>

                        {!isDefaultVariant(item.variant) && (
                          <p className="body-2 text-gray-500 font-medium">
                            {cleanVariantName(item.variant)}
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
                      <div className="text-right shrink-0">
                        {order.originalPrice && order.originalPrice > order.unitPrice ? (
                          <p className="text-xs font-semibold text-gray-400 line-through leading-tight">
                            {formatPrice(order.originalPrice)}
                          </p>
                        ) : null}
                        <p className="title-3 text-secondary font-bold leading-tight">
                          {formatPrice(order.unitPrice)}
                        </p>
                      </div>
                    </div>

                    {!isDefaultVariant(order.variant) && (
                      <p className="body-2 text-gray-500 font-medium">
                        {cleanVariantName(order.variant)}
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

              {/* Món quà tặng đơn hàng (order_gift_discount) */}
              {selectedOrderGiftItem && (
                <div className="flex gap-4 items-start py-3 bg-amber-50/60 rounded-2xl p-3 border border-amber-200/80 animate-fade-in shadow-xs">
                  {selectedOrderGiftItem.image ? (
                    <div className="relative size-16 flex-shrink-0 rounded-[10px] overflow-hidden bg-white border border-amber-200">
                      <Image src={selectedOrderGiftItem.image} alt={selectedOrderGiftItem.product_name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="size-16 flex-shrink-0 rounded-[10px] bg-amber-100 flex items-center justify-center text-xl">
                      🎁
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="title-3 font-display text-gray-900 font-bold">
                        {selectedOrderGiftItem.product_name}
                      </p>
                      <div className="text-right shrink-0">
                        {selectedOrderGiftItem.original_price > 0 && (
                          <span className="text-xs text-gray-400 line-through block">
                            {formatPrice(selectedOrderGiftItem.original_price)}
                          </span>
                        )}
                        <span className="title-3 text-emerald-600 font-bold">
                          {selectedOrderGiftItem.campaign_price === 0 ? "0đ" : formatPrice(selectedOrderGiftItem.campaign_price)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                          🎁 Món quà tặng theo đơn
                        </span>
                        <span className="text-xs text-gray-500 font-medium">x1</span>
                        {eligibleOrderGiftPromo.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsOrderGiftModalOpen(true)}
                            className="text-[11px] font-bold text-secondary bg-orange-100/70 hover:bg-orange-200/80 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            🔄 Đổi món ({eligibleOrderGiftPromo.items.length} lựa chọn)
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOptOutOrderGift(true)}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-xs font-semibold cursor-pointer"
                        title="Bỏ món quà tặng này"
                      >
                        <span>🗑</span>
                        <span>Xoá</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Khi đã bấm bỏ quà đơn hàng nhưng vẫn đủ điều kiện -> cho phép nhận lại quà */}
              {eligibleOrderGiftPromo && optOutOrderGift && (
                <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-dashed border-amber-300 text-xs text-amber-900 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <span className="font-medium">Bạn đủ điều kiện nhận quà tặng ({eligibleOrderGiftPromo.name})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptOutOrderGift(false)}
                    className="font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    + Nhận lại quà
                  </button>
                </div>
              )}

              {/* Món ưu đãi combo Mua X tặng/giảm Y (buy_x_get_y) - Hỗ trợ nhiều chiến dịch */}
              {activeBuyXGetYItems.map(({ promo, item, tag }) => (
                <div key={`buyxy-${promo.id}-${item.id}`} className="flex gap-4 items-start py-3 bg-purple-50/60 rounded-2xl p-3 border border-purple-200/80 animate-fade-in shadow-xs">
                  {item.image ? (
                    <div className="relative size-16 flex-shrink-0 rounded-[10px] overflow-hidden bg-white border border-purple-200">
                      <Image src={item.image} alt={item.product_name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="size-16 flex-shrink-0 rounded-[10px] bg-purple-100 flex items-center justify-center text-xl">
                      🎁
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="title-3 font-display text-gray-900 font-bold">
                        {item.product_name}
                      </p>
                      <div className="text-right shrink-0">
                        {item.original_price > 0 && (
                          <span className="text-xs text-gray-400 line-through block">
                            {formatPrice(item.original_price)}
                          </span>
                        )}
                        <span className="title-3 text-purple-700 font-bold">
                          {item.campaign_price === 0 ? "0đ" : formatPrice(item.campaign_price)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">x1</span>
                        {promo.items && promo.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedBuyXGetYPromoForModal(promo)}
                            className="text-[11px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            🔄 Đổi món ({promo.items.length} lựa chọn)
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOptOutBuyXGetYSet((prev) => ({ ...prev, [promo.id]: true }))}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-xs font-semibold cursor-pointer"
                        title="Bỏ món ưu đãi này"
                      >
                        <span>🗑</span>
                        <span>Xoá</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Khi đã bấm bỏ ưu đãi combo Mua X tặng Y nhưng vẫn đủ điều kiện -> cho phép nhận lại */}
              {eligibleBuyXGetYPromos
                .filter((promo) => optOutBuyXGetYSet[promo.id])
                .map((promo) => (
                  <div
                    key={`optout-${promo.id}`}
                    className="flex items-center justify-between p-3 bg-purple-50/70 rounded-xl border border-dashed border-purple-300 text-xs text-purple-900 animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <span className="font-medium">Bạn đủ điều kiện nhận ưu đãi ({promo.name})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOptOutBuyXGetYSet((prev) => ({ ...prev, [promo.id]: false }))}
                      className="font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      + Nhận lại ưu đãi
                    </button>
                  </div>
                ))}
            </div>

            {upcomingOrderGiftPromo && (
              <div className="bg-amber-50/80 rounded-[14px] p-3 border border-amber-200/70 flex items-center gap-2.5 text-xs text-amber-900 animate-fade-in">
                <span className="text-lg">🎁</span>
                <span>
                  Mua thêm <strong>{(upcomingOrderGiftPromo.min_order_value - subtotal).toLocaleString("vi-VN")}đ</strong> để được tặng <strong>1 món quà miễn phí</strong> ({upcomingOrderGiftPromo.name})!
                </span>
              </div>
            )}

            {upcomingBuyXGetYPromo && (
              <div className="bg-purple-50/80 rounded-[14px] p-3 border border-purple-200/70 flex items-center gap-2.5 text-xs text-purple-900 animate-fade-in">
                <span className="text-lg">🎁</span>
                <span>
                  Mua thêm <strong>{Math.max(1, Number(upcomingBuyXGetYPromo.settings?.buy_quantity || 2) - totalCartQuantity)} món</strong> để nhận ưu đãi (<strong>Mua {upcomingBuyXGetYPromo.settings?.buy_quantity || 2} {upcomingBuyXGetYPromo.discount_type === 'percent' && upcomingBuyXGetYPromo.discount_value === 100 ? 'tặng' : 'giảm'} {upcomingBuyXGetYPromo.settings?.gift_quantity || 1} - {upcomingBuyXGetYPromo.name}</strong>)!
                </span>
              </div>
            )}

            {/* Hộp nhập mã giảm giá & Nút chọn mã */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="body-1 font-display text-primary font-bold flex items-center gap-1.5">
                  <span>🎟️</span>
                  <span>Mã giảm giá (Voucher)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="text-xs font-bold text-secondary hover:text-secondary/80 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Chọn hoặc xem mã</span>
                  <span className="text-sm leading-none">›</span>
                </button>
              </div>

              <div className="flex items-center border border-gray-300 rounded-full p-1 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!appliedVoucher && !validatingVoucher && voucherCode.trim()) {
                        handleApplyVoucher();
                      }
                    }
                  }}
                  readOnly={!!appliedVoucher}
                  disabled={validatingVoucher}
                  style={{ backgroundColor: "transparent" }}
                  className="flex-1 !bg-transparent px-4 py-2 text-gray-900 focus:outline-none text-base uppercase placeholder-gray-400 font-semibold tracking-wider"
                  placeholder="Mã Voucher"
                />
                {appliedVoucher ? (
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-5 py-2 rounded-full text-sm transition-all border border-red-200/60 shrink-0 cursor-pointer"
                  >
                    Xóa
                  </button>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="bg-amber-50 hover:bg-amber-100 text-primary font-bold px-3.5 py-2 rounded-full text-xs transition-all border border-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      Chọn mã
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher()}
                      disabled={validatingVoucher || !voucherCode.trim()}
                      className="bg-[#142A68] hover:bg-[#142A68]/95 text-white font-bold px-5 py-2 rounded-full text-sm transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      {validatingVoucher ? "Đang check..." : "Áp dụng"}
                    </button>
                  </div>
                )}
              </div>
              {voucherError && (
                <p className="text-xs text-red-600 font-semibold px-2">{voucherError}</p>
              )}
              {voucherSuccess && (
                <div className="text-xs text-emerald-600 font-semibold px-2 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <span>✓</span> <span>{voucherSuccess}</span>
                  </p>
                  {appliedVoucher?.prereqPrice ? (
                    <p className="text-[11px] text-gray-500 font-normal">
                      * Áp dụng cho đơn hàng từ {appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ trở lên.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Smart Cart Progress Bar (Thanh tiến độ thông minh) */}
            <SmartCartProgressBar
              subtotal={subtotal}
              shippingSettings={shippingSettings}
              isFreeship={isFreeship}
              freeshipReason={freeshipReason}
              vouchers={availableVouchers}
              onOpenVouchers={() => setIsVoucherModalOpen(true)}
            />

            {/* Hộp tính giá (Blue-Gray rounded container) */}
            <div className="bg-gray-50 rounded-[16px] p-4 space-y-3 border border-gray-100/80">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <span>Vận chuyển</span>
                  {calculatingShipping && (
                    <span className="text-xs text-gray-400 animate-pulse">(Đang tính...)</span>
                  )}
                </span>
                <div className="text-right">
                  {deliveryType === "pickup" ? (
                    <span className="text-emerald-600 font-bold">0đ (Tự đến lấy)</span>
                  ) : !isDeliverable || (!selectedWard && !selectedWardId) ? (
                    <span className="text-gray-500 font-bold text-base">--</span>
                  ) : isFreeship ? (
                    <div className="flex items-center gap-2">
                      {originalFee > 0 && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(originalFee)}
                        </span>
                      )}
                      <span className="text-emerald-600 font-bold text-base">0đ</span>
                    </div>
                  ) : shipping > 0 ? (
                    <span className="text-primary font-bold text-base">
                      {formatPrice(shipping)}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-bold text-base">--</span>
                  )}
                </div>
              </div>

              {/* Thẻ Cảnh báo Chưa hỗ trợ giao hàng */}
              {deliveryType === "delivery" && !isDeliverable && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 font-medium space-y-1.5 animate-fade-in">
                  <p className="flex items-center gap-1.5 text-red-900 font-bold text-sm">
                    <span>⚠️</span>
                    <span>Khu vực này hiện chưa hỗ trợ giao hàng tận nơi.</span>
                  </p>
                  <p className="text-red-700 leading-relaxed">
                    Vui lòng chọn <strong>"Tự đến lấy tại chi nhánh"</strong> hoặc liên hệ Hotline:{" "}
                    <a href={`tel:${hotline.replace(/[^0-9+]/g, "")}`} className="font-bold underline text-red-900 hover:text-red-950">
                      {hotline}
                    </a>{" "}
                    để được hỗ trợ.
                  </p>
                </div>
              )}

              {/* Giảm giá chiến dịch đơn hàng (order_discount) */}
              {autoOrderDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-emerald-600 border-t border-gray-200/60 pt-2.5 animate-fade-in">
                  <span className="flex items-center gap-1.5">
                    <span>{eligibleOrderDiscountPromo?.name}</span>
                    <button
                      type="button"
                      onClick={() => setOptOutOrderDiscount(true)}
                      className="text-xs text-red-500 hover:underline font-semibold cursor-pointer ml-1"
                      title="Bỏ áp dụng giảm giá này"
                    >
                      [Xoá]
                    </button>
                  </span>
                  <span className="font-bold text-base">
                    -{formatPrice(autoOrderDiscountAmount)}
                  </span>
                </div>
              )}

              {eligibleOrderDiscountPromo && optOutOrderDiscount && (
                <div className="flex items-center justify-between py-1 text-xs text-gray-500 border-t border-gray-200/60 pt-2 animate-fade-in">
                  <span>🏷 Đã bỏ giảm KM ({eligibleOrderDiscountPromo.name})</span>
                  <button
                    type="button"
                    onClick={() => setOptOutOrderDiscount(false)}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Áp dụng lại
                  </button>
                </div>
              )}

              {appliedVoucher && voucherDiscount > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-emerald-600 border-t border-gray-200/60 pt-2.5">
                  <span>Giảm giá (Voucher)</span>
                  <span className="font-bold text-base">
                    -{formatPrice(voucherDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-gray-200/80 pt-3">
                <span className="text-gray-900 font-bold text-base">Tổng cộng</span>
                <span className="text-xl font-display text-primary font-bold">
                  {formatPrice(total)}
                </span>
              </div>

              {user && total > 0 && (
                <div className="text-xs text-emerald-600 font-semibold text-right flex items-center justify-end gap-1.5 pt-2 border-t border-dashed border-gray-200">
                  <svg className="h-3.5 w-3.5 shrink-0 overflow-visible" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            {/* Nút submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (isCartCheckout && cartItems.length === 0) || !confirmInfo || (deliveryType === "delivery" && !isDeliverable)}
              className="w-full bg-secondary hover:bg-secondary/95 active:scale-[0.98] text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-60 disabled:scale-100 disabled:pointer-events-none"
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
        </div>
      </div>

      <PreOrderNoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        notice={operatingStatus.notice}
      />

      <CouponModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        subtotal={subtotal}
        shippingFee={shipping}
        appliedVoucherCode={appliedVoucher?.code || ""}
        onApplyVoucher={(code) => handleApplyVoucher(code)}
        onRemoveVoucher={handleRemoveVoucher}
      />

      {/* Order Gift Selector Modal */}
      {eligibleOrderGiftPromo && (
        <GiftSelectorModal
          isOpen={isOrderGiftModalOpen}
          onClose={() => setIsOrderGiftModalOpen(false)}
          title="Chọn món quà tặng đơn hàng"
          subtitle={`Chương trình: ${eligibleOrderGiftPromo.name}`}
          items={eligibleOrderGiftPromo.items || []}
          selectedId={selectedOrderGiftId}
          onSelect={(item) => setSelectedOrderGiftId(item.id)}
        />
      )}

      {/* Buy X Get Y Gift Selector Modal */}
      {selectedBuyXGetYPromoForModal && (
        <GiftSelectorModal
          isOpen={!!selectedBuyXGetYPromoForModal}
          onClose={() => setSelectedBuyXGetYPromoForModal(null)}
          title="Chọn món ưu đãi combo"
          subtitle={`Chương trình: ${selectedBuyXGetYPromoForModal.name}`}
          items={selectedBuyXGetYPromoForModal.items || []}
          selectedId={selectedBuyXGetYMap[selectedBuyXGetYPromoForModal.id] || selectedBuyXGetYPromoForModal.items?.[0]?.id}
          onSelect={(item) => {
            setSelectedBuyXGetYMap((prev) => ({
              ...prev,
              [selectedBuyXGetYPromoForModal.id]: item.id,
            }));
          }}
        />
      )}
    </>
  );
}
