import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import {
  createOrder,
  type ActivePromotion,
  type PromotionGiftItem,
  type CheckoutConfig,
} from '@/services/orderService';
import type { PromotionType, DiscountType, CampaignSettings, PublicCampaignItem } from '@/types/campaign';
import viMessages from '@/i18n/locales/vi.json';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
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
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
  calculateMemberDiscount: () => 0,
}));

// Mock CartContext
let mockCartItems: any[] = [];
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

// Mock BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: 'Chi nhánh Chính', address: '123 Đ. ABC', contactNumber: '0901234567', isActive: true }],
    selectedBranchId: 1,
    setSelectedBranchId: vi.fn(),
  }),
}));

// Mock orderService
let mockConfigData: CheckoutConfig;
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockImplementation(() => Promise.resolve(mockConfigData)),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 25000,
      original_fee: 25000,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
    }),
    createOrder: vi.fn().mockResolvedValue({
      data: {
        order_code: 'ORD-TEST-GIFT',
        status: 'pending',
        payment_status: 'pending',
        subtotal: '120000',
        total: '145000',
        delivery_price: '25000',
        expire_at: '2026-09-22T22:00:00Z',
        qr_url: 'https://example.com/qr.png',
        qr_info: {
          bank_code: 'MB',
          bank_account: '0987654321',
          amount: 145000,
          content: 'ORD-TEST-GIFT',
        },
      },
    }),
  };
});

// Mock GeneralSettings
vi.mock('@/services/generalSettingService', () => ({
  getGeneralSettings: vi.fn().mockResolvedValue(null),
}));

// Mock AuthService
vi.mock('@/services/authService', () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  createCustomerAddressApi: vi.fn().mockResolvedValue(null),
  checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
}));

// Mock operatingHours
vi.mock('@/lib/operatingHours', () => ({
  checkOperatingHours: () => ({ isOpen: true, canOrderNow: true, message: 'Đang mở cửa' }),
  formatVietnameseDate: () => 'Hôm nay',
  generate15MinTimeSlots: () => ['10:00', '10:15'],
  getVietnamDate: () => new Date(),
  isTodayOutOfScheduleSlots: () => false,
  toISODateString: () => '2026-09-22',
}));

// Mock campaignService
let mockCampaignsList: any[] = [];
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockCampaignsList)),
}));

