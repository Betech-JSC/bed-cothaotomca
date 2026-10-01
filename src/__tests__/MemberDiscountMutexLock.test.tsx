import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import { PublicVoucherItem, CheckoutConfig, type LoyaltySettings } from '@/services/orderService';
import { PublicCampaignItem } from '@/services/campaignService';
import { getMemberTier, calculateMemberDiscount, StorefrontUser } from '@/contexts/AuthContext';

// Mock MobileCartFlow inside CheckoutForm
vi.mock('@/components/Header/MobileCartFlow', () => ({
  default: () => <div data-testid="mock-mobile-cart-flow" />,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string, values?: Record<string, any>) => {
      if (key === 'voucher_mutex_locked') return 'Không thể sử dụng với những ưu đãi đã chọn khác.';
      if (key === 'campaign_mutex_locked') return 'Không thể sử dụng cùng ưu đãi đã chọn.';
      if (key === 'name') return 'Họ và tên';
      if (key === 'phone') return 'Số điện thoại';
      if (key === 'email_label') return 'Email';
      if (key === 'voucher_label') return 'Mã giảm giá';
      if (key === 'subtotal') return 'Tạm tính';
      if (key === 'shipping_fee') return 'Phí vận chuyển';
      if (key === 'total') return 'Tổng cộng';
      return key;
    };
  },
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

let mockCurrentUser: StorefrontUser | null = null;
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: mockCurrentUser,
      token: mockCurrentUser ? 'token-123' : null,
      refreshUser: vi.fn(),
    }),
  };
});

let mockCartItems: any[] = [];
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    subtotal: mockCartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
    hasOutOfStockItems: false,
  }),
}));

vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [
      { id: 1, branchName: 'Chi nhánh 1', address: '123 Đường A', contactNumber: '0901234567', isActive: true },
    ],
    selectedBranchId: 1,
    setSelectedBranchId: vi.fn(),
  }),
}));

// Mock API services for CheckoutForm
vi.mock('@/services/authService', () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  saveCachedCustomerAddresses: vi.fn(),
  setCachedCustomerAddresses: vi.fn(),
}));

vi.mock('@/services/orderService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getShippingSettings: vi.fn().mockResolvedValue(null),
    validateVoucher: vi.fn().mockImplementation((code: string) => {
      if (code?.toUpperCase() === 'EXCLUSIVE_50K') {
        return Promise.resolve({
          valid: true,
          voucher: {
            id: 1,
            code: 'EXCLUSIVE_50K',
            value: 50000,
            discount_type: 'fixed',
            can_combine_with_promotions: false,
            can_combine_with_freeship: true,
          },
        });
      }
      return Promise.resolve({ valid: false, message: 'Invalid code' });
    }),
    calculateShippingFee: vi.fn().mockResolvedValue({
      fee: 20000,
      original_fee: 20000,
      discount: 0,
      is_freeship: false,
      distance_km: 3,
      branch_id: 1,
    }),
    initiateOrder: vi.fn().mockResolvedValue({
      order_code: 'ORD-123',
      status: 'pending',
      payment_status: 'pending',
      subtotal: '100000',
      total: '115000',
      delivery_price: '20000',
      expire_at: new Date().toISOString(),
      qr_url: '',
      qr_info: { bank_code: '', bank_account: '', bank_name: '', account_name: '' },
    }),
  };
});

