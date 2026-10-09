import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Mobile Input Anti-Zoom Verification', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 12/13/14
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const evidenceDir = path.join(process.cwd(), 'e2e/evidence');

  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test('Trang đăng nhập (/vi/login): Meta viewport no-zoom, input computed font-size 16px, và scale giữ nguyên khi focus', async ({
    page,
  }) => {
    // 1. Điều hướng đến trang login
    const response = await page.goto('/vi/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    // Đợi form đăng nhập render
    const usernameInput = page.locator('input[name="username"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible({ timeout: 15000 });

    // 2. Kiểm tra thẻ <meta name="viewport"> trong <head>
    const viewportMeta = await page.locator('meta[name="viewport"]').first().getAttribute('content');
    console.log('📌 [LoginPage] Meta viewport content:', viewportMeta);
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('maximum-scale=1');
    expect(viewportMeta).toMatch(/user-scalable=(no|0)/i);

    // 3. Lấy computed style font-size của các ô input (username, password)
    const usernameFontSize = await usernameInput.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });
    const passwordFontSize = await passwordInput.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    console.log('📌 [LoginPage] Username computed font-size:', usernameFontSize);
    console.log('📌 [LoginPage] Password computed font-size:', passwordFontSize);

    expect(usernameFontSize).toBe('16px');
    expect(passwordFontSize).toBe('16px');

    // 4. Click / Focus vào ô input tài khoản và kiểm tra visualViewport.scale
    await usernameInput.click();
    await usernameInput.focus();

    const scaleAfterFocus = await page.evaluate(() => {
      return window.visualViewport ? window.visualViewport.scale : 1;
    });
    console.log('📌 [LoginPage] Visual viewport scale after focus:', scaleAfterFocus);
    expect(scaleAfterFocus).toBe(1);

    // Điền thử dữ liệu vào input
    await usernameInput.fill('test.mobile@cothaotomca.vn');
    await passwordInput.fill('SecurePassword123!');

    // 5. Chụp ảnh màn hình minh chứng
    const loginScreenshotPath = path.join(evidenceDir, 'mobile-input-focus-no-zoom.png');
    await page.screenshot({ path: loginScreenshotPath, fullPage: false });
    console.log('📸 [LoginPage] Screenshot saved at:', loginScreenshotPath);
    expect(fs.existsSync(loginScreenshotPath)).toBe(true);
  });

  test('Trang thanh toán (/vi/checkout): Input Tên, SĐT, Địa chỉ có computed font-size 16px và không bị auto-zoom', async ({
    page,
  }) => {
    // 1. Điều hướng đến trang checkout
    const response = await page.goto('/vi/checkout', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    // Đợi form checkout xuất hiện
    // Các input: Tên, Số điện thoại, Địa chỉ
    const nameInput = page.locator('input[placeholder*="tên" i], input[placeholder*="Họ và tên" i]').first();
    const phoneInput = page.locator('input[type="tel"]').first();
    const addressInput = page.locator(
      'input[data-testid="desktop-street-address-input"], input[placeholder*="địa chỉ" i], input[placeholder*="Số nhà" i]'
    ).first();

    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await expect(phoneInput).toBeVisible({ timeout: 15000 });
    await expect(addressInput).toBeVisible({ timeout: 15000 });

    // 2. Lấy computed style font-size của cả 3 ô input
    const nameFontSize = await nameInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    const phoneFontSize = await phoneInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    const addressFontSize = await addressInput.evaluate((el) => window.getComputedStyle(el).fontSize);

    console.log('📌 [CheckoutPage] Name input computed font-size:', nameFontSize);
    console.log('📌 [CheckoutPage] Phone input computed font-size:', phoneFontSize);
    console.log('📌 [CheckoutPage] Address input computed font-size:', addressFontSize);

    expect(nameFontSize).toBe('16px');
    expect(phoneFontSize).toBe('16px');
    expect(addressFontSize).toBe('16px');

    // 3. Thao tác focus và điền thử vào ô Tên, SĐT, Địa chỉ
    await nameInput.click();
    await nameInput.focus();

    const scaleAfterNameFocus = await page.evaluate(() => {
      return window.visualViewport ? window.visualViewport.scale : 1;
    });
    console.log('📌 [CheckoutPage] Visual viewport scale after name input focus:', scaleAfterNameFocus);
    expect(scaleAfterNameFocus).toBe(1);

    await nameInput.fill('Nguyễn Văn Mobile');
    await phoneInput.fill('0909123456');
    await addressInput.fill('123 Đường Nguyễn Huệ, Phường Bến Nghé');

    // 4. Chụp ảnh màn hình minh chứng
    const checkoutScreenshotPath = path.join(evidenceDir, 'checkout-mobile-inputs-no-zoom.png');
    await page.screenshot({ path: checkoutScreenshotPath, fullPage: false });
    console.log('📸 [CheckoutPage] Screenshot saved at:', checkoutScreenshotPath);
    expect(fs.existsSync(checkoutScreenshotPath)).toBe(true);
  });
});
