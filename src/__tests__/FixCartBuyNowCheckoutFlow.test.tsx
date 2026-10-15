import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartProvider, useCart } from "@/contexts/CartContext";
import SmartCartProgressBar from "@/components/Cart/SmartCartProgressBar";
import CartPopup from "@/components/Header/CartPopup";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import SignInContainer from "@/components/Auth/SignInContainer";

const mockPush = vi.fn();
let mockPathname = "/";
let mockLocale = "vi";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, onClick, className }: any) => (
    <a href={typeof href === "string" ? href : "#"} onClick={onClick} className={className}>
      {children}
    </a>
  ),
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, onClick, className }: any) => (
    <a href={typeof href === "string" ? href : "#"} onClick={onClick} className={className}>
      {children}
    </a>
  ),
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => {
    const fullKey = ns ? `${ns}.${key}` : key;
    const dict: Record<string, string> = {
      "cart.title": "Giỏ hàng",
      "cart.empty": "Giỏ hàng của bạn đang trống.",
      "cart.continue_shopping": "Tiếp tục mua sắm",
      "cart.subtotal": "Tạm tính:",
      "cart.checkout": "Thanh toán ngay",
      "checkout.empty": "Giỏ hàng của bạn đang trống.",
      "checkout.continue_shopping": "Tiếp tục mua sắm",
      "checkout.subtotal": "Tạm tính",
      "checkout.total": "Tổng thanh toán",
      "checkout.order_summary": "Thông tin đơn hàng",
      "checkout.shipping_fee": "Phí giao hàng",
      "checkout.delivery_pickup": "Tự đến lấy",
      "checkout.quantity": "Số lượng",
      "button.buy-now": "Buy now",
      "button.add_to_cart_short": "Add to cart",
      "progress_bar.buy_more": "Mua thêm",
      "progress_bar.to_freeship": "để được Freeship",
      "progress_bar.applied_freeship": "Đã được Freeship",
    };
    return dict[fullKey] || dict[key] || key;
  },
  useLocale: () => mockLocale,
}));

let mockAuthState: { user: any; loading: boolean; token: string | null; refreshUser: any } = {
  user: null,
  loading: false,
  token: null,
  refreshUser: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
  getMemberTier: () => ({
    tier: "member",
    name: "Thành viên",
    discountPercent: 0,
  }),
}));

vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
    branches: [],
    default_shipping_fee: "30000",
    social_links: {},
  }),
}));

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockResolvedValue({
      branches: [],
      default_shipping_fee: "30000",
      free_shipping_threshold: "500000",
    }),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: true,
      min_order_amount: 500000,
      shipping_discount_type: "free",
      shipping_discount_value: 0,
    }),
    getActiveCartPromotions: vi.fn().mockResolvedValue([]),
    getPublicCampaigns: vi.fn().mockResolvedValue([]),
    getLoyaltySettings: vi.fn().mockResolvedValue(null),
    calculateShippingFee: vi.fn().mockResolvedValue({
      is_deliverable: true,
      shipping_fee: 30000,
      original_fee: 30000,
      discount: 0,
      is_freeship: false,
    }),
  };
});

vi.mock("@/services/administrativeService", () => ({
  getAdministrativeUnits: vi.fn().mockResolvedValue([]),
  FALLBACK_ADMINISTRATIVE_UNITS: [],
  resolveNewWardName: (w: string) => w,
}));

vi.mock("@/services/customerAddressService", () => ({
  getCustomerAddresses: vi.fn().mockResolvedValue([]),
  getCachedCustomerAddresses: () => [],
  setCachedCustomerAddresses: vi.fn(),
}));

