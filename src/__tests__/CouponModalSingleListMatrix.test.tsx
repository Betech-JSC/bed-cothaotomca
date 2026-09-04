import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal from '@/components/Voucher/CouponModal';
import { PublicVoucherItem, ActivePromotion } from '@/services/orderService';
import { formatPrice } from '@/lib/format';
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
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

// Mock AuthContext
let mockCurrentUser: any = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockCurrentUser }),
  getMemberTier: (pts = 0) => {
    if (pts >= 800) return { tier: 'diamond', name: 'Diamond', discountPercent: 8, label: '' };
    if (pts >= 400) return { tier: 'gold', name: 'Gold', discountPercent: 5, label: '' };
    return { tier: 'member', name: 'Member', discountPercent: 0, label: '' };
  },
}));

// Mock campaignService & orderService
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

let mockVouchersList: PublicVoucherItem[] = [];
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual('@/services/orderService');
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
  };
});

describe('CouponModal Single List & Ineligible Reason Matrix Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    mockVouchersList = [];
  });

  it('Matrix 1: Voucher chưa đạt đơn tối thiểu -> Mờ 60%, chặn click, hiển thị lý do chuẩn', async () => {
    const voucher: PublicVoucherItem = {
      id: 1,
      code: 'MIN200K',
      discount_type: 'fixed',
      value: 20000,
      prereq_price: 200000,
      description: 'Giảm 20.000đ cho đơn từ 200.000đ',
    };
    mockVouchersList = [voucher];

    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000} // Chưa đạt 200k
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('MIN200K')).toBeInTheDocument();

    // Hiển thị lý do đơn tối thiểu dạng text
    const expectedReason = `Chưa đạt giá trị đơn tối thiểu ${formatPrice(200000)}`;
    expect(screen.getByText(expectedReason)).toBeInTheDocument();

    // Thẻ voucher có class làm mờ và chặn tương tác
    const card = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
    expect(card).toBeInTheDocument();
  });

  it('Matrix 2: Mã Freeship bị cấm bởi Campaign can_combine_with_freeship = false -> Hiển thị lý do và bị làm mờ', async () => {
    const freeshipVoucher: PublicVoucherItem = {
      id: 2,
      code: 'FREESHIPX',
      discount_type: 'freeship',
      value: 30000,
      is_freeship: true,
      prereq_price: 100000,
      description: 'Miễn phí giao hàng cho đơn từ 100.000đ',
    };
    mockVouchersList = [freeshipVoucher];

    const activeCampaigns: ActivePromotion[] = [
      {
        id: 99,
        name: 'Đại tiệc Giảm 20% - Không áp dụng cùng Freeship',
        promotion_type: 'order_discount',
        min_order_value: 100000,
        discount_type: 'percent',
        discount_value: 20,
        can_combine_with_freeship: false,
        can_combine_with_promotions: true,
        items: [],
      },
    ];

    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000} // Đạt 100k nhưng campaign cấm freeship
        activePromotions={activeCampaigns}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('FREESHIPX')).toBeInTheDocument();

    // Hiển thị dòng lý do chuẩn xác
    expect(screen.getByText('Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship')).toBeInTheDocument();

    // Card bị disabled
    const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
    expect(disabledCard).toBeInTheDocument();
  });

  it('Matrix 3: Mã Member-Only khi khách vãng lai (chưa login) -> Bị mờ và hiển thị lý do', async () => {
    const memberVoucher: PublicVoucherItem = {
      id: 3,
      code: 'MEMBERVIP',
      discount_type: 'fixed',
      value: 30000,
      customer_scope: 'member_only',
      prereq_price: 50000,
      description: 'Ưu đãi dành riêng cho thành viên',
    };
    mockVouchersList = [memberVoucher];
    mockCurrentUser = null; // Khách vãng lai

    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('MEMBERVIP')).toBeInTheDocument();
    expect(screen.getByText('Chỉ dành cho khách hàng thành viên. Vui lòng đăng nhập.')).toBeInTheDocument();

    const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
    expect(disabledCard).toBeInTheDocument();
  });

  it('Matrix 4: Mã Tier-Only (Hạng Kim Cương) khi khách chỉ đạt hạng Vàng -> Bị mờ và hiển thị lý do hạng', async () => {
    const diamondVoucher: PublicVoucherItem = {
      id: 4,
      code: 'DIAMONDONLY',
      discount_type: 'percent',
      value: 15,
      customer_scope: 'tier_only',
      min_member_tier: 'diamond',
      prereq_price: 100000,
      description: 'Đặc quyền thành viên Kim Cương',
    };
    mockVouchersList = [diamondVoucher];
    mockCurrentUser = {
      id: 10,
      name: 'Nguyen Van A',
      points: 500, // Hạng Gold (< 800)
      tier: 'gold',
    };

    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        user={mockCurrentUser}
        memberTier="gold"
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('DIAMONDONLY')).toBeInTheDocument();
    expect(screen.getByText('Chỉ dành riêng cho thành viên đạt hạng Kim Cương trở lên')).toBeInTheDocument();

    const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
    expect(disabledCard).toBeInTheDocument();
  });

  it('Matrix 5: Mã đủ điều kiện -> Hiển thị bình thường, cho phép chọn áp dụng', async () => {
    const validVoucher: PublicVoucherItem = {
      id: 5,
      code: 'VALID20K',
      discount_type: 'fixed',
      value: 20000,
      prereq_price: 100000,
      customer_scope: 'all',
      description: 'Giảm 20.000đ mọi đơn từ 100.000đ',
    };
    mockVouchersList = [validVoucher];

    const mockApply = vi.fn();
    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={120000}
        onApplyVoucher={mockApply}
      />
    );

    expect(await screen.findByText('VALID20K')).toBeInTheDocument();

    // Không bị mờ hay disabled
    const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
    expect(disabledCard).toBeNull();

    // Có nút Áp dụng của voucher hoạt động
    const applyButtons = screen.getAllByRole('button', { name: /Áp dụng/i });
    expect(applyButtons.length).toBeGreaterThan(0);
    // Nút áp dụng trên card voucher enabled
    const voucherApplyBtn = applyButtons.find((btn) => btn.getAttribute('type') === 'button');
    expect(voucherApplyBtn).toBeDefined();
    expect(voucherApplyBtn).toBeEnabled();
  });

  it('Matrix 6: Gộp thành 1 danh sách duy nhất, không có tab lọc Tất cả/Khả dụng/Không khả dụng', async () => {
    mockVouchersList = [
      { id: 1, code: 'V1', discount_type: 'fixed', value: 10000, prereq_price: 50000 },
      { id: 2, code: 'V2', discount_type: 'fixed', value: 20000, prereq_price: 500000 },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000} // V1 eligible, V2 ineligible
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('V1')).toBeInTheDocument();
    expect(screen.getByText('V2')).toBeInTheDocument();

    // Tuyệt đối không có các nút tab 'Khả dụng', 'Không khả dụng', 'Tất cả'
    expect(screen.queryByRole('button', { name: /^Tất cả$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Khả dụng$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Không khả dụng$/i })).toBeNull();
  });
});
