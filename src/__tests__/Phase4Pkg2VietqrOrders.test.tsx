import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import OrderSuccessClient from "@/components/Checkout/OrderSuccessClient";
import viMessages from "@/i18n/locales/vi.json";

// Mock routing
vi.mock("@/i18n/routing", () => ({
  usePathname: () => "/checkout",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/order-success",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, unoptimized, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      data-unoptimized={unoptimized ? "true" : "false"}
      onError={onError}
      {...props}
    />
  ),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
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

    t.rich = (key: string) => resolveKey(key);
    return t;
  },
}));

// Mock useOrderStatus
vi.mock("@/hooks/useOrderStatus", () => ({
  useOrderStatus: () => ({ data: null, error: null, isLoading: false }),
}));

// Mock AuthContext
const mockDefaultMemberTier = {
  tier: "member" as const,
  name: "THÀNH VIÊN",
  discountPercent: 0,
  label: "Thành viên",
};

const mockUser = {
  id: 1,
  name: "Trần Văn B",
  phone: "0909998877",
  email: "tranvanb@example.com",
  points: 100,
  tier: "member",
};

vi.mock("@/services/AuthContext", () => ({}));

vi.mock("@/services/authService", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
    createCustomerAddressApi: vi.fn().mockResolvedValue({}),
    checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, token: "mock-token", refreshUser: vi.fn() }),
  getMemberTier: () => mockDefaultMemberTier,
  calculateMemberDiscount: () => 0,
}));

// Mock CartContext
const mockCartItems = [
  {
    productId: 1,
    productCode: "CA01",
    slug: "ca-hoi-nuong",
    categorySlug: "hai-san",
    title: "Cá Hồi Nướng Phô Mai",
    name: "Cá Hồi Nướng Phô Mai",
    unitPrice: 150000,
    originalPrice: 150000,
    quantity: 1,
    imageUrl: "/images/salmon.jpg",
  },
];

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    subtotal: 150000,
    hasOutOfStockItems: false,
  }),
}));

// Mock BranchContext
vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => [
    {
      id: 1,
      branchName: "Chi nhánh Chính",
      address: "123 Đ. ABC",
      contactNumber: "0901234567",
      isActive: true,
    },
  ],
}));

// Mock GeneralSettingsContext
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({ hotline: "024.9999.7122" }),
}));

// Mock orderService
const { mockCreateOrder, mockCancelOrderApi, mockGetOrderByCode, mockOrderData } = vi.hoisted(() => {
  const mockOrderData: any = {
    order_code: "ORD-20261008-0001",
    total: 150000,
    expire_at: new Date(Date.now() + 900000).toISOString(),
    qr_url: "https://img.vietqr.io/image/MB-123456789-compact2.png",
    qr_info: {
      bank_code: "MB",
      bank_name: "MB Bank",
      bank_account: "123456789",
      account_name: "CO THAO TOM CA",
      amount: 150000,
      content: "ORD-20261008-0001",
    },
  };

  const mockCreateOrder = vi.fn().mockResolvedValue({
    success: true,
    data: mockOrderData,
  });

  const mockCancelOrderApi = vi.fn().mockResolvedValue({
    message: "Đơn hàng đã được hủy thành công",
    data: {},
  });

  const mockGetOrderByCode = vi.fn();

  return { mockCreateOrder, mockCancelOrderApi, mockGetOrderByCode, mockOrderData };
});

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createOrder: (...args: any[]) => mockCreateOrder(...args),
    cancelOrderApi: (...args: any[]) => mockCancelOrderApi(...args),
    getOrderByCode: (...args: any[]) => mockGetOrderByCode(...args),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    FALLBACK_ADMINISTRATIVE_UNITS: [],
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getCheckoutConfig: vi.fn().mockResolvedValue({
      default_shipping_fee: "30000",
      branches: [
        {
          id: 1,
          branchName: "Chi nhánh Chính",
          address: "123 Đ. ABC",
          contactNumber: "0901234567",
          isActive: true,
        },
      ],
      shipping_settings: {
        is_min_amount_enabled: false,
        min_order_amount: 0,
        shipping_discount_type: "freeship",
        shipping_discount_value: 0,
      },
      payment_methods: [
        { id: "transfer", name: "Chuyển khoản VietQR", is_active: true },
      ],
      active_promotions: [],
    }),
    getShippingSettings: vi.fn().mockResolvedValue({
      base_fee: 30000,
      free_shipping_threshold: 500000,
    }),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 30000,
      original_fee: 30000,
      is_freeship: false,
      is_deliverable: true,
    }),
    getLoyaltySettings: vi.fn().mockResolvedValue({
      can_combine_with_promotions: false,
    }),
    orderService: {
      ...actual.orderService,
      cancelOrderApi: (...args: any[]) => mockCancelOrderApi(...args),
      createOrder: (...args: any[]) => mockCreateOrder(...args),
    },
  };
});

