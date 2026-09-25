import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SmartCartProgressBar from '@/components/Cart/SmartCartProgressBar';
import VoucherTicketBar from '@/components/Checkout/VoucherTicketBar';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const translations: Record<string, Record<string, string>> = {
      voucher: {
        voucher_ticket_title: 'Mã giảm giá (Voucher)',
        no_voucher_applied: 'Chọn hoặc nhập mã ưu đãi',
        btn_select_voucher: 'Chọn mã',
        btn_remove_voucher: 'Xóa',
        applied_vouchers_success_count: 'Đã áp dụng thành công {count} ưu đãi!',
        freeship_badge_text: 'FREESHIP',
        shipping_discount_badge_text: 'GIẢM SHIP',
      },
      progress_bar: {
        buy_more: 'Mua thêm',
        to_freeship: 'để được Miễn phí ship.',
        applied_freeship: 'Đã đạt Miễn phí vận chuyển',
        cannot_combine_voucher: 'Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá (Không áp dụng đồng thời).',
      },
    };

    const t = (key: string, values?: Record<string, any>) => {
      let text = translations[namespace || '']?.[key] || key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };
    return t;
  },
}));

describe('Voucher Ticket Bar & SmartCartProgressBar Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Issue 2: VoucherTicketBar Xóa button behavior', () => {
    it('renders Xóa button when only activeCampaignName is present (e.g. G1_GIAM10K_NOSHIP)', () => {
      const handleRemove = vi.fn();
      const handleClick = vi.fn();

      render(
        <VoucherTicketBar
          appliedVoucher={null}
          appliedShippingVoucher={null}
          activeCampaignName="G1_GIAM10K_NOSHIP"
          onClick={handleClick}
          onRemove={handleRemove}
        />
      );

      // Campaign badge is visible
      expect(screen.getByText('G1_GIAM10K_NOSHIP')).toBeInTheDocument();

      // Button Xóa is rendered and clickable
      const removeBtn = screen.getByRole('button', { name: 'Xóa' });
      expect(removeBtn).toBeInTheDocument();

      // Clicking Xóa calls onRemove
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('renders both Chọn mã and Xóa button when food voucher is applied', () => {
      const handleRemove = vi.fn();
      const handleClick = vi.fn();

      render(
        <VoucherTicketBar
          appliedVoucher={{ code: 'GIAM20K', value: 20000, discountAmount: 20000 }}
          appliedShippingVoucher={null}
          onClick={handleClick}
          onRemove={handleRemove}
        />
      );

      const removeBtn = screen.getByRole('button', { name: 'Xóa' });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Issue 3: SmartCartProgressBar removes redundant red banner when freeship is blocked', () => {
    it('returns null and does not render red conflict warning box when campaign blocks freeship', () => {
      const { container } = render(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedCampaign={{
            name: 'G1_GIAM10K_NOSHIP',
            can_combine_with_freeship: false,
          }}
        />
      );

      // Must return null (empty DOM, no red warning banner)
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/không áp dụng cùng chương trình giảm phí vận chuyển/i)).toBeNull();
      expect(screen.queryByText(/Không thể áp dụng Hỗ trợ phí ship/i)).toBeNull();
    });

    it('returns null and does not render red conflict warning box when voucher blocks freeship', () => {
      const { container } = render(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
          appliedVoucher={{
            id: 201,
            code: 'TEST_NO_SHIP',
            discount_type: 'fixed',
            value: 20000,
            can_combine_with_freeship: false,
          } as any}
        />
      );

      // Must return null (empty DOM, no red warning banner)
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText(/Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá/i)).toBeNull();
    });

    it('renders normal progress bar when freeship is not blocked', () => {
      const { container } = render(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 300000 }}
        />
      );

      expect(container.firstChild).not.toBeNull();
      expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
    });
  });
});
