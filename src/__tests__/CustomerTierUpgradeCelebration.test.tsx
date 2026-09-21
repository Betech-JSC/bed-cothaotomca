import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { getMemberTier, calculateMemberDiscount, type StorefrontUser } from '@/contexts/AuthContext';
import GuestTierHintBanner from '@/components/Checkout/GuestTierHintBanner';

describe('CustomerTierUpgradeCelebration Tests', () => {
  it('identifies newly upgraded Gold celebration reward (10%)', () => {
    const user = {
      id: 1,
      name: 'Nguyen Van A',
      first_name: 'Van A',
      last_name: 'Nguyen',
      email: 'a@example.com',
      phone: '0987654321',
      points: 450,
      tier_status: {
        tier: 'gold',
        tier_name: 'GOLD',
        points: 450,
        has_prefix: false,
        is_upgrade_celebration: true,
        discount_percent: 10,
        has_benefit: true,
        celebration_tier: 'gold',
      },
    } as unknown as StorefrontUser;

    const tierInfo = getMemberTier(user);
    expect(tierInfo.tier).toBe('gold');
    expect(tierInfo.isUpgradeCelebration).toBe(true);
    expect(tierInfo.discountPercent).toBe(10);
    expect(tierInfo.celebrationTier).toBe('gold');
    expect(tierInfo.label).toContain('Mừng lên hạng GOLD (-10%)');
  });

  it('identifies newly upgraded Diamond celebration reward (15%)', () => {
    const user = {
      id: 2,
      name: 'Tran Van B',
      first_name: 'Van B',
      last_name: 'Tran',
      email: 'b@example.com',
      phone: '0977654321',
      points: 850,
      tier_status: {
        tier: 'diamond',
        tier_name: 'DIAMOND',
        points: 850,
        has_prefix: false,
        is_upgrade_celebration: true,
        discount_percent: 15,
        has_benefit: true,
        celebration_tier: 'diamond',
      },
    } as unknown as StorefrontUser;

    const tierInfo = getMemberTier(user);
    expect(tierInfo.tier).toBe('diamond');
    expect(tierInfo.isUpgradeCelebration).toBe(true);
    expect(tierInfo.discountPercent).toBe(15);
    expect(tierInfo.celebrationTier).toBe('diamond');
    expect(tierInfo.label).toContain('Mừng lên hạng DIAMOND (-15%)');
  });

  it('calculates celebration discount ONLY on eligible regular-priced subtotal', () => {
    const user = {
      id: 1,
      name: 'Nguyen Van A',
      first_name: 'Van A',
      last_name: 'Nguyen',
      email: 'a@example.com',
      phone: '0987654321',
      points: 450,
      tier_status: {
        tier: 'gold',
        tier_name: 'GOLD',
        points: 450,
        has_prefix: false,
        is_upgrade_celebration: true,
        discount_percent: 10,
        has_benefit: true,
        celebration_tier: 'gold',
      },
    } as unknown as StorefrontUser;

    // Subtotal total is 500,000, but regular-priced items total 300,000
    const eligibleSubtotal = 300000;
    const discount = calculateMemberDiscount(user, eligibleSubtotal);

    // 10% of 300,000 = 30,000
    expect(discount).toBe(30000);
  });

  it('renders celebration announcement in GuestTierHintBanner', () => {
    const onDismiss = vi.fn();
    render(
      <GuestTierHintBanner
        tier="gold"
        discountPercent={10}
        isUpgradeCelebration={true}
        loginHref="/vi/login?redirect=/vi/checkout"
        onDismiss={onDismiss}
        autoDismissMs={0}
      />
    );

    expect(
      screen.getByText(/Chúc mừng bạn vừa thăng hạng/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Mừng lên hạng giảm 10%/i)
    ).toBeInTheDocument();
  });
});
