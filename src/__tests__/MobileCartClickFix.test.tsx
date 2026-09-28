/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CartPopup from '@/components/Header/CartPopup';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import viMessages from '@/i18n/locales/vi.json';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split('.');
      let current: any = viMessages;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      return typeof current === 'string' ? current : key;
    };

    const t: any = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };

    t.rich = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (!values) return text;
      return text;
    };

    return t;
  },
  useLocale: () => 'vi',
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, className, onClick, ...rest }: any) => (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      token: null,
      refreshUser: vi.fn(),
    }),
  };
});

// Mock BranchContext
vi.mock('@/contexts/BranchContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useBranch: () => ({
      selectedBranch: { id: 1, name: 'Chi nhánh 1' },
      branches: [{ id: 1, name: 'Chi nhánh 1' }],
    }),
    useBranches: () => [{ id: 1, name: 'Chi nhánh 1' }],
  };
});

// Mock CartContext
let mockCartState: any = {
  cartItems: [
    {
      id: 'cart-item-1',
      productId: 101,
      productCode: 'GHE-NGAM-01',
      title: 'Ghẹ ngâm tương',
      variant: 'SIZE 1 CON',
      unitPrice: 450000,
      quantity: 2,
      imageUrl: '/ghe.jpg',
      isOutOfStock: false,
    },
  ],
  subtotal: 900000,
  hasOutOfStockItems: false,
  isCartOpen: true,
  totalItems: 2,
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
};

vi.mock('@/contexts/CartContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCart: () => mockCartState,
  };
});

describe('Mobile Cart Click Fix: CartPopup must not close MobileCartFlow on click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartState.isCartOpen = true;
    // Set mobile viewport width
    window.innerWidth = 390;
  });

  it('clicking buttons inside MobileCartFlow (+, -, Xóa) does NOT trigger CartPopup onClose', () => {
    const handleCartPopupClose = vi.fn();
    const handleMobileCartClose = vi.fn();

    const { container } = render(
      <div>
        {/* Desktop navigation container (hidden on mobile via CSS) */}
        <div className="hidden xl:flex">
          <CartPopup onClose={handleCartPopupClose} />
        </div>

        {/* Mobile menu container */}
        <div className="xl:hidden" data-testid="mobile-container">
          <MobileCartFlow onClose={handleMobileCartClose} />
        </div>
      </div>
    );

    const mobileContainer = screen.getByTestId('mobile-container');

    // 1. Click "+" button inside mobile container
    const plusButtons = mobileContainer.querySelectorAll('button');
    const plusBtn = Array.from(plusButtons).find((b) => b.textContent?.trim() === '+');
    expect(plusBtn).toBeDefined();
    fireEvent.mouseDown(plusBtn!);
    fireEvent.click(plusBtn!);

    // CartPopup onClose must NOT be called!
    expect(handleCartPopupClose).not.toHaveBeenCalled();
    // updateQuantity should have been triggered
    expect(mockCartState.updateQuantity).toHaveBeenCalledWith('cart-item-1', 3);

    // 2. Click "-" button inside mobile container
    const minusBtn = Array.from(plusButtons).find((b) => b.textContent?.trim() === '−' || b.textContent?.trim() === '-');
    expect(minusBtn).toBeDefined();
    fireEvent.mouseDown(minusBtn!);
    fireEvent.click(minusBtn!);

    expect(handleCartPopupClose).not.toHaveBeenCalled();
    expect(mockCartState.updateQuantity).toHaveBeenCalledWith('cart-item-1', 1);

    // 3. Click "[Xóa]" button inside mobile container
    const deleteBtn = Array.from(plusButtons).find((b) => b.textContent?.includes('Xóa'));
    expect(deleteBtn).toBeDefined();
    fireEvent.mouseDown(deleteBtn!);
    fireEvent.click(deleteBtn!);

    expect(handleCartPopupClose).not.toHaveBeenCalled();
    expect(mockCartState.removeFromCart).toHaveBeenCalledWith('cart-item-1');

    // 4. Click voucher "Chọn mã" button inside mobile container
    const selectVoucherBtn = Array.from(plusButtons).find((b) => b.textContent?.includes('Chọn mã'));
    expect(selectVoucherBtn).toBeDefined();
    fireEvent.mouseDown(selectVoucherBtn!);
    fireEvent.click(selectVoucherBtn!);

    expect(handleCartPopupClose).not.toHaveBeenCalled();
  });

  it('clicking the explicit close button (&times;) on MobileCartFlow DOES call onClose', () => {
    const handleMobileCartClose = vi.fn();

    render(<MobileCartFlow onClose={handleMobileCartClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    expect(handleMobileCartClose).toHaveBeenCalledTimes(1);
  });

  it('on desktop viewport (>= 1280px), clicking outside of CartPopup still calls its onClose', () => {
    window.innerWidth = 1440;
    const handleCartPopupClose = vi.fn();

    render(
      <div>
        <button id="cart-toggle-btn">Cart</button>
        <CartPopup onClose={handleCartPopupClose} />
        <div data-testid="outside-element">Outside</div>
      </div>
    );

    // Click outside element
    const outsideEl = screen.getByTestId('outside-element');
    fireEvent.mouseDown(outsideEl);

    expect(handleCartPopupClose).toHaveBeenCalledTimes(1);
  });

  it('when cart is empty, "Tiếp tục mua hàng" renders as Link to /product and calls onClose on click', () => {
    mockCartState.cartItems = [];
    const handleMobileCartClose = vi.fn();

    render(<MobileCartFlow onClose={handleMobileCartClose} />);

    // Kiểm tra liên kết trỏ tới trang sản phẩm /product
    const continueLink = screen.getByRole('link', { name: /Tiếp tục mua hàng/i });
    expect(continueLink).toBeInTheDocument();
    expect(continueLink).toHaveAttribute('href', '/product');

    // Kiểm tra sự kiện đóng giỏ hàng khi người dùng bấm tiếp tục mua hàng
    fireEvent.click(continueLink);
    expect(handleMobileCartClose).toHaveBeenCalledTimes(1);
  });
});

