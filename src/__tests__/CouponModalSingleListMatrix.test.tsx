import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal, { resetCouponModalCache, getVoucherBadgeLabel } from '@/components/Voucher/CouponModal';
import GiftSelectorModal, { GiftItem } from '@/components/Checkout/GiftSelectorModal';
import { PublicVoucherItem, ActivePromotion } from '@/services/orderService';
import { getActiveCampaigns, PublicCampaignItem } from '@/services/campaignService';
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
let mockPathname = '/checkout';
const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
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
let mockCampaignsList: any[] = [];
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockImplementation(() => Promise.resolve(mockCampaignsList)),
}));

let mockVouchersList: PublicVoucherItem[] = [];
let mockValidateVoucherResult: any = { valid: false, message: 'Mã không tồn tại' };
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    validateVoucher: vi.fn().mockImplementation(() => Promise.resolve(mockValidateVoucherResult)),
  };
});

describe('CouponModal Single List & Ineligible Reason Matrix Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    resetCouponModalCache();
    localStorage.clear();
    mockCurrentUser = null;
    mockPathname = '/checkout';
    mockVouchersList = [];
    mockCampaignsList = [];
    mockValidateVoucherResult = { valid: false, message: 'Mã không tồn tại' };
  });

  it('Matrix 1: Voucher chưa đạt đơn tối thiểu -> Thẻ xám mờ opacity-50, badge xám bg-gray-400, checkbox disabled, gợi ý mua thêm', async () => {
    const voucher: PublicVoucherItem = {
      id: 1,
      code: 'MIN200K',
      discount_type: 'fixed',
      value: 20000,
      prereq_price: 200000,
      description: 'Giảm 20.000đ cho đơn từ 200.000đ',
    };
    mockVouchersList = [voucher];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000} // Chưa đạt 200k (thiếu 50k)
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('MIN200K')).toBeInTheDocument();

    // Hiển thị lý do đơn tối thiểu dạng text
    const expectedReason = `Chưa đạt giá trị đơn tối thiểu ${formatPrice(200000)}`;
    expect(screen.getByText(expectedReason)).toBeInTheDocument();

    // Gợi ý mua thêm: 200k - 150k = 50k
    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(50000))).toBeInTheDocument();

    // Thẻ voucher xám mờ (chứa opacity-50, bg-gray-50, cursor-not-allowed)
    const card = screen.getByText('MIN200K').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    // Badge bên trái màu xám bg-gray-400 text-white
    const badge = card.querySelector('div[class*="bg-gray-400"]')!;
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-400');
    expect(badge.className).toContain('text-white');

    // Checkbox bị disabled
    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 2: Mã Freeship bị cấm bởi Campaign can_combine_with_freeship = false -> Hiển thị lý do chuẩn, thẻ xám mờ, badge xám, checkbox disabled', async () => {
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

    render(
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

    // Thẻ voucher xám mờ
    const card = screen.getByText('FREESHIPX').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    // Badge bên trái màu xám
    const badge = card.querySelector('div[class*="bg-gray-400"]')!;
    expect(badge).toBeInTheDocument();

    // Checkbox bị disabled
    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 3: Mã Member-Only khi khách vãng lai (chưa login) -> Thẻ xám mờ, badge xám, hiển thị lý do, checkbox disabled', async () => {
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

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('MEMBERVIP')).toBeInTheDocument();
    expect(screen.getByText('Chỉ dành cho khách hàng thành viên. Vui lòng đăng nhập.')).toBeInTheDocument();

    // Thẻ voucher xám mờ
    const card = screen.getByText('MEMBERVIP').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    // Badge bên trái màu xám
    const badge = card.querySelector('div[class*="bg-gray-400"]')!;
    expect(badge).toBeInTheDocument();

    // Checkbox bị disabled
    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 4: Mã Tier-Only (Hạng DIAMOND) khi khách chỉ đạt hạng GOLD -> Thẻ xám mờ, badge xám, hiển thị lý do hạng, checkbox disabled', async () => {
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

    render(
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

    // Thẻ voucher xám mờ
    const card = screen.getByText('DIAMONDONLY').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    // Badge bên trái màu xám
    const badge = card.querySelector('div[class*="bg-gray-400"]')!;
    expect(badge).toBeInTheDocument();

    // Checkbox bị disabled
    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
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

  it('Matrix 11: Danh sách duy nhất - hiển thị cả Chương trình ưu đãi và Mã giảm giá trong cùng một màn hình (không có tab)', async () => {
    mockCampaignsList = [
      {
        id: 101,
        name: 'Giảm 10% toàn menu',
        description: 'Chương trình khuyến mãi mùa hè',
        start_date: '2026-06-01T00:00:00Z',
        end_date: '2026-08-31T23:59:59Z',
      },
    ];
    mockVouchersList = [
      {
        id: 1,
        code: 'VOUCHER10K',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        description: 'Giảm 10K',
      },
    ];

    render(<CouponModal isOpen={true} onClose={vi.fn()} subtotal={100000} />);

    // Kiểm tra không còn các nút tab chuyển đổi "Chương trình ưu đãi" / "Mã giảm giá"
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    // Cả campaign và voucher đều hiển thị đồng thời
    expect(await screen.findByText('Giảm 10% toàn menu')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER10K')).toBeInTheDocument();

    // Headers các phần hiển thị rõ: 2 tầng chuẩn không còn chữ "khả dụng"
    expect(screen.getByText(/Chương trình ưu đãi/i)).toBeInTheDocument();
    expect(screen.getByText(/Mã giảm giá/i)).toBeInTheDocument();
    expect(screen.queryByText(/khả dụng/i)).toBeNull();
  });

  it('Matrix 12: Nhập mã hợp lệ - tự động thêm thẻ ưu đãi mới vào danh sách và tự động tích chọn', async () => {
    mockVouchersList = [
      {
        id: 1,
        code: 'PUBLIC10K',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
      },
    ];

    mockValidateVoucherResult = {
      valid: true,
      voucher: {
        id: 99,
        code: 'PRIVATE50K',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 100000,
        campaign_id: 1,
        campaign_name: 'Chiến dịch riêng',
      },
      discount_amount: 50000,
      message: 'Áp dụng mã giảm giá thành công!',
    };

    const mockAddPrivateVoucher = vi.fn();

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        onAddPrivateVoucher={mockAddPrivateVoucher}
      />
    );

    expect(await screen.findByText('PUBLIC10K')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Nhập mã/i);
    fireEvent.change(input, { target: { value: 'PRIVATE50K' } });

    const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyBtn);

    // Kiểm tra gọi onAddPrivateVoucher với đúng thông tin
    await screen.findByText(/Đã thêm mã "PRIVATE50K" vào ví của bạn!/i);
    expect(mockAddPrivateVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PRIVATE50K',
        value: 50000,
        prereq_price: 100000,
      })
    );
  });

  it('Matrix 13: Nhập mã không hợp lệ (sai mã/hết hạn) - hiển thị câu thông báo lỗi chuẩn', async () => {
    mockValidateVoucherResult = {
      valid: false,
      message: 'Mã giảm giá không tồn tại trên hệ thống.',
    };

    render(<CouponModal isOpen={true} onClose={vi.fn()} subtotal={150000} />);

    await screen.findByPlaceholderText(/Nhập mã/i);

    const input = screen.getByPlaceholderText(/Nhập mã/i);
    fireEvent.change(input, { target: { value: 'SAICODE' } });

    const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyBtn);

    expect(
      await screen.findByText('Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.')
    ).toBeInTheDocument();
  });

  it('Matrix 14: Nhập mã khi đơn chưa đủ điều kiện - hiển thị câu thông báo lỗi chuẩn', async () => {
    mockValidateVoucherResult = {
      valid: false,
      message: 'Mã giảm giá chỉ áp dụng cho đơn hàng từ 500.000đ trở lên.',
    };

    render(<CouponModal isOpen={true} onClose={vi.fn()} subtotal={100000} />);

    await screen.findByPlaceholderText(/Nhập mã/i);

    const input = screen.getByPlaceholderText(/Nhập mã/i);
    fireEvent.change(input, { target: { value: 'MIN500K' } });

    const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyBtn);

    expect(
      await screen.findByText('Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.')
    ).toBeInTheDocument();
  });

  it('Matrix 15: Trạng thái chọn voucher duy trì ổn định khi component re-render (ngăn lỗi bỏ chọn khi cuộn chuột)', async () => {
    const voucher: PublicVoucherItem = {
      id: 88,
      code: 'SCROLL_TEST_10K',
      discount_type: 'fixed',
      value: 10000,
      prereq_price: 0,
      description: 'Giảm 10k kiểm tra cuộn trang',
    };
    mockVouchersList = [voucher];

    const { rerender } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
        appliedVoucherCodes={[]}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('SCROLL_TEST_10K')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Người dùng tick chọn voucher
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i })).toBeInTheDocument();

    // Giả lập hiện tượng parent re-render khi cuộn chuột (window scroll / sticky header update):
    // Parent truyền reference mới của appliedVoucherCodes ([] !== []) và onApplyVoucher (() => {})
    rerender(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
        appliedVoucherCodes={[]}
        onApplyVoucher={vi.fn()}
      />
    );

    // Voucher PHẢI giữ nguyên trạng thái đã chọn, không bị reset hay tự động bỏ chọn
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i })).toBeInTheDocument();
  });

  it('Matrix 16: Tầng 1 (Chương trình ưu đãi) gom đầy đủ các chiến dịch đủ và chưa đủ điều kiện, hiển thị thông báo thiếu tiền', async () => {
    mockCampaignsList = [
      {
        id: 101,
        name: 'Ưu đãi hè 10%',
        min_order_value: 100000,
        promotion_type: 'order_discount',
        discount_type: 'percent',
        discount_value: 10,
        can_combine_with_promotions: true,
      },
      {
        id: 102,
        name: 'Tặng trà đào đơn từ 300k',
        min_order_value: 300000,
        promotion_type: 'order_gift_discount',
        items: [{ id: 1, name: 'Trà đào' }],
        can_combine_with_promotions: true,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        appliedCampaignIds={[]}
      />
    );

    expect(await screen.findByText('Ưu đãi hè 10%')).toBeInTheDocument();
    expect(screen.getByText('Tặng trà đào đơn từ 300k')).toBeInTheDocument();

    // Check tier headers: Tầng 1 gom chung cả 2 campaign, không còn header riêng "Chương trình chưa đủ điều kiện" hay chữ "khả dụng"
    expect(screen.getByText(/Chương trình ưu đãi \(2\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Chương trình chưa đủ điều kiện/i)).toBeNull();
    expect(screen.queryByText(/khả dụng/i)).toBeNull();

    // Campaign 102 (Tier 2) hiển thị câu thông báo thiếu tiền: 300k - 200k = 100k
    expect(
      screen.getByText(/Chưa đạt giá trị đơn tối thiểu 300\.000.*Mua thêm 100\.000/i)
    ).toBeInTheDocument();

    // Campaign 101 (Tier 1) có checkbox khả dụng
    const cb101 = screen.getByText('Ưu đãi hè 10%').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    expect(cb101).toHaveAttribute('aria-checked', 'false');
    expect(cb101).not.toHaveAttribute('aria-disabled', 'true');

    // Campaign 102 (Tier 2) có checkbox disabled
    const cb102 = screen.getByText('Tặng trà đào đơn từ 300k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    expect(cb102).toHaveAttribute('aria-disabled', 'true');
  });

  it('Matrix 17: Click checkbox toggle vs click Chi tiết điều kiện áp dụng (e.stopPropagation())', async () => {
    mockCampaignsList = [
      {
        id: 101,
        name: 'Ưu đãi hè 10%',
        min_order_value: 100000,
        promotion_type: 'order_discount',
        discount_type: 'percent',
        discount_value: 10,
        description: 'Chi tiết mô tả ưu đãi hè 10%',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        appliedCampaignIds={[]}
      />
    );

    expect(await screen.findByText('Ưu đãi hè 10%')).toBeInTheDocument();

    const termsBtn = screen.getByText(/Chi tiết điều kiện áp dụng ›/i);
    const card = screen.getByText('Ưu đãi hè 10%').closest('div[class*="rounded-2xl"]')!;
    const checkbox = card.querySelector('[role="checkbox"]')!;

    // Bấm vào "Chi tiết điều kiện áp dụng ›"
    fireEvent.click(termsBtn);

    // Màn hình chi tiết mở ra
    expect(await screen.findByRole('heading', { level: 3, name: 'Chi Tiết Chương Trình' })).toBeInTheDocument();
    expect(screen.getByText(/Chi tiết mô tả ưu đãi hè 10%/i)).toBeInTheDocument();

    // Bấm quay lại
    const backBtn = screen.getByText(/Quay lại/i);
    fireEvent.click(backBtn);

    // Quay lại màn hình danh sách, checkbox vẫn chưa bị tick
    const cardAfter = (await screen.findByText('Ưu đãi hè 10%')).closest('div[class*="rounded-2xl"]')!;
    const checkboxAfter = cardAfter.querySelector('[role="checkbox"]')!;
    expect(checkboxAfter).toHaveAttribute('aria-checked', 'false');

    // Giờ click thẳng vào checkbox -> toggled sang true
    fireEvent.click(checkboxAfter);
    expect(checkboxAfter).toHaveAttribute('aria-checked', 'true');
    // Màn hình chi tiết KHÔNG bị mở ra
    expect(screen.queryByRole('heading', { level: 3, name: 'Chi Tiết Chương Trình' })).not.toBeInTheDocument();
  });

  it('Matrix 18: Real-time Disabled - Campaign không cộng dồn khóa các campaign khác với text chuẩn và mở khóa khi bỏ chọn', async () => {
    mockCampaignsList = [
      {
        id: 201,
        name: 'Flash Sale Độc Quyền',
        min_order_value: 50000,
        can_combine_with_promotions: false,
      },
      {
        id: 202,
        name: 'Giảm 20k Đơn 100k',
        min_order_value: 50000,
        can_combine_with_promotions: true,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        appliedCampaignIds={[]}
      />
    );

    expect(await screen.findByText('Flash Sale Độc Quyền')).toBeInTheDocument();
    expect(screen.getByText('Giảm 20k Đơn 100k')).toBeInTheDocument();

    const cardFlash = screen.getByText('Flash Sale Độc Quyền').closest('div[class*="rounded-2xl"]')!;
    const cardPromo = screen.getByText('Giảm 20k Đơn 100k').closest('div[class*="rounded-2xl"]')!;
    const cbFlash = cardFlash.querySelector('[role="checkbox"]')!;
    const cbPromo = cardPromo.querySelector('[role="checkbox"]')!;

    // 1. Trạng thái ban đầu: Cả 2 checkbox đều chưa tick và không bị khóa
    expect(cbFlash).toHaveAttribute('aria-checked', 'false');
    expect(cbFlash).toHaveAttribute('aria-disabled', 'false');
    expect(cbPromo).toHaveAttribute('aria-checked', 'false');
    expect(cbPromo).toHaveAttribute('aria-disabled', 'false');

    // 2. Chọn Flash Sale Độc Quyền (can_combine_with_promotions = false)
    fireEvent.click(cbFlash);
    expect(cbFlash).toHaveAttribute('aria-checked', 'true');

    // Campaign 202 lập tức bị khóa (aria-disabled = true), làm mờ và hiển thị lý do chuẩn
    expect(cbPromo).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Không thể sử dụng cùng ưu đãi đã chọn.')).toBeInTheDocument();
    expect(cardPromo.className).toContain('opacity-50');
    expect(cardPromo.className).toContain('cursor-not-allowed');

    // Thử click vào Campaign 202 khi đang bị khóa -> Bị chặn, không nhận click
    fireEvent.click(cbPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'false');
    expect(cbFlash).toHaveAttribute('aria-checked', 'true');

    // Thử click vào card Campaign 202 khi đang bị khóa -> Cũng bị chặn
    fireEvent.click(cardPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'false');
    expect(cbFlash).toHaveAttribute('aria-checked', 'true');

    // 3. Bỏ chọn Flash Sale -> Campaign 202 tự động mở khóa theo thời gian thực (hết bị disable, sáng lên bình thường)
    fireEvent.click(cbFlash);
    expect(cbFlash).toHaveAttribute('aria-checked', 'false');
    expect(cbPromo).toHaveAttribute('aria-disabled', 'false');
    expect(screen.queryByText('Không thể sử dụng cùng ưu đãi đã chọn.')).toBeNull();
    expect(cardPromo.className).not.toContain('opacity-50');

    // 4. Khi đã mở khóa, người dùng có thể tick chọn Campaign 202
    fireEvent.click(cbPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'true');

    // Lúc này Flash Sale (can_combine_with_promotions = false) lại bị khóa bởi Campaign 202
    expect(cbFlash).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Không thể sử dụng cùng ưu đãi đã chọn.')).toBeInTheDocument();

    // 5. Bỏ chọn Campaign 202 -> Cả 2 đều mở khóa hoàn toàn
    fireEvent.click(cbPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'false');
    expect(cbFlash).toHaveAttribute('aria-disabled', 'false');
    expect(screen.queryByText('Không thể sử dụng cùng ưu đãi đã chọn.')).toBeNull();
  });

  it('Matrix 19: Cho phép chọn đồng thời nhiều ưu đãi khi can_combine_with_promotions = true', async () => {
    mockCampaignsList = [
      {
        id: 301,
        name: 'Giảm 10k',
        min_order_value: 50000,
        can_combine_with_promotions: true,
      },
      {
        id: 302,
        name: 'Tặng trà sen',
        min_order_value: 50000,
        can_combine_with_promotions: true,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        appliedCampaignIds={[]}
      />
    );

    expect(await screen.findByText('Giảm 10k')).toBeInTheDocument();
    expect(screen.getByText('Tặng trà sen')).toBeInTheDocument();

    const cb1 = screen.getByText('Giảm 10k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cb2 = screen.getByText('Tặng trà sen').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Tick ưu đãi 1
    fireEvent.click(cb1);
    expect(cb1).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Áp dụng • 1 ưu đãi/i })).toBeInTheDocument();

    // Tick ưu đãi 2 (cả 2 đều cho phép kết hợp)
    fireEvent.click(cb2);
    expect(cb1).toHaveAttribute('aria-checked', 'true');
    expect(cb2).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i })).toBeInTheDocument();
  });

  it('Matrix 20: Khóa chéo 2 chiều giữa Food Voucher và Campaign', async () => {
    mockCampaignsList = [
      {
        id: 401,
        name: 'Campaign Không Cộng Dồn',
        min_order_value: 50000,
        can_combine_with_promotions: false,
      },
    ];
    mockVouchersList = [
      {
        id: 11,
        code: 'FOOD10K',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        can_combine_with_promotions: true,
      },
      {
        id: 12,
        code: 'SOLO_VOUCHER',
        discount_type: 'fixed',
        value: 20000,
        prereq_price: 50000,
        can_combine_with_promotions: false,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
      />
    );

    expect(await screen.findByText('Campaign Không Cộng Dồn')).toBeInTheDocument();
    expect(screen.getByText('FOOD10K')).toBeInTheDocument();
    expect(screen.getByText('SOLO_VOUCHER')).toBeInTheDocument();

    const cbCampaign = screen.getByText('Campaign Không Cộng Dồn').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbFoodVoucher = screen.getByText('FOOD10K').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbSoloVoucher = screen.getByText('SOLO_VOUCHER').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Chiều 1: Chọn Campaign Không Cộng Dồn -> Voucher FOOD10K bị khóa
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'true');

    // Voucher FOOD10K bị khóa với lý do
    expect(cbFoodVoucher).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText(/Không thể sử dụng cùng ưu đãi đã chọn/i).length).toBeGreaterThanOrEqual(1);

    // Bỏ chọn Campaign
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'false');
    expect(cbFoodVoucher).toHaveAttribute('aria-disabled', 'false');

    // Chiều 2: Chọn Voucher không cộng dồn (SOLO_VOUCHER) -> Campaign bị khóa
    fireEvent.click(cbSoloVoucher);
    expect(cbSoloVoucher).toHaveAttribute('aria-checked', 'true');

    // Campaign bị khóa với lý do
    expect(cbCampaign).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Không thể sử dụng cùng mã giảm giá đã chọn/i)).toBeInTheDocument();
  });

  it('Matrix 21: Khóa và mở Freeship Voucher theo can_combine_with_freeship của Campaign (2 chiều)', async () => {
    mockCampaignsList = [
      {
        id: 501,
        name: 'Campaign Cấm Freeship',
        min_order_value: 50000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: false,
      },
    ];
    mockVouchersList = [
      {
        id: 21,
        code: 'FREESHIP15K',
        discount_type: 'freeship',
        is_freeship: true,
        value: 15000,
        prereq_price: 50000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        shippingFee={30000}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
      />
    );

    expect(await screen.findByText('Campaign Cấm Freeship')).toBeInTheDocument();
    expect(screen.getByText('FREESHIP15K')).toBeInTheDocument();

    const cardCampaign = screen.getByText('Campaign Cấm Freeship').closest('div[class*="rounded-2xl"]')!;
    const cbCampaign = cardCampaign.querySelector('[role="checkbox"]')!;
    const cbFreeship = screen.getByText('FREESHIP15K').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Ban đầu: cả 2 đều không bị khóa
    expect(cbCampaign).toHaveAttribute('aria-disabled', 'false');
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'false');

    // Chiều 1: Chọn Campaign cấm Freeship -> Freeship Voucher bị khóa
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'true');

    // Freeship voucher bị khóa
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship/i)).toBeInTheDocument();

    // Bỏ chọn Campaign -> Freeship Voucher mở khóa lại
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'false');
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'false');

    // Chiều 2: Chọn Freeship Voucher -> Campaign cấm Freeship bị khóa
    fireEvent.click(cbFreeship);
    expect(cbFreeship).toHaveAttribute('aria-checked', 'true');

    // Campaign cấm Freeship bị khóa với lý do "CTKM không áp dụng cùng giảm phí vận chuyển."
    expect(cbCampaign).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('CTKM không áp dụng cùng giảm phí vận chuyển.')).toBeInTheDocument();
    expect(cardCampaign.className).toContain('opacity-50');

    // Bỏ chọn Freeship Voucher -> Campaign mở khóa lại
    fireEvent.click(cbFreeship);
    expect(cbFreeship).toHaveAttribute('aria-checked', 'false');
    expect(cbCampaign).toHaveAttribute('aria-disabled', 'false');
    expect(screen.queryByText('CTKM không áp dụng cùng giảm phí vận chuyển.')).toBeNull();
  });

  it('Matrix 22: Mở modal lần đầu (appliedCampaignIds undefined/empty) hiển thị pure checkbox không tự tick', async () => {
    mockCampaignsList = [
      {
        id: 601,
        name: 'Giảm 5%',
        min_order_value: 100000,
        promotion_type: 'order_discount',
        discount_type: 'percent',
        discount_value: 5,
      },
      {
        id: 602,
        name: 'Giảm 25.000đ',
        min_order_value: 100000,
        promotion_type: 'order_discount',
        discount_type: 'fixed',
        discount_value: 25000,
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
      />
    );

    expect(await screen.findByText('Giảm 25.000đ')).toBeInTheDocument();
    expect(screen.getByText('Giảm 5%')).toBeInTheDocument();

    const cb602 = screen.getByText('Giảm 25.000đ').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cb601 = screen.getByText('Giảm 5%').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Pure Checkbox: Cả 2 ưu đãi đều để trống (aria-checked = false), không tự động tick Best Deal
    expect(cb602).toHaveAttribute('aria-checked', 'false');
    expect(cb601).toHaveAttribute('aria-checked', 'false');

    // Nút CTA hiển thị "Bỏ qua ưu đãi và tiếp tục"
    expect(screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i })).toBeInTheDocument();
  });

  it('Matrix 23: Nút CTA Áp dụng • X ưu đãi gọi onApplyCampaigns + onApplyVouchers, Bỏ qua gọi onApplyCampaigns([])', async () => {
    mockCampaignsList = [
      {
        id: 701,
        name: 'Campaign 701',
        min_order_value: 50000,
        can_combine_with_promotions: true,
      },
    ];
    mockVouchersList = [
      {
        id: 71,
        code: 'VOUCHER701',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        can_combine_with_promotions: true,
      },
    ];

    const onApplyCampaigns = vi.fn().mockResolvedValue(undefined);
    const onApplyVouchers = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { rerender } = render(
      <CouponModal
        isOpen={true}
        onClose={onClose}
        subtotal={200000}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
        onApplyCampaigns={onApplyCampaigns}
        onApplyVouchers={onApplyVouchers}
      />
    );

    expect(await screen.findByText('Campaign 701')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER701')).toBeInTheDocument();

    const cbCampaign = screen.getByText('Campaign 701').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbVoucher = screen.getByText('VOUCHER701').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Chọn cả Campaign và Voucher
    fireEvent.click(cbCampaign);
    fireEvent.click(cbVoucher);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng • 2 ưu đãi/i });
    expect(applyBtn).toBeInTheDocument();

    // Bấm nút [Áp dụng • 2 ưu đãi]
    await fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onApplyCampaigns).toHaveBeenCalledWith([701]);
      expect(onApplyVouchers).toHaveBeenCalledWith(['VOUCHER701']);
      expect(onClose).toHaveBeenCalled();
    });

    // Test nút Bỏ qua ưu đãi và tiếp tục (khi không chọn ưu đãi nào)
    onApplyCampaigns.mockClear();
    onApplyVouchers.mockClear();
    onClose.mockClear();

    // Bỏ chọn cả Campaign và Voucher
    fireEvent.click(cbCampaign);
    fireEvent.click(cbVoucher);

    const skipBtn = screen.getByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i });
    expect(skipBtn).toBeInTheDocument();
    await fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(onApplyCampaigns).toHaveBeenCalledWith([]);
      expect(onApplyVouchers).toHaveBeenCalledWith([]);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('Matrix 24: isBrowseOnly={true} -> Ẩn toàn bộ Checkbox ở các thẻ và hiển thị nút CTA "Đặt món ngay", click đóng modal và điều hướng /product', async () => {
    mockCampaignsList = [
      {
        id: 801,
        name: 'Chiến dịch Nổi Bật',
        min_order_value: 0,
        can_combine_with_promotions: true,
      },
    ];
    mockVouchersList = [
      {
        id: 81,
        code: 'BROWSE10K',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 0,
        can_combine_with_promotions: true,
      },
    ];

    const onClose = vi.fn();
    render(
      <CouponModal
        isOpen={true}
        onClose={onClose}
        subtotal={100000}
        isBrowseOnly={true}
      />
    );

    expect(await screen.findByText('Chiến dịch Nổi Bật')).toBeInTheDocument();
    expect(screen.getByText('BROWSE10K')).toBeInTheDocument();

    // Toàn bộ Checkbox ở cả Campaign và Voucher đều bị ẩn hoàn toàn
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Nút Bottom Bar CTA hiển thị "Đặt món ngay"
    const orderNowBtn = screen.getByRole('button', { name: /Đặt món ngay/i });
    expect(orderNowBtn).toBeInTheDocument();

    // Click "Đặt món ngay" gọi onClose và điều hướng tới /product
    await fireEvent.click(orderNowBtn);
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/product');
  });

  it('Matrix 25: Khi isBrowseOnly={true} -> ẩn nút [Bỏ qua ưu đãi và tiếp tục], hiển thị nút Đặt món ngay và cho phép đóng bằng icon nút X', async () => {
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([999]));
    localStorage.setItem('cothaotomca_applied_voucher_codes', JSON.stringify(['OLDVOUCHER']));

    mockCampaignsList = [
      {
        id: 802,
        name: 'Chiến dịch Test Bỏ Qua',
        min_order_value: 0,
        can_combine_with_promotions: true,
      },
    ];

    const onClose = vi.fn();
    render(
      <CouponModal
        isOpen={true}
        onClose={onClose}
        subtotal={100000}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
        isBrowseOnly={true}
      />
    );

    expect(await screen.findByText('Chiến dịch Test Bỏ Qua')).toBeInTheDocument();

    // Nút Bỏ qua ưu đãi và tiếp tục KHÔNG xuất hiện trên màn hình
    expect(screen.queryByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i })).not.toBeInTheDocument();

    // Nút Đặt món ngay xuất hiện
    expect(screen.getByRole('button', { name: /Đặt món ngay/i })).toBeInTheDocument();

    // Nút đóng icon "X" hoạt động chuẩn và gọi onClose
    const closeBtn = screen.getByLabelText(/đóng|close/i);
    expect(closeBtn).toBeInTheDocument();
    await fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('Matrix 26: Khi ở ngoài route checkout (pathname != /checkout) -> tự động ở Browse-only Mode (ẩn checkbox, hiện nút Đặt món ngay, ẩn nút Bỏ qua)', async () => {
    mockPathname = '/';
    mockCampaignsList = [
      {
        id: 803,
        name: 'Chiến dịch Ngoài Checkout',
        min_order_value: 0,
        can_combine_with_promotions: true,
      },
    ];

    const onClose = vi.fn();
    render(
      <CouponModal
        isOpen={true}
        onClose={onClose}
        subtotal={100000}
        appliedCampaignIds={[]}
        appliedVoucherCodes={[]}
        isBrowseOnly={false}
      />
    );

    expect(await screen.findByText('Chiến dịch Ngoài Checkout')).toBeInTheDocument();

    // Checkbox không xuất hiện
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    // Nút Bỏ qua ưu đãi và tiếp tục KHÔNG xuất hiện ngoài Checkout
    expect(screen.queryByRole('button', { name: /Bỏ qua ưu đãi và tiếp tục/i })).not.toBeInTheDocument();

    // Hiển thị nút "Đặt món ngay"
    const orderNowBtn = screen.getByRole('button', { name: /Đặt món ngay/i });
    expect(orderNowBtn).toBeInTheDocument();

    // Đóng bằng nút icon "X"
    const closeBtn = screen.getByLabelText(/đóng|close/i);
    await fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('Matrix 27: Đơn hàng đạt Freeship 100% tự động -> Voucher freeship thẻ xám mờ opacity-50, badge xám, checkbox disabled kèm lý do "Đơn hàng đã được Freeship tự động"', async () => {
    const freeshipVoucher: PublicVoucherItem = {
      id: 901,
      code: 'FREESHIP100',
      discount_type: 'freeship',
      value: 0,
      is_freeship: true,
      description: 'Miễn phí vận chuyển cho đơn hàng',
    };
    mockVouchersList = [freeshipVoucher];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={300000}
        isAutoFreeship={true}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('FREESHIP100')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng đã được Freeship tự động')).toBeInTheDocument();
    const card = screen.getByText('FREESHIP100').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 28: Hệ thống đang áp dụng giảm một phần phí ship tự động -> Voucher freeship thẻ xám mờ opacity-50, badge xám, checkbox disabled kèm lý do "Đang áp dụng chương trình giảm phí vận chuyển của hệ thống"', async () => {
    const freeshipVoucher: PublicVoucherItem = {
      id: 902,
      code: 'FREESHIP_EXTRA',
      discount_type: 'freeship',
      value: 0,
      is_freeship: true,
      description: 'Freeship đơn hàng',
    };
    mockVouchersList = [freeshipVoucher];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={250000}
        shippingFee={15000}
        shippingFeeDiscount={20000}
        isAutoShippingDiscountActive={true}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('FREESHIP_EXTRA')).toBeInTheDocument();
    expect(screen.getByText('Đang áp dụng chương trình giảm phí vận chuyển của hệ thống')).toBeInTheDocument();
    const card = screen.getByText('FREESHIP_EXTRA').closest('div[class*="rounded-2xl"]')!;
    expect(card.className).toContain('opacity-50');
    expect(card.className).toContain('bg-gray-50');
    expect(card.className).toContain('cursor-not-allowed');

    const checkbox = card.querySelector('[role="checkbox"]')!;
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 29: Thẻ voucher ưu tiên hiển thị short_name trên cột nhãn bên trái', async () => {
    const voucherWithShortName: PublicVoucherItem = {
      id: 903,
      code: 'TEST_SHIP_30K',
      short_name: 'Giảm 30K Ship',
      discount_type: 'fixed',
      value: 30000,
      is_freeship: true,
      description: 'Giảm 30k phí ship',
    };
    mockVouchersList = [voucherWithShortName];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('TEST_SHIP_30K')).toBeInTheDocument();
    // Cột badge bên trái hiển thị nội dung short_name
    expect(screen.getByText('Giảm 30K Ship')).toBeInTheDocument();
  });

  it('Matrix 30: Voucher ship không có short_name: 100% Freeship (không max_discount) hiển thị FREESHIP, voucher ship có max_discount hiển thị GIẢM SHIP', async () => {
    const fullFreeship: PublicVoucherItem = {
      id: 904,
      code: 'FREESHIP100PCT',
      discount_type: 'freeship',
      value: 0,
      is_freeship: true,
    };
    const cappedShip: PublicVoucherItem = {
      id: 905,
      code: 'CAPPED_SHIP_25K',
      discount_type: 'fixed',
      value: 30000,
      max_discount: 25000,
      is_freeship: true,
    };
    mockVouchersList = [fullFreeship, cappedShip];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('FREESHIP100PCT')).toBeInTheDocument();
    expect(screen.getByText('CAPPED_SHIP_25K')).toBeInTheDocument();

    // fullFreeship (không có max_discount) hiển thị FREESHIP
    expect(screen.getByText('FREESHIP')).toBeInTheDocument();

    // cappedShip (có max_discount: 25000) hiển thị GIẢM SHIP
    expect(screen.getByText('GIẢM SHIP')).toBeInTheDocument();

    // Xác thực logic getVoucherBadgeLabel độc lập
    expect(getVoucherBadgeLabel(fullFreeship, true)).toBe('FREESHIP');
    expect(getVoucherBadgeLabel(cappedShip, true)).toBe('GIẢM SHIP');
    expect(getVoucherBadgeLabel({ ...cappedShip, short_name: 'Giảm 25K Ship' }, true)).toBe('Giảm 25K Ship');
  });

  it('Matrix 31: Nhập tay mã Freeship khi hệ thống đang giảm ship tự động -> Trả về feedback notice thân thiện', async () => {
    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={250000}
        shippingFeeDiscount={20000}
        isAutoShippingDiscountActive={true}
        onApplyVoucher={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Nhập mã voucher/i);
    const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });

    fireEvent.change(input, { target: { value: 'FREESHIP50' } });
    fireEvent.click(applyBtn);

    expect(await screen.findByText('Đang áp dụng chương trình giảm phí vận chuyển của hệ thống')).toBeInTheDocument();
  });

  it('Matrix 32: GiftSelectorModal - Hiển thị danh sách món quà tặng, badge "Chưa đạt điều kiện" và tuyệt đối không có chữ "khả dụng"', () => {
    const mockItems: GiftItem[] = [
      {
        id: 1,
        product_id: 10,
        product_name: 'Trà đào cam sả',
        original_price: 35000,
        campaign_price: 0,
        is_available: true,
      },
      {
        id: 2,
        product_id: 20,
        product_name: 'Bánh flan trân châu',
        original_price: 25000,
        campaign_price: 0,
        is_available: false, // chưa đạt điều kiện
      },
    ];

    const { container } = render(
      <GiftSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        items={mockItems}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    // Tiêu đề danh sách quà: "Danh sách món quà tặng (2)"
    expect(screen.getByText('Danh sách món quà tặng (2)')).toBeInTheDocument();

    // Món không khả dụng hiển thị fallback badge "Chưa đạt điều kiện", không phải "Chưa khả dụng"
    expect(screen.getByText('Chưa đạt điều kiện')).toBeInTheDocument();
    expect(screen.queryByText(/chưa khả dụng/i)).toBeNull();

    // Tên món hiển thị đầy đủ
    expect(screen.getByText('Trà đào cam sả')).toBeInTheDocument();
    expect(screen.getByText('Bánh flan trân châu')).toBeInTheDocument();

    // Tuyệt đối không xuất hiện chữ "khả dụng" trên toàn bộ giao diện GiftSelectorModal
    expect(container.textContent?.toLowerCase()).not.toContain('khả dụng');
  });

  it('Matrix 33: Cấu trúc 2 tầng phẳng ("Chương trình ưu đãi" và "Mã giảm giá") - Tuyệt đối không có chữ "khả dụng" và thẻ không bị mờ xám', async () => {
    mockCampaignsList = [
      {
        id: 101,
        name: 'Giảm 15% mùa hè',
        min_order_value: 50000,
        promotion_type: 'order_discount',
        discount_type: 'percent',
        discount_value: 15,
      },
      {
        id: 102,
        name: 'Tặng trà sen đơn từ 500k',
        min_order_value: 500000,
        promotion_type: 'order_gift_discount',
      },
    ];
    mockVouchersList = [
      {
        id: 11,
        code: 'VOUCHER_ELIGIBLE',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        description: 'Giảm 10k đơn từ 50k',
      },
      {
        id: 12,
        code: 'VOUCHER_INELIGIBLE',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 500000,
        description: 'Giảm 50k đơn từ 500k',
      },
    ];

    const { container } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={100000}
      />
    );

    // Cả 2 tầng hiển thị đồng thời trong 1 view phẳng duy nhất
    expect(await screen.findByText('Chương trình ưu đãi (2)')).toBeInTheDocument();
    expect(screen.getByText('Mã giảm giá (2)')).toBeInTheDocument();

    // Không có tab điều hướng hay các tầng phân chia "khả dụng" / "chưa khả dụng"
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText(/^Chương trình chưa đủ điều kiện/i)).toBeNull();
    expect(screen.queryByText(/^Mã chưa đủ điều kiện/i)).toBeNull();
    expect(container.textContent?.toLowerCase()).not.toContain('khả dụng');

    // Thẻ chưa đủ điều kiện có giao diện xám mờ (opacity-50, bg-gray-50)
    const campIneligibleCard = screen.getByText('Tặng trà sen đơn từ 500k').closest('div[class*="rounded-2xl"]')!;
    expect(campIneligibleCard.className).toContain('opacity-50');
    expect(campIneligibleCard.className).toContain('bg-gray-50');
    expect(campIneligibleCard.className).toContain('cursor-not-allowed');

    const voucherIneligibleCard = screen.getByText('VOUCHER_INELIGIBLE').closest('div[class*="rounded-2xl"]')!;
    expect(voucherIneligibleCard.className).toContain('opacity-50');
    expect(voucherIneligibleCard.className).toContain('bg-gray-50');
    expect(voucherIneligibleCard.className).toContain('cursor-not-allowed');
  });

  it('Matrix 34: Gợi ý mua thêm và checkbox disabled xuất hiện chuẩn xác ở cả Tầng 1 (Campaign) và Tầng 2 (Voucher) khi chưa đủ điều kiện giỏ hàng', async () => {
    mockCampaignsList = [
      {
        id: 201,
        name: 'Giảm 30k đơn 300k',
        min_order_value: 300000,
        promotion_type: 'order_discount',
        discount_type: 'fixed',
        discount_value: 30000,
      },
    ];
    mockVouchersList = [
      {
        id: 21,
        code: 'MIN400K',
        discount_type: 'fixed',
        value: 40000,
        prereq_price: 400000,
        description: 'Giảm 40k đơn từ 400k',
      },
    ];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000} // Thiếu 100k cho Campaign (300k), thiếu 200k cho Voucher (400k)
      />
    );

    expect(await screen.findByText('Giảm 30k đơn 300k')).toBeInTheDocument();
    expect(screen.getByText('MIN400K')).toBeInTheDocument();

    // Tầng 1 Campaign: Gợi ý mua thêm 100.000đ, checkbox disabled
    expect(screen.getByText(/Chưa đạt giá trị đơn tối thiểu 300\.000.*Mua thêm 100\.000/i)).toBeInTheDocument();
    const campCard = screen.getByText('Giảm 30k đơn 300k').closest('div[class*="rounded-2xl"]')!;
    const campCb = campCard.querySelector('[role="checkbox"]')!;
    expect(campCb).toHaveAttribute('aria-disabled', 'true');
    expect(campCb).toHaveAttribute('aria-checked', 'false');

    // Tầng 2 Voucher: Gợi ý mua thêm 200.000đ, checkbox disabled
    expect(screen.getByText(`Chưa đạt giá trị đơn tối thiểu ${formatPrice(400000)}`)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(200000))).toBeInTheDocument();
    const voucherCard = screen.getByText('MIN400K').closest('div[class*="rounded-2xl"]')!;
    const voucherCb = voucherCard.querySelector('[role="checkbox"]')!;
    expect(voucherCb).toHaveAttribute('aria-disabled', 'true');
    expect(voucherCb).toHaveAttribute('aria-checked', 'false');
  });

  it('Matrix 35: CouponModal nhận prop campaigns từ component cha (FloatingVoucherButton) và cơ chế chống cache poisoning khi cachedCampaigns = []', async () => {
    // Phần 1: CouponModal nhận prop campaigns từ FloatingVoucherButton và hiển thị đầy đủ danh sách ở Tầng 1: "Chương trình ưu đãi"
    const parentCampaigns: PublicCampaignItem[] = [
      {
        id: 351,
        name: 'Giảm 25% Đơn Trưa từ FloatingVoucherButton',
        min_order_value: 100000,
        promotion_type: 'order_discount',
        discount_type: 'percent',
        discount_value: 25,
      },
      {
        id: 352,
        name: 'Tặng trà sen đơn từ 300k',
        min_order_value: 300000,
        promotion_type: 'order_gift_discount',
      },
    ];

    // Ngay cả khi API mockCampaignsList rỗng hoặc chưa load xong, prop campaigns từ cha vẫn được ưu tiên render
    mockCampaignsList = [];

    const { rerender } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        campaigns={parentCampaigns}
        subtotal={150000}
      />
    );

    // Hiển thị đầy đủ danh sách ưu đãi ở Tầng 1: "Chương trình ưu đãi (2)"
    expect(await screen.findByText('Chương trình ưu đãi (2)')).toBeInTheDocument();
    expect(screen.getByText('Giảm 25% Đơn Trưa từ FloatingVoucherButton')).toBeInTheDocument();
    expect(screen.getByText('Tặng trà sen đơn từ 300k')).toBeInTheDocument();

    // Thẻ đủ điều kiện (subtotal 150k >= 100k) có checkbox enabled
    const camp1Card = screen.getByText('Giảm 25% Đơn Trưa từ FloatingVoucherButton').closest('div[class*="rounded-2xl"]')!;
    const camp1Checkbox = camp1Card.querySelector('[role="checkbox"]')!;
    expect(camp1Checkbox).toHaveAttribute('aria-disabled', 'false');

    // Thẻ chưa đủ điều kiện (subtotal 150k < 300k) hiển thị gợi ý mua thêm và checkbox disabled
    const camp2Card = screen.getByText('Tặng trà sen đơn từ 300k').closest('div[class*="rounded-2xl"]')!;
    const camp2Checkbox = camp2Card.querySelector('[role="checkbox"]')!;
    expect(camp2Checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Chưa đạt giá trị đơn tối thiểu 300\.000.*Mua thêm 150\.000/i)).toBeInTheDocument();

    // Đóng modal để chuẩn bị cho Phần 2
    rerender(
      <CouponModal
        isOpen={false}
        onClose={vi.fn()}
        subtotal={150000}
      />
    );

    // Phần 2: Kiểm tra cơ chế chống cache poisoning:
    // Nếu cachedCampaigns = [] (do lần mở trước API trả về rỗng []), modal không bị kẹt mà kích hoạt gọi API tải lại khi mở lại.
    resetCouponModalCache();
    vi.mocked(getActiveCampaigns).mockClear();

    // Lần 1: API ban đầu trả về rỗng [] (cachedCampaigns = [])
    mockCampaignsList = [];
    mockVouchersList = [
      {
        id: 1,
        code: 'VOUCHER10K',
        discount_type: 'fixed',
        value: 10000,
        prereq_price: 50000,
        description: 'Giảm 10k đơn từ 50k',
      },
    ];

    const { rerender: rerenderCacheTest } = render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
      />
    );

    // Xác nhận API getActiveCampaigns đã được gọi lần 1
    await waitFor(() => {
      expect(getActiveCampaigns).toHaveBeenCalledTimes(1);
    });

    // Lúc này API trả về rỗng nên không có tầng Chương trình ưu đãi
    expect(screen.queryByText(/Chương trình ưu đãi/i)).toBeNull();
    // Voucher vẫn hiển thị
    expect(await screen.findByText('VOUCHER10K')).toBeInTheDocument();

    // Đóng modal
    rerenderCacheTest(
      <CouponModal
        isOpen={false}
        onClose={vi.fn()}
        subtotal={150000}
      />
    );

    // Sau đó backend có campaign mới được kích hoạt
    const freshCampaign: PublicCampaignItem = {
      id: 353,
      name: 'Flash Sale Cuối Tuần Giảm 50k',
      min_order_value: 50000,
      promotion_type: 'order_discount',
      discount_type: 'fixed',
      discount_value: 50000,
    };
    mockCampaignsList = [freshCampaign];

    // Lần 2: Mở lại modal (không truyền prop campaigns)
    // Nếu bị cache poisoning (kẹt cachedCampaigns = [] vì [] là truthy trong JS), modal sẽ coi cache hợp lệ và KHÔNG gọi API.
    // Với cơ chế chống cache poisoning (kiểm tra cachedCampaigns.length > 0 và chỉ cache khi length > 0),
    // modal phát hiện không có campaign hợp lệ trong cache và kích hoạt gọi lại getActiveCampaigns().
    rerenderCacheTest(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000}
      />
    );

    // Modal kích hoạt gọi API tải lại (lần thứ 2)
    await waitFor(() => {
      expect(getActiveCampaigns).toHaveBeenCalledTimes(2);
    });

    // Modal không bị kẹt ở trạng thái rỗng mà hiển thị đầy đủ campaign mới tải về ở Tầng 1
    expect(await screen.findByText('Chương trình ưu đãi (1)')).toBeInTheDocument();
    expect(screen.getByText('Flash Sale Cuối Tuần Giảm 50k')).toBeInTheDocument();
  });

  it('Matrix 36: Browse Mode - Không đọc localStorage selections, không hiện Đang dùng, không khóa chéo mutex giữa các ưu đãi', async () => {
    resetCouponModalCache();

    // Giả lập checkout trước đó đã lưu campaign và voucher có can_combine_with_promotions = false vào localStorage
    localStorage.setItem('cothaotomca_selected_campaign_ids', JSON.stringify([901]));
    localStorage.setItem('cothaotomca_applied_voucher_codes', JSON.stringify(['VOUCHER_MUTEX']));

    const nonCombinableCamp: PublicCampaignItem = {
      id: 901,
      name: 'Chiến dịch độc quyền 901',
      can_combine_with_promotions: false,
      min_order_value: 0,
      discount_type: 'percent',
      discount_value: 20,
    };
    const otherCamp: PublicCampaignItem = {
      id: 902,
      name: 'Chiến dịch thứ hai 902',
      can_combine_with_promotions: false,
      min_order_value: 0,
      discount_type: 'percent',
      discount_value: 10,
    };
    const nonCombinableVoucher: PublicVoucherItem = {
      id: 801,
      code: 'VOUCHER_MUTEX',
      can_combine_with_promotions: false,
      value: 50000,
      discount_type: 'fixed',
      description: 'Mã giảm giá độc quyền',
    };
    const otherVoucher: PublicVoucherItem = {
      id: 802,
      code: 'VOUCHER_OTHER',
      can_combine_with_promotions: false,
      value: 30000,
      discount_type: 'fixed',
      description: 'Mã giảm giá thứ hai',
    };

    mockCampaignsList = [nonCombinableCamp, otherCamp];
    mockVouchersList = [nonCombinableVoucher, otherVoucher];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        isBrowseOnly={true}
        subtotal={200000}
      />
    );

    // Cả 2 chiến dịch và 2 voucher đều hiển thị
    expect(await screen.findByText('Chiến dịch độc quyền 901')).toBeInTheDocument();
    expect(screen.getByText('Chiến dịch thứ hai 902')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER_MUTEX')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER_OTHER')).toBeInTheDocument();

    // 1. Không hiện badge "Đang dùng" cho bất kỳ ưu đãi nào
    expect(screen.queryByText(/Đang dùng/i)).toBeNull();

    // 2. Không có thông báo khóa chéo mutex
    expect(screen.queryByText(/Không thể sử dụng cùng ưu đãi đã chọn/i)).toBeNull();
    expect(screen.queryByText(/Không thể sử dụng với những ưu đãi đã chọn khác/i)).toBeNull();

    // 3. Toàn bộ các thẻ đều ở trạng thái sáng đẹp bình thường, không thẻ nào bị mờ xám (opacity-50, grayscale)
    const campCard1 = screen.getByText('Chiến dịch độc quyền 901').closest('div[class*="rounded-2xl"]')!;
    const campCard2 = screen.getByText('Chiến dịch thứ hai 902').closest('div[class*="rounded-2xl"]')!;
    const voucherCard1 = screen.getByText('VOUCHER_MUTEX').closest('div[class*="rounded-2xl"]')!;
    const voucherCard2 = screen.getByText('VOUCHER_OTHER').closest('div[class*="rounded-2xl"]')!;

    expect(campCard1.className).not.toContain('opacity-50');
    expect(campCard1.className).not.toContain('ring-2');
    expect(campCard1.className).toContain('border-gray-200');

    expect(campCard2.className).not.toContain('opacity-50');
    expect(campCard2.className).not.toContain('ring-2');
    expect(campCard2.className).toContain('border-gray-200');

    expect(voucherCard1.className).not.toContain('opacity-50');
    expect(voucherCard1.className).not.toContain('ring-2');
    expect(voucherCard1.className).toContain('border-gray-200');

    expect(voucherCard2.className).not.toContain('opacity-50');
    expect(voucherCard2.className).not.toContain('ring-2');
    expect(voucherCard2.className).toContain('border-gray-200');

    // 4. Nút bấm đáy màn hình là "Đặt món ngay", không phải nút áp dụng
    expect(screen.getByRole('button', { name: /Đặt món ngay/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Áp dụng •/i })).toBeNull();
  });

  it('Matrix 37: Chuẩn hóa thị giác 100% cho Campaign và Voucher không đủ điều kiện (test_campaign_order_50k disabled xám, voucher xám)', async () => {
    const ineligibleCampaign: PublicCampaignItem = {
      id: 501,
      name: 'test_campaign_order_50k',
      promotion_type: 'order_discount',
      min_order_value: 50000,
      discount_type: 'fixed',
      discount_value: 10000,
      description: 'Giảm 10k cho đơn từ 50k',
    };

    const ineligibleVoucher: PublicVoucherItem = {
      id: 502,
      code: 'VOUCHER_50K',
      discount_type: 'fixed',
      value: 10000,
      prereq_price: 50000,
      description: 'Giảm 10.000đ cho đơn từ 50.000đ',
    };

    mockCampaignsList = [ineligibleCampaign];
    mockVouchersList = [ineligibleVoucher];

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={30000} // Chưa đạt 50k (thiếu 20k)
        onApplyVoucher={vi.fn()}
      />
    );

    expect(await screen.findByText('test_campaign_order_50k')).toBeInTheDocument();
    expect(screen.getByText('VOUCHER_50K')).toBeInTheDocument();

    // 1. Campaign !isEligible:
    // Thẻ ngoài: opacity-50, border-gray-200, bg-gray-50/70, select-none, cursor-not-allowed
    const campCard = screen.getByText('test_campaign_order_50k').closest('div[class*="rounded-2xl"]')!;
    expect(campCard.className).toContain('opacity-50');
    expect(campCard.className).toContain('border-gray-200');
    expect(campCard.className).toContain('bg-gray-50');
    expect(campCard.className).toContain('cursor-not-allowed');

    // Khối banner bên trái: grayscale, bg-gray-200, border-gray-300, text-gray-500
    const campLeftBox = campCard.querySelector('div[class*="bg-gray-200"]')!;
    expect(campLeftBox).toBeInTheDocument();
    expect(campLeftBox.className).toContain('grayscale');
    expect(campLeftBox.className).toContain('border-gray-300');

    // Tiêu đề campaign: text-gray-600
    const campTitle = screen.getByText('test_campaign_order_50k');
    expect(campTitle.className).toContain('text-gray-600');

    // Checkbox disabled
    const campCheckbox = campCard.querySelector('[role="checkbox"]')!;
    expect(campCheckbox).toHaveAttribute('aria-disabled', 'true');
    expect(campCheckbox).toHaveAttribute('aria-checked', 'false');

    // Click vào thân thẻ KHÔNG mở popup terms
    fireEvent.click(campCard);
    expect(screen.queryByText('Điều khoản chi tiết của test_campaign_order_50k')).toBeNull();

    // Click vào nút "Chi tiết điều kiện áp dụng ›" MỞ popup terms
    const viewTermsBtn = screen.getByRole('button', { name: /Chi tiết điều kiện áp dụng/i });
    fireEvent.click(viewTermsBtn);
    expect(await screen.findByText('Chi Tiết Chương Trình')).toBeInTheDocument();

    // Đóng popup terms bằng nút Quay lại
    const backBtn = screen.getByRole('button', { name: /Quay lại/i });
    fireEvent.click(backBtn);

    // 2. Voucher !isEligible:
    // Thẻ ngoài: opacity-50, border-gray-200, bg-gray-50/70, select-none, cursor-not-allowed
    const voucherCard = screen.getByText('VOUCHER_50K').closest('div[class*="rounded-2xl"]')!;
    expect(voucherCard.className).toContain('opacity-50');
    expect(voucherCard.className).toContain('border-gray-200');
    expect(voucherCard.className).toContain('bg-gray-50');
    expect(voucherCard.className).toContain('cursor-not-allowed');

    // Badge bên trái: bg-gray-400 text-white
    const voucherBadge = voucherCard.querySelector('div[class*="bg-gray-400"]')!;
    expect(voucherBadge).toBeInTheDocument();
    expect(voucherBadge.className).toContain('bg-gray-400');
    expect(voucherBadge.className).toContain('text-white');

    // Tiêu đề voucher: text-gray-600
    const voucherDesc = screen.getByText('Giảm 10.000đ cho đơn từ 50.000đ');
    expect(voucherDesc.className).toContain('text-gray-600');

    // Text mô tả min spend: text-gray-400
    const minSpendText = voucherCard.querySelector('p[class*="text-gray-400"]')!;
    expect(minSpendText).toBeInTheDocument();
    expect(minSpendText.textContent).toContain('Đơn tối thiểu');

    // Checkbox disabled
    const voucherCheckbox = voucherCard.querySelector('[role="checkbox"]')!;
    expect(voucherCheckbox).toHaveAttribute('aria-disabled', 'true');
    expect(voucherCheckbox).toHaveAttribute('aria-checked', 'false');
  });
});
