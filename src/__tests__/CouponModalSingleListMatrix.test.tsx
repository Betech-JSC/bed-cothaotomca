import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    resetCouponModalCache();
    mockCurrentUser = null;
    mockVouchersList = [];
    mockCampaignsList = [];
    mockValidateVoucherResult = { valid: false, message: 'Mã không tồn tại' };
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

    // Headers các phần hiển thị rõ
    expect(screen.getByText(/Chương trình ưu đãi/i)).toBeInTheDocument();
    expect(screen.getByText(/Mã giảm giá khả dụng/i)).toBeInTheDocument();
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

  it('Matrix 16: Campaign phân tầng - Tier 1 (Khả dụng) và Tier 2 (Chưa đủ điều kiện với thông báo thiếu tiền)', async () => {
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

    // Check tier headers
    expect(screen.getByText(/Chương trình ưu đãi khả dụng/i)).toBeInTheDocument();
    expect(screen.getByText(/Chương trình chưa đủ điều kiện/i)).toBeInTheDocument();

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

  it('Matrix 18: Single-choice switch mượt mà giữa các campaign không cộng dồn, không bị deadlock', async () => {
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

    const cbFlash = screen.getByText('Flash Sale Độc Quyền').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbPromo = screen.getByText('Giảm 20k Đơn 100k').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    expect(cbFlash).toHaveAttribute('aria-disabled', 'false');
    expect(cbPromo).toHaveAttribute('aria-disabled', 'false');

    // Chọn Flash Sale Độc Quyền (can_combine_with_promotions = false)
    fireEvent.click(cbFlash);
    expect(cbFlash).toHaveAttribute('aria-checked', 'true');

    // Campaign 202 KHÔNG bị khóa cứng (aria-disabled = false) để người dùng có thể switch linh hoạt
    expect(cbPromo).toHaveAttribute('aria-disabled', 'false');

    // Click vào Campaign 202 -> Tự động uncheck Flash Sale và chuyển sang chọn Campaign 202 (Single-choice switch)
    fireEvent.click(cbPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'true');
    expect(cbFlash).toHaveAttribute('aria-checked', 'false');

    // Click vào Campaign 202 đang chọn -> Cho phép uncheck hoàn toàn
    fireEvent.click(cbPromo);
    expect(cbPromo).toHaveAttribute('aria-checked', 'false');
    expect(cbFlash).toHaveAttribute('aria-checked', 'false');
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

  it('Matrix 21: Khóa và mở Freeship Voucher theo can_combine_with_freeship của Campaign', async () => {
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

    const cbCampaign = screen.getByText('Campaign Cấm Freeship').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;
    const cbFreeship = screen.getByText('FREESHIP15K').closest('div[class*="rounded-2xl"]')!.querySelector('[role="checkbox"]')!;

    // Chưa chọn Campaign -> Freeship Voucher không bị khóa
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'false');

    // Chọn Campaign cấm Freeship
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'true');

    // Freeship voucher bị khóa
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Chương trình khuyến mãi hiện tại không áp dụng cùng mã Freeship/i)).toBeInTheDocument();

    // Bỏ chọn Campaign -> Freeship Voucher mở khóa lại
    fireEvent.click(cbCampaign);
    expect(cbCampaign).toHaveAttribute('aria-checked', 'false');
    expect(cbFreeship).toHaveAttribute('aria-disabled', 'false');
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
});
