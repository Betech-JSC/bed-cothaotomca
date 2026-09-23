import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import {
  type ActivePromotion,
  type CheckoutConfig,
  type PublicVoucherItem,
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
const mockCartItems = [
  {
    productId: 1,
    name: 'Món Hải Sản Cao Cấp',
    unitPrice: 500000,
    originalPrice: 500000,
    quantity: 1,
    image: '/images/crab.jpg',
  },
];

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

// --- Mock campaigns & vouchers ---
let mockConfigData: CheckoutConfig;
let mockCampaignsList: ActivePromotion[] = [];
let mockVouchersList: (PublicVoucherItem & {
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
  campaign_id?: number;
  campaign_name?: string;
  is_freeship?: boolean;
})[] = [];

vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>(
    '@/services/orderService'
  );
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockImplementation(() => Promise.resolve(mockConfigData)),
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: false,
      min_order_amount: 0,
      shipping_discount_type: 'none',
      shipping_discount_value: 0,
    }),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 30000,
      original_fee: 30000,
      is_freeship: false,
      message: null,
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
            is_freeship: v.is_freeship ?? v.discount_type === 'freeship',
            can_combine_with_promotions: v.can_combine_with_promotions,
            can_combine_with_freeship: v.can_combine_with_freeship,
          },
          message: 'Áp dụng mã giảm giá thành công!',
        });
      }
      return Promise.resolve({
        valid: false,
        message: 'Mã không tồn tại hoặc đã hết hạn',
      });
    }),
    createOrder: vi.fn().mockResolvedValue({
      success: true,
      order: { id: 9999, code: 'DH9999', total: 500000 },
    }),
  };
});

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockCampaignsList)),
}));

