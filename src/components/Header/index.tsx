"use client";

import { Link, usePathname, useRouter } from "@/i18n/i18n-navigation";
import { ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Logo from "../Logo";
import LanguageSwitcher from "../LanguageSwitcher";
import Search from "../Icons/Search";
import Hotline from "../Icons/Hotline";
import Cart from "../Icons/Cart";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestions from "./SearchSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import CartPopup from "./CartPopup";
import MobileCartFlow from "./MobileCartFlow";
import UserCircle from "../Icons/UserCircle";
import { slugify } from "@/lib/format";

type LinkHref = ComponentProps<typeof Link>["href"];

type NavItem = {
  label: string;
  href?: LinkHref;
  isExternal?: boolean;
  children?: NavItem[];
  i18nKey?: string;
};

const STICKY_ON = 110;
const STICKY_OFF = 80;

const isNavActive = (href: string | undefined, pathname: string): boolean => {
  if (!href) return false;
  if (href === "/" || href === "") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const Header = () => {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const settings = useGeneralSettings();
  const hotline = settings?.hotline?.replace(/\s/g, '') || "0987 654 321";
  const hotlineClean = hotline.replace(/\s/g, "");
  const { isCartOpen, setIsCartOpen, totalItems } = useCart();
  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const [categories, setCategories] = useState<{ id: number; title: string; slug: string }[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/categories?lang=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setCategories(
            data.data.map((c: any) => ({
              id: c.id,
              title: c.title,
              slug: c.slug || slugify(c.title),
            }))
          );
        }
      })
      .catch(() => {});
  }, [locale]);

  const productChildren: NavItem[] = [
    { label: t("common.all") + " " + t("common.product").toLowerCase(), href: `/product`, i18nKey: "all_products" },
    ...categories.map((cat) => ({
      label: cat.title,
      href: { pathname: "/product/[category]", params: { category: cat.slug } } as any,
      i18nKey: `cat_${cat.id}`,
    })),
  ];

  const mainNavLeft: NavItem[] = [
    { label: t("common.about"), href: `/about`, i18nKey: "about" },
    {
      label: t("common.product"),
      href: `/product`,
      i18nKey: "product",
      children: productChildren,
    },
    { label: t("common.policy"), href: `/policy`, i18nKey: "policy" },
  ];

  const mainNavRight: NavItem[] = [
    { label: t("common.blog"), href: `/blog`, i18nKey: "blog" },
    { label: t("common.contact"), href: `/contact`, i18nKey: "contact" },
  ];

  const allNavItems = [...mainNavLeft, ...mainNavRight];

  const [isSticky, setIsSticky] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null,
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search suggestions hook
  const { productSuggestions, blogSuggestions, policySuggestions, isLoading, clearSuggestions } = useSearchSuggestions(searchQuery, locale);

  useEffect(() => {
    const onScroll = () => {
      setIsSticky((prev) => {
        if (!prev && window.scrollY >= STICKY_ON) return true;
        if (prev && window.scrollY <= STICKY_OFF) return false;
        return prev;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setOpenDropdownIndex(null);
    setIsSearchOpen(false);
    setShowSuggestions(false);
    clearSuggestions();
  }, [pathname]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isMobileOpen]);

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);
  const toggleDropdown = (index: number) => {
    setOpenDropdownIndex((prev) => (prev === index ? null : index));
  };
  const toggleSearch = () => setIsSearchOpen((prev) => !prev);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push({
        pathname: "/search",
        query: { q: searchQuery.trim() },
      } as any);
      setIsSearchOpen(false);
      setSearchQuery("");
      setShowSuggestions(false);
      clearSuggestions();
    }
  };

  const handleSuggestionSelect = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setShowSuggestions(false);
    clearSuggestions();
  }, [clearSuggestions]);

  return (
    <header
      className={`bg-primary sticky top-0 z-[100] w-full xl:h-[6.5rem] flex items-center transition-[padding] duration-300 ease-in-out ${isSticky ? "lg:py-1" : "lg:py-3"
        }`}
      aria-label="Site header"
    >
      <div className="container w-full">
        <nav
          className="relative hidden items-center justify-between xl:flex w-full"
          aria-label="Main"
        >

          <ul className="flex gap-4 min-w-[380px]">
            {mainNavLeft.map((itemNavLeft, indexNavLeft) => (
              <DesktopNavItem
                key={itemNavLeft.i18nKey}
                item={itemNavLeft}
                isActive={isNavActive(
                  itemNavLeft.href as string | undefined,
                  pathname,
                )}
                isOpen={openDropdownIndex === indexNavLeft}
                onToggle={() => toggleDropdown(indexNavLeft)}
              />
            ))}
          </ul>
          <Logo
            isSticky={isSticky}
            width={81}
            height={52}
            stickyWidth={81}
            stickyHeight={52}
            className="h-[3.25rem]"
          />
          <ul className="flex items-center justify-end gap-4 min-w-[380px]">
            {mainNavRight.map((itemNavRight, indexNavRight) => (
              <DesktopNavItem
                key={itemNavRight.i18nKey}
                item={itemNavRight}
                isActive={isNavActive(
                  itemNavRight.href as string | undefined,
                  pathname,
                )}
                isOpen={openDropdownIndex === indexNavRight}
                onToggle={() => toggleDropdown(indexNavRight)}
              />
            ))}

            <li>
              <button
                onClick={toggleSearch}
                className="text-yellow lg:hover:text-secondary duration-300 ease-in-out cursor-pointer flex items-center justify-center"
                aria-label="Search"
              >
                <Search />
              </button>
            </li>
            <li>
              <Link
                href="/profile"
                className="text-yellow lg:hover:text-secondary duration-300 ease-in-out cursor-pointer flex items-center justify-center"
                aria-label="Tài khoản"
              >
                <UserCircle size={24} />
              </Link>
            </li>
            <li>
              <LanguageSwitcher />
            </li>
            <li className="relative flex items-center">
              <button
                id="cart-toggle-btn"
                onClick={toggleCart}
                className="text-yellow lg:hover:text-secondary flex items-center gap-2.5 duration-300 ease-in-out cursor-pointer relative py-2"
              >
                <div className="relative">
                  <Cart />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-secondary text-white text-[0.5625rem] font-bold rounded-full w-[0.8125rem] h-[0.8125rem] flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="text-[1rem] font-display font-bold whitespace-nowrap">Đặt hàng</span>
              </button>
              <CartPopup onClose={() => setIsCartOpen(false)} />
            </li>
          </ul>
        </nav>
        <MobileMenu
          open={isMobileOpen}
          navItems={allNavItems}
          pathname={pathname}
          onToggle={toggleMobile}
          onClose={() => setIsMobileOpen(false)}
          onToggleSearch={toggleSearch}
        />
      </div>
      <div
        className={`absolute left-0 top-full w-full bg-primary/95 shadow-xl transition-all duration-300 backdrop-blur-sm border-t border-white/10 ${isSearchOpen
          ? "max-h-[500px] opacity-100 py-4"
          : "max-h-0 opacity-0 py-0 invisible overflow-hidden"
          }`}
      >
        <div className="container">
          <div ref={searchContainerRef} className="relative max-w-3xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center"
            >
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t("common.search_placeholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-white text-gray-900 rounded-full py-2.5 px-6 placeholder:text-gray-900 focus:outline-none focus:border-secondary transition-all"
              />
              <div className="absolute right-0.5">
                <button
                  type="submit"
                  className="btn-secondary !h-[40px] btn max-md:!min-w-[100px]"
                >
                  {t("common.search")}
                </button>
              </div>
            </form>
            <SearchSuggestions
              productSuggestions={productSuggestions}
              blogSuggestions={blogSuggestions}
              policySuggestions={policySuggestions}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSelect={handleSuggestionSelect}
              visible={showSuggestions && isSearchOpen}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

type DesktopNavItemProps = {
  item: NavItem;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
};

const DesktopNavItem = ({
  item,
  isActive,
  isOpen,
  onToggle,
}: DesktopNavItemProps) => {
  const baseClasses = "relative title-3 duration-300 ease-in-out py-2";
  const activeClasses = "text-secondary";
  const inactiveClasses = "text-yellow lg:hover:text-secondary";
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const showDropdown = isOpen || isHovered;

  if (!item.children || item.children.length === 0) {
    const linkProps = item.isExternal
      ? { target: "_blank", rel: "noreferrer" }
      : {};
    return (
      <li key={item.i18nKey} className="flex items-center">
        <Link
          href={item.href ?? ("#" as any)}
          className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
          {...linkProps}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li
      className="relative group flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={item.href ?? ("#" as any)}
        className={`${baseClasses} inline-flex items-center gap-1.5 ${isActive || showDropdown ? activeClasses : inactiveClasses}`}
      >
        <span>{item.label}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-300 ${showDropdown ? "rotate-180 text-secondary" : ""}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {item.children && item.children.length > 0 && (
        <div
          className={`absolute top-full left-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-2xl transition-all duration-200 ${
            showDropdown
              ? "pointer-events-auto opacity-100 translate-y-0"
              : "pointer-events-none opacity-0 translate-y-2"
          }`}
          role="menu"
        >
          <div className="space-y-1">
            {item.children.map((child, childIndex) => (
              <Link
                key={child.i18nKey || childIndex}
                href={child.href ?? ("#" as any)}
                onClick={() => {
                  setIsHovered(false);
                }}
                className="flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-base font-display font-bold text-gray-900 transition-all hover:text-secondary group/item"
                role="menuitem"
              >
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </li>
  );
};

type MobileMenuProps = {
  open: boolean;
  navItems: NavItem[];
  pathname: string | null;
  onToggle: () => void;
  onClose: () => void;
  onToggleSearch: () => void;
};

const MobileMenu = ({
  open,
  navItems,
  pathname,
  onToggle,
  onClose,
  onToggleSearch,
}: MobileMenuProps) => {
  const [openSection, setOpenSection] = useState<number | null>(null);
  const settings = useGeneralSettings();
  const hotline = settings?.hotline?.replace(/\s/g, '') || "0987 654 321";
  const hotlineClean = hotline.replace(/\s/g, "");
  const { isCartOpen, setIsCartOpen, totalItems } = useCart();
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
    onClose();
  };

  useEffect(() => {
    if (!open) setOpenSection(null);
  }, [open]);

  return (
    <nav aria-label="Mobile main navigation" className="w-full xl:hidden relative">
      <div className="flex w-full items-center justify-between py-1 relative">
        <Logo width={75} height={48} className="h-12" />
        <div className="flex items-center gap-3 shrink-0">
          {/* 1. Search */}
          <button
            onClick={onToggleSearch}
            className="text-yellow hover:text-secondary duration-300 ease-in-out shrink-0 cursor-pointer p-1"
            aria-label="Search"
          >
            <Search />
          </button>

          {/* 2. Account Profile */}
          <Link
            href="/profile"
            className="text-yellow hover:text-secondary duration-300 ease-in-out shrink-0 flex items-center justify-center cursor-pointer p-1"
            aria-label="Tài khoản"
          >
            <UserCircle size={24} />
          </Link>

          {/* 3. Language Switcher */}
          <div className="shrink-0 flex items-center">
            <LanguageSwitcher />
          </div>

          {/* 4. Cart Toggle */}
          <div className="relative shrink-0 flex items-center">
            <button
              id="cart-toggle-btn-mobile"
              onClick={toggleCart}
              className="text-yellow hover:text-secondary duration-300 ease-in-out relative flex items-center justify-center w-6 h-6 cursor-pointer p-1"
              aria-label="Cart"
            >
              <Cart />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-secondary text-white text-[0.5rem] font-bold rounded-full w-[0.8125rem] h-[0.8125rem] flex items-center justify-center pointer-events-none z-10">
                  {totalItems}
                </span>
              )}
            </button>
            <MobileCartFlow onClose={() => setIsCartOpen(false)} />
          </div>

          {/* 5. Hamburger Menu Toggle Button */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="text-yellow duration-300 ease-in-out shrink-0 flex items-center justify-center cursor-pointer p-1"
          >
            <span className="sr-only">
              {open ? "Close menu" : "Open menu"}
            </span>
            <div className="flex h-6 w-6 flex-col items-center justify-center gap-1">
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-transform duration-200 ${
                  open ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-transform duration-200 ${
                  open ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[3.25rem] z-[90] bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Sidebar Menu Drawer */}
      <div
        className={`bg-primary fixed inset-x-0 bottom-0 top-[3.25rem] z-[100] w-full p-6 space-y-6 shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <ul className="title-3 mt-2 flex flex-col gap-2">
          {navItems.map((item, index) => {
            const active = isNavActive(
              item.href as string | undefined,
              pathname ?? "",
            );
            const hasChildren =
              !!item.children && item.children.length > 0;
            const isOpen = openSection === index;

            if (!hasChildren) {
              const linkProps = item.isExternal
                ? { target: "_blank", rel: "noreferrer" }
                : {};
              return (
                <li key={item.i18nKey}>
                  <Link
                    href={item.href ?? ("#" as any)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 font-display text-lg font-bold ${
                      active ? "text-secondary" : "text-yellow hover:text-secondary"
                    }`}
                    {...linkProps}
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.i18nKey}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSection((prev) =>
                      prev === index ? null : index,
                    )
                  }
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left title-3 duration-300 ease-in-out cursor-pointer ${
                    isOpen || active ? "text-secondary font-bold" : "text-yellow"
                  }`}
                >
                  <span>{item.label}</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-secondary" : "text-yellow"
                    }`}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {hasChildren && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-[500px] pt-1 pb-2 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {item.children!.map((child, childIndex) => {
                      const isChildActive = isNavActive(
                        typeof child.href === "string" ? child.href : undefined,
                        pathname ?? ""
                      );
                      return (
                        <Link
                          key={child.i18nKey || childIndex}
                          href={child.href ?? ("#" as any)}
                          className={`flex items-center justify-between border-b border-white/10 py-3 pl-6 pr-3 text-base font-sans font-normal transition-colors ${
                            isChildActive
                              ? "text-secondary font-semibold"
                              : "text-white hover:text-secondary"
                          }`}
                          onClick={onClose}
                        >
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <Link
            href="/checkout"
            onClick={() => {
              setIsCartOpen(false);
              onClose();
            }}
            className="bg-secondary hover:bg-secondary/90 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all w-full text-center cursor-pointer"
          >
            <Cart />
            <span className="text-base font-bold">Đặt hàng ngay ({totalItems})</span>
          </Link>

          <a
            href={`tel:${hotlineClean}`}
            className="flex items-center justify-center gap-2 text-yellow font-bold text-sm py-2 hover:text-secondary transition-colors"
          >
            <span>📞 Hotline: {hotline}</span>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Header;
