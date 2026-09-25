import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook, act } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import CouponModal, {
  evaluateCampaignEligibility,
  resetCouponModalCache,
  type CartItemProductEligibilityCheck,
} from "@/components/Voucher/CouponModal";
import type { PublicCampaignItem } from "@/types/campaign";
import { getActiveCampaigns } from "@/services/campaignService";
import { getAvailableVouchers, getShippingSettings } from "@/services/orderService";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, any>) => {
    if (key === "no_matching_products_in_cart") return "Chưa có sản phẩm áp dụng trong giỏ hàng";
    if (key === "buy_more_to_activate_buy_x_get_y") return `Cần mua thêm ${values?.count} sản phẩm áp dụng để kích hoạt ưu đãi`;
    if (key === "promo_tag") return "Ưu đãi";
    if (key === "duration") return "Thời gian diễn ra:";
    if (key === "view_terms_detail") return "Chi tiết điều kiện áp dụng ›";
    if (key === "order_already_freeship") return "Đơn hàng đã được Freeship tự động";
    return key;
  },
}));

// Mock routing
vi.mock("@/i18n/routing", () => ({
  usePathname: () => "/checkout",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
  getMemberTier: () => ({ tier: "member" }),
}));

// Mock campaignService & orderService
vi.mock("@/services/campaignService", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    getActiveCampaigns: vi.fn(),
  };
});

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
  };
});

// Setup resilient localStorageMock
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    for (const k of Object.keys(localStorageStore)) {
      delete localStorageStore[k];
    }
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
(global as any).localStorage = localStorageMock;

