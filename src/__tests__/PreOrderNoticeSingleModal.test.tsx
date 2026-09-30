/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
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
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className, onClick, ...rest }: any) => (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('mock_time=2026-10-01T00:30:00'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/checkout',
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

// Mock CartContext
let mockCartItems = [
  {
    id: 'cart-1',
    productId: 1,
    productCode: 'CA-KHO-01',
    title: 'Cá Kho Tộ',
    variant: 'Phần Nhỏ',
    unitPrice: 70000,
    quantity: 1,
    imageUrl: '/cakho.jpg',
    isOutOfStock: false,
  },
];

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    subtotal: 70000,
    hasOutOfStockItems: false,
    isCartOpen: true,
    totalItems: 1,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({
    tier: 'member',
    discountPercent: 0,
    minPoints: 0,
    badgeColor: 'gold',
  }),
  calculateMemberDiscount: () => 0,
}));

// Mock operating hours: mock out of hours (00:30 AM -> canOrderNow: false, notice not null)
vi.mock('@/lib/operatingHours', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    checkOperatingHours: vi.fn(() => ({
      canOrderNow: false,
      isOpen: false,
      isBeforeOpen: false,
      isAfterClose: true,
      isAfterCutoff: true,
      canScheduleToday: false,
      defaultDeliverySchedule: 'schedule',
      defaultDate: '2026-10-01',
      notice: {
        title: 'Thông Báo Đặt Hàng Hẹn Giờ',
        subtitle: 'Khung giờ phục vụ & hẹn nhận món',
        message: 'Chỉ nhận đơn đặt trước | Đơn giao hỏa tốc nhận từ 09:00 – 22:30 hằng ngày.',
        todayDateDisplay: '01/10',
        targetDateDisplay: 'Hôm nay 01/10',
        slotInfo: '10:00 - 23:00',
        cutoff: '22:30',
        storeOpen: '09:00',
        openTime: '10:00',
      },
    })),
  };
});

describe('PreOrderNotice UI/UX Fix: Single Modal & 1-Click Dismissal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('1. MobileCartFlow with inline=true does NOT render duplicate PreOrderNoticeModal', () => {
    const { container } = render(<MobileCartFlow inline={true} />);

    // In inline mode (inside CheckoutForm), MobileCartFlow must NOT mount PreOrderNoticeModal
    const noticeTitles = screen.queryAllByText('Thông Báo Đặt Hàng Hẹn Giờ');
    expect(noticeTitles.length).toBe(0);
  });

  it('2. MobileCartFlow with inline=false (standalone drawer) renders PreOrderNoticeModal and closes on single click', async () => {
    render(<MobileCartFlow inline={false} />);

    // In standalone cart drawer, modal should appear
    const noticeTitle = await screen.findByText('Thông Báo Đặt Hàng Hẹn Giờ');
    expect(noticeTitle).toBeInTheDocument();

    // Click confirm button ONCE
    const confirmBtn = screen.getByRole('button', { name: 'Tôi đã hiểu, tiếp tục đặt hàng' });
    fireEvent.click(confirmBtn);

    // Modal must disappear immediately after 1 click
    await waitFor(() => {
      expect(screen.queryByText('Thông Báo Đặt Hàng Hẹn Giờ')).not.toBeInTheDocument();
    });

    // Session storage should be marked as dismissed
    expect(sessionStorage.getItem('preorder_notice_dismissed')).toBe('true');
  });

  it('3. CheckoutForm (embedding MobileCartFlow inline) renders EXACTLY ONE PreOrderNoticeModal and dismisses in 1 click', async () => {
    const mockConfig: any = {
      branches: [
        {
          id: 1,
          branchName: 'Chi nhánh Hoàng Sa',
          address: '197 Hoàng Sa, Q.1',
          isActive: true,
        },
      ],
      default_shipping_fee: '30000',
      delivery_types: [{ value: 'delivery', label: 'Giao hàng' }],
    };

    render(<CheckoutForm order={null} config={mockConfig} mockTime="2026-10-01T00:30:00" />);

    // MUST NOT have duplicate dialogs / titles
    const noticeTitles = await screen.findAllByText('Thông Báo Đặt Hàng Hẹn Giờ');
    expect(noticeTitles.length).toBe(1);

    // Click confirm button once
    const confirmBtn = screen.getByRole('button', { name: 'Tôi đã hiểu, tiếp tục đặt hàng' });
    fireEvent.click(confirmBtn);

    // Modal must disappear completely after a single click!
    await waitFor(() => {
      expect(screen.queryByText('Thông Báo Đặt Hàng Hẹn Giờ')).not.toBeInTheDocument();
    });
  });

  it('4. When preorder_notice_dismissed is already in sessionStorage, notice modal does not reappear on mount', () => {
    sessionStorage.setItem('preorder_notice_dismissed', 'true');

    const mockConfig: any = {
      branches: [{ id: 1, branchName: 'Chi nhánh Hoàng Sa', address: '197 Hoàng Sa', isActive: true }],
      default_shipping_fee: '30000',
      delivery_types: [{ value: 'delivery', label: 'Giao hàng' }],
    };

    render(<CheckoutForm order={null} config={mockConfig} mockTime="2026-10-01T00:30:00" />);

    // Since already dismissed in session, it should NOT pop up again
    expect(screen.queryByText('Thông Báo Đặt Hàng Hẹn Giờ')).not.toBeInTheDocument();
  });
});
