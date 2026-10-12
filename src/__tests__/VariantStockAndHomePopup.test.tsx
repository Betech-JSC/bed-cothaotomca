import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { checkItemOutOfStock, type CartItem } from "@/contexts/CartContext";
import { normalizeProductDetail, mapProductToDetailView, type Product } from "@/services/productService";
import HomePromotionPopup from "@/components/Home/HomePromotionPopup";
import type { Banner } from "@/types/banner";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      do_not_show_today: "Không hiển thị lại hôm nay",
      close: "Đóng",
      view_now: "Xem ngay",
      special_offer: "Ưu đãi đặc biệt",
      "product.out_of_stock": "Tạm hết hàng",
    };
    return dict[key] || key;
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock next-intl routing
vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Variant Stock & Out of Stock Handling", () => {
  const sampleProductsCache = [
    {
      id: 101,
      code: "PROD-101",
      slug: "ca-hoi-sot-chanh-leo",
      name: "Cá Hồi Sốt Chanh Leo",
      variants: [
        {
          id: 1001,
          code: "VAR-ACTIVE",
          size: "Phần Nhỏ",
          price: 120000,
          status: 1,
        },
        {
          id: 1002,
          code: "VAR-DISABLED",
          size: "Phần Lớn",
          price: 220000,
          status: 0,
        },
        {
          id: 1003,
          code: "",
          size: "Phần Gia Đình",
          price: 350000,
          status: 1,
        },
      ],
    },
    {
      id: 202,
      code: "PROD-202",
      slug: "mon-chay",
      name: "Món Chay",
      status: 0,
      variants: [],
    },
  ];

  it("identifies in-stock variant when code exists and status is 1", () => {
    const item: CartItem = {
      id: "ca-hoi-sot-chanh-leo-Phần Nhỏ",
      productId: 101,
      productCode: "VAR-ACTIVE",
      slug: "ca-hoi-sot-chanh-leo",
      categorySlug: "hai-san",
      title: "Cá Hồi Sốt Chanh Leo",
      imageUrl: "/fish.jpg",
      variant: "Phần Nhỏ",
      unitPrice: 120000,
      quantity: 1,
    };

    expect(checkItemOutOfStock(item, sampleProductsCache)).toBe(false);
  });

  it("identifies out-of-stock when variant status is 0", () => {
    const item: CartItem = {
      id: "ca-hoi-sot-chanh-leo-Phần Lớn",
      productId: 101,
      productCode: "VAR-DISABLED",
      slug: "ca-hoi-sot-chanh-leo",
      categorySlug: "hai-san",
      title: "Cá Hồi Sốt Chanh Leo",
      imageUrl: "/fish.jpg",
      variant: "Phần Lớn",
      unitPrice: 220000,
      quantity: 1,
    };

    expect(checkItemOutOfStock(item, sampleProductsCache)).toBe(true);
  });

  it("identifies out-of-stock when variant code is empty or missing", () => {
    const item: CartItem = {
      id: "ca-hoi-sot-chanh-leo-Phần Gia Đình",
      productId: 101,
      productCode: "",
      slug: "ca-hoi-sot-chanh-leo",
      categorySlug: "hai-san",
      title: "Cá Hồi Sốt Chanh Leo",
      imageUrl: "/fish.jpg",
      variant: "Phần Gia Đình",
      unitPrice: 350000,
      quantity: 1,
    };

    expect(checkItemOutOfStock(item, sampleProductsCache)).toBe(true);
  });

  it("identifies out-of-stock when parent product status is 0 and has no variants", () => {
    const item: CartItem = {
      id: "mon-chay-standard",
      productId: 202,
      productCode: "PROD-202",
      slug: "mon-chay",
      categorySlug: "chay",
      title: "Món Chay",
      imageUrl: "/veg.jpg",
      variant: "Tiêu chuẩn",
      unitPrice: 80000,
      quantity: 1,
    };

    expect(checkItemOutOfStock(item, sampleProductsCache)).toBe(true);
  });
});

describe("ProductService Variant Status Mapping", () => {
  const rawProduct: Product = {
    id: 50,
    name: "Tôm Sú Nướng Muối Ớt",
    price: "150000",
    image: "/tom.jpg",
    description: "Món ngon đặc biệt",
    is_best_seller: true,
    ingredients: [],
    translations: [],
    created_at: "2024-01-01",
    variants: [
      {
        id: 501,
        code: "TOM-500G",
        size: "500g",
        price: 150000,
        status: 1,
      },
      {
        id: 502,
        code: "TOM-1KG",
        size: "1kg",
        price: 290000,
        status: 0,
      },
    ],
  };

  it("maps status correctly in normalizeProductDetail", () => {
    const normalized = normalizeProductDetail(rawProduct);
    expect(normalized.variants).toBeDefined();
    expect(normalized.variants![0].status).toBe(1);
    expect(normalized.variants![1].status).toBe(0);
  });

  it("maps status into sizes in mapProductToDetailView", () => {
    const detailView = mapProductToDetailView(rawProduct, "vi", { standard: "Tiêu chuẩn" });
    expect(detailView.sizes).toHaveLength(2);
    expect(detailView.sizes[0].status).toBe(1);
    expect(detailView.sizes[1].status).toBe(0);
  });
});

describe("HomePromotionPopup Component", () => {
  const sampleBanner: Banner = {
    id: 99,
    title: "Đại Tiệc Hải Sản Tháng 10",
    description: "Giảm đến 30% cho hóa đơn từ 500k khi đặt trước qua website.",
    image: "/images/banner-desktop.jpg",
    image_mobile: "/images/banner-mobile.jpg",
    link: "/product/hai-san",
    position: "popup_home",
    status: 1,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllTimers();
  });

  it("renders popup after delay and handles dismissal with checkbox", async () => {
    vi.useFakeTimers();

    render(<HomePromotionPopup banner={sampleBanner} />);

    // Initially popup is closed pending delay
    expect(screen.queryByRole("dialog")).toBeNull();

    // Fast-forward 1.2s delay wrapped in act
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Dialog should now be open
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Đại Tiệc Hải Sản Tháng 10")).toBeTruthy();
    expect(screen.getByText("Xem ngay")).toBeTruthy();

    // Toggle "Không hiển thị lại hôm nay" checkbox
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Click close button
    const closeBtn = screen.getByLabelText(/Đóng/i);
    fireEvent.click(closeBtn);

    // Modal closes
    expect(screen.queryByRole("dialog")).toBeNull();

    // Check localStorage
    const stored = localStorage.getItem("cothao_popup_dismiss_99");
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(Date.now());

    vi.useRealTimers();
  });

  it("does not open if dismissal is already saved in localStorage for today", () => {
    vi.useFakeTimers();

    const endOfDay = Date.now() + 3600000; // 1 hour later today
    localStorage.setItem("cothao_popup_dismiss_99", String(endOfDay));

    render(<HomePromotionPopup banner={sampleBanner} />);

    // Fast-forward delay
    vi.advanceTimersByTime(2000);

    // Dialog must not appear
    expect(screen.queryByRole("dialog")).toBeNull();

    vi.useRealTimers();
  });
});
