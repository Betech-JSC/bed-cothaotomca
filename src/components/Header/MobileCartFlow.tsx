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
  getAvailableVouchers,
  getCheckoutConfig,
  getShippingSettings,
  validateVoucher,
  type AdministrativeProvince,
  type AdministrativeWard,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
  type PublicVoucherItem,
  type ShippingSettings,
  OrderApiError,
} from "@/services/orderService";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import { getGeneralSettings } from "@/services/generalSettingService";
import { useAuth } from "@/contexts/AuthContext";
import { checkOperatingHours, formatVietnameseDate, generate15MinTimeSlots, getVietnamDate, isTodayOutOfScheduleSlots, toISODateString } from "@/lib/operatingHours";
import PreOrderNoticeModal from "@/components/Checkout/PreOrderNoticeModal";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";
import Chevron from "@/components/Icons/Chevron";
import CouponModal from "@/components/Voucher/CouponModal";
import SmartCartProgressBar from "@/components/Cart/SmartCartProgressBar";
import GiftSelectorModal from "@/components/Checkout/GiftSelectorModal";

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
    canCombineWithPromotions?: boolean;
    canCombineWithFreeship?: boolean;
    discountAmount?: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  useEffect(() => {
    setIsVoucherModalOpen(false);
  }, [isCartOpen]);

  useEffect(() => {
    getAvailableVouchers().then(setAvailableVouchers).catch(() => setAvailableVouchers([]));
  }, []);

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
              branchName: (b as any).branchName || (b as any).name || b.title || b.address || `Chi nhánh #${b.id}`,
              address: b.address,
              contactNumber: b.phone || (b as any).contactNumber || "",
              isActive: true
            }))
            : [
              {
                id: 1000021387,
                branchName: "GV - Cô Thảo Tôm Cá",
                address: "1073 Phan Văn Trị, Phường Gò Vấp, Thành phố Hồ Chí Minh",
                contactNumber: "+84 779 222 173",
                isActive: true,
              },
              {
                id: 1000000211,
                branchName: "HS - Cô Thảo Tôm Cá",
                address: "197 Hoàng Sa, Phường Tân Định, Hồ Chí Minh - Quận 1",
                contactNumber: "+84 867 608 971",
                isActive: true,
              },
              {
                id: 1000021173,
                branchName: "TB - Cô Thảo Tôm Cá",
                address: "39 Thân Nhân Trung, Phường Tân Bình, Thành phố Hồ Chí Minh",
                contactNumber: "+84 364 612 395",
                isActive: true,
              },
              {
                id: 1333367,
                branchName: "TDX - Cô Thảo Tôm Cá",
                address: "42/2 Trần Đình xu, Phường Cô Giang, Hồ Chí Minh - Quận 1",
                contactNumber: "+84 357 377 527",
                isActive: true,
              },
              {
                id: 1363270,
                branchName: "Thủ Đức - Cô Thảo Tôm Cá",
                address: "69A Trương Văn Thành, Phường Hiệp Phú, Hồ Chí Minh - Thành phố Thủ Đức",
                contactNumber: "+84 901 193 964",
                isActive: true,
              },
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
    const codeUpper = appliedVoucher.code.toUpperCase();
    const type = appliedVoucher.discountType;

    if (type === "percent" || codeUpper.includes("PCT")) {
      const pct = appliedVoucher.value;
      const calculated = Math.round(subtotal * (pct / 100));
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

  // Total cart items count (for buy_x_get_y check)
  const totalCartQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cartItems]);

  // Opt-out state for promotions
  const [optOutOrderDiscount, setOptOutOrderDiscount] = useState(false);

  // 1. ORDER DISCOUNT PROMOTION (Giảm giá theo giá trị đơn)
  const eligibleOrderDiscountPromo = useMemo(() => {
    return (
      config?.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_discount" &&
          subtotal >= (p.min_order_value || 0)
      ) || null
    );
  }, [config?.active_promotions, subtotal]);

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
      config?.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          subtotal >= (p.min_order_value || 0)
      ) || null
    );
  }, [config?.active_promotions, subtotal]);

  const upcomingOrderGiftPromo = useMemo(() => {
    if (eligibleOrderGiftPromo || !config?.active_promotions) return null;
    return (
      config.active_promotions.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          subtotal < (p.min_order_value || 0)
      ) || null
    );
  }, [config?.active_promotions, eligibleOrderGiftPromo, subtotal]);

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
    if (!config?.active_promotions) return [];
    return config.active_promotions.filter((p) => {
      if (p.promotion_type !== "buy_x_get_y" || !p.items || p.items.length === 0) return false;
      const buyQty = Number(p.settings?.buy_quantity || 2);
      return totalCartQuantity >= buyQty;
    });
  }, [config?.active_promotions, totalCartQuantity]);

  const upcomingBuyXGetYPromo = useMemo(() => {
    if (!config?.active_promotions) return null;
    return (
      config.active_promotions.find((p) => {
        if (p.promotion_type !== "buy_x_get_y" || !p.items || p.items.length === 0) return false;
        const buyQty = Number(p.settings?.buy_quantity || 2);
        return totalCartQuantity < buyQty;
      }) || null
    );
  }, [config?.active_promotions, totalCartQuantity]);

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
          ? `Mua ${buyQty} tặng ${giftQty}`
          : `Mua ${buyQty} giảm ${giftQty}`;
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

  const total = Math.max(0, subtotal + promoItemsExtraPrice - voucherDiscount - autoOrderDiscountAmount + shipping);

  // Apply Voucher
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
      const hasCampaign = cartItems.some(i => (i.originalPrice && i.originalPrice > i.unitPrice)) || autoOrderDiscountAmount > 0;
      const campaignDiscount = autoOrderDiscountAmount;
      const result = await validateVoucher(code, subtotal, shipping, hasCampaign, campaignDiscount);
      if (result.valid && result.voucher) {
        setAppliedVoucher({
          id: result.voucher.id,
          code: result.voucher.code,
          value: result.voucher.value,
          discountType: result.voucher.discount_type,
          maxDiscount: result.voucher.max_discount,
          campaignId: result.voucher.campaign_id,
          prereqPrice: result.voucher.prereq_price,
          isFreeship: result.voucher.is_freeship,
          canCombineWithPromotions: result.voucher.can_combine_with_promotions,
          canCombineWithFreeship: result.voucher.can_combine_with_freeship,
          discountAmount: result.discount_amount,
        });
        setVoucherSuccess(result.message || "Áp dụng mã giảm giá thành công.");
        return true;
      } else {
        setVoucherError(result.message || "Mã giảm giá không hợp lệ.");
        throw new Error(result.message || "Mã giảm giá không hợp lệ.");
      }
    } catch (err: any) {
      const msg = err?.message || "Lỗi kiểm tra mã giảm giá.";
      setVoucherError(msg);
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
        items: [
          ...cartItems.map((item) => ({
            product_id: item.productId,
            product_code: item.productCode,
            product_name: item.title,
            quantity: item.quantity,
            price: item.unitPrice,
            discount: 0,
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
            note: `${tag} (${promo.name})`,
          }))),
        ],
        discount: voucherDiscount + autoOrderDiscountAmount,
        description: [
          cartItems.map((item) => `${item.title} (${item.variant}) x${item.quantity}`).join(", "),
          autoOrderDiscountAmount > 0 ? `KM đơn hàng: -${autoOrderDiscountAmount.toLocaleString("vi-VN")}đ (${eligibleOrderDiscountPromo?.name || ""})` : "",
          ...activeBuyXGetYItems.map(({ promo, item, tag }) => `Ưu đãi combo: ${item.product_name} (${item.campaign_price === 0 ? "0đ" : `${item.campaign_price.toLocaleString("vi-VN")}đ`} - ${tag})`),
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
      <div className={inline ? "w-full p-4 flex flex-col justify-start" : "fixed inset-0 bg-yellow z-[160] overflow-y-auto p-4 flex flex-col justify-start"}>
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
    <div className={inline ? "w-full text-gray-900 select-none" : "fixed inset-0 bg-yellow z-[160] overflow-y-auto p-4 text-gray-900 select-none"}>
      <div className={inline ? "w-full space-y-6" : "max-w-md mx-auto w-full py-4 space-y-6"}>
        {/* Header bar */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-primary hover:text-secondary text-2xl font-bold flex items-center cursor-pointer"
                aria-label={t("title")}
              >
                &#8592;
              </button>
            )}
            <h2 className="display-3 font-display text-primary font-bold">{t("title")}</h2>
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
                {t("order_summary")}
              </h3>

              {cartItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="body-1 text-gray-500 font-medium">{t("empty")}</p>
                  <button
                    onClick={onClose}
                    className="inline-block text-sm font-semibold text-secondary hover:underline"
                  >
                    {t("continue_shopping")}
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
                          <div className="text-right shrink-0">
                            {item.originalPrice && item.originalPrice > item.unitPrice ? (
                              <p className="text-xs font-semibold text-gray-400 line-through leading-tight">
                                {formatPrice(item.originalPrice)}
                              </p>
                            ) : null}
                            <span className="title-3 text-primary font-bold whitespace-nowrap leading-tight">
                              {formatPrice(item.unitPrice)}
                            </span>
                          </div>
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
                            {t("remove_voucher")}
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
                  <div className="flex items-center justify-between">
                    <label className="body-1 text-primary font-bold">
                      {t("voucher_label")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="text-xs font-bold text-secondary hover:text-secondary/80 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{t("select_or_view_voucher")}</span>
                      <span className="text-sm leading-none">›</span>
                    </button>
                  </div>
                  <div className="flex items-center rounded-full border border-gray-200 bg-white p-1 pl-4 focus-within:border-primary transition-all">
                    <input
                      type="text"
                      placeholder={t("voucher_input_placeholder")}
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
                      className="flex-1 !bg-transparent text-gray-900 focus:outline-none text-base uppercase placeholder-gray-400 font-semibold"
                    />
                    {appliedVoucher ? (
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-full px-5 py-2 text-sm transition-all border border-red-200/60"
                      >
                        {t("remove_voucher")}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsVoucherModalOpen(true)}
                          className="bg-yellow hover:bg-yellow/80 text-primary font-bold rounded-full px-3.5 py-2 text-xs transition-all border border-secondary/30 cursor-pointer whitespace-nowrap"
                        >
                          {t("select_voucher_btn")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyVoucher()}
                          disabled={validatingVoucher || !voucherCode.trim()}
                          className="bg-primary hover:bg-primary/95 text-white font-bold rounded-full px-5 py-2 text-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {validatingVoucher ? t("checking_voucher") : t("apply_voucher")}
                        </button>
                      </div>
                    )}
                  </div>
                  {voucherError && <p className="text-sm text-red-600 font-semibold mt-1">{voucherError}</p>}
                  {voucherSuccess && (
                    <div className="text-xs text-secondary font-semibold mt-1 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <span>✓</span> <span>{voucherSuccess}</span>
                      </p>
                      {appliedVoucher?.prereqPrice ? (
                        <p className="text-[11px] text-gray-500 font-normal">
                          {t("voucher_prereq_note", { amount: appliedVoucher.prereqPrice.toLocaleString("vi-VN") })}
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

                {/* Summary Panel */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">{t("subtotal")}</span>
                    <span className="text-primary font-bold font-display">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">{t("shipping_fee")}</span>
                    <span className="text-primary font-bold font-display">
                      {!selectedDistrict ? "--" : isFreeship ? "0đ" : shipping > 0 ? formatPrice(shipping) : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">{t("voucher_label")}</span>
                    <span className="text-primary font-bold font-display">{formatPrice(voucherDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base pt-2 border-t border-gray-100">
                    <span className="text-gray-900 font-bold">{t("total")}</span>
                    <span className="text-secondary font-bold font-display text-lg">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Submit button step 1 */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2"
                >
                  {t("checkout")}
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
              className={`p-4 rounded-xl border transition-colors ${operatingStatus.canOrderNow
                ? "bg-yellow/60 border-secondary/30 text-brown"
                : "bg-yellow/80 border-secondary/30 text-brown"
                }`}
            >
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
                <span>{t("order_summary")}</span>
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
                              <div className="text-right shrink-0">
                                {item.originalPrice && item.originalPrice > item.unitPrice ? (
                                  <p className="text-[10px] font-semibold text-gray-400 line-through leading-tight">
                                    {formatPrice(item.originalPrice)}
                                  </p>
                                ) : null}
                                <span className="body-2 text-primary font-bold whitespace-nowrap leading-tight">{formatPrice(item.unitPrice)}</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase">
                              {isDefaultVariant(item.variant) ? `x${item.quantity}` : `${cleanVariantName(item.variant)} x${item.quantity}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* Quà tặng đơn hàng (order_gift_discount) */}
                      {selectedOrderGiftItem && (
                        <div className="flex gap-3 py-2.5 px-3 bg-yellow/60 rounded-xl border border-secondary/30 items-start">
                          {selectedOrderGiftItem.image ? (
                            <div className="relative size-12 rounded-lg overflow-hidden bg-white border border-secondary/20 flex-shrink-0">
                              <Image
                                src={selectedOrderGiftItem.image}
                                alt={selectedOrderGiftItem.product_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="size-12 rounded-lg bg-yellow/80 border border-secondary/20 flex items-center justify-center text-[10px] font-bold text-brown uppercase flex-shrink-0 text-center">
                              {t("order_gift_tag")}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="body-2 text-gray-900 font-bold font-display line-clamp-1">{selectedOrderGiftItem.product_name}</p>
                              <span className="body-2 text-secondary font-bold whitespace-nowrap">
                                {selectedOrderGiftItem.campaign_price === 0 ? "0đ" : formatPrice(selectedOrderGiftItem.campaign_price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[10px] text-secondary font-bold uppercase">
                                  {t("order_gift_tag")} x1
                                </p>
                                {eligibleOrderGiftPromo.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setIsOrderGiftModalOpen(true)}
                                    className="text-[10px] font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-2 py-0.2 rounded-full transition-colors cursor-pointer"
                                  >
                                    {t("change_gift", { count: eligibleOrderGiftPromo.items.length })}
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setOptOutOrderGift(true)}
                                className="text-[11px] text-gray-400 hover:text-red-500 font-semibold cursor-pointer"
                                title={t("remove_gift")}
                              >
                                [{t("remove_voucher")}]
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {eligibleOrderGiftPromo && optOutOrderGift && (
                        <div className="flex items-center justify-between p-2.5 bg-yellow/50 rounded-xl border border-dashed border-secondary/30 text-xs text-brown animate-fade-in">
                          <span className="font-medium">{t("reclaim_gift_eligible", { name: eligibleOrderGiftPromo.name })}</span>
                          <button
                            type="button"
                            onClick={() => setOptOutOrderGift(false)}
                            className="font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-2.5 py-0.5 rounded-full text-xs cursor-pointer"
                          >
                            + {t("reclaim_gift")}
                          </button>
                        </div>
                      )}

                      {/* Món ưu đãi Mua X tặng/giảm Y (buy_x_get_y) - Hỗ trợ nhiều chiến dịch */}
                      {activeBuyXGetYItems.map(({ promo, item, tag }) => (
                        <div key={`m-buyxy-${promo.id}-${item.id}`} className="flex gap-3 py-2.5 px-3 bg-yellow/40 rounded-xl border border-primary/15 items-start">
                          {item.image ? (
                            <div className="relative size-12 rounded-lg overflow-hidden bg-white border border-primary/20 flex-shrink-0">
                              <Image
                                src={item.image}
                                alt={item.product_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="size-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase flex-shrink-0 text-center">
                              {t("combo_tag")}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="body-2 text-gray-900 font-bold font-display line-clamp-1">{item.product_name}</p>
                              <span className="body-2 text-primary font-bold whitespace-nowrap">
                                {item.campaign_price === 0 ? "0đ" : formatPrice(item.campaign_price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[10px] text-primary font-bold uppercase">
                                  {tag}
                                </p>
                                {promo.items && promo.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBuyXGetYPromoForModal(promo)}
                                    className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.2 rounded-full transition-colors cursor-pointer"
                                  >
                                    {t("change_gift", { count: promo.items.length })}
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setOptOutBuyXGetYSet((prev) => ({ ...prev, [promo.id]: true }))}
                                className="text-[11px] text-gray-400 hover:text-red-500 font-semibold cursor-pointer"
                                title={t("remove_gift")}
                              >
                                [{t("remove_voucher")}]
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {eligibleBuyXGetYPromos
                        .filter((promo) => optOutBuyXGetYSet[promo.id])
                        .map((promo) => (
                          <div
                            key={`m-optout-${promo.id}`}
                            className="flex items-center justify-between p-2.5 bg-yellow/50 rounded-xl border border-dashed border-primary/25 text-xs text-primary animate-fade-in"
                          >
                            <span className="font-medium">{t("reclaim_combo_eligible", { name: promo.name })}</span>
                            <button
                              type="button"
                              onClick={() => setOptOutBuyXGetYSet((prev) => ({ ...prev, [promo.id]: false }))}
                              className="font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-full text-xs"
                            >
                              + {t("reclaim_combo")}
                            </button>
                          </div>
                        ))}
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t("subtotal")}</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t("shipping_fee")}</span>
                        <span className="font-semibold">{formatPrice(shipping)}</span>
                      </div>
                      {autoOrderDiscountAmount > 0 && (
                        <div className="flex justify-between items-start gap-2 text-secondary font-semibold">
                          <div className="flex-1 min-w-0 pr-1 leading-snug">
                            <span>{eligibleOrderDiscountPromo?.name}</span>
                            <button
                              type="button"
                              onClick={() => setOptOutOrderDiscount(true)}
                              className="text-[11px] text-red-500 hover:text-red-700 hover:underline font-semibold cursor-pointer ml-1.5 whitespace-nowrap inline-block"
                              title={t("remove_gift")}
                            >
                              [{t("remove_voucher")}]
                            </button>
                          </div>
                          <span className="font-semibold shrink-0 whitespace-nowrap text-right leading-snug">
                            -{formatPrice(autoOrderDiscountAmount)}
                          </span>
                        </div>
                      )}
                      {eligibleOrderDiscountPromo && optOutOrderDiscount && (
                        <div className="flex justify-between items-center text-gray-500 text-[11px] gap-2">
                          <span className="flex-1 min-w-0 truncate">({eligibleOrderDiscountPromo.name})</span>
                          <button
                            type="button"
                            onClick={() => setOptOutOrderDiscount(false)}
                            className="text-primary hover:underline font-bold shrink-0 whitespace-nowrap"
                          >
                            {t("reapply_voucher")}
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-500 flex-1 min-w-0">{t("voucher_label")}</span>
                        <span className="font-semibold shrink-0 whitespace-nowrap text-right">{formatPrice(voucherDiscount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold border-t border-gray-100 pt-2 text-primary gap-2">
                        <span className="flex-1 min-w-0">{t("total")}</span>
                        <span className="text-secondary shrink-0 whitespace-nowrap text-right">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {upcomingOrderGiftPromo && (
              <div className="bg-yellow/60 rounded-[14px] p-3 border border-secondary/30 flex items-center gap-2.5 text-xs text-brown animate-fade-in">
                <span>
                  {t.rich("buy_more_gift_prompt", {
                    amount: formatPrice(upcomingOrderGiftPromo.min_order_value - subtotal),
                    name: upcomingOrderGiftPromo.name,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </div>
            )}

            {upcomingBuyXGetYPromo && (
              <div className="bg-primary/5 rounded-[14px] p-3 border border-primary/20 flex items-center gap-2.5 text-xs text-primary animate-fade-in">
                <span>
                  {t.rich("buy_more_combo_prompt", {
                    quantity: Math.max(1, Number(upcomingBuyXGetYPromo.settings?.buy_quantity || 2) - totalCartQuantity),
                    buyQty: upcomingBuyXGetYPromo.settings?.buy_quantity || 2,
                    action: upcomingBuyXGetYPromo.discount_type === 'percent' && upcomingBuyXGetYPromo.discount_value === 100 ? 'tặng' : 'giảm',
                    giftQty: upcomingBuyXGetYPromo.settings?.gift_quantity || 1,
                    name: upcomingBuyXGetYPromo.name,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </div>
            )}

            {/* Checkout contact details */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-6 font-serif">
              <h3 className="title-2 font-display text-primary font-bold border-b border-gray-100 pb-2">
                {t("customer_info")}
              </h3>

              {error && !fieldErrors["delivery.expected_delivery"] && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("name")}</label>
                <input
                  type="text"
                  placeholder={t("name_placeholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
                {fieldErrors.name && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.name}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("phone")}</label>
                <input
                  type="tel"
                  placeholder={t("phone_placeholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
                {fieldErrors.phone && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.phone}</p>}
              </div>

              {/* Email */}
              <div className="space-y-3">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("email_label")}</label>
                <input
                  type="email"
                  placeholder={t("email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                />
              </div>

              {/* Delivery method toggle button */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("delivery_type")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={`py-2 px-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${deliveryType === "delivery"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 bg-white"
                      }`}
                  >
                    {t("delivery_home")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={`py-2 px-3 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${deliveryType === "pickup"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 text-gray-600 bg-white"
                      }`}
                  >
                    {t("delivery_pickup")}
                  </button>
                </div>
              </div>

              {/* Delivery address details selection */}
              {deliveryType === "delivery" ? (
                <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-100 mt-2">
                  <p className="text-sm text-gray-700 font-bold font-serif">{t("delivery_home")}</p>

                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("province_label")}</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        setSelectedProvince(newProv);
                        setSelectedDistrict("");
                        setSelectedWard("");
                        setSelectedWardId("");
                      }}
                      className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
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
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("street_label")}</label>
                    <input
                      type="text"
                      placeholder={t("address_placeholder")}
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base font-serif font-normal leading-[150%] tracking-[0%]"
                    />
                    {fieldErrors.address && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.address}</p>}
                  </div>

                  {assignedBranchName && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary font-medium">
                      {t.rich("auto_assigned_branch", {
                        branchName: assignedBranchName,
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </div>
                  )}

                  {shippingMessage && (
                    <p className={`text-xs font-semibold mt-1.5 ${!isDeliverable ? "text-red-600" : "text-secondary"}`}>
                      {shippingMessage}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-100 mt-2">
                  <div className="space-y-3">
                    <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("pickup_branch_label")}</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                      className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base cursor-pointer font-serif font-normal leading-[150%] tracking-[0%]"
                    >
                      {config?.branches.map((b) => (
                        <option key={b.id} value={b.id} className="text-gray-900 bg-white py-1">
                          {b.branchName || b.address || (b as any).title || `Chi nhánh #${b.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {config?.branches.find(b => b.id === selectedBranchId) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-1.5 shadow-sm text-sm text-gray-600 font-serif">
                      <p>{t("pickup_address_label")} {config?.branches.find(b => b.id === selectedBranchId)?.address}</p>
                      <p>Hotline: {config?.branches.find(b => b.id === selectedBranchId)?.contactNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("note")}</label>
                <textarea
                  placeholder={t("note_placeholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base resize-none h-16 font-serif font-normal leading-[150%] tracking-[0%]"
                ></textarea>
              </div>

              {/* Expected time & date */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                  {deliveryType === "pickup" ? t("pickup_time_label") : t("delivery_time_label")}
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
                          {deliveryType === "pickup" ? t("pickup_now") : t("delivery_now")}
                        </span>
                      </label>

                      {/* Footnote dưới Option 1: Chỉ hiển thị khi chọn Giao ngay VÀ thời gian hiện tại trước 10:00 AM */}
                      {deliverySchedule === "now" && operatingStatus.currentTime < (operatingStatus.deliveryOpen || "10:00") && (
                        <p className="text-xs text-secondary font-medium pl-6 mt-1">
                          {t("early_morning_note", { openTime: operatingStatus.deliveryOpen || "10:00" })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Nếu sau 22:30 (ngưng giao ngay), chỉ hiển thị thông báo chuyển qua Hẹn giờ */}
                  {!operatingStatus.canOrderNow && (
                    <div className="p-3 bg-yellow/60 border border-secondary/30 rounded-lg text-xs text-brown leading-relaxed font-medium space-y-1">
                      <p className="font-semibold text-primary">
                        {t("cutoff_notice_title", { cutoff: operatingStatus.lastOrderCutoff || "22:30" })}
                      </p>
                      <p>{t("cutoff_notice_desc", { openTime: operatingStatus.deliveryOpen || "10:00", targetDate: operatingStatus.notice?.targetDateDisplay || "ngày mai" })}</p>
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
                        {deliveryType === "pickup" ? t("schedule_pickup") : t("schedule_delivery")}
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
                            className="w-full h-11 rounded-lg border border-gray-300 shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer appearance-none"
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
                            className={`w-full h-11 rounded-lg border shadow-sm px-3 pr-8 bg-white text-gray-900 focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer appearance-none ${fieldErrors["delivery.expected_delivery"] ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
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
                <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">{t("payment_method_label")}</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="accent-primary"
                    />
                    <span>{t("payment_cod_desc")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === "TRANSFER"}
                      onChange={() => setPaymentMethod("TRANSFER")}
                      className="accent-primary"
                    />
                    <span>{t("payment_qr_desc")}</span>
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
                        ? "bg-primary border-primary text-white"
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
                  <span>{t("confirm_info_checkbox")}</span>
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
                ? t("submitting")
                : deliveryType === "delivery" && !isDeliverable
                  ? "Khu vực chưa hỗ trợ giao"
                  : !operatingStatus.canOrderNow
                    ? t("schedule_pickup")
                    : t("place_order")}
            </button>
          </div>
        )}
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
          title={t("order_gift_tag")}
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
          title={t("combo_tag")}
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
    </div>
  );
}
