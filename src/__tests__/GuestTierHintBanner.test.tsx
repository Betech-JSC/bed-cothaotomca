import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import viMessages from '@/i18n/locales/vi.json';
import enMessages from '@/i18n/locales/en.json';
import GuestTierHintBanner from '@/components/Checkout/GuestTierHintBanner';

// Link next-intl được mock: serialize href object thành `pathname?query` để assert.
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: any) => {
    const hrefStr =
      typeof href === 'string'
        ? href
        : `${href?.pathname}${href?.query ? `?${new URLSearchParams(href.query).toString()}` : ''}`;
    return (
      <a href={hrefStr} {...props}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

const LOGIN_HREF = { pathname: '/login' as const, query: { redirect: '/checkout' } };

const renderBanner = (
  props: Partial<React.ComponentProps<typeof GuestTierHintBanner>> = {},
  locale: 'vi' | 'en' = 'vi'
) => {
  const onDismiss = props.onDismiss ?? vi.fn();
  const utils = render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : viMessages} timeZone="Asia/Ho_Chi_Minh">
      <GuestTierHintBanner
        tier="gold"
        discountPercent={5}
        loginHref={LOGIN_HREF}
        autoDismissMs={0}
        {...props}
        onDismiss={onDismiss}
      />
    </NextIntlClientProvider>
  );
  return { ...utils, onDismiss };
};

const bannerText = () => screen.getByRole('status').querySelector('p')!.textContent;

describe('GuestTierHintBanner — nhánh ưu đãi thường trực (text chính xác theo spec)', () => {
  it('VI — GOLD 5%: đúng câu đã chốt, GOLD in đậm, "Đăng nhập" là link có redirect', () => {
    renderBanner({ tier: 'gold', discountPercent: 5 }, 'vi');

    expect(bannerText()).toBe(
      'Bạn là thành viên hạng GOLD! Đăng nhập để nhận ngay ưu đãi đặc quyền thành viên giảm 5% cho đơn hàng này.'
    );
    const rank = screen.getByText('GOLD');
    expect(rank).toHaveClass('font-bold');
    const link = screen.getByRole('link', { name: 'Đăng nhập' });
    expect(link.getAttribute('href')).toContain('/login');
    expect(link.getAttribute('href')).toContain('redirect=');
    expect(link.getAttribute('href')).toContain(encodeURIComponent('/checkout'));
    expect(bannerText()).not.toContain('🎁');
  });

  it('VI — DIAMOND 8%: đúng câu đã chốt', () => {
    renderBanner({ tier: 'diamond', discountPercent: 8 }, 'vi');

    expect(bannerText()).toBe(
      'Bạn là thành viên hạng DIAMOND! Đăng nhập để nhận ngay ưu đãi đặc quyền thành viên giảm 8% cho đơn hàng này.'
    );
    expect(screen.getByText('DIAMOND')).toHaveClass('font-bold');
  });

  it('EN — GOLD 5%: đúng câu tiếng Anh', () => {
    renderBanner({ tier: 'gold', discountPercent: 5 }, 'en');

    expect(bannerText()).toBe('You are a GOLD member! Log in to get your exclusive member discount of 5% on this order.');
    expect(screen.getByText('GOLD')).toHaveClass('font-bold');
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toContain('/login');
  });

  it('EN — DIAMOND 8%: đúng câu tiếng Anh, "Log in" là link có redirect', () => {
    renderBanner({ tier: 'diamond', discountPercent: 8 }, 'en');

    expect(bannerText()).toBe(
      'You are a DIAMOND member! Log in to get your exclusive member discount of 8% on this order.'
    );
    expect(screen.getByText('DIAMOND')).toHaveClass('font-bold');
    const link = screen.getByRole('link', { name: 'Log in' });
    expect(link.getAttribute('href')).toContain('/login');
    expect(link.getAttribute('href')).toContain('redirect=');
  });
});

describe('GuestTierHintBanner — nhánh mừng lên hạng (giữ nguyên nội dung cũ)', () => {
  it('VI — giữ nguyên câu mừng lên hạng kèm 🎉', () => {
    renderBanner({ tier: 'gold', discountPercent: 10, isUpgradeCelebration: true }, 'vi');

    expect(bannerText()).toBe(
      '🎉 Chúc mừng bạn vừa thăng hạng GOLD! Đăng nhập để nhận ngay ưu đãi Mừng lên hạng giảm 10% cho đơn hàng này.'
    );
    expect(screen.getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toContain('/login');
  });

  it('EN — giữ nguyên câu mừng lên hạng', () => {
    renderBanner({ tier: 'diamond', discountPercent: 15, isUpgradeCelebration: true }, 'en');

    expect(bannerText()).toBe(
      '🎉 Congratulations on reaching DIAMOND! Log in to receive your 15% Upgrade Celebration discount for this order.'
    );
  });
});

describe('GuestTierHintBanner (Kịch bản 1: Banner khách vãng lai không bị tự tắt sau 2 giây)', () => {
  it('không bị tự động biến mất sau 2 giây (autoDismissMs = 0)', () => {
    vi.useFakeTimers();
    const { onDismiss } = renderBanner({ autoDismissMs: 0 });

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
    const { onDismiss } = renderBanner();

    const closeBtn = screen.getByRole('button', { name: /Đóng thông báo/i });
    fireEvent.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
