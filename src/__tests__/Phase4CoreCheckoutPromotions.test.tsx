import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import { PublicCampaignItem } from '@/services/campaignService';
import { PublicVoucherItem } from '@/services/orderService';
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

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
const { mockGiftPromo, mockConfigData, mockCreateOrder, mockGetCheckoutConfig } = vi.hoisted(() => {
  const mockGiftPromo = {
    id: 201,
    name: 'TẶNG SÚP MISO',
    promotion_type: 'order_gift_discount' as const,
    discount_type: 'percent' as const,
    discount_value: 0,
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    min_order_value: 200000,
    items: [
      {
        id: 901,
        product_id: 88,
        product_code: 'MISO',
        product_name: 'Súp Miso Rong Biển',
        campaign_price: 0,
        original_price: 35000,
        is_available: true,
      },
    ],
  };

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
      is_min_amount_enabled: true,
      min_order_amount: 300000,
      shipping_discount_type: 'freeship',
      shipping_discount_value: 30000,
    },
    payment_methods: [{ id: 'cod', name: 'COD', is_active: true }],
    active_promotions: [mockGiftPromo],
  };

  const mockCreateOrder = vi.fn().mockResolvedValue({
    success: true,
    data: {
      order_id: 12345,
      order_code: 'ORD-12345',
      total_amount: 540000,
    },
  });

  const mockGetCheckoutConfig = vi.fn().mockImplementation(() => Promise.resolve(mockConfigData));

  return { mockGiftPromo, mockConfigData, mockCreateOrder, mockGetCheckoutConfig };
});

vi.mock('@/services/orderService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createOrder: (...args: any[]) => mockCreateOrder(...args),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    FALLBACK_ADMINISTRATIVE_UNITS: [],
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getCheckoutConfig: (...args: any[]) => mockGetCheckoutConfig(...args),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: true,
      min_order_amount: 300000,
      shipping_discount_type: 'freeship',
      shipping_discount_value: 30000,
    }),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 30000,
      original_fee: 30000,
      is_freeship: false,
      is_deliverable: true,
    }),
    getLoyaltySettings: vi.fn().mockResolvedValue({
      can_combine_with_promotions: false,
    }),
    validateVoucher: vi.fn().mockImplementation((code: string, subtotal: number) => {
      const c = code.toUpperCase();
      if (c === 'WSBCT50K') {
        if (subtotal < 200000) {
          return Promise.resolve({
            valid: false,
            message: 'Đơn hàng tối thiểu 200.000 VNĐ để áp dụng mã WSBCT50K',
          });
        }
        return Promise.resolve({
          valid: true,
          voucher: {
            id: 99,
            code: 'WSBCT50K',
            short_name: 'Giảm 50k',
            discount_type: 'fixed',
            value: 50000,
            prereq_price: 200000,
            can_combine_with_promotions: false,
            can_combine_with_freeship: true,
          },
        });
      }
      return Promise.resolve({
        valid: false,
        message: 'Mã giảm giá không hợp lệ.',
      });
    }),
  };
});