describe("Campaign Product Eligibility Unit & Component Tests (OpenSpec campaign-cart-product-eligibility)", () => {
  const allOrderCampaign: PublicCampaignItem = {
    id: 1,
    name: "Giảm 10% Toàn Đơn",
    promotion_type: "order_discount",
    discount_type: "percent",
    discount_value: 10,
    min_order_value: 50000,
    applicable_product_ids: [],
    applicable_variant_ids: [],
  };

  const productRestrictedCampaign: PublicCampaignItem = {
    id: 2,
    name: "Giảm 20% cho Cơm Sườn",
    promotion_type: "order_discount",
    discount_type: "percent",
    discount_value: 20,
    min_order_value: 50000,
    applicable_product_ids: [10], // Chỉ áp dụng cho món ID 10
    applicable_variant_ids: [],
  };

  const variantRestrictedCampaign: PublicCampaignItem = {
    id: 4,
    name: "Giảm 15% Cơm Sườn Trứng Ốp La",
    promotion_type: "order_discount",
    discount_type: "percent",
    discount_value: 15,
    min_order_value: 40000,
    applicable_product_ids: [],
    applicable_variant_ids: [101], // Chỉ áp dụng cho biến thể ID 101
  };

  const buyXGetYCampaign: PublicCampaignItem = {
    id: 3,
    name: "Mua 2 Cơm Gà Tặng 1 Trà Đào",
    promotion_type: "buy_x_get_y",
    discount_type: "percent",
    discount_value: 100,
    min_order_value: 0,
    settings: {
      buy_quantity: 2,
      gift_quantity: 1,
    },
    applicable_product_ids: [20], // Mua món ID 20
    applicable_variant_ids: [],
    items: [
      {
        id: 99,
        product_id: 30,
        product_code: "TRA_DAO",
        product_name: "Trà Đào",
        image: "/tra-dao.png",
        original_price: 30000,
        campaign_price: 0,
        is_free: true,
      },
    ],
  };

  const campaignWithItemsFallback: PublicCampaignItem = {
    id: 5,
    name: "Giảm 10% Món Đặc Biệt (Items Fallback)",
    promotion_type: "order_discount",
    discount_type: "percent",
    discount_value: 10,
    min_order_value: 30000,
    applicable_product_ids: undefined,
    applicable_variant_ids: undefined,
    items: [
      {
        id: 1,
        product_id: 50,
        product_code: "SPECIAL_1",
        product_name: "Món Đặc Biệt 1",
        image: "",
        original_price: 60000,
        campaign_price: 54000,
        is_free: false,
      },
    ],
  };

  const orderGiftCampaign: PublicCampaignItem = {
    id: 6,
    name: "Tặng Trà Tắc cho đơn từ 100k",
    promotion_type: "order_gift_discount",
    discount_type: "percent",
    discount_value: 100,
    min_order_value: 100000,
    applicable_product_ids: [],
    applicable_variant_ids: [],
    items: [
      {
        id: 101,
        product_id: 35,
        product_code: "TRA_TAC",
        product_name: "Trà Tắc Khổng Lồ",
        image: "/tra-tac.png",
        original_price: 25000,
        campaign_price: 0,
        is_free: true,
      },
    ],
  };

  const samePriceCampaign: PublicCampaignItem = {
    id: 7,
    name: "Đồng giá 29k Trà Sữa",
    promotion_type: "same_price_discount",
    discount_type: "fixed",
    discount_value: 29000,
    min_order_value: 0,
    applicable_product_ids: [15],
    applicable_variant_ids: [],
  };

  beforeEach(() => {
    resetCouponModalCache();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    vi.clearAllMocks();
    (getActiveCampaigns as any).mockResolvedValue([
      allOrderCampaign,
      productRestrictedCampaign,
      buyXGetYCampaign,
    ]);
    (getAvailableVouchers as any).mockResolvedValue([]);
    (getShippingSettings as any).mockResolvedValue(null);
  });

  describe("5.1: Campaign bị disabled khi giỏ hàng chỉ có sản phẩm không thuộc campaign", () => {
    it("5.1.1: Giỏ hàng chỉ có sản phẩm khác product_id -> eligible: false kèm reason chuẩn", () => {
      const res = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 100000,
        cartItems: [
          { productId: 999, quantity: 2 },
          { productId: 888, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");
    });

    it("5.1.2: Campaign có applicable_variant_ids, giỏ hàng chỉ có variant_id khác -> eligible: false", () => {
      const res = evaluateCampaignEligibility(variantRestrictedCampaign, {
        subtotal: 80000,
        cartItems: [
          { productId: 10, product_variant_id: 102, quantity: 1 },
          { productId: 10, variantId: 103, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");
    });

    it("5.1.3: Giỏ hàng rỗng hoặc không có items -> eligible: false nếu campaign có giới hạn sản phẩm", () => {
      const resEmpty = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 100000,
        cartItems: [],
        isBrowseMode: false,
      });
      expect(resEmpty.eligible).toBe(false);
      expect(resEmpty.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");

      const resUndefined = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 100000,
        cartItems: undefined,
        isBrowseMode: false,
      });
      expect(resUndefined.eligible).toBe(false);
      expect(resUndefined.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");
    });

    it("5.1.4: Campaign sử dụng items fallback (không có applicable_product_ids mảng) -> kiểm tra chuẩn theo items", () => {
      const res = evaluateCampaignEligibility(campaignWithItemsFallback, {
        subtotal: 60000,
        cartItems: [{ productId: 999, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");
    });
  });

  describe("5.2: Campaign hợp lệ khi giỏ hàng hỗn hợp (có cả món thuộc campaign và món không thuộc campaign)", () => {
    it("5.2.1: Giỏ hàng hỗn hợp có món ngoài (ID 999) và món thuộc campaign (ID 10) -> eligible: true", () => {
      const res = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 100000,
        cartItems: [
          { productId: 999, quantity: 2 },
          { productId: 10, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("5.2.2: Campaign theo biến thể: giỏ hàng hỗn hợp có variant 101 hợp lệ -> eligible: true", () => {
      const res = evaluateCampaignEligibility(variantRestrictedCampaign, {
        subtotal: 80000,
        cartItems: [
          { productId: 999, quantity: 1 },
          { productId: 10, variantId: 101, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
    });

    it("5.2.3: Giỏ hàng hỗn hợp có món hợp lệ nhưng chưa đạt min_order_value -> eligible: false vì thiếu tiền", () => {
      const res = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 30000, // min_order_value là 50000
        cartItems: [
          { productId: 999, quantity: 1 },
          { productId: 10, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("Chưa đạt giá trị đơn tối thiểu");
    });

    it("5.2.4: Campaign toàn đơn hàng (applicable_product_ids rỗng) -> luôn hợp lệ với bất kỳ giỏ hàng nào nếu đủ tiền", () => {
      const res = evaluateCampaignEligibility(allOrderCampaign, {
        subtotal: 60000,
        cartItems: [{ productId: 999, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
    });
  });

  describe("5.3: Campaign buy_x_get_y kiểm tra định mức buy_quantity", () => {
    it("5.3.1: Mua thiếu số lượng (buy_quantity: 2, giỏ mới có 1) -> eligible: false kèm câu báo thiếu count", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 50000,
        cartItems: [{ productId: 20, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Cần mua thêm 1 sản phẩm áp dụng để kích hoạt ưu đãi");
    });

    it("5.3.2: buy_quantity: 3, giỏ có 1 -> báo thiếu 2 sản phẩm", () => {
      const campaignBuy3: PublicCampaignItem = {
        ...buyXGetYCampaign,
        settings: { buy_quantity: 3, gift_quantity: 1 },
      };
      const res = evaluateCampaignEligibility(campaignBuy3, {
        subtotal: 80000,
        cartItems: [{ productId: 20, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Cần mua thêm 2 sản phẩm áp dụng để kích hoạt ưu đãi");
    });

    it("5.3.3: buy_quantity: 2, giỏ đạt đúng 2 -> eligible: true", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 100000,
        cartItems: [{ productId: 20, quantity: 2 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
    });

    it("5.3.4: buy_quantity: 2, chia làm 2 dòng cùng product_id với tổng quantity = 2 -> eligible: true", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 100000,
        cartItems: [
          { productId: 20, quantity: 1 },
          { productId: 20, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
    });

    it("5.3.5: buy_x_get_y: Hợp lệ khi giỏ hàng có từ 2 món thường bất kỳ (chưa có món Y) với buy_quantity = 2", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 100000,
        cartItems: [{ productId: 999, quantity: 2 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("5.3.6: buy_x_get_y: Không hợp lệ khi giỏ hàng chỉ có 1 món thường (hiển thị báo mua thêm 1 món)", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 50000,
        cartItems: [{ productId: 999, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Cần mua thêm 1 sản phẩm áp dụng để kích hoạt ưu đãi");
    });
  });

  describe("5.4: Chế độ Browse Mode & Auto-Pruning khi giỏ hàng thay đổi", () => {
    it("5.4.1: Chế độ browse-only (isBrowseMode: true) luôn trả về eligible: true", () => {
      const res = evaluateCampaignEligibility(productRestrictedCampaign, {
        subtotal: 100000,
        cartItems: [{ productId: 999, quantity: 1 }],
        isBrowseMode: true,
      });
      expect(res.eligible).toBe(true);
    });

    it("5.4.2: Auto-pruning: Khi xóa món điều kiện khỏi giỏ hàng, campaign bị loại khỏi selectedCampaignIds", () => {
      const activePromotions = [productRestrictedCampaign, allOrderCampaign];
      let selectedCampaignIds: (number | string)[] = [productRestrictedCampaign.id, allOrderCampaign.id];

      // Giỏ hàng ban đầu: Có cả món 10 và món 999 (hợp lệ cho cả 2 campaign)
      let currentCart: CartItemProductEligibilityCheck[] = [
        { productId: 10, quantity: 1 },
        { productId: 999, quantity: 1 },
      ];
      let currentSubtotal = 100000;

      // Mô phỏng logic auto-prune trong CheckoutForm / MobileCartFlow
      const pruneStaleCampaigns = (
        selectedIds: (number | string)[],
        cart: CartItemProductEligibilityCheck[],
        sub: number
      ) => {
        return selectedIds.filter((id) => {
          const promo = activePromotions.find((p) => String(p.id) === String(id));
          if (!promo) return true;
          const res = evaluateCampaignEligibility(promo, {
            subtotal: sub,
            cartItems: cart,
            isBrowseMode: false,
          });
          return res.eligible;
        });
      };

      // Trước khi xóa: Cả 2 đều hợp lệ
      expect(pruneStaleCampaigns(selectedCampaignIds, currentCart, currentSubtotal)).toEqual([2, 1]);

      // BƯỚC THỰC THI: Khách xóa món 10 khỏi giỏ hàng
      currentCart = [{ productId: 999, quantity: 1 }];
      currentSubtotal = 50000;

      const validCampaignIds = pruneStaleCampaigns(selectedCampaignIds, currentCart, currentSubtotal);

      // KHẲNG ĐỊNH: Campaign ID 2 (áp dụng cho món 10) bị tự động gỡ bỏ (pruned), Campaign ID 1 vẫn được giữ lại
      expect(validCampaignIds).toEqual([1]);
      expect(validCampaignIds.includes(2)).toBe(false);

      // Cập nhật state và localStorage
      selectedCampaignIds = validCampaignIds;
      localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify(validCampaignIds));

      expect(JSON.parse(localStorage.getItem("cothaotomca_selected_campaign_ids") || "[]")).toEqual([1]);
    });

    it("5.4.3: Auto-pruning buy_x_get_y: Khi giảm số lượng món điều kiện xuống dưới buy_quantity, campaign bị gỡ", () => {
      const activePromotions = [buyXGetYCampaign];
      let selectedCampaignIds: (number | string)[] = [buyXGetYCampaign.id];

      const pruneStaleCampaigns = (
        selectedIds: (number | string)[],
        cart: CartItemProductEligibilityCheck[],
        sub: number
      ) => {
        return selectedIds.filter((id) => {
          const promo = activePromotions.find((p) => String(p.id) === String(id));
          if (!promo) return true;
          const res = evaluateCampaignEligibility(promo, {
            subtotal: sub,
            cartItems: cart,
            isBrowseMode: false,
          });
          return res.eligible;
        });
      };

      // Ban đầu mua 2 món ID 20: Đủ điều kiện
      let currentCart: CartItemProductEligibilityCheck[] = [{ productId: 20, quantity: 2 }];
      expect(pruneStaleCampaigns(selectedCampaignIds, currentCart, 60000)).toEqual([3]);

      // Khách giảm số lượng món 20 xuống 1
      currentCart = [{ productId: 20, quantity: 1 }];
      const validCampaignIds = pruneStaleCampaigns(selectedCampaignIds, currentCart, 30000);

      // KHẲNG ĐỊNH: buyXGetYCampaign (ID 3) bị auto-pruned
      expect(validCampaignIds).toEqual([]);
    });

    it("5.4.4: React hook auto-prune lifecycle: Khi cartItems thay đổi trong component re-render, state tự động prune và đồng bộ localStorage", () => {
      const initialCampaigns = [productRestrictedCampaign, allOrderCampaign];
      const { result, rerender } = renderHook(
        ({ cart, sub }: { cart: CartItemProductEligibilityCheck[]; sub: number }) => {
          const [selected, setSelected] = React.useState<(number | string)[]>([2, 1]);
          React.useEffect(() => {
            if (selected.length === 0) return;
            const valid = selected.filter((id) => {
              const promo = initialCampaigns.find((p) => String(p.id) === String(id));
              if (!promo) return true;
              return evaluateCampaignEligibility(promo, {
                subtotal: sub,
                cartItems: cart,
                isBrowseMode: false,
              }).eligible;
            });
            if (valid.length !== selected.length) {
              setSelected(valid);
              localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify(valid));
            }
          }, [selected, cart, sub]);

          return { selected };
        },
        {
          initialProps: {
            cart: [{ productId: 10, quantity: 1 }],
            sub: 100000,
          },
        }
      );

      expect(result.current.selected).toEqual([2, 1]);

      // Re-render khi khách xóa sản phẩm 10 khỏi giỏ hàng (chỉ còn món 999)
      act(() => {
        rerender({
          cart: [{ productId: 999, quantity: 1 }],
          sub: 50000,
        });
      });

      expect(result.current.selected).toEqual([1]);
      expect(JSON.parse(localStorage.getItem("cothaotomca_selected_campaign_ids") || "[]")).toEqual([1]);
    });
  });

  describe("5.5: CouponModal Component Rendering & Accessibility", () => {
    it("5.5.1: Hiển thị trạng thái disabled với aria-disabled='true' và thông báo thiếu sản phẩm", async () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={100000}
          cartItems={[{ productId: 999, quantity: 1 }]}
          isBrowseOnly={false}
        />
      );

      // Đợi danh sách campaign được tải vào modal
      await waitFor(() => {
        expect(screen.getByText("Giảm 20% cho Cơm Sườn")).toBeInTheDocument();
      });

      // Kiểm tra dòng giải thích lý do không áp dụng
      const reasonElements = screen.getAllByText("Chưa có sản phẩm áp dụng trong giỏ hàng");
      expect(reasonElements.length).toBeGreaterThanOrEqual(1);

      // Kiểm tra checkbox bị khóa với aria-disabled="true"
      const disabledCheckbox = screen.getByRole("checkbox", { name: "Giảm 20% cho Cơm Sườn" });
      expect(disabledCheckbox).toHaveAttribute("aria-disabled", "true");
    });

    it("5.5.2: Campaign buy_x_get_y thiếu số lượng hiển thị đúng lý do và checkbox aria-disabled='true'", async () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={50000}
          cartItems={[{ productId: 20, quantity: 1 }]}
          isBrowseOnly={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Mua 2 Cơm Gà Tặng 1 Trà Đào")).toBeInTheDocument();
      });

      expect(screen.getByText("Cần mua thêm 1 sản phẩm áp dụng để kích hoạt ưu đãi")).toBeInTheDocument();

      const disabledCheckbox = screen.getByRole("checkbox", { name: "Mua 2 Cơm Gà Tặng 1 Trà Đào" });
      expect(disabledCheckbox).toHaveAttribute("aria-disabled", "true");
    });

    it("5.5.3: Giỏ hàng hỗn hợp thỏa mãn điều kiện có checkbox khả dụng (aria-disabled='false')", async () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={100000}
          cartItems={[
            { productId: 999, quantity: 1 },
            { productId: 10, quantity: 1 },
          ]}
          isBrowseOnly={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Giảm 20% cho Cơm Sườn")).toBeInTheDocument();
      });

      const enabledCheckbox = screen.getByRole("checkbox", { name: "Giảm 20% cho Cơm Sườn" });
      expect(enabledCheckbox).toHaveAttribute("aria-disabled", "false");
    });

    it("5.5.4: Campaign order_gift_discount hợp lệ và checkbox khả dụng khi đủ subtotal tối thiểu dù giỏ hàng chỉ có món thường", async () => {
      (getActiveCampaigns as any).mockResolvedValue([orderGiftCampaign]);
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={120000}
          cartItems={[{ productId: 999, quantity: 2 }]}
          isBrowseOnly={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Tặng Trà Tắc cho đơn từ 100k")).toBeInTheDocument();
      });

      const enabledCheckbox = screen.getByRole("checkbox", { name: "Tặng Trà Tắc cho đơn từ 100k" });
      expect(enabledCheckbox).toHaveAttribute("aria-disabled", "false");
    });
  });

  describe("5.6: Xử lý Campaign Quà Tặng (order_gift_discount & buy_x_get_y) & Kiểm tra Regression same_price_discount", () => {
    it("5.6.1: order_gift_discount: Hợp lệ khi giỏ hàng chỉ có món thường (chưa có quà) và subtotal >= min_order_value", () => {
      const res = evaluateCampaignEligibility(orderGiftCampaign, {
        subtotal: 120000,
        cartItems: [{ productId: 999, quantity: 2 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("5.6.2: order_gift_discount: Không hợp lệ khi subtotal < min_order_value (hiển thị báo mua thêm tiền)", () => {
      const res = evaluateCampaignEligibility(orderGiftCampaign, {
        subtotal: 70000,
        cartItems: [{ productId: 999, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toContain("Chưa đạt giá trị đơn tối thiểu");
      expect(res.missingAmount).toBe(30000);
    });

    it("5.6.3: buy_x_get_y: Hợp lệ khi giỏ hàng có từ 2 món thường bất kỳ (chưa có món Y) với buy_quantity = 2", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 100000,
        cartItems: [
          { productId: 888, quantity: 1 },
          { productId: 999, quantity: 1 },
        ],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it("5.6.4: buy_x_get_y: Không hợp lệ khi giỏ hàng chỉ có 1 món thường (hiển thị báo mua thêm 1 món)", () => {
      const res = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 40000,
        cartItems: [{ productId: 888, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Cần mua thêm 1 sản phẩm áp dụng để kích hoạt ưu đãi");
    });

    it("5.6.5: same_price_discount: Vẫn bị disabled khi giỏ hàng không có món giảm giá (đảm bảo không bị regression)", () => {
      const res = evaluateCampaignEligibility(samePriceCampaign, {
        subtotal: 100000,
        cartItems: [{ productId: 999, quantity: 3 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(false);
      expect(res.reason).toBe("Chưa có sản phẩm áp dụng trong giỏ hàng");
    });

    it("5.6.6: same_price_discount: Hợp lệ khi giỏ hàng có món giảm giá", () => {
      const res = evaluateCampaignEligibility(samePriceCampaign, {
        subtotal: 100000,
        cartItems: [{ productId: 15, quantity: 1 }],
        isBrowseMode: false,
      });
      expect(res.eligible).toBe(true);
      expect(res.reason).toBeUndefined();
    });
  });
});
