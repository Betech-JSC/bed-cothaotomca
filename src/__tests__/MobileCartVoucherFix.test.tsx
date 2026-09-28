/* eslint-disable @next/next/no-img-element */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
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

// Mock AuthContext with Gold member tier (5% discount)
let mockUser: any = {
  id: 1,
  name: 'Khách hàng VIP',
  tier: 'GOLD',
  points: 500,
};

vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      token: 'mock-token',
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
      productId: 46,
      productCode: 'SP46-S',
      title: 'Tôm Ngâm Tương',
      variant: 'SIZE S: 150G NÕN (6-7 CON)',
      unitPrice: 145000,
      quantity: 5,
      imageUrl: '/tom.jpg',
      isOutOfStock: false,
    },
  ],
  subtotal: 725000,
  hasOutOfStockItems: false,
  isCartOpen: true,
  totalItems: 5,
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

describe('Mobile Cart Voucher & Member Discount Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartState.isCartOpen = true;
    window.innerWidth = 390;
  });

  it('Step 1 order summary does NOT show "Liên hệ" when food voucher discount is 0', () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    // Không được xuất hiện chữ "Liên hệ" trong bảng tóm tắt
    const contactTexts = screen.queryAllByText(/Liên hệ/i);
    expect(contactTexts.length).toBe(0);
  });

  it('Step 1 order summary displays member discount row when memberDiscount > 0', () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    // 725.000 * 5% = 36.250 làm tròn 37.000đ
    expect(screen.getByText(/Ưu đãi thành viên/i)).toBeInTheDocument();
    expect(screen.getByText(/-37\.000 VNĐ/i)).toBeInTheDocument();

    // Tổng thanh toán: 725.000 - 37.000 (member) + 30.000 (default shipping) = 718.000 VNĐ
    expect(screen.getByText(/718\.000 VNĐ/i)).toBeInTheDocument();
  });
});
