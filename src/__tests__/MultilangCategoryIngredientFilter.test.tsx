import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProductIndexPage from "@/components/Product/ProductIndexPage";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  findCategory,
  translateCategorySlug,
  translateIngredientSlug,
  getCategoryCandidateSlugs,
  getIngredientAliases,
} from "@/lib/productHelper";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockPrefetch = vi.fn();
let mockLocale = "en";
let mockPathname = "/product";
let mockParams: Record<string, any> = {};

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  usePathname: () => mockPathname,
  redirect: vi.fn(),
  Link: ({ children, href }: any) => <a href={typeof href === "string" ? href : href?.pathname}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => mockLocale,
}));

vi.mock("next/image", () => ({
  default: ({ fill, ...props }: any) => <img {...props} alt={props.alt || ""} />,
}));

vi.mock("@/components/Card/CardProduct", () => ({
  default: ({ item }: any) => <div data-testid="card-product">{item?.title}</div>,
}));

vi.mock("@/components/Animated/animated-appear", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

describe("Multilang Category Routing & Ingredient Filter Sync (STT 24 & STT 25)", () => {
  const sampleCategories: any[] = [
    {
      id: 1,
      title: "Shrimp",
      slug: "tom",
      original_slug: "tom",
      vi_title: "Tôm",
      en_title: "Shrimp",
      translations: [],
    },
    {
      id: 2,
      title: "Fish & Seafood",
      slug: "ca-hai-san",
      original_slug: "ca-hai-san",
      vi_title: "Cá & Hải sản",
      en_title: "Fish & Seafood",
      translations: [],
    },
  ];

  const sampleIngredients: any[] = [
    {
      id: 10,
      name: "Salmon",
      original_slug: "ca-hoi",
      vi_title: "Cá hồi",
      en_title: "Salmon",
      name_vi: "Cá hồi",
      name_en: "Salmon",
      translations: [],
    },
    {
      id: 11,
      name: "Shrimp",
      original_slug: "tom",
      vi_title: "Tôm",
      en_title: "Shrimp",
      name_vi: "Tôm",
      name_en: "Shrimp",
      translations: [],
    },
  ];

  const sampleProducts: any[] = [
    {
      id: 101,
      name: "Soy Marinated Shrimp & Salmon",
      slug: "soy-marinated-shrimp-salmon",
      price: 250000,
      categories: [sampleCategories[0]],
      ingredients: [sampleIngredients[0], sampleIngredients[1]],
      translations: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = "en";
    mockPathname = "/product";
    mockParams = {};
  });

  it("STT 24: findCategory matches both Vietnamese DB slug ('tom') and English slug ('shrimp')", () => {
    const byEn = findCategory(sampleCategories as any, "shrimp", "en");
    const byVi = findCategory(sampleCategories as any, "tom", "en");
    const bySeafood = findCategory(sampleCategories as any, "fish-seafood", "en");

    expect(byEn?.id).toBe(1);
    expect(byVi?.id).toBe(1);
    expect(bySeafood?.id).toBe(2);
    expect(getCategoryCandidateSlugs(sampleCategories[0])).toEqual(
      expect.arrayContaining(["tom", "shrimp"])
    );
  });

  it("STT 24: ProductIndexPage in EN highlights active 'Shrimp' category and keeps '/en/product/shrimp' when filtering ingredients", () => {
    render(
      <ProductIndexPage
        category="shrimp"
        selectedIngredients={[]}
        products={sampleProducts as any}
        categories={sampleCategories as any}
        ingredients={sampleIngredients as any}
        locale="en"
        pagination={{ currentPage: 1, lastPage: 1, total: 1 }}
      />
    );

    // Product is displayed under 'shrimp' category
    expect(screen.getByText("Soy Marinated Shrimp & Salmon")).toBeDefined();

    // Click 'Salmon' ingredient checkbox
    const salmonButtons = screen.getAllByText("Salmon");
    fireEvent.click(salmonButtons[0]);

    expect(mockPush).toHaveBeenCalledWith(
      {
        pathname: "/product/[category]",
        params: { category: "shrimp" },
        query: { ingredients: "salmon" },
      },
      { scroll: false }
    );
  });

  it("STT 25: ProductIndexPage normalizes '?ingredients=ca-hoi' in EN to 'salmon' and never duplicates 'ca-hoi,salmon'", () => {
    render(
      <ProductIndexPage
        category={null}
        selectedIngredients={["ca-hoi"]}
        products={sampleProducts as any}
        categories={sampleCategories as any}
        ingredients={sampleIngredients as any}
        locale="en"
        pagination={{ currentPage: 1, lastPage: 1, total: 1 }}
      />
    );

    // Automatically replaces URL with canonical 'salmon'
    expect(mockReplace).toHaveBeenCalledWith(
      {
        pathname: "/product",
        query: { ingredients: "salmon" },
      },
      { scroll: false }
    );

    // Product with Salmon is still matched and displayed
    expect(screen.getByText("Soy Marinated Shrimp & Salmon")).toBeDefined();

    // Clicking 'Salmon' unchecks it (since 'ca-hoi' === 'salmon' is already selected), never producing 'ca-hoi,salmon'
    const salmonButtons = screen.getAllByText("Salmon");
    fireEvent.click(salmonButtons[0]);

    expect(mockPush).toHaveBeenCalledWith(
      {
        pathname: "/product",
        query: {},
      },
      { scroll: false }
    );
  });

  it("STT 25: ProductIndexPage deduplicates '?ingredients=ca-hoi,salmon' into single canonical slug", () => {
    render(
      <ProductIndexPage
        category={null}
        selectedIngredients={["ca-hoi", "salmon"]}
        products={sampleProducts as any}
        categories={sampleCategories as any}
        ingredients={sampleIngredients as any}
        locale="en"
        pagination={{ currentPage: 1, lastPage: 1, total: 1 }}
      />
    );

    expect(mockReplace).toHaveBeenCalledWith(
      {
        pathname: "/product",
        query: { ingredients: "salmon" },
      },
      { scroll: false }
    );
  });

  it("STT 25: LanguageSwitcher translates and deduplicates '?ingredients=ca-hoi' -> 'salmon' when switching VI -> EN", () => {
    mockLocale = "vi";
    mockPathname = "/product";
    window.history.pushState({}, "", "/san-pham?ingredients=ca-hoi,salmon");

    render(<LanguageSwitcher />);

    const enBtn = screen.getByLabelText("Switch to English");
    fireEvent.click(enBtn);

    expect(mockReplace).toHaveBeenCalledWith(
      {
        pathname: "/product",
        params: {},
        query: { ingredients: "salmon" },
      },
      { locale: "en", scroll: false }
    );

    expect(translateIngredientSlug("ca-hoi", "en")).toBe("salmon");
    expect(translateIngredientSlug("salmon", "vi")).toBe("ca-hoi");
    expect(translateCategorySlug("tom", "en")).toBe("shrimp");
    expect(translateCategorySlug("shrimp", "vi")).toBe("tom");
    expect(getIngredientAliases(sampleIngredients[0])).toEqual(
      expect.arrayContaining(["ca-hoi", "salmon"])
    );
  });
});
