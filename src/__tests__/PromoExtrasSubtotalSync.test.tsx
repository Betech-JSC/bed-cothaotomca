import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import { formatPrice } from '@/lib/format';
import {
  createOrder,
  calculateVoucherDiscount,
  type ActivePromotion,
  type PromotionGiftItem,
  type CheckoutConfig,
  type AppliedVoucherState,
} from '@/services/orderService';
import viMessages from '@/i18n/locales/vi.json';

// --- Mock routing ---
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// --- Mock next-intl ---
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

// --- Mock AuthContext ---
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
  calculateMemberDiscount: () => 0,
}));

// --- Mock CartContext ---
let mockCartItems: any[] = [];
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

// --- Mock BranchContext ---
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [
      {
        id: 1,
        branchName: 'Chi nhánh Chính',
        address: '123 Đ. ABC',
        contactNumber: '0901234567',
        isActive: true,
      },
    ],
    selectedBranchId: 1,
    setSelectedBranchId: vi.fn(),
  }),
}));

// --- Mock orderService ---
let mockConfigData: CheckoutConfig;
let mockCampaignsList: any[] = [];

vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>(
    '@/services/orderService'
  );
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockImplementation(() => Promise.resolve(mockConfigData)),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 0,
      original_fee: 0,
      is_freeship: false,
      message: null,
    }),
    createOrder: vi.fn().mockResolvedValue({
      success: true,
      order: {
        id: 9999,
        code: 'DH9999',
        total: 709000,
      },
    }),
  };
});

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockCampaignsList)),
}));

/**
 * Reusable summary display logic matching CheckoutForm and MobileCartFlow
 */
