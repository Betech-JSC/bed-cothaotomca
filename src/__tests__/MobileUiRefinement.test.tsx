/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import CardProduct from "@/components/Card/CardProduct";
import Header from "@/components/Header";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import viMessages from "@/i18n/locales/vi.json";
import { formatPrice } from "@/lib/format";

// Mocks
let currentLocale = "vi";
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => currentLocale,
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

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => "/products/ca-bong-kho-to",
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => "/products/ca-bong-kho-to",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className, ...props }: any) => (
    <img src={src} alt={alt || ""} className={className} {...props} />
  ),
}));

// Mock Logo to inspect passed props
vi.mock("@/components/Logo", () => ({
  default: (props: any) => (
    <div
      data-testid="mock-logo"
      data-width={props.width}
      data-height={props.height}
      className={props.className}
    >
      Logo
    </div>
  ),
}));

// Mock CartContext
let mockCartState: any = {
  cart: [],
  cartItems: [],
  subtotal: 0,
  hasOutOfStockItems: false,
  isCartOpen: false,
  totalItems: 0,
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  setIsCartOpen: vi.fn(),
};

vi.mock("@/contexts/CartContext", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCart: () => mockCartState,
  };
});

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    token: null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({ tier: "member", discountPercent: 0 }),
  calculateMemberDiscount: () => 0,
}));

// Mock GeneralSettingsContext
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
  }),
}));

// Mock BranchContext
vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: "Chi nhánh Quận 1" }],
    currentBranch: { id: 1, branchName: "Chi nhánh Quận 1" },
    selectBranch: vi.fn(),
  }),
}));

// Mock useSearchSuggestions
vi.mock("@/hooks/useSearchSuggestions", () => ({
  useSearchSuggestions: () => ({
    productSuggestions: [],
    blogSuggestions: [],
    policySuggestions: [],
    isLoading: false,
    clearSuggestions: vi.fn(),
  }),
}));