describe('Campaign & Gift Promotions Flow (Frontend Tasks 2 & 3)', () => {
  const giftItemA: PromotionGiftItem = {
    id: 101,
    product_id: 11,
    product_variant_id: null,
    product_code: 'GIFT_A_CODE',
    product_name: 'Canh Chua Tôm Càng',
    image: '/images/canh-chua.jpg',
    original_price: 35000,
    campaign_price: 0,
    is_free: true,
  };

  const giftItemB: PromotionGiftItem = {
    id: 102,
    product_id: 12,
    product_variant_id: null,
    product_code: 'GIFT_B_CODE',
    product_name: 'Trà Sữa Thái Xanh',
    image: '/images/tra-sua.jpg',
    original_price: 25000,
    campaign_price: 0,
    is_free: true,
  };

  const orderGiftPromo: ActivePromotion = {
    id: 1,
    name: 'Tặng món cho đơn từ 100k',
    promotion_type: 'order_gift_discount',
    min_order_value: 100000,
    discount_type: 'fixed',
    discount_value: 0,
    items: [giftItemA, giftItemB],
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  const comboGiftItem: PromotionGiftItem = {
    id: 201,
    product_id: 21,
    product_code: 'COMBO_TRA_DAO',
    product_name: 'Trà Đào Cam Sả',
    image: '/images/tra-dao.jpg',
    original_price: 30000,
    campaign_price: 0,
    is_free: true,
  };

  const buyXGetYPromo: ActivePromotion = {
    id: 2,
    name: 'Mua 2 món tặng 1 Trà Đào',
    promotion_type: 'buy_x_get_y',
    min_order_value: 0,
    discount_type: 'percent',
    discount_value: 100,
    settings: {
      buy_quantity: 2,
      gift_quantity: 1,
    },
    items: [comboGiftItem],
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCouponModalCache();
    mockCartItems = [
      {
        id: 1,
        productId: 1,
        productCode: 'COM_SUON_01',
        title: 'Cơm Sườn Nướng',
        variant: 'Mặc định',
        quantity: 2,
        unitPrice: 65000,
        originalPrice: 65000,
      },
    ];
    mockCampaignsList = [
      {
        id: 1,
        name: 'Tặng món cho đơn từ 100k',
        promotion_type: 'order_gift_discount',
        min_order_value: 100000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [giftItemA, giftItemB],
      },
      {
        id: 2,
        name: 'Mua 2 món tặng 1 Trà Đào',
        promotion_type: 'buy_x_get_y',
        min_order_value: 0,
        settings: {
          buy_quantity: 2,
          gift_quantity: 1,
        },
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [comboGiftItem],
      },
    ];
    mockConfigData = {
      delivery_types: [
        { value: 'delivery', label: 'Giao hàng' },
        { value: 'pickup', label: 'Tự đến lấy' },
      ],
      default_shipping_fee: '25000',
      branches: [
        { id: 1, branchName: 'Chi nhánh 1', address: '123 Đ. ABC', contactNumber: '0901234567', isActive: true },
      ],
      operating_hours: {
        store_open: '08:00',
        store_close: '22:00',
        delivery_open: '08:00',
        delivery_close: '21:30',
        is_store_open: true,
        is_delivery_open: true,
        can_order_now: true,
      },
      active_promotions: [orderGiftPromo, buyXGetYPromo],
    };
  });

  it('Task 2.1 & 2.2: Exported types should conform to strict interfaces', () => {
    const promoType: PromotionType = 'order_gift_discount';
    const discType: DiscountType = 'percent';
    const settings: CampaignSettings = { buy_quantity: 2, gift_quantity: 1 };
    const publicCampaign: PublicCampaignItem = {
      id: 1,
      name: 'Chiến dịch hè',
      promotion_type: promoType,
      discount_type: discType,
      settings,
    };

    expect(promoType).toBe('order_gift_discount');
    expect(publicCampaign.name).toBe('Chiến dịch hè');
    expect(publicCampaign.settings?.buy_quantity).toBe(2);
  });

  it('Task 3.1 & 3.3: Pure checkbox default - no gifts applied until selected in modal', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mặc định selectedCampaignIds = [], không tự động áp dụng quà
    expect(screen.queryByText('Canh Chua Tôm Càng')).not.toBeInTheDocument();
    expect(screen.queryByText('Trà Đào Cam Sả')).not.toBeInTheDocument();

    // Mở modal chọn ưu đãi
    const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
    fireEvent.click(selectButtons[0]);

    // Chọn cả 2 ưu đãi trong modal
    expect(await screen.findByText('Tặng món cho đơn từ 100k')).toBeInTheDocument();
    expect(screen.getByText('Mua 2 món tặng 1 Trà Đào')).toBeInTheDocument();

    const cbGift = screen.getByText('Tặng món cho đơn từ 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbCombo = screen.getByText('Mua 2 món tặng 1 Trà Đào').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    fireEvent.click(cbGift);
    fireEvent.click(cbCombo);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i });
    fireEvent.click(applyBtn);

    // Sau khi áp dụng, quà tặng đơn hàng và quà tặng combo xuất hiện
    await waitFor(() => {
      expect(screen.getAllByText('Canh Chua Tôm Càng').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Trà Đào Cam Sả').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Mua 2 tặng 1/i).length).toBeGreaterThan(0);
    });
  });

  it('Task 3.1: State retention keeps selected gift when config re-fetches', async () => {
    const { rerender } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal chọn quà tặng đơn hàng
    const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
    fireEvent.click(selectButtons[0]);

    expect(await screen.findByText('Tặng món cho đơn từ 100k')).toBeInTheDocument();
    const cbGift = screen.getByText('Tặng món cho đơn từ 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    fireEvent.click(cbGift);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Canh Chua Tôm Càng').length).toBeGreaterThan(0);
    });

    // Đổi sang quà B qua nút thay đổi quà
    const changeGiftButtons = screen.getAllByRole('button', { name: /Đổi món/i });
    expect(changeGiftButtons.length).toBeGreaterThan(0);
    fireEvent.click(changeGiftButtons[0]);

    // Chọn Trà Sữa Thái Xanh trong modal
    await waitFor(() => {
      expect(screen.getAllByText('Trà Sữa Thái Xanh').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText('Trà Sữa Thái Xanh')[0]);

    // Giờ quà đang là Trà Sữa Thái Xanh
    await waitFor(() => {
      expect(screen.getAllByText('Trà Sữa Thái Xanh').length).toBeGreaterThan(0);
    });

    // Giả lập re-fetch config trả về đối tượng config mới
    const newConfigInstance: CheckoutConfig = {
      ...mockConfigData,
      active_promotions: [
        { ...orderGiftPromo, items: [giftItemA, giftItemB] },
        buyXGetYPromo,
      ],
    };
    rerender(<CheckoutForm order={null} config={newConfigInstance} />);

    // Quà được chọn vẫn được giữ nguyên là Trà Sữa Thái Xanh (State Retention), không bị reset về Canh Chua
    await waitFor(() => {
      expect(screen.getAllByText('Trà Sữa Thái Xanh').length).toBeGreaterThan(0);
    });
  });

  it('Task 3.1: Deselecting campaign in modal removes gift and does not auto re-enable on config update', async () => {
    const { rerender } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal chọn quà tặng đơn hàng
    const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
    fireEvent.click(selectButtons[0]);

    expect(await screen.findByText('Tặng món cho đơn từ 100k')).toBeInTheDocument();
    const cbGift = screen.getByText('Tặng món cho đơn từ 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    fireEvent.click(cbGift);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
    fireEvent.click(applyBtn);

    // Món quà hiển thị
    await waitFor(() => {
      expect(screen.getAllByText('Canh Chua Tôm Càng').length).toBeGreaterThan(0);
    });

    // Mở lại modal và bỏ chọn ưu đãi
    const selectButtonsAfter = screen.getAllByRole('button', { name: /Chọn mã/i });
    fireEvent.click(selectButtonsAfter[0]);

    expect(await screen.findByText('Tặng món cho đơn từ 100k')).toBeInTheDocument();
    const cbGiftSelected = screen.getByText('Tặng món cho đơn từ 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    expect(cbGiftSelected).toHaveAttribute('aria-checked', 'true');

    // Click để uncheck
    fireEvent.click(cbGiftSelected);
    expect(cbGiftSelected).toHaveAttribute('aria-checked', 'false');

    // Bấm Bỏ qua ưu đãi và tiếp tục
    const skipBtn = screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i });
    fireEvent.click(skipBtn);

    // Quà tặng bị gỡ khỏi đơn hàng
    await waitFor(() => {
      expect(screen.queryByText('Canh Chua Tôm Càng')).not.toBeInTheDocument();
    });

    // Giả lập config update/re-fetch
    const reloadedConfig: CheckoutConfig = {
      ...mockConfigData,
      active_promotions: [orderGiftPromo, buyXGetYPromo],
    };
    rerender(<CheckoutForm order={null} config={reloadedConfig} />);

    // Quà vẫn không xuất hiện (không tự ý bật lại khi chưa chọn)
    expect(screen.queryByText('Canh Chua Tôm Càng')).not.toBeInTheDocument();
  });

  it('Task 3.1: createOrder sends gift items with price: 0, quantity: 1, and note', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal chọn quà tặng đơn hàng
    const selectButtons = screen.getAllByRole('button', { name: /Chọn mã/i });
    fireEvent.click(selectButtons[0]);

    expect(await screen.findByText('Tặng món cho đơn từ 100k')).toBeInTheDocument();
    const cbGift = screen.getByText('Tặng món cho đơn từ 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    fireEvent.click(cbGift);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Canh Chua Tôm Càng').length).toBeGreaterThan(0);
    });

    // Điền thông tin giao hàng ở cả desktop và mobile
    const nameInputs = screen.getAllByPlaceholderText(/Họ và tên/i);
    const phoneInputs = screen.getAllByPlaceholderText(/Số điện thoại/i);

    nameInputs.forEach((input) => fireEvent.change(input, { target: { value: 'Nguyen Van Test' } }));
    phoneInputs.forEach((input) => fireEvent.change(input, { target: { value: '0987654321' } }));

    // Chọn phương thức nhận: Tự đến lấy tại chi nhánh
    const pickupRadios = screen.getAllByLabelText(/Tự đến lấy tại chi nhánh/i);
    pickupRadios.forEach((r) => fireEvent.click(r));

    // Tích chọn xác nhận thông tin
    const confirmBoxes = screen.getAllByRole('checkbox', { name: /Tôi đã kiểm tra kỹ/i });
    confirmBoxes.forEach((cb) => fireEvent.click(cb));

    // Bấm Đặt hàng
    const submitButtons = screen.getAllByRole('button', { name: /^Đặt hàng$/i });
    submitButtons.forEach((btn) => fireEvent.click(btn));

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalled();
    });

    const callPayload = vi.mocked(createOrder).mock.calls[0][0];
    const giftOrderItems = callPayload.items.filter((item) =>
      item.product_name.includes('[QUÀ TẶNG]')
    );

    expect(giftOrderItems.length).toBe(1);
    const gift = giftOrderItems[0];
    expect(gift.product_id).toBe(11);
    expect(gift.product_code).toBe('GIFT_A_CODE');
    expect(gift.product_name).toBe('[QUÀ TẶNG] Canh Chua Tôm Càng');
    expect(gift.price).toBe(0);
    expect(gift.quantity).toBe(1);
    expect(gift.note).toContain('Quà tặng đơn hàng');
  });

  it('Task 3.4: Does NOT render any same_price_discount badge in UI', async () => {
    const configWithSamePrice: CheckoutConfig = {
      ...mockConfigData,
      active_promotions: [
        ...mockConfigData.active_promotions!,
        {
          id: 99,
          name: 'Đồng giá 59k',
          promotion_type: 'same_price_discount',
          min_order_value: 0,
          discount_type: 'fixed',
          discount_value: 59000,
          items: [],
        },
      ],
    };

    render(<CheckoutForm order={null} config={configWithSamePrice} />);

    await waitFor(() => {
      expect(screen.getAllByText('Cơm Sườn Nướng').length).toBeGreaterThan(0);
    });

    // Tuyệt đối không hiển thị badge Đồng giá hoặc same_price_discount
    expect(screen.queryByText(/Đồng giá 59k/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/same_price/i)).not.toBeInTheDocument();
  });
});
