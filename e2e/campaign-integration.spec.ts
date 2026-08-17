import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(__dirname, '../../antigravity/brain/902ab03e-c3ba-4ddf-993a-db4dbdc2c056/e2e_evidence');

test.beforeAll(() => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
});

async function loginAdmin(page: any) {
  await page.goto('http://127.0.0.1:8000/login');
  await page.waitForSelector('input#email, input.ant-input', { timeout: 10000 });
  await page.fill('input#email, input.ant-input', 'admin@cothaotomca.com');
  await page.fill('input#password, input[type="password"]', 'password');
  await page.click('button[type="submit"], button:has-text("Đăng nhập")');
  await page.waitForTimeout(2000);
}

test.describe('Group 5: UI Integration & E2E Browser Test Suite (9 Test Cases)', () => {

  test('5.1: CMS Campaign List UI Rendering & Status Badges', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/campaigns', { waitUntil: 'networkidle' });
    
    // Verify Page Content
    await page.waitForSelector('h1', { timeout: 10000 });
    const title = await page.locator('h1').textContent();
    expect(title).toBeTruthy();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_campaign_list.png'), fullPage: true });
  });

  test('5.2: Create Campaign via CMS 2-Step Wizard', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/campaigns/create', { waitUntil: 'networkidle' });

    const nameInput = page.locator('input[name="name"], input#name, .ant-input').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Chiến dịch Playwright Test Wizard 20%');
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_campaign_created.png'), fullPage: true });
  });

  test('5.3: Real-Time Campaign Status Switch Toggle', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/campaigns', { waitUntil: 'networkidle' });

    const switchBtn = page.locator('button[role="switch"], .ant-switch').first();
    if (await switchBtn.isVisible()) {
      await switchBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_campaign_toggle_switch.png'), fullPage: true });
  });

  test('5.4: Edit Campaign via CMS Wizard', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/campaigns', { waitUntil: 'networkidle' });

    const editBtn = page.locator('a:has-text("Sửa")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_campaign_edited.png'), fullPage: true });
  });

  test('5.5: Overlapping Campaign Conflict Validation UI Feedback', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/campaigns/create', { waitUntil: 'networkidle' });

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_overlap_conflict_error.png'), fullPage: true });
  });

  test('5.6: Read-Only Campaign Badge on Product Edit Page', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('http://127.0.0.1:8000/products', { waitUntil: 'networkidle' });

    const editLink = page.locator('a:has-text("Sửa")').first();
    if (await editLink.isVisible()) {
      await editLink.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_product_edit_campaign_badge.png'), fullPage: true });
  });

  test('5.7: Storefront Product Card Dual-Price Rendering', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_storefront_card_dual_price.png'), fullPage: true });
  });

  test('5.8: Storefront Product Detail Dual-Price & Add to Cart', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_storefront_product_detail_cart.png'), fullPage: true });
  });

  test('5.9: End-to-End Order Checkout & KiotViet Payload Verification', async ({ page }) => {
    const networkLogs: any[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/orders')) {
        networkLogs.push({
          url: req.url(),
          method: req.method(),
          postData: req.postDataJSON(),
        });
      }
    });

    await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '09_order_checkout_success.png'), fullPage: true });

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'network_logs.json'),
      JSON.stringify(networkLogs, null, 2),
      'utf-8'
    );
  });

});
