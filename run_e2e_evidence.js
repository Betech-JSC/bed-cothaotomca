const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = '/Users/macbookpro2020/.gemini/antigravity/brain/902ab03e-c3ba-4ddf-993a-db4dbdc2c056/e2e_evidence';

async function main() {
  console.log('=== STARTING E2E INTEGRATION TEST ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const networkLogs = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkLogs.push({
        type: 'REQUEST',
        method: req.method(),
        url: req.url(),
        postData: req.postData()
      });
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      let body = '';
      try { body = await res.text(); } catch(e){}
      networkLogs.push({
        type: 'RESPONSE',
        status: res.status(),
        url: res.url(),
        body: body.substring(0, 1000)
      });
    }
  });

  // ---------------------------------------------------------------------------
  // C1: Product UI + SEO
  // ---------------------------------------------------------------------------
  console.log('\n--- C1.1: Product List Page ---');
  await page.goto('http://localhost:3000/vi/product', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_product_list.png'), fullPage: true });

  const cardTitles = await page.locator('h3, .title-1, .card-title').allInnerTexts();
  console.log('Product cards titles found on catalog:', cardTitles.slice(0, 5));

  console.log('\n--- C1.2: Product Detail Page & SEO Metadata ---');
  await page.goto('http://localhost:3000/vi/product/menu/kim-chi', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_product_detail.png') });

  const pageTitle = await page.title();
  const htmlContent = await page.content();

  // Extract SEO tags
  const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href'));
  const ogImage = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.getAttribute('content'));
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content'));
  const h1Text = await page.locator('h1').innerText();

  console.log('Page Title:', pageTitle);
  console.log('H1 Text on Detail Page:', JSON.stringify(h1Text));
  console.log('Canonical URL tag:', canonical);
  console.log('OG Image tag:', ogImage);
  console.log('Robots tag:', robots);

  // Check ZoomableImage element
  const hasZoomableImage = await page.evaluate(() => {
    const el = document.querySelector('img[src*="cover"], img[src*="storage"], img[src*="http"]');
    return el ? true : false;
  });
  console.log('ZoomableImage rendered in DOM:', hasZoomableImage);

  // ---------------------------------------------------------------------------
  // C2: Payment Flow
  // ---------------------------------------------------------------------------
  console.log('\n--- C2.1: Add to Cart ---');
  const addToCartBtn = page.locator('button:has-text("Thêm vào giỏ hàng")').first();
  if (await addToCartBtn.isVisible()) {
    await addToCartBtn.click();
    await page.waitForTimeout(1000);
    console.log('Clicked "Thêm vào giỏ hàng"');
  } else {
    console.log('Add to cart button not visible or disabled!');
  }
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_add_to_cart.png') });

  console.log('\n--- C2.2: Checkout Page ---');
  await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_checkout_init.png') });

  // Fill Checkout Form
  console.log('\n--- C2.3: Fill Checkout Address ---');
  const nameInput = page.locator('input[name="name"], input[placeholder*="Họ và tên"]').first();
  const phoneInput = page.locator('input[name="phone"], input[placeholder*="Số điện thoại"]').first();
  const addressInput = page.locator('input[name="address"], input[placeholder*="Địa chỉ"], input[placeholder*="Số nhà"]').first();

  if (await nameInput.isVisible()) await nameInput.fill('Nguyễn Văn Test');
  if (await phoneInput.isVisible()) await phoneInput.fill('0987654321');
  if (await addressInput.isVisible()) await addressInput.fill('1073 Phan Văn Trị, Phường 10, Gò Vấp, TP.HCM');

  // Select Pickup option if delivery has restriction or test delivery
  const pickupRadio = page.locator('input[value="pickup"], label:has-text("Tự đến lấy")').first();
  if (await pickupRadio.isVisible()) {
    await pickupRadio.click();
    console.log('Selected Pickup delivery option');
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_checkout_filled.png') });

  // Confirm order checkbox & click order button
  console.log('\n--- C2.4: Place Order ---');
  const confirmCheckbox = page.locator('input[type="checkbox"]').first();
  if (await confirmCheckbox.isVisible()) {
    await confirmCheckbox.check();
    console.log('Checked confirmation checkbox');
  }

  const submitBtn = page.locator('button:has-text("Đặt hàng"), button:has-text("Thanh toán")').first();
  let orderResponsePayload = null;

  if (await submitBtn.isVisible()) {
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/orders') && res.request().method() === 'POST', { timeout: 10000 }).catch(() => null),
      submitBtn.click()
    ]);
    if (response) {
      orderResponsePayload = await response.json();
      console.log('Order Creation Response:', JSON.stringify(orderResponsePayload, null, 2));
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_order_result.png') });

  // Save network log to evidence file
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'network_logs.json'),
    JSON.stringify(networkLogs, null, 2)
  );

  console.log('\n=== E2E SUITE FINISHED ===');
  await browser.close();
}

main().catch(err => {
  console.error('E2E Runner Error:', err);
  process.exit(1);
});
