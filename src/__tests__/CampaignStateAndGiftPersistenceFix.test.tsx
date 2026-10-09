import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CouponModal, { evaluateCampaignEligibility } from "@/components/Voucher/CouponModal";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import { PublicCampaignItem, getBuyXGetYGiftOnlyItems } from "@/types/campaign";
import { getStoredCampaignIds, setStoredCampaignIds } from "@/utils/promotionStorage";
import * as orderService from "@/services/orderService";
import viMessages from "@/i18n/locales/vi.json";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "vi",
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split(".");
      let current: any = viMessages;
      for (const p of parts) {
        if (current && typeof current === "object" && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      return typeof current === "string" ? current : key;
    };
    const t: any = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    };
    t.rich = (key: string, values?: any) => {
      let text = resolveKey(key);
      if (values?.content) {
        text = text.replace("{content}", values.content);
      }
      return text;
    };
    return t;
  },
}));

// Mock routing
vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  usePathname: () => "/checkout",
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, className, onError, ...props }: any) => (
    <img src={src} alt={alt || ""} className={className} onError={onError} {...props} />
  ),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({ tier: "member", name: "Thành viên", discountPercent: 0 }),
  calculateMemberDiscount: () => 0,
}));

// Mock CartContext
let mockCartItems: any[] = [];
const mockUpdateQuantity = vi.fn();
const mockRemoveFromCart = vi.fn();
const mockClearCart = vi.fn();
const mockSetIsCartOpen = vi.fn();
const mockAddToCart = vi.fn();

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    subtotal: mockCartItems.reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 1), 0),
    totalItems: mockCartItems.reduce((acc, item) => acc + (item.quantity || 1), 0),
    hasOutOfStockItems: false,
    isCartOpen: true,
    setIsCartOpen: mockSetIsCartOpen,
    addToCart: mockAddToCart,
    updateQuantity: mockUpdateQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
  }),
}));

// Mock BranchContext
vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => [
    { id: 1, branchName: "Chi nhánh 1", address: "123 Đường ABC", isActive: true },
  ],
}));

// Mock generalSettingService
vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({
    hotline: "0901234567",
  }),
}));

// Mock authService
vi.mock("@/services/authService", () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
}));

// Mock orderService
const { mockCreateOrder } = vi.hoisted(() => ({
  mockCreateOrder: vi.fn().mockResolvedValue({ data: { order_code: "ORD-TEST-100" } }),
}));

let mockActivePromotions: any[] = [];

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createOrder: mockCreateOrder,
    getCheckoutConfig: vi.fn().mockImplementation(() =>
      Promise.resolve({
        delivery_types: [
          { value: "delivery", label: "Giao hàng" },
          { value: "pickup", label: "Tự đến lấy" },
        ],
        operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
        default_shipping_fee: "30000",
        branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Đường ABC", isActive: true }],
        payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
        active_promotions: mockActivePromotions,
      })
    ),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getLoyaltySettings: vi.fn().mockResolvedValue(null),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getAdministrativeUnits: vi.fn().mockResolvedValue([
      {
        name: "TP. Hồ Chí Minh",
        districts: [{ name: "Quận 1", wards: [{ name: "Phường Bến Nghé", id: 1 }] }],
      },
    ]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      fee: 30000,
      shipping_fee: 30000,
      original_fee: 30000,
      shipping_discount: 0,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 1,
    }),
  };
});

// Mock operatingHours
vi.mock("@/lib/operatingHours", async (importOriginal) => {
  const actual: any = await importOriginal();
  const mockNow = new Date("2026-10-10T12:00:00+07:00");
  return {
    ...actual,
    getEffectiveNow: () => mockNow,
    getVietnamDate: () => mockNow,
    getVietnamTimeString: () => "12:00",
    toISODateString: () => "2026-10-10",
    checkOperatingHours: () => ({
      ...actual.checkOperatingHours(),
      isOpen: true,
      canOrderNow: true,
      isStoreOpen: true,
      isDeliveryOpen: true,
      message: "",
      defaultDate: "2026-10-10",
      defaultDeliverySchedule: "now",
      deliveryOpen: "10:00",
      deliveryClose: "23:00",
      pickupOpen: "09:00",
      pickupClose: "22:30",
      notice: null,
    }),
  };
});

let mockPublicCampaigns: PublicCampaignItem[] = [];
vi.mock("@/services/campaignService", () => ({
  getPublicCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockPublicCampaigns)),
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockPublicCampaigns)),
}));

const mockConfig: any = {
  default_shipping_fee: "30000",
  branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Đường ABC", isActive: true }],
  delivery_types: [
    { value: "delivery", label: "Giao hàng" },
    { value: "pickup", label: "Tự đến lấy" },
  ],
  operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
  payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
  active_promotions: [],
};