function OrderSummaryModel({
  subtotal,
  promoItemsExtraPrice,
  foodVoucherDiscount = 0,
  autoOrderDiscountAmount = 0,
  memberDiscount = 0,
  effectiveShippingFee = 0,
}: {
  subtotal: number;
  promoItemsExtraPrice: number;
  foodVoucherDiscount?: number;
  autoOrderDiscountAmount?: number;
  memberDiscount?: number;
  effectiveShippingFee?: number;
}) {
  const displaySubtotal = subtotal + promoItemsExtraPrice;
  const total = Math.max(
    0,
    displaySubtotal - foodVoucherDiscount - autoOrderDiscountAmount - memberDiscount + effectiveShippingFee
  );

  return (
    <div data-testid="summary-box">
      <div data-testid="subtotal-row">
        <span>Tạm tính</span>
        <span data-testid="subtotal-value">{formatPrice(displaySubtotal)}</span>
      </div>
      <div data-testid="total-row">
        <span>Tổng thanh toán</span>
        <span data-testid="total-value">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

describe('Promo Extras in Subtotal & Payload Sync (change: include-promo-extras-in-subtotal)', () => {
  // Món quà có phụ thu 50.000đ (ví dụ Tôm sú nướng muối ớt S)
  const paidGiftItem: PromotionGiftItem = {
    id: 101,
    product_id: 88,
    product_variant_id: null,
    product_code: 'GIFT_TOM_SU_S',
    product_name: 'Tôm sú nướng muối ớt (S)',
    image: '/images/tom-su.jpg',
    original_price: 120000,
    campaign_price: 50000,
    is_free: false,
  };

  // Món quà 0đ mặc định
  const freeGiftItem: PromotionGiftItem = {
    id: 102,
    product_id: 89,
    product_variant_id: null,
    product_code: 'GIFT_CANH_CHUA',
    product_name: 'Canh Chua Tôm Càng',
    image: '/images/canh-chua.jpg',
    original_price: 35000,
    campaign_price: 0,
    is_free: true,
  };

  // Món combo Buy X Get Y có phụ thu 20.000đ
  const buyXGetYPaidItem: PromotionGiftItem = {
    id: 201,
    product_id: 90,
    product_code: 'COMBO_TRA_DAO',
    product_name: 'Trà Đào Cam Sả Đặc Biệt',
    image: '/images/tra-dao.jpg',
    original_price: 35000,
    campaign_price: 20000,
    is_free: false,
  };

  const giftCampaign: ActivePromotion = {
    id: 1,
    name: 'Tặng món đơn từ 500k',
    promotion_type: 'order_gift_discount',
    min_order_value: 500000,
    discount_type: 'fixed',
    discount_value: 0,
    items: [freeGiftItem, paidGiftItem],
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  const buyXGetYCampaign: ActivePromotion = {
    id: 2,
    name: 'Mua 2 món tặng Trà Đào phụ thu 20k',
    promotion_type: 'buy_x_get_y',
    min_order_value: 0,
    discount_type: 'percent',
    discount_value: 100,
    settings: {
      buy_quantity: 2,
      gift_quantity: 1,
    },
    items: [buyXGetYPaidItem],
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCouponModalCache();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Giỏ hàng 3 món chính: Ghẹ 450k + Cá hồi 150k + Trứng 59k = 659.000đ
    mockCartItems = [
      {
        id: 1,
        productId: 10,
        productCode: 'GHE_450',
        title: 'Ghẹ hấp bia',
        variant: 'Mặc định',
        quantity: 1,
        unitPrice: 450000,
        originalPrice: 450000,
      },
      {
        id: 2,
        productId: 11,
        productCode: 'CA_HOI_150',
        title: 'Cá hồi sốt cam',
        variant: 'Mặc định',
        quantity: 1,
        unitPrice: 150000,
        originalPrice: 150000,
      },
      {
        id: 3,
        productId: 12,
        productCode: 'TRUNG_59',
        title: 'Trứng cuộn phô mai',
        variant: 'Mặc định',
        quantity: 1,
        unitPrice: 59000,
        originalPrice: 59000,
      },
    ];

    mockCampaignsList = [giftCampaign, buyXGetYCampaign];

    mockConfigData = {
      branches: [
        {
          id: 1,
          branchName: 'Chi nhánh Chính',
          address: '123 Đ. ABC',
          contactNumber: '0901234567',
          isActive: true,
        },
      ],
      active_promotions: [giftCampaign, buyXGetYCampaign],
    };
  });

  describe('Mathematical & Render Logic Scenarios', () => {
    it('Scenario 1: Quà tặng có phụ thu 50k -> displaySubtotal = 709k, total = 709k, khớp 100%', () => {
      const baseSubtotal = 659000;
      const promoItemsExtraPrice = 50000;
      const displaySubtotal = baseSubtotal + promoItemsExtraPrice;
      const total = Math.max(0, displaySubtotal - 0 - 0 - 0 + 0);

      expect(displaySubtotal).toBe(709000);
      expect(total).toBe(709000);

      render(
        <OrderSummaryModel
          subtotal={baseSubtotal}
          promoItemsExtraPrice={promoItemsExtraPrice}
        />
      );

      expect(screen.getByTestId('subtotal-value')).toHaveTextContent('709.000 VNĐ');
      expect(screen.getByTestId('total-value')).toHaveTextContent('709.000 VNĐ');
    });

    it('Scenario 2: Quà tặng miễn phí 0đ -> displaySubtotal = 659k, total = 659k', () => {
      const baseSubtotal = 659000;
      const promoItemsExtraPrice = 0;
      const displaySubtotal = baseSubtotal + promoItemsExtraPrice;
      const total = Math.max(0, displaySubtotal - 0 - 0 - 0 + 0);

      expect(displaySubtotal).toBe(659000);
      expect(total).toBe(659000);

      render(
        <OrderSummaryModel
          subtotal={baseSubtotal}
          promoItemsExtraPrice={promoItemsExtraPrice}
        />
      );

      expect(screen.getByTestId('subtotal-value')).toHaveTextContent('659.000 VNĐ');
      expect(screen.getByTestId('total-value')).toHaveTextContent('659.000 VNĐ');
    });

    it('Scenario 3: Combo Buy X Get Y có phụ thu 20k -> displaySubtotal = 679k, total = 679k', () => {
      const baseSubtotal = 659000;
      const promoItemsExtraPrice = 20000;
      const displaySubtotal = baseSubtotal + promoItemsExtraPrice;
      const total = Math.max(0, displaySubtotal - 0 - 0 - 0 + 0);

      expect(displaySubtotal).toBe(679000);
      expect(total).toBe(679000);

      render(
        <OrderSummaryModel
          subtotal={baseSubtotal}
          promoItemsExtraPrice={promoItemsExtraPrice}
        />
      );

      expect(screen.getByTestId('subtotal-value')).toHaveTextContent('679.000 VNĐ');
      expect(screen.getByTestId('total-value')).toHaveTextContent('679.000 VNĐ');
    });

    it('Scenario 4: Kết hợp quà phụ thu 50k, voucher món giảm 50k và phí ship 25k -> displaySubtotal = 709k, total = 684k', () => {
      const baseSubtotal = 659000;
      const promoItemsExtraPrice = 50000;
      const foodVoucherDiscount = 50000;
      const effectiveShippingFee = 25000;

      const displaySubtotal = baseSubtotal + promoItemsExtraPrice;
      const total = Math.max(0, displaySubtotal - foodVoucherDiscount + effectiveShippingFee);

      expect(displaySubtotal).toBe(709000);
      expect(total).toBe(684000); // 709k - 50k + 25k = 684k

      render(
        <OrderSummaryModel
          subtotal={baseSubtotal}
          promoItemsExtraPrice={promoItemsExtraPrice}
          foodVoucherDiscount={foodVoucherDiscount}
          effectiveShippingFee={effectiveShippingFee}
        />
      );

      expect(screen.getByTestId('subtotal-value')).toHaveTextContent('709.000 VNĐ');
      expect(screen.getByTestId('total-value')).toHaveTextContent('684.000 VNĐ');
    });
  });

  describe('Integration with CheckoutForm', () => {
    it('Order Summary Tạm tính displays displaySubtotal (709.000 VNĐ) when paid gift item is selected', async () => {
      const paidGiftCampaign = {
        ...giftCampaign,
        items: [paidGiftItem],
      };
      mockCampaignsList = [paidGiftCampaign];
      mockConfigData = {
        ...mockConfigData,
        active_promotions: [paidGiftCampaign],
      };

      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Mở modal chọn quà tặng
      const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
      fireEvent.click(selectButtons[0]);

      expect(await screen.findByText('Tặng món đơn từ 500k')).toBeInTheDocument();
      const cbGift = screen
        .getByText('Tặng món đơn từ 500k')
        .closest('div[class*="rounded-2xl"]')!
        .querySelector('[role="checkbox"]')!;
      fireEvent.click(cbGift);

      const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
      fireEvent.click(applyBtn);

      // Chờ quà tặng xuất hiện trong giỏ
      await waitFor(() => {
        expect(screen.getAllByText('Tôm sú nướng muối ớt (S)').length).toBeGreaterThan(0);
      });

      // Kiểm tra dòng Tạm tính trong Hộp tính giá (Order Summary)
      // Base subtotal = 659k, promoItemsExtraPrice = 50k -> displaySubtotal = 709k
      await waitFor(() => {
        const subtotalElements = screen.getAllByText('709.000 VNĐ');
        expect(subtotalElements.length).toBeGreaterThan(0);
      });
    });

    it('Scenario 5: Payload gửi Backend phản ánh đúng price: 50000 của món quà phụ thu', async () => {
      const paidGiftCampaign = {
        ...giftCampaign,
        items: [paidGiftItem],
      };
      mockCampaignsList = [paidGiftCampaign];
      mockConfigData = {
        ...mockConfigData,
        active_promotions: [paidGiftCampaign],
      };

      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Chọn ưu đãi quà tặng
      const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
      fireEvent.click(selectButtons[0]);

      expect(await screen.findByText('Tặng món đơn từ 500k')).toBeInTheDocument();
      const cbGift = screen
        .getByText('Tặng món đơn từ 500k')
        .closest('div[class*="rounded-2xl"]')!
        .querySelector('[role="checkbox"]')!;
      fireEvent.click(cbGift);

      const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Tôm sú nướng muối ớt (S)').length).toBeGreaterThan(0);
      });

      // Điền thông tin giao hàng
      const nameInputs = screen.getAllByPlaceholderText(/Họ và tên/i);
      const phoneInputs = screen.getAllByPlaceholderText(/Số điện thoại/i);
      nameInputs.forEach((input) => fireEvent.change(input, { target: { value: 'Tran Van A' } }));
      phoneInputs.forEach((input) => fireEvent.change(input, { target: { value: '0912345678' } }));

      // Chọn Tự đến lấy tại chi nhánh
      const pickupRadios = screen.getAllByLabelText(/Tự đến lấy tại chi nhánh/i);
      pickupRadios.forEach((r) => fireEvent.click(r));

      // Tích checkbox xác nhận
      const confirmBoxes = screen.getAllByRole('checkbox', { name: /Tôi đã kiểm tra kỹ/i });
      confirmBoxes.forEach((cb) => fireEvent.click(cb));

      // Bấm Đặt hàng
      const submitButtons = screen.getAllByRole('button', { name: /^Đặt hàng$/i });
      submitButtons.forEach((btn) => fireEvent.click(btn));

      await waitFor(() => {
        expect(createOrder).toHaveBeenCalled();
      });

      const callPayload = vi.mocked(createOrder).mock.calls[0][0];
      const giftItemInPayload = callPayload.items.find((item) =>
        item.product_name.includes('[QUÀ TẶNG]')
      );

      expect(giftItemInPayload).toBeDefined();
      expect(giftItemInPayload!.product_id).toBe(88);
      expect(giftItemInPayload!.product_name).toBe('[QUÀ TẶNG] Tôm sú nướng muối ớt (S)');
      // Đơn giá trong payload gửi lên backend PHẢI LÀ 50.000đ (thay vì bị gán cứng 0đ)
      expect(giftItemInPayload!.price).toBe(50000);
      expect(giftItemInPayload!.quantity).toBe(1);
      expect(giftItemInPayload!.note).toContain('Tặng món đơn từ 500k');
    });

    it('Payload gửi Backend gán price: 0 khi món quà là miễn phí hoàn toàn (campaign_price = 0)', async () => {
      const freeGiftCampaign = {
        ...giftCampaign,
        items: [freeGiftItem],
      };
      mockCampaignsList = [freeGiftCampaign];
      mockConfigData = {
        ...mockConfigData,
        active_promotions: [freeGiftCampaign],
      };

      render(<CheckoutForm order={null} config={mockConfigData} />);

      // Chọn quà tặng miễn phí
      const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
      fireEvent.click(selectButtons[0]);

      expect(await screen.findByText('Tặng món đơn từ 500k')).toBeInTheDocument();
      const cbGift = screen
        .getByText('Tặng món đơn từ 500k')
        .closest('div[class*="rounded-2xl"]')!
        .querySelector('[role="checkbox"]')!;
      fireEvent.click(cbGift);

      const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Canh Chua Tôm Càng').length).toBeGreaterThan(0);
      });

      // Điền thông tin
      const nameInputs = screen.getAllByPlaceholderText(/Họ và tên/i);
      const phoneInputs = screen.getAllByPlaceholderText(/Số điện thoại/i);
      nameInputs.forEach((input) => fireEvent.change(input, { target: { value: 'Le Thi B' } }));
      phoneInputs.forEach((input) => fireEvent.change(input, { target: { value: '0988776655' } }));

      const pickupRadios = screen.getAllByLabelText(/Tự đến lấy tại chi nhánh/i);
      pickupRadios.forEach((r) => fireEvent.click(r));

      const confirmBoxes = screen.getAllByRole('checkbox', { name: /Tôi đã kiểm tra kỹ/i });
      confirmBoxes.forEach((cb) => fireEvent.click(cb));

      const submitButtons = screen.getAllByRole('button', { name: /^Đặt hàng$/i });
      submitButtons.forEach((btn) => fireEvent.click(btn));

      await waitFor(() => {
        expect(createOrder).toHaveBeenCalled();
      });

      const callPayload = vi.mocked(createOrder).mock.calls[0][0];
      const giftItemInPayload = callPayload.items.find((item) =>
        item.product_name.includes('[QUÀ TẶNG]')
      );

      expect(giftItemInPayload).toBeDefined();
      expect(giftItemInPayload!.product_id).toBe(89);
      expect(giftItemInPayload!.price).toBe(0);
    });
  });
});
