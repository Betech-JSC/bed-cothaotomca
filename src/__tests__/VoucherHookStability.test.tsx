import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import SmartCartProgressBar from '@/components/Cart/SmartCartProgressBar';
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
    return t;
  },
}));

describe('Voucher Hook Stability Test (Fix React Error #300)', () => {
  it('should render without throwing React error #300 when applying TEST_SHIP_30K with can_combine_with_promotions=false', () => {
    const shippingSettings = {
      is_min_amount_enabled: true,
      min_order_amount: 300000,
      shipping_discount_type: 'fixed' as const,
      shipping_discount_value: 30000,
      can_combine_with_promotions: false,
    };

    const voucherItem = {
      id: 1,
      code: 'TEST_SHIP_30K',
      discount_type: 'freeship' as const,
      value: 30000,
      is_freeship: true,
      can_combine_with_promotions: false,
      can_combine_with_freeship: false,
    };

    // Render 1: Initial state before applying voucher (appliedVoucher is null)
    const { rerender } = render(
      <SmartCartProgressBar
        subtotal={200000}
        shippingSettings={shippingSettings}
        appliedVoucher={null}
      />
    );

    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();

    // Render 2: User applies TEST_SHIP_30K -> appliedVoucher is set
    // In buggy code: Early return occurred BEFORE useMemo, resulting in fewer hooks rendered (#300).
    // In fixed code: All hooks execute unconditionally before early return, so rerender succeeds with 0 errors.
    expect(() => {
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={shippingSettings}
          appliedVoucher={voucherItem as any}
        />
      );
    }).not.toThrow();

    expect(
      screen.getByText(/Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá/i)
    ).toBeInTheDocument();

    // Render 3: User removes voucher -> appliedVoucher is null again
    expect(() => {
      rerender(
        <SmartCartProgressBar
          subtotal={200000}
          shippingSettings={shippingSettings}
          appliedVoucher={null}
        />
      );
    }).not.toThrow();

    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
  });
});
