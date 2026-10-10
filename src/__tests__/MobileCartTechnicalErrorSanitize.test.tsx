import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import viMessages from "@/i18n/locales/vi.json";
import * as orderService from "@/services/orderService";
import { OrderApiError } from "@/services/orderService";

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

vi.mock("next/image", () => ({
  default: ({ src, alt, className, ...props }: any) => (
    <img src={src} alt={alt || ""} className={className} {...props} />
  ),
}));

let mockCartItems: any[] = [
  {
    productId: 1,
    productCode: "SP01",
    title: "Cơm thố bò xào",
    unitPrice: 65000,
    quantity: 1,
    imageUrl: "/images/food.jpg",
    slug: "com-tho-bo-xao",
    categorySlug: "com-tho",
  },
];

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    subtotal: mockCartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    totalItems: mockCartItems.reduce((acc, item) => acc + item.quantity, 0),
    hasOutOfStockItems: false,
    isCartOpen: true,
    setIsCartOpen: vi.fn(),
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    token: null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({ tier: "standard", name: "Thành viên", discountPercent: 0 }),
  calculateMemberDiscount: () => 0,
}));

vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Lê Lợi" }],
    currentBranch: { id: 1, branchName: "Chi nhánh 1", address: "123 Lê Lợi" },
    selectBranch: vi.fn(),
  }),
}));

vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({
    hotline: "0901234567",
  }),
}));

vi.mock("@/services/authService", () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/orderService", async () => {
  const actual: any = await vi.importActual("@/services/orderService");
  return {
    ...actual,
    getCheckoutConfig: vi.fn(async () => ({
      default_shipping_fee: "30000",
      operating_hours: { enabled: true, start_hour: 0, end_hour: 24 },
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Lê Lợi" }],
    })),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getActiveCampaigns: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: false,
    }),
    getAdministrativeUnits: vi.fn().mockResolvedValue([
      {
        name: "Hà Nội",
        districts: [
          {
            name: "Quận Cầu Giấy",
            wards: [{ name: "Phường Dịch Vọng", id: 1 }],
          },
        ],
      },
    ]),
    createOrder: vi.fn(),
    cancelOrderApi: vi.fn(),
  };
});

describe("MobileCartFlow - Technical Error Message Sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStep2 = async () => {
    render(<MobileCartFlow inline={true} initialDeliveryType="pickup" />);

    // Since inline={true}, MobileCartFlow starts at step 2 (Checkout info)
    const nameInput = await screen.findByPlaceholderText("Họ và tên");
    fireEvent.change(nameInput, { target: { value: "Nguyễn Văn A" } });

    const phoneInput = await screen.findByPlaceholderText("Số điện thoại");
    fireEvent.change(phoneInput, { target: { value: "0901234567" } });
  };

  it("sanitizes SQLSTATE error and displays fallback friendly message", async () => {
    vi.spyOn(orderService, "createOrder").mockRejectedValueOnce(
      new OrderApiError(500, {
        message: "SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'customer_id' cannot be null",
      })
    );

    await setupStep2();

    const submitBtn = screen.getByRole("button", { name: /^Đặt hàng$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Có lỗi xảy ra trong quá trình khởi tạo đơn hàng. Quý khách vui lòng thử lại hoặc liên hệ hotline để được hỗ trợ.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/SQLSTATE/i)).not.toBeInTheDocument();
  });

  it("sanitizes Internal Server Error and displays fallback friendly message", async () => {
    vi.spyOn(orderService, "createOrder").mockRejectedValueOnce(
      new OrderApiError(500, {
        message: "500 Internal Server Error in /var/www/backend/app/Http/Controllers/OrderController.php on line 123",
      })
    );

    await setupStep2();

    const submitBtn = screen.getByRole("button", { name: /^Đặt hàng$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Có lỗi xảy ra trong quá trình khởi tạo đơn hàng. Quý khách vui lòng thử lại hoặc liên hệ hotline để được hỗ trợ.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Internal Server Error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/php on line/i)).not.toBeInTheDocument();
  });

  it("sanitizes generic Error with stack trace or uncaught exception", async () => {
    vi.spyOn(orderService, "createOrder").mockRejectedValueOnce(
      new Error("Uncaught Exception: Call to undefined method App\\Models\\Order::saveDetails()")
    );

    await setupStep2();

    const submitBtn = screen.getByRole("button", { name: /^Đặt hàng$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Có lỗi xảy ra trong quá trình khởi tạo đơn hàng. Quý khách vui lòng thử lại hoặc liên hệ hotline để được hỗ trợ.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Call to undefined/i)).not.toBeInTheDocument();
  });

  it("displays legitimate user-friendly business error message without sanitizing", async () => {
    const businessMsg = "Món ăn 'Cơm thố bò xào' tạm thời hết hàng tại chi nhánh này.";
    vi.spyOn(orderService, "createOrder").mockRejectedValueOnce(
      new OrderApiError(422, { message: businessMsg })
    );

    await setupStep2();

    const submitBtn = screen.getByRole("button", { name: /^Đặt hàng$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(businessMsg)).toBeInTheDocument();
    });
  });
});
