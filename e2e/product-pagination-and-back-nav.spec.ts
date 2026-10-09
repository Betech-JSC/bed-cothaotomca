import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Product Pagination & Back Navigation (Mobile & Desktop)', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 12 / Mobile
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
  });

  test('Mobile: 12 products pagination & no duplicate on browser Back navigation', async ({ page }) => {
    // Ensure evidence directory exists
    const evidenceDir = path.join(process.cwd(), 'e2e/evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    // 1. Navigate to product listing page (/vi/san-pham or /product or /vi/product)
    const response = await page.goto('/san-pham', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    // Wait for the product grid to render
    const productGrid = page.locator('.grid.grid-cols-2');
    await expect(productGrid).toBeVisible({ timeout: 15000 });

    // Locate product cards inside the grid
    const productCards = productGrid.locator('> div.group');
    const cardCount = await productCards.count();
    console.log(`Initial product card count on page: ${cardCount}`);

    // If there are at least 12 products in DB, ensure 12 are rendered
    expect(cardCount).toBeGreaterThanOrEqual(1);
    if (cardCount >= 12) {
      expect(cardCount).toBe(12);
    }

    // 2. Verify all initial cards: extract titles & slugs to ensure no duplicate
    const initialProducts: { title: string; href: string }[] = [];
    for (let i = 0; i < cardCount; i++) {
      const card = productCards.nth(i);
      const titleEl = card.locator('h3.title-1');
      const title = (await titleEl.textContent())?.trim() || '';
      const linkEl = card.locator('a[href*="/san-pham/"]').first();
      const href = (await linkEl.getAttribute('href')) || '';
      initialProducts.push({ title, href });
    }

    console.log('Initial products list:', initialProducts);

    // Check duplicate among initial cards
    const initialKeys = initialProducts.map(p => `${p.href}__${p.title}`);
    const uniqueInitialKeys = new Set(initialKeys);
    expect(uniqueInitialKeys.size).toBe(initialProducts.length);

    // 3. Click first product card to navigate to detail page
    const firstCard = productCards.first();
    const firstCardTitle = (await firstCard.locator('h3.title-1').textContent())?.trim();
    const firstCardLink = firstCard.locator('a[href*="/san-pham/"]').first();
    const targetHref = await firstCardLink.getAttribute('href');

    console.log(`Navigating to detail page of: ${firstCardTitle} (${targetHref})`);
    await firstCardLink.click();

    // 4. Wait for detail page to load
    await page.waitForURL(url => url.pathname.includes('/san-pham/') && url.pathname !== '/san-pham', {
      timeout: 15000,
    });
    // Verify product detail loaded
    await expect(page.locator('h1, h2, .title-1').first()).toBeVisible({ timeout: 10000 });

    // 5. Click browser Back button (page.goBack())
    console.log('Clicking browser Back button...');
    await page.goBack({ waitUntil: 'domcontentloaded' });

    // Wait for product grid to be visible again
    await expect(productGrid).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000); // Allow any state hydration/restoration

    // 6. Verify products after Back navigation
    const backCards = productGrid.locator('> div.group');
    const backCardCount = await backCards.count();
    console.log(`Product card count after Back: ${backCardCount}`);

    expect(backCardCount).toBe(cardCount);

    const backProducts: { title: string; href: string }[] = [];
    for (let i = 0; i < backCardCount; i++) {
      const card = backCards.nth(i);
      const titleEl = card.locator('h3.title-1');
      const title = (await titleEl.textContent())?.trim() || '';
      const linkEl = card.locator('a[href*="/san-pham/"]').first();
      const href = (await linkEl.getAttribute('href')) || '';
      backProducts.push({ title, href });
    }

    // Check duplicate among cards after Back
    const backKeys = backProducts.map(p => `${p.href}__${p.title}`);
    const uniqueBackKeys = new Set(backKeys);
    expect(uniqueBackKeys.size).toBe(backProducts.length);

    // Compare with initial products
    expect(backProducts).toEqual(initialProducts);

    // 7. Take screenshot and save evidence
    const screenshotPath = path.join(evidenceDir, 'product-mobile-back-no-duplicate.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
