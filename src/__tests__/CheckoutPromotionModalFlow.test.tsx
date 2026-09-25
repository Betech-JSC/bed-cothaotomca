import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
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
  useAuth: () => ({ user: null, token: null, refreshUser: vi.fn() }),
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
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    subtotal: 500000,
    hasOutOfStockItems: false,
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

// Mock Data
let mockConfigData: CheckoutConfig;
let mockCampaignsList: any[] = [];
let mockVouchersList: PublicVoucherItem[] = [];
let mockValidateVoucherResult: any = null;

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockCampaignsList)),
}));

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
    getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
    getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 30000,
      original_fee: 30000,
      is_freeship: false,
      message: null,
    }),
    validateVoucher: vi.fn().mockImplementation((code: string) => {
      if (mockValidateVoucherResult) {
        return Promise.resolve(mockValidateVoucherResult);
      }
      const v = mockVouchersList.find((item) => item.code.toUpperCase() === code.toUpperCase());
      if (v) {
        return Promise.resolve({
          valid: true,
          voucher: {
            id: v.id,
            code: v.code,
            short_name: v.short_name,
            value: v.value,
            discount_type: v.discount_type,
            max_discount: v.max_discount,
            campaign_id: v.campaign_id || 1,
            campaign_name: v.campaign_name || 'Voucher Campaign',
            prereq_price: v.prereq_price,
            is_freeship: v.is_freeship ?? v.discount_type === 'freeship',
            can_combine_with_promotions: v.can_combine_with_promotions !== false,
            can_combine_with_freeship: v.can_combine_with_freeship !== false,
          },
          message: 'Mã hợp lệ',
        });
      }
      return Promise.resolve({ valid: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết lượt.' });
    }),
  };
});

