import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { checkItemOutOfStock, type CartItem } from "@/contexts/CartContext";
import { normalizeProductDetail, mapProductToDetailView, type Product, type ProductDetailView } from "@/services/productService";
import HomePromotionPopup from "@/components/Home/HomePromotionPopup";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import { formatPrice, formatRichTextContent } from "@/lib/format";
import type { Banner } from "@/types/banner";

// Mock CartContext while preserving checkItemOutOfStock
vi.mock("@/contexts/CartContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/CartContext")>();
  return {
    ...actual,
    useCart: () => ({
      addToCart: vi.fn(),
      setIsCartOpen: vi.fn(),
    }),
  };
});

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      do_not_show_today: "Không hiển thị lại hôm nay",
      close: "Đóng",
      view_now: "Xem ngay",
      special_offer: "Ưu đãi đặc biệt",
      "product.out_of_stock": "Tạm hết hàng",
      "button.add_to_cart_short": "Thêm vào giỏ",
      "button.buy-now": "Mua ngay",
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

describe("ProductDetailsInfo Variant Status (status: 0 vs status: 1)", () => {
  const createProductDetail = (
    sizes: ProductDetailView["sizes"]
  ): ProductDetailView => ({
    title: "Tôm Càng Xanh Hấp Nước Dừa",
    description: "<p>Tôm càng xanh tươi sống</p>",
    variant_type: "size",
    code: "TOM-CANG",
    images: [{ url: "/tom-cang.jpg", alt: "Tôm Càng Xanh" }],
    sizes,
    infos: [],
    category: { title: "Tôm", slug: "tom" },
    checkout: {
      productId: 300,
      productCode: "TOM-CANG",
      slug: "tom-cang-xanh-hap-nuoc-dua",
      categorySlug: "tom",
    },
  });

  it("Scenario 1: disables first out-of-stock variant (status: 0) and auto-selects second in-stock variant (status: 1)", () => {
    const productData = createProductDetail([
      {
        id: 3001,
        code: "TOM-S",
        title: "Size S: 4 con",
        price: 180000,
        status: 0,
      },
      {
        id: 3002,
        code: "TOM-M",
        title: "Size M: 8 con",
        price: 340000,
        status: 1,
      },
    ]);

    render(<ProductDetailsInfo productData={productData} />);

    const sizeSBtn = screen.getByText("Size S: 4 con").closest("div")!;
    const sizeMBtn = screen.getByText("Size M: 8 con").closest("div")!;

    // Variant 1 (Size S: 4 con) is crossed out and not clickable
    expect(sizeSBtn.className).toContain("line-through");
    expect(sizeSBtn.className).toContain("cursor-not-allowed");
    expect(sizeSBtn.className).not.toContain("bg-primary text-yellow");

    // Variant 2 (Size M: 8 con) is auto-selected and shows Size M price
    expect(sizeMBtn.className).toContain("bg-primary text-yellow");
    expect(screen.getByText(formatPrice(340000))).toBeTruthy();
    expect(screen.queryByText(formatPrice(180000))).toBeNull();

    // Clicking out-of-stock Variant 1 does NOT switch selection
    fireEvent.click(sizeSBtn);
    expect(sizeMBtn.className).toContain("bg-primary text-yellow");
    expect(screen.getByText(formatPrice(340000))).toBeTruthy();

    // "Thêm vào giỏ" button is visible to buy Size M
    expect(screen.getByText("Thêm vào giỏ")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tạm hết hàng" })).toBeNull();
  });

  it("Scenario 2: disables all variant buttons and shows disabled 'Tạm hết hàng' button when all variants have status: 0", () => {
    const productData = createProductDetail([
      {
        id: 3001,
        code: "TOM-S",
        title: "Size S: 4 con",
        price: 180000,
        status: 0,
      },
      {
        id: 3002,
        code: "TOM-M",
        title: "Size M: 8 con",
        price: 340000,
        status: 0,
      },
    ]);

    render(<ProductDetailsInfo productData={productData} />);

    const sizeSBtn = screen.getByText("Size S: 4 con").closest("div")!;
    const sizeMBtn = screen.getByText("Size M: 8 con").closest("div")!;

    // Both variant buttons have disabled styling and neither has active selection class
    for (const btn of [sizeSBtn, sizeMBtn]) {
      expect(btn.className).toContain("line-through opacity-40 bg-gray-100 text-gray-400 cursor-not-allowed");
      expect(btn.className).not.toContain("bg-primary text-yellow");
    }

    // "Thêm vào giỏ" and "Mua ngay" buttons do not appear
    expect(screen.queryByText("Thêm vào giỏ")).toBeNull();
    expect(screen.queryByText("Mua ngay")).toBeNull();

    // "Tạm hết hàng" button is rendered and disabled
    const outOfStockBtn = screen.getByRole("button", { name: "Tạm hết hàng" }) as HTMLButtonElement;
    expect(outOfStockBtn).toBeTruthy();
    expect(outOfStockBtn.disabled).toBe(true);
  });
});

describe("formatRichTextContent Typography & Justification Sanitization", () => {
  it("1. normalizes &nbsp;, &#160;, &#xa0;, and \\u00A0 into regular spaces ' '", () => {
    const rawHtml = "<p>Tôm&nbsp;càng&#160;xanh&#xa0;hấp\u00A0nước&NBSP;dừa</p>";
    const result = formatRichTextContent(rawHtml);

    expect(result).toBe("<p>Tôm càng xanh hấp nước dừa</p>");
    expect(result).not.toMatch(/&nbsp;|&#160;|&#xa0;|\u00A0/i);
  });

  it("2. removes text-align: justify styles, align='justify', and justify classes on <p>, <h2>, and <li>", () => {
    const rawHtml = [
      '<p style="text-align: justify;">Đoạn văn 1</p>',
      '<h2 align="justify" style="color: red; text-align: justify;">Tiêu đề H2</h2>',
      '<li class="text-justify ql-align-justify" align=\'justify\'>Mục danh sách 1</li>',
      '<p class="lead text-justify ql-align-justify font-bold">Đoạn văn 2</p>',
    ].join("");

    const result = formatRichTextContent(rawHtml);

    expect(result).toContain("<p>Đoạn văn 1</p>");
    expect(result).toContain('<h2 style="color: red;">Tiêu đề H2</h2>');
    expect(result).toContain("<li>Mục danh sách 1</li>");
    expect(result).toContain('<p class="lead font-bold">Đoạn văn 2</p>');
    expect(result).not.toContain("text-align: justify");
    expect(result).not.toContain('align="justify"');
    expect(result).not.toContain("text-justify");
    expect(result).not.toContain("ql-align-justify");
  });

  it("3. preserves intentional style='text-align: center;'", () => {
    const rawHtml = '<p style="text-align: center;">Văn bản căn giữa chủ đích</p>';
    const result = formatRichTextContent(rawHtml);

    expect(result).toBe('<p style="text-align: center;">Văn bản căn giữa chủ đích</p>');
  });
});
