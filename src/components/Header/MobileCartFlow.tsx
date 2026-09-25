"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, isDefaultVariant, cleanVariantName } from "@/lib/format";
import { useBranches } from "@/contexts/BranchContext";
import {
  calcOrderTotal,
  calculateShippingFee,
  calculateVoucherDiscount,
  createOrder,
  getAdministrativeUnits,
  getAvailableVouchers,
  getCheckoutConfig,
  getShippingSettings,
  validateVoucher,
  FALLBACK_ADMINISTRATIVE_UNITS,
  type AdministrativeProvince,
  type AdministrativeWard,
  type CheckoutConfig,
  type DeliveryType,
  type OrderInitiated,
  type PublicVoucherItem,
  type ShippingSettings,
  type ActivePromotion,
  type PromotionGiftItem,
  OrderApiError,
} from "@/services/orderService";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import { getGeneralSettings } from "@/services/generalSettingService";
import { useAuth, getMemberTier, calculateMemberDiscount } from "@/contexts/AuthContext";
import { checkOperatingHours, formatVietnameseDate, generate15MinTimeSlots, getVietnamDate, isTodayOutOfScheduleSlots, toISODateString } from "@/lib/operatingHours";
import PreOrderNoticeModal from "@/components/Checkout/PreOrderNoticeModal";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";
import Chevron from "@/components/Icons/Chevron";
import CouponModal, { evaluateCampaignEligibility } from "@/components/Voucher/CouponModal";
import SmartCartProgressBar from "@/components/Cart/SmartCartProgressBar";
import GiftSelectorModal from "@/components/Checkout/GiftSelectorModal";
import VoucherTicketBar from "@/components/Checkout/VoucherTicketBar";

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
  const { cartItems, updateQuantity, removeFromCart, clearCart, isCartOpen, hasOutOfStockItems } = useCart();
  const isOutOfStockOverall = hasOutOfStockItems ?? cartItems.some((i) => i.isOutOfStock);
  const { user, token, refreshUser } = useAuth();
  const memberTier = useMemo(() => (user ? getMemberTier(user) : getMemberTier(0)), [user]);
  const router = useRouter();
  const t = useTranslations("checkout");

  const hasRefreshedUserRef = useRef(false);
  useEffect(() => {
    if ((isCartOpen || inline) && user && !hasRefreshedUserRef.current) {
      hasRefreshedUserRef.current = true;
      refreshUser();
    } else if (!isCartOpen && !inline) {
      hasRefreshedUserRef.current = false;
    }
  }, [isCartOpen, inline, user, refreshUser]);

  const [step, setStep] = useState<1 | 2>(inline ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Checkout Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [adminProvinces, setAdminProvinces] = useState<AdministrativeProvince[]>(FALLBACK_ADMINISTRATIVE_UNITS);
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
  const [sessionPrivateVouchers, setSessionPrivateVouchers] = useState<PublicVoucherItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: number;
    code: string;
    short_name?: string | null;
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
  const [appliedShippingVoucher, setAppliedShippingVoucher] = useState<{
    id: number;
    code: string;
    short_name?: string | null;
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
  const [bestDealNotice, setBestDealNotice] = useState<string | null>(null);
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
    return checkOperatingHours(config?.operating_hours, undefined, deliveryType);
  }, [config?.operating_hours, deliveryType]);

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
        console.warn("Failed to load checkout config:", err);
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
              contactNumber: b.phone || (b as any).contactNumber || "024.9999.7122",
              isActive: true
            }))
            : [
              {
                id: 1333367,
                branchName: "Chi nhánh Trần Đình Xu (Q.1)",
                address: "42/2 Trần Đình Xu, Phường Cầu Ông Lãnh (Q.1 cũ), TP. Hồ Chí Minh",
                contactNumber: "024.9999.7122",
                isActive: true,
              },
              {
                id: 1000021173,
                branchName: "Chi nhánh Tân Bình",
                address: "39 Thân Nhân Trung, Phường Tân Bình, TP. Hồ Chí Minh",
                contactNumber: "024.9999.7122",
                isActive: true,
              },
              {
                id: 1363270,
                branchName: "Chi nhánh TP. Thủ Đức",
                address: "69A Trương Văn Thành, Phường Tăng Nhơn Phú, TP. Thủ Đức",
                contactNumber: "024.9999.7122",
                isActive: true,
              },
              {
                id: 1000000211,
                branchName: "Chi nhánh Hoàng Sa (Q.1)",
                address: "197 Hoàng Sa, Phường Tân Định (Q.1 cũ), TP. Hồ Chí Minh",
                contactNumber: "024.9999.7122",
                isActive: true,
              },
              {
                id: 1000021387,
                branchName: "Chi nhánh Gò Vấp",
                address: "1073 Phan Văn Trị, Phường Gò Vấp, TP. Hồ Chí Minh",
                contactNumber: "024.9999.7122",
                isActive: true,
              },
            ]
        });
      });
  }, [branches]);

  // Cart-aware refetch: re-fetch with cartItems whenever cart changes (debounced 300ms)
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;
    const items = cartItems.map((item) => ({ product_id: item.productId }));
    const timer = setTimeout(() => {
      getCheckoutConfig(items)
        .then((cfg) => {
          setConfig(cfg);
        })
        .catch((err) => {
          console.warn("Failed to reload checkout config with cart items:", err);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [cartItems]);

  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [hotline, setHotline] = useState<string>("024.9999.7122");
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [originalFee, setOriginalFee] = useState<number>(0);
  const [shippingDiscount, setShippingDiscount] = useState<number>(0);
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

  // 1. Tiền giảm của khuyến mại món hiện tại: sum((item.originalPrice - item.unitPrice) * quantity) (với các món có originalPrice > unitPrice)
  const totalItemDiscount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.originalPrice && item.originalPrice > item.unitPrice) {
        return sum + (item.originalPrice - item.unitPrice) * item.quantity;
      }
      return sum;
    }, 0);
  }, [cartItems]);

  // 2. Tổng giá trị đơn hàng tính theo Giá gốc: sum(item.originalPrice * quantity)
  const originalSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemOriginalPrice = (item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice;
      return sum + itemOriginalPrice * item.quantity;
    }, 0);
  }, [cartItems]);

  // Tạm tính tính theo giá sale thông thường
  const saleSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  // Trạng thái Best Deal: Khi voucher có canCombineWithPromotions === false được áp dụng
  const isBestDealVoucherApplied = useMemo(() => {
    return Boolean(appliedVoucher && appliedVoucher.canCombineWithPromotions === false);
  }, [appliedVoucher]);

  // Calculate totals
  const lineItems = useMemo(() => {
    return cartItems.map(item => ({
      price: isBestDealVoucherApplied
        ? ((item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice)
        : item.unitPrice,
      quantity: item.quantity,
      discount: 0,
    }));
  }, [cartItems, isBestDealVoucherApplied]);

  const rawSubtotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  }, [lineItems]);

  const [selectedCampaignIds, setSelectedCampaignIds] = useState<(number | string)[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cothaotomca_selected_campaign_ids");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCampaignIds(parsed);
        }
      }
    } catch (e) {
      console.error("Error restoring campaign IDs from localStorage in MobileCartFlow", e);
    }
  }, []);

  const handleApplyCampaigns = useCallback((ids: (number | string)[]) => {
    setSelectedCampaignIds(ids);
    try {
      localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify(ids));
    } catch (e) {
      console.error("Error saving campaign IDs to localStorage in MobileCartFlow", e);
    }
  }, []);

  // Campaign G1 trong giỏ hàng (Mobile Flow)
  const cartCampaignG1 = useMemo(() => {
    if (!config?.active_promotions || config.active_promotions.length === 0) return null;
    if (selectedCampaignIds.length === 0) return null;
    const checkAmount = originalSubtotal > 0 ? originalSubtotal : rawSubtotal;
    const promos = config.active_promotions.filter((p) => {
      return selectedCampaignIds.some((id) => String(id) === String(p.id));
    });
    const orderDiscountPromo = promos.find(
      (p) => p.promotion_type === "order_discount" && checkAmount >= (p.min_order_value || 0)
    );
    if (orderDiscountPromo) return orderDiscountPromo;
    return promos.find((p) => (p.min_order_value || 0) <= checkAmount) || null;
  }, [config?.active_promotions, originalSubtotal, rawSubtotal, selectedCampaignIds]);

  // Ma trận Khuyến mãi 6 Cases (Thông báo Voucher Mobile Flow)
  const promotionMatrixVoucherNotice = useMemo(() => {
    if (!appliedVoucher) return null;
    if (
      cartCampaignG1 &&
      cartCampaignG1.can_combine_with_freeship === false &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship !== false
    ) {
      return `Mã ${appliedVoucher.code} không áp dụng đồng thời với CTKM khác. Đã kích hoạt lại ưu đãi giảm phí vận chuyển cho bạn.`;
    }
    if (
      cartCampaignG1 &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship === false
    ) {
      return `Mã ${appliedVoucher.code} không áp dụng đồng thời với CTKM khác.`;
    }
    if (cartCampaignG1 && appliedVoucher.canCombineWithPromotions === false) {
      return `Mã ${appliedVoucher.code} không áp dụng đồng thời với CTKM khác. Đã ưu tiên áp dụng theo mã của bạn.`;
    }
    return null;
  }, [appliedVoucher, cartCampaignG1]);

  const promotionMatrixShippingNotice = useMemo(() => {
    // Case 4: Mã G2 cấm cả promo & ship
    if (
      appliedVoucher &&
      !appliedVoucher.isFreeship &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship === false
    ) {
      return `Mã ${appliedVoucher.code} không hỗ trợ giảm phí ship.`;
    }

    // Case 3: Mã G2 cấm giảm phí ship
    if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false) {
      return `Mã ${appliedVoucher.code} không áp dụng cùng chương trình giảm phí vận chuyển.`;
    }

    // Case 5: Campaign G1 can_combine_with_freeship = false, chưa add G2 (hoặc G2 không override)
    if (
      cartCampaignG1 &&
      cartCampaignG1.can_combine_with_freeship === false &&
      (!appliedVoucher || appliedVoucher.canCombineWithPromotions !== false)
    ) {
      return `CTKM ${cartCampaignG1.name} không áp dụng cùng chương trình giảm phí vận chuyển.`;
    }

    return null;
  }, [appliedVoucher, cartCampaignG1]);

  useEffect(() => {
    if (deliveryType !== "delivery") {
      setCalculatedFee(0);
      setShippingDiscount(0);
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
      voucher_code: appliedShippingVoucher?.code || appliedVoucher?.code,
      can_combine_with_freeship: appliedVoucher ? appliedVoucher.canCombineWithFreeship : undefined,
      campaign_id: appliedVoucher?.canCombineWithPromotions === false ? undefined : cartCampaignG1?.id,
      campaign_can_combine_with_freeship: appliedVoucher?.canCombineWithPromotions === false ? undefined : cartCampaignG1?.can_combine_with_freeship,
    })
      .then((res) => {
        const isG1BlockingFreeship = Boolean(
          cartCampaignG1 &&
          cartCampaignG1.can_combine_with_freeship === false &&
          !(appliedVoucher && appliedVoucher.canCombineWithPromotions === false && appliedVoucher.canCombineWithFreeship !== false)
        );
        const isG2BlockingFreeship = Boolean(
          appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false
        );
        const isFreeshipBlocked = isG1BlockingFreeship || isG2BlockingFreeship;

        const finalFreeship = isFreeshipBlocked ? false : res.is_freeship;
        const finalFee = isFreeshipBlocked ? res.original_fee : res.shipping_fee;
        const finalDiscount = isFreeshipBlocked ? 0 : (res.shipping_discount ?? (res.original_fee > res.shipping_fee ? res.original_fee - res.shipping_fee : 0));

        setCalculatedFee(finalFee);
        setOriginalFee(res.original_fee);
        setShippingDiscount(finalDiscount);
        setIsFreeship(finalFreeship);
        setFreeshipReason(isFreeshipBlocked ? null : (res.freeship_reason || null));

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
  }, [deliveryType, selectedProvince, selectedDistrict, selectedWard, selectedWardId, rawSubtotal, appliedVoucher, appliedShippingVoucher, config?.branches, cartCampaignG1]);

  const defaultShippingFee = parseFloat(config?.default_shipping_fee || "30000") || 30000;
  const shippingFee = deliveryType === "delivery" ? (isFreeship ? 0 : (calculatedFee || defaultShippingFee)) : 0;

  const { subtotal, shipping } = calcOrderTotal(
    lineItems,
    deliveryType,
    shippingFee,
    0
  );

  // Auto-remove voucher if cart subtotal drops below the minimum required price (Applies to all vouchers including Freeship)
  useEffect(() => {
    if (!appliedVoucher) return;

    if (appliedVoucher.canCombineWithPromotions === false) {
      // 1. Kiểm tra prereqPrice dựa trên originalSubtotal
      if (appliedVoucher.prereqPrice && originalSubtotal < appliedVoucher.prereqPrice) {
        setAppliedVoucher(null);
        setVoucherSuccess(null);
        setBestDealNotice(null);
        setVoucherError(
          `Mã giảm giá đã bị gỡ do đơn hàng hiện tại chưa đủ ${appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ.`
        );
        return;
      }

      // 2. Tính lại voucherDiscountAmount trên originalSubtotal
      const voucherDiscountAmount = calculateVoucherDiscount(
        appliedVoucher,
        originalSubtotal,
        shipping
      );

      // 3. Nếu tổng tiền giảm của CTKM món >= voucherDiscountAmount -> rollback lại CTKM món
      // if (totalItemDiscount >= voucherDiscountAmount) {
      //   setAppliedVoucher(null);
      //   setVoucherSuccess(null);
      //   setVoucherError(null);
      //   setBestDealNotice(
      //     t("best_deal_item_better") ||
      //       "Giá ưu đãi của món đang tốt hơn voucher, hệ thống đã giữ lại mức giảm tối ưu nhất."
      //   );
      // }
    } else {
      // Với voucher cộng dồn, kiểm tra prereqPrice dựa trên saleSubtotal
      if (appliedVoucher.prereqPrice && saleSubtotal < appliedVoucher.prereqPrice) {
        setAppliedVoucher(null);
        setVoucherSuccess(null);
        setBestDealNotice(null);
        setVoucherError(
          `Mã giảm giá đã bị gỡ do đơn hàng hiện tại chưa đủ ${appliedVoucher.prereqPrice.toLocaleString("vi-VN")}đ.`
        );
      }
    }
  }, [appliedVoucher, originalSubtotal, saleSubtotal, totalItemDiscount, shipping]);

  // Auto-prune stale selected campaigns if cart changes and campaign is no longer eligible
  useEffect(() => {
    if (selectedCampaignIds.length === 0) return;
    if (!config?.active_promotions || config.active_promotions.length === 0) return;

    const validCampaignIds = selectedCampaignIds.filter((id) => {
      const promo = config.active_promotions?.find((p) => String(p.id) === String(id));
      if (!promo) return true;
      const res = evaluateCampaignEligibility(promo, {
        subtotal,
        originalSubtotal,
        cartItems,
        isBrowseMode: false,
      });
      return res.eligible;
    });

    if (validCampaignIds.length !== selectedCampaignIds.length) {
      setSelectedCampaignIds(validCampaignIds);
      try {
        localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify(validCampaignIds));
      } catch (e) {
        console.error("Error auto-pruning campaign IDs from localStorage in MobileCartFlow", e);
      }
    }
  }, [selectedCampaignIds, config?.active_promotions, subtotal, originalSubtotal, cartItems]);

  const foodVoucherDiscount = useMemo(() => {
    if (appliedVoucher?.isFreeship || appliedVoucher?.discountType === "freeship") return 0;
    return calculateVoucherDiscount(appliedVoucher, subtotal, shipping);
  }, [appliedVoucher, subtotal, shipping]);

  const shippingVoucherDiscount = useMemo(() => {
    const shipVoucher = appliedShippingVoucher || (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship") ? appliedVoucher : null);
    return calculateVoucherDiscount(shipVoucher, subtotal, shipping);
  }, [appliedShippingVoucher, appliedVoucher, subtotal, shipping]);

  const effectiveShippingFee = Math.max(0, shipping - shippingVoucherDiscount);
  const voucherDiscount = foodVoucherDiscount + shippingVoucherDiscount;

  // Total cart items count (for buy_x_get_y check)
  const totalCartQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cartItems]);

  // 1. ORDER DISCOUNT PROMOTION (Giảm giá theo giá trị đơn - chỉ kích hoạt khi nằm trong selectedCampaignIds)
  const eligibleOrderDiscountPromo = useMemo(() => {
    if (isBestDealVoucherApplied) return null;
    if (selectedCampaignIds.length === 0) return null;
    const promo =
      config?.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_discount" &&
          subtotal >= (p.min_order_value || 0) &&
          selectedCampaignIds.some((id) => String(id) === String(p.id))
      ) || null;
    return promo;
  }, [config?.active_promotions, subtotal, isBestDealVoucherApplied, selectedCampaignIds]);

  const autoOrderDiscountAmount = useMemo(() => {
    if (!eligibleOrderDiscountPromo) return 0;
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
  }, [eligibleOrderDiscountPromo, subtotal]);

  // 2. ORDER GIFT PROMOTION (Quà tặng theo giá trị đơn - chỉ kích hoạt khi nằm trong selectedCampaignIds)
  const eligibleOrderGiftPromo = useMemo(() => {
    if (isBestDealVoucherApplied) return null;
    if (selectedCampaignIds.length === 0) return null;
    const promo =
      config?.active_promotions?.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          subtotal >= (p.min_order_value || 0) &&
          selectedCampaignIds.some((id) => String(id) === String(p.id))
      ) || null;
    return promo;
  }, [config?.active_promotions, subtotal, isBestDealVoucherApplied, selectedCampaignIds]);


  const [selectedOrderGiftId, setSelectedOrderGiftId] = useState<number | null>(null);
  const [isOrderGiftModalOpen, setIsOrderGiftModalOpen] = useState(false);
  const [selectedBuyXGetYPromoForModal, setSelectedBuyXGetYPromoForModal] = useState<ActivePromotion | null>(null);

  useEffect(() => {
    if (eligibleOrderGiftPromo && eligibleOrderGiftPromo.items && eligibleOrderGiftPromo.items.length > 0) {
      setSelectedOrderGiftId((prev) => {
        // State retention: giữ nguyên quà đã chọn nếu vẫn hợp lệ trong campaign và còn khả dụng
        if (prev && eligibleOrderGiftPromo.items.some((i) => i.id === prev && i.is_available !== false)) {
          return prev;
        }
        const firstAvailable = eligibleOrderGiftPromo.items.find((i) => i.is_available !== false);
        return firstAvailable ? firstAvailable.id : null;
      });
    } else {
      // Chỉ reset null khi đơn hàng không còn thỏa mãn min_order_value hoặc không còn campaign quà khả dụng
      setSelectedOrderGiftId(null);
    }
  }, [eligibleOrderGiftPromo]);

  const selectedOrderGiftItem = useMemo(() => {
    if (!eligibleOrderGiftPromo || !selectedOrderGiftId) return null;
    const found = eligibleOrderGiftPromo.items.find((i) => i.id === selectedOrderGiftId);
    if (!found || found.is_available === false) return null;
    return found;
  }, [eligibleOrderGiftPromo, selectedOrderGiftId]);

  // 3. BUY X GET Y PROMOTIONS (Mua X tặng/giảm Y - chỉ kích hoạt khi nằm trong selectedCampaignIds)
  const eligibleBuyXGetYPromos = useMemo(() => {
    if (isBestDealVoucherApplied || !config?.active_promotions) return [];
    if (selectedCampaignIds.length === 0) return [];
    return config.active_promotions.filter((p) => {
      if (p.promotion_type !== "buy_x_get_y" || !p.items || p.items.length === 0) return false;
      if (!selectedCampaignIds.some((id) => String(id) === String(p.id))) return false;
      const res = evaluateCampaignEligibility(p, {
        subtotal,
        originalSubtotal,
        cartItems,
        isBrowseMode: false,
      });
      return res.eligible;
    });
  }, [config?.active_promotions, cartItems, subtotal, originalSubtotal, isBestDealVoucherApplied, selectedCampaignIds]);


  const [selectedBuyXGetYMap, setSelectedBuyXGetYMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (eligibleBuyXGetYPromos.length > 0) {
      setSelectedBuyXGetYMap((prev) => {
        let updated = false;
        const next = { ...prev };
        eligibleBuyXGetYPromos.forEach((promo) => {
          const currentId = next[promo.id];
          const isCurrentValid = currentId && promo.items.some((i) => i.id === currentId && i.is_available !== false);
          if (!isCurrentValid && promo.items.length > 0) {
            const firstAvailable = promo.items.find((i) => i.is_available !== false);
            if (firstAvailable) {
              next[promo.id] = firstAvailable.id;
              updated = true;
            } else if (next[promo.id]) {
              delete next[promo.id];
              updated = true;
            }
          }
        });
        return updated ? next : prev;
      });
    }
  }, [eligibleBuyXGetYPromos]);

  const activeBuyXGetYItems = useMemo(() => {
    return eligibleBuyXGetYPromos
      .map((promo) => {
        const firstAvailable = promo.items.find((i) => i.is_available !== false);
        const selectedId = selectedBuyXGetYMap[promo.id] || firstAvailable?.id;
        const item = promo.items.find((i) => i.id === selectedId && i.is_available !== false) || firstAvailable;
        if (!item) return null;
        const buyQty = promo.settings?.buy_quantity || 2;
        const giftQty = promo.settings?.gift_quantity || promo.settings?.get_quantity || 1;
        const isFree = item?.campaign_price === 0 || Boolean(item?.is_free);
        const tag = isFree
          ? `Mua ${buyQty} tặng ${giftQty}`
          : `Mua ${buyQty} giảm ${giftQty}`;
        return {
          promo,
          item,
          tag,
        };
      })
      .filter((x): x is { promo: ActivePromotion; item: PromotionGiftItem; tag: string } => Boolean(x && x.item));
  }, [eligibleBuyXGetYPromos, selectedBuyXGetYMap]);

  const appliedCartPromotions = useMemo(() => {
    const list: ActivePromotion[] = [];
    if (eligibleOrderDiscountPromo) {
      list.push(eligibleOrderDiscountPromo);
    }
    if (eligibleOrderGiftPromo && selectedOrderGiftItem) {
      list.push(eligibleOrderGiftPromo);
    }
    eligibleBuyXGetYPromos.forEach((p) => {
      list.push(p);
    });
    return list;
  }, [
    eligibleOrderDiscountPromo,
    eligibleOrderGiftPromo,
    selectedOrderGiftItem,
    eligibleBuyXGetYPromos,
  ]);

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

  const displaySubtotal = useMemo(() => {
    return subtotal + promoItemsExtraPrice;
  }, [subtotal, promoItemsExtraPrice]);

  const regularPriceSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const isSale = Boolean(item.originalPrice && item.originalPrice > item.unitPrice);
      return isSale ? sum : sum + item.unitPrice * item.quantity;
    }, 0);
  }, [cartItems]);

  const memberDiscount = useMemo(() => {
    if (!user) return 0;
    return calculateMemberDiscount(user, regularPriceSubtotal);
  }, [user, regularPriceSubtotal]);
  const memberDiscountLabel = memberTier.label;

  const total = Math.max(0, displaySubtotal - foodVoucherDiscount - autoOrderDiscountAmount - memberDiscount + effectiveShippingFee);

  const validateVoucherMutexLock = useCallback((voucherCandidate: {
    discount_type?: string;
    is_freeship?: boolean;
    can_combine_with_promotions?: boolean;
    can_combine_with_freeship?: boolean;
    code?: string;
  }): { allowed: boolean; message?: string } => {
    const activeCampaigns = (config?.active_promotions || []).filter((c) =>
      selectedCampaignIds.some((id) => String(id) === String(c.id))
    );

    const isShip = Boolean(
      voucherCandidate.discount_type === "freeship" ||
      voucherCandidate.is_freeship ||
      voucherCandidate.code?.toUpperCase().includes("FREESHIP") ||
      voucherCandidate.code?.toUpperCase().includes("PHISHIP") ||
      (voucherCandidate.code && /^SHIP(\d+|K)?$/i.test(voucherCandidate.code))
    );

    // a) Nếu voucherCandidate.can_combine_with_promotions === false VÀ activeCampaigns.length > 0:
    if (voucherCandidate.can_combine_with_promotions === false && activeCampaigns.length > 0) {
      return {
        allowed: false,
        message: "Mã giảm giá này không áp dụng đồng thời với các chương trình ưu đãi đã chọn trong giỏ hàng.",
      };
    }

    // b) Nếu là Voucher món (!isShip) VÀ có campaign trong activeCampaigns mang can_combine_with_promotions === false:
    if (!isShip) {
      const blockedCamp = activeCampaigns.find((c) => c.can_combine_with_promotions === false);
      if (blockedCamp) {
        return {
          allowed: false,
          message: `Chương trình "${blockedCamp?.name || "Ưu đãi"}" không áp dụng đồng thời với mã giảm giá món ăn.`,
        };
      }
    }

    // c) Nếu là Voucher ship (isShip) VÀ có campaign trong activeCampaigns mang can_combine_with_freeship === false:
    if (isShip) {
      const blockedCamp = activeCampaigns.find((c) => c.can_combine_with_freeship === false);
      if (blockedCamp) {
        return {
          allowed: false,
          message: "Chương trình ưu đãi hiện tại không áp dụng cùng mã giảm phí vận chuyển.",
        };
      }
    }

    // d) Nếu là Voucher ship VÀ appliedVoucher (voucher món đang áp) có canCombineWithFreeship === false:
    if (
      isShip &&
      appliedVoucher &&
      !appliedVoucher.isFreeship &&
      appliedVoucher.discountType !== "freeship" &&
      appliedVoucher.canCombineWithFreeship === false
    ) {
      return {
        allowed: false,
        message: "Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship.",
      };
    }

    // e) Nếu là Voucher món có can_combine_with_freeship === false VÀ đang có appliedShippingVoucher:
    if (!isShip && voucherCandidate.can_combine_with_freeship === false && appliedShippingVoucher) {
      return {
        allowed: false,
        message: "Mã giảm giá món ăn này không áp dụng cùng mã giảm phí vận chuyển đã chọn.",
      };
    }

    return { allowed: true };
  }, [config?.active_promotions, selectedCampaignIds, appliedVoucher, appliedShippingVoucher]);

  // Apply Voucher
  const handleApplyVoucher = async (codeOverride?: string) => {
    const code = (typeof codeOverride === "string" ? codeOverride : voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá.");
      setVoucherSuccess(null);
      setBestDealNotice(null);
      return;
    }

    setVoucherCode(code);
    setValidatingVoucher(true);
    setVoucherError(null);
    setVoucherSuccess(null);
    setBestDealNotice(null);

    const isOrderAutoFreeship = Boolean(
      (deliveryType === "delivery" && isFreeship && shippingFee === 0) ||
      (deliveryType === "delivery" &&
        shippingSettings?.is_min_amount_enabled &&
        shippingSettings?.min_order_amount &&
        subtotal >= shippingSettings.min_order_amount &&
        (shippingSettings.shipping_discount_type === "free" || !shippingSettings.shipping_discount_type || (shippingSettings.shipping_discount_value ?? 0) >= originalFee))
    );

    const isCodeFreeship = code.includes("FREESHIP") || code.includes("SHIP");

    if (isOrderAutoFreeship && isCodeFreeship) {
      const friendlyMsg = "Đơn hàng đã đạt điều kiện Freeship tự động! Bạn hãy giữ lại mã Freeship này để dùng cho đơn sau nhé.";
      setBestDealNotice(friendlyMsg);
      setVoucherError(null);
      setVoucherSuccess(null);
      setAppliedVoucher(null);
      setValidatingVoucher(false);
      throw new Error(friendlyMsg);
    }

    if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false && isCodeFreeship) {
      const msg = "Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship";
      setVoucherError(msg);
      setBestDealNotice(null);
      setVoucherSuccess(null);
      setValidatingVoucher(false);
      throw new Error(msg);
    }

    try {
      const result = await validateVoucher(
        code,
        originalSubtotal,
        shipping,
        false,
        0,
        phone || user?.phone || undefined,
        token || undefined,
        isOrderAutoFreeship
      );
      if (result.valid && result.voucher) {
        const lockCheck = validateVoucherMutexLock(result.voucher);
        if (!lockCheck.allowed) {
          setVoucherError(lockCheck.message || "Mã giảm giá không thể sử dụng cùng các ưu đãi đã chọn.");
          setVoucherSuccess(null);
          setBestDealNotice(null);
          setValidatingVoucher(false);
          return false;
        }
        const isCandidateFreeship = Boolean(
          result.voucher.discount_type === "freeship" ||
          result.voucher.is_freeship ||
          code.includes("FREESHIP") ||
          code.includes("SHIP")
        );

        if (isOrderAutoFreeship && isCandidateFreeship) {
          const friendlyMsg = "Đơn hàng đã đạt điều kiện Freeship tự động! Bạn hãy giữ lại mã Freeship này để dùng cho đơn sau nhé.";
          setBestDealNotice(friendlyMsg);
          setVoucherError(null);
          setVoucherSuccess(null);
          setAppliedVoucher(null);
          throw new Error(friendlyMsg);
        }

        if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false && isCandidateFreeship) {
          const msg = "Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship";
          setVoucherError(msg);
          setBestDealNotice(null);
          setVoucherSuccess(null);
          throw new Error(msg);
        }

        const canCombine = result.voucher.can_combine_with_promotions !== false;

        if (!canCombine) {
          // 1. Điều kiện tối thiểu của voucher (prereqPrice) được xét dựa trên originalSubtotal
          const prereqPrice = Number(result.voucher.prereq_price || 0);
          if (prereqPrice > 0 && originalSubtotal < prereqPrice) {
            const msg = `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${prereqPrice.toLocaleString("vi-VN")}đ trở lên.`;
            setVoucherError(msg);
            setAppliedVoucher(null);
            throw new Error(msg);
          }

          // 2. Tính tiền giảm của voucher dựa trên originalSubtotal: voucherDiscountAmount
          const voucherCandidate = {
            id: result.voucher.id,
            code: result.voucher.code,
            short_name: result.voucher.short_name,
            value: result.voucher.value,
            discountType: result.voucher.discount_type,
            maxDiscount: result.voucher.max_discount,
            prereqPrice: result.voucher.prereq_price,
            isFreeship: result.voucher.is_freeship,
          };
          const voucherDiscountAmount = calculateVoucherDiscount(
            voucherCandidate,
            originalSubtotal,
            shipping
          );

          // 3. So sánh:
          // if (totalItemDiscount >= voucherDiscountAmount) {
          //   // totalItemDiscount >= voucherDiscountAmount (CTKM món đang tốt hơn):
          //   // -> Giữ nguyên CTKM món (không áp trừ voucher).
          //   // -> Hiển thị thông báo (toast/alert text, dùng text-secondary)
          //   setAppliedVoucher(null);
          //   setVoucherSuccess(null);
          //   setVoucherError(null);
          //   const notice =
          //     t("best_deal_item_better") ||
          //     "Giá ưu đãi của món đang tốt hơn voucher, hệ thống đã giữ lại mức giảm tối ưu nhất.";
          //   setBestDealNotice(notice);
          //   return false;
          // }

          // voucherDiscountAmount > totalItemDiscount (Voucher hời hơn):
          // -> Áp dụng voucher!
          // -> Tạm tính chuyển sang tính theo originalSubtotal (các món hiển thị giá gốc).
          // -> Giảm trừ tiền theo voucherDiscountAmount.
          const candidateData = {
            id: result.voucher.id,
            code: result.voucher.code,
            short_name: result.voucher.short_name,
            value: result.voucher.value,
            discountType: result.voucher.discount_type,
            maxDiscount: result.voucher.max_discount,
            campaignId: result.voucher.campaign_id,
            prereqPrice: result.voucher.prereq_price,
            isFreeship: result.voucher.is_freeship,
            canCombineWithPromotions: false,
            canCombineWithFreeship: result.voucher.can_combine_with_freeship,
            discountAmount: voucherDiscountAmount,
          };
          if (isCandidateFreeship) {
            setAppliedShippingVoucher(candidateData);
            if (appliedVoucher?.isFreeship || appliedVoucher?.discountType === "freeship") {
              setAppliedVoucher(null);
            }
          } else {
            setAppliedVoucher(candidateData);
            if (appliedShippingVoucher && result.voucher.can_combine_with_freeship === false) {
              setAppliedShippingVoucher(null);
            }
          }
          setVoucherSuccess(result.message || "Áp dụng mã giảm giá thành công.");
          setBestDealNotice(null);
          try {
            const codesToStore = isCandidateFreeship
              ? [appliedVoucher && !appliedVoucher.isFreeship ? appliedVoucher.code : null, result.voucher.code].filter(Boolean) as string[]
              : [result.voucher.code, appliedShippingVoucher?.code].filter(Boolean) as string[];
            localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(codesToStore));
          } catch (e) {
            console.error("Error saving applied voucher to localStorage", e);
          }
          return true;
        } else {
          // can_combine_with_promotions === true
          const prereqPrice = Number(result.voucher.prereq_price || 0);
          if (prereqPrice > 0 && saleSubtotal < prereqPrice) {
            const msg = `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${prereqPrice.toLocaleString("vi-VN")}đ trở lên.`;
            setVoucherError(msg);
            setAppliedVoucher(null);
            throw new Error(msg);
          }

          const voucherCandidate = {
            id: result.voucher.id,
            code: result.voucher.code,
            short_name: result.voucher.short_name,
            value: result.voucher.value,
            discountType: result.voucher.discount_type,
            maxDiscount: result.voucher.max_discount,
            prereqPrice: result.voucher.prereq_price,
            isFreeship: result.voucher.is_freeship,
          };
          const voucherDiscountAmount = calculateVoucherDiscount(
            voucherCandidate,
            saleSubtotal,
            shipping
          );

          const candidateData = {
            id: result.voucher.id,
            code: result.voucher.code,
            short_name: result.voucher.short_name,
            value: result.voucher.value,
            discountType: result.voucher.discount_type,
            maxDiscount: result.voucher.max_discount,
            campaignId: result.voucher.campaign_id,
            prereqPrice: result.voucher.prereq_price,
            isFreeship: result.voucher.is_freeship,
            canCombineWithPromotions: true,
            canCombineWithFreeship: result.voucher.can_combine_with_freeship,
            discountAmount: voucherDiscountAmount,
          };
          if (isCandidateFreeship) {
            setAppliedShippingVoucher(candidateData);
            if (appliedVoucher?.isFreeship || appliedVoucher?.discountType === "freeship") {
              setAppliedVoucher(null);
            }
          } else {
            setAppliedVoucher(candidateData);
            if (appliedShippingVoucher && result.voucher.can_combine_with_freeship === false) {
              setAppliedShippingVoucher(null);
            }
          }
          setVoucherSuccess(result.message || "Áp dụng mã giảm giá thành công.");
          setBestDealNotice(null);
          try {
            const codesToStore = isCandidateFreeship
              ? [appliedVoucher && !appliedVoucher.isFreeship ? appliedVoucher.code : null, result.voucher.code].filter(Boolean) as string[]
              : [result.voucher.code, appliedShippingVoucher?.code].filter(Boolean) as string[];
            localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(codesToStore));
          } catch (e) {
            console.error("Error saving applied voucher to localStorage", e);
          }
          return true;
        }
      } else {
        if (
          result.message?.includes("Freeship tự động") ||
          result.message?.includes("freeship tự động") ||
          result.message?.includes("miễn phí vận chuyển tự động")
        ) {
          const friendlyMsg = "Đơn hàng đã đạt điều kiện Freeship tự động! Bạn hãy giữ lại mã Freeship này để dùng cho đơn sau nhé.";
          setBestDealNotice(friendlyMsg);
          setVoucherError(null);
          setVoucherSuccess(null);
          setAppliedVoucher(null);
          throw new Error(friendlyMsg);
        }
        setVoucherError(result.message || "Mã giảm giá không hợp lệ.");
        setAppliedVoucher(null);
        setBestDealNotice(null);
        throw new Error(result.message || "Mã giảm giá không hợp lệ.");
      }
    } catch (err: any) {
      const msg = err?.message || "Lỗi kiểm tra mã giảm giá.";
      if (
        msg.includes("Freeship tự động") ||
        msg.includes("freeship tự động") ||
        msg.includes("miễn phí vận chuyển tự động")
      ) {
        setBestDealNotice(
          "Đơn hàng đã đạt điều kiện Freeship tự động! Bạn hãy giữ lại mã Freeship này để dùng cho đơn sau nhé."
        );
        setVoucherError(null);
      } else {
        setVoucherError(msg);
        setBestDealNotice(null);
      }
      setAppliedVoucher(null);
      throw new Error(msg);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setAppliedShippingVoucher(null);
    setVoucherCode("");
    setVoucherSuccess(null);
    setVoucherError(null);
    setBestDealNotice(null);
    try {
      localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify([]));
    } catch (e) {
      console.error("Error clearing applied vouchers from localStorage", e);
    }
  }, []);

  const handleRemoveCampaign = useCallback(() => {
    setSelectedCampaignIds([]);
    try {
      localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([]));
    } catch (e) {
      console.error("Error clearing applied campaigns from localStorage", e);
    }
  }, []);

  const handleClearAllPromotions = useCallback(() => {
    handleRemoveVoucher();
    handleRemoveCampaign();
  }, [handleRemoveVoucher, handleRemoveCampaign]);

  const handleRemovePromotionFromBar = useCallback(() => {
    const hasVouchers = Boolean(appliedVoucher || appliedShippingVoucher);
    const hasCampaigns = selectedCampaignIds.length > 0;
    if (hasVouchers && hasCampaigns) {
      handleClearAllPromotions();
    } else if (hasVouchers) {
      handleRemoveVoucher();
    } else if (hasCampaigns) {
      handleRemoveCampaign();
    } else {
      handleClearAllPromotions();
    }
  }, [appliedVoucher, appliedShippingVoucher, selectedCampaignIds, handleClearAllPromotions, handleRemoveVoucher, handleRemoveCampaign]);

  const handleApplyVoucherFromModal = useCallback((code: string) => {
    return handleApplyVoucher(code);
  }, [handleApplyVoucher]);

  const handleApplyVouchersFromModal = useCallback(async (codes: string[]) => {
    if (!codes || codes.length === 0) {
      handleRemoveVoucher();
      return;
    }
    setValidatingVoucher(true);
    setVoucherError(null);
    setVoucherSuccess(null);
    setBestDealNotice(null);
    try {
      let nextFood: typeof appliedVoucher = null;
      let nextShip: typeof appliedShippingVoucher = null;
      let validationError: string | null = null;
      for (const rawCode of codes) {
        const c = rawCode.trim().toUpperCase();
        const res = await validateVoucher(
          c,
          originalSubtotal,
          shipping,
          false,
          0,
          phone || user?.phone || undefined,
          token || undefined,
          false
        );
        if (res.valid && res.voucher) {
          const isCandidateFreeship = Boolean(
            res.voucher.discount_type === "freeship" ||
            res.voucher.is_freeship ||
            c.includes("FREESHIP") || c.includes("PHISHIP") || /^SHIP(\d+|K)?$/i.test(c)
          );
          const canCombine = res.voucher.can_combine_with_promotions !== false;
          const subtotalForCalc = canCombine ? saleSubtotal : originalSubtotal;
          const candidate = {
            id: res.voucher.id,
            code: res.voucher.code,
            short_name: res.voucher.short_name,
            value: res.voucher.value,
            discountType: res.voucher.discount_type,
            maxDiscount: res.voucher.max_discount,
            campaignId: res.voucher.campaign_id,
            prereqPrice: res.voucher.prereq_price,
            isFreeship: res.voucher.is_freeship,
            canCombineWithPromotions: canCombine,
            canCombineWithFreeship: res.voucher.can_combine_with_freeship,
            discountAmount: calculateVoucherDiscount(
              {
                id: res.voucher.id,
                code: res.voucher.code,
                short_name: res.voucher.short_name,
                value: res.voucher.value,
                discountType: res.voucher.discount_type,
                maxDiscount: res.voucher.max_discount,
                prereqPrice: res.voucher.prereq_price,
                isFreeship: res.voucher.is_freeship,
              },
              subtotalForCalc,
              shipping
            ),
          };
          if (isCandidateFreeship) nextShip = candidate;
          else nextFood = candidate;
        } else {
          validationError = res.message || "Mã không hợp lệ hoặc không đủ điều kiện.";
        }
      }
      setAppliedVoucher(nextFood);
      setAppliedShippingVoucher(nextShip);
      const appliedCount = (nextFood ? 1 : 0) + (nextShip ? 1 : 0);
      if (appliedCount > 0) {
        setVoucherCode([nextFood?.code, nextShip?.code].filter(Boolean).join(", "));
        setVoucherSuccess(`Đã áp dụng thành công ${appliedCount} ưu đãi!`);
        setIsVoucherModalOpen(false);
        try {
          const appliedCodes = [nextFood?.code, nextShip?.code].filter(Boolean) as string[];
          localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(appliedCodes));
        } catch (e) {
          console.error("Error saving applied vouchers to localStorage in MobileCartFlow", e);
        }
      } else {
        handleRemoveVoucher();
        if (validationError) {
          setVoucherError(validationError);
        }
        setIsVoucherModalOpen(false);
      }
    } catch (e: any) {
      console.error("Error applying vouchers from modal in MobileCartFlow:", e);
      setVoucherError(e?.message || "Không thể áp dụng các mã ưu đãi đã chọn.");
    } finally {
      setValidatingVoucher(false);
    }
  }, [originalSubtotal, shipping, phone, user?.phone, token, saleSubtotal, handleRemoveVoucher]);

  const hasLoadedStoredVoucherRef = useRef(false);
  useEffect(() => {
    if (hasLoadedStoredVoucherRef.current) return;
    if (originalSubtotal <= 0) return;
    try {
      const stored = localStorage.getItem("cothaotomca_applied_voucher_codes");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasLoadedStoredVoucherRef.current = true;
          handleApplyVouchersFromModal(parsed).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.error("Error restoring voucher from localStorage in MobileCartFlow", e);
    }
    hasLoadedStoredVoucherRef.current = true;
  }, [originalSubtotal, handleApplyVouchersFromModal]);

  const handleAddPrivateVoucherFromModal = useCallback((v: PublicVoucherItem) => {
    setSessionPrivateVouchers((prev) =>
      prev.some((x) => x.code === v.code) ? prev : [...prev, v]
    );
  }, []);

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

    if (isOutOfStockOverall) {
      setError("Vui lòng xóa sản phẩm [Tạm hết hàng] để tiếp tục đặt hàng.");
      setLoading(false);
      return;
    }

    const opCheck = checkOperatingHours(config?.operating_hours, undefined, deliveryType);

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
    if (deliveryType === "delivery" && (deliverySchedule === "schedule" || !opCheck.canOrderNow)) {
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
            : null,
        items: [
          ...cartItems.map((item) => ({
            product_id: item.productId,
            product_code: item.productCode,
            product_name: item.title,
            quantity: item.quantity,
            price: isBestDealVoucherApplied
              ? ((item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice)
              : item.unitPrice,
            original_price: item.originalPrice ?? undefined,
            discount: 0,
          })),
          ...(selectedOrderGiftItem
            ? [
              {
                product_id: selectedOrderGiftItem.product_id,
                product_code: selectedOrderGiftItem.product_code,
                kiotviet_id: selectedOrderGiftItem.kiotviet_id || undefined,
                product_name: `[QUÀ TẶNG] ${selectedOrderGiftItem.product_name}`,
                quantity: 1,
                price: selectedOrderGiftItem.campaign_price > 0 ? selectedOrderGiftItem.campaign_price : 0,
                discount: 0,
                note: `Quà tặng đơn hàng (${eligibleOrderGiftPromo?.name || "Chiến dịch"})`,
              },
            ]
            : []),
          ...(activeBuyXGetYItems.map(({ promo, item, tag }) => ({
            product_id: item.product_id,
            product_code: item.product_code,
            kiotviet_id: item.kiotviet_id || undefined,
            product_name: `[ƯU ĐÃI COMBO] ${item.product_name}`,
            quantity: 1,
            price: item.is_free || item.campaign_price === 0 ? 0 : item.campaign_price,
            discount: 0,
            note: `${tag} (${promo.name})`,
          }))),
        ],
        discount: voucherDiscount + autoOrderDiscountAmount + memberDiscount,
        member_discount: memberDiscount,
        description: [
          cartItems.map((item) => `${item.title} (${item.variant}) x${item.quantity}`).join(", "),
          autoOrderDiscountAmount > 0 ? `KM đơn hàng: -${autoOrderDiscountAmount.toLocaleString("vi-VN")}đ (${eligibleOrderDiscountPromo?.name || ""})` : "",
          ...activeBuyXGetYItems.map(({ promo, item, tag }) => `Ưu đãi combo: ${item.product_name} (${item.campaign_price === 0 ? "0đ" : `${item.campaign_price.toLocaleString("vi-VN")}đ`} - ${tag})`),
        ]
          .filter(Boolean)
          .join(" | ") || undefined,
        is_apply_voucher: !!(appliedVoucher || appliedShippingVoucher),
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
        shipping_voucher_code: appliedShippingVoucher ? appliedShippingVoucher.code : (appliedVoucher?.isFreeship ? appliedVoucher.code : undefined),
        applied_deal_type: isBestDealVoucherApplied ? "voucher" : undefined,
        voucher: appliedVoucher
          ? {
            voucher_id: appliedVoucher.id,
            campaign_id: appliedVoucher.campaignId,
            amount: appliedVoucher.value,
            can_combine_with_freeship: appliedVoucher.canCombineWithFreeship,
          }
          : null,
        shipping_voucher: (appliedShippingVoucher || (appliedVoucher?.isFreeship ? appliedVoucher : null))
          ? {
            voucher_id: (appliedShippingVoucher || appliedVoucher)?.id,
            amount: (appliedShippingVoucher || appliedVoucher)?.value,
          }
          : undefined,
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
                  {cartItems.map((item) => {
                    const isOut = Boolean(item.isOutOfStock);
                    return (
                      <div key={item.id} className={`flex gap-3 py-3 first:pt-0 last:pb-0 items-start transition-opacity ${isOut ? "opacity-50" : ""}`}>
                        <div className="relative size-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                          {isOut && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white bg-red-600/90 px-1 py-0.5 rounded text-center leading-none">
                                Hết hàng
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="title-3 text-primary font-bold font-display line-clamp-1">
                                {item.title}
                              </h4>
                              {isOut && (
                                <span className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded mt-0.5">
                                  [Tạm hết hàng]
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {!isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice ? (
                                <p className="text-xs font-semibold text-gray-400 line-through leading-tight">
                                  {formatPrice(item.originalPrice)}
                                </p>
                              ) : null}
                              <span className="title-3 text-primary font-bold whitespace-nowrap leading-tight">
                                {formatPrice(
                                  isBestDealVoucherApplied
                                    ? ((item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice)
                                    : item.unitPrice
                                )}
                              </span>
                            </div>
                          </div>
                          {!isDefaultVariant(item.variant) && (
                            <p className="text-sm text-gray-500 font-semibold uppercase">
                              {cleanVariantName(item.variant)}
                            </p>
                          )}
                          {isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice && (
                            <p className="text-[11px] text-secondary mt-1">
                              Mã {appliedVoucher?.code} không áp dụng đồng thời với CTKM khác.
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            {/* Quantity selectors */}
                            <div className="flex items-center border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs disabled:opacity-30"
                                disabled={isOut || item.quantity <= 1}
                              >
                                &minus;
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-primary">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="size-5 flex items-center justify-center text-gray-400 hover:text-primary font-bold text-xs disabled:opacity-30"
                                disabled={isOut}
                              >
                                +
                              </button>
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                            >
                              [Xóa]
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <>
                {/* Shopee-style Voucher Ticket Bar */}
                <div className="space-y-2">
                  <VoucherTicketBar
                    appliedVoucher={appliedVoucher}
                    appliedShippingVoucher={appliedShippingVoucher}
                    activeCampaignName={appliedVoucher?.canCombineWithPromotions === false ? undefined : cartCampaignG1?.name}
                    onClick={() => setIsVoucherModalOpen(true)}
                    onRemove={handleRemovePromotionFromBar}
                  />
                  {voucherError && <p className="text-sm text-red-600 font-semibold mt-1 px-2">{voucherError}</p>}
                  {bestDealNotice && <p className="text-sm text-secondary font-semibold mt-1 px-2">{bestDealNotice}</p>}
                  {appliedVoucher && promotionMatrixVoucherNotice && (
                    <div className="text-xs text-secondary font-semibold mt-1 px-2 space-y-0.5 animate-fade-in">
                      <p className="flex items-center gap-1">
                        <span>{promotionMatrixVoucherNotice}</span>
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
                {shippingSettings?.is_min_amount_enabled && (
                  <SmartCartProgressBar
                    subtotal={subtotal}
                    shippingSettings={shippingSettings}
                    isFreeship={isFreeship}
                    freeshipReason={freeshipReason}
                    vouchers={availableVouchers}
                    appliedVoucher={appliedVoucher as any}
                    appliedShippingVoucher={appliedShippingVoucher as any}
                    onOpenVouchers={() => setIsVoucherModalOpen(true)}
                  />
                )}

                {/* Summary Panel */}
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">{t("subtotal")}</span>
                    <span className="text-primary font-bold font-display">{formatPrice(displaySubtotal)}</span>
                  </div>
                  {isBestDealVoucherApplied ? (
                    <p className="text-secondary font-medium text-xs">
                      Mã {appliedVoucher?.code} không áp dụng đồng thời với CTKM khác.
                    </p>
                  ) : ( ((appliedCartPromotions.length > 0 || isFreeship)) && (
                    <p className="text-secondary font-medium text-xs">
                      {t("best_deal_applied") || "Đã tự động áp dụng ưu đãi tốt nhất cho đơn hàng."}
                    </p>
                  ))}
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-500 font-medium">{t("shipping_fee")}</span>
                    <span className="text-primary font-bold font-display">
                      {!selectedDistrict ? "--" : isFreeship ? "0đ" : shipping > 0 ? formatPrice(shipping) : "--"}
                    </span>
                  </div>
                  {promotionMatrixShippingNotice && (
                    <p className="text-xs text-red-600 font-semibold animate-fade-in">
                      {promotionMatrixShippingNotice}
                    </p>
                  )}
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
                {isOutOfStockOverall && (
                  <p className="text-red-500 text-xs text-center font-medium">
                    Vui lòng xóa sản phẩm [Tạm hết hàng] để tiếp tục đặt hàng
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isOutOfStockOverall}
                  className={`w-full font-bold rounded-full py-4 text-center transition-all font-display title-2 ${
                    isOutOfStockOverall
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-secondary hover:bg-secondary/95 text-white shadow-[0_4px_12px_rgba(205,72,41,0.2)]"
                  }`}
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
              <div className="text-xs sm:text-sm font-semibold flex-1 leading-relaxed font-sans whitespace-pre-line">
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
                        <div key={item.id} className={`flex gap-3 py-2.5 first:pt-0 last:pb-0 items-start ${item.isOutOfStock ? "opacity-50" : ""}`}>
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
                              <div>
                                <p className="body-2 text-primary font-bold font-display line-clamp-1">{item.title}</p>
                                {item.isOutOfStock && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold text-red-600 bg-red-100 rounded-full">
                                    Tạm hết hàng
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {!isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice ? (
                                  <p className="text-[10px] font-semibold text-gray-400 line-through leading-tight">
                                    {formatPrice(item.originalPrice)}
                                  </p>
                                ) : null}
                                <span className="body-2 text-primary font-bold whitespace-nowrap leading-tight">
                                  {formatPrice(
                                    isBestDealVoucherApplied
                                      ? ((item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice)
                                      : item.unitPrice
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-gray-500 font-semibold uppercase">
                                {isDefaultVariant(item.variant) ? `x${item.quantity}` : `${cleanVariantName(item.variant)} x${item.quantity}`}
                              </p>
                              {item.isOutOfStock && (
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-[11px] font-medium text-red-600 hover:text-red-700 underline ml-2 cursor-pointer"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                            {isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice && (
                              <p className="text-[11px] text-secondary mt-1">
                                Mã {appliedVoucher?.code} không áp dụng đồng thời với CTKM khác.
                              </p>
                            )}
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
                            </div>
                          </div>
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t("subtotal")}</span>
                        <span className="font-semibold">{formatPrice(displaySubtotal)}</span>
                      </div>
                      {isBestDealVoucherApplied ? (
                        <p className="text-secondary font-medium text-xs">
                          Mã {appliedVoucher?.code} không áp dụng đồng thời với CTKM khác.
                        </p>
                      ) : ( ((appliedCartPromotions.length > 0 || isFreeship)) && (
                        <p className="text-secondary font-medium text-xs">
                          {t("best_deal_applied") || "Đã tự động áp dụng ưu đãi tốt nhất cho đơn hàng."}
                        </p>
                      ))}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">{t("shipping_fee")}</span>
                        <div className="text-right">
                          {deliveryType === "pickup" ? (
                            <span className="text-secondary font-bold">0đ ({t("delivery_pickup")})</span>
                          ) : !isDeliverable || (!selectedWard && !selectedWardId) ? (
                            <span className="text-gray-500 font-bold">--</span>
                          ) : (shippingVoucherDiscount > 0 || appliedShippingVoucher || (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship"))) ? (
                            effectiveShippingFee === 0 ? (
                              <div className="flex items-center gap-2">
                                {shipping > 0 && (
                                  <span className="text-xs text-gray-400 line-through">
                                    {formatPrice(shipping)}
                                  </span>
                                )}
                                <span className="text-secondary font-bold">0đ</span>
                                <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                  Mã {appliedShippingVoucher?.code || appliedVoucher?.code}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 line-through">
                                    {formatPrice(shipping)}
                                  </span>
                                  <span className="text-primary font-bold">
                                    {formatPrice(effectiveShippingFee)}
                                  </span>
                                  <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                    Mã {appliedShippingVoucher?.code || appliedVoucher?.code}
                                  </span>
                                </div>
                                <span className="text-xs text-secondary font-semibold">
                                  Giảm {formatPrice(shippingVoucherDiscount)} phí vận chuyển
                                </span>
                              </div>
                            )
                          ) : isFreeship ? (
                            <div className="flex items-center gap-2">
                              {originalFee > 0 && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(originalFee)}
                                </span>
                              )}
                              <span className="text-secondary font-bold">0đ</span>
                              <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                {appliedShippingVoucher
                                  ? `Mã ${appliedShippingVoucher.code}`
                                  : appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship")
                                    ? `Mã ${appliedVoucher.code}`
                                    : "Freeship tự động"}
                              </span>
                            </div>
                          ) : shippingDiscount > 0 && shipping < originalFee ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(originalFee)}
                                </span>
                                <span className="text-primary font-bold">
                                  {formatPrice(shipping)}
                                </span>
                              </div>
                              <span className="text-xs text-secondary font-semibold">
                                Giảm {formatPrice(shippingDiscount)} phí vận chuyển
                              </span>
                            </div>
                          ) : shipping > 0 ? (
                            <span className="text-primary font-bold">
                              {formatPrice(shipping)}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-bold">--</span>
                          )}
                        </div>
                      </div>
                      {promotionMatrixShippingNotice && (
                        <p className="text-xs text-red-600 font-semibold pt-1 animate-fade-in">
                          {promotionMatrixShippingNotice}
                        </p>
                      )}
                      {autoOrderDiscountAmount > 0 && (
                        <div className="flex justify-between items-start gap-2 text-secondary font-semibold">
                          <div className="flex-1 min-w-0 pr-1 leading-snug">
                            <span>{eligibleOrderDiscountPromo?.name}</span>
                          </div>
                          <span className="font-semibold shrink-0 whitespace-nowrap text-right leading-snug">
                            -{formatPrice(autoOrderDiscountAmount)}
                          </span>
                        </div>
                      )}
                      {appliedVoucher && foodVoucherDiscount > 0 && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-500 flex-1 min-w-0">{t("voucher_label")}</span>
                          <span className="font-semibold shrink-0 whitespace-nowrap text-right">-{formatPrice(foodVoucherDiscount)}</span>
                        </div>
                      )}
                      {memberDiscount > 0 && (
                        <div className="flex justify-between items-center gap-2 text-secondary font-semibold animate-fade-in">
                          <span className="flex-1 min-w-0 leading-snug">{memberDiscountLabel || "Ưu đãi thành viên"}</span>
                          <span className="shrink-0 whitespace-nowrap text-right">-{formatPrice(memberDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm font-bold border-t border-gray-100 pt-2 text-primary gap-2">
                        <span className="flex-1 min-w-0">{t("total")}</span>
                        <span className="text-secondary shrink-0 whitespace-nowrap text-right">{formatPrice(total)}</span>
                      </div>
                      {user && total > 0 && Math.floor(total / 10000) > 0 && (
                        <div className="text-xs text-secondary font-semibold text-right flex items-center justify-end gap-1.5 pt-1.5 border-t border-dashed border-gray-200">
                          <span>Đơn hàng này sẽ tích lũy thêm {Math.floor(total / 10000)} điểm</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>


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
                    onClick={() => {
                      setDeliveryType("pickup");
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next["delivery.expected_delivery"];
                        delete next["delivery.ward"];
                        delete next["delivery.address"];
                        return next;
                      });
                    }}
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
                      {config?.branches.map((b, index) => {
                        const rawName = b.branchName || (b as any).title || b.address || `Chi nhánh #${b.id}`;
                        const cleanName = rawName.replace(/^Chi\s*nhánh\s*(\d+[\s:.-]*)?/i, "").trim();
                        const displayName = cleanName ? `Chi nhánh ${index + 1} - ${cleanName}` : `Chi nhánh ${index + 1}`;
                        return (
                          <option key={b.id} value={b.id} className="text-gray-900 bg-white py-1">
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {config?.branches.find(b => b.id === selectedBranchId) && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-1.5 shadow-sm text-sm text-gray-600 font-serif">
                      <p>{t("pickup_address_label")} {config?.branches.find(b => b.id === selectedBranchId)?.address}</p>
                      <p>
                        Hotline:{" "}
                        <a
                          href={`tel:${(config?.branches.find(b => b.id === selectedBranchId)?.contactNumber || "024.9999.7122").replace(/[^0-9+]/g, "")}`}
                          className="text-primary font-bold hover:underline"
                        >
                          {config?.branches.find(b => b.id === selectedBranchId)?.contactNumber || "024.9999.7122"}
                        </a>
                      </p>
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

              {/* Expected time & date / Pickup instruction */}
              {deliveryType === "pickup" ? (
                <div className="pt-2 border-t border-gray-100">
                  <div className="rounded-xl border border-secondary/20 bg-yellow/40 p-4 text-sm text-brown leading-relaxed font-medium font-sans">
                    {operatingStatus.canOrderNow
                      ? t("pickup_time_notice")
                      : t("pickup_time_notice_out_hours")}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                    {t("delivery_time_label")}
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
                            {t("delivery_now")}
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
                      <div className="p-3 bg-yellow/60 border border-secondary/30 rounded-lg text-xs text-brown leading-relaxed font-medium">
                        {t("delivery_operating_notice", {
                          storeOpen: operatingStatus.storeOpen || "09:00",
                          deliveryOpen: operatingStatus.deliveryOpen || "10:00",
                          cutoff: operatingStatus.lastOrderCutoff || "22:30",
                        })}
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
                          {t("schedule_delivery")}
                        </span>
                      </label>
                    </div>
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
              )}

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
            {isOutOfStockOverall && (
              <p className="text-red-500 text-xs text-center font-medium">
                Vui lòng xóa sản phẩm [Tạm hết hàng] để tiếp tục đặt hàng
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !confirmInfo || (deliveryType === "delivery" && !isDeliverable) || isOutOfStockOverall}
              className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading
                ? t("submitting")
                : deliveryType === "delivery" && !isDeliverable
                  ? "Khu vực chưa hỗ trợ giao"
                  : deliveryType === "delivery" && !operatingStatus.canOrderNow
                    ? t("schedule_delivery")
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
        originalSubtotal={originalSubtotal}
        shippingFee={shipping}
        shippingFeeDiscount={shippingDiscount}
        isFreeship={isFreeship}
        isAutoFreeship={deliveryType === "delivery" && isFreeship && shippingFee === 0}
        isAutoShippingDiscountActive={
          deliveryType === "delivery" &&
          Boolean(
            (shippingDiscount > 0 && shipping < originalFee && !appliedShippingVoucher) ||
            (shippingSettings?.is_min_amount_enabled &&
              Number(shippingSettings.min_order_amount) > 0 &&
              subtotal >= Number(shippingSettings.min_order_amount) &&
              !(isFreeship && shippingFee === 0))
          )
        }
        canCombineWithFreeship={appliedVoucher ? appliedVoucher.canCombineWithFreeship : undefined}
        appliedVoucherCode={appliedVoucher?.code || appliedShippingVoucher?.code || ""}
        appliedVoucherCodes={[appliedVoucher?.code, appliedShippingVoucher?.code].filter(Boolean) as string[]}
        appliedCampaignIds={selectedCampaignIds}
        cartItems={cartItems}
        onApplyCampaigns={handleApplyCampaigns}
        onApplyVouchers={handleApplyVouchersFromModal}
        onApplyVoucher={handleApplyVoucherFromModal}
        onRemoveVoucher={handleRemoveVoucher}
        activePromotions={appliedCartPromotions}
        user={user}
        memberTier={memberTier.tier}
        privateVouchers={sessionPrivateVouchers}
        onAddPrivateVoucher={handleAddPrivateVoucherFromModal}
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
          onSelect={(item) => {
            setSelectedOrderGiftId(item.id);
          }}
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
          selectedId={selectedBuyXGetYMap[selectedBuyXGetYPromoForModal.id] || selectedBuyXGetYPromoForModal.items?.find((i) => i.is_available !== false)?.id || null}
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
