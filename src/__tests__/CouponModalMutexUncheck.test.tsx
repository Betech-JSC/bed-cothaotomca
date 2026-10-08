import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import CouponModal, { resetCouponModalCache } from '@/components/Voucher/CouponModal';
import { PublicCampaignItem } from '@/services/campaignService';
import { PublicVoucherItem } from '@/services/orderService';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string) => {
      if (key === 'voucher_mutex_locked') return 'Không thể sử dụng với những ưu đãi đã chọn khác.';
      if (key === 'campaign_mutex_locked') return 'Không thể sử dụng cùng ưu đãi đã chọn.';
      if (key === 'mutex_member_tier') return 'Không áp dụng đồng thời với ưu đãi thành viên';
      if (key === 'in_use') return 'Đang dùng';
      if (key === 'promo_tag') return 'ƯU ĐÃI';
      if (key === 'duration') return 'Hạn dùng:';
      if (key === 'view_terms_detail') return 'Chi tiết điều kiện áp dụng ›';
      return key;
    };
  },
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      token: null,
      refreshUser: vi.fn(),
    }),
  };
});

describe('CouponModal Mutex Uncheck Tests (STT 30)', () => {
  const exclusiveCampaign1: PublicCampaignItem = {
    id: 101,
    name: 'Chiến dịch Độc Quyền A',
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    promotion_type: 'order_discount',
    discount_type: 'fixed',
    discount_value: 30000,
    min_order_value: 0,
  };

  const exclusiveCampaign2: PublicCampaignItem = {
    id: 102,
    name: 'Chiến dịch Độc Quyền B',
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    promotion_type: 'order_discount',
    discount_type: 'fixed',
    discount_value: 40000,
    min_order_value: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCouponModalCache();
  });

  it('Campaign đang được chọn (isSelected = true) hiển thị trạng thái Đang dùng và không bị khóa với chính nó', async () => {
    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        campaigns={[exclusiveCampaign1, exclusiveCampaign2]}
        appliedCampaignIds={[101]}
        vouchers={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch Độc Quyền A')).toBeInTheDocument();
      expect(screen.getByText('Chiến dịch Độc Quyền B')).toBeInTheDocument();
    });

    // Exclusive A is selected -> should show 'Đang dùng'
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();

    // Exclusive B is locked because A is non-combinable
    expect(screen.getByText('Không thể sử dụng cùng ưu đãi đã chọn.')).toBeInTheDocument();
  });

  it('Người dùng click vào checkbox của campaign độc quyền đang chọn để uncheck thành công', async () => {
    const handleApplyCampaigns = vi.fn();

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        campaigns={[exclusiveCampaign1, exclusiveCampaign2]}
        appliedCampaignIds={[101]}
        onApplyCampaigns={handleApplyCampaigns}
        vouchers={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch Độc Quyền A')).toBeInTheDocument();
    });

    // Find the checkbox for campaign A
    const checkboxA = screen.getByRole('checkbox', { name: 'Chiến dịch Độc Quyền A' });
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxA).toHaveAttribute('aria-disabled', 'false');

    // Click checkbox to uncheck
    fireEvent.click(checkboxA);

    // Now A should no longer be checked
    expect(checkboxA).toHaveAttribute('aria-checked', 'false');

    // And campaign B should no longer be locked!
    await waitFor(() => {
      expect(screen.queryByText('Không thể sử dụng cùng ưu đãi đã chọn.')).not.toBeInTheDocument();
    });

    // Checkbox B is now enabled
    const checkboxB = screen.getByRole('checkbox', { name: 'Chiến dịch Độc Quyền B' });
    expect(checkboxB).toHaveAttribute('aria-disabled', 'false');

    // Now clicking B selects B
    fireEvent.click(checkboxB);
    expect(checkboxB).toHaveAttribute('aria-checked', 'true');
  });

  it('Người dùng click vào thẻ card của campaign độc quyền đang chọn để uncheck thành công', async () => {
    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={200000}
        campaigns={[exclusiveCampaign1, exclusiveCampaign2]}
        appliedCampaignIds={[101]}
        vouchers={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch Độc Quyền A')).toBeInTheDocument();
    });

    const checkboxA = screen.getByRole('checkbox', { name: 'Chiến dịch Độc Quyền A' });
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');

    // Click on the title of Campaign A (part of the card)
    const cardTitle = screen.getByText('Chiến dịch Độc Quyền A');
    fireEvent.click(cardTitle);

    // After uncheck, A is unchecked
    expect(checkboxA).toHaveAttribute('aria-checked', 'false');

    // B is now unlocked
    expect(screen.queryByText('Không thể sử dụng cùng ưu đãi đã chọn.')).not.toBeInTheDocument();
  });
});
