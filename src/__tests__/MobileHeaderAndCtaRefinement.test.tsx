import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Header from "@/components/Header";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import viLocale from "@/i18n/locales/vi.json";
import enLocale from "@/i18n/locales/en.json";

// Mocks
const mockReplace = vi.fn();
let currentLocale = "vi";

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("next-intl", () => ({
  useLocale: () => currentLocale,
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
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
      return typeof current === "string" ? current : key;
    };
    const t: any = (key: string) => resolveKey(key);
    return t;
  },
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => "/products/kho-ca-bong",
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => "/products/kho-ca-bong",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "kho-ca-bong" }),
  useSearchParams: () => new URLSearchParams("ref=facebook"),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cart: [],
    totalItems: 2,
    totalPrice: 200000,
    addToCart: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
  }),
}));

vi.mock("@/hooks/useSearchSuggestions", () => ({
  useSearchSuggestions: () => ({
    productSuggestions: [],
    blogSuggestions: [],
    policySuggestions: [],
    isLoading: false,
    clearSuggestions: vi.fn(),
  }),
}));

vi.mock("@/components/Logo", () => ({
  default: () => <div data-testid="mock-logo">Logo</div>,
}));

vi.mock("@/components/Icons/Search", () => ({
  default: () => <div data-testid="mock-search-icon">SearchIcon</div>,
}));

vi.mock("@/components/Icons/UserCircle", () => ({
  default: () => <div data-testid="mock-user-circle">UserCircle</div>,
}));

vi.mock("@/components/Icons/Cart", () => ({
  default: () => <div data-testid="mock-cart-icon">CartIcon</div>,
}));

vi.mock("@/components/Icons/Hotline", () => ({
  default: () => <div data-testid="mock-hotline-icon">Hotline</div>,
}));

vi.mock("@/components/Header/MobileCartFlow", () => ({
  default: () => <div data-testid="mock-mobile-cart-flow">MobileCartFlow</div>,
}));

vi.mock("@/components/Header/CartPopup", () => ({
  default: () => <div data-testid="mock-cart-popup">CartPopup</div>,
}));

vi.mock("@/components/Header/SearchSuggestions", () => ({
  default: () => <div data-testid="mock-search-suggestions">SearchSuggestions</div>,
}));

vi.mock("@/components/Product/ProductInfoAccordion", () => ({
  default: () => <div data-testid="mock-product-accordion">ProductInfoAccordion</div>,
}));

vi.mock("@/components/SocialShare", () => ({
  default: () => <div data-testid="mock-social-share">SocialShare</div>,
}));