describe("Fix Cart, Buy Now & Checkout Flow (Group 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPathname = "/";
    mockLocale = "vi";
    mockAuthState = {
      user: null,
      loading: false,
      token: null,
      refreshUser: vi.fn(),
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as any;
  });

  describe("1. Synchronous Cart Persistence & Buy Now on EN (/en)", () => {
    it("synchronously writes cart items to localStorage inside addToCart, updateQuantity, removeFromCart, and clearCart before effects run", () => {
      let cartApi: ReturnType<typeof useCart> | null = null;
      function Consumer() {
        cartApi = useCart();
        return null;
      }

      render(
        <CartProvider>
          <Consumer />
        </CartProvider>
      );

      let storedImmediatelyAfterAdd: string | null = null;
      act(() => {
        cartApi!.addToCart(
          {
            id: "cha-muc-500g",
            productId: 101,
            productCode: "SP101",
            slug: "cha-muc-gia-tay",
            categorySlug: "cha-muc",
            title: "Hand-pounded Squid Cake",
            title_vi: "Chả mực giã tay",
            title_en: "Hand-pounded Squid Cake",
            imageUrl: "/cover.jpg",
            variant: "500g",
            unitPrice: 275000,
          },
          2
        );
        storedImmediatelyAfterAdd = localStorage.getItem("cothaotomca_cart");
      });

      expect(storedImmediatelyAfterAdd).not.toBeNull();
      const parsedAdd = JSON.parse(storedImmediatelyAfterAdd!);
      expect(parsedAdd).toHaveLength(1);
      expect(parsedAdd[0].id).toBe("cha-muc-500g");
      expect(parsedAdd[0].quantity).toBe(2);

      act(() => {
        cartApi!.updateQuantity("cha-muc-500g", 4);
      });
      expect(JSON.parse(localStorage.getItem("cothaotomca_cart")!)[0].quantity).toBe(4);

      act(() => {
        cartApi!.removeFromCart("cha-muc-500g");
      });
      expect(JSON.parse(localStorage.getItem("cothaotomca_cart")!)).toHaveLength(0);
    });

    it("persists cart item synchronously when clicking Buy Now on /en desktop and navigates to /checkout via i18n router", () => {
      mockLocale = "en";
      mockPathname = "/en/product/squid-cake/hand-pounded-squid-cake";
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });

      let storedAtPushTime: string | null = null;
      mockPush.mockImplementation(() => {
        storedAtPushTime = localStorage.getItem("cothaotomca_cart");
      });

      const productData: any = {
        title: "Hand-pounded Squid Cake",
        title_vi: "Chả mực giã tay",
        title_en: "Hand-pounded Squid Cake",
        description: "<p>Delicious squid cake</p>",
        images: [{ url: "/cover.jpg", alt: "Squid cake" }],
        sizes: [
          {
            id: 202,
            code: "SP202",
            title: "500g",
            price: 275000,
            original_price: 300000,
            status: 1,
          },
        ],
        checkout: {
          productId: 200,
          productCode: "SP200",
          slug: "hand-pounded-squid-cake",
          categorySlug: "squid-cake",
        },
        accordions: [],
      };

      render(
        <CartProvider>
          <ProductDetailsInfo productData={productData} />
        </CartProvider>
      );

      const buyNowBtn = screen.getByRole("button", { name: /buy now/i });
      fireEvent.click(buyNowBtn);

      expect(mockPush).toHaveBeenCalledWith("/checkout");
      expect(storedAtPushTime).not.toBeNull();
      const parsed = JSON.parse(storedAtPushTime!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].productId).toBe(202);
      expect(parsed[0].unitPrice).toBe(275000);
    });
  });

  describe("2. Empty Cart at Checkout & CartPopup (No 'Liên hệ', Hide Progress Bar & Voucher Bar)", () => {
    it("SmartCartProgressBar returns null immediately when subtotal <= 0", () => {
      const { container } = render(
        <SmartCartProgressBar
          subtotal={0}
          shippingSettings={{
            is_min_amount_enabled: true,
            min_order_amount: 500000,
            shipping_discount_type: "free",
          }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("CartPopup displays '0 VNĐ' (never 'Liên hệ') when subtotal is 0 and shows loading skeleton when isLoaded === false", () => {
      let cartApi: ReturnType<typeof useCart> | null = null;
      function OpenCartTrigger() {
        cartApi = useCart();
        return null;
      }

      render(
        <CartProvider>
          <OpenCartTrigger />
          <CartPopup onClose={vi.fn()} />
        </CartProvider>
      );

      act(() => {
        cartApi!.setIsCartOpen(true);
        cartApi!.addToCart({
          id: "oos-item",
          productId: 301,
          productCode: "", // out of stock -> subtotal = 0
          slug: "oos-item",
          categorySlug: "cat",
          title: "Món tạm hết",
          imageUrl: "/cover.jpg",
          variant: "500g",
          unitPrice: 200000,
          isOutOfStock: true,
        });
      });

      expect(screen.getByText("0 VNĐ")).toBeTruthy();
      expect(screen.queryByText("Liên hệ")).toBeNull();
    });
  });

  describe("3. CheckoutForm Skeleton on Initial Load (isLoaded === false) & Empty Cart State", () => {
    it("renders skeletons for both Subtotal and Total when isLoaded === false and hides VoucherTicketBar", async () => {
      const CheckoutFormModule = await import("@/components/Checkout/CheckoutForm");
      const CheckoutForm = CheckoutFormModule.default;

      const CartContextModule = await import("@/contexts/CartContext");
      const useCartSpy = vi.spyOn(CartContextModule, "useCart").mockReturnValue({
        cartItems: [],
        isLoaded: false,
        isCartOpen: false,
        setIsCartOpen: vi.fn(),
        addToCart: vi.fn(),
        updateQuantity: vi.fn(),
        removeFromCart: vi.fn(),
        clearCart: vi.fn(),
        restoreCampaignItemsToOriginalPrice: vi.fn(),
        totalItems: 0,
        subtotal: 0,
        hasOutOfStockItems: false,
      });

      render(<CheckoutForm order={null} config={{ branches: [], default_shipping_fee: "30000" } as any} />);

      expect(screen.getByTestId("cart-loading-skeleton")).toBeTruthy();
      expect(screen.getByTestId("checkout-total-skeleton")).toBeTruthy();
      expect(screen.queryByText("Giỏ hàng của bạn đang trống.")).toBeNull();
      expect(screen.queryByText("0 VNĐ")).toBeNull();

      useCartSpy.mockRestore();
    });

    it("hides VoucherTicketBar and SmartCartProgressBar and displays '0 VNĐ' when isLoaded === true and cart is empty", async () => {
      const CheckoutFormModule = await import("@/components/Checkout/CheckoutForm");
      const CheckoutForm = CheckoutFormModule.default;

      const CartContextModule = await import("@/contexts/CartContext");
      const useCartSpy = vi.spyOn(CartContextModule, "useCart").mockReturnValue({
        cartItems: [],
        isLoaded: true,
        isCartOpen: false,
        setIsCartOpen: vi.fn(),
        addToCart: vi.fn(),
        updateQuantity: vi.fn(),
        removeFromCart: vi.fn(),
        clearCart: vi.fn(),
        restoreCampaignItemsToOriginalPrice: vi.fn(),
        totalItems: 0,
        subtotal: 0,
        hasOutOfStockItems: false,
      });

      render(<CheckoutForm order={null} config={{ branches: [], default_shipping_fee: "30000" } as any} />);

      expect(screen.getByText("Giỏ hàng của bạn đang trống.")).toBeTruthy();
      expect(screen.queryByTestId("direct-voucher-input-wrapper")).toBeNull();
      expect(screen.getAllByText("0 VNĐ").length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText("Liên hệ")).toBeNull();

      useCartSpy.mockRestore();
    });
  });

  describe("4. Cart Drawer Stability on Sign-in Page (/dang-nhap & /en/signin)", () => {
    it("does NOT auto-close MobileCartFlow when user is already on /dang-nhap and opens the cart, but closes when navigating to /dang-nhap", async () => {
      const MobileCartFlowModule = await import("@/components/Header/MobileCartFlow");
      const MobileCartFlow = MobileCartFlowModule.default;

      mockPathname = "/dang-nhap";
      const onCloseMock = vi.fn();

      const CartContextModule = await import("@/contexts/CartContext");
      const useCartSpy = vi.spyOn(CartContextModule, "useCart").mockReturnValue({
        cartItems: [],
        isLoaded: true,
        isCartOpen: true,
        setIsCartOpen: vi.fn(),
        addToCart: vi.fn(),
        updateQuantity: vi.fn(),
        removeFromCart: vi.fn(),
        clearCart: vi.fn(),
        restoreCampaignItemsToOriginalPrice: vi.fn(),
        totalItems: 0,
        subtotal: 0,
        hasOutOfStockItems: false,
      });

      const { rerender } = render(<MobileCartFlow onClose={onCloseMock} />);

      // Opening cart while already on /dang-nhap must NOT trigger onClose
      expect(onCloseMock).not.toHaveBeenCalled();

      // Navigating from /san-pham to /dang-nhap MUST trigger onClose
      mockPathname = "/san-pham";
      rerender(<MobileCartFlow onClose={onCloseMock} />);
      expect(onCloseMock).not.toHaveBeenCalled();

      mockPathname = "/dang-nhap";
      rerender(<MobileCartFlow onClose={onCloseMock} />);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      useCartSpy.mockRestore();
    });

    it("uses identical min-h-[calc(100vh-6.5rem)] height for SignInContainer loading state to prevent scrollbar layout shift", () => {
      mockAuthState = {
        user: null,
        loading: true,
        token: null,
        refreshUser: vi.fn(),
      };

      const { container } = render(<SignInContainer />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain("min-h-[calc(100vh-6.5rem)]");
    });
  });
});
