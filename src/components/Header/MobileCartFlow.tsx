"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter, Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import * as NextIntl from "next-intl";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, formatOrderPrice, isDefaultVariant, cleanVariantName, formatImageUrl } from "@/lib/format";
import { getCartItemTitle, getCartItemVariant } from "@/lib/cartLocalization";
import { useBranches } from "@/contexts/BranchContext";
import { getActiveCampaigns, type PublicCampaignItem } from "@/services/campaignService";
import { mergePromotionsWithPublicCampaigns } from "@/types/campaign";
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
  cancelOrderApi,
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
  getBuyXGetYGiftOnlyItems,
  OrderApiError,
  getLoyaltySettings,
  type LoyaltySettings,
} from "@/services/orderService";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import { getGeneralSettings } from "@/services/generalSettingService";
import { useAuth, getMemberTier, calculateMemberDiscount } from "@/contexts/AuthContext";
import {
  getCustomerAddressesApi,
  getCachedCustomerAddresses,
  setCachedCustomerAddresses,
  type CustomerAddress,
  checkGuestTierByPhone,
  type GuestTierHint,
} from "@/services/authService";
import {
  buildDeliveryAddress,
  cleanDuplicateAddressParts,
  formatWardLabel,
  resolveNewWardName,
  validateAddressWardMatch,
  verifyAddressViaMapApi,
  type AddressWardValidationResult,
  type WardCatalogEntry,
} from "@/data/wardMapping";
import GuestTierHintBanner from "@/components/Checkout/GuestTierHintBanner";
import { checkOperatingHours, formatVietnameseDate, generate15MinTimeSlots, getEarliestPreOrderSlot, getVietnamDate, getVietnamTimeString, isTodayOutOfScheduleSlots, toISODateString } from "@/lib/operatingHours";
import { formatBranchDisplayName, identifyBrandBranch } from "@/lib/branchHelper";
import PreOrderNoticeModal from "@/components/Checkout/PreOrderNoticeModal";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";
import Chevron from "@/components/Icons/Chevron";
import CouponModal, { evaluateCampaignEligibility } from "@/components/Voucher/CouponModal";
import SmartCartProgressBar from "@/components/Cart/SmartCartProgressBar";
import GiftSelectorModal from "@/components/Checkout/GiftSelectorModal";
import VoucherTicketBar from "@/components/Checkout/VoucherTicketBar";
import RequiredMark from "@/components/Checkout/RequiredMark";
import {
  clearAllPromotionStorage,
  pruneStoredVoucherCode,
  setStoredVoucherCodes,
  getStoredVoucherCodes,
  getStoredCampaignIds,
  setStoredCampaignIds,
} from "@/utils/promotionStorage";

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

const TECHNICAL_ERROR_PATTERNS = [
  /typeerror/i,
  /sqlstate/i,
  /syntax error/i,
  /call to undefined/i,
  /internal server error/i,
  /argument #/i,
  /must be of type/i,
  /null given/i,
  /uncaught exception/i,
  /\.php on line/i,
  /undefined array key/i,
  /server error/i,
  /stack trace/i,
  /called in/i,
  /exception/i,
];

const isTechnicalErrorMessage = (msg: string): boolean => {
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(msg));
};