describe("Mobile Header, Navigation & CTA Refinement Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = "vi";
  });

  describe("Group 1: Hamburger Menu Morphing Animation (Header)", () => {
    it("renders hamburger toggle button with relative h-6 w-6 container and initial 3 bars", () => {
      render(<Header />);
      const toggleBtn = screen.getByRole("button", { name: /open menu/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

      // Verify container is relative h-6 w-6
      const iconContainer = toggleBtn.querySelector(".relative.h-6.w-6");
      expect(iconContainer).toBeInTheDocument();

      // Verify initial bars classes
      const bars = iconContainer?.querySelectorAll("span");
      expect(bars?.length).toBe(3);

      const topBar = bars?.[0];
      const middleBar = bars?.[1];
      const bottomBar = bars?.[2];

      expect(topBar?.className).toContain("top-[3px]");
      expect(topBar?.className).toContain("translate-y-0 rotate-0");
      expect(topBar?.className).toContain("transition-all duration-300 ease-in-out");

      expect(middleBar?.className).toContain("scale-x-100 opacity-100");
      expect(middleBar?.className).toContain("transition-all duration-300 ease-in-out");

      expect(bottomBar?.className).toContain("bottom-[3px]");
      expect(bottomBar?.className).toContain("translate-y-0 rotate-0");
      expect(bottomBar?.className).toContain("transition-all duration-300 ease-in-out");
    });

    it("morphs smoothly into 'X' on click with scale-x-0 opacity-0 on middle bar and ±45deg on outer bars", () => {
      render(<Header />);
      const toggleBtn = screen.getByRole("button", { name: /open menu/i });

      // Click to open menu
      fireEvent.click(toggleBtn);

      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      expect(toggleBtn).toHaveAccessibleName(/close menu/i);

      const iconContainer = toggleBtn.querySelector(".relative.h-6.w-6");
      const bars = iconContainer?.querySelectorAll("span");

      const topBar = bars?.[0];
      const middleBar = bars?.[1];
      const bottomBar = bars?.[2];

      // Top bar translates down into center and rotates 45deg
      expect(topBar?.className).toContain("translate-y-2 rotate-45");
      // Middle bar shrinks horizontally and fades out completely (no lingering floating line)
      expect(middleBar?.className).toContain("scale-x-0 opacity-0");
      // Bottom bar translates up into center and rotates -45deg
      expect(bottomBar?.className).toContain("-translate-y-2 -rotate-45");

      // Click again to close menu
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      expect(topBar?.className).toContain("translate-y-0 rotate-0");
      expect(middleBar?.className).toContain("scale-x-100 opacity-100");
      expect(bottomBar?.className).toContain("translate-y-0 rotate-0");
    });
  });

  describe("Group 2: Mobile Single Language Flag & Selection Modal Sheet", () => {
    it("renders single flag button on mobile and 2 flags on desktop", () => {
      render(<LanguageSwitcher />);

      // Desktop wrapper
      const desktopWrapper = document.querySelector(".hidden.xl\\:flex");
      expect(desktopWrapper).toBeInTheDocument();
      const desktopButtons = desktopWrapper?.querySelectorAll("button");
      expect(desktopButtons?.length).toBe(2);

      // Mobile wrapper
      const mobileWrapper = document.querySelector(".xl\\:hidden");
      expect(mobileWrapper).toBeInTheDocument();
      const mobileButton = mobileWrapper?.querySelector("button");
      expect(mobileButton).toBeInTheDocument();
      expect(mobileButton).toHaveAttribute("aria-haspopup", "dialog");
      expect(mobileButton).toHaveAttribute("aria-expanded", "false");

      // Image inside mobile button reflects active locale 'vi'
      const mobileFlagImg = mobileButton?.querySelector("img");
      expect(mobileFlagImg).toHaveAttribute("src", "/images/flag-vn.jpg");
    });

    it("renders US flag on mobile button when active locale is 'en'", () => {
      currentLocale = "en";
      render(<LanguageSwitcher />);

      const mobileWrapper = document.querySelector(".xl\\:hidden");
      const mobileButton = mobileWrapper?.querySelector("button");
      const mobileFlagImg = mobileButton?.querySelector("img");
      expect(mobileFlagImg).toHaveAttribute("src", "/images/flag-us.jpg");
    });

    it("opens Language modal bottom sheet on tap, displays language options with checkmark on active locale", () => {
      render(<LanguageSwitcher />);

      const mobileWrapper = document.querySelector(".xl\\:hidden");
      const mobileButton = mobileWrapper?.querySelector("button");
      expect(mobileButton).toBeInTheDocument();

      // Open modal
      fireEvent.click(mobileButton!);

      const modalDialog = screen.getByRole("dialog");
      expect(modalDialog).toBeInTheDocument();
      expect(modalDialog).toHaveAttribute("aria-modal", "true");

      // Verify title "Language"
      expect(screen.getByText("Language")).toBeInTheDocument();

      // Verify options
      expect(screen.getByText("Tiếng Việt")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();

      // Active locale 'vi' has checkmark SVG
      const viButton = screen.getByText("Tiếng Việt").closest("button");
      const enButton = screen.getByText("English").closest("button");
      expect(viButton?.querySelector("svg")).toBeInTheDocument();
      expect(enButton?.querySelector("svg")).toBeNull();
    });

    it("switches locale and closes modal sheet when user selects an alternate language", () => {
      render(<LanguageSwitcher />);
      const mobileButton = document.querySelector(".xl\\:hidden button");
      fireEvent.click(mobileButton!);

      // Tap "English"
      const enButton = screen.getByText("English").closest("button");
      fireEvent.click(enButton!);

      expect(mockReplace).toHaveBeenCalledWith(
        {
          pathname: "/products/kho-ca-bong",
          params: { slug: "kho-ca-bong" },
          query: undefined,
        },
        { locale: "en", scroll: false }
      );

      // Modal is closed
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("closes modal sheet without changing locale when tapping close button or backdrop", () => {
      render(<LanguageSwitcher />);
      const mobileButton = document.querySelector(".xl\\:hidden button");
      fireEvent.click(mobileButton!);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Tap close button ✕
      const closeBtn = screen.getByRole("button", { name: /đóng|close/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Group 3: Synchronized Typography for 'Sản phẩm' Accordion in Mobile Menu", () => {
    it("renders 'Sản phẩm' category button with 'font-display text-lg font-bold' matching primary links", () => {
      render(<Header />);
      const toggleBtn = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(toggleBtn);

      // Find "Sản phẩm" accordion toggle button
      const sanPhamBtn = screen.getByRole("button", { name: /sản phẩm/i });
      expect(sanPhamBtn).toBeInTheDocument();

      // Verify typography class: font-display text-lg font-bold
      expect(sanPhamBtn.className).toContain("font-display");
      expect(sanPhamBtn.className).toContain("text-lg");
      expect(sanPhamBtn.className).toContain("font-bold");
      expect(sanPhamBtn.className).toContain("rounded-xl");
      expect(sanPhamBtn.className).toContain("px-3");
      expect(sanPhamBtn.className).toContain("py-2.5");

      // Verify it does NOT have old title-3 class
      expect(sanPhamBtn.className).not.toContain("title-3");

      // Find sibling link like "Về chúng tôi" within mobile drawer
      const mobileDrawer = screen.getByRole("dialog");
      const aboutLink = within(mobileDrawer).getByRole("link", { name: /về chúng tôi/i });
      expect(aboutLink.className).toContain("font-display");
      expect(aboutLink.className).toContain("text-lg");
      expect(aboutLink.className).toContain("font-bold");
    });
  });

  describe("Group 4: Product CTA 'Thêm vào giỏ hàng' Responsive Layout", () => {
    const mockProductData: any = {
      title: "Cá Bống Kho Tiêu",
      checkout: {
        slug: "ca-bong-kho-tieu",
        categorySlug: "mon-kho",
        productId: 101,
        productCode: "SP001",
      },
      images: [{ url: "/images/product.jpg" }],
      sizes: [
        {
          id: 1,
          code: "CB01",
          title: "Hũ 250g",
          price: 120000,
          original_price: 150000,
        },
      ],
      description: "Thơm ngon đậm đà",
      infos: [],
    };

    it("renders Add to Cart button with responsive classes: !min-w-0, w-full, px-2 sm:px-3, text-[13px] sm:text-sm md:text-base, gap-1.5 sm:gap-2", () => {
      render(<ProductDetailsInfo productData={mockProductData} />);

      const addToCartBtn = screen.getByRole("button", { name: /thêm vào giỏ hàng|add to cart/i });
      expect(addToCartBtn).toBeInTheDocument();

      // Verify responsive class overrides
      expect(addToCartBtn.className).toContain("!min-w-0");
      expect(addToCartBtn.className).toContain("w-full");
      expect(addToCartBtn.className).toContain("px-2");
      expect(addToCartBtn.className).toContain("sm:px-3");
      expect(addToCartBtn.className).toContain("text-[13px]");
      expect(addToCartBtn.className).toContain("sm:text-sm");
      expect(addToCartBtn.className).toContain("md:text-base");
      expect(addToCartBtn.className).toContain("font-semibold");
      expect(addToCartBtn.className).toContain("tracking-normal");
      expect(addToCartBtn.className).toContain("gap-1.5");
      expect(addToCartBtn.className).toContain("sm:gap-2");

      // Verify cart icon responsive sizing
      const cartIcon = addToCartBtn.querySelector("svg");
      const iconClass = cartIcon?.getAttribute("class") || "";
      expect(iconClass).toContain("w-4");
      expect(iconClass).toContain("h-4");
      expect(iconClass).toContain("sm:w-5");
      expect(iconClass).toContain("sm:h-5");
    });

    it("maintains identical responsive layout classes in out-of-stock disabled state", () => {
      const outOfStockData: any = {
        ...mockProductData,
        sizes: [
          {
            id: 2,
            code: "", // empty code triggers out of stock
            title: "Hũ 500g",
            price: 240000,
          },
        ],
        infos: [],
      };

      render(<ProductDetailsInfo productData={outOfStockData} />);

      const disabledButtons = screen.getAllByRole("button", { name: /tạm hết hàng|sold out|out of stock/i });
      const addToCartBtn = disabledButtons[0];
      expect(addToCartBtn).toBeDisabled();

      // Still has responsive layout classes
      expect(addToCartBtn.className).toContain("!min-w-0");
      expect(addToCartBtn.className).toContain("w-full");
      expect(addToCartBtn.className).toContain("px-2");
      expect(addToCartBtn.className).toContain("sm:px-3");
      expect(addToCartBtn.className).toContain("text-[13px]");
      expect(addToCartBtn.className).toContain("bg-gray-300");
    });
  });
});
