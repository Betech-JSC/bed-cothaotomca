import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

import CouponModal from '@/components/Voucher/CouponModal';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import VoucherTicketBar from '@/components/Checkout/VoucherTicketBar';
import Footer from '@/components/Footer';
import viMessages from '@/i18n/locales/vi.json';

// Hoisted mocks for vitest
const { mockBranches, mockUser, mockCartItems } = vi.hoisted(() => {
  const branches = [
    {
      id: 1,
      branchName: 'Chi nhánh Trần Đình Xu (Q.1)',
      address: '42/2 Trần Đình Xu, Phường Cầu Ông Lãnh (Q.1 cũ), TP. Hồ Chí Minh',
      contactNumber: '024.9999.7122',
      image: '/images/branch1.jpg',
      address_link: 'https://maps.google.com/?q=branch1',
      sort_order: 1,
      isActive: true,
    },
    {
      id: 2,
      branchName: 'Chi nhánh Tân Bình',
      address: '39 Thân Nhân Trung, Phường Tân Bình, TP. Hồ Chí Minh',
      contactNumber: '024.9999.7122',
      image: '/images/branch2.jpg',
      address_link: 'https://maps.google.com/?q=branch2',
      sort_order: 2,
      isActive: true,
    },
  ];
  const user = {
    id: 101,
    name: 'Khách VIP',
    phone: '0901234567',
    email: 'vip@example.com',
    points: 500,
    tier: 'gold',
  };
  const cartItems = [
    {
      id: 'cart-1',
      productId: 1,
      variantId: 10,
      title: 'Lẩu Thái Chua Cay Đặc Biệt',
      variant: 'Nồi lớn (4 người)',
      unitPrice: 199000,
      originalPrice: 229000,
      quantity: 1,
      imageUrl: '/images/item1.jpg',
      isOutOfStock: false,
    },
  ];
  return { mockBranches: branches, mockUser: user, mockCartItems: cartItems };
});

// --- Mocks ---
vi.mock('next-intl', () => ({
  useLocale: () => 'vi',
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

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, className, onClick, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '#'} className={className} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/checkout',
}));

vi.mock('@/i18n/i18n-navigation', () => ({
  Link: ({ children, href, className, onClick, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '#'} className={className} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/checkout',
  useParams: () => ({ locale: 'vi' }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, fill, className, ...props }: any) => (
    <img src={src} alt={alt || ''} className={className} {...props} />
  ),
}));

// Mock BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => mockBranches,
}));

// Mock GeneralSettingsContext
vi.mock('@/contexts/GeneralSettingsContext', () => ({
  useGeneralSettings: () => ({
    hotline: '024.9999.7122',
    link_facebook: 'https://facebook.com/cothaotomca',
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'test-token',
    refreshUser: vi.fn(),
  }),
  getMemberTier: (u: any) => ({
    tier: 'gold',
    name: 'Gold',
    discountPercent: 5,
    isUpgradeCelebration: false,
  }),
  calculateMemberDiscount: vi.fn(() => 10000),
}));

// Mock CartContext for MobileCartFlow
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    isCartOpen: true,
    hasOutOfStockItems: false,
  }),
}));

// Mock orderService
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<any>('@/services/orderService');
  return {
    ...actual,
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: false,
      min_order_amount: '0',
    }),
    getAvailableVouchers: vi.fn().mockResolvedValue([
      {
        id: 1,
        code: 'SALE20K',
        value: 20000,
        discount_type: 'fixed',
        description: 'Giảm 20k đơn từ 100k',
        min_order_value: 100000,
        is_freeship: false,
        can_combine_with_promotions: true,
      },
    ]),
    getCheckoutConfig: vi.fn().mockResolvedValue({
      delivery_types: [
        { value: 'delivery', label: 'Giao hàng' },
        { value: 'pickup', label: 'Tự đến lấy' },
      ],
      default_shipping_fee: '30000',
      branches: mockBranches,
      operating_hours: {
        is_open_today: true,
        is_within_hours: true,
        store_open: '09:00',
        store_close: '23:00',
      },
    }),
    calculateShippingFee: vi.fn().mockResolvedValue({
      fee: 25000,
      original_fee: 25000,
      discount: 0,
      is_deliverable: true,
    }),
    validateVoucher: vi.fn().mockResolvedValue({
      valid: true,
      voucher: {
        id: 1,
        code: 'SALE20K',
        value: 20000,
        discount_type: 'fixed',
      },
    }),
    createOrder: vi.fn().mockResolvedValue({
      id: 999,
      order_code: 'ORD-999',
      total: 199000,
    }),
  };
});

