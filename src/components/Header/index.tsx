"use client";

import { Link, usePathname, useRouter } from "@/i18n/i18n-navigation";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Logo from "../Logo";
import LanguageSwitcher from "../LanguageSwitcher";
import Search from "../Icons/Search";
import Hotline from "../Icons/Hotline";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";

type LinkHref = ComponentProps<typeof Link>["href"];

type NavItem = {
  label: string;
  href?: LinkHref;
  isExternal?: boolean;
  children?: NavItem[];
  i18nKey?: string;
};

// FIX: Dùng 2 ngưỡng (hysteresis) thay vì 1 ngưỡng duy nhất
// để tránh feedback loop gây co giật
const STICKY_ON = 110;
const STICKY_OFF = 80;

const Header = () => {
  const pathname = usePathname();
  const t = useTranslations();
  const settings = useGeneralSettings();
  const hotline = settings?.hotline || "0987 654 321";
  const hotlineClean = hotline.replace(/\s/g, "");

  const mainNavLeft: NavItem[] = [
    { label: t('common.about'), href: `/about`, i18nKey: 'about' },
    { label: t('common.product'), href: `/product`, i18nKey: 'product' },
    { label: t('common.policy'), href: `/policy`, i18nKey: 'policy' },
  ];

  const mainNavRight: NavItem[] = [
    { label: t('common.blog'), href: `/blog`, i18nKey: 'blog' },
    { label: t('common.contact'), href: `/contact`, i18nKey: 'contact' },
  ];

  const [isSticky, setIsSticky] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // FIX: Hysteresis scroll + passive listener
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
  }, [pathname]);

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
        pathname: '/search',
        query: { q: searchQuery.trim() }
      } as any);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header
      className={`bg-primary sticky top-0 z-[100] w-full transition-[padding] duration-300 ease-in-out ${
        // FIX: Chỉ thay đổi padding, KHÔNG thay đổi height
        // Tránh layout shift làm nội dung bên dưới bị đẩy lên/xuống
        isSticky ? "lg:py-1" : "lg:py-3"
        }`}
      aria-label="Site header"
    >
      <div className="container">
        <nav
          className="hidden items-center justify-between lg:flex"
          aria-label="Main"
        >
          <ul className="flex gap-4 min-w-[400px]">
            {mainNavLeft.map((itemNavLeft, indexNavLeft) => (
              <DesktopNavItem
                key={itemNavLeft.i18nKey}
                item={itemNavLeft}
                isActive={itemNavLeft.href === pathname}
                isOpen={openDropdownIndex === indexNavLeft}
                onToggle={() => toggleDropdown(indexNavLeft)}
              />
            ))}
          </ul>
          <Logo
            isSticky={isSticky}
            width={125}
            height={80}
            stickyWidth={112}
            stickyHeight={56}
            className="h-20"
          />
          <ul className="flex items-center justify-end gap-4 min-w-[400px]">
            {mainNavRight.map((itemNavRight, indexNavRight) => (
              <DesktopNavItem
                key={itemNavRight.i18nKey}
                item={itemNavRight}
                isActive={itemNavRight.href === pathname}
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
              <div className="flex size-6 items-center justify-center">
                <LanguageSwitcher />
              </div>
            </li>
            <li>
              <a
                href={`tel:${hotlineClean}`}
                className="border-yellow text-yellow lg:hover:border-secondary lg:hover:text-secondary flex items-center gap-1.5 rounded-full border px-3 py-1 duration-300 ease-in-out"
              >
                <Hotline />
                <div>
                  <div className="body-4 font-semibold uppercase">Hotline</div>
                  <div className="label-1 font-semibold">{hotline}</div>
                </div>
              </a>
            </li>
          </ul>
        </nav>
        <MobileMenu
          open={isMobileOpen}
          navItems={[...mainNavLeft, ...mainNavRight]}
          pathname={pathname}
          onToggle={toggleMobile}
          onClose={() => setIsMobileOpen(false)}
          onToggleSearch={toggleSearch}
        />
      </div>
      <div
        className={`absolute left-0 top-full w-full bg-primary/95 shadow-xl transition-all duration-300 backdrop-blur-sm overflow-hidden border-t border-white/10 ${isSearchOpen ? "max-h-24 opacity-100 py-4" : "max-h-0 opacity-0 py-0 invisible"
          }`}
      >
        <div className="container">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-3xl mx-auto">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('common.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 rounded-full py-2.5 px-6 placeholder:text-gray-900 focus:outline-none focus:border-secondary transition-all"
            />
            <div className="absolute right-1">
              <button
                type="submit"
                className="btn-secondary !h-[40px] btn max-md:!min-w-[100px]"
              >
                {t('common.search')}
              </button>
            </div>
          </form>
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

  if (!item.children || item.children.length === 0) {
    const linkProps = item.isExternal
      ? { target: "_blank", rel: "noreferrer" }
      : {};
    return (
      <li key={item.i18nKey}>
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
    <li className="relative">
      <button
        type="button"
        className={`${baseClasses} flex items-center gap-1 ${isOpen || isActive ? "text-primary" : inactiveClasses
          }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{item.label}</span>
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {item.children && item.children.length > 0 && (
        <div
          className={`absolute top-full left-0 mt-3 w-56 rounded-2xl border border-neutral-100 bg-white/95 p-2 text-sm shadow-lg backdrop-blur-md ${isOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
            } transition-opacity duration-150`}
          role="menu"
        >
          {item.children.map((child, childIndex) => (
            <Link
              key={child.i18nKey || childIndex}
              href={child.href ?? ("#" as any)}
              className="hover:text-primary block rounded-xl px-3 py-2.5 text-left text-neutral-700 transition-colors hover:bg-neutral-50"
              role="menuitem"
            >
              {child.label}
            </Link>
          ))}
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
  const hotline = settings?.hotline || "0987 654 321";
  const hotlineClean = hotline.replace(/\s/g, "");

  useEffect(() => {
    if (!open) setOpenSection(null);
  }, [open]);

  return (
    <nav aria-label="Mobile main navigation" className="w-full lg:hidden">
      <div className="flex w-full items-center justify-between py-1 relative">
        <Logo width={100} height={60} className="h-20" />
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSearch}
            className="text-yellow lg:hover:text-secondary duration-300 ease-in-out"
            aria-label="Search"
          >
            <Search />
          </button>
          <div className="flex size-6 items-center justify-center">
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="text-yellow duration-300 ease-in-out"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <div className="flex h-6 w-6 flex-col items-center justify-center gap-1">
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-transform duration-200 ${open ? "translate-y-1.5 rotate-45" : ""
                  }`}
              />
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"
                  }`}
              />
              <span
                className={`bg-yellow block h-0.5 w-6 rounded-full transition-transform duration-200 ${open ? "-translate-y-1.5 -rotate-45" : ""
                  }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed top-[88px] left-0 z-[100] w-full h-dvh bg-gray-900/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`bg-primary fixed top-[88px] left-0 z-[100] h-dvh w-full max-w-full p-4 space-y-8 shadow-xl transition-transform md:max-w-sm ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
      >
        <ul className="title-3 mt-4 flex flex-col gap-1">
          {navItems.map((item, index) => {
            const isActive = item.href === pathname;
            const hasChildren = !!item.children && item.children.length > 0;
            const isOpen = openSection === index;

            if (!hasChildren) {
              const linkProps = item.isExternal
                ? { target: "_blank", rel: "noreferrer" }
                : {};
              return (
                <li key={item.i18nKey}>
                  <Link
                    href={item.href ?? ("#" as any)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${isActive ? "text-secondary" : "text-yellow"
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
                    setOpenSection((prev) => (prev === index ? null : index))
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  <span>{item.label}</span>
                  <svg
                    className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""
                      }`}
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {hasChildren && (
                  <div
                    className={`ml-2 overflow-hidden pl-3 text-sm transition-all ${isOpen ? "max-h-64 pt-1" : "max-h-0"
                      }`}
                  >
                    {item.children!.map((child, childIndex) => (
                      <Link
                        key={child.i18nKey || childIndex}
                        href={child.href ?? ("#" as any)}
                        className="block rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-50"
                        onClick={onClose}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <a
          href={`tel:${hotlineClean}`}
          className="border-yellow text-yellow lg:hover:border-secondary lg:hover:text-secondary flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 duration-300 ease-in-out w-max"
        >
          <Hotline />
          <div>
            <div className="body-4 font-semibold uppercase">Hotline</div>
            <div className="label-1 font-semibold">{hotline}</div>
          </div>
        </a>
      </div>
    </nav>
  );
};

export default Header;
