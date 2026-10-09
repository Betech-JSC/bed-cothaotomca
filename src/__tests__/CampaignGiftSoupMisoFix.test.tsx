import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CouponModal, { evaluateCampaignEligibility } from "@/components/Voucher/CouponModal";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import { PublicCampaignItem } from "@/types/campaign";
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
  mockCreateOrder: vi.fn().mockResolvedValue({ data: { order_code: "ORD-TEST-99" } }),
}));

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createOrder: mockCreateOrder,
    getCheckoutConfig: vi.fn().mockResolvedValue({
      delivery_types: [
        { value: "delivery", label: "Giao hàng" },
        { value: "pickup", label: "Tự đến lấy" },
      ],
      operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
      default_shipping_fee: "30000",
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Đường ABC", isActive: true }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
      active_promotions: [],
    }),
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

// Mock campaignService
const mockMisoCampaign: PublicCampaignItem = {
  id: 301,
  name: "[TẶNG SÚP MISO]",
  banner: "/storage/campaigns/broken-banner-404.jpg",
  promotion_type: "order_gift_discount",
  discount_type: "fixed",
  discount_value: 0,
  min_order_value: 100000,
  can_combine_with_promotions: true,
  can_combine_with_freeship: true,
  items: [
    {
      id: 88,
      product_id: 88,
      product_name: "Banchan (Súp miso)",
      product_code: "MISO-01",
      image: "/storage/products/soup-miso.jpg",
      original_price: 35000,
      campaign_price: 0,
      is_free: true,
      is_available: true,
    },
  ],
};

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve([mockMisoCampaign])),
}));

