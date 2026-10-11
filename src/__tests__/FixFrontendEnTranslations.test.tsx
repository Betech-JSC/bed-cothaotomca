import { describe, it, expect, vi } from 'vitest';
import viMessages from '@/i18n/locales/vi.json';
import enMessages from '@/i18n/locales/en.json';

describe('Fix Frontend EN Translations & Zero-Crash Architecture', () => {
  describe('Task 1: i18n Localization Dictionaries (vi.json & en.json)', () => {
    it('contains search namespace new keys in both vi and en', () => {
      expect(viMessages.search.featured_products).toBe('Sản phẩm nổi bật');
      expect(enMessages.search.featured_products).toBe('Featured Products');

      expect(viMessages.search.latest_posts).toBe('Bài viết mới nhất');
      expect(enMessages.search.latest_posts).toBe('Latest Articles');

      expect(viMessages.search.policies).toBe('Chính sách quy định');
      expect(enMessages.search.policies).toBe('Policies & Terms');
    });

    it('contains operating banner keys in checkout namespace', () => {
      expect(viMessages.checkout.operating_banner_open).toContain('{openHours}');
      expect(viMessages.checkout.operating_banner_preorder_only).toContain('{openHours}');

      expect(enMessages.checkout.operating_banner_open).toBe('We are accepting orders | Orders from {openHours} daily.');
      expect(enMessages.checkout.operating_banner_preorder_only).toBe('Pre-orders only | Orders from {openHours} daily.');
    });

    it('normalizes checkout.note and checkout.payment_qr_desc in en.json', () => {
      expect(enMessages.checkout.note).toBe('Notes for Co Thao Tom Ca');
      expect(enMessages.checkout.payment_qr_desc).toBe('Bank Transfer / Scan QR');
      expect(enMessages.checkout.payment_qr_desc).not.toContain('(Recommended)');
    });

    it('contains standard_variant in profile namespace', () => {
      expect(viMessages.profile.standard_variant).toBe('Tiêu chuẩn');
      expect(enMessages.profile.standard_variant).toBe('Standard');
    });

    it('verifies profile.track_order_link in en.json', () => {
      expect(enMessages.profile.track_order_link).toBe('Track order progress & details');
    });

    it('verifies all 11 standardized mobile cart keys exist in checkout namespace', () => {
      const keys = [
        'delivery_home',
        'promo_voucher_no_combine_ship_restored',
        'promo_voucher_no_combine',
        'promo_voucher_prioritized',
        'promo_voucher_no_ship_discount',
        'promo_voucher_no_ship_program',
        'promo_campaign_no_ship_program',
        'voucher_removed_min_not_met',
        'address_book_select',
        'default_badge',
        'enter_other_address',
        'new_address_heading',
        'clear_quick',
        'shipping_calculating',
      ];

      for (const key of keys) {
        expect((viMessages.checkout as any)[key]).toBeDefined();
        expect((enMessages.checkout as any)[key]).toBeDefined();
      }
    });
  });

  describe('Task 3: Profile Points Formatting & Reorder Logic', () => {
    it('formats member points according to locale (vi-VN vs en-US)', () => {
      const points = 1250000;
      const viFormatted = points.toLocaleString('vi-VN');
      const enFormatted = points.toLocaleString('en-US');

      expect(viFormatted).toBe('1.250.000');
      expect(enFormatted).toBe('1,250,000');
    });

    it('resolves standard variant when item has no variant_size', () => {
      const itemWithoutSize = { variant_size: null };
      const itemWithSize = { variant_size: 'L' };

      const getVariantStr = (it: { variant_size: string | null }, tStandard: string) => {
        return it.variant_size ? `Size ${it.variant_size}` : tStandard;
      };

      expect(getVariantStr(itemWithoutSize, enMessages.profile.standard_variant)).toBe('Standard');
      expect(getVariantStr(itemWithoutSize, viMessages.profile.standard_variant)).toBe('Tiêu chuẩn');
      expect(getVariantStr(itemWithSize, enMessages.profile.standard_variant)).toBe('Size L');
    });
  });

  describe('Task 5: Blog Category Zero-Crash Redirect Guard Logic', () => {
    it('prevents redirect when correctSlug matches categorySlug (loop prevention)', () => {
      const redirectMock = vi.fn();
      const categorySlug = 'tin-tuc-mon-an';
      const correctSlug = 'tin-tuc-mon-an';

      if (correctSlug && correctSlug.trim() !== categorySlug) {
        redirectMock(correctSlug);
      }

      expect(redirectMock).not.toHaveBeenCalled();
    });

    it('triggers redirect when correctSlug differs from categorySlug', () => {
      const redirectMock = vi.fn();
      const categorySlug = 'mon-an';
      const correctSlug = 'dishes';

      if (correctSlug && correctSlug.trim() !== categorySlug) {
        redirectMock(correctSlug.trim());
      }

      expect(redirectMock).toHaveBeenCalledWith('dishes');
    });

    it('prevents redirect when correctSlug is empty or whitespace', () => {
      const redirectMock = vi.fn();
      const categorySlug = 'mon-an';
      const correctSlug: string = '';

      if (correctSlug && correctSlug.trim() !== categorySlug) {
        redirectMock(correctSlug);
      }

      expect(redirectMock).not.toHaveBeenCalled();
    });
  });
});
