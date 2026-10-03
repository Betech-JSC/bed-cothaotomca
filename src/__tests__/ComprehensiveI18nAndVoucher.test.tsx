import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import viMessages from '@/i18n/locales/vi.json';
import enMessages from '@/i18n/locales/en.json';
import { formatMemberBadgeText } from '@/components/Checkout/VoucherTicketBar';
import GuestTierHintBanner from '@/components/Checkout/GuestTierHintBanner';
import FloatingVoucherButton from '@/components/Voucher/FloatingVoucherButton';
import WardSelectCombobox from '@/components/Checkout/WardSelectCombobox';
import type { CampaignLockResult } from '@/types/campaign';

// Mock routing Link
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

// Mock CartContext for FloatingVoucherButton & CouponModal
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: [{ productId: 1, title: 'Bánh mì', quantity: 2, unitPrice: 20000 }],
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    hasOutOfStockItems: false,
  }),
}));

// Mock AuthContext for FloatingVoucherButton & CouponModal
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: () => ({
    tier: 'standard',
    name: 'Standard',
    discountPercent: 0,
    label: '',
    isUpgradeCelebration: false,
    celebrationTier: null,
  }),
  calculateMemberDiscount: () => 0,
}));

// Mock next-intl
let currentLocale = 'vi';
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const messages = currentLocale === 'en' ? enMessages : viMessages;
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split('.');
      let current: any = messages;
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

    // Minimal t.rich: nội suy {value} rồi thay <tag>chunk</tag> bằng callback render tương ứng
    t.rich = (key: string, values: Record<string, any> = {}) => {
      const plainValues = Object.fromEntries(
        Object.entries(values).filter(([, v]) => typeof v !== 'function')
      );
      const text: string = t(key, plainValues);
      const parts: React.ReactNode[] = [];
      const tagRe = /<(\w+)>(.*?)<\/\1>/g;
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = tagRe.exec(text))) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const render = values[match[1]];
        parts.push(
          <React.Fragment key={match.index}>
            {typeof render === 'function' ? render(match[2]) : match[2]}
          </React.Fragment>
        );
        last = match.index + match[0].length;
      }
      if (last < text.length) parts.push(text.slice(last));
      return parts;
    };

    return t;
  },
}));

