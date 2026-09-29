import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import VoucherTicketBar from "@/components/Checkout/VoucherTicketBar";
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

describe("OpenSpec refine-mobile-cart-and-checkout-ui Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
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
      expect(screen.getByText("Mã giảm giá (Voucher)")).toBeInTheDocument();

      // Middle: Placeholder
      expect(screen.getByText("Chọn hoặc nhập mã ưu đãi")).toBeInTheDocument();

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
      const checkoutBtn = screen.getByRole("button", { name: /Tiến hành đặt hàng|Thanh toán/i });
      fireEvent.click(checkoutBtn);

      // Nút quay lại Bước 1 (mũi tên ←)
      const backBtn = screen.getByRole("button", { name: /Giỏ hàng|Thanh toán/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);

      // Quay lại Bước 1: hiển thị lại sản phẩm
      expect(screen.getByText("Cá Bống Kho Tiêu")).toBeInTheDocument();
    });
  });
});