describe('Voucher Input Mutex Lock Tests (change: voucher-input-mutex-lock)', () => {
  // Campaign 1: Cấm voucher món ăn (can_combine_with_promotions = false)
  const campFoodForbidden: ActivePromotion = {
    id: 101,
    name: 'Đại Tiệc Mùa Hè',
    description: 'Giảm 20k đơn từ 100k - Không cộng dồn mã món',
    promotion_type: 'order_discount',
    min_order_value: 100000,
    discount_type: 'fixed',
    discount_value: 20000,
    max_discount: 20000,
    items: [],
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
  };

  // Campaign 2: Cấm voucher freeship (can_combine_with_freeship = false)
  const campShipForbidden: ActivePromotion = {
    id: 102,
    name: 'Ưu Đãi Không Freeship',
    description: 'Giảm 15k đơn từ 100k - Không áp dụng cùng freeship',
    promotion_type: 'order_discount',
    min_order_value: 100000,
    discount_type: 'fixed',
    discount_value: 15000,
    max_discount: 15000,
    items: [],
    can_combine_with_promotions: true,
    can_combine_with_freeship: false,
  };

  // Campaign 3: Cho phép kết hợp (can_combine_with_promotions = true, can_combine_with_freeship = true)
  const campCombinable: ActivePromotion = {
    id: 103,
    name: 'Ưu Đãi Đồng Hành',
    description: 'Giảm 10k đơn từ 100k - Cho phép cộng dồn',
    promotion_type: 'order_discount',
    min_order_value: 100000,
    discount_type: 'fixed',
    discount_value: 10000,
    max_discount: 10000,
    items: [],
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  // Voucher 1: Voucher món ăn thông thường
  const foodVoucher: PublicVoucherItem & {
    can_combine_with_promotions?: boolean;
    can_combine_with_freeship?: boolean;
  } = {
    id: 201,
    code: 'GIAM50K',
    discount_type: 'fixed',
    value: 50000,
    prereq_price: 100000,
    is_freeship: false,
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  // Voucher 2: Voucher Freeship
  const freeshipVoucher: PublicVoucherItem & {
    can_combine_with_promotions?: boolean;
    can_combine_with_freeship?: boolean;
  } = {
    id: 202,
    code: 'FREESHIP30K',
    discount_type: 'freeship',
    value: 30000,
    prereq_price: 100000,
    is_freeship: true,
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  };

  // Voucher 3: Voucher độc quyền cấm mọi campaign (can_combine_with_promotions = false)
  const exclusiveVoucher: PublicVoucherItem & {
    can_combine_with_promotions?: boolean;
    can_combine_with_freeship?: boolean;
  } = {
    id: 203,
    code: 'EXCLUSIVE100K',
    discount_type: 'fixed',
    value: 100000,
    prereq_price: 100000,
    is_freeship: false,
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCouponModalCache();
    localStorage.clear();

    mockVouchersList = [foodVoucher, freeshipVoucher, exclusiveVoucher];
    mockCampaignsList = [campFoodForbidden, campShipForbidden, campCombinable];

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
      shipping_settings: {
        is_min_amount_enabled: false,
        min_order_amount: 0,
        shipping_discount_type: 'none',
        shipping_discount_value: 0,
      },
      payment_methods: [{ id: 'cod', name: 'COD', is_active: true }],
      active_promotions: mockCampaignsList,
    };
  });

  it('Kịch bản 1: Đang chọn Campaign cấm voucher món (can_combine_with_promotions = false) -> Gõ tay Food Voucher -> Bị chặn, hiển thị lỗi đỏ, không áp dụng voucher', async () => {
    // Đặt campaign 101 vào localStorage
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([101]));

    const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Nhập mã voucher món "GIAM50K" ở ô input ngoài trang
    const voucherInput = screen.getByPlaceholderText('Mã Voucher');
    fireEvent.change(voucherInput, { target: { value: 'GIAM50K' } });

    // Bấm nút [Áp dụng]
    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    // Kỳ vọng thông báo lỗi chặn khóa chéo
    await waitFor(() => {
      expect(
        screen.getByText('Chương trình "Đại Tiệc Mùa Hè" không áp dụng đồng thời với mã giảm giá món ăn.')
      ).toBeInTheDocument();
    });

    // Xác nhận voucher không được áp dụng (không xuất hiện nút xóa voucher và input không bị readonly)
    expect(container.querySelector('button.bg-red-50')).not.toBeInTheDocument();
    expect(voucherInput).not.toHaveAttribute('readonly');
  });

  it('Kịch bản 2: Đang chọn Campaign cấm freeship (can_combine_with_freeship = false) -> Gõ tay Freeship Voucher -> Bị chặn, hiển thị lỗi đỏ', async () => {
    // Đặt campaign 102 (cấm freeship) vào localStorage
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([102]));

    const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Nhập mã freeship "FREESHIP30K"
    const voucherInput = screen.getByPlaceholderText('Mã Voucher');
    fireEvent.change(voucherInput, { target: { value: 'FREESHIP30K' } });

    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    // Kỳ vọng thông báo lỗi cấm freeship
    await waitFor(() => {
      expect(
        screen.getByText('Chương trình ưu đãi hiện tại không áp dụng cùng mã giảm phí vận chuyển.')
      ).toBeInTheDocument();
    });

    // Không áp dụng voucher
    expect(container.querySelector('button.bg-red-50')).not.toBeInTheDocument();
    expect(voucherInput).not.toHaveAttribute('readonly');
  });

  it('Kịch bản 3: Gõ tay Voucher cấm campaign (can_combine_with_promotions = false) khi giỏ hàng đang chọn bất kỳ campaign nào -> Bị chặn', async () => {
    // Giỏ hàng đang tick campaign 103 (kể cả campaign cho phép kết hợp)
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([103]));

    const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Nhập mã độc quyền "EXCLUSIVE100K" mang can_combine_with_promotions = false
    const voucherInput = screen.getByPlaceholderText('Mã Voucher');
    fireEvent.change(voucherInput, { target: { value: 'EXCLUSIVE100K' } });

    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    // Kỳ vọng thông báo lỗi
    await waitFor(() => {
      expect(
        screen.getByText('Mã giảm giá này không áp dụng đồng thời với các chương trình ưu đãi đã chọn trong giỏ hàng.')
      ).toBeInTheDocument();
    });

    expect(container.querySelector('button.bg-red-50')).not.toBeInTheDocument();
    expect(voucherInput).not.toHaveAttribute('readonly');
  });

  it('Kịch bản 4: Khi Campaign cho phép kết hợp (can_combine_with_promotions = true) -> Gõ tay Voucher hợp lệ -> Áp dụng thành công', async () => {
    // Giỏ hàng đang tick campaign 103 (cho phép cộng dồn)
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([103]));

    const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Nhập mã món "GIAM50K"
    const voucherInput = screen.getByPlaceholderText('Mã Voucher');
    fireEvent.change(voucherInput, { target: { value: 'GIAM50K' } });

    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    // Kỳ vọng áp dụng thành công
    await waitFor(() => {
      expect(screen.getByText(/Áp dụng mã giảm giá thành công/i)).toBeInTheDocument();
    });

    // Nút Xóa voucher xuất hiện và input trở thành readonly
    expect(container.querySelector('button.bg-red-50')).toBeInTheDocument();
    expect(voucherInput).toHaveAttribute('readonly');
  });

  it('Kịch bản 5: Bỏ tick Campaign -> Gõ tay Voucher -> Áp dụng thành công bình thường', async () => {
    // Ban đầu không có campaign nào được tick (selectedCampaignIds = [])
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([]));

    const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);

    // Gõ mã "GIAM50K"
    const voucherInput = screen.getByPlaceholderText('Mã Voucher');
    fireEvent.change(voucherInput, { target: { value: 'GIAM50K' } });

    const applyButton = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyButton);

    // Áp dụng thành công
    await waitFor(() => {
      expect(screen.getByText(/Áp dụng mã giảm giá thành công/i)).toBeInTheDocument();
    });

    expect(container.querySelector('button.bg-red-50')).toBeInTheDocument();
    expect(voucherInput).toHaveAttribute('readonly');
  });
});
