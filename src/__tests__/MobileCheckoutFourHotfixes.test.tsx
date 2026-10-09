import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import { evaluateCampaignEligibility } from "@/components/Voucher/CouponModal";
import viMessages from "@/i18n/locales/vi.json";
import * as orderService from "@/services/orderService";

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
    subtotal: mockCartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    totalItems: mockCartItems.reduce((acc, item) => acc + item.quantity, 0),
    hasOutOfStockItems: false,
    isCartOpen: true,
    setIsCartOpen: mockSetIsCartOpen,
    addToCart: mockAddToCart,
    updateQuantity: mockUpdateQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
  }),
}));

// Mock AuthContext
let mockUser: any = null;
let mockMemberTier: any = { tier: "gold", name: "Hạng Vàng", discountPercent: 10, isUpgradeCelebration: false };
let mockMemberDiscountValue = 30000;
const mockRefreshUser = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: Boolean(mockUser),
    token: mockUser ? "mock-token" : null,
    refreshUser: mockRefreshUser,
  }),
  getMemberTier: () => mockMemberTier,
  calculateMemberDiscount: () => mockMemberDiscountValue,
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

let mockAvailableVouchers: any[] = [];
let mockActivePromotions: any[] = [];
let mockShippingSettings: any = {
  is_min_amount_enabled: true,
  min_order_amount: 500000,
  max_discount: 30000,
};

vi.mock("@/services/orderService", async () => {
  const actual: any = await vi.importActual("@/services/orderService");
  return {
    ...actual,
    getCheckoutConfig: vi.fn(async () => ({
      default_shipping_fee: "30000",
      operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Lê Lợi" }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
      active_promotions: mockActivePromotions,
    })),
    getAvailableVouchers: vi.fn(async () => mockAvailableVouchers),
    getShippingSettings: vi.fn(async () => mockShippingSettings),
    getAdministrativeUnits: vi.fn(async () => [
      {
        name: "TP. Hồ Chí Minh",
        districts: [{ name: "Quận 1", wards: [{ name: "Phường Bến Nghé", id: 1 }] }],
      },
    ]),
    calculateShippingFee: vi.fn(async () => ({
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
    })),
    cancelOrderApi: vi.fn(async () => ({ message: "Đã hủy đơn hàng thành công", data: {} })),
    createOrder: vi.fn(async () => ({
      message: "Tạo đơn hàng thành công",
      data: {
        order_code: "ORD-TEST-12345",
        status: "pending",
        payment_status: "pending",
        subtotal: "300000",
        total: "300000",
        delivery_price: "0",
        expire_at: new Date(Date.now() + 600000).toISOString(),
        qr_url: "https://example.com/qr.png",
        qr_info: { bank_name: "MBBank" },
      },
    })),
    getLoyaltySettings: vi.fn(async () => ({
      is_loyalty_active: true,
      can_combine_with_promotions: true,
      gold_discount: 10,
      diamond_discount: 15,
    })),
  };
});

