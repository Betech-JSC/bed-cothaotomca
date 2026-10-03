import { describe, it, expect } from 'vitest';
import { getSafeRedirectPath, DEFAULT_LOGIN_REDIRECT } from '@/lib/safeRedirect';

describe('getSafeRedirectPath (chống open redirect sau đăng nhập)', () => {
  describe('redirect hợp lệ nội bộ', () => {
    it.each([
      ['/checkout', '/checkout'],
      ['/checkout?x=1', '/checkout?x=1'],
      ['/vi/checkout', '/checkout'],
      ['/en/checkout', '/checkout'],
      ['/profile', '/profile'],
      ['%2Fcheckout', '/checkout'],
      ['/en', '/'],
      ['/video', '/video'],
    ])('%s → %s', (raw, expected) => {
      expect(getSafeRedirectPath(raw)).toBe(expected);
    });
  });

  describe('redirect bị chặn → fallback /profile', () => {
    it.each([
      [null],
      [undefined],
      [''],
      ['checkout'],
      ['//evil.com'],
      ['/\\evil.com'],
      ['https://evil.com'],
      ['http://evil.com'],
      ['javascript:alert(1)'],
      ['JavaScript:alert(1)'],
      ['data:text/html,x'],
      ['%2F%2Fevil.com'],
      ['/%5Cevil.com'],
      ['/checkout\\evil'],
      ['/check\nout'],
      ['\n//evil.com'],
      ['/checkout%0A'],
      ['%E0%A4%A'],
      ['/vi//evil.com'],
      ['/en/\\evil.com'],
      ['  //evil.com'],
    ])('%j → /profile', (raw) => {
      expect(getSafeRedirectPath(raw as string | null | undefined)).toBe(DEFAULT_LOGIN_REDIRECT);
      expect(DEFAULT_LOGIN_REDIRECT).toBe('/profile');
    });
  });

  it('cho phép tuỳ biến fallback', () => {
    expect(getSafeRedirectPath('https://evil.com', '/')).toBe('/');
    expect(getSafeRedirectPath('/checkout', '/')).toBe('/checkout');
  });
});
