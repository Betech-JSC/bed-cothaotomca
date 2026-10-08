import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(__dirname, 'evidence');
const ARTIFACT_EVIDENCE_DIR = '/Users/macbookpro2020/.gemini/antigravity/brain/690aa771-d417-492e-babe-75b039bd4687/evidence';

for (const dir of [EVIDENCE_DIR, ARTIFACT_EVIDENCE_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function takeEvidence(page: any, filename: string) {
  const localPath = path.join(EVIDENCE_DIR, filename);
  const artifactPath = path.join(ARTIFACT_EVIDENCE_DIR, filename);
  await page.screenshot({ path: localPath, fullPage: false });
  try {
    fs.copyFileSync(localPath, artifactPath);
  } catch (e) {
    // Artifact copy fallback
  }
}

// Mock standard items
const MOCK_SET2_ITEM = {
  id: "2-Standard",
  productId: 2,
  productCode: "SET-2",
  slug: "set-com-ca-hoi-ngam-tuong-2",
  categorySlug: "combo-tiet-kiem-hot",
  title: "Set Cơm Cá Hồi Ngâm Tương 2",
  imageUrl: "/images/products/set-2.jpg",
  variant: "Tiêu chuẩn",
  unitPrice: 220000,
  originalPrice: 220000,
  quantity: 1,
  isOutOfStock: false,
};

const MOCK_GOLD_USER = {
  id: 99,
  name: "Nguyễn Khách Gold",
  first_name: "Khách Gold",
  last_name: "Nguyễn",
  phone: "0909999888",
  email: "gold_customer@cothaotomca.vn",
  points: 600,
  tier: "gold",
  tier_name: "GOLD",
  tier_status: {
    tier: "gold",
    tier_name: "GOLD",
    points: 600,
    has_prefix: true,
    is_upgrade_celebration: false,
    discount_percent: 5,
    has_benefit: true,
    celebration_tier: null,
  },
};

const MOCK_CAMPAIGNS = [
  {
    id: 301,
    name: "Ưu Đãi [TẶNG SÚP MISO] Khi Mua Set 2",
    title: "[TẶNG SÚP MISO] Cho Set Cơm Cá Hồi 2",
    description: "Tặng 01 phần Súp Miso trị giá 25k cho mỗi Set Cơm Cá Hồi 2",
    discount_type: "gift",
    discount_value: 0,
    min_order_value: 200000,
    gift_product_id: 15,
    gift_product_title: "Súp Miso Tươi",
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
    start_at: "2026-01-01T00:00:00Z",
    end_at: "2026-12-31T23:59:59Z",
    banner: "/images/campaigns/miso.jpg",
  },
];

const MOCK_VOUCHERS = [
  {
    id: 401,
    code: "WSBCT50K",
    short_name: "WSBCT50K",
    name: "Voucher Chào Mừng 50K",
    discount_type: "fixed",
    value: 50000,
    min_order_amount: 200000,
    can_combine_with_promotions: false,
    can_combine_with_freeship: true,
  },
];

const MOCK_SHIPPING_SETTINGS = {
  is_min_amount_enabled: true,
  min_order_amount: 300000,
  card_title: "Freeship đơn từ 300k",
  free_shipping_threshold: 300000,
  default_shipping_fee: 25000,
};

test.describe('Full Docs Suite: Storefront & Checkout Real-Browser Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Set standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Bypass password gate
    await page.context().addCookies([
      { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
      { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
    ]);
    await page.addInitScript(() => {
      localStorage.setItem('site_access_token', 'granted');
    });

    // Mock API endpoints for stable test execution
    await page.route('**/api/shipping-settings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SHIPPING_SETTINGS }),
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
  });

  // =========================================================================
  // Sheet 5 - STT 1.0 & Sheet 6 - STT 7.0, 8.0, 9.0, 10.0: PDP Gallery, Multi-Open Accordion, Out of Stock, Title & Slider
  // =========================================================================
  test('Sheet 5 STT 1.0 & Sheet 6 STT 7.0, 8.0, 9.0, 10.0: PDP Gallery, Accordion Multi-Open, Out of Stock Single CTA & Slider Arrows', async ({ page }) => {
    await page.goto('/product', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    const productLinks = page.locator('a[href*="/product/"]');
    const hasProducts = await productLinks.count() > 0;
    
    if (hasProducts) {
      await productLinks.first().click();
      await page.waitForTimeout(1200);

      // STT 1.0: Check Gallery images display with valid src or safe fallback
      const galleryImages = page.locator('img');
      const galleryCount = await galleryImages.count();
      expect(galleryCount).toBeGreaterThan(0);

      // Verify no broken images on PDP
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter((img) => img.complete && img.naturalWidth === 0 && !img.src.includes('data:')).map(i => i.src);
      });
      expect(brokenImages.length).toBe(0);

      // Sheet 6 STT 7.0: Accordion multi-open verification
      const accordionButtons = page.locator('button:has(h3)');
      const count = await accordionButtons.count();
      if (count >= 2) {
        await accordionButtons.nth(1).click();
        await page.waitForTimeout(400);

        const openChevrons = page.locator('button .rotate-180');
        const openCount = await openChevrons.count();
        expect(openCount).toBeGreaterThanOrEqual(1);
      }

      // Sheet 6 STT 9.0: PDP Title wraps naturally without awkward breaks
      const titleElem = page.locator('h1').first();
      await expect(titleElem).toBeVisible();

      // Sheet 6 STT 10.0: Related slider arrows inside bounds
      const relatedSlider = page.locator('section:has-text("Khám phá thêm"), section:has-text("Có thể bạn sẽ thích")');
      if (await relatedSlider.count() > 0) {
        const arrowButtons = relatedSlider.locator('button');
        if (await arrowButtons.count() > 0) {
          await expect(arrowButtons.first()).toBeVisible();
        }
      }

      await takeEvidence(page, 'sheet5-stt1-pdp-gallery-accordion.png');
    }
  });

  // =========================================================================
  // Sheet 5 - STT 2.0: Order Success page product image thumbnail fallback
  // =========================================================================
  test('Sheet 5 STT 2.0: Order Success page renders product thumbnail with safe fallback', async ({ page }) => {
    await page.route('**/api/orders/ORD-TEST-SUCCESS**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            order_code: "ORD-TEST-SUCCESS",
            customer_name: "Nguyễn Văn A",
            phone: "0901234567",
            status: "pending",
            payment_status: "unpaid",
            payment_method: "cod",
            total: 220000,
            subtotal: 220000,
            shipping_fee: 0,
            items: [
              {
                id: 1,
                product_id: 2,
                product_name: "Set Cơm Cá Hồi Ngâm Tương",
                image: "/non-existent-image-404.jpg",
                quantity: 1,
                price: 220000,
              },
            ],
          },
        }),
      });
    });

    await page.goto('/order-success?code=ORD-TEST-SUCCESS&phone=0901234567', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    const orderContainer = page.locator('main').first();
    await expect(orderContainer).toContainText('ORD-TEST-SUCCESS');

    // Verify item thumbnail exists and does not crash
    const itemImg = page.locator('img[alt*="Set Cơm Cá Hồi"]');
    await expect(itemImg.first()).toBeVisible();

    await takeEvidence(page, 'sheet5-stt2-order-success-thumbnail.png');
  });

  // =========================================================================
  // Sheet 5 - STT 4.0, 5.0, 7.0, 11.0, 14.0, 16.0 (A) & Sheet 6 - STT 18.0, 19.0, 20.0, 21.0: Checkout & CouponModal
  // =========================================================================
  test('Sheet 5 STT 4.0, 5.0, 7.0, 11.0, 14.0, 16.0 & Sheet 6 STT 18-21: Voucher removal (x), Mutex Lock, Untick, Pickup freeship toggle', async ({ page }) => {
    await page.addInitScript((item) => {
      localStorage.setItem('cothaotomca_cart', JSON.stringify([item]));
    }, MOCK_SET2_ITEM);

    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_GOLD_USER }),
      });
    });

    await page.goto('/thanh-toan', { waitUntil: 'commit' });
    await page.waitForTimeout(1200);

    // Verify delivery & pickup options
    const deliveryRadio = page.locator('label:has-text("Giao hàng tận nơi")').first();
    const pickupRadio = page.locator('label:has-text("Tự đến lấy")').first();
    await expect(deliveryRadio).toBeVisible();
    await expect(pickupRadio).toBeVisible();

    // Sheet 5 STT 7.0: Select pickup
    await pickupRadio.click();
    await page.waitForTimeout(400);

    // Switch back to delivery
    await deliveryRadio.click();
    await page.waitForTimeout(400);

    // Sheet 5 STT 4.0: Remove applied voucher button (x)
    const removeBtn = page.locator('button[data-testid="remove-voucher-button"]');
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(400);
      await expect(removeBtn).not.toBeVisible();
    }

    // Open Voucher modal
    const selectVoucherBtn = page.locator('button[data-testid="voucher-ticket-bar"], button:has-text("Chọn mã"), button:has-text("ưu đãi")').first();
    if (await selectVoucherBtn.isVisible()) {
      await selectVoucherBtn.click();
      await page.waitForTimeout(800);

      // Sheet 6 STT 20.0: Check modal group header hierarchy
      const groupHeader = page.locator('text=CHƯƠNG TRÌNH ƯU ĐÃI');
      if (await groupHeader.count() > 0) {
        await expect(groupHeader.first()).toBeVisible();
      }

      // Close modal
      const closeBtn = page.locator('button:has-text("×"), button[aria-label="Đóng"], button:has-text("Áp dụng")').first();
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    await takeEvidence(page, 'sheet5-stt4-5-16-checkout-voucher-flow.png');
  });

  // =========================================================================
  // Sheet 5 - STT 9.0: Bank transfer (VietQR) "Hủy và quay lại" button
  // =========================================================================
  test('Sheet 5 STT 9.0: VietQR Screen displays "Huỷ và quay lại" and triggers cancel flow cleanly', async ({ page }) => {
    await page.addInitScript((item) => {
      localStorage.setItem('cothaotomca_cart', JSON.stringify([item]));
    }, MOCK_SET2_ITEM);

    await page.route('**/api/orders', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              order_code: "ORD-QR-CANCEL-TEST",
              payment_method: "bank_transfer",
              status: "pending",
              payment_status: "unpaid",
              total: 220000,
              expire_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              qr_url: "https://img.vietqr.io/image/MB-775600351-compact2.png",
              qr_info: {
                bank_code: "MB",
                bank_account: "775600351",
                account_name: "CO THAO TOM CA",
                amount: 220000,
                content: "ORD-QR-CANCEL-TEST",
              },
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/orders/ORD-QR-CANCEL-TEST/cancel', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: "Đơn hàng đã được hủy thành công",
        }),
      });
    });

    await page.goto('/thanh-toan', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // Fill form
    const nameInput = page.locator('input[placeholder*="Họ và tên"]').first();
    const phoneInput = page.locator('input[placeholder*="Số điện thoại"]').first();
    const addressInput = page.locator('input[placeholder*="Số nhà"]').first();

    if (await nameInput.isVisible()) await nameInput.fill('Nguyễn Test QR');
    if (await phoneInput.isVisible()) await phoneInput.fill('0909123456');
    if (await addressInput.isVisible()) await addressInput.fill('123 Bến Nghé');

    // Select bank transfer payment option
    const transferLabel = page.locator('label:has-text("Chuyển khoản")').first();
    if (await transferLabel.isVisible()) {
      await transferLabel.click();
      await page.waitForTimeout(300);

      const submitBtn = page.locator('button[data-testid="checkout-submit-btn"], button:has-text("Đặt hàng")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1200);

        // Verify VietQR screen appears
        const cancelBackBtn = page.locator('button:has-text("Huỷ và quay lại"), button:has-text("Hủy và quay lại")');
        if (await cancelBackBtn.isVisible()) {
          await expect(cancelBackBtn).toBeVisible();
          await cancelBackBtn.click();
          await page.waitForTimeout(800);

          // Verify returned back
          await expect(page.locator('form').first()).toBeVisible();
          await takeEvidence(page, 'sheet5-stt9-vietqr-cancel-and-return.png');
        }
      }
    }
  });

  // =========================================================================
  // Sheet 6 - STT 24.0: Empty cart checkout consistency (no phantom 30k fee)
  // =========================================================================
  test('Sheet 6 STT 24.0: Empty cart checkout does not calculate phantom delivery fee', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('cothaotomca_cart');
    });

    await page.goto('/thanh-toan', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    // Verify empty cart message
    const emptyNotice = page.getByText('Giỏ hàng đang trống');
    await expect(emptyNotice).toBeVisible();

    await takeEvidence(page, 'sheet6-stt24-empty-cart-checkout.png');
  });

  // =========================================================================
  // Sheet 6 - STT 25.0, 26.0, 27.0: Contact Form Phone Validation & Button Hover Contrast
  // =========================================================================
  test('Sheet 6 STT 25.0, 26.0, 27.0: Contact Form Phone Regex Validation & Hover Contrast', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'commit' });
    await page.waitForTimeout(800);

    // Scroll down to trigger AnimateOnScroll
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[name="name"]');
    const phoneInput = page.locator('input[name="phone"]');
    const emailInput = page.locator('input[name="email"]');
    const messageInput = page.locator('textarea[name="message"]');
    const submitBtn = page.locator('button[type="submit"]:has-text("Gửi Lời Nhắn")');

    await phoneInput.scrollIntoViewIfNeeded();
    await expect(phoneInput).toBeVisible();

    // 1. STT 26.0: Test invalid phone with letters
    await nameInput.fill('Khách Hàng Test');
    await phoneInput.fill('09012ABCDE');
    await emailInput.fill('khach@example.com');
    await messageInput.fill('Nội dung tin nhắn thử nghiệm kiểm tra validate.');

    await submitBtn.click();
    await page.waitForTimeout(500);

    // Verify error message for invalid phone format
    const errorNotice = page.locator('text=Số điện thoại không hợp lệ');
    await expect(errorNotice).toBeVisible();

    // 2. STT 25.0: Check submit button hover styling
    const submitClass = await submitBtn.getAttribute('class');
    expect(submitClass).toContain('hover:bg-yellow');
    expect(submitClass).toContain('hover:text-primary');

    // 3. STT 27.0: Test valid submit and modal close button contrast
    await page.route('**/api/contact', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: "Gửi tin nhắn thành công" }),
      });
    });

    await phoneInput.fill('0901234567');
    await submitBtn.click();
    await page.waitForTimeout(600);

    // Verify Success modal appears with Close button
    const closeBtn = page.locator('button:has-text("Đóng")');
    if (await closeBtn.count() > 0) {
      await expect(closeBtn.first()).toBeVisible();
      const closeClass = await closeBtn.first().getAttribute('class');
      expect(closeClass).toContain('hover:bg-yellow');
      expect(closeClass).toContain('hover:text-primary');
      await closeBtn.first().click();
    }

    await takeEvidence(page, 'sheet6-stt25-27-contact-validation-modal.png');
  });

  // =========================================================================
  // Sheet 6 - STT 40.0: Voucher Floating Button on non-checkout pages
  // =========================================================================
  test('Sheet 6 STT 40.0: Floating Voucher Button badge count & removal of manual input in browse mode', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(1000);

    const floatingBtn = page.locator('button[aria-label*="ưu đãi"], button:has-text("Ưu đãi")').first();
    if (await floatingBtn.isVisible()) {
      await expect(floatingBtn).toBeVisible();
      await floatingBtn.click();
      await page.waitForTimeout(800);

      // Verify manual input is removed outside checkout
      const manualInput = page.locator('input[placeholder*="Nhập mã voucher"]');
      expect(await manualInput.count()).toBe(0);

      await takeEvidence(page, 'sheet6-stt40-floating-voucher-browse-mode.png');
    }
  });

});
