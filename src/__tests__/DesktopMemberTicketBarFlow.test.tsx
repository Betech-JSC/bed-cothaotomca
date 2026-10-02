import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import viMessages from '@/i18n/locales/vi.json';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

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

    t.rich = (key: string) => resolveKey(key);
    return t;
  },
}));

// Mock AuthContext with Gold user
const mockUser = {
  id: 1,
  name: 'Nguyễn Văn A',
  phone: '0901234567',
  email: 'nguyenvana@example.com',
  points: 1000,
  tier: 'gold',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, token: 'mock-token', refreshUser: vi.fn() }),
  getMemberTier: () => ({ tier: 'gold', name: 'VÀNG', discountPercent: 10, label: 'Ưu đãi thành viên Vàng (10%)' }),
  calculateMemberDiscount: (user: any, subtotal: number) => Math.floor((subtotal * 0.1) / 1000) * 1000,
}));

// Mock CartContext
const mockCartItems = [
  {
    productId: 1,
    productCode: 'TOM01',
    slug: 'mon-tom-hum',
    categorySlug: 'hai-san',
    title: 'Món Tôm Hùm Sốt Phô Mai',
    name: 'Món Tôm Hùm Sốt Phô Mai',
    unitPrice: 600000,
    originalPrice: 600000,
    quantity: 1,
    imageUrl: '/images/lobster.jpg',
  },
];

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    subtotal: 600000,
    hasOutOfStockItems: false,
  }),
}));

// Mock BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => [
    {
      id: 1,
      branchName: 'Chi nhánh Chính',
      address: '123 Đ. ABC',
      contactNumber: '0901234567',
      isActive: true,
    },
  ],
}));

// Mock orderService
vi.mock('@/services/orderService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    FALLBACK_ADMINISTRATIVE_UNITS: [],
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getCheckoutConfig: vi.fn().mockResolvedValue({
      branches: [
        {
          id: 1,
          branchName: 'Chi nhánh Chính',
          address: '123 Đ. ABC',
          contactNumber: '0901234567',
          isActive: true,
        },
      ],
      default_shipping_fee: '30000',
      active_promotions: [],
    }),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: false,
    }),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 30000,
      original_fee: 30000,
      is_freeship: false,
      is_deliverable: true,
    }),
    getLoyaltySettings: vi.fn().mockResolvedValue({
      can_combine_with_promotions: true,
    }),
  };
});

const mockConfigData: any = {
  default_shipping_fee: '30000',
  operating_hours: null,
  branches: [
    {
      id: 1,
      branchName: 'Chi nhánh Chính',
      address: '123 Đ. ABC',
      contactNumber: '0901234567',
      isActive: true,
    },
  ],
  shipping_settings: {
    is_min_amount_enabled: false,
    min_order_amount: 0,
    shipping_discount_type: 'none',
    shipping_discount_value: 0,
  },
  payment_methods: [{ id: 'cod', name: 'COD', is_active: true }],
  active_promotions: [],
};

describe('Desktop CheckoutForm Member Ticket Bar & Re-toggle Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('Desktop: Khi vào checkout với user Gold -> hiển thị badge VÀNG -60k, bấm nút ✕ tắt thẻ hội viên -> discount về 0đ và chip biến mất; mở CouponModal bật lại -> phục hồi', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // 1. Kiểm tra ban đầu: Badge hội viên hiển thị trên VoucherTicketBar
    const memberBadge = await screen.findByTestId('member-ticket-badge');
    expect(memberBadge).toBeInTheDocument();
    expect(memberBadge).toHaveTextContent('VÀNG -60k');

    // Nút Xóa ✕ xuất hiện trên thanh vé
    const removeBtn = screen.getByTestId('remove-voucher-button');
    expect(removeBtn).toBeInTheDocument();

    // 2. Click nút ✕ để tắt thẻ hội viên
    fireEvent.click(removeBtn);

    // 3. Chip biến mất khỏi VoucherTicketBar
    expect(screen.queryByTestId('member-ticket-badge')).not.toBeInTheDocument();

    // Thanh vé chuyển sang trạng thái placeholder "Chọn hoặc nhập mã"
    expect(screen.getByText('Chọn hoặc nhập mã')).toBeInTheDocument();

    // Tóm tắt đơn hàng hiển thị "Ưu đãi thành viên (Đã bỏ chọn) 0đ"
    expect(screen.getByText('Ưu đãi thành viên (Đã bỏ chọn)')).toBeInTheDocument();

    // 4. Mở lại CouponModal bằng cách click vào thanh vé
    const selectBtn = screen.getByRole('button', { name: 'Chọn mã' });
    fireEvent.click(selectBtn);

    // Thẻ hội viên trong CouponModal xuất hiện
    const memberCard = await screen.findByTestId('member-tier-campaign-card');
    expect(memberCard).toBeInTheDocument();

    // Click vào thẻ hội viên để bật lại
    fireEvent.click(memberCard);

    // Bấm Áp dụng
    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
    fireEvent.click(applyBtn);

    // 5. Khôi phục lại badge hội viên và giảm giá 60k
    expect(await screen.findByTestId('member-ticket-badge')).toBeInTheDocument();
    expect(screen.getByTestId('member-ticket-badge')).toHaveTextContent('VÀNG -60k');
  });
});