describe("Mobile UI Refinements: Card, Header Logo, Product Details, and Step 2 Order Summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "vi";
  });

  // =========================================================================
  // Scope 1: Card sản phẩm (CardProduct.tsx)
  // =========================================================================
  describe("1. CardProduct Mobile Pricing Typography", () => {
    const discountedItem: any = {
      id: 1,
      title: "Cá Bống Kho Tiêu",
      custom_name: "Cá Bống Kho Tiêu",
      slug: "ca-bong-kho-tieu",
      price: 180000,
      original_price: 220000,
      image: { url: "/product.jpg", alt: "Cá bống" },
      description: "Mô tả cá bống kho đậm đà",
      variants: [
        { id: 10, size: "Hũ 250g", price: 180000, original_price: 220000 },
      ],
    };

    it("renders sale price with text-[19px] sm:text-xl md:text-xl font-extrabold tracking-tight leading-tight", () => {
      render(<CardProduct item={discountedItem} />);

      const salePrice = screen.getByText(formatPrice(180000));
      expect(salePrice).toBeInTheDocument();
      expect(salePrice.className).toContain("title-2");
      expect(salePrice.className).toContain("text-secondary");
      expect(salePrice.className).toContain("text-[19px]");
      expect(salePrice.className).toContain("sm:text-xl");
      expect(salePrice.className).toContain("md:text-xl");
      expect(salePrice.className).toContain("font-extrabold");
      expect(salePrice.className).toContain("tracking-tight");
      expect(salePrice.className).toContain("leading-tight");
    });

    it("renders strikethrough original price with text-gray-400 line-through text-[11px] sm:text-xs md:text-sm font-medium mb-0.5", () => {
      render(<CardProduct item={discountedItem} />);

      const origPrice = screen.getByText(formatPrice(220000));
      expect(origPrice).toBeInTheDocument();
      expect(origPrice.className).toContain("text-gray-400");
      expect(origPrice.className).toContain("line-through");
      expect(origPrice.className).toContain("text-[11px]");
      expect(origPrice.className).toContain("sm:text-xs");
      expect(origPrice.className).toContain("md:text-sm");
      expect(origPrice.className).toContain("font-medium");
      expect(origPrice.className).toContain("mb-0.5");
    });

    it("renders only sale price when item has no discount", () => {
      const regularItem: any = {
        id: 2,
        title: "Tôm Rim Thịt",
        slug: "tom-rim-thit",
        price: 150000,
        image: { url: "/tom.jpg", alt: "Tôm rim" },
        description: "Mô tả tôm rim",
      };

      render(<CardProduct item={regularItem} />);

      const salePrice = screen.getByText(formatPrice(150000));
      expect(salePrice).toBeInTheDocument();
      expect(salePrice.className).toContain("text-[19px]");
      expect(salePrice.className).toContain("font-extrabold");

      // No strikethrough price element
      const strikethrough = document.querySelector(".line-through");
      expect(strikethrough).toBeNull();
    });
  });

  // =========================================================================
  // Scope 2: Logo Header Mobile (Header/index.tsx)
  // =========================================================================
  describe("2. Mobile Header Logo & Container Spacing", () => {
    it("renders mobile navigation header container with py-1.5 padding", () => {
      render(<Header />);

      const mobileNav = screen.getByRole("navigation", { name: "Mobile main navigation" });
      expect(mobileNav).toBeInTheDocument();

      const logoContainer = mobileNav.querySelector("div");
      expect(logoContainer).toBeInTheDocument();
      expect(logoContainer?.className).toContain("py-1.5");
      expect(logoContainer?.className).not.toContain("py-1 relative");
    });

    it("renders MobileMenu Logo with width 62, height 40, and className h-10", () => {
      render(<Header />);

      const mobileNav = screen.getByRole("navigation", { name: "Mobile main navigation" });
      const logoEl = mobileNav.querySelector('[data-testid="mock-logo"]');
      expect(logoEl).toBeInTheDocument();
      expect(logoEl?.getAttribute("data-width")).toBe("62");
      expect(logoEl?.getAttribute("data-height")).toBe("40");
      expect(logoEl?.className).toContain("h-10");
    });
  });

  // =========================================================================
  // Scope 3: Chi tiết sản phẩm (ProductDetailsInfo.tsx)
  // =========================================================================
  describe("3. ProductDetailsInfo Pricing & Discount Tag Hierarchy", () => {
    const productDataWithDiscount: any = {
      title: "Chả Cá Lã Vọng",
      checkout: {
        slug: "cha-ca-la-vong",
        categorySlug: "mon-cha",
        productId: 201,
        productCode: "CC01",
      },
      images: [{ url: "/images/chaca.jpg" }],
      sizes: [
        {
          id: 1,
          code: "CC-250",
          title: "Hũ 250g",
          price: 135000,
          original_price: 150000,
          discount_percent: 10,
        },
      ],
      description: "Đặc sản gia truyền",
      infos: [],
    };

    it("renders discount badge with text-[11px] md:text-xs font-bold px-2 md:px-2.5 py-0.5 rounded-[4px] tracking-wide", () => {
      render(<ProductDetailsInfo productData={productDataWithDiscount} />);

      const discountTag = screen.getByText("-10%");
      expect(discountTag).toBeInTheDocument();
      expect(discountTag.className).toContain("inline-block");
      expect(discountTag.className).toContain("bg-primary");
      expect(discountTag.className).toContain("text-white");
      expect(discountTag.className).toContain("text-[11px]");
      expect(discountTag.className).toContain("md:text-xs");
      expect(discountTag.className).toContain("font-bold");
      expect(discountTag.className).toContain("px-2");
      expect(discountTag.className).toContain("md:px-2.5");
      expect(discountTag.className).toContain("py-0.5");
      expect(discountTag.className).toContain("rounded-[4px]");
      expect(discountTag.className).toContain("tracking-wide");
    });

    it("renders discounted sale price with text-[28px] sm:text-3xl md:text-[28px] font-display font-bold text-secondary leading-tight", () => {
      render(<ProductDetailsInfo productData={productDataWithDiscount} />);

      const salePrice = screen.getByText(formatPrice(135000));
      expect(salePrice).toBeInTheDocument();
      expect(salePrice.className).toContain("text-[28px]");
      expect(salePrice.className).toContain("sm:text-3xl");
      expect(salePrice.className).toContain("md:text-[28px]");
      expect(salePrice.className).toContain("font-display");
      expect(salePrice.className).toContain("font-bold");
      expect(salePrice.className).toContain("text-secondary");
      expect(salePrice.className).toContain("leading-tight");
    });

    it("renders strikethrough original price with text-xs md:text-base font-semibold text-gray-400 line-through leading-tight", () => {
      render(<ProductDetailsInfo productData={productDataWithDiscount} />);

      const origPrice = screen.getByText(formatPrice(150000));
      expect(origPrice).toBeInTheDocument();
      expect(origPrice.className).toContain("text-xs");
      expect(origPrice.className).toContain("md:text-base");
      expect(origPrice.className).toContain("font-semibold");
      expect(origPrice.className).toContain("text-gray-400");
      expect(origPrice.className).toContain("line-through");
      expect(origPrice.className).toContain("leading-tight");
    });
  });

  // =========================================================================
  // Scope 4: Tinh giản luồng thanh toán Bước 2 & Giỏ hàng Bước 1 (MobileCartFlow.tsx)
  // =========================================================================
  describe("4. MobileCartFlow Streamlined Step 2 & Step 1 Cart Controls", () => {
    beforeEach(() => {
      mockCartState = {
        ...mockCartState,
        cartItems: [
          {
            id: "cart-item-1",
            productId: 501,
            productCode: "CA-THU-01",
            title: "Cá Thu Một Nắng",
            variant: "Size Lớn 500g",
            unitPrice: 220000,
            originalPrice: 250000,
            quantity: 2,
            imageUrl: "/cathu.jpg",
            isOutOfStock: false,
          },
        ],
        subtotal: 440000,
        hasOutOfStockItems: false,
        isCartOpen: true,
        totalItems: 2,
      };
    });

    it("streamlines Step 2 into a 4-line financial summary card and removes repeated cartItems list", () => {
      // Render MobileCartFlow inline (starts directly in Step 2)
      render(<MobileCartFlow inline={true} />);

      // Step 2 does NOT render repeated cart item rows
      expect(screen.queryByText("Size Lớn 500g")).not.toBeInTheDocument();

      // Step 2 renders streamlined financial summary
      expect(screen.getByText("Tạm tính")).toBeInTheDocument();
      expect(screen.getByText("Tổng thanh toán")).toBeInTheDocument();
      expect(screen.getByText(formatPrice(440000))).toBeInTheDocument();
    });

    it("renders brand price, 32px stepper, number input, and trash icon in Step 1", () => {
      // Render MobileCartFlow normal (starts in Step 1)
      render(<MobileCartFlow inline={false} />);

      // Step 1 renders item title and variant
      expect(screen.getByText("Cá Thu Một Nắng")).toBeInTheDocument();
      expect(screen.getByText("Size Lớn 500g")).toBeInTheDocument();

      // Brand pricing typography: selling price has font-display text-secondary font-bold
      const salePrice = screen.getByText(formatPrice(220000));
      expect(salePrice).toBeInTheDocument();
      expect(salePrice.className).toContain("font-display");
      expect(salePrice.className).toContain("text-secondary");
      expect(salePrice.className).toContain("font-bold");

      // Original strikethrough price
      const origPrice = screen.getByText(formatPrice(250000));
      expect(origPrice).toBeInTheDocument();
      expect(origPrice.className).toContain("line-through");
      expect(origPrice.className).toContain("text-gray-400");

      // Stepper 32px touch buttons
      const decreaseBtn = screen.getByRole("button", { name: "Giảm số lượng" });
      const increaseBtn = screen.getByRole("button", { name: "Tăng số lượng" });
      expect(decreaseBtn).toBeInTheDocument();
      expect(decreaseBtn.className).toContain("size-8");
      expect(increaseBtn).toBeInTheDocument();
      expect(increaseBtn.className).toContain("size-8");

      // Stepper quantity number input
      const qtyInput = screen.getByRole("spinbutton", { name: "Số lượng" });
      expect(qtyInput).toBeInTheDocument();
      expect(qtyInput).toHaveValue(2);

      // Trash icon button with aria-label
      const trashBtn = screen.getByRole("button", { name: "Xóa món" });
      expect(trashBtn).toBeInTheDocument();
      expect(trashBtn.className).toContain("text-red-500");
    });
  });
});
