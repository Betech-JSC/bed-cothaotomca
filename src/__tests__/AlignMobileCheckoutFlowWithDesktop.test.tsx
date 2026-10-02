import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import viMessages from "@/i18n/locales/vi.json";
import { formatPrice } from "@/lib/format";

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
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/checkout",
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/checkout",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, ...props }: any) => (
    <img src={src} alt={alt || ""} className={className} {...props} />
  ),
}));

// Mock CartContext
let mockCartItems: any[] = [];
let mockUpdateQuantity = vi.fn();
let mockRemoveFromCart = vi.fn();
let mockClearCart = vi.fn();

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    subtotal: mockCartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    totalItems: mockCartItems.reduce((acc, item) => acc + item.quantity, 0),
    hasOutOfStockItems: mockCartItems.some((item) => item.isOutOfStock),
    isCartOpen: true,
    setIsCartOpen: vi.fn(),
    addToCart: vi.fn(),
    updateQuantity: mockUpdateQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
  }),
}));

// Mock AuthContext
let mockUser: any = null;
let mockMemberTier: any = { tier: "member", discountPercent: 0, isUpgradeCelebration: false };
let mockMemberDiscountValue = 0;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: Boolean(mockUser),
    token: mockUser ? "mock-token" : null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => mockMemberTier,
  calculateMemberDiscount: () => mockMemberDiscountValue,
}));

vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: "Chi nhánh 1" }],
    currentBranch: { id: 1, branchName: "Chi nhánh 1" },
    selectBranch: vi.fn(),
  }),
}));

let mockShippingResult: any = {
  fee: 30000,
  shipping_fee: 30000,
  original_fee: 30000,
  shipping_discount: 0,
  is_freeship: false,
  is_deliverable: true,
  is_configured_area: true,
  branch_id: 1,
  branch_name: "Chi nhánh 1",
  message: null,
};

let mockAvailableVouchers: any[] = [];
let mockActivePromotions: any[] = [];

vi.mock("@/services/orderService", async () => {
  const actual: any = await vi.importActual("@/services/orderService");
  return {
    ...actual,
    getCheckoutConfig: vi.fn(async () => ({
      default_shipping_fee: "30000",
      operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Le Loi" }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
      active_promotions: mockActivePromotions,
    })),
    getAvailableVouchers: vi.fn(async () => mockAvailableVouchers),
    getShippingSettings: vi.fn(async () => null),
    calculateShippingFee: vi.fn(async () => mockShippingResult),
    validateVoucher: vi.fn(async (code: string) => {
      const v = mockAvailableVouchers.find((item) => item.code === code);
      if (v) {
        return { valid: true, voucher: v, message: "Hợp lệ" };
      }
      return { valid: false, message: "Mã không hợp lệ" };
    }),
  };
});

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn(async () => mockActivePromotions),
}));