describe('Phase 4 Core Checkout Promotions Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCouponModalCache();
  });

  // NHIỆM VỤ 1 (STT 4 & 5 Sheet 5): Khắc phục lỗi không gỡ được ưu đãi Hội viên & Reset ví ưu đãi
  describe('Nhiệm vụ 1: Gỡ ưu đãi Hội viên & Reset ví ưu đãi', () => {
    it('1.1 & 1.2: Bấm nút (x) trên thanh VoucherTicketBar gỡ thẻ hội viên và không bị useEffect ép bật lại', async () => {
      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Thấy badge hội viên ban đầu
      const memberBadge = await screen.findByTestId('member-ticket-badge');
      expect(memberBadge).toBeInTheDocument();
      expect(memberBadge).toHaveTextContent('VÀNG -60k');

      // Click nút (x) để gỡ
      const removeBtn = screen.getByTestId('remove-voucher-button');
      fireEvent.click(removeBtn);

      // Badge biến mất và trạng thái giữ nguyên là đã bỏ chọn
      expect(screen.queryByTestId('member-ticket-badge')).not.toBeInTheDocument();
      expect(screen.getByText('Ưu đãi thành viên (Đã bỏ chọn)')).toBeInTheDocument();
    });

    it('1.3 & 1.4: CouponModal khi totalAppliedCount === 0 hiển thị nút "Bỏ qua ưu đãi và tiếp tục" và gọi onToggleMemberCard(false)', async () => {
      const handleToggleMemberCard = vi.fn();
      const handleClose = vi.fn();
      const handleApplyVouchers = vi.fn();
      const handleApplyCampaigns = vi.fn();

      render(
        <CouponModal
          isOpen={true}
          onClose={handleClose}
          subtotal={200000}
          isMemberCardSelected={false}
          onToggleMemberCard={handleToggleMemberCard}
          onApplyVouchers={handleApplyVouchers}
          onApplyCampaigns={handleApplyCampaigns}
          vouchers={[]}
          campaigns={[]}
        />
      );

      // Nút "Bỏ qua ưu đãi và tiếp tục" xuất hiện với kiểu dáng xám
      const skipBtn = screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i });
      expect(skipBtn).toBeInTheDocument();
      expect(skipBtn.className).toContain('bg-gray-100');

      // Click nút
      fireEvent.click(skipBtn);

      // onToggleMemberCard(false) được gọi và modal đóng
      expect(handleToggleMemberCard).toHaveBeenCalledWith(false);
      expect(handleApplyVouchers).toHaveBeenCalledWith([]);
      expect(handleApplyCampaigns).toHaveBeenCalledWith([]);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  // NHIỆM VỤ 2 (STT 16.1 Sheet 5): Khóa triệt để click ưu đãi không cộng dồn (Mutex Lock)
  describe('Nhiệm vụ 2: Khóa triệt để ưu đãi không cộng dồn bằng pointer-events-none & aria-disabled', () => {
    it('2.1, 2.2, 2.3: Khi thẻ hội viên Gold được chọn, campaign không cộng dồn bị khóa với pointer-events-none và aria-disabled="true"', async () => {
      const exclusiveCamp: PublicCampaignItem = {
        id: 301,
        name: 'TẶNG SÚP MISO',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        promotion_type: 'order_discount',
        discount_type: 'fixed',
        discount_value: 30000,
        min_order_value: 0,
      };

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={300000}
          campaigns={[exclusiveCamp]}
          vouchers={[]}
          isMemberCardSelected={true}
          loyaltySettings={{ can_combine_with_promotions: false } as any}
        />
      );

      // Thấy campaign TẶNG SÚP MISO
      const campTitle = await screen.findByText('TẶNG SÚP MISO');
      expect(campTitle).toBeInTheDocument();

      // Card container của campaign phải có pointer-events-none, cursor-not-allowed, opacity-50 và aria-disabled="true"
      const cardContainer = campTitle.closest('div[aria-disabled]');
      expect(cardContainer).toBeInTheDocument();
      expect(cardContainer).toHaveAttribute('aria-disabled', 'true');
      expect(cardContainer?.className).toContain('pointer-events-none');
      expect(cardContainer?.className).toContain('cursor-not-allowed');
      expect(cardContainer?.className).toContain('opacity-50');

      // Checkbox bên trong cũng có pointer-events-none và aria-disabled="true"
      const checkbox = screen.getByRole('checkbox', { name: 'TẶNG SÚP MISO' });
      expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      expect(checkbox.className).toContain('pointer-events-none');
      expect(checkbox.className).toContain('cursor-not-allowed');
    });

    it('2.2 & 2.3: Khi thẻ hội viên Gold được chọn, voucher độc quyền bị khóa với pointer-events-none và aria-disabled="true"', async () => {
      const exclusiveVoucher: PublicVoucherItem = {
        id: 501,
        code: 'EXCLUSIVE50K',
        short_name: 'Giảm 50k',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 100000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      };

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={300000}
          campaigns={[]}
          vouchers={[exclusiveVoucher]}
          isMemberCardSelected={true}
          loyaltySettings={{ can_combine_with_promotions: false } as any}
        />
      );

      const voucherCode = await screen.findByText('EXCLUSIVE50K');
      expect(voucherCode).toBeInTheDocument();

      const cardContainer = voucherCode.closest('div[aria-disabled]');
      expect(cardContainer).toBeInTheDocument();
      expect(cardContainer).toHaveAttribute('aria-disabled', 'true');
      expect(cardContainer?.className).toContain('pointer-events-none');
      expect(cardContainer?.className).toContain('opacity-50');

      const checkbox = screen.getByRole('checkbox', { name: 'EXCLUSIVE50K' });
      expect(checkbox).toHaveAttribute('aria-disabled', 'true');
      expect(checkbox.className).toContain('pointer-events-none');
    });
  });

  // NHIỆM VỤ 3 (STT 11 Sheet 5): Mở khóa voucher WSBCT50K & Thông báo điều kiện tối thiểu
  describe('Nhiệm vụ 3: Mở khóa voucher WSBCT50K khi bỏ chọn thẻ thành viên', () => {
    it('3.1: Khi bỏ chọn thẻ thành viên (isMemberCardSelected = false), voucher WSBCT50K không còn bị khóa MUTEX_MEMBER_TIER', async () => {
      const wsbctVoucher: PublicVoucherItem = {
        id: 777,
        code: 'WSBCT50K',
        short_name: 'Giảm 50k',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 200000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      };

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={300000}
          campaigns={[]}
          vouchers={[wsbctVoucher]}
          isMemberCardSelected={false}
          loyaltySettings={{ can_combine_with_promotions: false } as any}
        />
      );

      const voucherCode = await screen.findByText('WSBCT50K');
      expect(voucherCode).toBeInTheDocument();

      // Card container không bị khóa pointer-events-none
      const cardContainer = voucherCode.closest('div.relative');
      expect(cardContainer?.className).not.toContain('pointer-events-none');
      expect(cardContainer).not.toHaveAttribute('aria-disabled', 'true');

      // Checkbox có thể tương tác (aria-disabled="false")
      const checkbox = screen.getByRole('checkbox', { name: 'WSBCT50K' });
      expect(checkbox).toHaveAttribute('aria-disabled', 'false');
      expect(checkbox.className).not.toContain('pointer-events-none');
    });

    it('3.2: Khi giá trị đơn hàng < 200.000 VNĐ, voucher WSBCT50K hiển thị thông báo điều kiện tối thiểu rõ ràng', async () => {
      const wsbctVoucher: PublicVoucherItem = {
        id: 777,
        code: 'WSBCT50K',
        short_name: 'Giảm 50k',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 200000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      };

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={150000}
          campaigns={[]}
          vouchers={[wsbctVoucher]}
          isMemberCardSelected={false}
          loyaltySettings={{ can_combine_with_promotions: false } as any}
        />
      );

      // Hiển thị thông báo điều kiện tối thiểu của mã WSBCT50K
      await waitFor(() => {
        expect(
          screen.getByText(/Đơn hàng tối thiểu 200\.000 VNĐ để áp dụng mã WSBCT50K/i)
        ).toBeInTheDocument();
      });
    });
  });

  // NHIỆM VỤ 4 (STT 14 Sheet 5): Tự động chèn món quà tặng 0đ [TẶNG SÚP MISO] vào đơn hàng
  describe('Nhiệm vụ 4: Tự động chèn món quà tặng 0đ và hiển thị tag chiến dịch', () => {
    it('4.1, 4.2, 4.3: Hiển thị badge quà tặng trên VoucherTicketBar, hiển thị dòng quà tặng 0đ trong summary, và gửi is_gift: true khi tạo đơn', async () => {
      localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([201]));
      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Thấy tóm tắt đơn hàng có món quà tặng Súp Miso Rong Biển và giá 0đ (không gắn tiền tố rối mắt)
      const giftLabel = await screen.findByText('Súp Miso Rong Biển');
      expect(giftLabel).toBeInTheDocument();
      expect(screen.queryByText(/\[Quà tặng đơn hàng\]/i)).not.toBeInTheDocument();

      // Badge chiến dịch quà tặng xuất hiện trên VoucherTicketBar
      expect(screen.getByText('TẶNG SÚP MISO')).toBeInTheDocument();

      // Chọn Tự đến lấy tại chi nhánh để kiểm tra submit order
      const pickupRadios = screen.getAllByRole('radio');
      const pickupRadio = pickupRadios.find((r) => (r as HTMLInputElement).value === 'pickup' || r.closest('label')?.textContent?.includes('Tự đến lấy'));
      if (pickupRadio) {
        fireEvent.click(pickupRadio);
      }

      // Tích chọn xác nhận thông tin
      const confirmCheck = screen.getByTestId('desktop-confirm-checkbox');
      fireEvent.click(confirmCheck);

      // Bấm đặt hàng
      const submitBtn = screen.getByTestId('checkout-submit-btn');
      fireEvent.click(submitBtn);

      // Xác nhận createOrder được gọi với items chứa món quà tặng có is_gift: true và price: 0
      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
        const payload = mockCreateOrder.mock.calls[0][0];
        const giftItem = payload.items.find((item: any) => item.product_name.includes('Súp Miso Rong Biển'));
        expect(giftItem).toBeDefined();
        expect(giftItem.price).toBe(0);
        expect(giftItem.is_gift).toBe(true);
      });
    });
  });

  // NHIỆM VỤ 5 (STT 7 Sheet 5): Ẩn thanh tiến độ freeship khi chọn "Tự đến lấy tại chi nhánh"
  describe('Nhiệm vụ 5: Ẩn SmartCartProgressBar khi deliveryType === "pickup"', () => {
    it('5.1 & 5.2: Thanh tiến độ hiển thị khi giao tận nơi, ẩn khi tự lấy và khôi phục khi chuyển lại giao tận nơi', async () => {
      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Ban đầu: deliveryType === 'delivery' -> Tìm radio giao hàng
      const radios = await screen.findAllByRole('radio');
      const deliveryRadio = radios.find((r) => r.closest('label')?.textContent?.includes('Giao hàng tận nơi'));
      const pickupRadio = radios.find((r) => r.closest('label')?.textContent?.includes('Tự đến lấy tại chi nhánh'));

      expect(deliveryRadio).toBeDefined();
      expect(pickupRadio).toBeDefined();

      // Kiểm tra thanh tiến độ freeship có mặt
      const progressText = await screen.findByText(/Miễn phí ship/i);
      expect(progressText).toBeInTheDocument();

      // Chuyển sang "Tự đến lấy" (pickup)
      fireEvent.click(pickupRadio!);

      // Thanh tiến độ bị ẩn khi pickup
      await waitFor(() => {
        expect(screen.queryByText(/Miễn phí ship/i)).not.toBeInTheDocument();
      });

      // Chuyển lại sang "Giao hàng tận nơi" (delivery)
      fireEvent.click(deliveryRadio!);

      // Thanh tiến độ hiển thị trở lại
      await waitFor(() => {
        expect(screen.getByText(/Miễn phí ship/i)).toBeInTheDocument();
      });
    });
  });
});