describe("Campaign Gift [TẶNG SÚP MISO] & Banner Image Fallback Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCartItems = [
      {
        productId: 10,
        productCode: "FOOD1",
        title: "Cơm thố bò",
        unitPrice: 150000,
        quantity: 1,
      },
    ];
  });

  it("1. CouponModal fallback gracefully: tries banner, falls back to item image, then fallback badge on image error", async () => {
    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        campaigns={[mockMisoCampaign]}
        appliedCampaignIds={[]}
      />
    );

    const title = await screen.findByText("[TẶNG SÚP MISO]");
    expect(title).toBeInTheDocument();

    // Check image element rendered with alt text
    const img = screen.getByAltText("[TẶNG SÚP MISO]");
    expect(img).toBeInTheDocument();

    // Trigger onError on the image to simulate 404 on banner
    fireEvent.error(img);

    // It should now try item image: /storage/products/soup-miso.jpg
    await waitFor(() => {
      const updatedImg = screen.getByAltText("[TẶNG SÚP MISO]");
      expect(updatedImg.getAttribute("src")).toContain("soup-miso.jpg");
    });

    // If item image also errors:
    const itemImg = screen.getByAltText("[TẶNG SÚP MISO]");
    fireEvent.error(itemImg);

    // Should render the fallback SVG icon and badge without broken image
    await waitFor(() => {
      expect(screen.queryByAltText("[TẶNG SÚP MISO]")).toBeNull();
      expect(screen.getAllByText(/ưu đãi/i).length).toBeGreaterThan(0);
    });
  });

  it("2. When applying [TẶNG SÚP MISO] in MobileCartFlow, campaign stays selected and gift product renders in cart", async () => {
    localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([301]));

    render(<MobileCartFlow inline={false} />);

    // VoucherTicketBar displays the applied campaign badge
    await waitFor(() => {
      expect(screen.getByText("[TẶNG SÚP MISO]")).toBeInTheDocument();
    });

    // Cart items list shows the free gift item cleanly without redundant badges
    expect(screen.getByText("Banchan (Súp miso)")).toBeInTheDocument();
    expect(screen.getByText("0đ")).toBeInTheDocument();

    // Gift image rendered with formatImageUrl and unoptimized
    const giftImg = screen.getByAltText("Banchan (Súp miso)");
    expect(giftImg).toBeInTheDocument();
    expect(giftImg.getAttribute("src")).toContain("soup-miso.jpg");
  });

  it("3. When applying [TẶNG SÚP MISO] in CheckoutForm, gift product renders in summary with 0đ and clean title without redundant badges", async () => {
    localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([301]));

    const mockConfig: any = {
      default_shipping_fee: "30000",
      branches: [{ id: 1, branchName: "Chi nhánh 1", address: "123 Đường ABC", isActive: true }],
      delivery_types: [{ value: "delivery", label: "Giao hàng" }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
      active_promotions: [],
    };

    render(<CheckoutForm order={null} config={mockConfig} />);

    // In CheckoutForm summary column, the gift item appears cleanly
    await waitFor(() => {
      expect(screen.getByText("Banchan (Súp miso)")).toBeInTheDocument();
    });

    expect(screen.queryByText("[Quà tặng đơn hàng]")).not.toBeInTheDocument();
    expect(screen.getByText("0đ")).toBeInTheDocument();

    // Gift image rendered
    const giftImg = screen.getByAltText("Banchan (Súp miso)");
    expect(giftImg).toBeInTheDocument();
    expect(giftImg.getAttribute("src")).toContain("soup-miso.jpg");
  });

  it("4. evaluateCampaignEligibility: correctly matches variant trigger item when cart item has productId = 1146 and variant = 'Set 2 (Cơm gạo Nhật)'", () => {
    const campaignWithVariantTrigger: PublicCampaignItem = {
      id: 501,
      name: "[TẶNG KÈM SET 2] Mua Set 2 tặng tráng miệng",
      promotion_type: "order_gift_discount",
      discount_type: "fixed",
      discount_value: 0,
      min_order_value: 0,
      items: [
        {
          id: 99,
          product_id: 99,
          product_name: "Tráng miệng",
          product_code: "DESSERT-01",
          image: "/dessert.jpg",
          original_price: 25000,
          campaign_price: 0,
          is_free: true,
          is_available: true,
        },
      ],
      settings: {
        buy_quantity: 1,
        trigger_items: [
          {
            product_id: 80,
            product_variant_id: 1146,
            variant_name: "Set 2 (Cơm gạo Nhật)",
          },
        ],
      },
    };

    // Case 4.1: Cart item has productId = 1146 (the variant ID), variant = "Set 2 (Cơm gạo Nhật)"
    const result1 = evaluateCampaignEligibility(campaignWithVariantTrigger, {
      subtotal: 200000,
      cartItems: [
        {
          productId: 1146,
          variant: "Set 2 (Cơm gạo Nhật)",
          quantity: 2,
        },
      ],
    });
    expect(result1.eligible).toBe(true);

    // Case 4.2: Trigger item does not specify variant_name, only product_id: 80 and product_variant_id: 1146
    const campaignNumericVariantTrigger: PublicCampaignItem = {
      ...campaignWithVariantTrigger,
      settings: {
        buy_quantity: 1,
        trigger_items: [{ product_id: 80, product_variant_id: 1146 }],
      },
    };
    const result2 = evaluateCampaignEligibility(campaignNumericVariantTrigger, {
      subtotal: 200000,
      cartItems: [
        {
          productId: 1146,
          variant: "Set 2 (Cơm gạo Nhật)",
          quantity: 1,
        },
      ],
    });
    expect(result2.eligible).toBe(true);

    // Case 4.3: Cart item has parent productId = 80 and variant = "Set 2 (Cơm gạo Nhật)"
    const result3 = evaluateCampaignEligibility(campaignWithVariantTrigger, {
      subtotal: 200000,
      cartItems: [
        {
          productId: 80,
          variant: "Set 2 (Cơm gạo Nhật)",
          quantity: 1,
        },
      ],
    });
    expect(result3.eligible).toBe(true);

    // Case 4.4: Cart item has full properties from updated handleAddToCart (variantId, product_variant_id, parentProductId)
    const result4 = evaluateCampaignEligibility(campaignWithVariantTrigger, {
      subtotal: 200000,
      cartItems: [
        {
          productId: 1146,
          variantId: 1146,
          product_variant_id: 1146,
          parentProductId: 80,
          variant: "Set 2 (Cơm gạo Nhật)",
          quantity: 1,
        },
      ],
    });
    expect(result4.eligible).toBe(true);

    // Case 4.5: Unrelated product in cart does not trigger eligibility
    const result5 = evaluateCampaignEligibility(campaignWithVariantTrigger, {
      subtotal: 200000,
      cartItems: [
        {
          productId: 999,
          variant: "Món khác",
          quantity: 2,
        },
      ],
    });
    expect(result5.eligible).toBe(false);
    expect(result5.reason).toMatch(/Cần mua thêm \d+ sản phẩm áp dụng/);

    // Case 4.6: Cart item with KiotViet ID (3516704) and productCode ('S2') matches trigger
    const campaignWithKiotvietItem: PublicCampaignItem = {
      ...campaignWithVariantTrigger,
      settings: {
        buy_quantity: 1,
        trigger_items: [{ product_id: 80, product_variant_id: 1146 }],
      },
      items: [
        {
          id: 7,
          product_id: 80,
          product_variant_id: 1146,
          product_code: "S2",
          kiotviet_id: 3516704,
          product_name: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương (Set 2 (Cơm gạo Nhật))",
          image: "/set2.jpg",
          original_price: 159000,
          campaign_price: 159000,
          is_free: false,
        },
        ...(campaignWithVariantTrigger.items || []),
      ],
    };

    const result6 = evaluateCampaignEligibility(campaignWithKiotvietItem, {
      subtotal: 318000,
      cartItems: [
        {
          productId: 3516704,
          productCode: "S2",
          title: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
          variant: "Set 2 (Cơm gạo Nhật)",
          quantity: 2,
        },
      ],
    });
    expect(result6.eligible).toBe(true);
  });

  it("5. CouponModal renders without 'Cần mua thêm 1 sản phẩm áp dụng để kích hoạt ưu đãi' when cart has Set 2 variant", async () => {
    const buyXGetYSet2Campaign: PublicCampaignItem = {
      id: 502,
      name: "[ƯU ĐÃI SET 2] Mua 1 Set 2 tặng Coca",
      promotion_type: "buy_x_get_y",
      discount_type: "fixed",
      discount_value: 0,
      min_order_value: 0,
      items: [
        {
          id: 77,
          product_id: 77,
          product_name: "Coca Cola",
          product_code: "COCA-01",
          image: "/coca.jpg",
          original_price: 15000,
          campaign_price: 0,
          is_free: true,
          is_available: true,
        },
      ],
      settings: {
        buy_quantity: 1,
        trigger_items: [
          {
            product_id: 80,
            product_variant_id: 1146,
            variant_name: "Set 2 (Cơm gạo Nhật)",
          },
        ],
      },
    };

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        campaigns={[buyXGetYSet2Campaign]}
        appliedCampaignIds={[]}
        cartItems={[
          {
            productId: 1146,
            variant: "Set 2 (Cơm gạo Nhật)",
            quantity: 2,
          },
        ]}
      />
    );

    const title = await screen.findByText("[ƯU ĐÃI SET 2] Mua 1 Set 2 tặng Coca");
    expect(title).toBeInTheDocument();

    // Verify it is eligible and NOT displaying warning "Cần mua thêm ... sản phẩm áp dụng để kích hoạt ưu đãi"
    expect(screen.queryByText(/Cần mua thêm \d+ sản phẩm áp dụng để kích hoạt ưu đãi/i)).not.toBeInTheDocument();
  });

  it("6. evaluateCampaignEligibility: correctly matches trigger item using kiotviet_id and product_code from campaign items (live cart simulation)", () => {
    const liveCampaign4: PublicCampaignItem = {
      id: 4,
      name: "[TẶNG SÚP MISO] Khi mua Set Cơm Bất Kỳ",
      promotion_type: "order_gift_discount",
      discount_type: "fixed",
      discount_value: 0,
      min_order_value: 0,
      settings: {
        buy_quantity: 1,
        trigger_items: [{ product_id: 80, product_variant_id: 1146 }],
      },
      items: [
        {
          id: 7,
          product_id: 80,
          product_variant_id: 1146,
          product_code: "S2",
          kiotviet_id: 3516704,
          product_name: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương (Set 2 (Cơm gạo Nhật))",
          image: "/images/set2.jpg",
          original_price: 159000,
          campaign_price: 159000,
          is_free: false,
        },
        {
          id: 99,
          product_id: 99,
          product_name: "Súp Miso Rong Biển",
          product_code: "MISO-01",
          image: "/images/miso.jpg",
          original_price: 35000,
          campaign_price: 0,
          is_free: true,
          is_available: true,
        },
      ],
    };

    const liveCartItem = {
      productId: 3516704,
      productCode: "S2",
      title: "[TẶNG SÚP] Set Cơm Cá Hồi, Trứng Lòng Đào Ngâm Tương",
      variant: "Set 2 (Cơm gạo Nhật)",
      quantity: 2,
    };

    const result = evaluateCampaignEligibility(liveCampaign4, {
      subtotal: 318000,
      cartItems: [liveCartItem],
    });

    expect(result.eligible).toBe(true);
  });
});
