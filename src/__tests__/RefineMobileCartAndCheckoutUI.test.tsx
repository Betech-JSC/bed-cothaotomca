import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import VoucherTicketBar from "@/components/Checkout/VoucherTicketBar";
import FloatingVoucherButton from "@/components/Voucher/FloatingVoucherButton";
import PreOrderNoticeModal from "@/components/Checkout/PreOrderNoticeModal";
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
    t.rich = (key: string) => resolveKey(key);
    return t;
  },
}));

// Mock routing
let mockCurrentPath = "/";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => mockCurrentPath,
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => mockCurrentPath,
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
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: Boolean(mockUser),
    token: mockUser ? "mock-token" : null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({ tier: "member", discountPercent: 0 }),
  calculateMemberDiscount: () => 0,
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

vi.mock("@/services/orderService", async () => {
  const actual: any = await vi.importActual("@/services/orderService");
  return {
    ...actual,
    getCheckoutConfig: vi.fn(async () => ({
      default_shipping_fee: "30000",
      operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Le Loi" }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
    })),
    getAvailableVouchers: vi.fn(async () => mockAvailableVouchers),
    getShippingSettings: vi.fn(async () => null),
    getAdministrativeUnits: vi.fn(async () => []),
    getLoyaltySettings: vi.fn(async () => null),
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

vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn(async () => ({ hotline: "024.9999.7122" })),
}));

vi.mock("@/services/authService", async () => {
  const actual: any = await vi.importActual("@/services/authService");
  return {
    ...actual,
    getCustomerAddressesApi: vi.fn(async () => []),
    getCachedCustomerAddresses: vi.fn(() => []),
    setCachedCustomerAddresses: vi.fn(),
    checkGuestTierByPhone: vi.fn(async () => null),
  };
});

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn(async () => []),
}));