// Mock campaignService
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
  evaluateCampaignEligibility: vi.fn().mockReturnValue({ eligible: true }),
}));

describe('Phase 4 - Gói 3: Tinh chỉnh UI/UX Popup Ưu Đãi, Sticky Checkout Mobile Cart & Layout Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ========================================================================= */
  /* NHIỆM VỤ 1 (STT 1 Sheet 5): Popup Ưu Đãi Trên Mobile                      */
  /* ========================================================================= */
  describe('Nhiệm vụ 1: Tinh chỉnh Giao diện Popup Ưu đãi Mobile (CouponModal)', () => {
    it('1.1 & 1.2: Backdrop có class bg-black/50 backdrop-blur-md, bottom sheet có border-gray-200/80 và rounded-t-[32px] sm:rounded-[28px]', () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          cartItems={mockCartItems}
          isBrowseOnly={false}
        />
      );

      // 1.1: Backdrop blur
      const backdrop = document.querySelector('.bg-black\\/50.backdrop-blur-md');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop?.className).toContain('bg-black/50');
      expect(backdrop?.className).toContain('backdrop-blur-md');

      // 1.2: Bottom Sheet Drawer border & rounded
      const drawer = document.querySelector('.rounded-t-\\[32px\\]');
      expect(drawer).toBeInTheDocument();
      expect(drawer?.className).toContain('rounded-t-[32px]');
      expect(drawer?.className).toContain('sm:rounded-[28px]');
      expect(drawer?.className).toContain('border-gray-200/80');
    });

    it('1.3 & 1.4: Mobile pull handle hiển thị với class my-2 và vùng cuộn danh sách có max-h-[75dvh] overscroll-contain', () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          cartItems={mockCartItems}
          isBrowseOnly={false}
        />
      );

      // Mobile pull handle
      const pullHandle = document.querySelector('.bg-gray-300.rounded-full.mx-auto.my-2');
      expect(pullHandle).toBeInTheDocument();
      expect(pullHandle?.className).toContain('my-2');
      expect(pullHandle?.className).toContain('sm:hidden');

      // Vùng cuộn danh sách ưu đãi
      const scrollArea = document.querySelector('.overscroll-contain.max-h-\\[75dvh\\]');
      expect(scrollArea).toBeInTheDocument();
      expect(scrollArea?.className).toContain('overflow-y-auto');
      expect(scrollArea?.className).toContain('overscroll-contain');
      expect(scrollArea?.className).toContain('max-h-[75dvh]');
      expect(scrollArea?.className).toContain('sm:max-h-[600px]');
    });

    it('3.2: Ô nhập mã voucher thủ công có padding pl-4 pr-10, nút xóa right-3.5, nút Áp dụng h-11 px-5', () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          cartItems={mockCartItems}
          isBrowseOnly={false}
        />
      );

      const input = screen.getByPlaceholderText(/Nhập mã/i);
      expect(input).toBeInTheDocument();
      expect(input.className).toContain('h-11');
      expect(input.className).toContain('pl-4');
      expect(input.className).toContain('pr-10');
      expect(input.className).toContain('rounded-full');

      // Gõ mã để nút xóa hiển thị
      fireEvent.change(input, { target: { value: 'SALE20K' } });
      const clearBtn = screen.getByRole('button', { name: '×' });
      expect(clearBtn).toBeInTheDocument();
      expect(clearBtn.className).toContain('right-3.5');

      // Nút Áp dụng của ô nhập mã thủ công
      const applyBtn = screen.getByRole('button', { name: /^Áp dụng$/i });
      expect(applyBtn).toBeInTheDocument();
      expect(applyBtn.className).toContain('h-11');
      expect(applyBtn.className).toContain('px-5');
      expect(applyBtn.className).toContain('rounded-full');
    });
  });

  /* ========================================================================= */
  /* NHIỆM VỤ 2 (STT 2 Sheet 5): Ghim Sticky Checkout Mobile Cart               */
  /* ========================================================================= */
  describe('Nhiệm vụ 2: Ghim cố định Nút thanh toán (Sticky Checkout) MobileCartFlow', () => {
    it('2.1 & 2.4: Step 1 (Giỏ hàng) - Khối nút CTA Tiếp tục có sticky bottom-0, đệm cuộn pb-32 sm:pb-36', () => {
      render(<MobileCartFlow onClose={vi.fn()} />);

      // Nút Tiếp tục đặt hàng trong Step 1
      const continueBtn = screen.getByRole('button', { name: /Tiếp tục/i });
      expect(continueBtn).toBeInTheDocument();

      // Khối container cha trực tiếp của nút CTA có sticky bottom
      const stickyBar = continueBtn.closest('.sticky');
      expect(stickyBar).toBeInTheDocument();
      expect(stickyBar?.className).toContain('sticky');
      expect(stickyBar?.className).toContain('bottom-0');
      expect(stickyBar?.className).toContain('z-20');
      expect(stickyBar?.className).toContain('bg-yellow/95');
      expect(stickyBar?.className).toContain('backdrop-blur-sm');
      expect(stickyBar?.className).toContain('border-t');
      expect(stickyBar?.className).toContain('border-gray-200/80');
      expect(stickyBar?.className).toContain('shadow-[0_-4px_16px_rgba(0,0,0,0.06)]');
      expect(stickyBar?.className).toContain('pb-[max(1rem,env(safe-area-inset-bottom))]');

      // Step 1 wrapper container có đệm an toàn pb-32 sm:pb-36
      const step1Container = document.querySelector('.space-y-6.animate-in.fade-in.slide-in-from-left.duration-200');
      expect(step1Container).toBeInTheDocument();
      expect(step1Container?.className).toContain('pb-32');
      expect(step1Container?.className).toContain('sm:pb-36');
    });

    it('2.2 & 2.4: Step 2 (Thông tin & Thanh toán) - Khối nút CTA Đặt hàng có sticky bottom-0, đệm cuộn pb-32 sm:pb-36', () => {
      render(<MobileCartFlow onClose={vi.fn()} />);

      // Bấm nút Tiếp tục để chuyển sang Step 2
      const continueBtn = screen.getByRole('button', { name: /Tiếp tục/i });
      fireEvent.click(continueBtn);

      // Nút Đặt hàng trong Step 2
      const submitBtn = screen.getByRole('button', { name: /Đặt hàng|Đặt trước/i });
      expect(submitBtn).toBeInTheDocument();

      // Khối container cha trực tiếp của nút Đặt hàng có sticky bottom
      const stickyBar = submitBtn.closest('.sticky');
      expect(stickyBar).toBeInTheDocument();
      expect(stickyBar?.className).toContain('sticky');
      expect(stickyBar?.className).toContain('bottom-0');
      expect(stickyBar?.className).toContain('z-20');
      expect(stickyBar?.className).toContain('bg-yellow/95');
      expect(stickyBar?.className).toContain('backdrop-blur-sm');
      expect(stickyBar?.className).toContain('border-t');
      expect(stickyBar?.className).toContain('border-gray-200/80');
      expect(stickyBar?.className).toContain('shadow-[0_-4px_16px_rgba(0,0,0,0.06)]');
      expect(stickyBar?.className).toContain('pb-[max(1rem,env(safe-area-inset-bottom))]');

      // Step 2 wrapper container có đệm an toàn pb-32 sm:pb-36
      const step2Container = document.querySelector('.space-y-6.animate-in.fade-in.slide-in-from-right.duration-200');
      expect(step2Container).toBeInTheDocument();
      expect(step2Container?.className).toContain('pb-32');
      expect(step2Container?.className).toContain('sm:pb-36');
    });
  });

  /* ========================================================================= */
  /* NHIỆM VỤ 3 (STT 15 Sheet 5): Padding & Căn lề VoucherTicketBar            */
  /* ========================================================================= */
  describe('Nhiệm vụ 3: Chuẩn hóa Padding & Căn lề Ô nhập mã giảm giá (VoucherTicketBar)', () => {
    it('3.1: Trạng thái chưa chọn mã - Khung capsule có min-h-[48px], padding px-3.5 py-2.5 sm:px-4 sm:py-3, khoảng cách icon chevron gap-1.5', () => {
      const { container } = render(
        <VoucherTicketBar
          appliedVoucher={null}
          appliedShippingVoucher={null}
          onClick={vi.fn()}
        />
      );

      // Khung capsule
      const capsule = container.querySelector('.rounded-full.border.border-gray-300');
      expect(capsule).toBeInTheDocument();
      expect(capsule?.className).toContain('min-h-[48px]');
      expect(capsule?.className).toContain('px-3.5');
      expect(capsule?.className).toContain('py-2.5');
      expect(capsule?.className).toContain('sm:px-4');
      expect(capsule?.className).toContain('sm:py-3');

      // Placeholder text
      expect(screen.getByText('Chọn hoặc nhập mã')).toBeInTheDocument();

      // Cụm icon chevron và placeholder có gap-1.5
      const rightGroup = screen.getByText('Chọn hoặc nhập mã').parentElement;
      expect(rightGroup?.className).toContain('gap-1.5');
    });
  });

  /* ========================================================================= */
  /* NHIỆM VỤ 4 (STT 2 Sheet 4): Bố cục Danh sách Chi nhánh Footer             */
  /* ========================================================================= */
  describe('Nhiệm vụ 4: Tối ưu Bố cục Danh sách Chi nhánh Footer trên Mobile (Footer)', () => {
    it('4.1, 4.2 & 4.3: Lưới chi nhánh gap-y-4 sm:gap-y-5, thẻ chi nhánh rounded-[14px] shadow-sm, gradient phủ chữ và line-clamp-2', () => {
      const { container } = render(<Footer />);

      // 4.1: Lưới chi nhánh có gap-y-4 sm:gap-y-5
      const branchGrid = container.querySelector('.grid.md\\:grid-cols-2');
      expect(branchGrid).toBeInTheDocument();
      expect(branchGrid?.className).toContain('gap-y-4');
      expect(branchGrid?.className).toContain('sm:gap-y-5');

      // 4.2: Thẻ chi nhánh có rounded-[14px] và shadow-sm
      const branchCard = container.querySelector('a.rounded-\\[14px\\]');
      expect(branchCard).toBeInTheDocument();
      expect(branchCard?.className).toContain('rounded-[14px]');
      expect(branchCard?.className).toContain('shadow-sm');
      expect(branchCard?.className).toContain('overflow-hidden');

      // 4.3: Gradient phủ chữ tương phản cao
      const gradientOverlay = branchCard?.querySelector('.bg-gradient-to-t.from-black\\/90');
      expect(gradientOverlay).toBeInTheDocument();
      expect(gradientOverlay?.className).toContain('from-black/90');
      expect(gradientOverlay?.className).toContain('via-black/60');
      expect(gradientOverlay?.className).toContain('to-transparent');
      expect(gradientOverlay?.className).toContain('p-3');
      expect(gradientOverlay?.className).toContain('sm:p-4');

      // Tiêu đề chi nhánh nổi bật font-bold text-white
      const title = gradientOverlay?.querySelector('.title-4');
      expect(title).toBeInTheDocument();
      expect(title?.className).toContain('text-white');
      expect(title?.className).toContain('font-bold');

      // Địa chỉ có line-clamp-2 break-words text-xs sm:text-sm text-gray-200
      const address = gradientOverlay?.querySelector('.line-clamp-2');
      expect(address).toBeInTheDocument();
      expect(address?.className).toContain('line-clamp-2');
      expect(address?.className).toContain('break-words');
      expect(address?.className).toContain('text-xs');
      expect(address?.className).toContain('sm:text-sm');
      expect(address?.className).toContain('text-gray-200');
    });
  });
});