describe("Gói 4 Hotfix Luồng Mobile Checkout (STT 4/5/11, STT 7, STT 9, STT 14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__MOCK_TIME__ = "11:00";
    localStorage.clear();
    mockUser = { id: 1, name: "Khách Gold", phone: "0901234567", tier: "gold" };
    mockMemberTier = { tier: "gold", name: "Hạng Vàng", discountPercent: 10, isUpgradeCelebration: false };
    mockMemberDiscountValue = 30000;
    mockAvailableVouchers = [];
    mockActivePromotions = [];
    mockShippingSettings = {
      is_min_amount_enabled: true,
      min_order_amount: 500000,
      max_discount: 30000,
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

  describe("Hotfix 1 (STT 4, 5, 11): Gỡ thẻ thành viên Gold trên Mobile không bị ép bật lại", () => {
    it("1.1: Khi bấm nút xóa trên VoucherTicketBar, isMemberCardSelected chuyển sang false và KHÔNG bị useEffect bật lại", async () => {
      render(<MobileCartFlow inline={false} />);

      // Chờ VoucherTicketBar hiển thị ở Step 1
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
      });

      // Bấm nút xóa của TicketBar
      const clearBtn = screen.getByRole("button", { name: "Xóa" });
      fireEvent.click(clearBtn);

      // Sau khi bấm xóa, thẻ thành viên phải chuyển sang trạng thái đã bỏ chọn
      await waitFor(() => {
        const unselectedTexts = screen.getAllByText((content) =>
          content.includes("Ưu đãi thành viên (Đã bỏ chọn)") || content.includes("member_discount_unselected")
        );
        expect(unselectedTexts.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Hotfix 2 (STT 7): Ẩn thanh giảm ship khi chọn Tự đến lấy tại chi nhánh trên Mobile", () => {
    it("2.1: Hiển thị thanh SmartCartProgressBar khi giao hàng tận nơi (delivery)", async () => {
      render(<MobileCartFlow inline={false} />);

      await waitFor(() => {
        // Mặc định deliveryType === 'delivery', có thanh tiến độ ở Step 1
        expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
      });
    });

    it("2.2: Ẩn SmartCartProgressBar hoàn toàn khi deliveryType === 'pickup'", async () => {
      render(<MobileCartFlow inline={false} initialDeliveryType="pickup" />);

      await waitFor(() => {
        // Thanh progress bar không được render khi deliveryType là pickup
        expect(screen.queryByText(/Mua thêm/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Hotfix 3 (STT 9): Gọi cancelOrderApi khi bấm 'Hủy và quay lại' ở màn hình VietQR trên Mobile", () => {
    it("3.1: Gọi cancelOrderApi(orderCode, phone, reason) khi onCancel được kích hoạt", async () => {
      render(<MobileCartFlow inline={false} />);

      // Chuyển từ Step 1 sang Step 2
      await waitFor(() => {
        expect(screen.getByText("Tiếp tục")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Tiếp tục"));

      // Nhập họ tên và số điện thoại
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Họ và tên")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText("Họ và tên"), { target: { value: "Nguyễn Văn A" } });
      fireEvent.change(screen.getByPlaceholderText("Số điện thoại"), { target: { value: "0901234567" } });

      // Chọn Tự đến lấy tại chi nhánh
      const pickupBtn = screen.getByText("Tự đến lấy tại chi nhánh");
      fireEvent.click(pickupBtn);

      // Chọn phương thức chuyển khoản QR
      const qrOption = screen.getByText("Chuyển khoản / Quét mã QR");
      fireEvent.click(qrOption);

      // Bấm nút Đặt hàng
      const submitBtn = screen.getByRole("button", { name: "Đặt hàng" });
      fireEvent.click(submitBtn);

      // Chờ PaymentQRScreen xuất hiện
      await waitFor(() => {
        expect(screen.getByText(/hu[yỷ] và quay lại/i)).toBeInTheDocument();
      });

      // Bấm nút "Hủy và quay lại"
      const cancelBtn = screen.getByText(/hu[yỷ] và quay lại/i);
      fireEvent.click(cancelBtn);

      // Xác nhận cancelOrderApi đã được gọi với order_code "ORD-TEST-12345"
      await waitFor(() => {
        expect(orderService.cancelOrderApi).toHaveBeenCalledWith(
          "ORD-TEST-12345",
          "0901234567",
          "Khách hàng hủy từ màn hình thanh toán VietQR"
        );
      });
    });
  });

  describe("Hotfix 4 (STT 14): Render quà tặng Mua X Tặng Y, flag is_gift và sửa fallback số lượng", () => {
    it("4.1: evaluateCampaignEligibility trong CouponModal không mặc định cưỡng bức buyQty là 2 khi campaign cấu hình mua 1 sản phẩm", () => {
      const buy1Get1Campaign: any = {
        id: 99,
        name: "Mua 1 Cơm Gà Tặng 1 Nước",
        promotion_type: "buy_x_get_y",
        settings: {
          buy_quantity: 1,
          gift_quantity: 1,
        },
        items: [
          {
            id: 1,
            product_id: 202,
            product_code: "NUOC-SUOI",
            product_name: "Nước Suối 0đ",
            original_price: 15000,
            campaign_price: 0,
            is_free: true,
            is_available: true,
          },
        ],
      };

      // Giỏ hàng chỉ có 1 món duy nhất
      const result = evaluateCampaignEligibility(buy1Get1Campaign, {
        subtotal: 150000,
        cartItems: [{ productId: 101, quantity: 1 }],
        isBrowseMode: false,
      });

      // Phải eligible = true vì chỉ cần mua 1 món
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("4.2: evaluateCampaignEligibility fallback buyQty = 1 khi campaign buy_x_get_y không khai báo settings.buy_quantity", () => {
      const noSettingsCampaign: any = {
        id: 100,
        name: "Combo Mua Là Có Quà",
        promotion_type: "buy_x_get_y",
        items: [
          {
            id: 2,
            product_id: 203,
            product_code: "TRA-DA",
            product_name: "Trà Đá",
            original_price: 5000,
            campaign_price: 0,
            is_free: true,
            is_available: true,
          },
        ],
      };

      // Giỏ hàng có 1 sản phẩm
      const result = evaluateCampaignEligibility(noSettingsCampaign, {
        subtotal: 50000,
        cartItems: [{ productId: 101, quantity: 1 }],
        isBrowseMode: false,
      });

      // Fallback chuẩn là 1, nên 1 sản phẩm đã đủ điều kiện kích hoạt
      expect(result.eligible).toBe(true);
    });

    it("4.3: Render quà tặng activeBuyXGetYItems trên MobileCartFlow kèm nhãn 'Quà tặng 0đ'", async () => {
      mockActivePromotions = [
        {
          id: 50,
          name: "Mua 2 Món Tặng Nước Suối",
          promotion_type: "buy_x_get_y",
          min_order_value: 0,
          discount_type: "percent",
          discount_value: 100,
          settings: { buy_quantity: 2, gift_quantity: 1 },
          items: [
            {
              id: 991,
              product_id: 501,
              product_code: "GIFT-WATER",
              product_name: "Nước Suối Tinh Khiết",
              original_price: 15000,
              campaign_price: 0,
              is_free: true,
              is_available: true,
            },
          ],
        },
      ];

      // Đã chọn campaign ID 50
      localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([50]));

      render(<MobileCartFlow inline={false} />);

      await waitFor(() => {
        // Tìm thấy tên món quà tặng combo ở Step 1 danh sách món
        expect(screen.getByText("Nước Suối Tinh Khiết")).toBeInTheDocument();
        // Nhãn Quà tặng 0đ được render
        expect(screen.getByText("Quà tặng 0đ")).toBeInTheDocument();
      });
    });

    it("4.4: Khi submit order, các món quà tặng buy_x_get_y có gắn cờ is_gift: true và price: 0 trong payload createOrder", async () => {
      mockActivePromotions = [
        {
          id: 50,
          name: "Mua 2 Món Tặng Nước Suối",
          promotion_type: "buy_x_get_y",
          min_order_value: 0,
          discount_type: "percent",
          discount_value: 100,
          settings: { buy_quantity: 2, gift_quantity: 1 },
          items: [
            {
              id: 991,
              product_id: 501,
              product_code: "GIFT-WATER",
              product_name: "Nước Suối Tinh Khiết",
              original_price: 15000,
              campaign_price: 0,
              is_free: true,
              is_available: true,
            },
          ],
        },
      ];

      localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([50]));

      render(<MobileCartFlow inline={false} />);

      // Tiếp tục sang Step 2
      await waitFor(() => {
        expect(screen.getByText("Tiếp tục")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Tiếp tục"));

      // Nhập họ tên và số điện thoại
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Họ và tên")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText("Họ và tên"), { target: { value: "Nguyễn Văn A" } });
      fireEvent.change(screen.getByPlaceholderText("Số điện thoại"), { target: { value: "0901234567" } });

      // Chọn Tự đến lấy tại chi nhánh
      const pickupBtn = screen.getByText("Tự đến lấy tại chi nhánh");
      fireEvent.click(pickupBtn);

      // Đặt hàng COD
      const submitBtn = screen.getByRole("button", { name: "Đặt hàng" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(orderService.createOrder).toHaveBeenCalled();
        const callPayload: any = (orderService.createOrder as any).mock.calls[0][0];
        const giftItem = callPayload.items.find((i: any) => i.product_id === 501);
        expect(giftItem).toBeDefined();
        expect(giftItem.is_gift).toBe(true);
        expect(giftItem.price).toBe(0);
      });
    });
  });
});