describe("OpenSpec refine-mobile-cart-and-checkout-ui Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentPath = "/";
    window.__MOCK_TIME__ = "11:00";
    localStorage.clear();
    mockUser = null;
    mockAvailableVouchers = [];
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
        unitPrice: 120000,
        originalPrice: 150000,
        quantity: 2,
        imageUrl: "/cakho.jpg",
        isOutOfStock: false,
      },
    ];
  });

  // =========================================================================
  // Part 1: Hiển thị giá món chuẩn nhận diện thương hiệu & Điểm thưởng Loyalty
  // =========================================================================
  describe("Phần 1: Chuẩn hóa hiển thị giá món và tích hợp điểm thưởng Loyalty", () => {
    it("Task 1.1: Hiển thị dòng tích lũy điểm thưởng ở khối Summary Bước 1 khi user đăng nhập và total > 0", () => {
      mockUser = { id: 1, name: "Nguyen Van A", phone: "0901234567" };
      render(<MobileCartFlow inline={false} />);

      // Tổng thanh toán: 120.000 * 2 = 240.000đ + 30.000 shipping = 270.000đ -> Tích lũy Math.floor(270000 / 10000) = 27 điểm
      const pointsText = screen.getByText(/Đơn hàng này sẽ tích lũy thêm\s+27\s+điểm/i);
      expect(pointsText).toBeInTheDocument();
      expect(pointsText.closest("div")?.className).toContain("text-secondary");
      expect(pointsText.closest("div")?.className).toContain("font-semibold");
    });

    it("Task 1.2: Hiển thị dòng điểm thưởng ở Bước 2 đồng bộ nhất quán", () => {
      mockUser = { id: 1, name: "Nguyen Van A", phone: "0901234567" };
      render(<MobileCartFlow inline={true} />);

      const pointsText = screen.getByText(/Đơn hàng này sẽ tích lũy thêm\s+27\s+điểm/i);
      expect(pointsText).toBeInTheDocument();
      expect(pointsText.closest("div")?.className).toContain("text-secondary");
    });

    it("Task 1.3: Cập nhật typography giá món trong giỏ hàng Bước 1", () => {
      render(<MobileCartFlow inline={false} />);

      // Giá gốc: line-through, font-medium, text-gray-400
      const origPrice = screen.getByText(formatPrice(150000));
      expect(origPrice).toBeInTheDocument();
      expect(origPrice.className).toContain("text-gray-400");
      expect(origPrice.className).toContain("line-through");
      expect(origPrice.className).toContain("font-medium");

      // Giá bán: font-display, text-secondary, font-bold, text-base sm:text-lg
      const unitPrice = screen.getByText(formatPrice(120000));
      expect(unitPrice).toBeInTheDocument();
      expect(unitPrice.className).toContain("font-display");
      expect(unitPrice.className).toContain("text-secondary");
      expect(unitPrice.className).toContain("font-bold");
      expect(unitPrice.className).toContain("text-base");
      expect(unitPrice.className).toContain("sm:text-lg");
    });
  });

  // =========================================================================
  // Part 2: Nâng cấp Stepper cảm ứng 32px và Icon Thùng rác
  // =========================================================================
  describe("Phần 2: Nâng cấp Stepper cảm ứng 32px và Icon Thùng rác", () => {
    it("Task 2.1: Phím bấm [-] và [+] đạt chuẩn cảm ứng 32px (size-8), bo tròn, active:scale-95", () => {
      render(<MobileCartFlow inline={false} />);

      const decBtn = screen.getByRole("button", { name: "Giảm số lượng" });
      const incBtn = screen.getByRole("button", { name: "Tăng số lượng" });

      expect(decBtn).toBeInTheDocument();
      expect(decBtn.className).toContain("size-8");
      expect(decBtn.className).toContain("min-w-[32px]");
      expect(decBtn.className).toContain("min-h-[32px]");
      expect(decBtn.className).toContain("rounded-full");
      expect(decBtn.className).toContain("active:scale-95");

      expect(incBtn).toBeInTheDocument();
      expect(incBtn.className).toContain("size-8");
      expect(incBtn.className).toContain("min-w-[32px]");
      expect(incBtn.className).toContain("min-h-[32px]");
      expect(incBtn.className).toContain("rounded-full");
      expect(incBtn.className).toContain("active:scale-95");
    });

    it("Task 2.2: Input số lượng cho phép nhập trực tiếp và validate giới hạn 1 - 99", () => {
      render(<MobileCartFlow inline={false} />);

      const input = screen.getByRole("spinbutton", { name: "Số lượng" });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(2);

      // Thay đổi giá trị thành 5
      fireEvent.change(input, { target: { value: "5" } });
      expect(mockUpdateQuantity).toHaveBeenCalledWith("item-1", 5);

      // Nhập giá trị vượt quá 99 -> clamp về 99
      fireEvent.change(input, { target: { value: "150" } });
      expect(mockUpdateQuantity).toHaveBeenCalledWith("item-1", 99);

      // Blur với giá trị rỗng hoặc nhỏ hơn 1 -> fallback về 1
      fireEvent.blur(input, { target: { value: "0" } });
      expect(mockUpdateQuantity).toHaveBeenCalledWith("item-1", 1);
    });

    it("Task 2.3: Thay thế nút [Xóa] bằng Trash SVG icon màu đỏ trang nhã có aria-label", () => {
      render(<MobileCartFlow inline={false} />);

      // Không còn nút văn bản thô "[Xóa]"
      expect(screen.queryByText("[Xóa]")).not.toBeInTheDocument();

      // Nút xóa bằng thùng rác icon
      const trashBtn = screen.getByRole("button", { name: "Xóa món" });
      expect(trashBtn).toBeInTheDocument();
      expect(trashBtn.className).toContain("text-red-500");
      expect(trashBtn.className).toContain("hover:text-red-700");
      expect(trashBtn.className).toContain("active:scale-90");

      fireEvent.click(trashBtn);
      expect(mockRemoveFromCart).toHaveBeenCalledWith("item-1");
    });
  });

  // =========================================================================
  // Part 3: Tái thiết kế Thanh Voucher Shopee-style 1 hàng ngang
  // =========================================================================
  describe("Phần 3: Tái thiết kế Thanh Voucher Shopee-style 1 hàng ngang", () => {
    it("Task 3.1: Layout 1 hàng ngang (flex-nowrap) với icon ticket, placeholder và chevron >", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <VoucherTicketBar
          appliedVoucher={null}
          appliedShippingVoucher={null}
          onClick={handleClick}
        />
      );

      // Container flex-nowrap
      const bar = container.querySelector(".flex-nowrap");
      expect(bar).toBeInTheDocument();

      // Left: Ticket icon + Label
      expect(screen.getByText("Mã giảm giá")).toBeInTheDocument();

      // Middle / Right: Placeholder
      expect(screen.getByText("Chọn hoặc nhập mã")).toBeInTheDocument();

      // Right: Chevron button mở modal
      const selectBtn = screen.getByRole("button", { name: "Chọn mã" });
      expect(selectBtn).toBeInTheDocument();
      fireEvent.click(selectBtn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("Task 3.1 & 3.3: Khi áp 2 mã (món ăn + freeship) không bị vỡ layout, hiển thị nút gỡ ✕", () => {
      const handleClick = vi.fn();
      const handleRemove = vi.fn();
      const foodVoucher = { code: "GIAM20K", value: 20000, discountAmount: 20000 };
      const shipVoucher = { code: "FREESHIP20K", isFreeship: true, short_name: "Freeship 20k" };

      render(
        <VoucherTicketBar
          appliedVoucher={foodVoucher}
          appliedShippingVoucher={shipVoucher}
          onClick={handleClick}
          onRemove={handleRemove}
        />
      );

      // Cả 2 badge đều hiển thị
      expect(screen.getByTestId("food-ticket-badge")).toBeInTheDocument();
      expect(screen.getByTestId("freeship-ticket-badge")).toBeInTheDocument();

      // Nút gỡ mã nhanh ✕ (Xóa)
      const removeBtn = screen.getByRole("button", { name: "Xóa" });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it("Task 3.2: Lược bỏ các đoạn text cảnh báo ma trận rườm rà ở Bước 1 MobileCartFlow", () => {
      render(<MobileCartFlow inline={false} />);

      // Không hiển thị text điều kiện ma trận gây rối
      expect(screen.queryByText(/không áp dụng đồng thời với CTKM khác/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Part 4: Tinh giản luồng thanh toán Bước 2
  // =========================================================================
  describe("Phần 4: Tinh giản luồng thanh toán Bước 2", () => {
    it("Task 4.1: Lược bỏ danh sách sản phẩm lặp lại trong Bước 2", () => {
      render(<MobileCartFlow inline={true} />);

      // Không hiển thị danh sách sản phẩm lặp lại
      expect(screen.queryByText("Cá Bống Kho Tiêu")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Xóa món" })).not.toBeInTheDocument();
    });

    it("Task 4.2: Tinh gọn khối tóm tắt tài chính Bước 2 thành đúng các dòng tài chính thiết yếu", () => {
      mockUser = { id: 1, name: "Nguyen Van A" };
      render(<MobileCartFlow inline={true} />);

      // 1) Tạm tính
      expect(screen.getByText("Tạm tính")).toBeInTheDocument();
      // 4) Tổng thanh toán
      expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();

      // Điểm tích lũy
      expect(screen.getByText(/Đơn hàng này sẽ tích lũy thêm/i)).toBeInTheDocument();
    });

    it("Task 4.3: Nút quay lại Bước 1 hoạt động bình thường", () => {
      render(<MobileCartFlow inline={false} />);

      // Chuyển sang Bước 2
      const checkoutBtn = screen.getByRole("button", { name: /^Tiếp tục$/i });
      fireEvent.click(checkoutBtn);

      // Nút quay lại Bước 1 (mũi tên ←)
      const backBtn = screen.getByRole("button", { name: /Giỏ hàng|Thanh toán/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);

      // Quay lại Bước 1: hiển thị lại sản phẩm
      expect(screen.getByText("Cá Bống Kho Tiêu")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Part 5: OpenSpec refine-mobile-cart-pricing-and-operating-notice
  // =========================================================================
  describe("Phần 5: refine-mobile-cart-pricing-and-operating-notice", () => {
    it("Task 1: Thứ tự giá món ăn trong giỏ hàng Mobile (giá bán ở trên, giá gốc gạch ngang ở dưới)", () => {
      render(<MobileCartFlow inline={false} />);

      // Giá bán sau giảm
      const unitPrice = screen.getByText(formatPrice(120000));
      expect(unitPrice).toBeInTheDocument();
      expect(unitPrice.className).toContain("font-display");
      expect(unitPrice.className).toContain("text-secondary");
      expect(unitPrice.className).toContain("font-bold");

      // Giá gốc gạch ngang
      const origPrice = screen.getByText(formatPrice(150000));
      expect(origPrice).toBeInTheDocument();
      expect(origPrice.className).toContain("line-through");
      expect(origPrice.className).toContain("text-gray-400");

      // Kiểm tra thứ tự DOM: unitPrice nằm trên origPrice trong cùng container
      const priceContainer = unitPrice.parentElement;
      expect(priceContainer).toBe(origPrice.parentElement);
      expect(unitPrice.compareDocumentPosition(origPrice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("Task 2.1: PreOrderNoticeModal hỗ trợ prop zIndex tùy chọn, mặc định z-50", () => {
      const notice = {
        title: "Thông Báo Ngoài Giờ",
        message: "Cửa hàng hiện đóng cửa.",
        storeOpen: "09:00",
        cutoff: "22:30",
        slotInfo: "10:00 - 23:00",
        targetDateDisplay: "Hôm nay",
      };

      const { rerender } = render(
        <PreOrderNoticeModal isOpen={true} onClose={vi.fn()} notice={notice as any} />
      );

      // Mặc định: z-50 cho Desktop
      const backdropDefault = document.querySelector(".fixed.inset-0");
      expect(backdropDefault?.className).toContain("z-50");

      // Khi truyền zIndex="z-[200]" cho Mobile
      rerender(
        <PreOrderNoticeModal isOpen={true} onClose={vi.fn()} notice={notice as any} zIndex="z-[200]" />
      );
      const backdropMobile = document.querySelector(".fixed.inset-0");
      expect(backdropMobile?.className).toContain("z-[200]");
    });

    it("Task 2.2: MobileCartFlow tự động mở PreOrderNoticeModal ngoài giờ với zIndex z-[200]", () => {
      window.__MOCK_TIME__ = "08:00"; // ngoài giờ phục vụ
      render(<MobileCartFlow inline={false} />);

      // PreOrderNoticeModal tự động mở
      expect(screen.getByText("Thông Báo Đặt Hàng Hẹn Giờ")).toBeInTheDocument();
      const modalBackdrop = document.querySelector(".fixed.inset-0.z-\\[200\\]");
      expect(modalBackdrop).toBeInTheDocument();
    });

    it("Task 3: Nút Ưu Đãi Nổi đạt chuẩn touch target ~38-40px và vị trí an toàn", () => {
      const { container } = render(<FloatingVoucherButton />);

      // Container vị trí bottom-5 left-3.5
      const wrapper = container.querySelector(".fixed");
      expect(wrapper?.className).toContain("bottom-5");
      expect(wrapper?.className).toContain("left-3.5");

      // Nút bấm: px-3.5 py-2
      const btn = screen.getByRole("button", { name: "Xem ưu đãi và khuyến mãi" });
      expect(btn.className).toContain("px-3.5");
      expect(btn.className).toContain("py-2");

      // Chữ "Ưu đãi": font-display text-xs sm:text-sm md:title-3 font-bold
      const text = screen.getByText("Ưu đãi");
      expect(text.className).toContain("text-xs");
      expect(text.className).toContain("font-bold");

      // Icon vé
      const svg = btn.querySelector("svg");
      expect(svg?.getAttribute("class")).toContain("w-4.5");
      expect(svg?.getAttribute("class")).toContain("h-4.5");
    });

    it("Task 4.1: Dòng Phí giao hàng Step 1 hiển thị giá gốc gạch ngang khi có Freeship hoặc giảm ship", async () => {
      mockShippingResult = {
        fee: 0,
        shipping_fee: 0,
        original_fee: 35000,
        shipping_discount: 35000,
        is_freeship: true,
        is_deliverable: true,
      };

      render(<MobileCartFlow inline={false} />);

      await screen.findByText(formatPrice(35000));
      expect(screen.getByText("0đ")).toBeInTheDocument();
      const origFee = screen.getByText(formatPrice(35000));
      expect(origFee.className).toContain("line-through");
      expect(origFee.className).toContain("text-gray-400");
    });

    it("Task 4.2: Dòng Phí giao hàng Step 2 nằm dưới Tạm tính và hiển thị đúng theo chuẩn Desktop", async () => {
      mockShippingResult = {
        fee: 20000,
        shipping_fee: 20000,
        original_fee: 30000,
        shipping_discount: 10000,
        is_freeship: false,
        is_deliverable: true,
      };

      render(<MobileCartFlow inline={true} />);

      // Phí giao hàng nằm ngay dưới Tạm tính
      const subtotalLabel = screen.getByText("Tạm tính");
      const shippingLabel = screen.getByText("Phí giao hàng");
      expect(subtotalLabel.compareDocumentPosition(shippingLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Trong Step 2, khi chưa chọn địa chỉ/phường xã thì phí vận chuyển hiển thị '--' (chuẩn Desktop)
      expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("Task 4.3: Dòng Mã giảm giá Step 2 chỉ hiển thị tiền giảm món, không gộp giảm ship", async () => {
      mockAvailableVouchers = [
        {
          id: 1,
          code: "GIAM20K",
          title: "Giảm 20k món ăn",
          value: 20000,
          discount_type: "fixed",
          discountType: "fixed",
          can_combine_with_promotions: true,
          prereq_price: 100000,
        },
      ];

      // Đơn hàng có cả giảm ship 10k
      mockShippingResult = {
        fee: 20000,
        shipping_fee: 20000,
        original_fee: 30000,
        shipping_discount: 10000,
        is_freeship: false,
        is_deliverable: true,
      };

      // Lưu voucher vào localStorage để MobileCartFlow tự load
      localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(["GIAM20K"]));

      render(<MobileCartFlow inline={true} />);

      // Dòng Mã giảm giá chỉ hiển thị -20.000 VNĐ (tiền giảm món), KHÔNG gộp -30.000 VNĐ
      await screen.findByText(`-${formatPrice(20000)}`);
      expect(screen.getByText(`-${formatPrice(20000)}`)).toBeInTheDocument();
      expect(screen.queryByText(`-${formatPrice(30000)}`)).not.toBeInTheDocument();
    });

    it("Task 4.4: Dòng Mã giảm giá Step 2 ẩn hoàn toàn khi không có voucher giảm món", async () => {
      // Chỉ có freeship, không có voucher giảm món
      mockShippingResult = {
        fee: 0,
        shipping_fee: 0,
        original_fee: 30000,
        shipping_discount: 30000,
        is_freeship: true,
        is_deliverable: true,
      };

      localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify([]));

      render(<MobileCartFlow inline={true} />);

      // Chờ tóm tắt đơn hàng hiển thị
      expect(await screen.findByText("Tổng thanh toán")).toBeInTheDocument();

      // Dòng "Mã giảm giá" trong bảng tóm tắt không render (không có số tiền âm -...đ)
      const negativePrices = screen.queryAllByText(/^-\d/);
      expect(negativePrices.length).toBe(0);
    });
  });
});