export default function MobileCartFlow({
  onClose,
  inline = false,
  initialDeliveryType,
}: {
  onClose?: () => void;
  inline?: boolean;
  initialDeliveryType?: DeliveryType;
}) {
  const { cartItems, isLoaded, updateQuantity, removeFromCart, clearCart, isCartOpen, setIsCartOpen, hasOutOfStockItems, restoreCampaignItemsToOriginalPrice } = useCart();
  const isOutOfStockOverall = Boolean(hasOutOfStockItems || cartItems.some((i) => i.isOutOfStock));
  const { user, token, refreshUser } = useAuth();
  const memberTier = useMemo(() => (user ? getMemberTier(user) : getMemberTier(0)), [user]);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("checkout");
  const tVoucher = useTranslations("voucher");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  let locale = "vi";
  try {
    if (typeof (NextIntl as any).useLocale === "function") {
      locale = (NextIntl as any).useLocale() || "vi";
    } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/en")) {
      locale = "en";
    }
  } catch {
    locale = "vi";
  }

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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Checkout Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>(initialDeliveryType || "delivery");
  const [adminProvinces, setAdminProvinces] = useState<AdministrativeProvince[]>(FALLBACK_ADMINISTRATIVE_UNITS);
  const [selectedProvince, setSelectedProvince] = useState("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1);
  const [assignedBranchName, setAssignedBranchName] = useState<string | null>(null);

  // Check whether current user is authenticated
  const isUserLoggedIn = Boolean(
    isMounted && (user || token || (typeof window !== "undefined" && Boolean(localStorage.getItem("auth_token"))))
  );

  // Customer Address Book states (for logged in customers)
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | string | null>(null);
  const [isLoadingCustomerAddresses, setIsLoadingCustomerAddresses] = useState<boolean>(false);
  const hasAutoFilledDefaultAddressRef = useRef(false);

  // Auto-fill address details helper
  const applyAddressToForm = useCallback((addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    if (addr.recipient_name) setName(addr.recipient_name);
    if (addr.phone) setPhone(addr.phone);
    if (addr.province) {
      const cleanProv = addr.province.includes("Hồ Chí Minh") ? "TP. Hồ Chí Minh" : addr.province;
      setSelectedProvince(cleanProv);
    }
    if (addr.district) setSelectedDistrict(addr.district);

    // Tự động ánh xạ tên Phường cũ (VD: Phường 14) sang Phường mới (Nhiêu Lộc / Hòa Hưng)
    const fullContext = addr.full_address || addr.street_address || "";
    const resolvedName = resolveNewWardName(addr.ward || "", addr.district, fullContext);
    const finalWard = resolvedName || addr.ward || "";
    setSelectedWard(finalWard);
    if (addr.ward_id) {
      setSelectedWardId(addr.ward_id);
    }

    const addrStreet = addr.street_address || addr.full_address || "";
    if (addrStreet) setStreetAddress(addrStreet);
  }, []);

  // Auto-fill from cached address immediately on client mount if available
  useEffect(() => {
    if (!hasAutoFilledDefaultAddressRef.current && customerAddresses.length > 0 && selectedAddressId && selectedAddressId !== "new") {
      const addr = customerAddresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        hasAutoFilledDefaultAddressRef.current = true;
        applyAddressToForm(addr);
      }
    }
  }, [customerAddresses, selectedAddressId, applyAddressToForm]);

  useEffect(() => {
    if (isUserLoggedIn) {
      if (user) {
        setName((prev) => prev || user.name || "");
        setPhone((prev) => prev || user.phone || "");
        setEmail((prev) => prev || user.email || "");
      }

      const cached = getCachedCustomerAddresses();
      if (cached.length > 0) {
        setCustomerAddresses((prev) => (prev.length === 0 ? cached : prev));
        const defaultAddr = cached.find((a) => a.is_default) || cached[0];
        if (defaultAddr && !hasAutoFilledDefaultAddressRef.current) {
          hasAutoFilledDefaultAddressRef.current = true;
          applyAddressToForm(defaultAddr);
        }
      } else {
        setIsLoadingCustomerAddresses(true);
      }

      getCustomerAddressesApi()
        .then((addrs) => {
          setCustomerAddresses(addrs);
          setCachedCustomerAddresses(addrs);
          if (addrs.length > 0) {
            setSelectedAddressId((curr) => {
              if (curr && curr !== "new" && addrs.some((a) => a.id === curr)) {
                return curr;
              }
              const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
              if (defaultAddr && !hasAutoFilledDefaultAddressRef.current) {
                hasAutoFilledDefaultAddressRef.current = true;
                applyAddressToForm(defaultAddr);
              }
              return defaultAddr ? defaultAddr.id : curr;
            });
          }
        })
        .catch((err) => {
          console.warn("Failed to load customer addresses:", err);
        })
        .finally(() => {
          setIsLoadingCustomerAddresses(false);
        });
    }
  }, [isUserLoggedIn, user, applyAddressToForm]);

  const handleSelectCustomerAddress = (addrId: number | "new") => {
    if (addrId === "new") {
      setSelectedAddressId("new");
      setStreetAddress("");
      setSelectedWard("");
      setSelectedWardId("");
      setSelectedDistrict("");
      setSelectedProvince(adminProvinces[0]?.name || "TP. Hồ Chí Minh");
      if (user) {
        setName(user.name || "");
        setPhone(user.phone || "");
      }
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.ward;
        delete next.address;
        return next;
      });
      return;
    }
    const addr = customerAddresses.find((a) => a.id === addrId);
    if (addr) {
      applyAddressToForm(addr);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.ward;
        delete next.address;
        return next;
      });
    }
  };

  const isSavedAddressSelected = Boolean(
    isMounted &&
    isUserLoggedIn &&
    selectedAddressId &&
    selectedAddressId !== "new" &&
    customerAddresses.some((a) => a.id === selectedAddressId)
  );

  const selectedSavedAddress = useMemo(
    () => (isSavedAddressSelected ? customerAddresses.find((a) => a.id === selectedAddressId) : null),
    [isSavedAddressSelected, customerAddresses, selectedAddressId]
  );

  // Guest VIP tier hint states
  const [guestTierHint, setGuestTierHint] = useState<GuestTierHint | null>(null);
  const [guestTierChecking, setGuestTierChecking] = useState(false);
  const [guestTierDismissed, setGuestTierDismissed] = useState(false);

  // Auto-check guest VIP tier hint as soon as 10+ digits are typed
  // Chỉ phụ thuộc [phone, user, guestTierDismissed] (KHÔNG có guestTierHint) để tránh vòng lặp
  // gọi API mỗi khi kết quả cập nhật state; bỏ qua response cũ nhờ cờ `cancelled`.
  useEffect(() => {
    const cleanPhone = phone.trim().replace(/\s/g, "");
    if (user || guestTierDismissed || cleanPhone.length < 10) {
      if (cleanPhone.length < 10) {
        setGuestTierHint((prev) => (prev ? null : prev));
      }
      return;
    }
    const normalized = cleanPhone.startsWith("+84") ? "0" + cleanPhone.slice(3) : cleanPhone;
    const phoneRegex = /^0[35789]\d{8}$/;
    if (!phoneRegex.test(normalized) || /^(\d)\1{9}$/.test(normalized)) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setGuestTierChecking(true);
      checkGuestTierByPhone(cleanPhone)
        .then((hint) => {
          if (cancelled) return;
          setGuestTierHint(hint && hint.hasBenefit ? hint : null);
        })
        .catch(() => {
          if (cancelled) return;
          setGuestTierHint(null);
        })
        .finally(() => {
          if (cancelled) return;
          setGuestTierChecking(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setGuestTierChecking(false);
    };
  }, [phone, user, guestTierDismissed]);

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

  // Config
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [publicCampaigns, setPublicCampaigns] = useState<PublicCampaignItem[]>([]);
  const [publicCampaignsLoaded, setPublicCampaignsLoaded] = useState(false);
  const branches = useBranches();

  // Accordion summary expanded (default expanded so items are visible like on PC)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  // Operating hours check (09:00 - 23:00)
  const operatingStatus = useMemo(() => {
    return checkOperatingHours(config?.operating_hours, undefined, deliveryType);
  }, [config?.operating_hours, deliveryType]);

  const [deliverySchedule, setDeliverySchedule] = useState<"now" | "schedule">(() => {
    return operatingStatus.defaultDeliverySchedule || "now";
  });
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    return operatingStatus.defaultDate || "";
  });
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<string>("10:00");
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(() => {
    if (inline) return false;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("preorder_notice_dismissed") === "true") {
          return false;
        }
      } catch {
        // ignore
      }
    }
    return !operatingStatus.canOrderNow && !!operatingStatus.notice;
  });

  const handleCloseNoticeModal = useCallback(() => {
    setShowNoticeModal(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("preorder_notice_dismissed", "true");
      } catch {
        // ignore
      }
    }
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "TRANSFER">("COD");
  const [description, setDescription] = useState("");
  const [confirmInfo, setConfirmInfo] = useState(true);

  const [mapAddressValidation, setMapAddressValidation] = useState<AddressWardValidationResult | null>(null);

  const syncAddressValidation = useMemo(() => {
    return validateAddressWardMatch({
      streetAddress,
      note: description,
      selectedWard,
      selectedWardId,
      selectedDistrict,
      selectedProvince,
      availableWards,
    });
  }, [streetAddress, description, selectedWard, selectedWardId, selectedDistrict, selectedProvince, availableWards]);

  useEffect(() => {
    setMapAddressValidation(null);
  }, [streetAddress, selectedWard, selectedWardId, selectedDistrict]);

  const addressWardValidation = useMemo(() => {
    if (!syncAddressValidation.isValid || syncAddressValidation.suggestedWard) {
      return syncAddressValidation;
    }
    if (mapAddressValidation && (!mapAddressValidation.isValid || mapAddressValidation.suggestedWard)) {
      return mapAddressValidation;
    }
    return syncAddressValidation;
  }, [syncAddressValidation, mapAddressValidation]);

  const handleApplySuggestedWard = useCallback((suggested: WardCatalogEntry) => {
    setSelectedWardId(suggested.id);
    setSelectedWard(suggested.name);
    setSelectedDistrict(suggested.district || "");
    setMapAddressValidation(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.ward;
      delete next.address;
      return next;
    });
  }, []);

  useEffect(() => {
    if (operatingStatus) {
      if (!operatingStatus.canOrderNow) {
        setDeliverySchedule("schedule");
        if (!inline) {
          const isDismissed =
            typeof window !== "undefined" &&
            sessionStorage.getItem("preorder_notice_dismissed") === "true";
          if (!isDismissed) {
            setShowNoticeModal(!!operatingStatus.notice);
          }
        }
      }
      if (operatingStatus.defaultDate) {
        setDeliveryDate(operatingStatus.defaultDate);
      }
    }
  }, [operatingStatus, inline]);

  // Member card & loyalty settings state
  const [isMemberCardSelected, setIsMemberCardSelected] = useState<boolean>(true);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const prevUserRef = useRef(user);


  useEffect(() => {
    getLoyaltySettings(locale).then((s) => {
      setLoyaltySettings(s);
    });
  }, [locale]);

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

  // Helper to determine if we are in mobile viewport
  const isMobileScreen = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1280;
  }, []);

  const cartHistoryDepthRef = useRef<number>(0);
  const isPopStateNavigatingRef = useRef<boolean>(false);
  const isCartOpenRef = useRef<boolean>(isCartOpen);

  useEffect(() => {
    isCartOpenRef.current = isCartOpen;
  }, [isCartOpen]);

  // Clean up any stale modal state from previous page refresh
  useEffect(() => {
    if (!inline && typeof window !== "undefined" && !isCartOpen && window.history.state?.modal === "cart") {
      window.history.replaceState(null, "", window.location.href);
    }
  }, [inline, isCartOpen]);

  useEffect(() => {
    setIsVoucherModalOpen(false);
    if (isCartOpen && !inline) {
      setStep(1);
    }
  }, [isCartOpen, inline]);

  // Sync browser history with mobile cart open / close
  useEffect(() => {
    if (inline || !isMobileScreen()) return;

    if (isCartOpen) {
      if (typeof window !== "undefined" && window.history.state?.modal !== "cart") {
        window.history.pushState({ modal: "cart", step: 1 }, "", window.location.href);
        cartHistoryDepthRef.current = 1;
      } else if (typeof window !== "undefined" && window.history.state?.modal === "cart") {
        cartHistoryDepthRef.current = window.history.state.step || 1;
      }
    } else {
      if (
        typeof window !== "undefined" &&
        window.history.state?.modal === "cart" &&
        cartHistoryDepthRef.current > 0 &&
        !isPopStateNavigatingRef.current
      ) {
        const depth = cartHistoryDepthRef.current;
        cartHistoryDepthRef.current = 0;
        window.history.go(-depth);
      } else {
        cartHistoryDepthRef.current = 0;
      }
    }
  }, [isCartOpen, inline, isMobileScreen]);

  // Listen to popstate (Back / Forward button)
  useEffect(() => {
    if (inline) return;

    const handlePopState = (event: PopStateEvent) => {
      if (!isMobileScreen()) return;

      isPopStateNavigatingRef.current = true;
      const state = event.state;

      if (!state || state.modal !== "cart") {
        // Back from Step 1 -> Close cart
        cartHistoryDepthRef.current = 0;
        if (isCartOpenRef.current) {
          setStep(1);
          if (onClose) {
            onClose();
          } else {
            setIsCartOpen(false);
          }
        }
      } else if (state.modal === "cart") {
        // Step 1 <-> Step 2 or Forward into cart
        const targetStep = state.step === 2 ? 2 : 1;
        cartHistoryDepthRef.current = targetStep;
        setStep(targetStep);
        if (!isCartOpenRef.current) {
          setIsCartOpen(true);
        }
      }

      setTimeout(() => {
        isPopStateNavigatingRef.current = false;
      }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [inline, isMobileScreen, onClose, setIsCartOpen]);

  const handleGoToStep = useCallback((targetStep: 1 | 2) => {
    if (targetStep === 2) {
      if (!inline && isMobileScreen() && typeof window !== "undefined") {
        if (window.history.state?.modal !== "cart" || window.history.state?.step !== 2) {
          window.history.pushState({ modal: "cart", step: 2 }, "", window.location.href);
        }
        cartHistoryDepthRef.current = 2;
      }
      setStep(2);
    } else {
      setStep(1);
      if (
        !inline &&
        isMobileScreen() &&
        typeof window !== "undefined" &&
        window.history.state?.modal === "cart" &&
        window.history.state?.step === 2
      ) {
        cartHistoryDepthRef.current = 1;
        window.history.back();
      }
    }
  }, [inline, isMobileScreen]);

  const handleCloseDrawer = useCallback(() => {
    if (
      !inline &&
      isMobileScreen() &&
      typeof window !== "undefined" &&
      window.history.state?.modal === "cart" &&
      cartHistoryDepthRef.current > 0
    ) {
      const depth = cartHistoryDepthRef.current;
      cartHistoryDepthRef.current = 0;
      window.history.go(-depth);
    }
    setStep(1);
    if (onClose) {
      onClose();
    } else {
      setIsCartOpen(false);
    }
  }, [inline, isMobileScreen, onClose, setIsCartOpen]);

  useEffect(() => {
    getAvailableVouchers(locale).then(setAvailableVouchers).catch(() => setAvailableVouchers([]));
  }, [locale]);

  // Pending order (bank transfer QR)
  const [pendingOrder, setPendingOrder] = useState<OrderInitiated | null>(null);

  // Safety net: đóng drawer ở /order-success, hoặc khi route THỰC SỰ chuyển sang trang auth (không đóng khi đang ở sẵn trang đăng nhập và mở giỏ hàng)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    const hasPathnameChanged = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    const isAuthPage = pathname?.includes("signin") || pathname?.includes("login") || pathname?.includes("dang-nhap");
    const isOrderSuccess = pathname === "/order-success" || pathname?.includes("order-success") || pathname?.includes("dat-hang-thanh-cong");
    if (isOrderSuccess || (isAuthPage && hasPathnameChanged)) {
      if (pendingOrder) setPendingOrder(null);
      if (step !== 1) setStep(1);
      onClose?.();
    }
  }, [pathname, pendingOrder, step, onClose]);
  const availableDeliveryDates = useMemo(() => {
    const dates: { iso: string; label: string }[] = [];
    const refDate = getVietnamDate();
    const closeTime = deliveryType === "pickup" ? (operatingStatus.pickupClose || "22:30") : (operatingStatus.deliveryClose || "23:00");
    const outOfSlotsToday = isTodayOutOfScheduleSlots(closeTime, refDate, operatingStatus.bufferMinutes || 90, operatingStatus.scheduleCutoff || "21:30");
    const startOffset = (!operatingStatus.canOrderNow && (operatingStatus.isAfterCutoff || operatingStatus.isAfterClose)) || outOfSlotsToday || !operatingStatus.canScheduleToday ? 1 : 0;

    for (let i = startOffset; i < startOffset + 5; i++) {
      const d = new Date(refDate);
      d.setDate(d.getDate() + i);
      const iso = toISODateString(d);
      let label = formatVietnameseDate(d, locale);
      if (i === 0) label = t("date_today", { date: label });
      else if (i === 1) label = t("date_tomorrow", { date: label });
      dates.push({ iso, label });
    }
    return dates;
  }, [operatingStatus, deliveryType, locale, t]);

  const availableTimeSlots = useMemo(() => {
    const refDate = getVietnamDate();
    const todayISO = toISODateString(refDate);

    const minTime = deliveryType === "pickup" ? (operatingStatus.pickupOpen || "09:00") : (operatingStatus.deliveryOpen || "10:00");
    const maxTime = deliveryType === "pickup" ? (operatingStatus.pickupClose || "22:30") : (operatingStatus.deliveryClose || "23:00");

    let filterTime: string | undefined = undefined;
    if (deliveryDate === todayISO) {
      filterTime = getEarliestPreOrderSlot(refDate, minTime, 90);
    }

    return generate15MinTimeSlots(minTime, maxTime, filterTime, deliveryType);
  }, [deliveryDate, deliveryType, operatingStatus.deliveryOpen, operatingStatus.deliveryClose, operatingStatus.pickupOpen, operatingStatus.pickupClose]);

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

  // Load checkout config and active campaigns
  useEffect(() => {
    getActiveCampaigns(locale)
      .then(setPublicCampaigns)
      .catch(() => {})
      .finally(() => setPublicCampaignsLoaded(true));
    getCheckoutConfig(undefined, locale)
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
            { value: "delivery", label: t("delivery_home") },
            { value: "pickup", label: t("delivery_pickup") },
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
  }, [branches, locale, t]);

  // Cart-aware refetch: re-fetch with cartItems whenever cart changes (debounced 300ms)
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;
    const items = cartItems.map((item) => ({ product_id: item.productId }));
    const timer = setTimeout(() => {
      getCheckoutConfig(items, locale)
        .then((cfg) => {
          setConfig(cfg);
        })
        .catch((err) => {
          console.warn("Failed to reload checkout config with cart items:", err);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [cartItems, locale]);

  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [hotline, setHotline] = useState<string>("024.9999.7122");
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [hasCalculatedFee, setHasCalculatedFee] = useState<boolean>(false);
  const [originalFee, setOriginalFee] = useState<number>(0);
  const [shippingDiscount, setShippingDiscount] = useState<number>(0);
  const [isFreeship, setIsFreeship] = useState<boolean>(false);
  const [freeshipReason, setFreeshipReason] = useState<string | null>(null);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(false);

  useEffect(() => {
    getShippingSettings(locale).then(setShippingSettings);
    getGeneralSettings()
      .then((settings) => {
        if (settings?.hotline) {
          setHotline(settings.hotline);
        }
      })
      .catch(() => { });
  }, [locale]);

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
    const stored = getStoredCampaignIds();
    if (stored.length > 0) {
      setSelectedCampaignIds(stored);
    }
  }, []);

  const handleApplyCampaigns = useCallback((ids: (number | string)[]) => {
    setSelectedCampaignIds(ids);
    setVoucherError(null);
    setStoredCampaignIds(ids);
  }, []);

  const allPromotionsList = useMemo(() => {
    return mergePromotionsWithPublicCampaigns(
      config?.active_promotions,
      publicCampaigns
    ) as ActivePromotion[];
  }, [config?.active_promotions, publicCampaigns]);

  // Campaign G1 trong giỏ hàng (Mobile Flow)
  const cartCampaignG1 = useMemo(() => {
    if (!allPromotionsList || allPromotionsList.length === 0) return null;
    const checkAmount = originalSubtotal > 0 ? originalSubtotal : rawSubtotal;
    const discountedItems = cartItems.filter((it) => it.originalPrice && it.originalPrice > it.unitPrice);
    const activeSamePricePromos = !isBestDealVoucherApplied && discountedItems.length > 0
      ? allPromotionsList.filter((p) => {
          if (p.promotion_type !== "same_price_discount" || !p.items || p.items.length === 0) return false;
          return p.items.some((pi) =>
            discountedItems.some(
              (di) =>
                (pi.product_id && Number(pi.product_id) === Number(di.productId)) ||
                (pi.kiotviet_id && Number(pi.kiotviet_id) === Number(di.productId)) ||
                (pi.product_code && di.productCode && String(pi.product_code) === String(di.productCode))
            )
          );
        })
      : [];
    const selectedPromos = allPromotionsList.filter((p) =>
      selectedCampaignIds.some((id) => String(id) === String(p.id))
    );
    const promos = [
      ...selectedPromos,
      ...activeSamePricePromos.filter((sp) => !selectedPromos.some((p) => String(p.id) === String(sp.id))),
    ];
    if (promos.length === 0) return null;

    const noFreeshipPromo = promos.find(
      (p) => p.can_combine_with_freeship === false && (p.min_order_value || 0) <= checkAmount
    );
    if (noFreeshipPromo) return noFreeshipPromo;

    const orderDiscountPromo = promos.find(
      (p) => p.promotion_type === "order_discount" && checkAmount >= (p.min_order_value || 0)
    );
    if (orderDiscountPromo) return orderDiscountPromo;
    return promos.find((p) => (p.min_order_value || 0) <= checkAmount) || null;
  }, [allPromotionsList, originalSubtotal, rawSubtotal, selectedCampaignIds, cartItems, isBestDealVoucherApplied]);

  // Ma trận Khuyến mãi 6 Cases (Thông báo Voucher Mobile Flow)
  const promotionMatrixVoucherNotice = useMemo(() => {
    if (!appliedVoucher) return null;
    if (
      cartCampaignG1 &&
      cartCampaignG1.can_combine_with_freeship === false &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship !== false
    ) {
      return t("promo_voucher_no_combine_ship_restored", { code: appliedVoucher.code });
    }
    if (
      cartCampaignG1 &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship === false
    ) {
      return t("promo_voucher_no_combine", { code: appliedVoucher.code });
    }
    if (cartCampaignG1 && appliedVoucher.canCombineWithPromotions === false) {
      return t("promo_voucher_prioritized", { code: appliedVoucher.code });
    }
    return null;
  }, [appliedVoucher, cartCampaignG1, t]);

  const promotionMatrixShippingNotice = useMemo(() => {
    // Case 4: Mã G2 cấm cả promo & ship
    if (
      appliedVoucher &&
      !appliedVoucher.isFreeship &&
      appliedVoucher.canCombineWithPromotions === false &&
      appliedVoucher.canCombineWithFreeship === false
    ) {
      return t("promo_voucher_no_ship_discount", { code: appliedVoucher.code });
    }

    // Case 3: Mã G2 cấm giảm phí ship
    if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false) {
      return t("promo_voucher_no_ship_program", { code: appliedVoucher.code });
    }

    // Case 5: Campaign G1 can_combine_with_freeship = false, chưa add G2 (hoặc G2 không override)
    if (
      cartCampaignG1 &&
      cartCampaignG1.can_combine_with_freeship === false &&
      (!appliedVoucher || appliedVoucher.canCombineWithPromotions !== false)
    ) {
      return t("promo_campaign_no_ship_program", { name: cartCampaignG1.name });
    }

    return null;
  }, [appliedVoucher, cartCampaignG1, t]);

  const isFreeshipBlocked = useMemo(() => {
    const isG1BlockingFreeship = Boolean(
      cartCampaignG1 &&
      cartCampaignG1.can_combine_with_freeship === false &&
      !(appliedVoucher && appliedVoucher.canCombineWithPromotions === false && appliedVoucher.canCombineWithFreeship !== false)
    );
    const isG2BlockingFreeship = Boolean(
      appliedVoucher && appliedVoucher.canCombineWithFreeship === false
    );
    return isG1BlockingFreeship || isG2BlockingFreeship;
  }, [cartCampaignG1, appliedVoucher]);

  useEffect(() => {
    if (
      deliveryType !== "delivery" ||
      !cartItems ||
      cartItems.length === 0 ||
      (!selectedWard && !selectedWardId)
    ) {
      setCalculatedFee(0);
      setOriginalFee(0);
      setShippingDiscount(0);
      setIsFreeship(false);
      setFreeshipReason(null);
      setIsDeliverable(true);
      setShippingMessage(null);
      setAssignedBranchName(null);
      setCalculatingShipping(false);
      setHasCalculatedFee(false);
      return;
    }

    setCalculatingShipping(true);
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
          appliedVoucher && appliedVoucher.canCombineWithFreeship === false
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
        setHasCalculatedFee(true);

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
      })
      .finally(() => {
        setCalculatingShipping(false);
      });
  }, [deliveryType, selectedProvince, selectedDistrict, selectedWard, selectedWardId, rawSubtotal, appliedVoucher, appliedShippingVoucher, config?.branches, cartCampaignG1]);

  const defaultShippingFee = parseFloat(config?.default_shipping_fee || "30000") || 30000;
  const hasSelectedWard = Boolean(selectedWard || selectedWardId);
  const shippingFee =
    cartItems.length === 0 ||
    deliveryType !== "delivery" ||
    !hasSelectedWard ||
    !isDeliverable
      ? 0
      : isFreeship
        ? 0
        : hasCalculatedFee
          ? calculatedFee
          : calculatedFee || defaultShippingFee;

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
        pruneStoredVoucherCode(appliedVoucher.code);
        setAppliedVoucher(null);
        setVoucherSuccess(null);
        setBestDealNotice(null);
        setVoucherError(
          t("voucher_removed_min_not_met", {
            amount: appliedVoucher.prereqPrice.toLocaleString("vi-VN"),
          })
        );
        return;
      }

      // 2. Tính lại voucherDiscountAmount trên originalSubtotal
      const voucherDiscountAmount = calculateVoucherDiscount(
        appliedVoucher,
        originalSubtotal,
        shipping
      );
    } else {
      // Với voucher cộng dồn, kiểm tra prereqPrice dựa trên saleSubtotal
      if (appliedVoucher.prereqPrice && saleSubtotal < appliedVoucher.prereqPrice) {
        pruneStoredVoucherCode(appliedVoucher.code);
        setAppliedVoucher(null);
        setVoucherSuccess(null);
        setBestDealNotice(null);
        setVoucherError(
          t("voucher_removed_min_not_met", {
            amount: appliedVoucher.prereqPrice.toLocaleString("vi-VN"),
          })
        );
      }
    }
  }, [appliedVoucher, originalSubtotal, saleSubtotal, totalItemDiscount, shipping, t]);

  // Tự động dọn dẹp voucher/khuyến mãi và thẻ thành viên CHỈ khi người dùng đăng xuất thực sự (prevUserRef.current && !user)
  useEffect(() => {
    const isLoggingIn = Boolean(!prevUserRef.current && user);
    const isLoggingOut = Boolean(prevUserRef.current && !user);

    if (isLoggingIn) {
      setIsMemberCardSelected(true);
    }

    if (isLoggingOut) {
      const hasActivePromos = Boolean(appliedVoucher || appliedShippingVoucher || selectedCampaignIds.length > 0);
      if (hasActivePromos) {
        setAppliedVoucher(null);
        setAppliedShippingVoucher(null);
        setSelectedCampaignIds([]);
        setVoucherCode("");
        setVoucherSuccess(null);
        setVoucherError(null);
        setBestDealNotice(null);
        clearAllPromotionStorage();
      }
      setIsMemberCardSelected(false);
    }

    prevUserRef.current = user;
  }, [user, appliedVoucher, appliedShippingVoucher, selectedCampaignIds]);

  // Auto-prune stale selected campaigns if cart changes and campaign is no longer eligible
  useEffect(() => {
    if (!publicCampaignsLoaded) return;
    if (selectedCampaignIds.length === 0) return;
    if (!allPromotionsList || allPromotionsList.length === 0) return;
    if (!cartItems || cartItems.length === 0) return;

    const validCampaignIds = selectedCampaignIds.filter((id) => {
      const promo = allPromotionsList?.find((p) => String(p.id) === String(id));
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
      setStoredCampaignIds(validCampaignIds);
    }
  }, [publicCampaignsLoaded, selectedCampaignIds, allPromotionsList, subtotal, originalSubtotal, cartItems]);

  const foodVoucherDiscount = useMemo(() => {
    if (appliedVoucher?.isFreeship || appliedVoucher?.discountType === "freeship") return 0;
    return calculateVoucherDiscount(appliedVoucher, subtotal, shipping);
  }, [appliedVoucher, subtotal, shipping]);

  const shippingVoucherDiscount = useMemo(() => {
    const shipVoucher = appliedShippingVoucher || (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship") ? appliedVoucher : null);
    return calculateVoucherDiscount(shipVoucher, subtotal, shipping);
  }, [appliedShippingVoucher, appliedVoucher, subtotal, shipping]);

  const effectiveShippingFee =
    cartItems.length === 0 ||
    deliveryType !== "delivery" ||
    !hasSelectedWard ||
    !isDeliverable
      ? 0
      : Math.max(0, shipping - shippingVoucherDiscount);
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
      allPromotionsList?.find(
        (p) =>
          p.promotion_type === "order_discount" &&
          selectedCampaignIds.some((id) => String(id) === String(p.id)) &&
          evaluateCampaignEligibility(p, {
            subtotal,
            originalSubtotal,
            cartItems,
            isBrowseMode: false,
          }).eligible
      ) || null;
    return promo;
  }, [allPromotionsList, subtotal, originalSubtotal, cartItems, isBestDealVoucherApplied, selectedCampaignIds]);

  const autoOrderDiscountAmount = useMemo(() => {
    if (!eligibleOrderDiscountPromo) return 0;
    const type = eligibleOrderDiscountPromo.discount_type;
    const val = eligibleOrderDiscountPromo.discount_value;
    let disc = 0;
    if (type === "percent") {
      disc = Math.floor((subtotal * (val / 100)) / 1000) * 1000;
      if (eligibleOrderDiscountPromo.max_discount && eligibleOrderDiscountPromo.max_discount > 0) {
        disc = Math.min(disc, eligibleOrderDiscountPromo.max_discount);
      }
    } else if (type === "fixed") {
      disc = Math.floor(val / 1000) * 1000;
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
      allPromotionsList?.find(
        (p) =>
          p.promotion_type === "order_gift_discount" &&
          p.items &&
          p.items.length > 0 &&
          selectedCampaignIds.some((id) => String(id) === String(p.id)) &&
          evaluateCampaignEligibility(p, {
            subtotal,
            originalSubtotal,
            cartItems,
            isBrowseMode: false,
          }).eligible
      ) || null;
    return promo;
  }, [allPromotionsList, subtotal, originalSubtotal, cartItems, isBestDealVoucherApplied, selectedCampaignIds]);


  const [selectedOrderGiftId, setSelectedOrderGiftId] = useState<number | null>(null);
  const [isOrderGiftModalOpen, setIsOrderGiftModalOpen] = useState(false);
  const [selectedBuyXGetYPromoForModal, setSelectedBuyXGetYPromoForModal] = useState<ActivePromotion | null>(null);

  useEffect(() => {
    if (eligibleOrderGiftPromo) {
      const giftItems = getBuyXGetYGiftOnlyItems(eligibleOrderGiftPromo);
      if (giftItems.length > 0) {
        setSelectedOrderGiftId((prev) => {
          // State retention: giữ nguyên quà đã chọn nếu vẫn hợp lệ trong campaign và còn khả dụng
          if (prev && giftItems.some((i) => i.id === prev && i.is_available !== false)) {
            return prev;
          }
          const firstAvailable = giftItems.find((i) => i.is_available !== false) || giftItems[0];
          return firstAvailable ? firstAvailable.id : null;
        });
      } else {
        setSelectedOrderGiftId(null);
      }
    } else {
      // Chỉ reset null khi đơn hàng không còn thỏa mãn min_order_value hoặc không còn campaign quà khả dụng
      setSelectedOrderGiftId(null);
    }
  }, [eligibleOrderGiftPromo]);

  const selectedOrderGiftItem = useMemo(() => {
    if (!eligibleOrderGiftPromo) return null;
    const giftItems = getBuyXGetYGiftOnlyItems(eligibleOrderGiftPromo);
    if (!giftItems || giftItems.length === 0) return null;
    if (selectedOrderGiftId) {
      const found = giftItems.find((i) => i.id === selectedOrderGiftId);
      if (found && found.is_available !== false) return found;
      if (found) return found;
    }
    return giftItems.find((i) => i.is_available !== false) || giftItems[0] || null;
  }, [eligibleOrderGiftPromo, selectedOrderGiftId]);

  // 3. BUY X GET Y PROMOTIONS (Mua X tặng/giảm Y - chỉ kích hoạt khi nằm trong selectedCampaignIds)
  const eligibleBuyXGetYPromos = useMemo(() => {
    if (isBestDealVoucherApplied || !allPromotionsList) return [];
    if (selectedCampaignIds.length === 0) return [];
    return allPromotionsList.filter((p) => {
      if (p.promotion_type !== "buy_x_get_y" || getBuyXGetYGiftOnlyItems(p).length === 0) return false;
      if (!selectedCampaignIds.some((id) => String(id) === String(p.id))) return false;
      const res = evaluateCampaignEligibility(p, {
        subtotal,
        originalSubtotal,
        cartItems,
        isBrowseMode: false,
      });
      return res.eligible;
    });
  }, [allPromotionsList, cartItems, subtotal, originalSubtotal, isBestDealVoucherApplied, selectedCampaignIds]);


  const [selectedBuyXGetYMap, setSelectedBuyXGetYMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (eligibleBuyXGetYPromos.length > 0) {
      setSelectedBuyXGetYMap((prev) => {
        let updated = false;
        const next = { ...prev };
        eligibleBuyXGetYPromos.forEach((promo) => {
          const giftItems = getBuyXGetYGiftOnlyItems(promo);
          const currentId = next[promo.id];
          const isCurrentValid = currentId && giftItems.some((i) => i.id === currentId && i.is_available !== false);
          if (!isCurrentValid && giftItems.length > 0) {
            const firstAvailable = giftItems.find((i) => i.is_available !== false);
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
        const giftItems = getBuyXGetYGiftOnlyItems(promo);
        const firstAvailable = giftItems.find((i) => i.is_available !== false);
        const selectedId = selectedBuyXGetYMap[promo.id] || firstAvailable?.id;
        const item = giftItems.find((i) => i.id === selectedId && i.is_available !== false) || firstAvailable;
        if (!item) return null;
        const buyQty = Number(promo.settings?.buy_quantity ?? (promo as any).buy_quantity ?? promo.settings?.min_quantity ?? 1);
        const giftQty = Number(promo.settings?.gift_quantity ?? promo.settings?.get_quantity ?? (promo as any).gift_quantity ?? 1);
        const isFree = item?.campaign_price === 0 || Boolean(item?.is_free);
        const tag = isFree
          ? (locale === "en" ? `Buy ${buyQty} get ${giftQty}` : `Mua ${buyQty} tặng ${giftQty}`)
          : (locale === "en" ? `Buy ${buyQty} discount ${giftQty}` : `Mua ${buyQty} giảm ${giftQty}`);
        return {
          promo,
          item,
          tag,
          giftItems,
        };
      })
      .filter((x): x is { promo: ActivePromotion; item: PromotionGiftItem; tag: string; giftItems: PromotionGiftItem[] } => Boolean(x && x.item));
  }, [eligibleBuyXGetYPromos, selectedBuyXGetYMap, locale]);

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
    if (cartCampaignG1 && !list.some((p) => String(p.id) === String(cartCampaignG1.id))) {
      list.push(cartCampaignG1);
    }
    return list;
  }, [
    eligibleOrderDiscountPromo,
    eligibleOrderGiftPromo,
    selectedOrderGiftItem,
    eligibleBuyXGetYPromos,
    cartCampaignG1,
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
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const canCombineLoyaltyWithPromotions = Boolean(loyaltySettings?.can_combine_with_promotions);

  const isMemberExcludedByPromotions = useMemo(() => {
    if (canCombineLoyaltyWithPromotions) return false;
    if (appliedVoucher && appliedVoucher.canCombineWithPromotions === false) return true;
    if (appliedShippingVoucher && appliedShippingVoucher.canCombineWithPromotions === false) return true;

    const activePromos = (allPromotionsList || []).filter((c) =>
      selectedCampaignIds.some((id) => String(id) === String(c.id))
    );
    if (activePromos.some((c) => c.can_combine_with_promotions === false)) return true;
    if (cartCampaignG1 && cartCampaignG1.can_combine_with_promotions === false) return true;
    if (eligibleOrderGiftPromo && eligibleOrderGiftPromo.can_combine_with_promotions === false) return true;
    if (eligibleOrderDiscountPromo && eligibleOrderDiscountPromo.can_combine_with_promotions === false) return true;
    if (eligibleBuyXGetYPromos.some((p) => p.can_combine_with_promotions === false)) return true;

    return false;
  }, [
    canCombineLoyaltyWithPromotions,
    appliedVoucher,
    appliedShippingVoucher,
    allPromotionsList,
    selectedCampaignIds,
    cartCampaignG1,
    eligibleOrderGiftPromo,
    eligibleOrderDiscountPromo,
    eligibleBuyXGetYPromos,
  ]);

  const isExcludedByVoucher = isMemberExcludedByPromotions;

  const baseMemberDiscount = useMemo(() => {
    if (!user) return 0;
    return calculateMemberDiscount(user, regularPriceSubtotal);
  }, [user, regularPriceSubtotal]);

  const memberDiscount = (!isMemberCardSelected || isMemberExcludedByPromotions) ? 0 : baseMemberDiscount;

  const memberDiscountLabel = useMemo(() => {
    if (!user || memberTier.discountPercent <= 0) return "";
    const tierName = memberTier.name;
    if (memberTier.isUpgradeCelebration) {
      return (
        t("cost_summary.member_upgrade_label", {
          tier: tierName,
          percent: memberTier.discountPercent,
        }) || memberTier.label
      );
    }
    return (
      t("cost_summary.member_discount_label", {
        tier: tierName,
        percent: memberTier.discountPercent,
      }) || memberTier.label
    );
  }, [user, memberTier, t]);

  const total = cartItems.length === 0 ? 0 : Math.max(0, displaySubtotal - foodVoucherDiscount - autoOrderDiscountAmount - memberDiscount + effectiveShippingFee);

  const validateVoucherMutexLock = useCallback((voucherCandidate: {
    discount_type?: string;
    is_freeship?: boolean;
    can_combine_with_promotions?: boolean;
    can_combine_with_freeship?: boolean;
    code?: string;
  }): { allowed: boolean; message?: string } => {
    const activeCampaigns = (allPromotionsList || []).filter((c) =>
      selectedCampaignIds.some((id) => String(id) === String(c.id))
    );

    const isShip = Boolean(
      voucherCandidate.discount_type === "freeship" ||
      voucherCandidate.is_freeship ||
      voucherCandidate.code?.toUpperCase().includes("FREESHIP") ||
      voucherCandidate.code?.toUpperCase().includes("PHISHIP") ||
      (voucherCandidate.code && /^SHIP(\d+|K)?$/i.test(voucherCandidate.code))
    );

    // a) Nếu voucherCandidate.can_combine_with_promotions === false:
    // Tự động ưu tiên voucher và clear CTKM xung đột khi áp dụng thay vì chặn cứng
    // (Được xử lý tự động trong handleApplyVoucher / handleApplyVouchersFromModal)

    // b) Nếu là Voucher món (!isShip) VÀ có campaign trong activeCampaigns mang can_combine_with_promotions === false:
    if (!isShip) {
      const blockedCamp = activeCampaigns.find((c) => c.can_combine_with_promotions === false);
      if (blockedCamp) {
        return {
          allowed: false,
          message: t("mutex_campaign_blocks_food_voucher", { name: blockedCamp?.name || t("mutex_default_campaign_name") }),
        };
      }
    }

    // c) Nếu là Voucher ship (isShip) VÀ có campaign trong activeCampaigns mang can_combine_with_freeship === false:
    if (isShip) {
      const blockedCamp = activeCampaigns.find((c) => c.can_combine_with_freeship === false);
      if (blockedCamp) {
        return {
          allowed: false,
          message: t("mutex_campaign_blocks_ship_voucher"),
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
        message: tVoucher("order_voucher_no_freeship"),
      };
    }

    // e) Nếu là Voucher món có can_combine_with_freeship === false VÀ đang có appliedShippingVoucher:
    if (!isShip && voucherCandidate.can_combine_with_freeship === false && appliedShippingVoucher) {
      return {
        allowed: false,
        message: t("mutex_food_voucher_blocks_ship_voucher"),
      };
    }

    return { allowed: true };
  }, [allPromotionsList, selectedCampaignIds, appliedVoucher, appliedShippingVoucher, t, tVoucher]);

  // Apply Voucher
  const handleApplyVoucher = async (codeOverride?: string) => {
    const code = (typeof codeOverride === "string" ? codeOverride : voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError(t("validation.voucher_input_required"));
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
      const friendlyMsg = tVoucher("auto_freeship_friendly_tip");
      setBestDealNotice(friendlyMsg);
      setVoucherError(null);
      setVoucherSuccess(null);
      setAppliedVoucher(null);
      setValidatingVoucher(false);
      throw new Error(friendlyMsg);
    }

    if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false && isCodeFreeship) {
      const msg = tVoucher("order_voucher_no_freeship");
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
          setVoucherError(lockCheck.message || tVoucher("mutex_selected_promotions"));
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
          const friendlyMsg = tVoucher("auto_freeship_friendly_tip");
          setBestDealNotice(friendlyMsg);
          setVoucherError(null);
          setVoucherSuccess(null);
          setAppliedVoucher(null);
          throw new Error(friendlyMsg);
        }

        if (appliedVoucher && !appliedVoucher.isFreeship && appliedVoucher.canCombineWithFreeship === false && isCandidateFreeship) {
          const msg = tVoucher("order_voucher_no_freeship");
          setVoucherError(msg);
          setBestDealNotice(null);
          setVoucherSuccess(null);
          throw new Error(msg);
        }

        const canCombine = result.voucher.can_combine_with_promotions !== false;

        if (!canCombine) {
          setSelectedCampaignIds([]);
          setStoredCampaignIds([]);
          // 1. Điều kiện tối thiểu của voucher (prereqPrice) được xét dựa trên originalSubtotal
          const prereqPrice = Number(result.voucher.prereq_price || 0);
          if (prereqPrice > 0 && originalSubtotal < prereqPrice) {
            const msg = result.voucher.code.toUpperCase() === "WSBCT50K"
              ? t("voucher_min_order_for_code", { amount: prereqPrice.toLocaleString("vi-VN"), code: result.voucher.code })
              : tVoucher("min_spend_not_met", { amount: prereqPrice.toLocaleString("vi-VN") });
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
          setVoucherSuccess(result.message || t("voucher_apply_success"));
          setBestDealNotice(null);
          const codesToStore = isCandidateFreeship
            ? [appliedVoucher && !appliedVoucher.isFreeship ? appliedVoucher.code : null, result.voucher.code].filter(Boolean) as string[]
            : [result.voucher.code, appliedShippingVoucher?.code].filter(Boolean) as string[];
          setStoredVoucherCodes(codesToStore);
          return true;
        } else {
          // can_combine_with_promotions === true
          const prereqPrice = Number(result.voucher.prereq_price || 0);
          if (prereqPrice > 0 && saleSubtotal < prereqPrice) {
            const msg = result.voucher.code.toUpperCase() === "WSBCT50K"
              ? t("voucher_min_order_for_code", { amount: prereqPrice.toLocaleString("vi-VN"), code: result.voucher.code })
              : tVoucher("min_spend_not_met", { amount: prereqPrice.toLocaleString("vi-VN") });
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
          setVoucherSuccess(result.message || t("voucher_apply_success"));
          setBestDealNotice(null);
          const codesToStore = isCandidateFreeship
            ? [appliedVoucher && !appliedVoucher.isFreeship ? appliedVoucher.code : null, result.voucher.code].filter(Boolean) as string[]
            : [result.voucher.code, appliedShippingVoucher?.code].filter(Boolean) as string[];
          setStoredVoucherCodes(codesToStore);
          return true;
        }
      } else {
        if (
          result.message?.includes("Freeship tự động") ||
          result.message?.includes("freeship tự động") ||
          result.message?.includes("miễn phí vận chuyển tự động")
        ) {
          const friendlyMsg = tVoucher("auto_freeship_friendly_tip");
          setBestDealNotice(friendlyMsg);
          setVoucherError(null);
          setVoucherSuccess(null);
          setAppliedVoucher(null);
          throw new Error(friendlyMsg);
        }
        setVoucherError(result.message || t("voucher_invalid"));
        setAppliedVoucher(null);
        setBestDealNotice(null);
        throw new Error(result.message || t("voucher_invalid"));
      }
    } catch (err: any) {
      const msg = err?.message || t("voucher_validate_failed");
      if (
        msg.includes("Freeship tự động") ||
        msg.includes("freeship tự động") ||
        msg.includes("miễn phí vận chuyển tự động")
      ) {
        setBestDealNotice(
          tVoucher("auto_freeship_friendly_tip")
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
    setStoredVoucherCodes([]);
  }, []);

  const handleRemoveCampaign = useCallback(() => {
    setSelectedCampaignIds([]);
    setStoredCampaignIds([]);
  }, []);

  const handleClearAllPromotions = useCallback(() => {
    handleRemoveVoucher();
    handleRemoveCampaign();
    setIsMemberCardSelected(false);
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
    } else if (isMemberCardSelected) {
      setIsMemberCardSelected(false);
    } else {
      handleClearAllPromotions();
    }
  }, [appliedVoucher, appliedShippingVoucher, selectedCampaignIds, isMemberCardSelected, handleClearAllPromotions, handleRemoveVoucher, handleRemoveCampaign]);

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
          validationError = res.message || t("voucher_invalid");
        }
      }
      setAppliedVoucher(nextFood);
      setAppliedShippingVoucher(nextShip);
      if (nextFood?.canCombineWithPromotions === false || nextShip?.canCombineWithPromotions === false) {
        setSelectedCampaignIds([]);
        setStoredCampaignIds([]);
      }
      const isMemberActive = Boolean(
        user &&
        (memberTier.tier === "gold" || memberTier.tier === "diamond") &&
        isMemberCardSelected &&
        !isMemberExcludedByPromotions &&
        memberDiscount > 0
      );
      const effectiveCampaignCount = (nextFood?.canCombineWithPromotions === false ? 0 : selectedCampaignIds.length);
      const totalEffectiveAppliedCount =
        (nextFood ? 1 : 0) +
        (nextShip ? 1 : 0) +
        effectiveCampaignCount +
        (isMemberActive ? 1 : 0);

      const appliedVouchersCount = (nextFood ? 1 : 0) + (nextShip ? 1 : 0);
      if (appliedVouchersCount > 0) {
        setVoucherCode([nextFood?.code, nextShip?.code].filter(Boolean).join(", "));
        setVoucherSuccess(tVoucher("applied_vouchers_success_count", { count: appliedVouchersCount }));
        setIsVoucherModalOpen(false);
        const appliedCodes = [nextFood?.code, nextShip?.code].filter(Boolean) as string[];
        setStoredVoucherCodes(appliedCodes);
      } else {
        handleRemoveVoucher();
        if (validationError) {
          setVoucherError(validationError);
        }
        setIsVoucherModalOpen(false);
      }
    } catch (e: any) {
      console.error("Error applying vouchers from modal in MobileCartFlow:", e);
      setVoucherError(e?.message || t("voucher_apply_failed"));
    } finally {
      setValidatingVoucher(false);
    }
  }, [
    originalSubtotal,
    shipping,
    phone,
    user,
    memberTier,
    isMemberCardSelected,
    isMemberExcludedByPromotions,
    memberDiscount,
    selectedCampaignIds,
    token,
    saleSubtotal,
    handleRemoveVoucher,
  ]);

  const hasLoadedStoredVoucherRef = useRef(false);
  useEffect(() => {
    if (hasLoadedStoredVoucherRef.current) return;
    if (originalSubtotal <= 0) return;
    const stored = getStoredVoucherCodes();
    if (stored.length > 0) {
      hasLoadedStoredVoucherRef.current = true;
      handleApplyVouchersFromModal(stored).catch(() => { });
      return;
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
      setError(t("empty"));
      setLoading(false);
      return;
    }

    if (isOutOfStockOverall) {
      setError(t("oos_warning"));
      setLoading(false);
      return;
    }

    const opCheck = checkOperatingHours(config?.operating_hours, undefined, deliveryType);

    if (!name.trim()) {
      setFieldErrors(prev => ({ ...prev, name: t("validation.name_required") }));
      setLoading(false);
      return;
    }

    if (!phone.trim()) {
      setFieldErrors(prev => ({ ...prev, phone: t("validation.phone_required") }));
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setFieldErrors((prev) => ({ ...prev, email: t("validation.email_invalid") }));
        setLoading(false);
        return;
      }
    }

    if (deliveryType === "delivery") {
      if (!isSavedAddressSelected) {
        if (!selectedWard && !selectedWardId) {
          setFieldErrors((prev) => ({ ...prev, ward: t("validation.ward_required") }));
          setLoading(false);
          return;
        }
        if (!streetAddress.trim()) {
          setFieldErrors((prev) => ({ ...prev, address: t("validation.address_detail_required") }));
          setLoading(false);
          return;
        }
        const addrValidation = validateAddressWardMatch({
          streetAddress,
          note: description,
          selectedWard,
          selectedWardId,
          selectedDistrict,
          selectedProvince,
          availableWards,
        });
        if (!addrValidation.isValid && addrValidation.message) {
          setFieldErrors((prev) => ({ ...prev, address: addrValidation.message }));
          setLoading(false);
          return;
        }
        if (mapAddressValidation && !mapAddressValidation.isValid && mapAddressValidation.message) {
          setFieldErrors((prev) => ({ ...prev, address: mapAddressValidation.message }));
          setLoading(false);
          return;
        }
      } else {
        if (!streetAddress.trim() && !selectedSavedAddress?.full_address) {
          setFieldErrors((prev) => ({ ...prev, address: t("validation.address_detail_required") }));
          setLoading(false);
          return;
        }
      }
      if (!isDeliverable) {
        setError(t("validation.delivery_not_supported"));
        setLoading(false);
        return;
      }
    }

    if (!confirmInfo) {
      setError(t("validation.confirm_info_required"));
      setLoading(false);
      return;
    }

    let finalAddress = "";
    if (deliveryType === "delivery") {
      if (isSavedAddressSelected && selectedSavedAddress?.full_address) {
        finalAddress = cleanDuplicateAddressParts(selectedSavedAddress.full_address);
      } else {
        finalAddress = buildDeliveryAddress(streetAddress, selectedWard, selectedDistrict, selectedProvince);
      }
    } else {
      finalAddress = config?.branches?.find((b) => b.id === selectedBranchId)?.address || "";
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-mobile-cart`;

    let expectedDeliveryISO: string | undefined = undefined;
    if (deliveryType === "delivery" && (deliverySchedule === "schedule" || !opCheck.canOrderNow)) {
      const minAllowed = opCheck.deliveryOpen || "10:00";
      const maxAllowed = opCheck.deliveryClose || "23:00";

      if (!expectedDeliveryTime) {
        const msg = t("validation.delivery_time_required", { min: minAllowed, max: maxAllowed });
        setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
        setLoading(false);
        return;
      }
      if (expectedDeliveryTime < minAllowed || expectedDeliveryTime > maxAllowed) {
        const msg = t("validation.delivery_time_out_of_range", { min: minAllowed, max: maxAllowed });
        setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
        setLoading(false);
        return;
      }

      const [eH, eM] = expectedDeliveryTime.split(":").map(Number);
      if (eM % 15 !== 0) {
        const msg = t("validation.delivery_time_step");
        setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
        setLoading(false);
        return;
      }

      const refDate = getVietnamDate();
      const todayISO = toISODateString(refDate);
      if (deliveryDate === todayISO) {
        const curTime = getVietnamTimeString(refDate);
        if (curTime > (opCheck.scheduleCutoff || "21:30")) {
          const msg = t("validation.schedule_cutoff_passed", { cutoff: opCheck.scheduleCutoff || "21:30" });
          setFieldErrors((prev) => ({ ...prev, "delivery.expected_delivery": msg }));
          setLoading(false);
          return;
        }

        const curH = refDate.getHours();
        const curM = refDate.getMinutes();
        const minBufferM = curH * 60 + curM + 90;
        const selectedM = eH * 60 + eM;
        if (selectedM < minBufferM) {
          const msg = t("validation.preorder_min_buffer", { minutes: 90 });
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

    const activeSamePriceCampaignIds = !isBestDealVoucherApplied
      ? (allPromotionsList || [])
          .filter((p) => {
            if (p.promotion_type !== "same_price_discount") return false;
            const discountedItems = cartItems.filter(
              (it) => it.originalPrice && it.originalPrice > it.unitPrice
            );
            if (discountedItems.length === 0) return false;
            if (!p.items || p.items.length === 0) return false;
            return p.items.some((pi) =>
              discountedItems.some(
                (di) =>
                  (pi.product_id && Number(pi.product_id) === Number(di.productId)) ||
                  (pi.kiotviet_id && Number(pi.kiotviet_id) === Number(di.productId)) ||
                  (pi.product_code && di.productCode && String(pi.product_code) === String(di.productCode))
              )
            );
          })
          .map((p) => Number(p.id))
      : [];

    const appliedCampaignIds = !isBestDealVoucherApplied
      ? Array.from(
          new Set(
            [
              ...appliedCartPromotions.map((p) => Number(p.id)),
              ...selectedCampaignIds.map((id) => Number(id)),
              ...activeSamePriceCampaignIds,
            ].filter((id) => Number.isFinite(id) && id > 0)
          )
        )
      : [];

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
                is_gift: true,
                note: `Quà tặng đơn hàng (${eligibleOrderGiftPromo?.name || "Chiến dịch"})`,
              },
            ]
            : []),
          ...(activeBuyXGetYItems.map(({ promo, item, tag }) => {
            const isGift = Boolean(item.is_free || item.campaign_price === 0);
            return {
              product_id: item.product_id,
              product_variant_id: item.product_variant_id || undefined,
              product_code: item.product_code,
              kiotviet_id: item.kiotviet_id || undefined,
              product_name: `[ƯU ĐÃI COMBO] ${item.product_name}`,
              quantity: 1,
              price: isGift ? 0 : item.campaign_price,
              discount: 0,
              is_gift: isGift,
              note: `${tag} (${promo.name})`,
            };
          })),
        ],
        discount: voucherDiscount + autoOrderDiscountAmount + memberDiscount,
        member_discount: memberDiscount,
        member_tier: user && (memberTier.tier === "gold" || memberTier.tier === "diamond") ? memberTier.tier : undefined,
        tier_discount_percent: user && (memberTier.tier === "gold" || memberTier.tier === "diamond") ? memberTier.discountPercent : undefined,
        is_upgrade_reward: user && (memberTier.tier === "gold" || memberTier.tier === "diamond") ? Boolean(memberTier.isUpgradeCelebration) : undefined,
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
        campaign_id: (!isBestDealVoucherApplied && cartCampaignG1?.can_combine_with_freeship === false && Number(cartCampaignG1.id) > 0)
          ? Number(cartCampaignG1.id)
          : (appliedCampaignIds.length > 0 ? appliedCampaignIds[0] : undefined),
        campaign_ids: appliedCampaignIds.length > 0 ? appliedCampaignIds : undefined,
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

      // Reset step to 1 and clean up promotion state & storage
      setStep(1);
      setAppliedVoucher(null);
      setAppliedShippingVoucher(null);
      setSelectedCampaignIds([]);
      setVoucherCode("");
      setVoucherSuccess(null);
      setVoucherError(null);
      setBestDealNotice(null);

      clearAllPromotionStorage();

      if (paymentMethod === "COD") {
        const orderCode = result.data.order_code;
        const customerPhone = phone.trim();
        const successPath = locale === "en" ? "/en/order-success" : "/dat-hang-thanh-cong";
        const targetUrl = `${successPath}?code=${encodeURIComponent(orderCode)}&phone=${encodeURIComponent(customerPhone)}`;
        window.location.href = targetUrl;
        onClose?.();
      } else {
        setPendingOrder(result.data);
      }
    } catch (err: unknown) {
      const fallbackErrorMessage = t("submit_error_generic");

      if (err instanceof OrderApiError) {
        const displayMessage =
          err.message && !isTechnicalErrorMessage(err.message)
            ? err.message
            : fallbackErrorMessage;
        const campaignErrorMsg = err.errors?.campaign_id?.[0] || displayMessage;
        setError(campaignErrorMsg);

        if (err.errors?.campaign_id || err.errors?.used_campaign_ids) {
          setVoucherError(campaignErrorMsg);
          const rejectedIds = (err.errors?.used_campaign_ids || []).map((id) => String(id));
          setSelectedCampaignIds((prev) => {
            const next =
              rejectedIds.length > 0
                ? prev.filter((id) => !rejectedIds.includes(String(id)))
                : [];
            setStoredCampaignIds(next);
            return next;
          });

          const rejectedSamePricePromos = (allPromotionsList || []).filter(
            (p) =>
              p.promotion_type === "same_price_discount" &&
              (rejectedIds.length === 0 || rejectedIds.includes(String(p.id)))
          );
          const hasDiscountedCartItems = cartItems.some(
            (item) => item.originalPrice && item.originalPrice > item.unitPrice
          );
          if (rejectedSamePricePromos.length > 0 || hasDiscountedCartItems) {
            const blockedProductIds = rejectedSamePricePromos.flatMap((p) =>
              (p.items || [])
                .map((it) => Number(it.product_id || it.kiotviet_id || 0))
                .filter((id) => id > 0)
            );
            restoreCampaignItemsToOriginalPrice?.(
              blockedProductIds.length > 0 ? blockedProductIds : undefined
            );
          }
        }

        if (err.errors) {
          const mapped: Record<string, string> = {};
          Object.entries(err.errors).forEach(([key, msgs]) => {
            if (msgs[0]) mapped[key] = msgs[0];
          });
          setFieldErrors(mapped);
        }
      } else {
        const rawMessage =
          err instanceof Error ? err.message : fallbackErrorMessage;
        const displayMessage =
          rawMessage && !isTechnicalErrorMessage(rawMessage)
            ? rawMessage
            : fallbackErrorMessage;
        setError(displayMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPendingOrder = async () => {
    if (!pendingOrder) return;
    const orderCode = pendingOrder.order_code || (pendingOrder as any).code || "";
    const customerPhone = phone.trim() || "";
    try {
      await cancelOrderApi(
        orderCode,
        customerPhone,
        "Khách hàng hủy từ màn hình thanh toán VietQR"
      );
    } catch (err: unknown) {
      console.error("Lỗi khi hủy đơn hàng chờ thanh toán:", err);
    } finally {
      setPendingOrder(null);
    }
  };

  if (!inline && !isCartOpen) return null;

  // Render VietQR screen if order is pending bank transfer
  if (pendingOrder) {
    return (
      <div
        id="mobile-cart-flow-drawer"
        data-mobile-cart="true"
        onMouseDown={(e) => {
          if (!inline) {
            e.stopPropagation();
          }
        }}
        className={inline ? "w-full p-4 flex flex-col justify-start" : "fixed inset-0 bg-yellow z-[160] overflow-y-auto p-4 flex flex-col justify-start"}
      >
        <div className="max-w-md mx-auto w-full py-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <h2 className="title-1 font-display text-primary font-bold">{t("checkout")}</h2>
            {!inline && (
              <button
                onClick={async () => {
                  await handleCancelPendingOrder();
                  handleCloseDrawer();
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
            onSuccess={() => {
              setPendingOrder(null);
              handleCloseDrawer();
            }}
            onCancel={handleCancelPendingOrder}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id="mobile-cart-flow-drawer"
        data-mobile-cart="true"
        onMouseDown={(e) => {
          if (!inline) {
            e.stopPropagation();
          }
        }}
        className={inline ? "w-full text-gray-900 select-none" : "fixed inset-0 bg-yellow z-[160] overflow-y-auto p-4 text-gray-900 select-none"}
      >
        <div className={inline ? "w-full space-y-6" : "max-w-md mx-auto w-full py-4 space-y-6"}>
          {/* Header bar */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => handleGoToStep(1)}
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
                onClick={handleCloseDrawer}
                className="text-gray-400 hover:text-primary transition-colors text-2xl font-bold cursor-pointer"
                aria-label={tCommon("close")}
              >
                &times;
              </button>
            )}
          </div>

          {/* Step 1: Review items and voucher */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left duration-200 pb-6">
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-5">
                <h3 className="title-2 font-display text-primary font-bold border-b border-gray-100 pb-2">
                  {t("order_summary")}
                </h3>

                {isLoaded === false ? (
                  <div className="py-6 space-y-4 animate-pulse" data-testid="mobile-cart-loading-skeleton">
                    <div className="flex gap-3 items-center">
                      <div className="size-16 rounded-xl bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="body-1 text-gray-500 font-medium">{t("empty")}</p>
                    {/* Điều hướng sang trang /product và đóng giỏ hàng khi người dùng bấm tiếp tục mua sắm */}
                    <Link
                      href="/product"
                      onClick={() => {
                        cartHistoryDepthRef.current = 0;
                        setStep(1);
                        if (onClose) {
                          onClose();
                        } else {
                          setIsCartOpen(false);
                        }
                      }}
                      className="inline-block text-sm font-semibold text-secondary hover:underline"
                    >
                      {t("continue_shopping")}
                    </Link>
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
                              alt={getCartItemTitle(item, locale)}
                              fill
                              className="object-cover"
                            />
                            {isOut && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white bg-red-600/90 px-1 py-0.5 rounded text-center leading-none">
                                  {t("out_of_stock")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="title-3 text-primary font-bold font-display line-clamp-2 leading-snug break-words">
                                  {getCartItemTitle(item, locale)}
                                </h4>
                                {!isDefaultVariant(getCartItemVariant(item, locale)) && (
                                  <p className="text-xs sm:text-sm text-gray-500 font-semibold uppercase mt-0.5">
                                    {cleanVariantName(getCartItemVariant(item, locale))}
                                  </p>
                                )}
                                {isOut && (
                                  <span className="inline-block text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded mt-0.5">
                                    [{t("out_of_stock")}]
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-display text-secondary text-[13px] sm:text-sm font-bold leading-tight whitespace-nowrap block">
                                  {formatPrice(
                                    isBestDealVoucherApplied
                                      ? ((item.originalPrice && item.originalPrice > item.unitPrice) ? item.originalPrice : item.unitPrice)
                                      : item.unitPrice
                                  )}
                                </span>
                                {!isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice ? (
                                  <p className="text-[11px] sm:text-xs text-gray-400 line-through font-medium leading-tight">
                                    {formatPrice(item.originalPrice)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            {isBestDealVoucherApplied && item.originalPrice && item.originalPrice > item.unitPrice && (
                              <p className="text-[11px] text-secondary mt-1">
                                {t("promo_voucher_no_combine", { code: appliedVoucher?.code })}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              {/* Quantity selectors */}
                              <div className="flex items-center border border-gray-200 rounded-full p-0.5 bg-white shadow-2xs">
                                <button
                                  type="button"
                                  aria-label={tCart("decrease_quantity")}
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="size-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center text-gray-500 hover:text-primary active:scale-95 transition-transform font-bold text-sm disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  disabled={isOut || item.quantity <= 1}
                                >
                                  &minus;
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                      updateQuantity(item.id, Math.max(1, Math.min(99, val)));
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (isNaN(val) || val < 1) {
                                      updateQuantity(item.id, 1);
                                    } else if (val > 99) {
                                      updateQuantity(item.id, 99);
                                    }
                                  }}
                                  onClick={(e) => (e.target as HTMLInputElement).select()}
                                  aria-label={tCart("quantity")}
                                  className="w-10 text-center text-sm font-bold text-primary bg-transparent focus:outline-none focus:ring-1 focus:ring-secondary rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  disabled={isOut}
                                />
                                <button
                                  type="button"
                                  aria-label={tCart("increase_quantity")}
                                  onClick={() => updateQuantity(item.id, Math.min(99, item.quantity + 1))}
                                  className="size-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center text-gray-500 hover:text-primary active:scale-95 transition-transform font-bold text-sm disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                  disabled={isOut || item.quantity >= 99}
                                >
                                  +
                                </button>
                              </div>

                              {/* Delete button with Trash SVG */}
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                aria-label={tCart("remove_item_aria")}
                                className="p-1.5 text-red-500 hover:text-red-700 active:scale-90 transition-all rounded-full hover:bg-red-50 cursor-pointer"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="size-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.75}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Quà tặng đơn hàng (order_gift_discount) */}
                    {selectedOrderGiftItem && (
                      <div className="flex gap-3 py-2.5 px-3 bg-yellow/60 rounded-xl border border-secondary/30 items-start">
                        {selectedOrderGiftItem.image ? (
                          <div className="relative size-12 rounded-lg overflow-hidden bg-white border border-secondary/20 flex-shrink-0">
                            <Image
                              src={formatImageUrl(selectedOrderGiftItem.image)}
                              alt={
                                locale === "en" && selectedOrderGiftItem.product_name_en
                                  ? selectedOrderGiftItem.product_name_en
                                  : selectedOrderGiftItem.product_name
                              }
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="size-12 rounded-lg bg-yellow/80 border border-secondary/20 flex items-center justify-center text-[10px] font-bold text-brown uppercase flex-shrink-0 text-center">
                            {t("order_gift_tag")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="body-2 text-gray-900 font-bold font-display line-clamp-1">
                                {locale === "en" && selectedOrderGiftItem.product_name_en
                                  ? selectedOrderGiftItem.product_name_en
                                  : selectedOrderGiftItem.product_name}
                              </p>
                              {(() => {
                                const giftVar =
                                  locale === "en" && selectedOrderGiftItem.variant_name_en
                                    ? selectedOrderGiftItem.variant_name_en
                                    : selectedOrderGiftItem.variant_name;
                                return giftVar && !isDefaultVariant(giftVar) ? (
                                  <p className="text-[11px] text-gray-500 font-medium truncate">
                                    {cleanVariantName(giftVar)}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                            <span className="body-2 text-secondary font-bold whitespace-nowrap">
                              {selectedOrderGiftItem.campaign_price === 0 ? "0đ" : formatPrice(selectedOrderGiftItem.campaign_price)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-xs text-gray-500 font-medium">{t("qty_times", { count: 1 })}</span>
                            {(() => {
                              const giftCount = eligibleOrderGiftPromo ? getBuyXGetYGiftOnlyItems(eligibleOrderGiftPromo).length : 0;
                              return giftCount > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setIsOrderGiftModalOpen(true)}
                                  className="text-[10px] font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                                >
                                  {t("change_gift", { count: giftCount })}
                                </button>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Món ưu đãi combo Mua X tặng/giảm Y (buy_x_get_y) - Hỗ trợ nhiều chiến dịch */}
                    {activeBuyXGetYItems.map(({ promo, item, tag, giftItems }) => (
                      <div
                        key={`buyxy-${promo.id}-${item.id}`}
                        className="flex gap-3 py-2.5 px-3 bg-yellow/40 rounded-xl border border-primary/15 items-start animate-fade-in shadow-xs"
                      >
                        {item.image ? (
                          <div className="relative size-12 rounded-lg overflow-hidden bg-white border border-primary/20 flex-shrink-0">
                            <Image
                              src={formatImageUrl(item.image)}
                              alt={locale === "en" && item.product_name_en ? item.product_name_en : item.product_name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="size-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase flex-shrink-0 text-center p-1">
                            {t("combo_tag")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="body-2 text-gray-900 font-bold font-display line-clamp-1">
                                {locale === "en" && item.product_name_en ? item.product_name_en : item.product_name}
                              </p>
                              {(() => {
                                const giftVar =
                                  locale === "en" && item.variant_name_en
                                    ? item.variant_name_en
                                    : item.variant_name;
                                return giftVar && !isDefaultVariant(giftVar) ? (
                                  <p className="text-[11px] text-gray-500 font-medium truncate">
                                    {cleanVariantName(giftVar)}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                            <div className="text-right shrink-0">
                              {item.original_price > 0 && (
                                <span className="text-[10px] text-gray-400 line-through block">
                                  {formatPrice(item.original_price)}
                                </span>
                              )}
                              <span className="body-2 text-primary font-bold whitespace-nowrap">
                                {item.campaign_price === 0 ? "0đ" : formatPrice(item.campaign_price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {tag}
                              </span>
                              <span className="text-[10px] text-gray-500 font-medium">{t("qty_times", { count: 1 })}</span>
                              {item.campaign_price === 0 && (
                                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                                  {t("free_gift_badge")}
                                </span>
                              )}
                              {giftItems && giftItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBuyXGetYPromoForModal(promo)}
                                  className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                                >
                                  {t("change_gift", { count: giftItems.length })}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isLoaded !== false && cartItems.length > 0 && (
                <>
                  {/* Shopee-style Voucher Ticket Bar */}
                  {subtotal > 0 && (
                    <div className="space-y-2">
                      <VoucherTicketBar
                        appliedVoucher={appliedVoucher}
                        appliedShippingVoucher={appliedShippingVoucher}
                        activeCampaignName={
                          appliedVoucher?.canCombineWithPromotions === false
                            ? undefined
                            : (() => {
                                const p: any =
                                  cartCampaignG1 ||
                                  eligibleOrderGiftPromo ||
                                  eligibleBuyXGetYPromos[0] ||
                                  eligibleOrderDiscountPromo;
                                return p ? (locale === "en" && p.name_en ? p.name_en : p.name) : undefined;
                              })()
                        }
                        memberTierName={memberTier.name}
                        memberDiscountAmount={memberDiscount}
                        memberDiscountPercent={memberTier.discountPercent}
                        isMemberApplied={memberDiscount > 0 && !isMemberExcludedByPromotions}
                        onClick={() => setIsVoucherModalOpen(true)}
                        onRemove={handleRemovePromotionFromBar}
                      />
                      {voucherError && <p className="text-sm text-red-600 font-semibold mt-1 px-2">{voucherError}</p>}
                    </div>
                  )}

                  {/* Smart Cart Progress Bar (Thanh tiến độ thông minh) */}
                  {deliveryType !== "pickup" && (deliveryType as string) !== "takeaway" && shippingSettings?.is_min_amount_enabled && subtotal > 0 && (
                    <SmartCartProgressBar
                      subtotal={subtotal}
                      shippingSettings={shippingSettings}
                      isFreeship={isFreeship}
                      freeshipReason={freeshipReason}
                      vouchers={availableVouchers}
                      appliedVoucher={appliedVoucher as any}
                      appliedShippingVoucher={appliedShippingVoucher as any}
                      appliedCampaign={cartCampaignG1 || eligibleOrderGiftPromo || eligibleBuyXGetYPromos[0] || null}
                      onOpenVouchers={() => setIsVoucherModalOpen(true)}
                    />
                  )}

                  {/* Summary Panel */}
                  <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-3 font-sans">
                    {/* 1) Tạm tính */}
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-500 font-medium">{t("subtotal")}</span>
                      <span className="text-primary font-bold font-display">{formatOrderPrice(displaySubtotal)}</span>
                    </div>

                    {/* 2) Khuyến mãi đơn hàng tự động */}
                    {autoOrderDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-base text-secondary font-semibold">
                        <span className="flex-1 min-w-0 pr-1">{eligibleOrderDiscountPromo?.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          -{formatPrice(autoOrderDiscountAmount)}
                        </span>
                      </div>
                    )}

                    {/* 3) Mã giảm giá món ăn (chỉ hiển thị khi có giảm giá > 0đ, tránh hiện chữ Liên hệ) */}
                    {appliedVoucher && foodVoucherDiscount > 0 && (
                      <div className="flex justify-between items-start gap-3 text-base text-secondary font-semibold">
                        <span className="text-gray-500 flex-1 min-w-0 break-words break-all">{t("voucher_label")}</span>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          -{formatPrice(foodVoucherDiscount)}
                        </span>
                      </div>
                    )}

                    {/* 4) Ưu đãi chiết khấu thành viên */}
                    {user && (memberTier.tier === "gold" || memberTier.tier === "diamond") && (
                      !isMemberCardSelected ? (
                        <div className="flex justify-between items-center text-sm font-medium text-gray-500 animate-fade-in gap-2">
                          <span className="flex-1 min-w-0">
                            {t("cost_summary.member_discount_unselected")}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-right font-bold">
                            0đ
                          </span>
                        </div>
                      ) : isMemberExcludedByPromotions ? (
                        <div className="flex justify-between items-center text-sm font-medium text-gray-500 animate-fade-in gap-2">
                          <span className="flex-1 min-w-0">
                            {t("cost_summary.member_discount_mutex")}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-right font-bold">
                            0đ
                          </span>
                        </div>
                      ) : memberDiscount > 0 ? (
                        <div className="flex justify-between items-center text-base text-secondary font-semibold animate-fade-in">
                          <span className="flex-1 min-w-0">{memberDiscountLabel || t("cost_summary.member_discount_default")}</span>
                          <span className="shrink-0 whitespace-nowrap text-right">
                            -{formatPrice(memberDiscount)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm font-medium text-gray-500 animate-fade-in gap-2">
                          <div className="flex-1 min-w-0">
                            <span>{memberDiscountLabel || t("cost_summary.member_discount_default")}</span>
                            <span className="text-[11px] text-gray-500 font-normal block leading-tight mt-0.5">
                              {t("cost_summary.regular_price_only")}
                            </span>
                          </div>
                          <span className="shrink-0 whitespace-nowrap text-right font-bold">
                            0đ
                          </span>
                        </div>
                      )
                    )}

                    {/* 5) Phí vận chuyển (ở Bước 1) */}
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-500 font-medium">{t("shipping_fee")}</span>
                      <div className="text-right">
                        {cartItems.length === 0 ? (
                          <span className="text-secondary font-bold font-display">0đ</span>
                        ) : deliveryType === "pickup" ? (
                          <span className="text-secondary font-bold font-display">0đ ({t("delivery_pickup")})</span>
                        ) : !isDeliverable || (!selectedWard && !selectedWardId) ? (
                          <span className="text-gray-500 font-bold text-base">--</span>
                        ) : (shippingVoucherDiscount > 0 || appliedShippingVoucher || (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship"))) ? (
                          effectiveShippingFee === 0 ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {shipping > 0 && (
                                <span className="text-xs text-gray-400 line-through font-medium">
                                  {formatPrice(shipping)}
                                </span>
                              )}
                              <span className="text-secondary font-bold font-display">0đ</span>
                              <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                {t("code_badge", { code: appliedShippingVoucher?.code || appliedVoucher?.code || "" })}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs text-gray-400 line-through font-medium">
                                  {formatPrice(shipping)}
                                </span>
                                <span className="text-primary font-bold font-display">
                                  {formatPrice(effectiveShippingFee)}
                                </span>
                                <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                  {t("code_badge", { code: appliedShippingVoucher?.code || appliedVoucher?.code || "" })}
                                </span>
                              </div>
                              <span className="text-xs text-secondary font-semibold">
                                {t("shipping_discount_amount", { amount: formatPrice(shippingVoucherDiscount) })}
                              </span>
                            </div>
                          )
                        ) : isFreeship ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {originalFee > 0 && (
                              <span className="text-xs text-gray-400 line-through font-medium">
                                {formatPrice(originalFee)}
                              </span>
                            )}
                            <span className="text-secondary font-bold font-display">0đ</span>
                            <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                              {appliedShippingVoucher
                                ? t("code_badge", { code: appliedShippingVoucher.code })
                                : appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship")
                                  ? t("code_badge", { code: appliedVoucher.code })
                                  : tVoucher("auto_freeship_badge")}
                            </span>
                          </div>
                        ) : shippingDiscount > 0 && shippingFee < originalFee ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs text-gray-400 line-through font-medium">
                                {formatPrice(originalFee)}
                              </span>
                              <span className="text-primary font-bold font-display">
                                {formatPrice(shippingFee)}
                              </span>
                            </div>
                            <span className="text-xs text-secondary font-semibold">
                              {t("shipping_discount_amount", { amount: formatPrice(shippingDiscount) })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-primary font-bold font-display">
                            {shipping > 0 ? formatPrice(shipping) : "--"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 6) Tổng thanh toán */}
                    <div className="flex justify-between items-center text-base pt-2 border-t border-gray-100">
                      <span className="text-gray-900 font-bold">{t("total")}</span>
                      <span className="text-secondary font-bold font-display text-lg">
                        {formatOrderPrice(total)}
                      </span>
                    </div>
                  </div>

                  {/* Submit button step 1 (Normal flow at the bottom) */}
                  <div className="pt-2">
                    {isOutOfStockOverall && (
                      <p className="text-red-500 text-xs text-center font-medium mb-2">
                        {t("oos_warning")}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleGoToStep(2)}
                      disabled={isOutOfStockOverall}
                      className={`w-full font-bold rounded-full py-4 text-center transition-all font-display title-2 ${isOutOfStockOverall
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                        : "bg-secondary hover:bg-secondary/95 text-white shadow-[0_4px_12px_rgba(205,72,41,0.2)] active:scale-[0.99]"
                        }`}
                    >
                      {t("continue")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Checkout Form & Collapsible Summary */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-200 pb-6">
              {/* Banner Trạng thái hoạt động */}
              <div
                className={`p-4 rounded-xl border transition-colors ${operatingStatus.canOrderNow
                  ? "bg-yellow/60 border-secondary/30 text-brown"
                  : "bg-yellow/80 border-secondary/30 text-brown"
                  }`}
              >
                <div className="text-xs sm:text-sm font-semibold flex-1 leading-relaxed font-sans whitespace-pre-line">
                  {operatingStatus.canOrderNow
                    ? t("operating_banner_open", { openHours: operatingStatus.openHoursStr || "09:00 - 22:30" })
                    : t("operating_banner_preorder_only", { openHours: operatingStatus.openHoursStr || "09:00 - 22:30" })}
                </div>
              </div>

              {/* Thẻ Tóm tắt Tiền tinh gọn Step 2 */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-2.5 font-sans">
                {/* 1) Tạm tính */}
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-600">{t("subtotal")}</span>
                  <span className="text-primary font-bold text-base">
                    {isLoaded === false ? (
                      <span className="inline-block h-5 w-20 bg-gray-200 rounded animate-pulse align-middle" />
                    ) : (
                      formatOrderPrice(displaySubtotal)
                    )}
                  </span>
                </div>

                {/* 2) Giảm giá chiến dịch đơn hàng (order_discount) */}
                {autoOrderDiscountAmount > 0 && (
                  <div className="flex justify-between items-start gap-3 text-sm font-medium text-secondary border-t border-gray-200/60 pt-2.5 animate-fade-in">
                    <div className="flex-1 min-w-0 pr-1 leading-snug">
                      <span>{eligibleOrderDiscountPromo?.name}</span>
                    </div>
                    <span className="font-bold text-base shrink-0 whitespace-nowrap text-right leading-snug">
                      -{formatPrice(autoOrderDiscountAmount)}
                    </span>
                  </div>
                )}

                {/* 3) Mã giảm giá món ăn (CHỈ HIỂN THỊ KHI appliedVoucher && foodVoucherDiscount > 0) */}
                {appliedVoucher && foodVoucherDiscount > 0 && (
                  <div className="flex justify-between items-start gap-3 text-sm font-medium text-secondary border-t border-gray-200/60 pt-2.5">
                    <span className="flex-1 min-w-0 leading-snug break-words break-all">{t("voucher_label")}</span>
                    <span className="font-bold text-base shrink-0 whitespace-nowrap text-right">
                      -{formatPrice(foodVoucherDiscount)}
                    </span>
                  </div>
                )}

                {/* 4) Ưu đãi thành viên */}
                {user && (memberTier.tier === "gold" || memberTier.tier === "diamond") && (
                  !isMemberCardSelected ? (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500 border-t border-gray-200/60 pt-2.5 gap-2 animate-fade-in">
                      <span className="flex-1 min-w-0 leading-snug">
                        {t("cost_summary.member_discount_unselected")}
                      </span>
                      <span className="font-bold text-base shrink-0 whitespace-nowrap text-right">
                        0đ
                      </span>
                    </div>
                  ) : isMemberExcludedByPromotions ? (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500 border-t border-gray-200/60 pt-2.5 gap-2 animate-fade-in">
                      <span className="flex-1 min-w-0 leading-snug">
                        {t("cost_summary.member_discount_mutex")}
                      </span>
                      <span className="font-bold text-base shrink-0 whitespace-nowrap text-right">
                        0đ
                      </span>
                    </div>
                  ) : memberDiscount > 0 ? (
                    <div className="flex justify-between items-center text-sm font-medium text-secondary border-t border-gray-200/60 pt-2.5 gap-2 animate-fade-in">
                      <span className="flex-1 min-w-0 leading-snug">
                        {memberDiscountLabel || t("cost_summary.member_discount_default")}
                      </span>
                      <span className="font-bold text-base shrink-0 whitespace-nowrap text-right">
                        -{formatPrice(memberDiscount)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500 border-t border-gray-200/60 pt-2.5 gap-2 animate-fade-in">
                      <div className="flex-1 min-w-0 leading-snug">
                        <span>{memberDiscountLabel || t("cost_summary.member_discount_default")}</span>
                        <span className="text-[11px] text-gray-500 font-normal block leading-tight mt-0.5">
                          {t("cost_summary.regular_price_only")}
                        </span>
                      </div>
                      <span className="font-bold text-base shrink-0 whitespace-nowrap text-right">
                        0đ
                      </span>
                    </div>
                  )
                )}

                {/* 5) Phí giao hàng (hỗ trợ đầy đủ các trạng thái như Desktop) */}
                <div className="flex justify-between items-center text-sm font-medium border-t border-gray-200/60 pt-2.5">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <span>{t("shipping_fee")}</span>
                    {calculatingShipping && (
                      <span className="text-xs text-gray-400 animate-pulse">{t("shipping_calculating")}</span>
                    )}
                  </span>
                  <div className="text-right">
                    {deliveryType === "pickup" ? (
                      <span className="text-secondary font-bold text-base">{t("shipping_free_pickup", { label: t("delivery_pickup") })}</span>
                    ) : !isDeliverable || (!selectedWard && !selectedWardId) ? (
                      <span className="text-gray-500 font-bold text-base">--</span>
                    ) : (shippingVoucherDiscount > 0 || appliedShippingVoucher || (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship"))) ? (
                      effectiveShippingFee === 0 ? (
                        <div className="flex items-center gap-2">
                          {shipping > 0 && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(shipping)}
                            </span>
                          )}
                          <span className="text-secondary font-bold text-base">0đ</span>
                          <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                            {t("code_badge", { code: appliedShippingVoucher?.code || appliedVoucher?.code || "" })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(shipping)}
                            </span>
                            <span className="text-primary font-bold text-base">
                              {formatPrice(effectiveShippingFee)}
                            </span>
                            <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                              {t("code_badge", { code: appliedShippingVoucher?.code || appliedVoucher?.code || "" })}
                            </span>
                          </div>
                          <span className="text-xs text-secondary font-semibold">
                            {t("shipping_discount_amount", { amount: formatPrice(shippingVoucherDiscount) })}
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
                        <span className="text-secondary font-bold text-base">0đ</span>
                        <span className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                          {appliedShippingVoucher
                            ? t("code_badge", { code: appliedShippingVoucher.code })
                            : appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship")
                              ? t("code_badge", { code: appliedVoucher.code })
                              : tVoucher("auto_freeship_badge")}
                        </span>
                      </div>
                    ) : shippingDiscount > 0 && shippingFee < originalFee ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalFee)}
                          </span>
                          <span className="text-primary font-bold text-base">
                            {formatPrice(shippingFee)}
                          </span>
                        </div>
                        <span className="text-xs text-secondary font-semibold">
                          {t("shipping_discount_amount", { amount: formatPrice(shippingDiscount) })}
                        </span>
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

                {/* Thông báo inline đỏ dưới dòng phí ship theo Promotion Matrix */}
                {promotionMatrixShippingNotice && (
                  <p className="text-xs text-red-600 font-semibold px-1 pt-1 animate-fade-in">
                    {promotionMatrixShippingNotice}
                  </p>
                )}

                {/* Thẻ Cảnh báo Chưa hỗ trợ giao hàng */}
                {deliveryType === "delivery" && !isDeliverable && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 font-medium space-y-1.5 animate-fade-in">
                    <p className="text-red-900 font-bold text-sm">
                      {t("delivery_area_not_supported_title")}
                    </p>
                    <p className="text-red-700 leading-relaxed">
                      {t("delivery_area_not_supported_lead")} <strong>&quot;{t("delivery_pickup")}&quot;</strong> {t("delivery_area_not_supported_or_contact")}{" "}
                      <a href={`tel:${hotline.replace(/[^0-9+]/g, "")}`} className="font-bold underline text-red-900 hover:text-red-950">
                        {hotline}
                      </a>{" "}
                      {t("delivery_area_not_supported_for_help")}
                    </p>
                  </div>
                )}

                {/* 6) Tổng thanh toán */}
                <div className="flex justify-between items-center border-t border-gray-200/80 pt-3 gap-2">
                  <span className="text-gray-900 font-bold text-sm flex-1 min-w-0">{t("total")}</span>
                  <span className="text-xl font-display text-secondary font-extrabold shrink-0 whitespace-nowrap text-right tracking-tight">
                    {isLoaded === false ? (
                      <span data-testid="mobile-total-skeleton" className="inline-block h-7 w-28 bg-gray-200 rounded animate-pulse align-middle" />
                    ) : (
                      formatOrderPrice(total)
                    )}
                  </span>
                </div>
              </div>


              {/* Checkout contact details */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 space-y-6 font-serif">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="title-2 font-display text-primary font-bold">
                    {t("customer_info")}
                  </h3>
                  {user && (memberTier.tier === "gold" || memberTier.tier === "diamond") && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-sans shadow-xs ${memberTier.tier === "diamond"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                    >
                      {memberTier.tier === "diamond" ? t("tier_diamond_badge") : t("tier_gold_badge")}
                    </span>
                  )}
                </div>

                {error && !fieldErrors["delivery.expected_delivery"] && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-3">
                  <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                    {t("name")}
                    <RequiredMark />
                  </label>
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
                  <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                    {t("phone")}
                    <RequiredMark />
                  </label>
                  <input
                    type="tel"
                    placeholder={t("phone_placeholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                  />
                  {fieldErrors.phone && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.phone}</p>}
                  {!user && !guestTierDismissed && guestTierHint && guestTierHint.hasBenefit && (
                    <GuestTierHintBanner
                      tier={guestTierHint.tier as "gold" | "diamond"}
                      discountPercent={guestTierHint.discountPercent}
                      loginHref={{
                        pathname: "/signin",
                        query: {
                          redirect: "/checkout",
                          ...(phone?.trim() ? { phone: phone.trim() } : {})
                        }
                      }}
                      onLoginClick={onClose}
                      isUpgradeCelebration={guestTierHint.isUpgradeCelebration}
                      onDismiss={() => {
                        setGuestTierDismissed(true);
                        setGuestTierHint(null);
                      }}
                      autoDismissMs={0}
                    />
                  )}
                </div>

                {/* Email */}
                <div className="space-y-3">
                  <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                    {t("email_label")}
                  </label>
                  <input
                    type="email"
                    placeholder={t("email_placeholder")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    className="w-full h-11 rounded-[4px] border border-gray-300 shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none focus:border-primary text-base font-serif font-normal leading-[150%] tracking-[0%]"
                  />
                  {fieldErrors.email && <p className="text-sm text-red-600 mt-1 font-semibold">{fieldErrors.email}</p>}
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

                    {/* 1. Skeleton Loading khi đang tải sổ địa chỉ của khách hàng đã đăng nhập */}
                    {isMounted && isUserLoggedIn && isLoadingCustomerAddresses && (
                      <div
                        data-testid="address-book-skeleton"
                        className="space-y-3 p-3.5 bg-yellow/30 rounded-xl border border-secondary/20 font-serif animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <span className="text-sm">📍</span>
                            <span>{t("loading_addresses")}</span>
                          </span>
                          <span className="text-xs text-secondary/60 font-semibold">
                            {t("please_wait")}
                          </span>
                        </div>

                        {/* Mock Dropdown Box */}
                        <div className="w-full h-10 rounded-[6px] border border-gray-200 bg-white/80 px-3 flex items-center justify-between shadow-xs">
                          <div className="h-3.5 bg-gray-200 rounded-sm w-3/5" />
                          <div className="size-3.5 bg-gray-200 rounded-xs" />
                        </div>

                        {/* Mock Selected Address Summary Card */}
                        <div className="mt-2.5 p-3 bg-white/90 rounded-lg border border-secondary/15 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3.5 bg-gray-200 rounded-full" />
                              <div className="h-3.5 bg-gray-200 rounded-sm w-28" />
                              <div className="h-3 bg-gray-100 rounded-sm w-16" />
                            </div>
                            <div className="h-4 bg-secondary/15 rounded-full w-14" />
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="size-3.5 bg-gray-200 rounded-xs shrink-0" />
                            <div className="h-3 bg-gray-200 rounded-sm w-4/5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Khối Chọn từ Danh sách địa chỉ (dành cho khách hàng đã đăng nhập khi đã tải xong) */}
                    {isMounted && isUserLoggedIn && !isLoadingCustomerAddresses && customerAddresses.length > 0 && (
                      <div className="space-y-2 p-3.5 bg-yellow/40 rounded-xl border border-secondary/20 font-serif animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <span>📍</span>
                            <span>{t("address_book_select")}</span>
                          </span>
                          <Link href={"/profile?tab=addresses" as any} className="text-xs text-secondary hover:underline font-semibold">
                            {t("address_book_link")}
                          </Link>
                        </div>
                        <select
                          data-testid="customer-address-select"
                          value={selectedAddressId || "new"}
                          onChange={(e) =>
                            handleSelectCustomerAddress(
                              e.target.value === "new" ? "new" : Number(e.target.value)
                            )
                          }
                          className="w-full h-10 rounded-[6px] border border-gray-300 px-3 bg-white text-gray-900 text-xs sm:text-sm font-serif cursor-pointer focus:border-primary focus:outline-none"
                        >
                          {customerAddresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.recipient_name} ({addr.phone}) - {cleanDuplicateAddressParts(addr.full_address || buildDeliveryAddress(addr.street_address, addr.ward, addr.district, addr.province))} {addr.is_default ? ` (${t("default_badge")})` : ""}
                            </option>
                          ))}
                          <option value="new">{t("enter_other_address")}</option>
                        </select>

                        {/* Hiển thị tóm tắt địa chỉ đã chọn khi dùng địa chỉ trong sổ */}
                        {isSavedAddressSelected && selectedSavedAddress && (
                          <div className="mt-2.5 p-3 bg-white rounded-lg border border-secondary/20 shadow-xs text-xs text-gray-700 space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-bold text-gray-900 flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">👤</span>
                                <span className="truncate">{selectedSavedAddress.recipient_name}</span>
                                <span className="text-gray-300 font-normal shrink-0">|</span>
                                <span className="text-gray-600 font-medium shrink-0">{selectedSavedAddress.phone}</span>
                              </div>
                              {selectedSavedAddress.is_default && (
                                <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] bg-secondary/10 text-secondary font-semibold px-2 py-0.5 rounded-full border border-secondary/20">
                                  {t("default_badge")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-1.5 text-gray-600">
                              <span className="shrink-0 text-primary">🏡</span>
                              <span className="leading-relaxed">
                                {cleanDuplicateAddressParts(
                                  selectedSavedAddress.full_address ||
                                  buildDeliveryAddress(
                                    selectedSavedAddress.street_address,
                                    selectedSavedAddress.ward,
                                    selectedSavedAddress.district,
                                    selectedSavedAddress.province
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Các ô input nhập địa chỉ mới: chỉ hiển thị khi chưa chọn địa chỉ đã lưu và không đang tải */}
                    {!isSavedAddressSelected && (!isUserLoggedIn || !isLoadingCustomerAddresses) && (
                      <div className="space-y-4 animate-fade-in">
                        {isMounted && isUserLoggedIn && customerAddresses.length > 0 && (
                          <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                              <span>📝</span>
                              <span>{t("new_address_heading")}</span>
                            </span>
                            {(streetAddress || selectedWard || selectedWardId) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStreetAddress("");
                                  setSelectedWard("");
                                  setSelectedWardId("");
                                  setSelectedDistrict("");
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.ward;
                                    delete next.address;
                                    return next;
                                  });
                                }}
                                className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>✕</span>
                                <span>{t("clear_quick")}</span>
                              </button>
                            )}
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                            {t("province_label")}
                            <RequiredMark />
                          </label>
                          <select
                            value={selectedProvince}
                            onChange={(e) => {
                              const newProv = e.target.value;
                              setSelectedProvince(newProv);
                              setSelectedDistrict("");
                              setSelectedWard("");
                              setSelectedWardId("");
                              setCalculatedFee(0);
                              setOriginalFee(0);
                              setShippingDiscount(0);
                              setIsFreeship(false);
                              setFreeshipReason(null);
                              setIsDeliverable(true);
                              setShippingMessage(null);
                              setAssignedBranchName(null);
                              setHasCalculatedFee(false);
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
                              setSelectedDistrict("");
                              setCalculatedFee(0);
                              setOriginalFee(0);
                              setShippingDiscount(0);
                              setIsFreeship(false);
                              setFreeshipReason(null);
                              setIsDeliverable(true);
                              setShippingMessage(null);
                              setAssignedBranchName(null);
                              setHasCalculatedFee(false);
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
                          errorMessage={fieldErrors.ward || t("validation.ward_required")}
                        />

                        <div className="space-y-3">
                          <label className="text-base font-serif font-semibold leading-[150%] tracking-[0.04em] text-primary block">
                            {t("street_label")}
                            <RequiredMark />
                          </label>
                          <input
                            type="text"
                            placeholder={t("address_placeholder")}
                            value={streetAddress}
                            onChange={(e) => {
                              setStreetAddress(e.target.value);
                              if (fieldErrors.address) {
                                setFieldErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.address;
                                  return next;
                                });
                              }
                            }}
                            onBlur={() => {
                              if (
                                process.env.NODE_ENV !== "test" &&
                                streetAddress.trim().length >= 5 &&
                                syncAddressValidation.isValid &&
                                !syncAddressValidation.suggestedWard
                              ) {
                                verifyAddressViaMapApi({
                                  streetAddress,
                                  note: description,
                                  selectedWard,
                                  selectedWardId,
                                  selectedDistrict,
                                  selectedProvince,
                                  availableWards,
                                })
                                  .then((res) => {
                                    if (res) setMapAddressValidation(res);
                                  })
                                  .catch(() => {});
                              }
                            }}
                            className={`w-full h-11 rounded-[4px] border shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-[14px] py-[10px] bg-white text-gray-900 focus:outline-none text-base font-serif font-normal leading-[150%] tracking-[0%] ${
                              !addressWardValidation.isValid || fieldErrors.address
                                ? "border-secondary"
                                : "border-gray-300"
                            }`}
                          />
                          {!addressWardValidation.isValid && addressWardValidation.message ? (
                            <div
                              data-testid="mobile-address-ward-mismatch-warning"
                              className="mt-2 rounded-lg border border-secondary/30 bg-yellow/60 p-3 text-xs text-secondary space-y-2"
                            >
                              <p className="font-semibold leading-snug">
                                {addressWardValidation.message}
                              </p>
                              {addressWardValidation.suggestedWard && (
                                <button
                                  type="button"
                                  data-testid="mobile-apply-suggested-ward-btn"
                                  onClick={() => handleApplySuggestedWard(addressWardValidation.suggestedWard!)}
                                  className="inline-flex items-center gap-1.5 rounded-[4px] bg-secondary px-3 py-1.5 text-xs font-bold text-white hover:bg-secondary/90 transition-colors cursor-pointer shadow-xs"
                                >
                                  <span>
                                    Đổi sang {formatWardLabel(addressWardValidation.suggestedWard.name, addressWardValidation.suggestedWard.district)}
                                  </span>
                                </button>
                              )}
                            </div>
                          ) : fieldErrors.address ? (
                            <p className="text-sm text-secondary mt-1 font-semibold">{fieldErrors.address}</p>
                          ) : addressWardValidation.isValid &&
                            !selectedWard &&
                            !selectedWardId &&
                            addressWardValidation.suggestedWard ? (
                            <div
                              data-testid="mobile-address-ward-suggestion-chip"
                              className="mt-2 flex items-center flex-wrap gap-1.5 rounded-lg border border-secondary/25 bg-yellow/50 px-3 py-1.5 text-xs text-brown"
                            >
                              <span>Gợi ý theo địa chỉ:</span>
                              <button
                                type="button"
                                data-testid="mobile-select-suggested-ward-btn"
                                onClick={() => handleApplySuggestedWard(addressWardValidation.suggestedWard!)}
                                className="font-bold text-primary underline hover:text-secondary cursor-pointer"
                              >
                                Chọn {formatWardLabel(addressWardValidation.suggestedWard.name, addressWardValidation.suggestedWard.district)}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

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
                        {config?.branches.map((b) => {
                          const displayName = formatBranchDisplayName(b, locale);
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
                        <p>{t("pickup_address_label")} {locale === "en" ? (identifyBrandBranch(config?.branches.find(b => b.id === selectedBranchId))?.addressEn || config?.branches.find(b => b.id === selectedBranchId)?.address) : config?.branches.find(b => b.id === selectedBranchId)?.address}</p>
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
                      {/* Option 1: Giao ngay (Chỉ hiển thị khi trong giờ nhận đơn ngay 09:00 - 22:30 / canOrderNow) */}
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

                          {/* Microcopy 2 dưới ô Giao ngay */}
                          {deliverySchedule === "now" && (
                            <p className="text-xs text-gray-500 font-normal pl-6 mt-0.5">
                              {t("microcopy_delivery_now")}
                            </p>
                          )}
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

                        {/* Microcopy cảnh báo khi hết slot đặt trước trong ngày */}
                        {operatingStatus.canOrderNow && !operatingStatus.canScheduleToday && (
                          <p className="text-xs font-normal pl-6 mt-0.5">
                            <span className="text-amber-700 font-medium">
                              {t("microcopy_schedule_cutoff")}
                            </span>
                          </p>
                        )}
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
                            <span>{t("select_delivery_date")}</span>
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
                            <span>{t("select_delivery_time", {
                              range: (operatingStatus.deliveryOpen || "10:00") + " - " + (operatingStatus.deliveryClose || "23:00"),
                              hours: (operatingStatus.deliveryOpen || "10:00") + " - " + (operatingStatus.deliveryClose || "23:00")
                            })}</span>
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
                                  {t("preorder_closed_today")}
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

              {/* Submit checkout button (Normal flow at the bottom) */}
              <div className="pt-4 pb-2 w-full">
                {isOutOfStockOverall && (
                  <p className="text-red-500 text-xs text-center font-medium mb-2">
                    {t("oos_warning")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !confirmInfo || (deliveryType === "delivery" && !isDeliverable) || isOutOfStockOverall}
                  className="w-full bg-secondary hover:bg-secondary/95 text-white font-bold rounded-full py-4 text-center transition-all shadow-[0_4px_12px_rgba(205,72,41,0.2)] font-display title-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
                >
                  {loading
                    ? t("submitting")
                    : deliveryType === "delivery" && !isDeliverable
                      ? t("delivery_area_not_supported_btn")
                      : !operatingStatus.canOrderNow || (deliveryType === "delivery" && deliverySchedule === "schedule")
                        ? t("preorder_cta")
                        : t("place_order")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!inline && (
        <PreOrderNoticeModal
          isOpen={showNoticeModal}
          onClose={handleCloseNoticeModal}
          notice={operatingStatus.notice}
          zIndex="z-[200]"
        />
      )}

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
        isFreeshipBlocked={isFreeshipBlocked}
        appliedVoucherCode={appliedVoucher?.code || appliedShippingVoucher?.code || ""}
        appliedVoucherCodes={[appliedVoucher?.code, appliedShippingVoucher?.code].filter(Boolean) as string[]}
        appliedCampaignIds={selectedCampaignIds}
        cartItems={cartItems}
        onApplyCampaigns={handleApplyCampaigns}
        onApplyVouchers={handleApplyVouchersFromModal}
        onApplyVoucher={handleApplyVoucherFromModal}
        onRemoveVoucher={handleRemoveVoucher}
        isBrowseOnly={false}
        activePromotions={appliedCartPromotions}
        user={user}
        memberTier={memberTier.tier}
        privateVouchers={sessionPrivateVouchers}
        onAddPrivateVoucher={handleAddPrivateVoucherFromModal}
        isMemberCardSelected={isMemberCardSelected}
        onToggleMemberCard={setIsMemberCardSelected}
        loyaltySettings={loyaltySettings}
        shippingSettings={shippingSettings}
        campaigns={publicCampaigns.length > 0 ? publicCampaigns : undefined}
      />

      {/* Order Gift Selector Modal */}
      {eligibleOrderGiftPromo && (
        <GiftSelectorModal
          isOpen={isOrderGiftModalOpen}
          onClose={() => setIsOrderGiftModalOpen(false)}
          title={t("order_gift_tag")}
          subtitle={t("campaign_subtitle", {
            name:
              locale === "en" && eligibleOrderGiftPromo.name_en
                ? eligibleOrderGiftPromo.name_en
                : eligibleOrderGiftPromo.name,
          })}
          items={getBuyXGetYGiftOnlyItems(eligibleOrderGiftPromo)}
          selectedId={selectedOrderGiftId}
          onSelect={(item) => {
            setSelectedOrderGiftId(item.id);
          }}
        />
      )}

      {/* Buy X Get Y Gift Selector Modal */}
      {selectedBuyXGetYPromoForModal && (() => {
        const giftOnlyItems = getBuyXGetYGiftOnlyItems(selectedBuyXGetYPromoForModal);
        return (
          <GiftSelectorModal
            isOpen={!!selectedBuyXGetYPromoForModal}
            onClose={() => setSelectedBuyXGetYPromoForModal(null)}
            title={t("combo_tag")}
            subtitle={t("campaign_subtitle", {
              name:
                locale === "en" && selectedBuyXGetYPromoForModal.name_en
                  ? selectedBuyXGetYPromoForModal.name_en
                  : selectedBuyXGetYPromoForModal.name,
            })}
            items={giftOnlyItems}
            selectedId={selectedBuyXGetYMap[selectedBuyXGetYPromoForModal.id] || giftOnlyItems.find((i) => i.is_available !== false)?.id || null}
            onSelect={(item) => {
              setSelectedBuyXGetYMap((prev) => ({
                ...prev,
                [selectedBuyXGetYPromoForModal.id]: item.id,
              }));
            }}
          />
        );
      })()}
    </>
  );
}