describe("Campaign State & Gift Persistence Fix (STT Fix: UI kh lưu lại state & kh add được món)", () => {
  const buyXGetYPromo: PublicCampaignItem = {
    id: 501,
    name: "[TẶNG SÚP MISO] khi mua Set Cơm Cá Hồi",
    promotion_type: "buy_x_get_y",
    min_order_value: 0,
    discount_type: "percent",
    discount_value: 100,
    settings: {
      buy_quantity: 1,
      gift_quantity: 1,
      trigger_items: [
        {
          product_id: 80,
          product_variant_id: 1146,
          product_name: "Set Cơm Cá Hồi",
          variant_name: "Set 2 (Cơm gạo Nhật)",
          product_code: "S2",
          kiotviet_id: 3516704,
        },
      ],
    },
    // Backend ONLY returns the gift item in items array!
    items: [
      {
        id: 99,
        product_id: 105,
        product_code: "GIFT-MISO",
        product_name: "Súp Miso Rong Biển",
        image: "/miso.jpg",
        original_price: 25000,
        campaign_price: 0,
        is_free: true,
        is_available: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCartItems = [];
    mockActivePromotions = [buyXGetYPromo];
    mockPublicCampaigns = [buyXGetYPromo];
    mockConfig.active_promotions = [buyXGetYPromo];
  });

  describe("1. evaluateCampaignEligibility linh hoạt & an toàn", () => {
    it("1.1: Pass khi c.items chỉ có món quà tặng và giỏ hàng có món khớp trigger_items", () => {
      const res = evaluateCampaignEligibility(buyXGetYPromo, {
        cartItems: [
          {
            productId: 80,
            variantId: 1146,
            product_variant_id: 1146,
            parentProductId: 80,
            variant: "Set 2 (Cơm gạo Nhật)",
            title: "Set Cơm Cá Hồi",
            quantity: 1,
          },
        ],
      });
      expect(res.eligible).toBe(true);
    });

    it("1.2: Pass khi giỏ hàng lưu productId là KiotViet ID (3516704) và productCode S2", () => {
      const res = evaluateCampaignEligibility(buyXGetYPromo, {
        cartItems: [
          {
            id: "set2-miso",
            productId: 3516704,
            productCode: "S2",
            title: "Set Cơm Cá Hồi",
            quantity: 1,
          },
        ],
      });
      expect(res.eligible).toBe(true);
    });

    it("1.3: Pass khi giỏ hàng có id dạng compound '80-Set 2' và variantId không khai báo", () => {
      const res = evaluateCampaignEligibility(buyXGetYPromo, {
        cartItems: [
          {
            id: "80-Set 2",
            productId: 80,
            variant: "Set 2 (Cơm gạo Nhật)",
            title: "Set Cơm Cá Hồi",
            quantity: 1,
          },
        ],
      });
      expect(res.eligible).toBe(true);
    });

    it("1.4: Fallback buy_quantity = 1 khi campaign buy_x_get_y không khai báo settings.buy_quantity", () => {
      const promoNoBuyQty: PublicCampaignItem = {
        ...buyXGetYPromo,
        settings: {
          trigger_items: [{ product_id: 80 }],
        },
      };
      const res = evaluateCampaignEligibility(promoNoBuyQty, {
        cartItems: [{ productId: 80, quantity: 1 }],
      });
      expect(res.eligible).toBe(true);
    });

    it("1.5: String trigger_items và numeric cart items so sánh chuẩn xác", () => {
      const promoStringTrigger: PublicCampaignItem = {
        ...buyXGetYPromo,
        settings: {
          trigger_items: [{ product_id: "80" as any, product_variant_id: "1146" as any }],
        },
      };
      const res = evaluateCampaignEligibility(promoStringTrigger, {
        cartItems: [{ productId: 80, variantId: 1146, quantity: 1 }],
      });
      expect(res.eligible).toBe(true);
    });
  });

  describe("2. Auto-Prune Race Condition Protection", () => {
    it("2.1: Không xóa localStorage hoặc state khi cartItems ban đầu rỗng ([])", async () => {
      // Giả lập người dùng đã chọn mã 501 từ trước
      setStoredCampaignIds([501]);

      // CartItems đang rỗng (chưa hydrate xong từ CartContext)
      mockCartItems = [];

      render(<MobileCartFlow inline={false} />);

      // Chờ effect chạy
      await waitFor(() => {
        // localStorage KHÔNG được bị xóa sạch về []
        const stored = getStoredCampaignIds();
        expect(stored).toEqual([501]);
      });
    });

    it("2.2: CheckoutForm không xóa selectedCampaignIds trong localStorage khi giỏ rỗng", async () => {
      setStoredCampaignIds([501]);
      mockCartItems = [];

      render(<CheckoutForm order={null} config={mockConfig} />);

      await waitFor(() => {
        const stored = getStoredCampaignIds();
        expect(stored).toEqual([501]);
      });
    });
  });

  describe("3. State Hydration khi Mount", () => {
    it("3.1: CheckoutForm nạp selectedCampaignIds từ localStorage ngay khi mount", async () => {
      setStoredCampaignIds([501]);
      mockCartItems = [
        {
          productId: 80,
          variantId: 1146,
          parentProductId: 80,
          productCode: "S2",
          title: "Set Cơm Cá Hồi",
          variant: "Set 2 (Cơm gạo Nhật)",
          unitPrice: 159000,
          quantity: 1,
        },
      ];

      render(<CheckoutForm order={null} config={mockConfig} />);

      // Xác minh món quà tặng Mua X Tặng Y (Súp Miso Rong Biển 0đ) xuất hiện trên Order Summary
      await waitFor(() => {
        expect(screen.getByText("Súp Miso Rong Biển")).toBeInTheDocument();
        expect(screen.getByText("0đ")).toBeInTheDocument();
      });
    });

    it("3.2: MobileCartFlow nạp selectedCampaignIds từ localStorage ngay khi mount", async () => {
      setStoredCampaignIds([501]);
      mockCartItems = [
        {
          productId: 80,
          variantId: 1146,
          parentProductId: 80,
          productCode: "S2",
          title: "Set Cơm Cá Hồi",
          variant: "Set 2 (Cơm gạo Nhật)",
          unitPrice: 159000,
          quantity: 1,
        },
      ];

      render(<MobileCartFlow inline={false} />);

      await waitFor(() => {
        expect(screen.getByText("Súp Miso Rong Biển")).toBeInTheDocument();
        expect(screen.getByText("0đ")).toBeInTheDocument();
      });
    });
  });

  describe("4. Add Món Quà Tặng Vào createOrder payload", () => {
    it("4.1: CheckoutForm gửi món quà buy_x_get_y kèm is_gift: true và price: 0 khi submit order", async () => {
      setStoredCampaignIds([501]);
      mockCartItems = [
        {
          productId: 80,
          variantId: 1146,
          parentProductId: 80,
          productCode: "S2",
          title: "Set Cơm Cá Hồi",
          variant: "Set 2 (Cơm gạo Nhật)",
          unitPrice: 159000,
          quantity: 1,
        },
      ];

      render(<CheckoutForm order={null} config={mockConfig} />);

      // Điền form thông tin nhận hàng
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/Họ và tên/i).length).toBeGreaterThan(0);
      });

      const nameInputs = screen.getAllByPlaceholderText(/Họ và tên/i);
      const phoneInputs = screen.getAllByPlaceholderText(/Số điện thoại/i);
      const emailInputs = screen.getAllByPlaceholderText(/Email/i);
      nameInputs.forEach((input) => fireEvent.change(input, { target: { value: "Nguyễn Văn B" } }));
      phoneInputs.forEach((input) => fireEvent.change(input, { target: { value: "0912345678" } }));
      emailInputs.forEach((input) => fireEvent.change(input, { target: { value: "test@example.com" } }));

      // Chọn nhận tại chi nhánh
      const pickupRadios = screen.getAllByRole("radio");
      const pickupRadio = pickupRadios.find(
        (r) => (r as HTMLInputElement).value === "pickup" || r.closest("label")?.textContent?.includes("Tự đến lấy")
      );
      if (pickupRadio) {
        fireEvent.click(pickupRadio);
        fireEvent.change(pickupRadio, { target: { checked: true } });
      }

      // Tích chọn xác nhận thông tin
      const confirmCheck = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheck);

      // Bấm Đặt hàng
      const submitBtn = screen.getByTestId("checkout-submit-btn");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
        const payload = mockCreateOrder.mock.calls[0][0];
        const gift = payload.items.find((it: any) => it.product_id === 105);
        expect(gift).toBeDefined();
        expect(gift.is_gift).toBe(true);
        expect(gift.price).toBe(0);
        expect(gift.product_name).toContain("Súp Miso Rong Biển");
      });
    });

    it("4.2: MobileCartFlow gửi món quà buy_x_get_y kèm is_gift: true và price: 0 khi submit order", async () => {
      setStoredCampaignIds([501]);
      mockCartItems = [
        {
          productId: 80,
          variantId: 1146,
          parentProductId: 80,
          productCode: "S2",
          title: "Set Cơm Cá Hồi",
          variant: "Set 2 (Cơm gạo Nhật)",
          unitPrice: 159000,
          quantity: 1,
        },
      ];

      render(<MobileCartFlow inline={false} />);

      // Bấm Tiếp tục sang Step 2
      await waitFor(() => {
        expect(screen.getByText("Tiếp tục")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Tiếp tục"));

      // Nhập họ tên và số điện thoại
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Họ và tên")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText("Họ và tên"), { target: { value: "Trần Thị C" } });
      fireEvent.change(screen.getByPlaceholderText("Số điện thoại"), { target: { value: "0987654321" } });

      // Chọn Tự đến lấy tại chi nhánh
      const pickupBtn = screen.getByText("Tự đến lấy tại chi nhánh");
      fireEvent.click(pickupBtn);

      // Bấm Đặt hàng
      const submitBtn = screen.getByRole("button", { name: /Đặt hàng|Đặt trước/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
        const payload = mockCreateOrder.mock.calls[0][0];
        const gift = payload.items.find((it: any) => it.product_id === 105);
        expect(gift).toBeDefined();
        expect(gift.is_gift).toBe(true);
        expect(gift.price).toBe(0);
        expect(gift.product_name).toContain("Súp Miso Rong Biển");
      });
    });
  });
});
