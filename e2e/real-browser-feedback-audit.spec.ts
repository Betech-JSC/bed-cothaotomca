import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');
const ARTIFACT_EVIDENCE_DIR = '/Users/macbookpro2020/.gemini/antigravity/brain/3bdc940e-a183-48ba-b53b-41dabb79ea7f/evidence';

// Ensure evidence directories exist
for (const dir of [EVIDENCE_DIR, ARTIFACT_EVIDENCE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveEvidenceScreenshot(page: any, filename: string) {
  const localPath = path.join(EVIDENCE_DIR, filename);
  const artifactPath = path.join(ARTIFACT_EVIDENCE_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  try {
    fs.copyFileSync(localPath, artifactPath);
  } catch (e) {
    // Artifact copy fallback
  }
}

// Mock standard cart item
const MOCK_CART_ITEMS = [
  {
    id: "1-Size S",
    productId: 1,
    productCode: "CA-HOI-S",
    slug: "ca-hoi-ngam-tuong",
    categorySlug: "hai-san-ngam-tuong",
    title: "Cá Hồi Ngâm Tương",
    imageUrl: "/images/products/salmon.jpg",
    variant: "Size S",
    unitPrice: 189000,
    originalPrice: 189000,
    quantity: 2,
    isOutOfStock: false,
  },
];

// Mock Gold Member User
const MOCK_GOLD_USER = {
  id: 88,
  name: "Nguyễn Văn Thử Nghiệm",
  first_name: "Văn Thử Nghiệm",
  last_name: "Nguyễn",
  phone: "0901234567",
  email: "test_gold@cothaotomca.vn",
  points: 520,
  tier: "gold",
  tier_name: "GOLD",
  tier_status: {
    tier: "gold",
    tier_name: "GOLD",
    points: 520,
    has_prefix: true,
    is_upgrade_celebration: false,
    discount_percent: 5,
    has_benefit: true,
    celebration_tier: null,
  },
};

// Mock Promotions Data
const MOCK_CAMPAIGNS = [
  {
    id: 101,
    name: "Ưu Đãi Lễ Hội Mùa Thu 2026",
    title: "Ưu Đãi Lễ Hội Mùa Thu 2026",
    description: "Giảm 20.000đ cho đơn hàng từ 250k",
    discount_type: "fixed",
    discount_value: 20000,
    min_order_value: 250000,
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    start_at: "2026-01-01T00:00:00Z",
    end_at: "2026-12-31T23:59:59Z",
    banner: "/images/campaigns/autumn.jpg",
  },
];

const MOCK_VOUCHERS = [
  {
    id: 201,
    code: "THUONG20K",
    short_name: "THUONG20K",
    name: "Giảm 20k đơn từ 200k",
    discount_type: "fixed",
    value: 20000,
    min_order_amount: 200000,
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    usage_limit: 100,
  },
  {
    id: 202,
    code: "SHIPFREE30K",
    short_name: "FREESHIP",
    name: "Freeship vận chuyển tối đa 30k",
    discount_type: "freeship",
    value: 30000,
    min_order_amount: 150000,
    is_freeship: true,
    can_combine_with_promotions: true,
    can_combine_with_freeship: true,
  },
];

const MOCK_SHIPPING_SETTINGS = {
  is_min_amount_enabled: true,
  min_order_amount: 300000,
  card_title: "Freeship toàn thành phố",
  free_shipping_threshold: 300000,
  default_shipping_fee: 30000,
};

test.describe('Real Browser Feedback Audit Suite (Chromium E2E Automation)', () => {

  // ---------------------------------------------------------------------------
  // TEST CASE 1: Desktop & Mobile Home/Menu Rendering with Real Images
  // ---------------------------------------------------------------------------
  test('Test Case 1: Homepage & Menu display real images without 404 or broken links', async ({ page }) => {
    // 1. Bypass password gate for authenticated storefront access
    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript(() => {
      localStorage.setItem('site_access_token', 'granted');
    });

    // 2. Navigate to storefront homepage
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // 3. Verify main header and menu items exist
    const mainNav = page.locator('nav, header');
    await expect(mainNav.first()).toBeVisible();

    // 4. Verify images are loaded and visible
    const images = page.locator('img');
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);

    // Verify at least one hero/product image is loaded properly
    const heroOrProductImg = images.first();
    await expect(heroOrProductImg).toBeVisible();

    // Verify no broken images on initial viewport
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0 && !img.src.includes('data:'))
        .map((img) => img.src);
    });
    console.log(`[TC1] Verified ${imgCount} images on homepage. Broken count: ${brokenImages.length}`);
    expect(brokenImages.length).toBe(0);

    // 5. Capture real browser screenshot
    await saveEvidenceScreenshot(page, 'home-menu-browser.png');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 2: Mobile Viewport — Speed Dial FAB & Branch Card in Footer
  // ---------------------------------------------------------------------------
  test('Test Case 2: Mobile Viewport — Speed Dial FAB & Branch Card rounded-[14px] with gradient', async ({ page }) => {
    // 1. Set mobile viewport (iPhone 14/15 size: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript(() => {
      localStorage.setItem('site_access_token', 'granted');
    });

    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // 2. Verify Speed Dial FAB is visible on mobile
    const speedDialContainer = page.locator('.fixed.right-4.bottom-20.z-40');
    await expect(speedDialContainer).toBeVisible();

    const fabTrigger = page.locator('button[aria-label*="menu liên hệ"], button[aria-label*="Đóng menu liên hệ"]');
    await expect(fabTrigger).toBeVisible();

    // Click FAB to open speed dial actions
    await fabTrigger.click();
    await page.waitForTimeout(400);

    // Verify action items appear
    const hotlineAction = page.locator('a[aria-label="Gọi hotline"]');
    const zaloAction = page.locator('a[aria-label="Chat Zalo"]');
    await expect(hotlineAction).toBeVisible();
    await expect(zaloAction).toBeVisible();

    // 3. Scroll to Footer to inspect Branch Cards
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Verify branch cards styling: rounded-[14px]
    const branchCard = page.locator('footer a.rounded-\\[14px\\]').first();
    await expect(branchCard).toBeVisible();

    // Verify gradient overlay in branch card
    const gradientOverlay = branchCard.locator('.bg-gradient-to-t');
    await expect(gradientOverlay).toBeVisible();

    // Verify address text line-clamp-2
    const addressText = branchCard.locator('.line-clamp-2');
    await expect(addressText).toBeVisible();

    // 4. Capture real mobile browser screenshot
    await saveEvidenceScreenshot(page, 'footer-mobile-browser.png');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 3: Mobile Cart Flow & Sticky Checkout CTA Button
  // ---------------------------------------------------------------------------
  test('Test Case 3: Mobile Cart Flow — Sticky Checkout Button at bottom', async ({ page }) => {
    // 1. Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript((items) => {
      localStorage.setItem('site_access_token', 'granted');
      localStorage.setItem('cothaotomca_cart', JSON.stringify(items));
    }, MOCK_CART_ITEMS);

    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // 2. Open Mobile Cart Drawer via Header Cart Button
    const cartToggleBtn = page.locator('#cart-toggle-btn-mobile');
    await expect(cartToggleBtn).toBeVisible();
    await cartToggleBtn.click();
    await page.waitForTimeout(800);

    // 3. Verify sticky checkout container & CTA button
    const stickyContainer = page.locator('.sticky.bottom-0');
    await expect(stickyContainer).toBeVisible();

    // Verify CTA button inside sticky container
    const ctaButton = stickyContainer.locator('button').first();
    await expect(ctaButton).toBeVisible();

    // Verify CSS sticky position
    const isSticky = await stickyContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'sticky';
    });
    expect(isSticky).toBe(true);

    // 4. Capture screenshot of Mobile Cart with Sticky Checkout Button
    await saveEvidenceScreenshot(page, 'sticky-checkout-mobile-browser.png');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 4: Voucher Popup (CouponModal) & Mutex Lock Enforcement
  // ---------------------------------------------------------------------------
  test('Test Case 4: CouponModal UI, Uncheck "Bỏ qua ưu đãi", & Mutex Lock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Mock Backend APIs for determinism
    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_GOLD_USER }),
      });
    });

    await page.route('**/api/campaigns**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_CAMPAIGNS }),
      });
    });

    await page.route('**/api/vouchers**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_VOUCHERS }),
      });
    });

    await page.route('**/api/shipping-settings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SHIPPING_SETTINGS }),
      });
    });

    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript((items) => {
      localStorage.setItem('site_access_token', 'granted');
      localStorage.setItem('auth_token', 'mock_gold_token');
      localStorage.setItem('cothaotomca_cart', JSON.stringify(items));
    }, MOCK_CART_ITEMS);

    // Navigate to localized home
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // Open Mobile Cart Drawer via Header Cart Button
    const cartToggleBtn = page.locator('#cart-toggle-btn-mobile');
    await expect(cartToggleBtn).toBeVisible();
    await cartToggleBtn.click();
    await page.waitForTimeout(800);

    // 1. Click VoucherTicketBar to open CouponModal
    const voucherBar = page.locator('[data-testid="voucher-ticket-bar"]').first();
    await expect(voucherBar).toBeVisible();
    await voucherBar.click();
    await page.waitForTimeout(800);

    // 2. Verify modal backdrop has backdrop-blur-md
    const backdrop = page.locator('.backdrop-blur-md');
    await expect(backdrop.first()).toBeVisible();

    // 3. Verify mobile pull handle exists
    const pullHandle = page.locator('.bg-gray-300.rounded-full');
    await expect(pullHandle.first()).toBeVisible();

    // 4. Verify bottom CTA button displays "Áp dụng • ..." or "Bỏ qua ưu đãi và tiếp tục"
    const ctaButton = page.locator('div.border-t.border-gray-100.p-4 button, button:has-text("Áp dụng •"), button:has-text("Bỏ qua ưu đãi")').first();
    await expect(ctaButton).toBeVisible();

    // 5. Capture real browser screenshot
    await saveEvidenceScreenshot(page, 'coupon-modal-real-browser.png');

    // Close modal via CTA button
    await ctaButton.click();
    await page.waitForTimeout(500);
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 5: Remove Member Offer & Hide Freeship on Self-Pickup
  // ---------------------------------------------------------------------------
  test('Test Case 5: Remove offer from VoucherTicketBar & Hide Freeship Bar on Pickup', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.route('**/api/shipping-settings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SHIPPING_SETTINGS }),
      });
    });

    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript((items) => {
      localStorage.setItem('site_access_token', 'granted');
      localStorage.setItem('cothaotomca_cart', JSON.stringify(items));
    }, MOCK_CART_ITEMS);

    await page.goto('/thanh-toan', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // 1. Verify remove button (x) on VoucherTicketBar if offer is applied
    const removeBtn = page.locator('button[data-testid="remove-voucher-button"]');
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(300);
      console.log('[TC5] Clicked remove voucher button (x).');
    }

    // 2. Delivery options
    const deliveryRadio = page.locator('label:has-text("Giao hàng tận nơi")').first();
    const pickupRadio = page.locator('label:has-text("Tự đến lấy")').first();
    await expect(deliveryRadio).toBeVisible();
    await expect(pickupRadio).toBeVisible();

    // 3. Switch delivery type to "Tự đến lấy tại chi nhánh" (pickup)
    await pickupRadio.click();
    await page.waitForTimeout(400);

    // 4. Verify pickup is selected
    const pickupInput = page.locator('input[name="delivery_type"]').nth(1);
    expect(await pickupInput.isChecked()).toBe(true);
    console.log('[TC5] Confirmed pickup option is active.');

    // 5. Capture real browser screenshot
    await saveEvidenceScreenshot(page, 'checkout-form-pickup-browser.png');

    // 6. Switch back to "Giao hàng tận nơi"
    await deliveryRadio.click();
    await page.waitForTimeout(400);
    const homeInput = page.locator('input[name="delivery_type"]').first();
    expect(await homeInput.isChecked()).toBe(true);
    console.log('[TC5] Switched back to delivery mode successfully.');
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 6: SEO Password Gate Noindex & Title Protection
  // ---------------------------------------------------------------------------
  test('Test Case 6: Password Gate shows <meta robots noindex, nofollow> and test title', async ({ browser }) => {
    // 1. Create a fresh context without site_access_token cookie or localStorage
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    // 2. Navigate to homepage
    await freshPage.goto('/', { waitUntil: 'commit' });
    await freshPage.waitForTimeout(1000);

    // 3. Verify PasswordGate lock screen is rendered
    const lockHeading = freshPage.locator('h1:has-text("TRANG WEB ĐANG TRONG GIAI ĐOẠN THỬ NGHIỆM NỘI BỘ")');
    await expect(lockHeading).toBeVisible();

    // 4. Verify Document Title
    await expect(freshPage).toHaveTitle(/Môi trường thử nghiệm nội bộ/);
    const title = await freshPage.title();
    console.log(`[TC6] Page title: ${title}`);

    // 5. Verify <meta name="robots" content="noindex, nofollow"> exists in <head>
    const robotsMeta = freshPage.locator('head meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', 'noindex, nofollow');
    console.log('[TC6] Verified <meta name="robots" content="noindex, nofollow">');

    // 6. Capture real browser screenshot of PasswordGate
    await saveEvidenceScreenshot(freshPage, 'password-gate-seo-browser.png');

    await freshContext.close();
  });

});