describe('Comprehensive i18n & Voucher Standardization Tests', () => {
  describe('1. Dictionary Parity & Fixed Bug Verifications', () => {
    it('sửa lỗi shipping_discount_badge_text trong en.json thành "SHIPPING OFF"', () => {
      expect(enMessages.voucher.shipping_discount_badge_text).toBe('SHIPPING OFF');
      expect(viMessages.voucher.shipping_discount_badge_text).toBe('GIẢM SHIP');
    });

    it('sửa lỗi oos_warning trong en.json thành câu chuẩn tiếng Anh', () => {
      expect(enMessages.checkout.oos_warning).toBe('Please remove out-of-stock items [Out of stock] to proceed');
      expect(viMessages.checkout.oos_warning).toBe('Vui lòng xóa sản phẩm [Tạm hết hàng] để tiếp tục đặt hàng');
    });

    it('khớp đầy đủ các key thiết yếu giữa vi.json và en.json', () => {
      const requiredVoucherKeys = [
        'skip_promotion_and_continue',
        'mutex_member_tier',
        'member_tier_card_title_gold',
        'member_tier_card_title_diamond',
        'member_tier_terms_title',
        'loading',
      ];
      for (const key of requiredVoucherKeys) {
        expect((viMessages.voucher as any)[key], `vi.voucher.${key} must exist`).toBeDefined();
        expect((enMessages.voucher as any)[key], `en.voucher.${key} must exist`).toBeDefined();
      }

      const requiredCheckoutCostKeys = [
        'member_discount_unselected',
        'member_discount_mutex',
        'member_discount_label',
        'member_upgrade_label',
        'member_discount_default',
        'regular_price_only',
        'order_points_accumulated',
      ];
      for (const key of requiredCheckoutCostKeys) {
        expect((viMessages.checkout.cost_summary as any)[key], `vi.checkout.cost_summary.${key} must exist`).toBeDefined();
        expect((enMessages.checkout.cost_summary as any)[key], `en.checkout.cost_summary.${key} must exist`).toBeDefined();
      }

      const requiredProfileKeys = [
        'tab_addresses',
        'tab_password',
        'tab_orders',
        'order_items_list',
        'quantity',
        'delivery_info',
        'payment_details',
        'reorder_this_order',
      ];
      for (const key of requiredProfileKeys) {
        expect((viMessages.profile as any)[key], `vi.profile.${key} must exist`).toBeDefined();
        expect((enMessages.profile as any)[key], `en.profile.${key} must exist`).toBeDefined();
      }

      const requiredErrors500Keys = ['title', 'subtitle', 'description', 'go_home'];
      for (const key of requiredErrors500Keys) {
        expect(((viMessages.errors as any)['500'] as any)[key], `vi.errors.500.${key} must exist`).toBeDefined();
        expect(((enMessages.errors as any)['500'] as any)[key], `en.errors.500.${key} must exist`).toBeDefined();
      }
    });
  });

  describe('2. VoucherTicketBar formatMemberBadgeText with Language Support', () => {
    it('định dạng badge hội viên với tiền tố tiếng Việt', () => {
      expect(formatMemberBadgeText('Gold', undefined, undefined, 'Hội viên')).toBe('Hội viên Gold');
      expect(formatMemberBadgeText('Diamond', undefined, undefined, 'Hội viên')).toBe('Hội viên Diamond');
    });

    it('định dạng badge hội viên với tiền tố tiếng Anh ("Member")', () => {
      expect(formatMemberBadgeText('Gold', undefined, undefined, 'Member')).toBe('Member Gold');
      expect(formatMemberBadgeText('Diamond', undefined, undefined, 'Member')).toBe('Member Diamond');
    });

    it('giữ tương thích ngược hoàn hảo khi không truyền prefix (default "Hội viên")', () => {
      expect(formatMemberBadgeText('Gold')).toBe('Hội viên Gold');
      expect(formatMemberBadgeText('Diamond')).toBe('Hội viên Diamond');
      expect(formatMemberBadgeText(undefined)).toBe('Hội viên');
    });
  });

  describe('3. Mutex Lock Logic with reasonCode', () => {
    it('hỗ trợ reasonCode "MUTEX_MEMBER_TIER" trên CampaignLockResult để logic lock độc lập với ngôn ngữ', () => {
      const lockResult: CampaignLockResult = {
        locked: true,
        reason: 'Không áp dụng đồng thời với ưu đãi thành viên',
        reasonCode: 'MUTEX_MEMBER_TIER',
      };

      expect(lockResult.locked).toBe(true);
      expect(lockResult.reasonCode).toBe('MUTEX_MEMBER_TIER');

      // Kiểm tra logic so sánh đa ngôn ngữ
      const isLockedOnlyByMember =
        lockResult.reasonCode === 'MUTEX_MEMBER_TIER' ||
        lockResult.reason === 'Không áp dụng đồng thời với ưu đãi thành viên';
      expect(isLockedOnlyByMember).toBe(true);

      // Thậm chí khi câu chữ lý do hiển thị tiếng Anh:
      const enLockResult: CampaignLockResult = {
        locked: true,
        reason: 'Cannot combine with member benefits',
        reasonCode: 'MUTEX_MEMBER_TIER',
      };
      const isLockedOnlyByMemberEn =
        enLockResult.reasonCode === 'MUTEX_MEMBER_TIER' ||
        enLockResult.reason === 'Không áp dụng đồng thời với ưu đãi thành viên';
      expect(isLockedOnlyByMemberEn).toBe(true);
    });
  });

  describe('4. Component "Trắng i18n" Standardizations', () => {
    it('GuestTierHintBanner render chuẩn đa ngôn ngữ với thăng hạng và ưu đãi thường', () => {
      currentLocale = 'vi';
      const handleClose = vi.fn();

      const { rerender } = render(
        <GuestTierHintBanner
          tier="gold"
          discountPercent={10}
          isUpgradeCelebration={true}
          loginHref="/login"
          onDismiss={handleClose}
        />
      );

      expect(screen.getByText(/Chúc mừng bạn vừa thăng hạng/i)).toBeInTheDocument();
      expect(screen.getByText(/Đăng nhập/i)).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();

      // Kiểm tra chuyển sang locale EN
      currentLocale = 'en';
      rerender(
        <GuestTierHintBanner
          tier="gold"
          discountPercent={10}
          isUpgradeCelebration={true}
          loginHref="/login"
          onDismiss={handleClose}
        />
      );
      expect(screen.getByText(/Congratulations on reaching/i)).toBeInTheDocument();
      expect(screen.getByText(/Log in/i)).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();

      // Nhánh ưu đãi thường trực (is_upgrade_celebration=false) — câu rich-text mới
      currentLocale = 'vi';
      rerender(
        <GuestTierHintBanner
          tier="gold"
          discountPercent={5}
          isUpgradeCelebration={false}
          loginHref="/login"
          onDismiss={handleClose}
        />
      );
      expect(screen.getByRole('status').querySelector('p')!.textContent).toBe(
        'Bạn là thành viên hạng GOLD! Đăng nhập để nhận ngay ưu đãi đặc quyền thành viên giảm 5% cho đơn hàng này.'
      );
      expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');

      currentLocale = 'en';
      rerender(
        <GuestTierHintBanner
          tier="diamond"
          discountPercent={8}
          isUpgradeCelebration={false}
          loginHref="/login"
          onDismiss={handleClose}
        />
      );
      expect(screen.getByRole('status').querySelector('p')!.textContent).toBe(
        'You are a DIAMOND member! Log in to get your exclusive member discount of 8% on this order.'
      );
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    });

    it('FloatingVoucherButton render chuẩn đa ngôn ngữ cho CTA nút nổi', () => {
      currentLocale = 'vi';
      const { rerender } = render(<FloatingVoucherButton />);

      expect(screen.getByText('Ưu đãi')).toBeInTheDocument();
      expect(screen.getByLabelText('Xem ưu đãi và khuyến mãi')).toBeInTheDocument();

      currentLocale = 'en';
      rerender(<FloatingVoucherButton />);
      expect(screen.getByText('Offers')).toBeInTheDocument();
      expect(screen.getByLabelText('View promotions and offers')).toBeInTheDocument();
    });

    it('WardSelectCombobox render chuẩn placeholder và default errorMessage theo locale', () => {
      currentLocale = 'vi';
      const mockWards = [
        { id: '1', name: 'Phường 1', district: 'Quận 1' },
        { id: '2', name: 'Phường 2', district: 'Quận 1' },
      ];

      const { rerender } = render(
        <WardSelectCombobox
          wards={mockWards}
          selectedWardId=""
          selectedWardName=""
          onSelectWard={vi.fn()}
          hasError={true}
        />
      );

      expect(screen.getByPlaceholderText(/-- Gõ hoặc chọn Phường \/ Xã/i)).toBeInTheDocument();
      expect(screen.getByText('* Vui lòng chọn Phường / Xã (Khu vực giao).')).toBeInTheDocument();

      currentLocale = 'en';
      rerender(
        <WardSelectCombobox
          wards={mockWards}
          selectedWardId=""
          selectedWardName=""
          onSelectWard={vi.fn()}
          hasError={true}
        />
      );

      expect(screen.getByPlaceholderText(/-- Type or select Ward \/ Commune/i)).toBeInTheDocument();
      expect(screen.getByText('* Please select a delivery Ward / Commune.')).toBeInTheDocument();
    });
  });
});