describe('Checkout Promotion & Modal Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCouponModalCache();
    localStorage.clear();
    mockValidateVoucherResult = null;

    mockCampaignsList = [
      {
        id: 10,
        name: 'Giảm 50k Toàn Menu',
        promotion_type: 'order_discount',
        discount_type: 'fixed',
        discount_value: 50000,
        min_order_value: 200000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        items: [],
      },
    ];

    mockVouchersList = [
      {
        id: 101,
        code: 'VOUCHER20K',
        short_name: '-20k',
        discount_type: 'fixed',
        value: 20000,
        max_discount: 20000,
        prereq_price: 100000,
        campaign_id: 10,
        campaign_name: 'Khuyến Mãi Món',
        is_freeship: false,
        customer_scope: 'all',
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      },
      {
        id: 102,
        code: 'FREESHIP30K',
        short_name: 'Freeship 30k',
        discount_type: 'freeship',
        value: 30000,
        prereq_price: 200000,
        campaign_id: 10,
        campaign_name: 'Khuyến Mãi Ship',
        is_freeship: true,
        customer_scope: 'all',
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      },
    ];

    mockConfigData = {
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
      active_promotions: mockCampaignsList,
    };
  });

  it('1. Chọn campaign trong modal -> ra ngoài CheckoutForm áp dụng thành công và hiển thị CampaignTicketBadge', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal chọn mã (lấy nút đầu tiên)
    const openModalBtn = screen.getAllByRole('button', { name: /Chọn mã/i })[0];
    fireEvent.click(openModalBtn);

    // Chờ danh sách campaign tải lên
    await waitFor(() => {
      expect(screen.getByText('Giảm 50k Toàn Menu')).toBeInTheDocument();
    });

    // Click chọn campaign "Giảm 50k Toàn Menu"
    const campCard = screen.getByText('Giảm 50k Toàn Menu');
    fireEvent.click(campCard);

    // Bấm nút "Áp dụng • X ưu đãi"
    const applyBtn = screen.getByRole('button', { name: /Áp dụng •/i });
    fireEvent.click(applyBtn);

    // Kỳ vọng modal đóng và ngoài CheckoutForm hiển thị CampaignTicketBadge
    await waitFor(() => {
      expect(screen.getAllByTestId('campaign-ticket-badge')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Giảm 50k Toàn Menu')[0]).toBeInTheDocument();
    });

    // localStorage phải lưu đúng id campaign
    const storedCamps = JSON.parse(localStorage.getItem('cothaotomca_selected_campaign_ids') || '[]');
    expect(storedCamps).toContain(10);
  });

  it('2. Chọn voucher trong modal -> ra ngoài áp dụng thành công và hiển thị FoodTicketBadge', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal
    fireEvent.click(screen.getAllByRole('button', { name: /Chọn mã/i })[0]);

    // Chờ voucher hiển thị
    await waitFor(() => {
      expect(screen.getByText('VOUCHER20K')).toBeInTheDocument();
    });

    // Chọn voucher VOUCHER20K
    fireEvent.click(screen.getByText('VOUCHER20K'));

    // Bấm Áp dụng • X ưu đãi
    const applyBtn = screen.getByRole('button', { name: /Áp dụng •/i });
    fireEvent.click(applyBtn);

    // Kiểm tra ra ngoài đã có FoodTicketBadge
    await waitFor(() => {
      expect(screen.getAllByTestId('food-ticket-badge')[0]).toBeInTheDocument();
      expect(screen.getAllByText('-20k')[0]).toBeInTheDocument();
    });

    const storedVouchers = JSON.parse(localStorage.getItem('cothaotomca_applied_voucher_codes') || '[]');
    expect(storedVouchers).toContain('VOUCHER20K');
  });

  it('3. Chọn campaign mà không có voucher -> không làm mất campaign (không bị triệt tiêu)', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal
    fireEvent.click(screen.getAllByRole('button', { name: /Chọn mã/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Giảm 50k Toàn Menu')).toBeInTheDocument();
    });

    // CHỈ chọn Campaign, KHÔNG chọn bất kỳ Voucher nào
    fireEvent.click(screen.getByText('Giảm 50k Toàn Menu'));

    // Bấm Áp dụng • X ưu đãi
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng •/i }));

    // Campaign PHẢI được giữ nguyên trên giao diện, không bị hàm handleRemoveVoucher xóa mất
    await waitFor(() => {
      expect(screen.getAllByTestId('campaign-ticket-badge')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Giảm 50k Toàn Menu')[0]).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem('cothaotomca_selected_campaign_ids') || '[]')).toEqual([10]);
  });

  it('4. Bấm nút Xóa ở ngoài -> xóa đúng mục đang áp dụng', async () => {
    // Trường hợp 4a: Chỉ áp dụng campaign -> bấm Xóa -> campaign bị gỡ bỏ
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([10]));
    const { container, unmount } = render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('campaign-ticket-badge')[0]).toBeInTheDocument();
    });

    // Bấm nút "Xóa" trên VoucherTicketBar
    const removeBtn = container.querySelector('button.bg-red-50') as HTMLButtonElement;
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('campaign-ticket-badge')).not.toBeInTheDocument();
      expect(screen.getAllByText('Chọn hoặc nhập mã ưu đãi')[0]).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem('cothaotomca_selected_campaign_ids') || '[]')).toEqual([]);
    unmount();

    // Trường hợp 4b: Chỉ áp dụng voucher -> bấm Xóa -> voucher bị gỡ bỏ
    localStorage.setItem('cothaotomca_applied_voucher_codes', JSON.stringify(['VOUCHER20K']));
    const { container: container2, unmount: unmount2 } = render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('food-ticket-badge')[0]).toBeInTheDocument();
    });

    const removeBtnVoucher = container2.querySelector('button.bg-red-50') as HTMLButtonElement;
    expect(removeBtnVoucher).toBeInTheDocument();
    fireEvent.click(removeBtnVoucher);

    await waitFor(() => {
      expect(screen.queryByTestId('food-ticket-badge')).not.toBeInTheDocument();
      expect(screen.getAllByText('Chọn hoặc nhập mã ưu đãi')[0]).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem('cothaotomca_applied_voucher_codes') || '[]')).toEqual([]);
    unmount2();

    // Trường hợp 4c: Áp dụng CẢ voucher VÀ campaign -> bấm Xóa -> cả hai bị gỡ bỏ sạch sẽ
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([10]));
    localStorage.setItem('cothaotomca_applied_voucher_codes', JSON.stringify(['VOUCHER20K']));
    const { container: container3, unmount: unmount3 } = render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('campaign-ticket-badge')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('food-ticket-badge')[0]).toBeInTheDocument();
    });

    const removeBtnAll = container3.querySelector('button.bg-red-50') as HTMLButtonElement;
    expect(removeBtnAll).toBeInTheDocument();
    fireEvent.click(removeBtnAll);

    await waitFor(() => {
      expect(screen.queryByTestId('campaign-ticket-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('food-ticket-badge')).not.toBeInTheDocument();
      expect(screen.getAllByText('Chọn hoặc nhập mã ưu đãi')[0]).toBeInTheDocument();
    });

    expect(JSON.parse(localStorage.getItem('cothaotomca_selected_campaign_ids') || '[]')).toEqual([]);
    expect(JSON.parse(localStorage.getItem('cothaotomca_applied_voucher_codes') || '[]')).toEqual([]);
    unmount3();
  });

  it('5. Validate lỗi trong handleApplyVouchers -> hiển thị thông báo lỗi ra UI, KHÔNG nuốt lỗi', async () => {
    // Thiết lập validateVoucher trả về lỗi
    mockValidateVoucherResult = {
      valid: false,
      message: 'Mã giảm giá đã hết lượt sử dụng trong hôm nay.',
    };

    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Mở modal
    fireEvent.click(screen.getAllByRole('button', { name: /Chọn mã/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('VOUCHER20K')).toBeInTheDocument();
    });

    // Chọn mã VOUCHER20K
    fireEvent.click(screen.getByText('VOUCHER20K'));

    // Bấm Áp dụng • X ưu đãi
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng •/i }));

    // Lỗi từ backend phải hiển thị rõ ràng ra ngoài giao diện cho người dùng
    await waitFor(() => {
      expect(screen.getAllByText('Mã giảm giá đã hết lượt sử dụng trong hôm nay.')[0]).toBeInTheDocument();
    });
  });

  it('6. Modal lifecycle & cache: Mở lại modal không nháy lại danh sách và giữ đúng trạng thái đã áp dụng', async () => {
    const handleApplyCampaigns = vi.fn();
    const handleApplyVouchers = vi.fn();

    // Mở lần 1
    const { rerender } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={500000}
        appliedCampaignIds={[10]}
        appliedVoucherCodes={['VOUCHER20K']}
        onApplyCampaigns={handleApplyCampaigns}
        onApplyVouchers={handleApplyVouchers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Giảm 50k Toàn Menu')).toBeInTheDocument();
      expect(screen.getByText('VOUCHER20K')).toBeInTheDocument();
    });

    // Đóng modal
    rerender(
      <CouponModal
        isOpen={false}
        onClose={vi.fn()}
        subtotal={500000}
        appliedCampaignIds={[10]}
        appliedVoucherCodes={['VOUCHER20K']}
        onApplyCampaigns={handleApplyCampaigns}
        onApplyVouchers={handleApplyVouchers}
      />
    );

    // Mở lại lần 2: Dữ liệu đã cached, không reload/loading
    rerender(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={500000}
        appliedCampaignIds={[10]}
        appliedVoucherCodes={['VOUCHER20K']}
        onApplyCampaigns={handleApplyCampaigns}
        onApplyVouchers={handleApplyVouchers}
      />
    );

    // Danh sách hiển thị ngay lập tức từ cache, không biến mất hay nháy loading
    expect(screen.getByText('Giảm 50k Toàn Menu')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER20K')).toBeInTheDocument();

    // Nút áp dụng phản ánh đúng 2 ưu đãi đã chọn từ props
    expect(screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i })).toBeInTheDocument();
  });
});
