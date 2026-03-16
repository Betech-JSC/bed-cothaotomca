"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "../Logo";
import LanguageSwitcher from "../LanguageSwitcher";
import Search from "../Icons/Search";
import Hotline from "../Icons/Hotline";

type NavItem = {
  label: string;
  href?: string;
  isExternal?: boolean;
  children?: NavItem[];
};


export const mainNavLeft: NavItem[] = [
  { label: "Về chúng tôi", href: "/about" },
  {
    label: "Sản phẩm", href: "/product" },
  { label: "Chính sách", href: "/policy" },
];

export const mainNavRight: NavItem[] = [
  { label: "Tin tức", href: "/blog" },
  { label: "Liên hệ", href: "/contact" },
];

const STICKY_SCROLL_Y = 40;

const Header = () => {
  const pathname = usePathname();
  const [isSticky, setIsSticky] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const onScroll = () => {
      setIsSticky(window.scrollY >= STICKY_SCROLL_Y);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setOpenDropdownIndex(null);
  }, [pathname]);

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);
  const toggleDropdown = (index: number) => {
    setOpenDropdownIndex((prev) => (prev === index ? null : index));
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full bg-primary duration-500 ease-in-out ${
        isSticky
          ? "py-1 h-[80px]"
          : "py-3 h-[104px]"
      }`}
      aria-label="Site header"
    >
      <div className="container">
        <nav
          className="hidden items-center justify-between lg:flex"
          aria-label="Main"
        >
          <ul className="flex gap-4">
            {mainNavLeft.map((itemNavLeft, indexNavLeft) => (
              <DesktopNavItem
                key={itemNavLeft.label}
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
          <ul className="flex items-center gap-4">
            {mainNavRight.map((itemNavRight, indexNavRight) => (
              <DesktopNavItem
                key={itemNavRight.label}
                item={itemNavRight}
                isActive={itemNavRight.href === pathname}
                isOpen={openDropdownIndex === indexNavRight}
                onToggle={() => toggleDropdown(indexNavRight)}
              />
            ))}

            <Link href="/search" className="text-yellow lg:hover:text-secondary duration-300 ease-in-out">
              <Search />
            </Link>
            <div className="size-6 flex items-center justify-center">
              <LanguageSwitcher />
            </div>
            <a href="tel:0987654321" className="py-1 px-3 border border-yellow rounded-full flex items-center gap-1.5 text-yellow lg:hover:border-secondary lg:hover:text-secondary duration-300 ease-in-out">
              <Hotline /> 
              <div>
                <div className="body-4 font-semibold uppercase">Hotline</div>
                <div className="label-1 font-semibold">0987 654 321</div>
              </div>
            </a>
          </ul>          
        </nav>

      </div>

      {/* <MobileMenu
        open={isMobileOpen}
        navItems={mainNav}
        pathname={pathname}
      /> */}
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
      <li>
        <Link
          href={item.href ?? "#"}
          className={`${baseClasses} ${
            isActive ? activeClasses : inactiveClasses
          }`}
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
        className={`${baseClasses} flex items-center gap-1 ${
          isOpen || isActive ? "text-primary" : inactiveClasses
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{item.label}</span>
        <svg
          className={`h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
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
      {item.children && item.children.length > 0 && (
        <div
          className={`absolute left-0 top-full mt-3 w-56 rounded-2xl border border-neutral-100 bg-white/95 p-2 text-sm shadow-lg backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95 ${
            isOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          } transition-opacity duration-150`}
          role="menu"
        >
          {item.children.map((child) => (
            <Link
              key={child.label}
              href={child.href ?? "#"}
              className="block rounded-xl px-3 py-2.5 text-left text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-primary dark:text-neutral-100 dark:hover:bg-neutral-800"
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
};

const MobileMenu = ({
  open,
  navItems,
  pathname,
}: MobileMenuProps) => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setOpenSection(null);
  }, [open]);

  return (
    <div
      className={`lg:hidden ${
        open
          ? "pointer-events-auto max-h-[80vh] opacity-100"
          : "pointer-events-none max-h-0 opacity-0"
      } overflow-hidden border-t border-neutral-100 bg-white/95 px-4 pb-4 pt-2 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-950/95`}
    >
      <nav aria-label="Mobile main navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item, index) => {
            const isActive = item.href === pathname;
            const hasChildren = !!item.children && item.children.length > 0;
            const isOpen = openSection === index;

            if (!hasChildren) {
              const linkProps = item.isExternal
                ? { target: "_blank", rel: "noreferrer" }
                : {};
              return (
                <li key={item.label}>
                  <Link
                    href={item.href ?? "#"}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
                    }`}
                    {...linkProps}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenSection((prev) => (prev === index ? null : index))
                  }
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
                >
                  <span>{item.label}</span>
                  <svg
                    className={`h-3 w-3 transition-transform ${
                      isOpen ? "rotate-180" : ""
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
                    className={`ml-2 overflow-hidden pl-3 text-sm transition-all ${
                      isOpen ? "max-h-64 pt-1" : "max-h-0"
                    }`}
                  >
                    {item.children!.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href ?? "#"}
                        className="block rounded-lg px-3 py-2 text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
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
      </nav>
    </div>
  );
};

export default Header;