describe("Phase 4 Gói 2: VietQR Order Lifecycle & Order Image Fallback Tests", () => {
  const mockConfig: any = {
    default_shipping_fee: "30000",
    operating_hours: null,
    branches: [
      {
        id: 1,
        branchName: "Chi nhánh Chính",
        address: "123 Đ. ABC",
        contactNumber: "0901234567",
        isActive: true,
      },
    ],
    shipping_settings: {
      is_min_amount_enabled: false,
      min_order_amount: 0,
      shipping_discount_type: "freeship",
      shipping_discount_value: 0,
    },
    payment_methods: [
      { id: "transfer", name: "Chuyển khoản VietQR", is_active: true },
    ],
    active_promotions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelOrderApi.mockResolvedValue({
      message: "Đơn hàng đã được hủy thành công",
      data: {},
    });
    mockCreateOrder.mockResolvedValue({
      success: true,
      data: mockOrderData,
    });
  });

  describe("Nhiệm vụ 2 (STT 9 Sheet 5 Frontend): Nút 'Hủy và quay lại' trên màn hình VietQR", () => {
    it("2.1: PaymentQRScreen hiển thị nút 'Hủy và quay lại', kích hoạt callback onCancel và có trạng thái loading", async () => {
      let resolveCancel: () => void;
      const cancelPromise = new Promise<void>((resolve) => {
        resolveCancel = resolve;
      });
      const onCancelMock = vi.fn().mockImplementation(() => cancelPromise);

      render(
        <PaymentQRScreen
          orderData={mockOrderData}
          phone="0901234567"
          onCancel={onCancelMock}
        />
      );

      const cancelBtn = screen.getByRole("button", { name: /huỷ và quay lại/i });
      expect(cancelBtn).toBeInTheDocument();
      expect(cancelBtn).not.toBeDisabled();

      // Click button hủy
      fireEvent.click(cancelBtn);

      expect(onCancelMock).toHaveBeenCalledTimes(1);
      // Nút chuyển sang trạng thái disabled khi đang hủy
      expect(cancelBtn).toBeDisabled();

      // Giải phóng promise
      resolveCancel!();
      await waitFor(() => {
        expect(cancelBtn).not.toBeDisabled();
      });
    });

    it("2.2: CheckoutForm xử lý prop onCancel bằng handleCancelPendingOrder: gọi cancelOrderApi, hiển thị toast và đóng modal", async () => {
      localStorage.setItem("auth_token", "mock-token");
      render(<CheckoutForm order={null} config={mockConfig} />);

      // Chờ form render đầy đủ trên cả mobile & desktop
      await screen.findAllByText(/Thông tin liên hệ/i);

      // Điền email
      const emailInputs = screen.queryAllByPlaceholderText(/email/i);
      emailInputs.forEach((input) => fireEvent.change(input, { target: { value: "tranvanb@example.com" } }));

      // Chọn nhận hàng tại chi nhánh (pickup) trên tất cả layout (mobile & desktop)
      const allRadios = await screen.findAllByRole("radio");
      const pickupRadios = allRadios.filter(
        (r) => (r as HTMLInputElement).value === "pickup" || r.closest("label")?.textContent?.includes("Tự đến lấy")
      );
      pickupRadios.forEach((r) => fireEvent.click(r));

      // Chọn phương thức thanh toán chuyển khoản (TRANSFER) trên tất cả layout
      const transferRadios = allRadios.filter(
        (r) => r.closest("label")?.textContent?.includes("Chuyển khoản")
      );
      transferRadios.forEach((r) => fireEvent.click(r));

      // Tích chọn xác nhận thông tin
      const confirmCheck = await screen.findByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheck);

      // Submit form để tạo đơn VietQR
      const submitBtn = screen.getByTestId("checkout-submit-btn");
      fireEvent.click(submitBtn);

      // Chờ màn hình VietQR hiển thị
      const cancelBtn = await screen.findByRole("button", { name: /huỷ và quay lại/i });
      expect(cancelBtn).toBeInTheDocument();

      // Bấm "Hủy và quay lại"
      fireEvent.click(cancelBtn);

      // cancelOrderApi phải được gọi đúng tham số
      await waitFor(() => {
        expect(mockCancelOrderApi).toHaveBeenCalledWith(
          "ORD-20261008-0001",
          "0909998877",
          "Khách hàng hủy từ màn hình thanh toán VietQR"
        );
      });

      // Màn hình QR đóng lại và hiển thị toast thông báo
      await waitFor(() => {
        expect(screen.getByText("Đơn hàng đã được hủy theo yêu cầu")).toBeInTheDocument();
      });

      // Kiểm tra quay lại form checkout bình thường
      expect(screen.queryByText(/Quét mã VietQR để thanh toán/i)).not.toBeInTheDocument();
    });
  });

  describe("Nhiệm vụ 4 (STT 2 Sheet 5 Frontend): Sửa hiển thị ảnh sản phẩm trên OrderSuccessClient", () => {
    it("4.1: Render ảnh sản phẩm từ URL tuyệt đối http/https với unoptimized=true", async () => {
      const mockOrderWithHttpImage = {
        order_code: "ORD-20261008-0002",
        status: "confirmed",
        sync_status: "synced",
        payment_status: "paid",
        created_at: new Date().toISOString(),
        items: [
          {
            product_name: "Món Cua Cà Mau Hấp",
            price: "250000",
            quantity: 2,
            image: "https://cms.cothaotomca.vn/storage/products/cua-ca-mau.jpg",
          },
        ],
        customer: { phone: "0901234567", name: "Lê Văn C" },
        delivery: { address: "123 Đường ABC", contact_number: "0901234567" },
      };

      mockGetOrderByCode.mockResolvedValue(mockOrderWithHttpImage);

      render(<OrderSuccessClient orderCode="ORD-20261008-0002" phone="0901234567" locale="vi" />);

      const img = await screen.findByAltText("Món Cua Cà Mau Hấp");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://cms.cothaotomca.vn/storage/products/cua-ca-mau.jpg");
      expect(img).toHaveAttribute("data-unoptimized", "true");
    });

    it("4.2: Tự động fallback sang /cover.jpg khi item.image bị null/undefined/empty", async () => {
      const mockOrderWithNullImage = {
        order_code: "ORD-20261008-0003",
        status: "confirmed",
        sync_status: "synced",
        payment_status: "paid",
        created_at: new Date().toISOString(),
        items: [
          {
            product_name: "Canh Chua Cá Bớp",
            price: "120000",
            quantity: 1,
            image: null,
          },
        ],
        customer: { phone: "0901234567", name: "Lê Văn C" },
        delivery: { address: "123 Đường ABC", contact_number: "0901234567" },
      };

      mockGetOrderByCode.mockResolvedValue(mockOrderWithNullImage);

      render(<OrderSuccessClient orderCode="ORD-20261008-0003" phone="0901234567" locale="vi" />);

      const img = await screen.findByAltText("Canh Chua Cá Bớp");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/cover.jpg");
    });

    it("4.3: Tự động fallback sang /cover.jpg khi ảnh tuyệt đối gặp lỗi onError", async () => {
      const mockOrderWithBrokenImage = {
        order_code: "ORD-20261008-0004",
        status: "confirmed",
        sync_status: "synced",
        payment_status: "paid",
        created_at: new Date().toISOString(),
        items: [
          {
            product_name: "Tôm Sú Nướng Muối Ớt",
            price: "180000",
            quantity: 1,
            image: "https://broken-cdn.domain.com/images/tom-su-404.jpg",
          },
        ],
        customer: { phone: "0901234567", name: "Lê Văn C" },
        delivery: { address: "123 Đường ABC", contact_number: "0901234567" },
      };

      mockGetOrderByCode.mockResolvedValue(mockOrderWithBrokenImage);

      render(<OrderSuccessClient orderCode="ORD-20261008-0004" phone="0901234567" locale="vi" />);

      const img = await screen.findByAltText("Tôm Sú Nướng Muối Ớt");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://broken-cdn.domain.com/images/tom-su-404.jpg");

      // Giả lập lỗi tải ảnh (onError)
      fireEvent.error(img);

      // Ảnh phải được cập nhật lại thành /cover.jpg
      await waitFor(() => {
        expect(img).toHaveAttribute("src", "/cover.jpg");
      });
    });
  });
});
