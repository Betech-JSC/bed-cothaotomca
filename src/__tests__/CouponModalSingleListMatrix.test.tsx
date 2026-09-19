import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
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
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
    getShippingSettings: vi.fn().mockResolvedValue(null),
  };
});

describe('CouponModal Single List & Ineligible Reason Matrix Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCouponModalCache();
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

  it('Matrix 4: Mã Tier-Only (Hạng DIAMOND) khi khách chỉ đạt hạng GOLD -> Bị mờ và hiển thị lý do hạng', async () => {
    const diamondVoucher: PublicVoucherItem = {
      id: 4,
      code: 'DIAMONDONLY',
      discount_type: 'percent',
      value: 15,
      customer_scope: 'tier_only',
      min_member_tier: 'diamond',
      prereq_price: 100000,
      description: 'Đặc quyền thành viên DIAMOND',
    };
    mockVouchersList = [diamondVoucher];
    mockCurrentUser = {
      id: 10,
      name: 'Nguyen Van A',
      points: 500, // Hạng GOLD (< 800)
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
    expect(screen.getByText('Chỉ dành riêng cho thành viên đạt hạng DIAMOND trở lên')).toBeInTheDocument();

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

    // Grab-style: Ban đầu chưa chọn mã thì nút bottom bar là "Bỏ qua ưu đãi và tiếp tục"
    const skipBtn = screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i });
    expect(skipBtn).toBeInTheDocument();

    // Checkbox khả dụng và chưa tích
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Tích chọn voucher
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    // Nút bottom bar đổi thành "Áp dụng • 1 ưu đãi"
    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i });
    expect(applyBtn).toBeInTheDocument();

    // Click nút áp dụng
    fireEvent.click(applyBtn);
    expect(mockApply).toHaveBeenCalledWith('VALID20K');
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

  it('Matrix 7: Real-time Disabled - Mã không cộng dồn khóa các mã khác với text chuẩn và mở khóa khi bỏ chọn', async () => {
    mockVouchersList = [
      {
        id: 1,
        code: 'MON_A',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      },
      {
        id: 2,
        code: 'MON_B',
        discount_type: 'fixed',
        value: 15000,
        prereq_price: 50000,
        can_combine_with_promotions: false,
        can_combine_with_freeship: true,
      },
      {
        id: 3,
        code: 'FREESHIP15K',
        discount_type: 'freeship',
        value: 15000,
        prereq_price: 50000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      },
    ];

    const mockApplyVouchers = vi.fn();
    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
        onApplyVouchers={mockApplyVouchers}
      />
    );

    expect(await screen.findByText('MON_A')).toBeInTheDocument();
    expect(screen.getByText('MON_B')).toBeInTheDocument();
    expect(screen.getByText('FREESHIP15K')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    // 1. Tick MON_A (allow_stack_promo = false, allow_stack_ship = true)
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');

    // MON_B lập tức bị khóa và hiện text chuẩn
    expect(checkboxes[1]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Không thể sử dụng với những ưu đãi đã chọn khác.')).toBeInTheDocument();

    // Mã FREESHIP15K vẫn sáng cho khách tích thêm
    expect(checkboxes[2]).not.toHaveAttribute('aria-disabled', 'true');

    // 2. Tick thêm FREESHIP15K -> Áp dụng • 2 ưu đãi
    fireEvent.click(checkboxes[2]);
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i })).toBeInTheDocument();

    // 3. Bỏ chọn MON_A -> MON_B tự động mở khóa theo thời gian thực
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false');
    expect(checkboxes[1]).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Không thể sử dụng với những ưu đãi đã chọn khác.')).toBeNull();
    expect(screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i })).toBeInTheDocument();
  });

  it('Matrix 8: React Rules of Hooks - Tuân thủ thứ tự hooks khi toggle isOpen false sang true', async () => {
    mockVouchersList = [
      { id: 1, code: 'TEST_HOOKS', discount_type: 'fixed', value: 10000, prereq_price: 50000 },
    ];

    const { rerender } = render(
      <CouponModal
        isOpen={false}
        onClose={vi.fn()}
        subtotal={100000}
      />
    );

    // Khi đóng, modal không render DOM
    expect(screen.queryByText('TEST_HOOKS')).toBeNull();

    // Mở modal (tương tự như bấm FloatingVoucherButton)
    rerender(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
      />
    );

    // Không throw lỗi React #300 / change in hook order
    expect(await screen.findByText('TEST_HOOKS')).toBeInTheDocument();
  });

  it('Matrix 9: Bấm nút [Áp dụng • X ưu đãi] gọi onApplyVouchers và kích hoạt onClose đóng popup', async () => {
    mockVouchersList = [
      { id: 1, code: 'MON_DISCOUNT', discount_type: 'fixed', value: 10000, prereq_price: 50000 },
      { id: 2, code: 'SHIP_DISCOUNT', discount_type: 'freeship', is_freeship: true, value: 15000, prereq_price: 0 },
    ];

    const mockApplyVouchers = vi.fn().mockResolvedValue(undefined);
    const mockOnClose = vi.fn();

    render(
      <CouponModal
        isOpen={true}
        onClose={mockOnClose}
        subtotal={100000}
        onApplyVouchers={mockApplyVouchers}
      />
    );

    expect(await screen.findByText('MON_DISCOUNT')).toBeInTheDocument();
    expect(screen.getByText('SHIP_DISCOUNT')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    // Tick cả 2 mã
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const applyButton = screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i });
    expect(applyButton).toBeInTheDocument();

    // Bấm nút Áp dụng
    await fireEvent.click(applyButton);

    // Kiểm tra onApplyVouchers được gọi với đúng danh sách mã
    expect(mockApplyVouchers).toHaveBeenCalledWith(['MON_DISCOUNT', 'SHIP_DISCOUNT']);

    // Kiểm tra onClose được gọi để đóng modal
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('Matrix 10: Đồng bộ mã đang dùng khi mở popup và bấm [Bỏ qua ưu đãi và tiếp tục]', async () => {
    mockVouchersList = [
      { id: 1, code: 'APPLIED_CODE', discount_type: 'fixed', value: 10000, prereq_price: 50000 },
    ];

    const mockRemoveVoucher = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <CouponModal
        isOpen={true}
        onClose={mockOnClose}
        subtotal={100000}
        appliedVoucherCode="APPLIED_CODE"
        appliedVoucherCodes={['APPLIED_CODE']}
        onRemoveVoucher={mockRemoveVoucher}
      />
    );

    expect(await screen.findByText('APPLIED_CODE')).toBeInTheDocument();

    // Bỏ chọn mã đang có
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Nút đổi thành "Bỏ qua ưu đãi và tiếp tục"
    const skipButton = screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i });
    expect(skipButton).toBeInTheDocument();

    fireEvent.click(skipButton);

    expect(mockRemoveVoucher).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
