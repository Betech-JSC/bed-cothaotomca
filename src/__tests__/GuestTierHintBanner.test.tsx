import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import GuestTierHintBanner from '@/components/Checkout/GuestTierHintBanner';

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
