import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  AlternateLinksProvider,
  useAlternateLinks,
} from "@/contexts/AlternateLinksContext";
import AlternateLinksUpdater from "@/components/SEO/AlternateLinksUpdater";
import { getProductLocalizedSlugs } from "@/lib/productHelper";
import viLocale from "@/i18n/locales/vi.json";
import enLocale from "@/i18n/locales/en.json";

// Mock router navigation
const mockReplace = vi.fn();
let currentLocale = "vi";

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string, values?: any) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split(".");
      let current: any = currentLocale === "vi" ? viLocale : enLocale;
      for (const p of parts) {
        if (current && typeof current === "object" && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      let str = typeof current === "string" ? current : key;
      if (values && typeof str === "string") {
        Object.keys(values).forEach((k) => {
          str = str.replace(`{${k}}`, String(values[k]));
        });
      }
      return str;
    };
    const t: any = (key: string, values?: any) => resolveKey(key, values);
    return t;
  },
}));

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => "/product/[category]/[slug]",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({
    category: "do-uong",
    slug: "sua-gao",
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Phase 3 Frontend Tests (CMS, Multilingual, SEO & A11y)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "vi";
  });

  describe("1. Product Slug & Translation Mapping (Task 2 / STT 20)", () => {
    it("extracts correct localized slugs for both Vietnamese and English", () => {
      const mockProduct = {
        id: 1,
        name: "Sữa Gạo Rang",
        slug: "sua-gao-rang",
        category: {
          id: 10,
          title: "Đồ Uống",
          slug: "do-uong",
          translations: [
            { locale: "vi", title: "Đồ Uống" },
            { locale: "en", title: "Beverages", slug: "beverages" },
          ],
        },
        translations: [
          {
            id: 101,
            locale: "vi",
            name: "Sữa Gạo Rang",
            slug: "sua-gao-rang",
          },
          {
            id: 102,
            locale: "en",
            name: "Roasted Rice Milk",
            slug: "roasted-rice-milk",
          },
        ],
      };

      const slugs = getProductLocalizedSlugs(mockProduct);
      expect(slugs.viCatSlug).toBe("do-uong");
      expect(slugs.viProductSlug).toBe("sua-gao-rang");
      expect(slugs.enCatSlug).toBe("beverages");
      expect(slugs.enProductSlug).toBe("roasted-rice-milk");
    });

    it("LanguageSwitcher switches to mapped alternate slug when available", () => {
      const TestContainer = () => {
        return (
          <AlternateLinksProvider>
            <AlternateLinksUpdater
              links={{
                vi: {
                  category: "do-uong",
                  slug: "sua-gao-rang",
                  pathname: "/product/[category]/[slug]",
                },
                en: {
                  category: "beverages",
                  slug: "roasted-rice-milk",
                  pathname: "/product/[category]/[slug]",
                },
              }}
            />
            <LanguageSwitcher />
          </AlternateLinksProvider>
        );
      };

      render(<TestContainer />);

      // Find the English switch button on desktop
      const enButton = screen.getByLabelText("Switch to English");
      expect(enButton).toBeInTheDocument();

      fireEvent.click(enButton);

      expect(mockReplace).toHaveBeenCalledWith(
        {
          pathname: "/product/[category]/[slug]",
          params: {
            category: "beverages",
            slug: "roasted-rice-milk",
          },
          query: undefined,
        },
        { locale: "en", scroll: false }
      );
    });
  });

  describe("2. Security Headers Configuration (Task 9.2 / STT 52)", () => {
    it("next.config.js includes essential security headers", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const configPath = path.resolve(process.cwd(), "next.config.js");
      const configContent = fs.readFileSync(configPath, "utf-8");

      expect(configContent).toContain("X-Frame-Options");
      expect(configContent).toContain("SAMEORIGIN");
      expect(configContent).toContain("Content-Security-Policy");
      expect(configContent).toContain("frame-ancestors 'self'");
      expect(configContent).toContain("X-Content-Type-Options");
      expect(configContent).toContain("nosniff");
      expect(configContent).toContain("Referrer-Policy");
      expect(configContent).toContain("strict-origin-when-cross-origin");
      expect(configContent).toContain("source: '/:path*'");
    });
  });

  describe("3. Accessibility & A11y Labels (Task 6 / STT 51)", () => {
    it("contains translated navigation and action labels in vi.json and en.json", () => {
      // vi.json checks
      expect(viLocale.common.account).toBe("Tài khoản");
      expect(viLocale.common.open_menu).toBe("Mở menu");
      expect(viLocale.common.close_menu).toBe("Đóng menu");
      expect(viLocale.common.previous_page).toBe("Trang trước");
      expect(viLocale.common.next_page).toBe("Trang sau");
      expect(viLocale.cart.decrease_quantity).toBe("Giảm số lượng");
      expect(viLocale.cart.increase_quantity).toBe("Tăng số lượng");

      // en.json checks
      expect(enLocale.common.account).toBe("Account");
      expect(enLocale.common.open_menu).toBe("Open menu");
      expect(enLocale.common.close_menu).toBe("Close menu");
      expect(enLocale.common.previous_page).toBe("Previous page");
      expect(enLocale.common.next_page).toBe("Next page");
      expect(enLocale.cart.decrease_quantity).toBe("Decrease quantity");
      expect(enLocale.cart.increase_quantity).toBe("Increase quantity");
    });
  });
});
