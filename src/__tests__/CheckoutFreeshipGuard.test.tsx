import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal from '@/components/Voucher/CouponModal';
import {
  PublicVoucherItem,
  calculateVoucherDiscount,
  validateVoucher,
} from '@/services/orderService';
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

    t.rich = (key: string) => resolveKey(key);
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
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
}));

// Mock campaignService
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

// Mock orderService getAvailableVouchers
let mockVouchersList: PublicVoucherItem[] = [];
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getAvailableVouchers: vi.fn().mockImplementation(() => Promise.resolve(mockVouchersList)),
  };
});

describe('Checkout Freeship Guard & Anti-waste Tests (Tasks 3.1, 3.2, 3.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    mockVouchersList = [];
  });

  describe('Task 3.1: CouponModal Freeship Guard', () => {
    it('chặn và làm mờ voucher freeship khi đơn đã đạt Freeship tự động 100% (isAutoFreeship: true)', async () => {
      const freeshipVoucher: PublicVoucherItem = {
        id: 1,
        code: 'FREESHIP30K',
        discount_type: 'freeship',
        value: 30000,
        is_freeship: true,
        prereq_price: 100000,
        description: 'Miễn phí vận chuyển cho đơn từ 100k',
      };
      mockVouchersList = [freeshipVoucher];

      const { container } = render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          shippingFee={0}
          isAutoFreeship={true}
          onApplyVoucher={vi.fn()}
        />
      );

      expect(await screen.findByText('FREESHIP30K')).toBeInTheDocument();
      expect(screen.getByText('Đơn hàng đã được Freeship tự động')).toBeInTheDocument();

      const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
      expect(disabledCard).toBeInTheDocument();
    });

    it('chặn và làm mờ voucher freeship khi isFreeship=true và shippingFee=0', async () => {
      const freeshipVoucher: PublicVoucherItem = {
        id: 2,
        code: 'SHIPFREE',
        discount_type: 'freeship',
        value: 0,
        is_freeship: true,
        description: 'Freeship toàn quốc',
      };
      mockVouchersList = [freeshipVoucher];

      const { container } = render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={300000}
          shippingFee={0}
          isFreeship={true}
          onApplyVoucher={vi.fn()}
        />
      );

      expect(await screen.findByText('SHIPFREE')).toBeInTheDocument();
      expect(screen.getByText('Đơn hàng đã được Freeship tự động')).toBeInTheDocument();

      const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
      expect(disabledCard).toBeInTheDocument();
    });

    it('vẫn cho phép áp dụng voucher giảm giá hàng khi đơn đã đạt Freeship tự động', async () => {
      const orderVoucher: PublicVoucherItem = {
        id: 3,
        code: 'DISCOUNT20K',
        discount_type: 'fixed',
        value: 20000,
        prereq_price: 100000,
        description: 'Giảm 20.000đ cho đơn từ 100k',
      };
      mockVouchersList = [orderVoucher];

      const mockApply = vi.fn();
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          shippingFee={0}
          isAutoFreeship={true}
          onApplyVoucher={mockApply}
        />
      );

      expect(await screen.findByText('DISCOUNT20K')).toBeInTheDocument();
      expect(screen.queryByText('Đơn hàng đã được Freeship tự động')).not.toBeInTheDocument();
      expect(screen.getAllByText('Áp dụng').length).toBeGreaterThanOrEqual(1);
    });

    it('cho phép áp voucher freeship bình thường khi đơn CHƯA được freeship tự động', async () => {
      const freeshipVoucher: PublicVoucherItem = {
        id: 4,
        code: 'FREESHIP50K',
        discount_type: 'freeship',
        value: 50000,
        is_freeship: true,
        prereq_price: 150000,
        description: 'Giảm tối đa 50k phí ship',
      };
      mockVouchersList = [freeshipVoucher];

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          shippingFee={35000}
          isFreeship={false}
          isAutoFreeship={false}
          onApplyVoucher={vi.fn()}
        />
      );

      expect(await screen.findByText('FREESHIP50K')).toBeInTheDocument();
      expect(screen.queryByText('Đơn hàng đã được Freeship tự động')).not.toBeInTheDocument();
      expect(screen.getAllByText('Áp dụng').length).toBeGreaterThanOrEqual(1);
    });

    it('chặn voucher freeship khi canCombineWithFreeship === false', async () => {
      const freeshipVoucher: PublicVoucherItem = {
        id: 5,
        code: 'SHIP30K',
        discount_type: 'freeship',
        value: 30000,
        is_freeship: true,
        description: 'Giảm 30k phí ship',
      };
      mockVouchersList = [freeshipVoucher];

      const { container } = render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
          shippingFee={40000}
          canCombineWithFreeship={false}
          onApplyVoucher={vi.fn()}
        />
      );

      expect(await screen.findByText('SHIP30K')).toBeInTheDocument();
      expect(screen.getByText('Mã giảm giá đơn hàng hiện tại không áp dụng đồng thời với mã Freeship')).toBeInTheDocument();

      const disabledCard = container.querySelector('.opacity-60.bg-gray-100\\/70.pointer-events-none.cursor-not-allowed.select-none');
      expect(disabledCard).toBeInTheDocument();
    });
  });

  describe('Task 3.3: Voucher Discount Calculation & max_discount cap', () => {
    it('áp dụng trần max_discount cho voucher loại freeship khi cước ship cao hơn trần', () => {
      const voucher = {
        id: 10,
        code: 'FREESHIP30K',
        value: 0,
        discountType: 'freeship' as const,
        maxDiscount: 30000,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(voucher, 200000, 50000);
      expect(discount).toBe(30000);
    });

    it('áp dụng phí ship thực tế khi cước ship thấp hơn trần max_discount', () => {
      const voucher = {
        id: 11,
        code: 'FREESHIP30K',
        value: 0,
        discountType: 'freeship' as const,
        maxDiscount: 30000,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(voucher, 200000, 20000);
      expect(discount).toBe(20000);
    });

    it('miễn phí 100% phí ship khi voucher freeship không có trần max_discount', () => {
      const voucher = {
        id: 12,
        code: 'FREESHIP100',
        value: 0,
        discountType: 'freeship' as const,
        maxDiscount: null,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(voucher, 200000, 45000);
      expect(discount).toBe(45000);
    });
  });

  describe('Task 3.2: validateVoucher API client query param', () => {
    it('truyền query param is_auto_freeship=1 khi isAutoFreeship là true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          valid: true,
          voucher: {
            id: 1,
            code: 'FREESHIP',
            value: 0,
            discount_type: 'freeship',
            is_freeship: true,
          },
          message: 'Hợp lệ',
        }),
      });
      global.fetch = mockFetch;

      await validateVoucher(
        'FREESHIP',
        200000,
        0,
        false,
        0,
        undefined,
        undefined,
        true
      );

      expect(mockFetch).toHaveBeenCalled();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('is_auto_freeship=1');
    });

    it('truyền query param is_auto_freeship=0 khi isAutoFreeship là false', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          valid: true,
          voucher: {
            id: 2,
            code: 'FREESHIP',
            value: 0,
            discount_type: 'freeship',
            is_freeship: true,
          },
          message: 'Hợp lệ',
        }),
      });
      global.fetch = mockFetch;

      await validateVoucher(
        'FREESHIP',
        100000,
        30000,
        false,
        0,
        undefined,
        undefined,
        false
      );

      expect(mockFetch).toHaveBeenCalled();
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('is_auto_freeship=0');
    });
  });
});
