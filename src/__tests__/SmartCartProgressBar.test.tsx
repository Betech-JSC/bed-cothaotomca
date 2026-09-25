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

describe('SmartCartProgressBar Component Tests', () => {
  const defaultShippingSettings = {
    is_min_amount_enabled: true,
    min_order_amount: 300000,
    shipping_discount_type: 'fixed' as const,
    shipping_discount_value: 30000,
  };

  it('renders progress bar when subtotal is below freeship threshold and no voucher applied', () => {
    const { container } = render(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={null}
        appliedShippingVoucher={null}
      />
    );

    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('automatically hides completely when appliedShippingVoucher is present', () => {
    const shippingVoucher = {
      id: 201,
      code: 'FREESHIP30K',
      discount_type: 'freeship' as const,
      value: 30000,
      is_freeship: true,
    };

    const { container, rerender } = render(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={null}
        appliedShippingVoucher={null}
      />
    );

    // Initial state: visible
    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();

    // User applies shipping voucher -> hides completely
    rerender(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={null}
        appliedShippingVoucher={shippingVoucher as any}
      />
    );

    expect(container.firstChild).toBeNull();

    // User unapplies shipping voucher -> restored
    rerender(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={null}
        appliedShippingVoucher={null}
      />
    );

    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
  });

  it('automatically hides completely when appliedVoucher is a freeship voucher', () => {
    const freeshipVoucher = {
      id: 202,
      code: 'FREESHIP_ORDER',
      discount_type: 'freeship' as const,
      value: 30000,
      is_freeship: true,
      can_combine_with_freeship: true,
    };

    const { container, rerender } = render(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={null}
      />
    );

    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();

    // Apply voucher with is_freeship = true
    rerender(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={freeshipVoucher as any}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('automatically hides (returns null) without redundant banner when voucher explicitly blocks freeship', () => {
    const blockingVoucher = {
      id: 203,
      code: 'NO_FREESHIP_CODE',
      discount_type: 'fixed' as const,
      value: 50000,
      is_freeship: false,
      can_combine_with_freeship: false,
    };

    const { container } = render(
      <SmartCartProgressBar
        subtotal={150000}
        shippingSettings={defaultShippingSettings}
        appliedVoucher={blockingVoucher as any}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByText(/Không thể áp dụng Hỗ trợ phí ship do giỏ hàng đã có mã giảm giá/i)
    ).toBeNull();
  });
});