describe("Align Mobile Checkout Flow With Desktop Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__MOCK_TIME__ = "11:00";
    localStorage.clear();
    mockUser = null;
    mockMemberTier = { tier: "member", discountPercent: 0, isUpgradeCelebration: false };
    mockMemberDiscountValue = 0;
    mockAvailableVouchers = [];
    mockActivePromotions = [];
    mockShippingResult = {
      fee: 30000,
      shipping_fee: 30000,
      original_fee: 30000,
      shipping_discount: 0,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 1,
      branch_name: "Chi nhánh 1",
      message: null,
    };
    mockCartItems = [
      {
        id: "item-1",
        productId: 101,
        productCode: "CA-KHO",
        title: "Cá Bống Kho Tiêu",
        variant: "default",
        unitPrice: 150000,
        regularPrice: 150000,
        price: 150000,
        quantity: 2,
        imageUrl: "/images/cakho.jpg",
      },
    ];
  });

  describe("1. PaymentQRScreen Typography & Responsive Formatting", () => {
    const mockOrderData = {
      order_code: "ORD-2026-9999",
      expire_at: new Date(Date.now() + 600000).toISOString(),
      qr_url: "https://img.vietqr.io/image/970422-0123456789-compact.png",
      qr_info: {
        amount: 300000,
        bank_name: "MB Bank",
        bank_code: "MB",
        bank_account: "0123456789",
        account_name: "CONG TY TNHH BEP CO THAO",
        content: "ORD-2026-9999",
      },
      expected_delivery: "12:00 - 12:30",
    } as any;

    it("renders title with text-lg sm:text-xl lg:headline-2 font-display font-bold text-primary", () => {
      render(
        <PaymentQRScreen
          orderData={mockOrderData}
          phone="0912345678"
        />
      );

      const title = screen.getByRole("heading", { level: 2, name: /Thông tin chuyển khoản/i });
      expect(title).toBeInTheDocument();
      expect(title.className).toContain("text-lg");
      expect(title.className).toContain("sm:text-xl");
      expect(title.className).toContain("lg:headline-2");
      expect(title.className).toContain("font-display");
      expect(title.className).toContain("font-bold");
      expect(title.className).toContain("text-primary");
    });

    it("renders bank information with break-words text-xs sm:text-sm lg:body-1 and text-xs sm:text-sm lg:label-1", () => {
      render(
        <PaymentQRScreen
          orderData={mockOrderData}
          phone="0912345678"
        />
      );

      const bankNameRow = screen.getByText("MB Bank");
      expect(bankNameRow).toBeInTheDocument();
      expect(bankNameRow.className).toContain("break-words");
      expect(bankNameRow.className).toContain("text-xs");
      expect(bankNameRow.className).toContain("sm:text-sm");
      expect(bankNameRow.className).toContain("lg:body-1");
      expect(bankNameRow.className).not.toContain("break-all");

      const label = screen.getByText("Ngân hàng");
      expect(label.className).toContain("text-xs");
      expect(label.className).toContain("sm:text-sm");
      expect(label.className).toContain("lg:label-1");
    });

    it("renders total section with separate nowrap label and amount without parent headline-2", () => {
      render(
        <PaymentQRScreen
          orderData={mockOrderData}
          phone="0912345678"
        />
      );

      const totalLabel = screen.getByText("Tổng thanh toán");
      expect(totalLabel).toBeInTheDocument();
      expect(totalLabel.className).toContain("whitespace-nowrap");
      expect(totalLabel.className).toContain("font-bold");

      const parentContainer = totalLabel.parentElement;
      expect(parentContainer).not.toBeNull();
      expect(parentContainer?.className).not.toContain("headline-2");
      expect(parentContainer?.className).toContain("flex");
      expect(parentContainer?.className).toContain("justify-between");

      const totalAmount = within(parentContainer!).getByText(formatPrice(300000));
      expect(totalAmount).toBeInTheDocument();
      expect(totalAmount.className).toContain("whitespace-nowrap");
      expect(totalAmount.className).toContain("font-display");
      expect(totalAmount.className).toContain("text-secondary");
      expect(totalAmount.className).toContain("lg:headline-2");
    });
  });

  describe("2. MobileCartFlow Summary Panel Alignment (Step 1 and Step 2)", () => {
    it("Step 1 places shipping fee after member discount and before total", async () => {
      mockUser = { id: 1, name: "Vip Customer", tier: "gold" };
      mockMemberTier = { tier: "gold", discountPercent: 10, isUpgradeCelebration: false };
      mockMemberDiscountValue = 30000;

      // Render Step 1 (inline = false)
      const { container } = render(<MobileCartFlow />);

      // Step 1: Summary Panel
      const subtotalLabel = await screen.findByText("Tạm tính");
      expect(subtotalLabel).toBeInTheDocument();

      // Check order of elements in Step 1 summary panel
      const summaryPanel = subtotalLabel.closest(".bg-white");
      expect(summaryPanel).not.toBeNull();

      const textContents = Array.from(summaryPanel!.querySelectorAll("span, div"))
        .map((el) => el.textContent?.trim())
        .filter(Boolean);

      const subtotalIndex = textContents.findIndex((t) => t === "Tạm tính");
      const memberIndex = textContents.findIndex((t) => t?.includes("Ưu đãi thành viên"));
      const shippingIndex = textContents.findIndex((t) => t === "Phí giao hàng" || t === "Phí vận chuyển");
      const totalIndex = textContents.findIndex((t) => t === "Tổng thanh toán");

      expect(subtotalIndex).toBeGreaterThan(-1);
      expect(memberIndex).toBeGreaterThan(subtotalIndex);
      expect(shippingIndex).toBeGreaterThan(memberIndex);
      expect(totalIndex).toBeGreaterThan(shippingIndex);
    });

    it("Step 2 renders 7-item breakdown matching Desktop CheckoutForm", async () => {
      mockUser = { id: 1, name: "Vip Customer", tier: "diamond" };
      mockMemberTier = { tier: "diamond", discountPercent: 15, isUpgradeCelebration: false };
      mockMemberDiscountValue = 45000;

      // Render Step 2 directly via inline={true}
      render(<MobileCartFlow inline />);

      // Verify Step 2 rendered
      expect(await screen.findByText("Thông tin liên hệ")).toBeInTheDocument();

      // 1. Tạm tính
      const subtotalLabels = screen.getAllByText("Tạm tính");
      expect(subtotalLabels.length).toBeGreaterThan(0);
      expect(screen.getAllByText(formatPrice(300000)).length).toBeGreaterThan(0);

      // 4. Ưu đãi thành viên
      expect(screen.getByText(/Ưu đãi thành viên/)).toBeInTheDocument();
      expect(screen.getByText(`-${formatPrice(45000)}`)).toBeInTheDocument();

      // 5. Phí giao hàng
      expect(screen.getByText("Phí giao hàng")).toBeInTheDocument();

      // 6. Tổng thanh toán
      expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();

      // 7. Điểm tích lũy
      expect(screen.getByText(/Đơn hàng này sẽ tích lũy thêm/)).toBeInTheDocument();
    });

    it("Step 2 displays Pickup as 0đ (Tự đến lấy) when pickup deliveryType is selected", async () => {
      render(<MobileCartFlow inline />);

      // Switch to Tự đến lấy
      const pickupBtn = await screen.findByText("Tự đến lấy tại chi nhánh");
      fireEvent.click(pickupBtn);

      await waitFor(() => {
        expect(screen.getByText(/0đ \(Tự đến lấy tại chi nhánh\)/)).toBeInTheDocument();
      });
    });
  });
});
