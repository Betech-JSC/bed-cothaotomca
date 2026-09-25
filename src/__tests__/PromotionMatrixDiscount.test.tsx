import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import FloatingVoucherButton from '@/components/Voucher/FloatingVoucherButton';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import SmartCartProgressBar from '@/components/Cart/SmartCartProgressBar';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import {
  PublicVoucherItem,
  ActivePromotion,
  calculateShippingFee,
} from '@/services/orderService';
import viMessages from '@/i18n/locales/vi.json';

// Mock routing and pathname
let currentMockPathname = '/';
vi.mock('@/i18n/routing', () => ({
  usePathname: () => currentMockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

// Mock next/navigation for fallback
vi.mock('next/navigation', () => ({
  usePathname: () => currentMockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

    t.rich = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values && values.strong) {
        return text;
      }
      return text;
    };

    return t;
  },
}));

// Mock AuthContext
let mockCurrentUser: any = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    token: 'mock-token',
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
  calculateMemberDiscount: () => 0,
}));

// Mock CartContext
let mockCartItems: any[] = [];
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    subtotal: mockCartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    hasOutOfStockItems: false,
  }),
}));

// Mock campaignService
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

// Mock generalSettingService
vi.mock('@/services/generalSettingService', () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
}));

// Mock authService
vi.mock('@/services/authService', () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  createCustomerAddressApi: vi.fn().mockResolvedValue({}),
}));

// Mock orderService
let mockVouchersList: PublicVoucherItem[] = [];
let mockShippingResult: any = {
  shipping_fee: 0,
  original_fee: 30000,
  shipping_discount: 30000,
  is_freeship: true,
  is_deliverable: true,
  is_configured_area: true,
  branch_id: 1,
  branch_name: 'Chi nhánh 1',
  message: null,
};

let lastCalculateShippingPayload: any = null;

vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
    getShippingSettings: vi.fn().mockResolvedValue({
      min_order_amount: 300000,
      is_min_amount_enabled: true,
      shipping_discount_type: 'free',
      shipping_discount_value: 0,
      default_shipping_fee: 30000,
      card_title: 'Ưu đãi freeship',
      card_badge: 'Freeship đơn từ 300k',
    }),
    getAdministrativeUnits: vi.fn().mockResolvedValue([
      {
        id: '79',
        name: 'TP. Hồ Chí Minh',
        wards: [{ id: '001', name: 'Phường Bến Nghé' }],
      },
    ]),
    calculateShippingFee: vi.fn().mockImplementation((payload) => {
      lastCalculateShippingPayload = payload;
      return Promise.resolve(mockShippingResult);
    }),
    validateVoucher: vi.fn().mockImplementation((code: string) => {
      const v = mockVouchersList.find((item) => item.code.toUpperCase() === code.toUpperCase());
      if (v) {
        return Promise.resolve({
          valid: true,
          voucher: {
            id: v.id,
            code: v.code,
            value: v.value,
            discount_type: v.discount_type,
            max_discount: v.max_discount,
            campaign_id: v.campaign_id || 1,
            campaign_name: v.campaign_name || 'Voucher Campaign',
            prereq_price: v.prereq_price,
            is_freeship: v.is_freeship,
            can_combine_with_promotions: v.can_combine_with_promotions,
            can_combine_with_freeship: v.can_combine_with_freeship,
          },
          message: 'Áp dụng mã giảm giá thành công!',
        });
      }
      return Promise.resolve({
        valid: false,
        message: 'Mã không tồn tại',
      });
    }),
    createOrder: vi.fn().mockResolvedValue({ data: { order_code: 'ORD-123' } }),
  };
});