describe('Member Discount & Mutex Lock Tests', () => {
  const sampleConfig: CheckoutConfig = {
    operating_hours: {
      is_store_open: true,
      is_delivery_open: true,
      can_order_now: true,
      store_open: '08:00',
      store_close: '22:00',
      delivery_open: '08:00',
      delivery_close: '22:00',
      message: 'Mở cửa',
    },
    branches: [
      { id: 1, branchName: 'Chi nhánh 1', address: '123 Đường A', contactNumber: '0901234567', isActive: true },
    ],
    active_promotions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCouponModalCache();
    mockCurrentUser = null;
    mockCartItems = [
      {
        id: 1,
        productId: 1,
        title: 'Cơm Thố Xá Xíu',
        productCode: 'CTX',
        unitPrice: 100000,
        originalPrice: 100000, // regular price
        quantity: 1,
        imageUrl: '/images/xaxiu.jpg',
        variant: 'Default',
      },
    ];
  });

  it('CouponModal: Khách hàng Gold bị khóa voucher có can_combine_with_promotions === false', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
      {
        id: 2,
        code: 'COMBINABLE_20K',
        value: 20000,
        discount_type: 'fixed',
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EXCLUSIVE_50K')).toBeInTheDocument();
    });

    const lockReasons = screen.getAllByText('Không áp dụng đồng thời với ưu đãi thành viên');
    expect(lockReasons.length).toBeGreaterThan(0);
    expect(screen.getByText('COMBINABLE_20K')).toBeInTheDocument();
  });

  it('CouponModal: Khách hàng Diamond bị khóa campaign có can_combine_with_promotions === false', async () => {
    const campaigns: PublicCampaignItem[] = [
      {
        id: 101,
        name: 'Chiến dịch độc quyền',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        promotion_type: 'order_discount',
        discount_type: 'fixed',
        discount_value: 30000,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="diamond"
        subtotal={300000}
        vouchers={[]}
        campaigns={campaigns}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch độc quyền')).toBeInTheDocument();
    });

    expect(screen.getByText('Không áp dụng đồng thời với ưu đãi thành viên')).toBeInTheDocument();
  });

  it('CouponModal: Khách hàng thường (member) không bị khóa voucher can_combine_with_promotions === false bởi ưu đãi thành viên', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="member"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EXCLUSIVE_50K')).toBeInTheDocument();
    });

    expect(screen.queryByText('Không áp dụng đồng thời với ưu đãi thành viên')).not.toBeInTheDocument();
  });

  it('AuthContext: Tính toán chiết khấu thành viên chính xác trên món nguyên giá', () => {
    const goldUser: StorefrontUser = {
      id: 1,
      name: 'Nguyễn Văn A',
      first_name: 'A',
      last_name: 'Nguyễn Văn',
      email: 'a@example.com',
      phone: '0901234567',
      points: 450,
      kiotviet_customer_id: null,
      dob: null,
      gender: null,
    };

    const diamondUser: StorefrontUser = {
      ...goldUser,
      id: 2,
      points: 900,
    };

    const tierGold = getMemberTier(goldUser);
    expect(tierGold.tier).toBe('gold');
    expect(tierGold.discountPercent).toBe(5);

    const tierDiamond = getMemberTier(diamondUser);
    expect(tierDiamond.tier).toBe('diamond');
    expect(tierDiamond.discountPercent).toBe(8);

    const goldDiscount = calculateMemberDiscount(goldUser, 500000);
    expect(goldDiscount).toBe(25000); // 500,000 * 5% = 25,000đ

    const diamondDiscount = calculateMemberDiscount(diamondUser, 500000);
    expect(diamondDiscount).toBe(40000); // 500,000 * 8% = 40,000đ

    expect(calculateMemberDiscount(goldUser, 0)).toBe(0);
  });

  it('CheckoutForm: Hiển thị dòng chiết khấu thành viên Vàng (5%) trong Breakdown', async () => {
    mockCurrentUser = {
      id: 1,
      name: 'Khách Hàng Gold',
      first_name: 'Gold',
      last_name: 'Khách Hàng',
      email: 'gold@example.com',
      phone: '0901234567',
      points: 450, // Gold tier
      kiotviet_customer_id: null,
      dob: null,
      gender: null,
    };

    render(<CheckoutForm config={sampleConfig} order={null} />);

    // Kiểm tra breakdown hiển thị chiết khấu thành viên Vàng (5%)
    await waitFor(() => {
      expect(screen.getByText('Ưu đãi thành viên Vàng (5%)')).toBeInTheDocument();
      // 100,000 * 5% = 5,000đ -> formatPrice(5000) = -5.000 VNĐ
      expect(screen.getByText('-5.000 VNĐ')).toBeInTheDocument();
    });
  });

  it('CheckoutForm: Hiển thị dòng chiết khấu thành viên Kim Cương (8%) trong Breakdown', async () => {
    mockCurrentUser = {
      id: 2,
      name: 'Khách Hàng Diamond',
      first_name: 'Diamond',
      last_name: 'Khách Hàng',
      email: 'diamond@example.com',
      phone: '0909888999',
      points: 950, // Diamond tier
      kiotviet_customer_id: null,
      dob: null,
      gender: null,
    };

    render(<CheckoutForm config={sampleConfig} order={null} />);

    await waitFor(() => {
      expect(screen.getByText('Ưu đãi thành viên Kim Cương (8%)')).toBeInTheDocument();
      // 100,000 * 8% = 8,000đ -> -8.000 VNĐ
      expect(screen.getByText('-8.000 VNĐ')).toBeInTheDocument();
    });
  });

  it('CheckoutForm: Khi giỏ hàng có món sale (isSale = true, như Cá hồi ngâm tương 150k sau khi gạch 180k), khách Gold vẫn được tự động giảm 5% (-7.000 VNĐ)', async () => {
    mockCurrentUser = {
      id: 1,
      name: 'Khách Hàng Gold',
      first_name: 'Gold',
      last_name: 'Khách Hàng',
      email: 'gold@example.com',
      phone: '0901234567',
      points: 450,
      kiotviet_customer_id: null,
      dob: null,
      gender: null,
    };

    // Giỏ hàng có món SALE (originalPrice > unitPrice)
    mockCartItems = [
      {
        id: 2,
        productId: 2,
        title: 'Cá hồi ngâm tương',
        productCode: 'CHNT-SALE',
        unitPrice: 150000,
        originalPrice: 180000, // item is on sale!
        quantity: 1,
        imageUrl: '/images/cahoi.jpg',
        variant: 'Default',
      },
    ];

    render(<CheckoutForm config={sampleConfig} order={null} />);

    // Món sale 150.000đ * 5% = 7.500đ -> làm tròn 7.000đ theo calculateMemberDiscount -> hiển thị dòng ưu đãi thành viên -7.000 VNĐ
    await waitFor(() => {
      expect(screen.getByText('Ưu đãi thành viên Vàng (5%)')).toBeInTheDocument();
      expect(screen.getByText('-7.000 VNĐ')).toBeInTheDocument();
    });
  });

  it('CheckoutForm: Khi khách áp dụng voucher can_combine_with_promotions === false -> Dòng ưu đãi thành viên hiển thị ghi chú không áp dụng đồng thời (0đ)', async () => {
    mockCurrentUser = {
      id: 1,
      name: 'Khách Hàng Gold',
      first_name: 'Gold',
      last_name: 'Khách Hàng',
      email: 'gold@example.com',
      phone: '0901234567',
      points: 450,
      kiotviet_customer_id: null,
      dob: null,
      gender: null,
    };

    localStorage.setItem('cothaotomca_applied_voucher_codes', JSON.stringify(['EXCLUSIVE_50K']));

    render(<CheckoutForm config={sampleConfig} order={null} />);

    // Kiểm tra dòng ghi chú không áp dụng đồng thời xuất hiện và hiển thị 0đ
    await waitFor(() => {
      expect(screen.getByText('Ưu đãi thành viên (Không áp dụng đồng thời với mã đã chọn)')).toBeInTheDocument();
      expect(screen.getByText('0đ')).toBeInTheDocument();
    });
  });

  it('Matrix Scenario 1: Khi can_combine_with_promotions === false -> Thẻ Hội viên Vàng tự động checked, Voucher độc quyền bị khóa với lý do "Không áp dụng đồng thời với ưu đãi thành viên"', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('member-tier-campaign-card')).toBeInTheDocument();
    });

    // Thẻ thành viên hiển thị đúng tiêu đề
    expect(screen.getByText('Ưu đãi Hội viên Vàng - Giảm 5%')).toBeInTheDocument();

    // Checkbox thẻ thành viên tự động checked
    const memberCardCheckbox = screen.getByRole('checkbox', { name: /Ưu đãi Hội viên Vàng - Giảm 5%/i });
    expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(memberCardCheckbox).toHaveAttribute('aria-disabled', 'false');

    // Voucher độc quyền bị khóa và có lý do
    expect(screen.getByText('EXCLUSIVE_50K')).toBeInTheDocument();
    expect(screen.getByText('Không áp dụng đồng thời với ưu đãi thành viên')).toBeInTheDocument();
  });

  it('Matrix Scenario 2: Khi khách BẤM CHỌN voucher độc quyền -> Thẻ Hội viên Vàng tự động uncheck và bị khóa ("Không thể sử dụng cùng mã giảm giá đã chọn")', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EXCLUSIVE_50K')).toBeInTheDocument();
    });

    // Bấm chọn voucher EXCLUSIVE_50K
    fireEvent.click(screen.getByText('EXCLUSIVE_50K'));

    // Thẻ Hội viên Vàng bị uncheck và khóa
    await waitFor(() => {
      const memberCardCheckbox = screen.getByRole('checkbox', { name: /Ưu đãi Hội viên Vàng - Giảm 5%/i });
      expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'false');
      expect(memberCardCheckbox).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText('Không thể sử dụng cùng mã giảm giá đã chọn')).toBeInTheDocument();
    });
  });

  it('Matrix Scenario 3: Khi khách BỎ CHỌN voucher độc quyền -> Thẻ Hội viên Vàng tự động mở khóa và auto-check lại', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EXCLUSIVE_50K')).toBeInTheDocument();
    });

    // 1. Chọn voucher
    fireEvent.click(screen.getByText('EXCLUSIVE_50K'));

    await waitFor(() => {
      expect(screen.getByText('Không thể sử dụng cùng mã giảm giá đã chọn')).toBeInTheDocument();
    });

    // 2. Bỏ chọn voucher
    fireEvent.click(screen.getByText('EXCLUSIVE_50K'));

    // 3. Thẻ thành viên tự động mở khóa và auto-check
    await waitFor(() => {
      const memberCardCheckbox = screen.getByRole('checkbox', { name: /Ưu đãi Hội viên Vàng - Giảm 5%/i });
      expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'true');
      expect(memberCardCheckbox).toHaveAttribute('aria-disabled', 'false');
      expect(screen.queryByText('Không thể sử dụng cùng mã giảm giá đã chọn')).not.toBeInTheDocument();
      // Voucher lại bị khóa trở lại
      expect(screen.getByText('Không áp dụng đồng thời với ưu đãi thành viên')).toBeInTheDocument();
    });
  });

  it('Matrix Scenario 4: Khách hàng có thể tự bấm BỎ CHỌN thẻ Hội viên Vàng để mở khóa voucher không cộng dồn', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('member-tier-campaign-card')).toBeInTheDocument();
    });

    expect(screen.getByText('Không áp dụng đồng thời với ưu đãi thành viên')).toBeInTheDocument();

    // Bấm vào thẻ Hội viên để bỏ chọn thủ công
    fireEvent.click(screen.getByTestId('member-tier-campaign-card'));

    await waitFor(() => {
      const memberCardCheckbox = screen.getByRole('checkbox', { name: /Ưu đãi Hội viên Vàng - Giảm 5%/i });
      expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'false');
      // Voucher không còn bị khóa bởi ưu đãi thành viên
      expect(screen.queryByText('Không áp dụng đồng thời với ưu đãi thành viên')).not.toBeInTheDocument();
    });
  });

  it('Matrix Scenario 5: Khi can_combine_with_promotions === true -> Cả thẻ Hội viên và Voucher đều có thể chọn đồng thời mà không bị khóa', async () => {
    const vouchers: PublicVoucherItem[] = [
      {
        id: 1,
        code: 'EXCLUSIVE_50K',
        value: 50000,
        discount_type: 'fixed',
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
        customer_scope: 'all',
      },
    ];

    const combinableLoyaltySettings: LoyaltySettings = {
      is_enabled: true,
      can_combine_with_promotions: true,
      gold_discount_percent: 5,
      diamond_discount_percent: 8,
      gold_upgrade_discount_percent: 10,
      diamond_upgrade_discount_percent: 10,
    };

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        memberTier="gold"
        subtotal={200000}
        vouchers={vouchers}
        campaigns={[]}
        loyaltySettings={combinableLoyaltySettings}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('member-tier-campaign-card')).toBeInTheDocument();
    });

    // Thẻ Hội viên checked
    const memberCardCheckbox = screen.getByRole('checkbox', { name: /Ưu đãi Hội viên Vàng - Giảm 5%/i });
    expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'true');

    // Voucher KHÔNG bị khóa
    expect(screen.queryByText('Không áp dụng đồng thời với ưu đãi thành viên')).not.toBeInTheDocument();

    // Chọn voucher
    fireEvent.click(screen.getByText('EXCLUSIVE_50K'));

    // Cả hai đều được chọn đồng thời!
    await waitFor(() => {
      expect(memberCardCheckbox).toHaveAttribute('aria-checked', 'true');
      expect(memberCardCheckbox).toHaveAttribute('aria-disabled', 'false');
      expect(screen.queryByText('Không thể sử dụng cùng mã giảm giá đã chọn')).not.toBeInTheDocument();
    });
  });
});
