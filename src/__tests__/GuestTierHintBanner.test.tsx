import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import viMessages from '@/i18n/locales/vi.json';
import GuestTierHintBanner from '@/components/Checkout/GuestTierHintBanner';

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    return (key: string, values?: Record<string, any>) => {
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
      let text = typeof current === 'string' ? current : key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };
  },
}));

describe('GuestTierHintBanner (Kịch bản 1: Banner khách vãng lai không bị tự tắt sau 2 giây)', () => {
  it('hiển thị đúng thông tin ưu đãi cho khách VIP hạng GOLD', () => {
    const onDismiss = vi.fn();
    render(
      <GuestTierHintBanner
        tier="gold"
        discountPercent={5}
        loginHref="/vi/login?redirect=/vi/checkout"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    );

    expect(screen.getByText(/Số điện thoại này đang có ưu đãi giảm/i)).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('GOLD')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đăng nhập/i })).toHaveAttribute(
      'href',
      '/vi/login?redirect=/vi/checkout'
    );
  });

  it('hiển thị đúng thông tin ưu đãi cho khách VIP hạng DIAMOND', () => {
    const onDismiss = vi.fn();
    render(
      <GuestTierHintBanner
        tier="diamond"
        discountPercent={8}
        loginHref="/vi/login?redirect=/vi/checkout"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    );

    expect(screen.getByText('8%')).toBeInTheDocument();
    expect(screen.getByText('DIAMOND')).toBeInTheDocument();
  });

  it('không bị tự động biến mất sau 2 giây (autoDismissMs = 0)', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(
      <GuestTierHintBanner
        tier="gold"
        discountPercent={5}
        loginHref="/vi/login?redirect=/vi/checkout"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    );

    // Tua thời gian qua 2 giây và 5 giây
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('gọi hàm onDismiss khi người dùng bấm nút [×]', () => {
    const onDismiss = vi.fn();
    render(
      <GuestTierHintBanner
        tier="gold"
        discountPercent={5}
        loginHref="/vi/login?redirect=/vi/checkout"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng thông báo/i });
    fireEvent.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