describe('OpenSpec complete-discount-matrix-and-ui Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCouponModalCache();
    currentMockPathname = '/';
    mockCurrentUser = null;
    mockVouchersList = [];
    lastCalculateShippingPayload = null;
    mockShippingResult = {
      shipping_fee: 0,
      original_fee: 30000,
      shipping_discount: 30000,
      is_freeship: true,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 1,
      branch_name: 'Chi nhánh 1',
      message: null,
    };
  });

  // =========================================================================
  // Nhóm 2: UI / UX Refinement
  // =========================================================================
  describe('Nhóm 2: UI/UX Refinements', () => {
    it('Task 2.1: FloatingVoucherButton ẩn hoàn toàn trên route /cart và /checkout với mọi locale', () => {
      // On public home page: visible
      currentMockPathname = '/';
      const { container, rerender } = render(<FloatingVoucherButton />);
      expect(container.querySelector('button')).not.toBeNull();

      // On /cart: hidden
      currentMockPathname = '/cart';
      rerender(<FloatingVoucherButton />);
      expect(container.firstChild).toBeNull();

      // On /vi/cart: hidden
      currentMockPathname = '/vi/cart';
      rerender(<FloatingVoucherButton />);
      expect(container.firstChild).toBeNull();

      // On /checkout: hidden
      currentMockPathname = '/checkout';
      rerender(<FloatingVoucherButton />);
      expect(container.firstChild).toBeNull();

      // On /en/checkout: hidden
      currentMockPathname = '/en/checkout';
      rerender(<FloatingVoucherButton />);
      expect(container.firstChild).toBeNull();

      // On /menu: visible
      currentMockPathname = '/vi/menu';
      rerender(<FloatingVoucherButton />);
      expect(container.querySelector('button')).not.toBeNull();
    });

    it('Task 2.2: CheckoutForm bỏ nút text phụ "Chọn hoặc xem mã ›" ở tiêu đề, chỉ giữ 1 nút "Chọn mã" ở ô input', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 350000,
          quantity: 1,
        },
      ];

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: [{ id: 1, branchName: 'Chi nhánh 1', address: '123 Đường 1', contactNumber: '0901234567', isActive: true }],
            active_promotions: [],
          }}
        />
      );

      // Check header button "Chọn hoặc xem mã ›" does NOT exist
      expect(screen.queryByText(/Chọn hoặc xem mã/i)).toBeNull();

      // Single "Chọn mã" button exists
      const selectBtn = screen.getByRole('button', { name: /Chọn mã/i });
      expect(selectBtn).toBeInTheDocument();
    });

    it('Task 2.3 & 2.4: CouponModal phân 2 tầng rõ rệt và giữ mã G2 can_combine_with_promotions = false ở Tầng 1 khi đủ originalSubtotal', async () => {
      const eligibleVoucher: PublicVoucherItem = {
        id: 1,
        code: 'VOUCHER_ELIGIBLE',
        discount_type: 'fixed',
        value: 20000,
        prereq_price: 200000,
        description: 'Giảm 20k đơn từ 200k',
      };

      const nonCombineVoucher: PublicVoucherItem = {
        id: 2,
        code: 'VOUCHER_NO_COMBO',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 300000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        description: 'Giảm 50k không cộng gộp đơn từ 300k',
      };

      const ineligibleVoucher: PublicVoucherItem = {
        id: 3,
        code: 'VOUCHER_EXPENSIVE',
        discount_type: 'fixed',
        value: 100000,
        prereq_price: 500000,
        description: 'Giảm 100k đơn từ 500k',
      };

      mockVouchersList = [eligibleVoucher, nonCombineVoucher, ineligibleVoucher];

      const activeCampaigns: ActivePromotion[] = [
        {
          id: 10,
          name: 'Campaign G1 Giảm 10%',
          promotion_type: 'order_discount',
          min_order_value: 200000,
          discount_type: 'percent',
          discount_value: 10,
          can_combine_with_promotions: true,
          can_combine_with_freeship: true,
          items: [],
        },
      ];

      // Cart with originalSubtotal = 320,000đ, subtotal after G1 = 288,000đ
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={288000}
          originalSubtotal={320000}
          shippingFee={30000}
          activePromotions={activeCampaigns}
          onApplyVoucher={vi.fn()}
        />
      );

      // Verify Header Tầng 2 (Mã giảm giá): gom toàn bộ 3 voucher (2 đủ điều kiện + 1 chưa đủ điều kiện)
      expect(await screen.findByText(/Mã giảm giá \(3\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Mã chưa đủ điều kiện/i)).toBeNull();
      expect(screen.queryByText(/khả dụng/i)).toBeNull();

      // VOUCHER_NO_COMBO is in Tầng 1 (Khả dụng) because originalSubtotal (320k) >= prereq (300k)
      expect(screen.getByText('VOUCHER_NO_COMBO')).toBeInTheDocument();

      // VOUCHER_EXPENSIVE is in Tầng 2 (Chưa đủ điều kiện) with missing amount
      expect(screen.getByText('VOUCHER_EXPENSIVE')).toBeInTheDocument();
      expect(screen.getByText(/Chưa đạt giá trị đơn tối thiểu/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Nhóm 3: Ma trận 6 Test Cases Khuyến mãi & Giảm giá
  // =========================================================================
  describe('Nhóm 3: Promotion & Discount Matrix 6 Test Cases', () => {
    const baseBranches = [
      { id: 1, branchName: 'Chi nhánh 1', address: '123 Đường 1', contactNumber: '0901234567', isActive: true },
    ];

    it('Case 1: G1 + G2 [promo: true, ship: true] + G3 -> Cả 3 cùng áp dụng, text xanh thành công', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 11,
        name: 'CTKM Giảm 20k đơn 300k',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [],
      };

      const g2Voucher: PublicVoucherItem = {
        id: 21,
        code: 'G2_ALL_TRUE',
        discount_type: 'fixed',
        value: 30000,
        prereq_price: 300000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      };
      mockVouchersList = [g2Voucher];

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // Input G2 voucher
      const input = screen.getByPlaceholderText(/Mã Voucher/i);
      fireEvent.change(input, { target: { value: 'G2_ALL_TRUE' } });

      const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });
      fireEvent.click(applyBtn);

      // Check success text
      expect(await screen.findByText('Áp dụng mã giảm giá thành công!')).toBeInTheDocument();

      // G1 is still applied
      expect(screen.getByText('CTKM Giảm 20k đơn 300k')).toBeInTheDocument();

      // No shipping restriction notice
      expect(screen.queryByText(/không áp dụng cùng chương trình giảm phí vận chuyển/i)).toBeNull();
    });

    it('Case 2: G1 + G2 [promo: false, ship: true] + G3 -> Tạm gỡ G1, giữ G2 + G3, inline thông báo ưu tiên mã, gỡ [X] phục hồi G1', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 12,
        name: 'CTKM Giảm 20k',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [],
      };

      const g2Voucher: PublicVoucherItem = {
        id: 22,
        code: 'G2_NO_PROMO',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 300000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      };
      mockVouchersList = [g2Voucher];

      const { container } = render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // Before voucher: G1 is applied
      expect(screen.getByText('CTKM Giảm 20k')).toBeInTheDocument();

      // Apply G2
      const input = screen.getByPlaceholderText(/Mã Voucher/i);
      fireEvent.change(input, { target: { value: 'G2_NO_PROMO' } });
      fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

      // Inline banner under voucher input
      expect(
        await screen.findByText(/Mã G2_NO_PROMO không áp dụng đồng thời với CTKM khác\. Đã ưu tiên áp dụng theo mã của bạn\./i)
      ).toBeInTheDocument();

      // G1 is temporarily suppressed
      expect(screen.queryByText('CTKM Giảm 20k')).toBeNull();

      // G3 (freeship) maintained, no shipping notice
      expect(screen.queryByText(/không áp dụng cùng chương trình giảm phí vận chuyển/i)).toBeNull();

      // Remove voucher [X]
      const removeBtn = container.querySelector('button.bg-red-50')!;
      fireEvent.click(removeBtn);

      // G1 is restored
      expect(await screen.findByText('CTKM Giảm 20k')).toBeInTheDocument();
    });

    it('Case 3: G1 + G2 [promo: true, ship: false] + G3 -> G1 + G2, mất G3 (phí gốc), inline đỏ dưới phí ship, gỡ [X] phục hồi G3', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 13,
        name: 'CTKM Giảm 20k',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [],
      };

      const g2Voucher: PublicVoucherItem = {
        id: 23,
        code: 'G2_NO_SHIP',
        discount_type: 'fixed',
        value: 30000,
        prereq_price: 300000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: false,
      };
      mockVouchersList = [g2Voucher];

      const { container } = render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // Apply G2
      const input = screen.getByPlaceholderText(/Mã Voucher/i);
      fireEvent.change(input, { target: { value: 'G2_NO_SHIP' } });
      fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

      // G1 and G2 applied
      expect(await screen.findByText('CTKM Giảm 20k')).toBeInTheDocument();

      // Red inline notice under shipping fee
      expect(
        await screen.findByText(/Mã G2_NO_SHIP không áp dụng cùng chương trình giảm phí vận chuyển\./i)
      ).toBeInTheDocument();

      // Remove voucher [X] -> Shipping fee notice disappears
      const removeBtn = container.querySelector('button.bg-red-50')!;
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Mã G2_NO_SHIP không áp dụng cùng chương trình giảm phí vận chuyển\./i)).toBeNull();
      });
    });

    it('Case 4: G1 + G2 [promo: false, ship: false] + G3 -> Gỡ cả G1 và G3, hiện cả 2 dòng thông báo inline', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 14,
        name: 'CTKM Giảm 20k',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [],
      };

      const g2Voucher: PublicVoucherItem = {
        id: 24,
        code: 'G2_NO_BOTH',
        discount_type: 'fixed',
        value: 60000,
        prereq_price: 300000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: false,
      };
      mockVouchersList = [g2Voucher];

      const { container } = render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // Apply G2
      const input = screen.getByPlaceholderText(/Mã Voucher/i);
      fireEvent.change(input, { target: { value: 'G2_NO_BOTH' } });
      fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

      // G1 is suppressed
      await waitFor(() => {
        expect(screen.queryByText('CTKM Giảm 20k')).toBeNull();
      });

      expect(
        await screen.findByText(/Mã G2_NO_BOTH không áp dụng đồng thời với CTKM khác/i)
      ).toBeInTheDocument();

      expect(
        await screen.findByText(/Mã G2_NO_BOTH không hỗ trợ giảm phí ship/i)
      ).toBeInTheDocument();

      // Remove voucher [X] -> Both G1 and G3 restored
      const removeBtn = container.querySelector('button.bg-red-50')!;
      fireEvent.click(removeBtn);

      expect(await screen.findByText('CTKM Giảm 20k')).toBeInTheDocument();
      expect(screen.queryByText(/không áp dụng cùng chương trình giảm phí vận chuyển/i)).toBeNull();
    });

    it('Case 5: Campaign G1 can_combine_with_freeship = false, chưa add G2 -> Hưởng G1, tính phí ship gốc, hiện text inline đỏ dưới ship', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 15,
        name: 'Siêu Sale Không Freeship',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 30000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: false,
        items: [],
      };

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // G1 is applied
      expect(screen.getByText('Siêu Sale Không Freeship')).toBeInTheDocument();

      // Red inline notice under shipping fee
      expect(
        await screen.findByText(/CTKM Siêu Sale Không Freeship không áp dụng cùng chương trình giảm phí vận chuyển\./i)
      ).toBeInTheDocument();
    });

    it('Case 6: G1 chặn ship, khách add G2 [promo: false, ship: true] -> Gỡ G1, áp dụng G2 và kích hoạt lại ship G3', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 16,
        name: 'Đại Tiệc Cấm Ship',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: false,
        items: [],
      };

      const g2Voucher: PublicVoucherItem = {
        id: 26,
        code: 'G2_RESTORE_SHIP',
        discount_type: 'fixed',
        value: 40000,
        prereq_price: 300000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      };
      mockVouchersList = [g2Voucher];

      const { container } = render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      // Initially in Case 5
      expect(screen.getByText('Đại Tiệc Cấm Ship')).toBeInTheDocument();
      expect(
        (await screen.findAllByText(/CTKM Đại Tiệc Cấm Ship không áp dụng cùng chương trình giảm phí vận chuyển\./i)).length
      ).toBeGreaterThanOrEqual(1);

      // Apply G2
      const input = screen.getByPlaceholderText(/Mã Voucher/i);
      fireEvent.change(input, { target: { value: 'G2_RESTORE_SHIP' } });
      fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

      // Inline banner under voucher input
      expect(
        await screen.findByText(
          /Mã G2_RESTORE_SHIP không áp dụng đồng thời với CTKM khác\. Đã kích hoạt lại ưu đãi giảm phí vận chuyển cho bạn\./i
        )
      ).toBeInTheDocument();

      const voucherRemoveBtn = screen.getAllByRole('button').find(
        (b) => b.textContent?.trim() === 'Xóa' && b.className.includes('bg-red-50')
      )!;
      fireEvent.click(voucherRemoveBtn);

      expect(
        (await screen.findAllByText(/CTKM Đại Tiệc Cấm Ship không áp dụng cùng chương trình giảm phí vận chuyển\./i)).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('Task 3.7: calculateShippingFee nhận đầy đủ campaign_id và campaign_can_combine_with_freeship', async () => {
      mockCartItems = [
        {
          productId: 1,
          productCode: 'SP01',
          slug: 'sp01',
          categorySlug: 'cat1',
          title: 'Sản phẩm 1',
          imageUrl: '',
          variant: 'default',
          unitPrice: 400000,
          quantity: 1,
        },
      ];

      const g1Campaign: ActivePromotion = {
        id: 999,
        name: 'Campaign Test Params',
        promotion_type: 'order_discount',
        min_order_value: 300000,
        discount_type: 'fixed',
        discount_value: 20000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: false,
        items: [],
      };

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: 'delivery', label: 'Giao tận nơi' }],
            default_shipping_fee: '30000',
            branches: baseBranches,
            active_promotions: [g1Campaign],
          }}
        />
      );

      await waitFor(() => {
        expect(lastCalculateShippingPayload).not.toBeNull();
      });

      expect(lastCalculateShippingPayload.campaign_id).toBe(999);
      expect(lastCalculateShippingPayload.campaign_can_combine_with_freeship).toBe(false);
    });
  });

  // =========================================================================
  // Nhóm 4: SmartCartProgressBar
  // =========================================================================
  describe('Nhóm 4: SmartCartProgressBar Cleanup & Combination', () => {
    it('Task 4.1 & 4.2: Tự động ẩn SmartCartProgressBar khi voucher hoặc campaign cấm freeship', () => {
      // Normal state
      const { rerender, container } = render(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
        />
      );
      expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();

      // Voucher cấm freeship -> tự động ẩn để tránh khung đỏ dư thừa
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedVoucher={{
            id: 1,
            code: 'NO_SHIP',
            discount_type: 'fixed',
            value: 20000,
            can_combine_with_freeship: false,
          } as any}
        />
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá/i)).toBeNull();

      // Campaign cấm freeship -> tự động ẩn
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedCampaign={{
            name: 'Đại tiệc',
            can_combine_with_freeship: false,
          }}
        />
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/không áp dụng cùng/i)).toBeNull();
    });

    it('Task 2: SmartCartProgressBar tự động ẩn khi có appliedShippingVoucher và hiển thị lại khi gỡ mã', () => {
      const { rerender, container } = render(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedShippingVoucher={null}
        />
      );
      expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();

      // Khi áp dụng mã freeship -> ẩn hoàn toàn (DOM rỗng / return null)
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedShippingVoucher={{
            id: 99,
            code: 'FREESHIPMAX',
            is_freeship: true,
            discount_type: 'freeship',
            value: 0,
          }}
        />
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/Mua thêm/i)).not.toBeInTheDocument();

      // Khi gỡ mã ship -> tự động hiển thị trở lại
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedShippingVoucher={null}
        />
      );
      expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
    });
  });
});
